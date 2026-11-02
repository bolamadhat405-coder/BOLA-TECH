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
- Basic service health endpoint at `GET /api/health` that checks database connectivity.
- Protected admin portal at `/admin` with hashed-password login, signed HTTP-only sessions, failed-login throttling, inquiry search, and audited status updates.
- Customer tracking portal at `/track`, requiring both the inquiry reference and matching email address.
- Original orbital visual identity assets: a digital planet hero, connected-data orbital network, and deep-space visual, stored under `public/visuals`.
- Admin command center at `/admin` with overview, inquiry operations, visual asset library, product and inventory controls, order fulfillment, and company workspace links.\n- Company workspace records for CRM, projects, finance, inventory, HR, sales, and support, with protected CRUD endpoints and audit events.\n- Relational operational schema and PostgreSQL migrations for customers, products, orders, order lines, projects, tasks, invoices, expenses, employees, support tickets, contracts, and stock movements.\n- Public database-backed catalog at `/api/catalog` and customer marketplace at `/shop`.\n- Customer checkout at `POST /api/orders` with validated customer details, cash-on-delivery or manual wallet-transfer request, transactional stock reservation, and inventory movement records.\n- Protected product management at `/admin/products` and `/api/admin/products`, including publishing and stock adjustments.\n- Protected order fulfillment at `/admin/orders` and `/api/admin/orders`, including order and payment status updates, audit logging, and stock restoration on cancellation.

## Configuration still required
The inquiry API returns HTTP 503 until a PostgreSQL `DATABASE_URL` is configured and the migrations are applied. No database credentials are committed.

Admin setup after database configuration:
1. Set a strong random `AUTH_SECRET` (at least 32 bytes) in the server environment.
2. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` (12+ characters) locally or in the secure deployment environment.
3. Run `npm run admin:create` once to create or rotate the owner account.
4. Open `/admin` and sign in. Never commit real environment values.

## Not yet implemented
Full customer accounts and identity lifecycle, verified payment-provider integration (wallet transfers currently require manual review; no payment is processed automatically), shipping-carrier integrations and live rates, tax/legal invoicing workflows, email/WhatsApp notifications, secure digital file delivery, supplier procurement, advanced role/permission matrix, and automated customer-site provisioning. The current marketplace is an operational foundation, not a claim of global-scale production readiness. These features require provider credentials, policy decisions, security review, and end-to-end tests before launch.

## Checks
```bash
npm run build
npx prisma validate
```
