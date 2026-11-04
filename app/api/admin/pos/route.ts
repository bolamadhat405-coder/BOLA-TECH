import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const schema = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  warehouseId: z.string().min(1),
  paymentMethod: z.enum(["CASH", "WALLET_TRANSFER"]).default("CASH"),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(50) })).min(1).max(40),
});
function ref() { return `POS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`; }

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const admin = await prisma.adminUser.findFirst({ where: { id: session.id, isActive: true }, select: { id: true } });
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const [products, warehouses, recentOrders] = await Promise.all([
    prisma.product.findMany({ where: { isPublished: true }, orderBy: { nameAr: "asc" }, take: 500, select: { id: true, sku: true, nameAr: true, priceMinor: true, currency: true, kind: true, stockQuantity: true } }),
    prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, stocks: { select: { productId: true, quantity: true } } } }),
    prisma.order.findMany({ where: { reference: { startsWith: "POS-" } }, orderBy: { createdAt: "desc" }, take: 12, select: { id: true, reference: true, total: true, currency: true, status: true, paymentStatus: true, createdAt: true, customer: { select: { name: true } } } }),
  ]);
  return NextResponse.json({ products, warehouses, recentOrders });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const admin = await prisma.adminUser.findFirst({ where: { id: session.id, isActive: true }, select: { id: true } });
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "راجع بيانات البيع والكميات.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const grouped = new Map<string, number>();
  for (const line of parsed.data.items) grouped.set(line.productId, (grouped.get(line.productId) || 0) + line.quantity);
  try {
    const order = await prisma.$transaction(async tx => {
      const warehouse = await tx.warehouse.findFirst({ where: { id: parsed.data.warehouseId, isActive: true }, select: { id: true } });
      if (!warehouse) throw new Error("WAREHOUSE_MISSING");
      const lines = [...grouped].map(([productId, quantity]) => ({ productId, quantity }));
      const products = await tx.product.findMany({ where: { id: { in: lines.map(x => x.productId) }, isPublished: true }, select: { id: true, nameAr: true, priceMinor: true, currency: true, kind: true } });
      if (products.length !== lines.length) throw new Error("PRODUCT_MISSING");
      const currency = products[0]?.currency || "EGP";
      if (products.some(p => p.currency !== currency)) throw new Error("CURRENCY_MISMATCH");
      let subtotal = 0;
      const orderLines = [];
      for (const line of lines) {
        const product = products.find(p => p.id === line.productId)!;
        subtotal += product.priceMinor * line.quantity;
        orderLines.push({ productId: product.id, title: product.nameAr, quantity: line.quantity, unitPrice: product.priceMinor, lineTotal: product.priceMinor * line.quantity });
        if (product.kind === "PHYSICAL") {
          const balance = await tx.warehouseStock.findUnique({ where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } }, select: { quantity: true } });
          if (!balance || balance.quantity < line.quantity) throw new Error("OUT_OF_STOCK");
          const changed = await tx.warehouseStock.updateMany({ where: { warehouseId: warehouse.id, productId: product.id, quantity: { gte: line.quantity } }, data: { quantity: { decrement: line.quantity } } });
          if (changed.count !== 1) throw new Error("OUT_OF_STOCK");
          const aggregate = await tx.product.updateMany({ where: { id: product.id, stockQuantity: { gte: line.quantity } }, data: { stockQuantity: { decrement: line.quantity } } });
          if (aggregate.count !== 1) throw new Error("STOCK_OUT_OF_SYNC");
        }
      }
      let customer = parsed.data.phone ? await tx.customer.findFirst({ where: { phone: parsed.data.phone }, select: { id: true } }) : null;
      if (customer) await tx.customer.update({ where: { id: customer.id }, data: { name: parsed.data.customerName } });
      else customer = await tx.customer.create({ data: { name: parsed.data.customerName, phone: parsed.data.phone || null }, select: { id: true } });
      const paid = parsed.data.paymentMethod === "CASH";
      const created = await tx.order.create({ data: {
        reference: ref(), customerId: customer.id, subtotal, discount: 0, total: subtotal, currency,
        status: paid ? "COMPLETED" : "PENDING", paymentMethod: parsed.data.paymentMethod, paymentStatus: paid ? "PAID" : "UNPAID",
        notes: "POS sale", items: { create: orderLines },
      }, select: { id: true, reference: true, total: true, currency: true, status: true, paymentStatus: true, items: { select: { id: true, productId: true, quantity: true } } } });
      for (const line of lines) {
        const product = products.find(p => p.id === line.productId)!;
        if (product.kind !== "PHYSICAL") continue;
        const orderItem = created.items.find(item => item.productId === product.id)!;
        await tx.orderItemWarehouseAllocation.create({ data: { orderItemId: orderItem.id, warehouseId: warehouse.id, quantity: line.quantity } });
        await tx.stockMovement.create({ data: { productId: product.id, type: "SALE", quantity: -line.quantity, reference: created.reference, notes: "Point of sale" } });
      }
      await tx.auditLog.create({ data: { actorType: "ADMIN", actorId: admin.id, action: "POS_SALE_CREATED", entityType: "Order", entityId: created.id, metadata: { warehouseId: warehouse.id, paymentMethod: parsed.data.paymentMethod } } });
      return created;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "WAREHOUSE_MISSING") return NextResponse.json({ error: "المخزن غير موجود أو غير نشط." }, { status: 404 });
    if (code === "PRODUCT_MISSING") return NextResponse.json({ error: "أحد المنتجات غير متاح للبيع." }, { status: 409 });
    if (code === "OUT_OF_STOCK") return NextResponse.json({ error: "الكمية غير متاحة في المخزن المحدد." }, { status: 409 });
    if (code === "STOCK_OUT_OF_SYNC") return NextResponse.json({ error: "رصيد المنتج العام لا يطابق رصيد المخزن. راجع المخزون قبل البيع." }, { status: 409 });
    if (code === "CURRENCY_MISMATCH") return NextResponse.json({ error: "لا يمكن جمع عملات مختلفة في عملية بيع واحدة." }, { status: 409 });
    console.error("POS sale failed", error);
    return NextResponse.json({ error: "تعذر تسجيل عملية البيع." }, { status: 500 });
  }
}
