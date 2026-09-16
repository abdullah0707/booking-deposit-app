# Deploying Miqat to production

This covers taking a working local setup (see `README.md`) to a real
server with a real domain. It assumes one VPS running both the backend
and the web app — the simplest setup for a single-tenant deployment.

## 1. Server requirements

- Node.js 20+
- PostgreSQL 16+ (managed or self-hosted)
- A domain with DNS pointed at the server
- A reverse proxy for HTTPS (examples below use Caddy for its automatic
  HTTPS; Nginx + Certbot works identically)

## 2. Database

Use a managed Postgres (Railway, Supabase, RDS, DigitalOcean) or run it
yourself:

```
docker run -d --name miqat-db \
  -e POSTGRES_USER=miqat -e POSTGRES_PASSWORD=<strong-password> -e POSTGRES_DB=miqat \
  -p 5432:5432 -v miqat_pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

Either way, put the real connection string in `backend/.env`'s
`DATABASE_URL` — never reuse the local dev credentials in production.

## 3. Backend

```
cd backend
npm ci
npm run build
npx prisma migrate deploy   # applies migrations, does NOT run the dev wizard
```

Set in `backend/.env` (see `.env.example` for the full list):
- `DATABASE_URL` — the production connection string
- `JWT_SECRET` — a long random value, **not** the dev default
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — **live** keys, not test
  keys, once you're ready to accept real payments
- `SMTP_HOST`/`PORT`/`USER`/`PASS`/`EMAIL_FROM` — for real reminder emails
- `APP_URL` — the public web app URL (used to build Stripe's redirect URLs)

Run it under a process manager so it survives crashes and reboots:

```
npm install -g pm2
pm2 start dist/server.js --name miqat-backend
pm2 save
pm2 startup   # follow the printed instructions to enable on boot
```

Do **not** run `npm run dev` (tsx watch) in production — use the compiled
`dist/server.js` from `npm run build`.

## 4. Web

```
cd web
npm ci
NEXT_PUBLIC_API_URL=https://api.yourdomain.com npm run build
pm2 start "npm run start" --name miqat-web
pm2 save
```

`NEXT_PUBLIC_API_URL` is baked in at build time — rebuild whenever it
changes.

## 5. Reverse proxy + HTTPS (Caddy example)

```
# /etc/caddy/Caddyfile
yourdomain.com {
  reverse_proxy localhost:3000
}
api.yourdomain.com {
  reverse_proxy localhost:4000
}
```

Caddy handles the TLS certificate automatically. Restart Caddy after
editing.

## 6. Stripe webhook (production)

In the Stripe dashboard, add a webhook endpoint pointing at
`https://api.yourdomain.com/webhooks/stripe` for the
`checkout.session.completed` event, then copy the signing secret it
gives you into `STRIPE_WEBHOOK_SECRET` on the server (this is different
from the local-testing value used during development).

## 7. Run the install wizard

Visit `https://yourdomain.com/en/install` once, in a real browser, to
create the business and owner account — this only works once; running it
again after a business already exists returns an error by design.

## 8. Mobile

Point the Flutter app at the real API before building a release:

```
flutter build apk --dart-define=API_URL=https://api.yourdomain.com
flutter build ios --dart-define=API_URL=https://api.yourdomain.com
```

## Checklist before going live

- [ ] `DATABASE_URL` points at production, not local dev
- [ ] `JWT_SECRET` changed from the default
- [ ] Stripe keys are **live**, not test (`sk_live_...` / whsec from the
      live-mode webhook)
- [ ] SMTP configured — check a real reminder email arrives
- [ ] Backend and web both run under PM2 (or similar) and start on boot
- [ ] HTTPS working on both domains
- [ ] Install wizard run exactly once
- [ ] Mobile app built with `--dart-define=API_URL` pointed at production
