import { describe, expect, it } from "vitest";
import { computePaymobHmac, verifyPaymobHmac } from "./paymobHmac.js";

const SECRET = "test_hmac_secret";

function sampleTransaction(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    amount_cents: 1000,
    created_at: "2026-07-31T10:00:00.000000",
    currency: "EGP",
    error_occured: false,
    has_parent_transaction: false,
    id: 123456,
    integration_id: 987654,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: 555 },
    owner: 42,
    pending: false,
    source_data: { pan: "1234", sub_type: "MasterCard", type: "card" },
    success: true,
    ...overrides,
  };
}

describe("computePaymobHmac / verifyPaymobHmac", () => {
  it("produces a deterministic hex digest for the same input", () => {
    const a = computePaymobHmac(sampleTransaction(), SECRET);
    const b = computePaymobHmac(sampleTransaction(), SECRET);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{128}$/);
  });

  it("verifies a correctly computed hmac", () => {
    const transaction = sampleTransaction();
    const hmac = computePaymobHmac(transaction, SECRET);
    expect(verifyPaymobHmac(transaction, hmac, SECRET)).toBe(true);
  });

  it("rejects a tampered field (amount changed after signing)", () => {
    const transaction = sampleTransaction();
    const hmac = computePaymobHmac(transaction, SECRET);
    const tampered = sampleTransaction({ amount_cents: 999999 });
    expect(verifyPaymobHmac(tampered, hmac, SECRET)).toBe(false);
  });

  it("rejects the right hmac computed with the wrong secret", () => {
    const transaction = sampleTransaction();
    const hmac = computePaymobHmac(transaction, "a-different-secret");
    expect(verifyPaymobHmac(transaction, hmac, SECRET)).toBe(false);
  });

  it("treats missing nested fields as empty rather than throwing", () => {
    const transaction = sampleTransaction({ order: undefined, source_data: undefined });
    expect(() => computePaymobHmac(transaction, SECRET)).not.toThrow();
  });
});
