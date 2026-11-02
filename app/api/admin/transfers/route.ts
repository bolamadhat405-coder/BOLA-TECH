import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
async function actor() {
  const session = await getAdminSession();
  if (!session) return null;
  const user = await prisma.adminUser.findFirst({ where: { id: session.id, isActive: true }, select: { id: true } });
  return user?.id ?? null;
}
function sameOrigin(req: NextRequest) { const origin = req.headers.get("origin"); return !origin || origin === req.nextUrl.origin; }

export async function GET() {
  const actorId = await actor();
  if (!actorId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const transfers = await prisma.stockTransfer.findMany({
    orderBy: { createdAt: "desc" }, take: 100,
    include: { fromWarehouse: { select: { name: true, code: true } }, toWarehouse: { select: { name: true, code: true } }, items: { include: { product: { select: { sku: true, nameAr: true, nameEn: true } } } } },
  });
  const warehouses = await prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const products = await prisma.product.findMany({ where: { kind: "PHYSICAL" }, select: { id: true, sku: true, nameAr: true, nameEn: true }, orderBy: { nameAr: "asc" } });
  return NextResponse.json({ transfers, warehouses, products });
}

const createSchema = z.object({
  reference: z.string().trim().min(3).max(60), fromWarehouseId: z.string().min(1), toWarehouseId: z.string().min(1),
  notes: z.string().max(2000).optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive().max(100000) })).min(1).max(100),
});
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  const actorId = await actor();
  if (!actorId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "راجع بيانات التحويل." }, { status: 400 });
  if (parsed.data.fromWarehouseId === parsed.data.toWarehouseId) return NextResponse.json({ error: "اختر مستودعين مختلفين." }, { status: 400 });
  try {
    const transfer = await prisma.$transaction(async tx => {
      const [from, to] = await Promise.all([
        tx.warehouse.findFirst({ where: { id: parsed.data.fromWarehouseId, isActive: true } }),
        tx.warehouse.findFirst({ where: { id: parsed.data.toWarehouseId, isActive: true } }),
      ]);
      if (!from || !to) throw new Error("WAREHOUSE_MISSING");
      const productIds = [...new Set(parsed.data.items.map(x => x.productId))];
      const products = await tx.product.findMany({ where: { id: { in: productIds }, kind: "PHYSICAL" }, select: { id: true } });
      if (products.length !== productIds.length) throw new Error("PRODUCT_MISSING");
      return tx.stockTransfer.create({ data: {
        reference: parsed.data.reference, fromWarehouseId: from.id, toWarehouseId: to.id, notes: parsed.data.notes,
        items: { create: parsed.data.items.map(x => ({ productId: x.productId, quantity: x.quantity })) },
      } });
    });
    await prisma.auditLog.create({ data: { actorType: "ADMIN", actorId, action: "STOCK_TRANSFER_CREATED", entityType: "StockTransfer", entityId: transfer.id } });
    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "WAREHOUSE_MISSING") return NextResponse.json({ error: "أحد المستودعين غير موجود أو غير نشط." }, { status: 404 });
    if (error instanceof Error && error.message === "PRODUCT_MISSING") return NextResponse.json({ error: "أحد المنتجات غير موجود أو غير مادي." }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "رقم التحويل مستخدم بالفعل." }, { status: 409 });
    return NextResponse.json({ error: "تعذر إنشاء التحويل." }, { status: 500 });
  }
}

const actionSchema = z.object({ id: z.string().min(1), action: z.enum(["ship", "receive"]) });
export async function PATCH(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  const actorId = await actor();
  if (!actorId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "الإجراء غير صحيح." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async tx => {
      const transfer = await tx.stockTransfer.findUnique({ where: { id: parsed.data.id }, include: { items: true } });
      if (!transfer) throw new Error("TRANSFER_MISSING");
      if (parsed.data.action === "ship") {
        if (transfer.status !== "DRAFT") throw new Error("BAD_STATE");
        for (const item of transfer.items) {
          const changed = await tx.warehouseStock.updateMany({
            where: { warehouseId: transfer.fromWarehouseId, productId: item.productId, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          });
          if (changed.count !== 1) throw new Error("INSUFFICIENT_STOCK");
          await tx.stockMovement.create({ data: { productId: item.productId, type: "ADJUSTMENT", quantity: -item.quantity, reference: transfer.reference, notes: "Stock transfer dispatched from source warehouse" } });
        }
        return tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: "IN_TRANSIT", shippedAt: new Date() } });
      }
      if (transfer.status !== "IN_TRANSIT") throw new Error("BAD_STATE");
      for (const item of transfer.items) {
        await tx.warehouseStock.upsert({
          where: { warehouseId_productId: { warehouseId: transfer.toWarehouseId, productId: item.productId } },
          create: { warehouseId: transfer.toWarehouseId, productId: item.productId, quantity: item.quantity },
          update: { quantity: { increment: item.quantity } },
        });
        await tx.stockMovement.create({ data: { productId: item.productId, type: "ADJUSTMENT", quantity: item.quantity, reference: transfer.reference, notes: "Stock transfer received into destination warehouse" } });
      }
      return tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: "RECEIVED", receivedAt: new Date() } });
    }, { isolationLevel: "Serializable" });
    await prisma.auditLog.create({ data: { actorType: "ADMIN", actorId, action: parsed.data.action === "ship" ? "STOCK_TRANSFER_SHIPPED" : "STOCK_TRANSFER_RECEIVED", entityType: "StockTransfer", entityId: result.id } });
    return NextResponse.json({ transfer: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TRANSFER_MISSING") return NextResponse.json({ error: "التحويل غير موجود." }, { status: 404 });
    if (code === "BAD_STATE") return NextResponse.json({ error: "حالة التحويل لا تسمح بهذا الإجراء." }, { status: 409 });
    if (code === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "الرصيد المتاح في المستودع المصدر غير كافٍ." }, { status: 409 });
    console.error("Stock transfer action failed", error);
    return NextResponse.json({ error: "تعذر تنفيذ حركة التحويل." }, { status: 500 });
  }
}
