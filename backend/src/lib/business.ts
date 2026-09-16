import { prisma } from "./prisma.js";
import { NotInstalledError } from "./notInstalledError.js";

/**
 * This is a single-tenant deployment (one business per install — see the
 * plan). Public, unauthenticated endpoints (the storefront, the booking
 * app) need "the" business without a logged-in user context, so they
 * fetch the one row directly instead of scoping by businessId.
 */
export async function getTheBusiness() {
  const business = await prisma.business.findFirst();
  if (!business) {
    throw new NotInstalledError();
  }
  return business;
}
