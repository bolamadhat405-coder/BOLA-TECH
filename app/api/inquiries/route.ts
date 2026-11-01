import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const inquirySchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(4000),
  items: z.array(z.object({
    id: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(160),
  })).min(1).max(30),
  website: z.string().max(200).optional(),
});

function makeReference() {
  return `BOLA-${Date.now().toString(36).toUpperCase()}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the required fields.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Honeypot: silently accept bot submissions without storing them.
  if (parsed.data.website?.trim()) {
    return NextResponse.json({ ok: true, reference: "received" }, { status: 202 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Inquiry service is not configured yet. Please try again later." },
      { status: 503 },
    );
  }

  try {
    const recentFromEmail = await prisma.inquiry.count({
      where: { email: parsed.data.email.toLowerCase(), createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
    });
    if (recentFromEmail >= 5) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const reference = makeReference();
    const inquiry = await prisma.inquiry.create({
      data: {
        reference,
        customerName: parsed.data.customerName,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone || null,
        company: parsed.data.company || null,
        message: parsed.data.message,
        items: parsed.data.items,
        events: {
          create: {
            actorType: "SYSTEM",
            actorLabel: "Website",
            action: "INQUIRY_RECEIVED",
            details: { source: "website" },
          },
        },
      },
      select: { reference: true, createdAt: true },
    });

    return NextResponse.json(
      { ok: true, reference: inquiry.reference, receivedAt: inquiry.createdAt },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to persist inquiry", error);
    return NextResponse.json(
      { error: "We could not save your inquiry. Please try again." },
      { status: 500 },
    );
  }
}
