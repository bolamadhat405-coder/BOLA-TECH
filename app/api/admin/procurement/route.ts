import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

async function adminId() {
  const session = await getAdminSession();
  if (!session) return null;
  const user = await prisma.adminUser.findFirst({ where: { id: session.id, isActive: true }, select: { id: true } });
  return user?.id ?? null;
}
function originAllowed(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function GET() {
  const actorId = await adminId();
  if (!actorId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const [suppliers, warehouses, purchaseOrders, products] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" }, take: 300 }),
    prisma.warehouse.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { stocks: true } } }, take: 200 }),
    prisma.purchaseOrder.findMany({ orderBy: { createdAt: "desc" }, include: { supplier: { select: { name: true, code: true } }, warehouse: { select: { name: true, code: true } }, items: { include: { product: { select: { sku: true, nameAr: true, nameEn: true } } } } }, take: 100 }),
    prisma.product.findMany({ where: { kind: "PHYSICAL" }, select: { id: true, sku: true, nameAr: true, nameEn: true, costMinor: true, stockQuantity: true }, orderBy: { nameAr: "asc" }, take: 500 }),
  ]);
  return NextResponse.json({ suppliers, warehouses, purchaseOrders, products });
}

const supplierSchema = z.object({
  type: z.literal("supplier"), code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(160), contactName: z.string().trim().max(120).optional(),
  email: z.string().email().optional().or(z.literal("")), phone: z.string().trim().max(40).optional(),
  taxNumber: z.string().trim().max(80).optional(), address: z.string().max(2000).optional(),
  currency: z.string().length(3).default("EGP"), paymentTerms: z.string().max(120).optional(), notes: z.string().max(3000).optional(),
});
const warehouseSchema = z.object({
  type: z.literal("warehouse"), code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(160), address: z.string().max(2000).optional(), managerName: z.string().max(120).optional(),
});
const purchaseSchema = z.object({
  type: z.literal("purchaseOrder"), number: z.string().trim().min(3).max(60), supplierId: z.string().min(1),
  warehouseId: z.string().min(1), currency: z.string().length(3).default("EGP"),
  expectedAt: z.string().datetime().optional(), notes: z.string().max(3000).optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive().max(100000), unitCost: z.number().int().nonnegative().max(1000000000) })).min(1).max(100),
});

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  const actorId = await adminId();
  if (!actorId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const raw = await request.json().catch(() => null);
  const type = raw && typeof raw === "object" ? (raw as { type?: string }).type : undefined;
  const schema = type === "supplier" ? supplierSchema : type === "warehouse" ? warehouseSchema : type === "purchaseOrder" ? purchaseSchema : null;
  if (!schema) return NextResponse.json({ error: "نوع العملية غير صحيح." }, { status: 400 });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "راجع البيانات المدخلة.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    if (parsed.data.type === "supplier") {
      const { type: _, ...data } = parsed.data;
      const supplier = await prisma.supplier.create({ data: { ...data, email: data.email || null } });
      await prisma.auditLog.create({ data: { actorType: "ADMIN", actorId, action: "SUPPLIER_CREATED", entityType: "Supplier", entityId: supplier.id } });
      return NextResponse.json({ supplier }, { status: 201 });
    }
    if (parsed.data.type === "warehouse") {
      const { type: _, ...data } = parsed.data;
      const warehouse = await prisma.warehouse.create({ data });
      await prisma.auditLog.create({ data: { actorType: "ADMIN", actorId, action: "WAREHOUSE_CREATED", entityType: "Warehouse", entityId: warehouse.id } });
      return NextResponse.json({ warehouse }, { status: 201 });
    }
    const input = parsed.data;
    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const [supplier, warehouse] = await Promise.all([
        tx.supplier.findFirst({ where: { id: input.supplierId, isActive: true } }),
        tx.warehouse.findFirst({ where: { id: input.warehouseId, isActive: true } }),
      ]);
      if (!supplier || !warehouse) throw new Error("SUPPLIER_OR_WAREHOUSE_NOT_FOUND");
      const ids = [...new Set(input.items.map(item => item.productId))];
      const products = await tx.product.findMany({ where: { id: { in: ids }, kind: "PHYSICAL" }, select: { id: true } });
      if (products.length !== ids.length) throw new Error("INVALID_PRODUCT");
      const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
      if (!Number.isSafeInteger(subtotal)) throw new Error("TOTAL_TOO_LARGE");
      const order = await tx.purchaseOrder.create({
        data: {
          number: input.number, supplierId: input.supplierId, warehouseId: input.warehouseId,
          status: "ORDERED", orderedAt: new Date(), currency: input.currency, subtotal, notes: input.notes,
          expectedAt: input.expectedAt ? new Date(input.expectedAt) : undefined,
          items: { create: input.items.map(item => ({ productId: item.productId, quantityOrdered: item.quantity, unitCost: item.unitCost })) },
        },
      });
      await tx.auditLog.create({ data: { actorType: "ADMIN", actorId, action: "PURCHASE_ORDER_CREATED", entityType: "PurchaseOrder", entityId: order.id, metadata: { number: order.number, subtotal } } });
      return order;
    });
    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPPLIER_OR_WAREHOUSE_NOT_FOUND") return NextResponse.json({ error: "المورد أو المستودع غير موجود أو غير نشط." }, { status: 404 });
    if (error instanceof Error && error.message === "INVALID_PRODUCT") return NextResponse.json({ error: "أحد المنتجات غير موجود أو ليس منتجًا ماديًا." }, { status: 400 });
    if (error instanceof Error && error.message === "TOTAL_TOO_LARGE") return NextResponse.json({ error: "إجمالي أمر الشراء أكبر من الحد المسموح." }, { status: 400 });
    if (error instanceof Error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "الكود أو الرقم مستخدم بالفعل." }, { status: 409 });
    console.error("Procurement create failed", error);
    return NextResponse.json({ error: "تعذر إنشاء السجل." }, { status: 500 });
  }
}

const receiveSchema = z.object({ action: z.literal("receive"), id: z.string().min(1), items: z.array(z.object({ itemId: z.string().min(1), quantity: z.number().int().positive().max(100000) })).min(1).max(100) });

export async function PATCH(request: NextRequest) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  const actorId = await adminId();
  if (!actorId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const parsed = receiveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات الاستلام غير صحيحة." }, { status: 400 });
  try {
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.purchaseOrder.findUnique({ where: { id: parsed.data.id }, include: { items: true } });
      if (!current || !["ORDERED", "PARTIALLY_RECEIVED"].includes(current.status)) throw new Error("ORDER_NOT_RECEIVABLE");
      const seen = new Set<string>();
      for (const line of parsed.data.items) {
        if (seen.has(line.itemId)) throw new Error("DUPLICATE_LINE");
        seen.add(line.itemId);
        const item = current.items.find(value => value.id === line.itemId);
        if (!item || item.quantityReceived + line.quantity > item.quantityOrdered) throw new Error("QUANTITY_EXCEEDED");
        const changed = await tx.purchaseOrderItem.updateMany({
          where: { id: item.id, quantityReceived: item.quantityReceived },
          data: { quantityReceived: { increment: line.quantity } },
        });
        if (changed.count !== 1) throw new Error("CONCURRENT_RECEIPT");
        await tx.warehouseStock.upsert({
          where: { warehouseId_productId: { warehouseId: current.warehouseId, productId: item.productId } },
          create: { warehouseId: current.warehouseId, productId: item.productId, quantity: line.quantity },
          update: { quantity: { increment: line.quantity } },
        });
        await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: line.quantity } } });
        await tx.stockMovement.create({ data: { productId: item.productId, type: "PURCHASE", quantity: line.quantity, unitCost: item.unitCost, reference: current.number, notes: "Goods received into warehouse" } });
      }
      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: current.id } });
      const complete = updatedItems.every(item => item.quantityReceived === item.quantityOrdered);
      const updated = await tx.purchaseOrder.update({ where: { id: current.id }, data: { status: complete ? "RECEIVED" : "PARTIALLY_RECEIVED", receivedAt: complete ? new Date() : null } });
      await tx.auditLog.create({ data: { actorType: "ADMIN", actorId, action: "PURCHASE_ORDER_RECEIVED", entityType: "PurchaseOrder", entityId: current.id, metadata: { receivedLines: parsed.data.items.length, complete } } });
      return updated;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ purchaseOrder: order });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ORDER_NOT_RECEIVABLE") return NextResponse.json({ error: "أمر الشراء غير موجود أو لا يقبل الاستلام في حالته الحالية." }, { status: 409 });
    if (code === "DUPLICATE_LINE") return NextResponse.json({ error: "لا تكرر نفس بند الاستلام." }, { status: 400 });
    if (code === "QUANTITY_EXCEEDED") return NextResponse.json({ error: "كمية الاستلام تتجاوز الكمية المتبقية في أمر الشراء." }, { status: 409 });
    if (code === "CONCURRENT_RECEIPT") return NextResponse.json({ error: "تم تعديل هذا البند بالتزامن؛ حدّث البيانات وحاول مجددًا." }, { status: 409 });
    console.error("Purchase order receipt failed", error);
    return NextResponse.json({ error: "تعذر تسجيل الاستلام." }, { status: 500 });
  }
}
