export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(amount));
}
