import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const recentAttempts = await prisma.adminLoginAttempt.count({
    where: { email, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
  });
  if (recentAttempts >= 5) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  const valid = Boolean(admin?.isActive && await compare(parsed.data.password, admin?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid"));
  if (!valid || !admin) {
    await prisma.adminLoginAttempt.create({ data: { email } });
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await prisma.adminLoginAttempt.deleteMany({
    where: { email, createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } },
  });
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await createAdminSession({ id: admin.id, email: admin.email, role: admin.role });

  return NextResponse.json({ ok: true, admin: { name: admin.name, email: admin.email, role: admin.role } });
}
