# Miqat — Booking & Deposit App

A white-label booking system: customers book a service and pay a deposit,
the business owner manages everything from a web dashboard. Built to be
resold and rebranded — see "Customizing" below.

## Structure

```
booking-deposit-app/
  backend/   Node.js + Express + PostgreSQL (Prisma) — REST API, cron jobs
  web/       Next.js — /admin dashboard + public booking site (EN/AR)
  mobile/    Flutter — customer-facing booking app (EN/AR)
  docs/      This file + DEPLOYMENT.md
```

## Local setup

### 1. Backend

```
cd backend
cp .env.example .env
docker compose up -d       # starts local PostgreSQL
npm install
npm run prisma:migrate     # applies the schema
npm run dev                 # http://localhost:4000
```

Check it's alive: `curl http://localhost:4000/health` should return
`{"status":"ok","db":"connected"}`.

### 2. Web

```
cd web
npm install
npm run dev                 # http://localhost:3000
```

Visit `http://localhost:3000/en/install` first on a fresh database — this
creates the business and owner account (see "First run" below). After
that, `/` serves the real storefront and `/admin` the dashboard.

For local dev only, `backend/prisma/seed.ts` (`npm run prisma:seed`) skips
the wizard and creates a demo business/owner/service directly — owner
login `owner@miqat.test` / `password123`. Don't use this in production;
use the install wizard instead.

### 3. Mobile

```
cd mobile
flutter pub get
flutter run
```

## First run (the install wizard)

Visit `/en/install` (or `/ar/install`) once. It asks for the business
name, default language, timezone, and an owner email/password, then:
creates the `Business` and `User(OWNER)` rows, seeds a working default
"home" page (hero + booking calendar) so the storefront isn't blank, and
logs the owner in. Running it again once a business already exists
returns a 409 — it's a one-time setup step, not a general "create
another business" endpoint (this is a single-tenant deployment, one
business per install).

The wizard does **not** collect payment provider keys (those stay in
`backend/.env` — see the security note under "Customizing"). After
finishing the wizard, add real Stripe keys to `.env` and restart the
backend before accepting live bookings.

### Testing the Stripe payment flow locally

A restricted key scoped to "One-off payments" in `STRIPE_SECRET_KEY` is
enough to create Checkout Sessions — confirmed working against real
Stripe test mode. Restricted keys don't have the `Debugging Tools`
permission `stripe listen` needs, so to test the **webhook** side without
a live Stripe CLI session, sign a test event locally with Stripe's own
SDK helper instead of forwarding real events:

```js
import Stripe from "stripe";
const stripe = new Stripe("sk_test_dummy_not_used_for_signing");
const payload = JSON.stringify({ id: "evt_x", type: "checkout.session.completed",
  data: { object: { metadata: { bookingId: "<a real pending booking id>" } } } });
const signature = stripe.webhooks.generateTestHeaderString({
  payload, secret: process.env.STRIPE_WEBHOOK_SECRET,
});
// POST payload to http://localhost:4000/webhooks/stripe with header
// "stripe-signature": signature — confirmed this flips the booking to CONFIRMED.
```

For a real deployment, point a Stripe-dashboard webhook endpoint at
`https://<your-domain>/webhooks/stripe` for the `checkout.session.completed`
event and use the signing secret Stripe gives you for that endpoint —
see `DEPLOYMENT.md`.

**Egypt/MENA note**: Stripe does not support merchant accounts registered
in Egypt directly. `PaymentProvider` (`backend/src/lib/payments/types.ts`)
now has a second implementation, **Paymob** (`backend/src/lib/payments/paymobProvider.ts`),
for that market — set `PAYMENT_PROVIDER=paymob` and the `PAYMOB_*` vars in
`.env` to use it instead of Stripe.

### Paymob setup

Uses Paymob's Intention API (their current recommended integration —
one API call creates a payment "intention," the customer completes it on
Paymob's hosted Unified Checkout page, same shape as Stripe Checkout).

From the Paymob dashboard:
- `PAYMOB_SECRET_KEY` / `PAYMOB_PUBLIC_KEY` — Developers → API Keys
- `PAYMOB_INTEGRATION_ID_CARD` — Payment Integrations → your "online card"
  integration's ID
- `PAYMOB_HMAC_SECRET` — Developers → Webhooks → HMAC secret (used to
  verify the `POST /webhooks/paymob` callback is really from Paymob)

Paymob calls `notification_url` (built from `BACKEND_URL`) directly from
its servers, so local testing needs a public tunnel (ngrok/cloudflared)
pointed at port 4000 — unlike Stripe, there's no local-signing shortcut
for this one, since the HMAC has to be verified against a callback body
Paymob itself constructs. The HMAC field order/algorithm
(`backend/src/lib/payments/paymobHmac.ts`) is unit-tested against known
good/bad/tampered inputs, and the webhook-to-booking-state logic
(`applyPaymobWebhookEvent.ts`) has the same idempotency test coverage as
Stripe's — but neither substitutes for running one real transaction
through Paymob's sandbox checkout end-to-end before going live.

## What's built so far

What's in place and verified working end-to-end (including against real
Stripe test-mode credentials and a real signed webhook event, not just up
to a mocked boundary):

- **Backend**: full Prisma schema, the availability algorithm (unit-tested
  edge cases), the booking state machine (`PENDING_PAYMENT →
  CONFIRMED/CANCELLED`), Stripe Checkout deposit payments, idempotent
  webhook handling, the pending-booking expiry sweep and reminder cron
  jobs, auth, the **install wizard**, real **SMTP email reminders** (falls
  back to console logging if unconfigured — see `.env.example`), and a
  **contact-form endpoint** (stores the submission and emails the owner,
  best-effort). A previously-crashing bug was found and fixed: an
  unhandled error in any route used to take down the whole server, not
  just that request — every route is now wrapped so failures return a
  clean error instead.
- **Web**: the admin dashboard (login, bookings, services, working hours,
  content editor, trash) and the public booking flow (service → time slot
  → customer details → Stripe Checkout → confirmation page with status
  polling), all in `next-intl` EN/AR with full RTL, Miqat's design tokens,
  Phosphor icons, and the glass-chip treatment. The home page renders from
  `/pages/home`'s sections (bounded library, see below) instead of
  hardcoded content, with a fallback if none is configured yet. The
  contact-form section actually submits.
- **Mobile**: the same booking flow and dynamic section rendering as the
  web app, calling the real backend and opening the real Stripe Checkout
  URL via the system browser. `flutter analyze` is clean and the widget
  test passes; not run on a physical device/emulator in this session (none
  was available) — the API calls it makes are the same ones already
  proven working from the web app and direct testing.
- **Content engine**: pages and sections CRUD, a bounded section library
  (hero, service list, calendar, contact form, gallery, pricing) with
  server-side content validation per type, reordering, and a 30-day
  soft-delete trash with restore — cascading correctly between a page and
  the sections deleted alongside it (verified against the exact edge case
  that would otherwise break the nightly purge job). The gallery section
  supports real image uploads (`POST /admin/uploads`, local disk storage
  by default, served from `BACKEND_URL/uploads/...`) alongside pasting
  external URLs — auth-gated, image-type/5MB-limited, verified end to end
  in a real browser (upload → save → renders on the live public page).

`npm run build` (production build, all 23 routes/locales) and `npm run
start` were both verified working — a real bug surfaced by the build's
static-generation pass and fixed: `/install` used the auth context but
`AuthProvider` was only scoped inside the admin dashboard layout, so the
install page would have crashed in production. It's now provided at the
root layout, available everywhere.

**Not built yet**: nothing on the original list — gallery upload is done
(see above). Paymob is implemented (see above) but not yet exercised
against a real Paymob sandbox transaction — blocked on the sandbox
merchant account finishing Paymob's own verification (its Secret/Public
keys aren't unlocked yet); that live test is the last verification step
once the account activates.

## "Miqat v2" — locations, multi-method payments, invoices

Built and verified end to end (real HTTP requests, real Playwright
browser runs, `flutter analyze`/`flutter test` clean):

- **Service locations**: each service is `ON_SITE`, `CUSTOMER_ADDRESS`,
  or `EITHER`. Home-service bookings get a real Google Maps location
  picker (web: `@react-google-maps/api`; mobile: `google_maps_flutter`)
  — **falls back to a plain text address field on both platforms** when
  `GOOGLE_MAPS_API_KEY` isn't configured (a real, billed third-party
  dependency shouldn't fully block the core booking flow). Only the
  address *text* is required server-side; lat/lng are an enhancement.
- **Multiple payment methods**: the owner enables any mix of automated
  gateways (Stripe/Paymob — secrets stay in `.env`, unchanged) and
  unlimited buyer-defined manual channels (bank transfer, InstaPay,
  mobile wallets — instructions/account info/QR code, all editable from
  `/admin/payment-methods`). Customers pick one at checkout. Manual
  payments: customer sees instructions, uploads a transfer screenshot +
  optional reference number, booking sits as "awaiting verification"
  until the owner reviews the proof and confirms/rejects from the
  bookings screen.
- **Invoices**: every confirmed booking (automated or manual) gets a
  sequential, per-business invoice number, allocated race-safely (an
  atomic increment inside a transaction — stress-tested with 10
  concurrent confirmations, no duplicates/gaps) and rendered as a real
  downloadable PDF (`pdfkit` — no headless-browser dependency).
- **Photo-rich service cards**: services can have a photo, shown on the
  public storefront, admin dashboard, and the booking flow's own
  service-picker, on both web and mobile.

See `.env.example` (web and backend) for the new `GOOGLE_MAPS_API_KEY`
variable and its real cost/setup notes (usage-based billing beyond a
free tier, domain/package restriction, which APIs to enable) before
relying on the map picker in production.

**Mobile's Maps key is set differently** (Flutter can't read a `.env`
file at build time): pass it as both a shell env var (picked up by
`android/app/build.gradle.kts`'s `manifestPlaceholders`, for the native
map tiles to render) *and* a `--dart-define` (for the app's own
graceful-fallback check), e.g.:
```
GOOGLE_MAPS_API_KEY=your-key flutter run --dart-define=GOOGLE_MAPS_API_KEY=your-key
```
Leaving both unset is fine — the address step just shows a plain text
field instead of the map.

## Customizing (for buyers)

The install wizard sets the business name and owner account. Beyond
that, the **Business** screen in the admin dashboard (`/admin/business`)
lets the owner change the business name, upload a logo, and pick a
brand color — no database editing required. The color actually applies
live: it overrides the `--accent` CSS variable (root layout, server-side,
so it takes effect on the next page load) on both the admin dashboard
and the public site, and the logo replaces the default calendar icon in
the Hero section. Uploads go through `POST /admin/uploads` (local disk
by default). The Flutter app reads the same public `/business` endpoint at
startup and applies the logo and accent color too, so a rebrand from the
dashboard shows up on mobile without a rebuild. The demo brand "Miqat" and
its default color tokens (the shipped defaults before a buyer customizes)
live in:
- `web/src/app/globals.css` (`:root` custom properties)
- `web/src/messages/{en,ar}.json` (`app.name`)
- `mobile/lib/theme/miqat_theme.dart` (`MiqatColors`)
- `mobile/lib/l10n/app_{en,ar}.arb` (`appName`)

**Security note**: payment provider keys (`STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`) live in `backend/.env`, not the database or a
web UI — editing secrets through a browser and storing them in plaintext
in the database is a real security anti-pattern, so the install wizard
deliberately doesn't collect them. See `DEPLOYMENT.md`.

## Deploying

See `DEPLOYMENT.md` for taking this from local dev to a real server with
a real domain, HTTPS, and live payment keys.
