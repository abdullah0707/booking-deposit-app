# Selling Miqat — listing notes

Draft copy and a pre-publish checklist for the Gumroad/Codester listing.
Based on the actual, verified feature set — don't claim anything not
listed in `README.md`'s "What's built so far."

## Suggested listing copy

**Title**: Miqat — White-Label Booking & Deposit App (Web + Mobile,
Node.js + Next.js + Flutter)

**One-line pitch**: A complete booking system with deposit payments —
web dashboard, public booking page, and a native mobile app — fully
bilingual (English/Arabic, RTL) and built to be rebranded and resold.

**Feature bullets** (only what's real):
- Customer booking flow: pick a service, pick an available time slot,
  pay a deposit — Stripe/Paymob card checkout, or any number of
  buyer-defined manual channels (bank transfer, InstaPay, mobile
  wallets) with photo-proof upload and owner approval
- No customer accounts needed: a "my bookings" page lets customers check
  their own booking status from the same browser
- Owner dashboard: bookings list, services (fully editable after
  creation — name/price/duration/deposit, not just at setup), working
  hours, payment methods, 30-day trash with restore
- No-code content editor for the public page (add/reorder/remove
  sections) — every text field is bilingual (EN/AR) with an optional
  one-click auto-translate assist, so content stays real EN/AR on both
  platforms, not just the surrounding buttons and menus
- One-time install wizard — no manual database setup for the buyer's own
  clients
- Real email reminders (any SMTP provider) and a working contact form
- Fully bilingual EN/AR with true RTL mirroring on both the web app and
  the Flutter app, including live branding (logo/accent color) applied
  to both from one dashboard screen
- Automated tests covering the booking algorithm, payment webhook
  idempotency, and the trash/purge logic

**Tech stack** (developers buying this care about this being named
explicitly): Node.js + Express + PostgreSQL (Prisma) backend, Next.js 16
admin dashboard and public site, Flutter mobile app, Stripe for payments.

## Before you publish — checklist

- [x] Full real end-to-end walkthrough verified in a live browser: install
      wizard → services → working hours → public booking flow → manual
      payment → proof upload → owner confirms → invoice PDF generated →
      "my bookings" shows the live status. Several real bugs were found
      and fixed this way (a dead-end payment step with zero methods
      enabled, a stale error message, a broken manual-payment upload) —
      see the project's session history for the full list.
- [x] Git repository initialized and pushed to a **private** GitHub repo
      — never make it public before/after selling; buyers get a zip, not
      repo access.
- [x] `scripts/package-for-sale.ps1` — builds the actual sellable zip
      (excludes `.git`, `.claude`, `node_modules`, `.env`, uploads, build
      caches). Run it, then **extract the zip somewhere clean and follow
      `README.md`'s setup from scratch** — that's the real test of what a
      buyer experiences, closer to it than testing in this working copy.
- [ ] Take real screenshots and a 60–90s demo video (install wizard → add
      a service → view the public page → make a test booking → see it in
      the dashboard). Ask your assistant to generate the screenshots via
      a live local run if you haven't yet — the video still needs a
      human to record.
- [ ] Decide your license terms (regular vs. extended/multi-use license
      is the common CodeCanyon/Envato-style split) — a starting
      `LICENSE.md` template exists at the project root; edit the
      bracketed terms (price, support window) to match your decision.
- [ ] Price using the earlier market study as a reference point:
      comparable booking/POS-style scripts on CodeCanyon cluster around
      $49–$99 for a single-business license
- [ ] Paymob is implemented (Intention API + verified HMAC webhook) but
      not yet run against a real Paymob sandbox transaction — the
      merchant account needs full (non-trial) activation first, which
      wasn't available at the time of writing. List Paymob as
      "supported" rather than "verified," or leave that verification to
      a buyer who specifically needs Egypt/MENA card payments.
- [x] `npm run build` in `web/` — confirmed working (all 23 routes ×
      locales), including a real fix to a bug the build itself caught
      (see README)
