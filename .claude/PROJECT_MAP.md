# Project Map — Miqat (booking-deposit-app)
Last updated: 2026-09-16 (~110 source files)

## Architecture
White-label single-tenant booking-and-deposit product, sold as a source-code template (Gumroad/Codester). Three parts share one backend:
- **backend/** — Node.js + Express + TypeScript + Prisma/PostgreSQL REST API, cron jobs, PDF invoices. Entry point `src/server.ts`.
- **web/** — Next.js 16 (App Router, next-intl EN/AR + RTL): `/admin` dashboard + public storefront at `/`. Entry `src/app/[locale]/layout.tsx`.
- **mobile/** — Flutter (Android/iOS; Web works but has no dedicated support) customer-facing booking app, mirrors web's dynamic content/theming. Entry `lib/main.dart`.

Single business per install (no multi-tenant/marketplace logic). Content is a "bounded section library" (HERO, SERVICE_LIST, CALENDAR, CONTACT_FORM, GALLERY, PRICING) attached to `Page`s, editable from the admin dashboard, with 30-day soft-delete trash. Payments: Stripe or Paymob (keys in `.env`, chosen via `PAYMENT_PROVIDER`) plus unlimited buyer-defined MANUAL methods (bank/wallet transfer with photo-proof + owner approval).

Business branding (name/logo/accent color) is fetched live from the public `GET /business` endpoint by both web (root layout) and mobile (`main.dart` at startup) — a dashboard rebrand applies everywhere without a rebuild.

## backend/prisma
- `schema.prisma` — all models/enums (see below); single-tenant, one `Business` row expected.
- `seed.ts` — dev-only fixture (business/owner/service), NOT the buyer-facing install path; wipes all tables in FK-safe order before reseeding.

**Models**: Business, User (OWNER/STAFF), Service (+locationType ON_SITE/CUSTOMER_ADDRESS/EITHER), WorkingHour, BlockedTime, Booking (state machine PENDING_PAYMENT→CONFIRMED/CANCELLED, or AWAITING_MANUAL_VERIFICATION for manual pay), PaymentMethod, PaymentProof, Invoice (atomic per-business sequential numbering), PaymentWebhookEvent (idempotency ledger), Page, Section (soft-delete via `deletedAt`), ContactSubmission.

## backend/src/routes — one Express router per resource, mounted in server.ts
- `health.ts` — `GET /health` DB connectivity check.
- `install.ts` — `POST /install`, one-time (409 if a Business already exists); creates Business+owner User+seeds a "home" Page with HERO+CALENDAR sections (HERO title bakes in the business name at creation time).
- `auth.ts` — `POST /auth/login` (bcrypt + JWT, 7d expiry).
- `business.ts` — public `GET /business` (name/logo/color) + `GET/PATCH /admin/business`; PATCH auto-refreshes the Hero title if it still matches the install-time default (won't clobber owner-edited text).
- `services.ts` — public `GET /services` (active only) + admin CRUD; DELETE is soft (`active:false`), so past bookings/invoices stay intact.
- `workingHours.ts` — public `GET /working-hours` + `PUT /admin/working-hours` (replaces the whole week).
- `blockedTimes.ts` — public `GET /blocked-times` + admin create/delete (owner-blocked slots, e.g. holidays).
- `availability.ts` — `GET /availability?serviceId&date`, delegates slot math to `lib/availability.ts`.
- `bookings.ts` — `POST /bookings` (creates booking, branches Stripe checkout vs Paymob vs manual), admin list/confirm/reject-manual-payment, public `POST /bookings/:id/payment-proof` (multipart, requires status AWAITING_MANUAL_VERIFICATION).
- `webhooks.ts` — `POST /webhooks/stripe` + `/webhooks/paymob` (raw-body mounted in server.ts for signature verification).
- `pages.ts` — public `GET /pages/:slug`; admin CRUD + soft-delete (cascades to its sections) + restore.
- `sections.ts` — admin CRUD for sections within a page; content validated per-type via `lib/sectionSchemas.ts`; soft-delete + restore.
- `trash.ts` — unified trashed-pages+sections list for the admin Trash screen.
- `uploads.ts` — `POST /admin/uploads` (multer, local disk under `backend/uploads/`, 5MB, jpeg/png/webp/gif only); exports the shared `upload` middleware reused by the public payment-proof route.
- `contact.ts` — public `POST /contact` (stores + best-effort emails owner) + `GET /admin/contact-submissions`.
- `paymentMethods.ts` — public list (enabled only) + admin CRUD for STRIPE/PAYMOB toggles and buyer-defined MANUAL wallets/banks.
- `invoices.ts` — public + admin `GET .../invoice.pdf`, renders via `lib/renderInvoicePdf.ts`.

## backend/src/lib
- `prisma.ts` — shared PrismaClient singleton.
- `auth.ts` — bcrypt hash/verify + JWT sign/verify.
- `business.ts` — `getTheBusiness()`, the single-tenant "fetch the one Business row" helper; throws `NotInstalledError` if none.
- `notInstalledError.ts` — custom error → 503 `{code:"NOT_INSTALLED"}` via server.ts's global error handler.
- `asyncHandler.ts` — wraps every route handler so thrown errors reach the error middleware instead of crashing the process.
- `availability.ts` (+`.test.ts`) — pure slot-computation algorithm (working hours − bookings − blocked times).
- `invoices.ts` (+`.test.ts`) — `issueInvoiceForBooking`, atomic per-business sequential invoice numbering.
- `renderInvoicePdf.ts` — pdfkit-based one-page invoice (no headless-browser dependency).
- `sectionSchemas.ts` (+`.test.ts`) — Zod content schema per SectionType, the "bounded library" contract.
- `notifications/types.ts` — channel abstraction (email now; a doc-comment mentions WhatsApp as a future idea, not implemented).
- `notifications/consoleChannel.ts` / `smtpChannel.ts` (+`.test.ts`) — console fallback vs real SMTP; `buildNotificationChannel()` picks based on env config.
- `payments/types.ts` — `PaymentProvider` interface (Stripe/Paymob pluggable).
- `payments/stripeProvider.ts`, `paymobProvider.ts` — concrete providers (Paymob uses the Intention API).
- `payments/paymobHmac.ts` (+`.test.ts`) — verifies Paymob's callback HMAC (query-string based, not header).
- `payments/applyStripeWebhookEvent.ts` / `applyPaymobWebhookEvent.ts` (+`.test.ts` each) — idempotent webhook→booking-state appliers, both issue invoices on success.
- `payments/index.ts` — barrel export.

## backend/src/jobs (node-cron, scheduled in server.ts)
- `expirePendingBookings.ts` (+`.test.ts`) — every minute, releases PENDING_PAYMENT slots abandoned mid-checkout. AWAITING_MANUAL_VERIFICATION is deliberately excluded (no auto-expiry — manual proof review can take a while).
- `sendReminders.ts` — every 15 min, one-time reminder email for upcoming CONFIRMED bookings.
- `purgeTrash.ts` (+`.test.ts`) — nightly, hard-deletes pages/sections past the 30-day trash window.

## backend/src/middleware
- `requireAuth.ts` — Bearer-JWT guard, populates `req.auth` (userId/businessId/role).

## web/src/app/[locale] — Next.js App Router, `[locale]` = en|ar
- `layout.tsx` — root layout; applies the business's accent color/logo server-side.
- `page.tsx` — public storefront home, renders `/pages/home`'s sections via SectionRenderer.
- `install/page.tsx` — 3-step wizard (business name/lang/timezone → owner email/password → done).
- `booking/confirmed/page.tsx` (+`ConfirmedContent.tsx`) / `booking/cancelled/page.tsx` — Stripe/Paymob redirect landing pages, confirmed one polls booking status.
- `admin/layout.tsx` + `AdminShell.tsx` — auth-gated shell, top nav, and the global "no payment method enabled" warning banner shown on every admin page.
- `admin/page.tsx` — Bookings list (manual-verification proof review, confirm/reject, invoice download).
- `admin/services/page.tsx` — service CRUD incl. inline name/price/duration/deposit edit, photo upload, location-type dropdown.
- `admin/content/page.tsx` — Pages/Sections editor (add/reorder/edit/delete per section type).
- `admin/business/page.tsx` — name/logo/accent-color settings (with a hint that the homepage headline is separate, edited under Content→Hero).
- `admin/payment-methods/page.tsx` — enable Stripe/Paymob, add/edit/toggle unlimited MANUAL wallets (label/instructions/account name/QR).
- `admin/settings/page.tsx` — weekly working hours.
- `admin/trash/page.tsx` — restore soft-deleted pages/sections.
- `admin/login/page.tsx` — owner sign-in.

## web/src/components
- `BookingWizard.tsx` — the 4-step public booking flow (service→time→details→payment); shows an explicit message when zero payment methods are enabled instead of a dead-end blank list.
- `ManualPaymentScreen.tsx` — post-booking manual-transfer instructions + proof upload.
- `LocationPicker.tsx` — Google Maps autocomplete/picker for CUSTOMER_ADDRESS/EITHER services; falls back to a plain text field if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is unset.
- `ServiceCard.tsx` — shared service tile (photo/name/price) used by Services admin, Pricing/ServiceList sections.
- `sections/*.tsx` — one component per SectionType (Hero, ServiceList, Calendar→BookingWizard, ContactForm, Gallery, Pricing) + `SectionRenderer.tsx` dispatch switch.

## web/src/lib
- `api.ts` — fetch wrapper (`NEXT_PUBLIC_API_URL`), `ApiError`.
- `auth/AuthContext.tsx` — owner JWT session (localStorage), `useAuth()`.
- `sections/types.ts` — shared `SECTION_TYPES` + TS types mirroring the backend Zod schemas.
- `i18n/routing.ts` / `i18n/request.ts` — next-intl config (en/ar).
- `proxy.ts` — Next 16's renamed `middleware.ts`; wraps next-intl's routing middleware.

## mobile/lib
- `main.dart` — app root; fetches `GET /business` at startup and overrides `miqatTheme()`'s accent color + passes `logoUrl` down to the Hero/fallback screens.
- `theme/miqat_theme.dart` — design tokens mirroring web's globals.css; `parseHexColor()` + `accentOverride` param for the live-branding fix.
- `api/api_client.dart` — thin http wrapper; `uploadFile()` takes an `XFile` (not `dart:io.File`, for Flutter-Web compatibility) and sets an explicit multipart `contentType` (via `mime`/`http_parser`) since the backend's upload filter rejects `application/octet-stream`.
- `screens/dynamic_home_screen.dart` — fetches `/pages/home`, renders sections or a `_FallbackHome` if none configured yet.
- `screens/section_renderer.dart` — mirrors web's SectionRenderer dispatch; threads `logoUrl` to Hero.
- `screens/sections/*.dart` — one widget per SectionType, mirroring web/src/components/sections.
- `screens/booking_flow_screen.dart` — the 4-step booking flow (service→slot→details→payment); clears any stale "slot taken" error when a new slot is picked.
- `screens/manual_payment_screen.dart` — picks an image via `image_picker` (XFile, not wrapped in `dart:io.File`), submits proof + optional reference number.
- `screens/location_picker_screen.dart` — google_maps_flutter equivalent of web's LocationPicker, same graceful text-fallback via a `GOOGLE_MAPS_API_KEY` dart-define check.
- `models/booking_models.dart` / `content_models.dart` — enums + parsing for ServiceLocationType and SectionType.
- `widgets/glass_chip.dart` — frosted icon container (static chrome only, not scrolling content).
- `widgets/photo_card.dart` — content-sized service photo card.
- `l10n/` — generated `AppLocalizations` (en/ar) from `.arb` files (not listed individually).

## docs/
- `README.md` — local setup, install wizard walkthrough, feature list, Paymob/Google-Maps setup notes, customizing-for-buyers guide.
- `DEPLOYMENT.md` — VPS deployment (Caddy/Nginx, PM2, prod env checklist).
- `LISTING.md` — Gumroad/Codester listing copy + pre-publish checklist (screenshots/video/LICENSE/pricing still open, see below).

## Root config
- `backend/docker-compose.yml` — local Postgres only.
- `backend/.env.example` — all required env vars (DATABASE_URL, JWT_SECRET, STRIPE_*/PAYMOB_*, SMTP_*, `WHATSAPP_BUSINESS_TOKEN` — unused stub, see open items).
- `web/.env.example` — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- No git repository yet at the project root; no LICENSE.md.
