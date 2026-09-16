import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 does not forward a rejected promise from an async route
 * handler to error-handling middleware — it's an unhandled rejection
 * that crashes the whole process (confirmed the hard way: a booking
 * request with no Stripe key configured took the entire server down,
 * not just that one request). Every async handler in this app is
 * wrapped with this so a thrown/rejected error always becomes a
 * catchable Express error instead.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
