# Magani – Architecture

Stock control and chronic-care refill reminders for community pharmacies and patent medicine vendors (PPMVs) in West Africa. Built for the CoElevate Fund 2 focus areas: PharmaTech and NCDs.

## System overview

```
 ┌──────────────────┐   ┌───────────────────────┐
 │  Web app (React) │   │ Mobile app (Expo RN)  │
 │  counter / owner │   │ shop staff, offline   │
 └────────┬─────────┘   └──────────┬────────────┘
          │ REST + JWT             │ REST + JWT, outbox sync
          └────────────┬───────────┘
                ┌──────▼───────┐        ┌──────────────┐
                │  API (Node,  │───────▶│ Termii SMS   │
                │  Express)    │        └──────────────┘
                │  node-cron   │
                └──────┬───────┘
                ┌──────▼───────┐
                │  PostgreSQL  │  (Prisma ORM)
                └──────────────┘
```

All three apps are TypeScript and share one package, `@magani/shared`, which holds the Zod validation schemas, API types, the demand forecast and the reminder text. A field rule changed there applies to the API, the web forms and the mobile app at once.

## Repository layout

```
magani/
├─ packages/shared/        Zod schemas, types, forecasting, reminder text
├─ apps/api/               Express + Prisma + PostgreSQL
│  ├─ prisma/schema.prisma Data model
│  ├─ prisma/seed.ts       Demo pharmacy with 28 days of sales
│  └─ src/
│     ├─ auth.ts           Register, login, JWT middleware
│     ├─ routes/           products+stock, sales, patients+refills, dashboard, sync
│     └─ services/         inventory (FEFO), stockview (forecast), reminders, sms
├─ apps/web/               Vite + React 18 + Tailwind + TanStack Query + Recharts
│  └─ src/pages/           Today, Sell, Stock, Patients, Login
└─ apps/mobile/            Expo SDK 51 + expo-router
   ├─ src/sync.tsx         Offline cache + outbox
   └─ app/(tabs)/          Today, Sell, Stock, Patients
```

## Data model

| Table | Purpose |
|---|---|
| Pharmacy | One tenant: pharmacy or PPMV, with state and LGA |
| User | Owner or staff, sign in by phone number |
| Product | Medicine with price, reorder level and a chronic-care (NCD) flag |
| Batch | Batch number, expiry and quantity. Stock lives on batches. |
| StockMovement | Every receive, sale and adjustment. The audit trail. |
| Sale, SaleItem | What was sold, to whom, for how much |
| Patient | Chronic-care patient, with language and recorded consent |
| RefillPlan | Medicine, quantity, interval and next due date |
| Reminder | Each SMS sent, one per plan per due date |

Money is stored in kobo (integers) to avoid rounding errors. Every query is scoped by `pharmacyId` taken from the JWT, so one pharmacy never sees another's data.

## Key flows

**Selling (first-expiry-first-out).** A sale deducts from the batch that expires first, so older stock leaves the shelf before newer stock. Expired batches are never sold. Online sales that exceed stock are rejected with a clear message.

**Days of cover.** For each product the API builds 28 days of daily sales and applies exponential smoothing (α = 0.3) to estimate daily demand. Days of cover is stock on hand divided by that rate. A product is "low" when it is at or below its reorder level or has under 7 days of cover. This is the number shown by the blister-pack meter in both apps.

**Refill reminders.** Every day at 08:00 West Africa Time a job finds active refill plans due within two days and sends one SMS per due date, in Hausa or English. Staff can also send one manually. When a patient collects, the refill is recorded as a sale and the next due date moves forward by the plan's interval.

**Offline sync (mobile).** Drug shops often lose network. The mobile app keeps a snapshot of stock and patients on the phone. Sales and deliveries are written to a local outbox with a client-generated UUID and applied to the local snapshot immediately. When the network returns, the outbox is pushed to `/api/sync/push`. Because each operation carries its own UUID, a retry after a dropped connection is recognised as a duplicate instead of being counted twice. Offline sales that exceed recorded stock are kept (the medicine has already left the shelf) and the app tells staff to recount. Refill collection and reminders need a connection because they touch patient records and SMS.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/register | Create pharmacy and owner account |
| POST | /api/auth/login | Sign in by phone and password |
| GET | /api/auth/me | Current user and pharmacy |
| GET | /api/dashboard | Attention list, 14-day sales, stock with forecast |
| GET/POST/PATCH | /api/products | Stock view with forecast, create, edit |
| GET | /api/products/:id/batches | Batches for a product |
| POST | /api/stock/receive | Record a delivery (creates or tops up a batch) |
| POST | /api/stock/adjust | Damaged, expired or count correction |
| GET | /api/stock/expiring?days=90 | Batches expiring soon |
| GET/POST | /api/sales | List or record a sale |
| GET/POST | /api/patients | List or register a patient (consent required) |
| POST | /api/patients/:id/refills | Add a refill plan |
| GET | /api/refills/due?days=7 | Upcoming refills |
| POST | /api/refills/:id/collect | Patient collected: sale + next due date |
| POST | /api/refills/:id/remind | Send the SMS now |
| DELETE | /api/refills/:id | Stop a plan |
| POST | /api/sync/push | Mobile outbox |
| GET | /api/sync/pull | Mobile snapshot |

## Design

The interface is built for a busy counter and cheap Android phones.

- **Type:** Atkinson Hyperlegible for all body text and numbers (designed for low-vision legibility, with tabular figures), Bricolage Grotesque for headings.
- **Colour:** deep slate-blue ink `#17324D` on a cool paper `#F5F7F4`. Green `#2E7D5B`, amber `#B7791F` and brick `#B3362B` are reserved for stock health, so colour always carries meaning.
- **Signature element:** the blister-pack meter. Ten capsules, three days each, show how long a medicine will last. Popped capsules are the days already gone. Pharmacists read it at a glance without doing arithmetic.
- **Today screen first:** the home page is a list of things to act on (out of stock, refills due, running low, expiring), not a wall of charts.
- Accessible by default: native dialogs with focus trapping, visible keyboard focus, reduced-motion respected, labels on every control.

## Security and data protection

- Passwords hashed with bcrypt, 30-day JWTs, Helmet headers, CORS allow-list.
- Patient records require recorded consent (`consentAt`) before creation, in line with the Nigeria Data Protection Act 2023. Store only what reminders need: name, phone, language and condition group.
- Before pilot: host in-region or on a provider with a data processing agreement, enable database backups, and add staff-level permissions (owner-only price edits and adjustments).

## Roadmap after the MVP

1. Barcode scanning on mobile (expo-camera).
2. WhatsApp reminders alongside SMS.
3. Supplier purchase orders generated from days of cover.
4. Owner reports: expiry losses, NCD adherence rate (refills collected on time), stock-out days per medicine. These are also the impact metrics a health funder will ask for.
5. Python forecasting service (XGBoost) once there are several months of sales history.
