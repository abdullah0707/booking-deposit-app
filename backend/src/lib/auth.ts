import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-on-install";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface AuthTokenPayload {
  userId: string;
  businessId: string;
  role: "OWNER" | "STAFF";
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// requireAuth (staff/owner dashboard) rejects anything without a valid
// `role`, so a customer token — which never carries one — can never pass
// as a staff token even though both are signed with the same secret.
export function verifyToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  if (payload.role !== "OWNER" && payload.role !== "STAFF") {
    throw new Error("Not a staff token");
  }
  return payload;
}

/** A registered customer's own session — see the Customer model. Kept
 * structurally distinct from AuthTokenPayload (no `role`) specifically so
 * it can never satisfy requireAuth's staff-only check above. */
export interface CustomerTokenPayload {
  customerId: string;
  businessId: string;
}

export function signCustomerToken(payload: CustomerTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyCustomerToken(token: string): CustomerTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as CustomerTokenPayload;
  if (!payload.customerId) throw new Error("Not a customer token");
  return payload;
}
