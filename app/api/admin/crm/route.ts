import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

async function authorized() {
  const session = await getAdminSession();
  if (!session) return null;
  return prisma.adminUser.findFirst({ where: { id: session.id, isActive: true }, select: { id: true } });
}

function originAllowed(req: NextRequest) {
  const origin = req.headers.get("origin");
  return !origin || origin === req.nextUrl.origin;
}

export async function GET() {
  const admin = await authorized();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const [leads, customers] = await Promise.all([
    prisma.workspaceRecord.findMany({ where: { area: "CRM" }, orderBy: { updatedAt: "desc" }, take: 300 }),
    prisma.customer.findMany({ where: { isActive: true }, select: { id: true, name: true, email: true, phone: true, company: true, notes: true, createdAt: true, _count: { select: { orders: true, projects: true, tickets: true } } }, orderBy: { updatedAt: "desc" }, take: 300 }),
  ]);
  return NextResponse.json({ leads, customers });
}

const createSchema = z.object({
  title: z.string().trim().min(2).max(160),
  customer: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(3000).optional(),
  owner: z.string().trim().max(120).optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"]).default("NEW"),
  value: z.number().int().nonnegative().max(100000000000).optional(),
  dueAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  const admin = await authorized();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "راجع بيانات الفرصة." }, { status: 400 });
  const d = parsed.data;
  const lead = await prisma.workspaceRecord.create({ data: {
    area: "CRM", title: d.title, customer: d.customer || null, description: d.description || null,
    owner: d.owner || null, status: d.status, amountMinor: d.value ?? null, currency: "EGP",
    dueAt: d.dueAt ? new Date(d.dueAt) : null,
    data: { source: "crm_pipeline", createdBy: admin.id },
  } });
  await prisma.auditLog.create({ data: { actorType: "ADMIN", actorId: admin.id, action: "CRM_LEAD_CREATED", entityType: "WorkspaceRecord", entityId: lead.id } });
  return NextResponse.json({ lead }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"]).optional(),
  owner: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(3000).optional(),
}).refine(v => v.status !== undefined || v.owner !== undefined || v.description !== undefined);

export async function PATCH(req: NextRequest) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  const admin = await authorized();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "التعديل غير صالح." }, { status: 400 });
  const { id, ...data } = parsed.data;
  const exists = await prisma.workspaceRecord.findFirst({ where: { id, area: "CRM" }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "الفرصة غير موجودة." }, { status: 404 });
  const lead = await prisma.workspaceRecord.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { actorType: "ADMIN", actorId: admin.id, action: "CRM_LEAD_UPDATED", entityType: "WorkspaceRecord", entityId: id, metadata: data } });
  return NextResponse.json({ lead });
}
