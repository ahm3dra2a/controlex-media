/** Convert an entered PKR/USD amount to an exact integer without float rounding. */
export function parseMoney(value: string): number {
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(value))
    throw new Error("Enter an amount with at most two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor > 1_000_000_000_000)
    throw new Error("Amount is too large.");
  return minor;
}
