import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function adminUser() {
  const session = await getAdminSession();
  if (!session) return null;
  return prisma.adminUser.findFirst({ where: { id: session.id, isActive: true }, select: { id: true, email: true } });
}

export async function GET(request: NextRequest) {
  const admin = await adminUser();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" }, skip: (page - 1) * 30, take: 30,
      include: { customer: { select: { name: true, email: true, phone: true } }, items: true },
    }),
    prisma.order.count(),
  ]);
  return NextResponse.json({ orders, total, page, pageSize: 30 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING","CONFIRMED","PROCESSING","READY","SHIPPED","COMPLETED","CANCELLED","REFUNDED"]).optional(),
  paymentStatus: z.enum(["UNPAID","PENDING_REVIEW","PAID","FAILED","REFUNDED"]).optional(),
}).refine((value) => value.status !== undefined || value.paymentStatus !== undefined);

export async function PATCH(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  const admin = await adminUser();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "تعديل غير صالح." }, { status: 400 });
  const { id, ...data } = parsed.data;
  try {
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id }, select: { id: true, status: true, paymentStatus: true, items: true } });
      if (!current) throw new Error("NOT_FOUND");
      if (current.status === "CANCELLED" && data.status && data.status !== "CANCELLED") throw new Error("CANCELLED_ORDER_LOCKED");
      if (["SHIPPED", "COMPLETED", "REFUNDED"].includes(current.status) && data.status === "CANCELLED") throw new Error("ORDER_ALREADY_FULFILLED");
      if (data.status === "CANCELLED" && current.status !== "CANCELLED") {
        for (const item of current.items) {
          if (!item.productId) continue;
          const product = await tx.product.findUnique({ where: { id: item.productId }, select: { id: true, kind: true } });
          if (product?.kind === "PHYSICAL") {
            await tx.product.update({ where: { id: product.id }, data: { stockQuantity: { increment: item.quantity } } });
            await tx.stockMovement.create({ data: { productId: product.id, type: "RETURN", quantity: item.quantity, reference: id, notes: "Cancelled order stock restoration" } });
          }
        }
      }
      const updated = await tx.order.update({ where: { id }, data });
      await tx.auditLog.create({
        data: { actorType: "ADMIN", actorId: admin.id, action: "ORDER_UPDATED", entityType: "Order", entityId: id, metadata: { fromStatus: current.status, toStatus: data.status, fromPayment: current.paymentStatus, toPayment: data.paymentStatus } },
      });
      return updated;
    });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    if (error instanceof Error && error.message === "CANCELLED_ORDER_LOCKED") return NextResponse.json({ error: "لا يمكن إعادة فتح طلب ملغي؛ أنشئ طلبًا جديدًا لتجنب تكرار حركة المخزون." }, { status: 409 });
    if (error instanceof Error && error.message === "ORDER_ALREADY_FULFILLED") return NextResponse.json({ error: "لا يمكن إلغاء طلب تم شحنه أو إكماله أو استرداده من هذه الشاشة." }, { status: 409 });
    console.error("Order update failed", error);
    return NextResponse.json({ error: "تعذر تحديث الطلب." }, { status: 500 });
  }
}
