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
  pay a deposit via Stripe Checkout, get a confirmation page
- Owner dashboard: bookings list, services, working hours, no-code
  content editor for the public page (add/reorder/remove sections),
  30-day trash with restore
- One-time install wizard — no manual database setup for the buyer's own
  clients
- Real email reminders (any SMTP provider) and a working contact form
- Fully bilingual EN/AR with true RTL mirroring, not just translated
  strings — on both the web app and the Flutter app
- Automated tests covering the booking algorithm, payment webhook
  idempotency, and the trash/purge logic

**Tech stack** (developers buying this care about this being named
explicitly): Node.js + Express + PostgreSQL (Prisma) backend, Next.js 16
admin dashboard and public site, Flutter mobile app, Stripe for payments.

## Before you publish — checklist

- [ ] Run through `README.md`'s local setup once yourself end to end,
      fresh (delete the dev DB volume and start clean), so the first
      thing a buyer does matches what's documented
- [ ] Take real screenshots: the public booking flow (all 3 steps), the
      admin dashboard (bookings, content editor, trash), the install
      wizard, and the mobile app. (Not generated in this session — no
      browser/device was available; you'll need to do this yourself.)
- [ ] Record a 60–90 second screen-capture walkthrough: install wizard →
      add a service → view the public page → make a test booking → see
      it in the dashboard
- [ ] Decide your license terms (regular vs. extended/multi-use license
      is the common CodeCanyon/Envato-style split) and put them in a
      `LICENSE.md` — not drafted here, since license terms are a business
      decision, not a technical one
- [ ] Price using the earlier market study as a reference point:
      comparable booking/POS-style scripts on CodeCanyon cluster around
      $49–$99 for a single-business license
- [ ] Paymob is implemented (Intention API + verified HMAC webhook) but
      not yet run against a real Paymob sandbox transaction — do that
      once real sandbox keys are available, before listing "Egypt/MENA
      support" as verified rather than "supported"
- [x] `npm run build` in `web/` — confirmed working (all 23 routes ×
      locales), including a real fix to a bug the build itself caught
      (see README)
