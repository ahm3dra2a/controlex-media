// Provider contracts only. No checkout is exposed until a real adapter is verified.
export type Currency = "PKR" | "USD";
export type Money = { amountMinor: number; currency: Currency };
export type PaymentEvent = {
  provider: string;
  eventId: string;
  orderId: string;
  status: "paid" | "failed" | "refunded";
  amount: Money;
};
export interface PaymentProvider {
  readonly name: string;
  readonly supportedCurrencies: readonly Currency[];
  createCheckout(order: {
    id: string;
    amount: Money;
    returnUrl: string;
  }): Promise<{ url: string; providerReference: string }>;
  verifyWebhook(request: Request): Promise<PaymentEvent>;
}
