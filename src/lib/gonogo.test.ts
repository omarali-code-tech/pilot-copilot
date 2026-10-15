import { CurrencyItem } from "./currency";
import { assess, crosswindKt, Minimums } from "./gonogo";
import { DecodedMetar } from "./metar";

const NOW = Date.parse("2026-10-14T15:00:00Z");
const minimums: Minimums = {
  ceilingFt: 3000,
  visibilitySM: 5,
  windKt: 20,
  crosswindKt: 10,
};

const okCurrency: CurrencyItem[] = [
  { label: "Day passengers", status: "current", detail: "", expires: null },
  { label: "Flight review", status: "current", detail: "", expires: null },
  { label: "Medical", status: "current", detail: "", expires: null },
];

function wx(overrides: Partial<DecodedMetar> = {}): DecodedMetar {
  return {
    station: "KFDK",
    name: "Frederick",
    observedAt: new Date(NOW - 10 * 60000).toISOString(),
    category: "VFR",
    windDir: 270,
    windSpeed: 8,
    windGust: null,
    visibilitySM: 10,
    ceilingFt: null,
    tempC: 20,
    dewpointC: 8,
    altimeterInHg: 30.0,
    clouds: "Clear",
    raw: "",
    ...overrides,
  };
}

function run(
  metar: Partial<DecodedMetar> = {},
  extra: Partial<Parameters<typeof assess>[0]> = {},
) {
  return assess({
    metar: wx(metar),
    minimums,
    runway: null,
    currency: okCurrency,
    passengers: false,
    nowMs: NOW,
    ...extra,
  });
}

test("good day is GO", () => {
  expect(run().verdict).toBe("GO");
});

test("ceiling below minimum is NO-GO, near minimum is CAUTION", () => {
  expect(run({ ceilingFt: 2000 }).verdict).toBe("NO-GO");
  expect(run({ ceilingFt: 3300 }).verdict).toBe("CAUTION");
});

test("visibility thresholds", () => {
  expect(run({ visibilitySM: 4 }).verdict).toBe("NO-GO");
  expect(run({ visibilitySM: 6 }).verdict).toBe("CAUTION");
});

test("gusts count toward the wind limit", () => {
  expect(run({ windSpeed: 10, windGust: 25 }).verdict).toBe("NO-GO");
});

test("crosswind math", () => {
  expect(crosswindKt(90, 15, 360)).toBeCloseTo(15);
  expect(crosswindKt(360, 15, 360)).toBeCloseTo(0);
  expect(crosswindKt("VRB", 12, 360)).toBe(12);
});

test("crosswind over limit is NO-GO when a runway is given", () => {
  const result = run({ windDir: 90, windSpeed: 15 }, { runway: 360 });
  expect(result.verdict).toBe("NO-GO");
  expect(result.reasons[0].text).toContain("Crosswind");
});

test("expired medical is NO-GO", () => {
  const currency = okCurrency.map((c) =>
    c.label === "Medical" ? { ...c, status: "expired" as const } : c,
  );
  expect(run({}, { currency }).verdict).toBe("NO-GO");
});

test("passenger currency only matters with passengers", () => {
  const currency = okCurrency.map((c) =>
    c.label === "Day passengers" ? { ...c, status: "expired" as const } : c,
  );
  expect(run({}, { currency, passengers: false }).verdict).toBe("GO");
  expect(run({}, { currency, passengers: true }).verdict).toBe("NO-GO");
});

test("stale observation is CAUTION", () => {
  const old = new Date(NOW - 120 * 60000).toISOString();
  expect(run({ observedAt: old }).verdict).toBe("CAUTION");
});

test("IFR conditions are NO-GO", () => {
  expect(run({ category: "IFR" }).verdict).toBe("NO-GO");
});
