// No customer accounts (see backend's invoices.ts comment — "booking id
// as informal capability" is the trust model already used elsewhere), so
// "my bookings" is just a locally-remembered list of booking ids this
// browser has created, each looked up live via the existing public
// GET /bookings/:id. Nothing server-side to build.
const STORAGE_KEY = "miqat.myBookingIds";

export function saveMyBooking(bookingId: string) {
  if (typeof window === "undefined") return;
  try {
    const ids = getMyBookingIds();
    if (!ids.includes(bookingId)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([bookingId, ...ids]));
    }
  } catch {
    // localStorage can throw (private mode, quota) — losing "my bookings"
    // convenience isn't worth failing the booking itself over.
  }
}

export function getMyBookingIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
