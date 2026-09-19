import type { NextFunction, Request, Response } from "express";
import { verifyCustomerToken, type CustomerTokenPayload } from "../lib/auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customerAuth?: CustomerTokenPayload;
    }
  }
}

export function requireCustomerAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
  try {
    req.customerAuth = verifyCustomerToken(header.slice("Bearer ".length));
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Booking creation stays open to guests — this only attaches
 * `req.customerAuth` when a valid customer token is present, so a
 * logged-in customer's bookings link to their account without requiring
 * anyone to log in just to book. */
export function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.customerAuth = verifyCustomerToken(header.slice("Bearer ".length));
    } catch {
      // invalid/expired token on an optional route — proceed as a guest
    }
  }
  next();
}
