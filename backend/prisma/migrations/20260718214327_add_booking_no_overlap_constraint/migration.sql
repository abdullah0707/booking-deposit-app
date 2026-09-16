-- DB-level guarantee against double-booking, backstopping the
-- application-level overlap check in the availability algorithm (see the
-- plan, section 2.1). Prisma's schema language can't express exclusion
-- constraints directly, so this is hand-written.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_overlap_per_business"
  EXCLUDE USING gist (
    "businessId" WITH =,
    tstzrange("startsAt", "endsAt") WITH &&
  )
  WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED'));
