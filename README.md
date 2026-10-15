# Magani and CareBridge

Two products in one TypeScript monorepo, sharing one design system (`packages/ui`):

- **Magani**: pharmacy stock control, chronic-care refill reminders, and a **partner API** that lets hospitals and platforms send prescriptions to registered pharmacies. API, web app and offline-capable mobile app. See ARCHITECTURE.md.
- **CareBridge**: verified medical fundraising. Hospital officers submit cases, CareBridge reviews them, donors give, and money goes only to the treating hospital or to a Magani pharmacy that dispenses the medicine. It talks to Magani only through the partner API ([docs/partner-api.md](docs/partner-api.md)).

| App | Folder | URL |
|---|---|---|
| Magani API | `apps/api` | http://localhost:4000 |
| Magani web | `apps/web` | http://localhost:5173 |
| CareBridge API | `apps/carebridge-api` | http://localhost:4100 (own database, `carebridge`) |
| CareBridge web | `apps/carebridge` | http://localhost:5180 |

## Requirements

Node 20+, Docker (for PostgreSQL), and the Expo Go app on an Android phone for mobile testing.

## Run it

```bash
npm install
npm run db:up                                  # PostgreSQL in Docker
cp apps/api/.env.example apps/api/.env         # set JWT_SECRET
npm run db:migrate                             # creates tables (name the migration "init")
npm run db:seed                                # demo pharmacy
npm run dev:api                                # http://localhost:4000
npm run dev:web                                # http://localhost:5173
```

Sign in with **08000000000 / demo1234**.

### CareBridge

```bash
createdb -O magani carebridge                                   # or create it in Docker's PostgreSQL
cp apps/carebridge-api/.env.example apps/carebridge-api/.env    # set JWT_SECRET
npm run carebridge:migrate
npm run carebridge:seed                                         # admin, officer, hospitals, two cases
npm run partner:create -w @magani/api -- "CareBridge" PLATFORM http://localhost:4100/api/webhooks/magani
# put the printed API key and webhook secret in apps/carebridge-api/.env (MAGANI_API_KEY, MAGANI_WEBHOOK_SECRET)
npm run dev:carebridge-api                                      # http://localhost:4100
npm run dev:carebridge                                          # http://localhost:5180
```

Console sign-in: **admin@carebridge.test / admin12345** (platform admin) and **officer@carebridge.test / officer12345** (hospital officer). Change both before anyone else can reach the server.

For a pharmacy to receive orders, its owner turns on **Accept prescription orders** in Magani's Pharmacy settings. Only outlets registered as pharmacies (not patent medicine vendors) are offered to partners.

Without `PAYSTACK_SECRET_KEY`, CareBridge runs in **test mode**: donations are recorded as paid without charging anyone. With a key, donors pay through Paystack and are verified on return.

### Hospital integrations

Any hospital system can send prescriptions to Magani pharmacies. Issue it a key with `npm run partner:create -w @magani/api -- "<Hospital name>" HOSPITAL [webhookUrl]` and share [docs/partner-api.md](docs/partner-api.md).

### Mobile

```bash
cp apps/mobile/.env.example apps/mobile/.env   # set your computer's LAN IP
npm run dev:mobile                             # scan the QR code with Expo Go
```

Turn on airplane mode, record a sale, turn it off again: the sync strip shows the change waiting, then synced.

### SMS

Without `TERMII_API_KEY`, reminders print to the API console. Add a Termii key and sender ID to send real SMS. Have a native speaker review the Hausa reminder text in `packages/shared/src/domain.ts` before the pilot.

## Deploy

- API: any Node host (Render, Railway, a VPS). `npm run build -w @magani/api`, then `npm run start -w @magani/api`. Run `npx prisma migrate deploy` on release.
- Database: managed PostgreSQL.
- Web: `npm run build -w @magani/web` and serve `apps/web/dist`, proxying `/api` to the API.
- Mobile: `eas build -p android` for an APK to install on pilot phones.
