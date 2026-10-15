import { CurrencyItem } from "./currency";
import { DecodedMetar } from "./metar";

export type Minimums = {
  ceilingFt: number;
  visibilitySM: number;
  windKt: number; // max wind, gusts included
  crosswindKt: number;
};

export const DEFAULT_MINIMUMS: Minimums = {
  ceilingFt: 3000,
  visibilitySM: 5,
  windKt: 20,
  crosswindKt: 10,
};

// How close to a limit counts as "caution". Tune these in one place.
export const MARGINS = {
  ceilingFt: 500,
  visibilitySM: 2,
  windFraction: 0.8,
  dewpointSpreadC: 3,
  staleMinutes: 90,
};

export type Level = "ok" | "caution" | "nogo";
export type Verdict = "GO" | "CAUTION" | "NO-GO";
export type Reason = { level: Level; text: string };
export type Assessment = { verdict: Verdict; reasons: Reason[] };

// Runway heading in degrees (runway 28 = 280). Variable wind assumes worst case.
export function crosswindKt(
  windDir: number | "VRB" | null,
  speed: number,
  runwayHeading: number,
): number {
  if (windDir === "VRB" || windDir === null) return speed;
  const angle = ((windDir - runwayHeading) * Math.PI) / 180;
  return Math.abs(speed * Math.sin(angle));
}

const CURRENCY_NAMES: Record<string, string> = {
  Medical: "Medical",
  "Flight review": "Flight review",
  "Day passengers": "Passenger currency",
};

export function assess(input: {
  metar: DecodedMetar;
  minimums: Minimums;
  runway: number | null; // heading in degrees, or null if unknown
  currency: CurrencyItem[];
  passengers: boolean;
  nowMs: number;
}): Assessment {
  const { metar, minimums, runway, currency, passengers, nowMs } = input;
  const reasons: Reason[] = [];
  const add = (level: Level, text: string) => reasons.push({ level, text });

  if (metar.category === "IFR" || metar.category === "LIFR") {
    add(
      "nogo",
      `Conditions are ${metar.category}. This app only assesses VFR flights.`,
    );
  }

  // Ceiling
  if (metar.ceilingFt === null) {
    add("ok", "No ceiling reported");
  } else if (metar.ceilingFt < minimums.ceilingFt) {
    add(
      "nogo",
      `Ceiling ${metar.ceilingFt} ft is below your minimum of ${minimums.ceilingFt} ft`,
    );
  } else if (metar.ceilingFt < minimums.ceilingFt + MARGINS.ceilingFt) {
    add(
      "caution",
      `Ceiling ${metar.ceilingFt} ft is close to your minimum of ${minimums.ceilingFt} ft`,
    );
  } else {
    add("ok", `Ceiling ${metar.ceilingFt} ft is above your minimum`);
  }

  // Visibility
  if (metar.visibilitySM === null) {
    add("caution", "Visibility not reported");
  } else if (metar.visibilitySM < minimums.visibilitySM) {
    add(
      "nogo",
      `Visibility ${metar.visibilitySM} SM is below your minimum of ${minimums.visibilitySM} SM`,
    );
  } else if (
    metar.visibilitySM <
    minimums.visibilitySM + MARGINS.visibilitySM
  ) {
    add(
      "caution",
      `Visibility ${metar.visibilitySM} SM is close to your minimum of ${minimums.visibilitySM} SM`,
    );
  } else {
    add("ok", `Visibility ${metar.visibilitySM} SM is above your minimum`);
  }

  // Wind and crosswind (gusts count)
  if (metar.windSpeed === null) {
    add("caution", "Wind not reported");
  } else {
    const peak = Math.max(metar.windSpeed, metar.windGust ?? 0);
    const label = metar.windGust ? `Gusts to ${peak} kt` : `Wind ${peak} kt`;
    if (peak > minimums.windKt) {
      add("nogo", `${label} exceeds your limit of ${minimums.windKt} kt`);
    } else if (peak > minimums.windKt * MARGINS.windFraction) {
      add(
        "caution",
        `${label} is close to your limit of ${minimums.windKt} kt`,
      );
    } else {
      add("ok", `${label} is within your limit`);
    }

    if (runway !== null) {
      const xw = Math.round(crosswindKt(metar.windDir, peak, runway));
      const rwy = String(runway / 10).padStart(2, "0");
      const text = `Crosswind about ${xw} kt on runway ${rwy}`;
      if (xw > minimums.crosswindKt) {
        add("nogo", `${text} exceeds your limit of ${minimums.crosswindKt} kt`);
      } else if (xw > minimums.crosswindKt * MARGINS.windFraction) {
        add(
          "caution",
          `${text} is close to your limit of ${minimums.crosswindKt} kt`,
        );
      } else {
        add("ok", `${text} is within your limit`);
      }
    }
  }

  // Fog and low cloud risk
  if (metar.tempC !== null && metar.dewpointC !== null) {
    const spread = metar.tempC - metar.dewpointC;
    if (spread <= MARGINS.dewpointSpreadC) {
      add(
        "caution",
        `Temp and dewpoint are only ${spread.toFixed(0)}°C apart: fog or low cloud possible`,
      );
    }
  }

  // Stale observation
  if (metar.observedAt) {
    const age = (nowMs - Date.parse(metar.observedAt)) / 60000;
    if (age > MARGINS.staleMinutes) {
      add("caution", `Observation is ${Math.round(age)} minutes old`);
    }
  }

  // Pilot legality
  const required = ["Medical", "Flight review"];
  if (passengers) required.push("Day passengers");
  for (const label of required) {
    const item = currency.find((c) => c.label === label);
    if (!item) continue;
    const name = CURRENCY_NAMES[label];
    if (item.status === "expired")
      add("nogo", `${name} is not current: ${item.detail}`);
    else if (item.status === "expiring")
      add("caution", `${name} expires soon: ${item.detail}`);
    else add("ok", `${name} is current`);
  }

  const order: Record<Level, number> = { nogo: 0, caution: 1, ok: 2 };
  reasons.sort((a, b) => order[a.level] - order[b.level]);

  const verdict: Verdict = reasons.some((r) => r.level === "nogo")
    ? "NO-GO"
    : reasons.some((r) => r.level === "caution")
      ? "CAUTION"
      : "GO";

  return { verdict, reasons };
}
