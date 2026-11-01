# BOLA TECH

BOLA TECH's Arabic-first corporate platform and digital-services workspace.

## Stack
- Next.js App Router, React, TypeScript
- PostgreSQL + Prisma ORM
- Zod request validation
- Lucide icons and responsive RTL-first interface

## Local setup
1. Install Node.js 22 or newer.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and set `DATABASE_URL`.
4. Apply the database migration: `npx prisma migrate deploy`
5. Start the app: `npm run dev`

## Implemented
- Arabic-first responsive corporate site and English toggle.
- Searchable product/solutions catalog and detail dialogs.
- Inquiry shortlist with add/remove controls.
- Customer inquiry form connected to `POST /api/inquiries`.
- Server-side validation, generated inquiry reference, PostgreSQL persistence, and an initial event record.
- Initial PostgreSQL schema and migration for inquiries, inquiry events, admin users, digital products, and audit logs.
- Basic service health endpoint at `GET /api/health`.

## Configuration still required
The inquiry API returns HTTP 503 until a PostgreSQL `DATABASE_URL` is configured and the migration is applied. No database credentials are committed.

## Not yet implemented
Admin sign-in and authorization, private admin inquiry screens, customer accounts and order tracking, payment provider integration, subscription billing, email/WhatsApp notifications, file delivery, and automated customer-site provisioning. These are deliberately not represented as live features until their secure backend integrations and tests exist.

## Checks
```bash
npm run build
npx prisma validate
```
