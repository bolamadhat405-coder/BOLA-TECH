import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "NEW", "REVIEWING", "WAITING_FOR_CUSTOMER", "APPROVED",
    "IN_PROGRESS", "READY_FOR_DELIVERY", "COMPLETED", "CANCELLED",
  ]),
});

export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.inquiry.findUnique({ where: { id: parsed.data.id }, select: { id: true, status: true } });
      if (!current) throw new Error("NOT_FOUND");
      await tx.inquiry.update({ where: { id: current.id }, data: { status: parsed.data.status } });
      await tx.inquiryEvent.create({
        data: {
          inquiryId: current.id,
          actorType: "ADMIN",
          actorLabel: admin.email,
          action: "STATUS_CHANGED",
          details: { from: current.status, to: parsed.data.status },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "ADMIN",
          actorId: admin.id,
          action: "INQUIRY_STATUS_CHANGED",
          entityType: "Inquiry",
          entityId: current.id,
          metadata: { from: current.status, to: parsed.data.status },
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
    }
    console.error("Failed to update inquiry status", error);
    return NextResponse.json({ error: "Could not update inquiry." }, { status: 500 });
  }
}
