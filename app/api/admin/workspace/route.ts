import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

const areas = ["CRM","PROJECTS","FINANCE","INVENTORY","HR","SALES","SUPPORT"] as const;
const createSchema = z.object({
  area: z.enum(areas),
  title: z.string().trim().min(2).max(160),
  description: z.string().max(5000).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  customer: z.string().trim().max(160).optional(),
  owner: z.string().trim().max(160).optional(),
  amountMinor: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).default("EGP"),
  dueAt: z.string().datetime().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});
const patchSchema = createSchema.partial().extend({ id: z.string().min(1) });

export async function GET(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const area = request.nextUrl.searchParams.get("area");
  if (area && !areas.includes(area as typeof areas[number])) {
    return NextResponse.json({ error: "القسم غير صحيح" }, { status: 400 });
  }
  const records = await prisma.workspaceRecord.findMany({
    where: area ? { area: area as typeof areas[number] } : undefined,
    orderBy: [{ updatedAt: "desc" }],
    take: 250,
  });
  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "راجع البيانات المدخلة", details: parsed.error.flatten() }, { status: 400 });
  const value = parsed.data;
  const record = await prisma.workspaceRecord.create({
    data: {
      ...value,
      dueAt: value.dueAt ? new Date(value.dueAt) : undefined,
      data: value.data ? (value.data as Prisma.InputJsonValue) : undefined,
    },
  });
  await prisma.auditLog.create({
    data: { actorType: "ADMIN", actorId: admin.id, action: "WORKSPACE_RECORD_CREATED", entityType: value.area, entityId: record.id },
  });
  return NextResponse.json({ record }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "راجع البيانات المدخلة", details: parsed.error.flatten() }, { status: 400 });
  const { id, ...value } = parsed.data;
  const record = await prisma.workspaceRecord.update({
    where: { id },
    data: { ...value, data: value.data ? (value.data as Prisma.InputJsonValue) : undefined, dueAt: value.dueAt ? new Date(value.dueAt) : value.dueAt },
  }).catch(() => null);
  if (!record) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  await prisma.auditLog.create({
    data: { actorType: "ADMIN", actorId: admin.id, action: "WORKSPACE_RECORD_UPDATED", entityType: record.area, entityId: record.id },
  });
  return NextResponse.json({ record });
}
