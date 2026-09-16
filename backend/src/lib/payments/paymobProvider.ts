import type { CreateDepositChargeArgs, CreateDepositChargeResult, PaymentProvider } from "./types.js";

const PAYMOB_BASE_URL = "https://accept.paymob.com";

function splitName(fullName: string | undefined): { firstName: string; lastName: string } {
  const trimmed = fullName?.trim();
  if (!trimmed) return { firstName: "Customer", lastName: "Customer" };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return { firstName, lastName: rest.join(" ") || firstName };
}

export class PaymobProvider implements PaymentProvider {
  readonly name = "paymob";

  constructor(
    private secretKey: string,
    private publicKey: string,
    private integrationId: string,
  ) {}

  async createDepositCharge(args: CreateDepositChargeArgs): Promise<CreateDepositChargeResult> {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
    const { firstName, lastName } = splitName(args.customerName);

    const response = await fetch(`${PAYMOB_BASE_URL}/v1/intention/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.secretKey}`,
      },
      body: JSON.stringify({
        amount: Math.round(args.amount * 100),
        currency: args.currency.toUpperCase(),
        payment_methods: [Number(this.integrationId)],
        special_reference: args.bookingId,
        notification_url: `${backendUrl}/webhooks/paymob`,
        redirection_url: `${appUrl}/booking/confirmed?bookingId=${args.bookingId}`,
        billing_data: {
          first_name: firstName,
          last_name: lastName,
          email: args.customerEmail,
          phone_number: args.customerPhone || "+20000000000",
          apartment: "NA",
          floor: "NA",
          street: "NA",
          building: "NA",
          city: "NA",
          country: "NA",
          state: "NA",
          postal_code: "NA",
        },
        extras: { bookingId: args.bookingId },
      }),
    });

    if (!response.ok) {
      throw new Error(`Paymob intention creation failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as { id: string; client_secret: string };

    return {
      paymentRef: data.id,
      checkoutUrl: `${PAYMOB_BASE_URL}/unifiedcheckout/?publicKey=${this.publicKey}&clientSecret=${data.client_secret}`,
    };
  }
}
