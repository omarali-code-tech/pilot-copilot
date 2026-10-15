import { Flight } from "../types/flight";

export type Status = "current" | "expiring" | "expired";

export type CurrencyItem = {
  label: string;
  status: Status;
  detail: string;
  expires: string | null; // YYYY-MM-DD
};

export type Profile = {
  lastFlightReview: string | null;
  medicalExpiry: string | null;
};

const DAY = 86400000;
const WARN_DAYS = 30;

// Dates are handled as UTC midnight so time zones can't shift results
function parse(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function format(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function todayString(): string {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `${n.getFullYear()}-${mm}-${dd}`;
}

function statusFromExpiry(expiryMs: number, todayMs: number): Status {
  const daysLeft = Math.floor((expiryMs - todayMs) / DAY);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= WARN_DAYS) return "expiring";
  return "current";
}

function landingCurrency(
  label: string,
  flights: Flight[],
  landingsOf: (f: Flight) => number,
  today: string,
): CurrencyItem {
  const todayMs = parse(today);
  const windowStart = todayMs - 90 * DAY;

  const past = flights
    .filter((f) => parse(f.date) <= todayMs)
    .sort((a, b) => parse(b.date) - parse(a.date));

  const recent = past
    .filter((f) => parse(f.date) >= windowStart)
    .reduce((sum, f) => sum + landingsOf(f), 0);

  // Currency runs 90 days from the date of the 3rd most recent landing
  let count = 0;
  let thirdDate: number | null = null;
  for (const f of past) {
    count += landingsOf(f);
    if (count >= 3) {
      thirdDate = parse(f.date);
      break;
    }
  }

  if (thirdDate === null || thirdDate + 90 * DAY < todayMs) {
    return {
      label,
      status: "expired",
      detail: `${Math.min(recent, 3)} of 3 landings in the last 90 days`,
      expires: null,
    };
  }

  const expiryMs = thirdDate + 90 * DAY;
  return {
    label,
    status: statusFromExpiry(expiryMs, todayMs),
    detail: `Current through ${format(expiryMs)}`,
    expires: format(expiryMs),
  };
}

export function flightReviewItem(
  lastReview: string | null,
  today: string,
): CurrencyItem {
  if (!lastReview) {
    return {
      label: "Flight review",
      status: "expired",
      detail: "No review date entered",
      expires: null,
    };
  }
  const d = new Date(parse(lastReview));
  // Last day of the 24th calendar month after the review month
  const expiryMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 25, 0);
  return {
    label: "Flight review",
    status: statusFromExpiry(expiryMs, parse(today)),
    detail: `Valid through ${format(expiryMs)}`,
    expires: format(expiryMs),
  };
}

export function medicalItem(
  expiry: string | null,
  today: string,
): CurrencyItem {
  if (!expiry) {
    return {
      label: "Medical",
      status: "expired",
      detail: "No expiry date entered",
      expires: null,
    };
  }
  const expiryMs = parse(expiry);
  return {
    label: "Medical",
    status: statusFromExpiry(expiryMs, parse(today)),
    detail: `Expires ${expiry}`,
    expires: expiry,
  };
}

export function computeCurrency(
  flights: Flight[],
  profile: Profile,
  today: string,
): CurrencyItem[] {
  return [
    landingCurrency("Day passengers", flights, (f) => f.landings, today),
    landingCurrency("Night passengers", flights, (f) => f.nightLandings, today),
    flightReviewItem(profile.lastFlightReview, today),
    medicalItem(profile.medicalExpiry, today),
  ];
}
