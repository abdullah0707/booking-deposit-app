// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`
// (function renamed from `middleware` to `proxy`). See:
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export const proxy = createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
