import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  let database: "connected" | "not_configured" | "unavailable" = "not_configured";
  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "connected";
    } catch {
      database = "unavailable";
    }
  }

  return NextResponse.json({
    ok: database === "connected",
    service: "bola-tech-web",
    database,
    timestamp: new Date().toISOString(),
  }, { status: database === "connected" ? 200 : 503 });
}
