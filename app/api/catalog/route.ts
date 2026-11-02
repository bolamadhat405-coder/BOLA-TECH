import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ products: [] });
  try {
    const products = await prisma.product.findMany({
      where: { isPublished: true },
      select: {
        id: true, sku: true, slug: true, nameAr: true, nameEn: true,
        descriptionAr: true, descriptionEn: true, category: true, kind: true,
        priceMinor: true, currency: true, stockQuantity: true,
      },
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
      take: 200,
    });
    return NextResponse.json({ products }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Catalog read failed", error);
    return NextResponse.json({ error: "Catalog is temporarily unavailable." }, { status: 503 });
  }
}
