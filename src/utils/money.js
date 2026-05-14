export const CURRENCY_PRESETS = [
  { code: "USD", ratePerJPY: 0.0065 },
  { code: "EUR", ratePerJPY: 0.006 },
  { code: "PEN", ratePerJPY: 0.025 },
  { code: "MXN", ratePerJPY: 0.11 },
  { code: "CLP", ratePerJPY: 6.0 },
];

export function formatJPY(value) {
  const amount = Number(value) || 0;
  return `¥${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export function formatConvertedJPY(value, currency) {
  const amount = (Number(value) || 0) * (Number(currency?.ratePerJPY) || 0);
  return `${currency?.code || "USD"} ${amount.toFixed(2)}`;
}

export function formatMoneyPair(value, currency) {
  return `${formatJPY(value)} · ${formatConvertedJPY(value, currency)}`;
}
