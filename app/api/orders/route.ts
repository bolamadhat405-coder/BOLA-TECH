import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    phone: z.string().trim().min(7).max(30),
  }),
  shippingAddress: z.string().trim().min(8).max(1000),
  paymentMethod: z.enum(["COD", "WALLET_TRANSFER"]).default("COD"),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(1500).optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(30),
});

function reference() {
  return `BT-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "راجع بيانات الطلب والعنوان ورقم الهاتف.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "خدمة الطلبات غير مهيأة حاليًا." }, { status: 503 });
  }

  const quantities = new Map<string, number>();
  for (const item of parsed.data.items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  const items = [...quantities].map(([productId, quantity]) => ({ productId, quantity }));

  try {
    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: items.map((item) => item.productId) }, isPublished: true },
        select: { id: true, nameAr: true, priceMinor: true, stockQuantity: true, currency: true, kind: true },
      });
      if (products.length !== items.length) throw new Error("PRODUCT_UNAVAILABLE");

      const currency = products[0]?.currency || "EGP";
      if (products.some((product) => product.currency !== currency)) throw new Error("CURRENCY_MISMATCH");

      let subtotal = 0;
      const orderLines = [];
      if (coupon) {
        const reserved = await tx.coupon.updateMany({
          where: { id: coupon.id, isActive: true, ...(coupon.usageLimit !== null ? { usageCount: { lt: coupon.usageLimit } } : {}) },
          data: { usageCount: { increment: 1 } },
        });
        if (reserved.count !== 1) throw new Error("COUPON_EXHAUSTED");
        await tx.couponRedemption.create({ data: { couponId: coupon.id, orderId: created.id, customerId, discount } });
      }
      for (const item of items) {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product) throw new Error("PRODUCT_UNAVAILABLE");
        if (product.kind === "PHYSICAL" && product.stockQuantity < item.quantity) throw new Error("OUT_OF_STOCK");
        subtotal += product.priceMinor * item.quantity;
        orderLines.push({
          productId: product.id,
          title: product.nameAr,
          quantity: item.quantity,
          unitPrice: product.priceMinor,
          lineTotal: product.priceMinor * item.quantity,
        });
      }

      let customerId: string;
      const email = parsed.data.customer.email?.toLowerCase();
      if (email) {
        const customer = await tx.customer.upsert({
          where: { email },
          create: { name: parsed.data.customer.name, email, phone: parsed.data.customer.phone, address: parsed.data.shippingAddress },
          update: { name: parsed.data.customer.name, phone: parsed.data.customer.phone, address: parsed.data.shippingAddress },
          select: { id: true },
        });
        customerId = customer.id;
      } else {
        const customer = await tx.customer.create({
          data: { name: parsed.data.customer.name, phone: parsed.data.customer.phone, address: parsed.data.shippingAddress },
          select: { id: true },
        });
        customerId = customer.id;
      }

      let discount = 0;
      let coupon: Awaited<ReturnType<typeof tx.coupon.findUnique>> = null;
      const normalizedCoupon = parsed.data.couponCode?.trim().toUpperCase();
      if (normalizedCoupon) {
        coupon = await tx.coupon.findUnique({ where: { code: normalizedCoupon } });
        const now = new Date();
        if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) throw new Error("COUPON_INVALID");
        if (coupon.currency !== currency || subtotal < coupon.minSubtotal) throw new Error("COUPON_CONDITIONS");
        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) throw new Error("COUPON_EXHAUSTED");
        const prior = await tx.couponRedemption.count({ where: { couponId: coupon.id, customerId } });
        if (prior >= coupon.perCustomerLimit) throw new Error("COUPON_CUSTOMER_LIMIT");
        discount = coupon.type === "PERCENT" ? Math.floor(subtotal * coupon.value / 100) : coupon.value;
        if (coupon.maxDiscount !== null) discount = Math.min(discount, coupon.maxDiscount);
        discount = Math.min(subtotal, Math.max(0, discount));
      }
      const created = await tx.order.create({
        data: {
          reference: reference(),
          customerId,
          subtotal,
          discount,
          total: subtotal - discount,
          couponCode: coupon?.code ?? null,
          currency,
          notes: parsed.data.notes || null,
          paymentMethod: parsed.data.paymentMethod,
          paymentStatus: "UNPAID",
          shippingAddress: parsed.data.shippingAddress,
          items: { create: orderLines },
        },
        select: { id: true, reference: true, total: true, currency: true, status: true, createdAt: true },
      });

      for (const item of items) {
        const product = products.find((candidate) => candidate.id === item.productId)!;
        if (product.kind === "PHYSICAL") {
          const changed = await tx.product.updateMany({
            where: { id: product.id, isPublished: true, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (changed.count !== 1) throw new Error("OUT_OF_STOCK");
          let remaining = item.quantity;
          const warehouseBalances = await tx.warehouseStock.findMany({
            where: { productId: product.id, quantity: { gt: 0 }, warehouse: { isActive: true } },
            orderBy: { warehouseId: "asc" },
            select: { warehouseId: true, quantity: true },
          });
          for (const balance of warehouseBalances) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, balance.quantity);
            const warehouseChanged = await tx.warehouseStock.updateMany({
              where: { warehouseId: balance.warehouseId, productId: product.id, quantity: { gte: take } },
              data: { quantity: { decrement: take } },
            });
            if (warehouseChanged.count !== 1) throw new Error("WAREHOUSE_STOCK_OUT_OF_SYNC");
            remaining -= take;
          }
          if (remaining > 0) throw new Error("WAREHOUSE_STOCK_OUT_OF_SYNC");
          await tx.stockMovement.create({
            data: { productId: product.id, type: "SALE", quantity: -item.quantity, reference: created.reference, notes: "Customer order placed" },
          });
        }
      }
      await tx.auditLog.create({
        data: { actorType: "CUSTOMER", action: "ORDER_PLACED", entityType: "Order", entityId: created.id, metadata: { reference: created.reference, paymentMethod: parsed.data.paymentMethod } },
      });
      return created;
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "COUPON_INVALID") return NextResponse.json({ error: "كود الخصم غير صالح أو غير نشط أو خارج فترة الاستخدام." }, { status: 400 });
    if (error instanceof Error && error.message === "COUPON_CONDITIONS") return NextResponse.json({ error: "الطلب لا يحقق الحد الأدنى أو عملة كوبون الخصم." }, { status: 400 });
    if (error instanceof Error && error.message === "COUPON_EXHAUSTED") return NextResponse.json({ error: "انتهى عدد مرات استخدام هذا الكوبون." }, { status: 409 });
    if (error instanceof Error && error.message === "COUPON_CUSTOMER_LIMIT") return NextResponse.json({ error: "وصلت إلى الحد المسموح لاستخدام هذا الكوبون." }, { status: 409 });
    if (error instanceof Error && error.message === "PRODUCT_UNAVAILABLE") return NextResponse.json({ error: "أحد المنتجات لم يعد متاحًا." }, { status: 409 });
    if (error instanceof Error && error.message === "OUT_OF_STOCK") return NextResponse.json({ error: "الكمية المطلوبة غير متاحة في المخزون." }, { status: 409 });
    if (error instanceof Error && error.message === "WAREHOUSE_STOCK_OUT_OF_SYNC") return NextResponse.json({ error: "رصيد المستودع الرئيسي غير متزامن مع المخزون العام؛ راجع أرصدة المستودعات قبل البيع." }, { status: 409 });
    if (error instanceof Error && error.message === "CURRENCY_MISMATCH") return NextResponse.json({ error: "لا يمكن جمع منتجات بعملات مختلفة في طلب واحد." }, { status: 409 });
    console.error("Order placement failed", error);
    return NextResponse.json({ error: "تعذر إتمام الطلب الآن. حاول مرة أخرى." }, { status: 500 });
  }
}
