import { Flight } from "../types/flight";
import { computeCurrency } from "./currency";

const TODAY = "2026-10-14";

function f(date: string, landings: number, nightLandings = 0): Flight {
  return {
    id: date + landings,
    date,
    aircraft: "N172SP",
    from: "KFDK",
    to: "KHGR",
    totalHours: 1,
    nightHours: 0,
    landings,
    nightLandings,
  };
}

const goodProfile = {
  lastFlightReview: "2025-03-15",
  medicalExpiry: "2027-01-31",
};

test("3 landings in 90 days is day current, expiring 90 days after the 3rd", () => {
  const items = computeCurrency(
    [f("2026-09-20", 2), f("2026-10-02", 3)],
    goodProfile,
    TODAY,
  );
  expect(items[0].status).toBe("current");
  expect(items[0].expires).toBe("2026-12-31");
});

test("only 2 landings means not current", () => {
  const items = computeCurrency([f("2026-10-02", 2)], goodProfile, TODAY);
  expect(items[0].status).toBe("expired");
  expect(items[0].expires).toBeNull();
});

test("landings older than 90 days don't count", () => {
  const items = computeCurrency([f("2026-06-01", 5)], goodProfile, TODAY);
  expect(items[0].status).toBe("expired");
});

test("night currency counts only night landings", () => {
  const items = computeCurrency([f("2026-10-02", 5, 0)], goodProfile, TODAY);
  expect(items[0].status).toBe("current");
  expect(items[1].status).toBe("expired");
});

test("flight review lasts to the end of the 24th month", () => {
  const items = computeCurrency([], goodProfile, TODAY);
  expect(items[2].expires).toBe("2027-03-31");
  expect(items[2].status).toBe("current");
});

test("medical statuses", () => {
  const expired = computeCurrency(
    [],
    { ...goodProfile, medicalExpiry: "2026-09-30" },
    TODAY,
  );
  const soon = computeCurrency(
    [],
    { ...goodProfile, medicalExpiry: "2026-10-30" },
    TODAY,
  );
  expect(expired[3].status).toBe("expired");
  expect(soon[3].status).toBe("expiring");
});
