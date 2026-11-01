import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
  const pageSize = 25;
  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, reference: true, customerName: true, email: true, phone: true,
        company: true, message: true, items: true, status: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.inquiry.count(),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
