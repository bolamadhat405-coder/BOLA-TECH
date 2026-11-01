import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const env = z.object({
  ADMIN_NAME: z.string().trim().min(2).max(100),
  ADMIN_EMAIL: z.string().trim().email(),
  ADMIN_PASSWORD: z.string().min(12).max(200),
});

async function main() {
  const parsed = env.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, and a strong ADMIN_PASSWORD (at least 12 characters).");
  }
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = parsed.data;
  const email = ADMIN_EMAIL.toLowerCase();
  const passwordHash = await hash(ADMIN_PASSWORD, 12);
  await prisma.adminUser.upsert({
    where: { email },
    update: { name: ADMIN_NAME, passwordHash, isActive: true },
    create: { name: ADMIN_NAME, email, passwordHash, role: "OWNER", isActive: true },
  });
  process.stdout.write(`Admin account ready for ${email}\n`);
}

main().finally(async () => prisma.$disconnect());
