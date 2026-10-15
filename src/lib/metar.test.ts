import { ceilingOf, flightCategory, parseVisibility } from "./metar";

test("visibility formats", () => {
  expect(parseVisibility(10)).toBe(10);
  expect(parseVisibility("10+")).toBe(10);
  expect(parseVisibility("1 1/2")).toBe(1.5);
  expect(parseVisibility("1/4")).toBe(0.25);
  expect(parseVisibility(undefined)).toBeNull();
});

test("ceiling is lowest broken or overcast layer", () => {
  expect(
    ceilingOf([
      { cover: "FEW", base: 800 },
      { cover: "BKN", base: 2500 },
      { cover: "OVC", base: 4000 },
    ]),
  ).toBe(2500);
  expect(ceilingOf([{ cover: "SCT", base: 1500 }])).toBeNull();
});

test("flight categories", () => {
  expect(flightCategory(null, 10)).toBe("VFR");
  expect(flightCategory(3000, 10)).toBe("MVFR");
  expect(flightCategory(900, 10)).toBe("IFR");
  expect(flightCategory(400, 10)).toBe("LIFR");
  expect(flightCategory(null, 2)).toBe("IFR");
  expect(flightCategory(null, null)).toBe("UNKNOWN");
});
