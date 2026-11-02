import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const admin = await prisma.adminUser.findFirst({ where: { id: session.id, isActive: true }, select: { id: true } });
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const [orders, openOrders, customers, activeProjects, openTickets, products, lowStockProducts, completedRevenue] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ["PENDING","CONFIRMED","PROCESSING","READY","SHIPPED"] } } }),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN","IN_PROGRESS","WAITING"] } } }),
      prisma.product.count({ where: { isPublished: true, kind: "PHYSICAL", stockQuantity: { lte: 3 } } }),
      prisma.order.aggregate({ where: { status: "COMPLETED" }, _sum: { total: true } }),
      prisma.product.count(),
    ]);
    return NextResponse.json({
      metrics: {
        orders, openOrders, customers, activeProjects, openTickets, lowStock: lowStockProducts.filter((product) => product.stockQuantity <= product.lowStockAt).length, products,
        completedRevenueMinor: completedRevenue._sum.total || 0,
      },
      generatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Admin overview metrics failed", error);
    return NextResponse.json({ error: "تعذر تحميل مؤشرات الشركة. تأكد من تطبيق تحديثات قاعدة البيانات." }, { status: 503 });
  }
}
