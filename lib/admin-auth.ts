import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "bola_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes.");
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminSession(admin: { id: string; email: string; role: string }) {
  const token = await new SignJWT({ email: admin.email, role: admin.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function getAdminSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") return null;
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export async function clearAdminSession() {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
