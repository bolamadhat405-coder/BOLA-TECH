import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  reference: z.string().trim().min(8).max(80),
  email: z.string().trim().email().max(254),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid reference and email." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Tracking service is not configured." }, { status: 503 });

  const inquiry = await prisma.inquiry.findFirst({
    where: { reference: parsed.data.reference, email: parsed.data.email.toLowerCase() },
    select: {
      reference: true, status: true, createdAt: true, updatedAt: true, items: true,
      events: { orderBy: { createdAt: "asc" }, select: { action: true, createdAt: true } },
    },
  });
  if (!inquiry) return NextResponse.json({ error: "No request matches those details." }, { status: 404 });
  return NextResponse.json({ inquiry });
}
