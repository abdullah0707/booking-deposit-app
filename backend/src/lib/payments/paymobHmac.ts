import crypto from "node:crypto";

/**
 * Exact field order Paymob specifies for the transaction-processed callback
 * HMAC (docs.paymob.com/docs/hmac-calculation): concatenate these values,
 * in this order, as plain strings (booleans as "true"/"false", missing
 * values as ""), then HMAC-SHA512 with the merchant's HMAC secret.
 */
const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function readField(transactionObj: Record<string, unknown>, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, transactionObj);

  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function computePaymobHmac(transactionObj: Record<string, unknown>, hmacSecret: string): string {
  const concatenated = HMAC_FIELDS.map((field) => readField(transactionObj, field)).join("");
  return crypto.createHmac("sha512", hmacSecret).update(concatenated).digest("hex");
}

export function verifyPaymobHmac(
  transactionObj: Record<string, unknown>,
  receivedHmac: string,
  hmacSecret: string,
): boolean {
  const expected = computePaymobHmac(transactionObj, hmacSecret);
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(receivedHmac, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
