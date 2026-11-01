import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
