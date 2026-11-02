import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function authorized() {
  const session = await getAdminSession();
  if (!session) return null;
  return prisma.adminUser.findFirst({
    where: { id: session.id, isActive: true },
    select: { id: true, email: true, role: true },
  });
}

const productSchema = z.object({
  sku: z.string().trim().min(2).max(60),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  nameAr: z.string().trim().min(2).max(160),
  nameEn: z.string().trim().min(2).max(160),
  descriptionAr: z.string().max(5000).default(""),
  descriptionEn: z.string().max(5000).default(""),
  category: z.string().trim().min(2).max(80),
  kind: z.enum(["PHYSICAL", "DIGITAL", "SERVICE"]).default("PHYSICAL"),
  priceMinor: z.number().int().nonnegative().max(1000000000),
  costMinor: z.number().int().nonnegative().max(1000000000).default(0),
  currency: z.string().length(3).default("EGP"),
  stockQuantity: z.number().int().nonnegative().max(1000000).default(0),
  lowStockAt: z.number().int().nonnegative().max(1000000).default(3),
  isPublished: z.boolean().default(false),
});
const patchSchema = productSchema.partial().extend({ id: z.string().min(1) });

export async function GET() {
  const admin = await authorized();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const products = await prisma.product.findMany({ orderBy: { updatedAt: "desc" }, take: 300 });
  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  const admin = await authorized();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "راجع بيانات المنتج.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    const product = await prisma.product.create({ data: parsed.data });
    await prisma.auditLog.create({ data: { actorType: "ADMIN", actorId: admin.id, action: "PRODUCT_CREATED", entityType: "Product", entityId: product.id } });
    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "رمز SKU أو الرابط المختصر مستخدم بالفعل." }, { status: 409 });
  }
}

export async function PATCH(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  const admin = await authorized();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "راجع بيانات التعديل.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { id, ...data } = parsed.data;
  try {
    const product = await prisma.product.update({ where: { id }, data });
    await prisma.auditLog.create({ data: { actorType: "ADMIN", actorId: admin.id, action: "PRODUCT_UPDATED", entityType: "Product", entityId: id } });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "المنتج غير موجود أو توجد قيمة مكررة." }, { status: 404 });
  }
}
