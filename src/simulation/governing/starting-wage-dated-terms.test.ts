import { describe, expect, it } from "vitest";
import { readFinalEnactedLawTerm } from "./automatic-legislation";
import { makeIsoDate, addDays } from "../dates";
import type { World, EntityId } from "../types";
import type { LawInForce } from "./law-in-force";
const questionKey = "us-policy-positions:labor-workforce.raise-minimum-wage";
const rows = [
  { place: "US-AK", date: "2025-07-01", value: 1300 },
  { place: "US-AK", date: "2026-07-01", value: 1400 },
  { place: "US-AK", date: "2027-07-01", value: 1500 },
  { place: "US-AZ", date: "2026-01-01", value: 1515 },
  { place: "US-CA", date: "2026-01-01", value: 1690 },
  { place: "US-CA", date: "2027-01-01", value: 1740 },
  { place: "US-CO", date: "2026-01-01", value: 1516 },
  { place: "US-CT", date: "2026-01-01", value: 1694 },
  { place: "US-CT", date: "2027-01-01", value: 1748 },
  { place: "US-DE", date: "2025-01-01", value: 1500 },
  { place: "US-DC", date: "2025-07-01", value: 1795 },
  { place: "US-DC", date: "2026-07-01", value: 1840 },
  { place: "US-FL", date: "2025-09-30", value: 1400 },
  { place: "US-FL", date: "2026-09-30", value: 1500 },
  { place: "US-HI", date: "2026-01-01", value: 1600 },
  { place: "US-HI", date: "2028-01-01", value: 1800 },
  { place: "US-ME", date: "2026-01-01", value: 1510 },
  { place: "US-MD", date: "2024-01-01", value: 1500 },
  { place: "US-MA", date: "2024-01-01", value: 1500 },
  { place: "US-MI", date: "2026-01-01", value: 1373 },
  { place: "US-MI", date: "2027-01-01", value: 1500 },
  { place: "US-MN", date: "2026-01-01", value: 1141 },
  { place: "US-MN", date: "2027-01-01", value: 1187 },
  { place: "US-MO", date: "2026-01-01", value: 1500 },
  { place: "US-NE", date: "2026-01-01", value: 1500 },
  { place: "US-NE", date: "2027-01-01", value: 1526 },
  { place: "US-NE", date: "2028-01-01", value: 1553 },
  { place: "US-NE", date: "2029-01-01", value: 1580 },
  { place: "US-NE", date: "2030-01-01", value: 1608 },
  { place: "US-NV", date: "2024-07-01", value: 1200 },
  { place: "US-NM", date: "2023-01-01", value: 1200 },
  { place: "US-RI", date: "2026-01-01", value: 1600 },
  { place: "US-RI", date: "2027-01-01", value: 1700 },
  { place: "US-SD", date: "2026-01-01", value: 1185 },
  { place: "US-VT", date: "2026-01-01", value: 1442 },
  { place: "US-VA", date: "2026-01-01", value: 1277 },
  { place: "US-VA", date: "2027-01-01", value: 1375 },
  { place: "US-VA", date: "2028-01-01", value: 1500 },
  { place: "US-WA", date: "2027-01-01", value: 1773 },
  { place: "US-GU", date: "2021-09-01", value: 925 },
  { place: "US-PR", date: "2024-07-01", value: 1050 },
  { place: "US-VI", date: "2024-01-01", value: 1050 },
  { place: "US-VI", date: "2026-04-24", value: 1200 },
  { place: "US-VI", date: "2027-06-01", value: 1400 },
  { place: "US-VI", date: "2028-06-01", value: 1500 },
] as const;
const world = { currentDate: makeIsoDate("2031-01-01") } as World;
describe("dated starting wage terms", () => {
  it.each(rows)(
    "$place effective $date retains its legal amount",
    ({ place, date, value }) => {
      const law: LawInForce = {
        origin: "in-force-at-start",
        measureId: `starting-law:${place}:${questionKey}` as EntityId,
        answer: "yes",
        level: "state-statute",
        operativeAt: makeIsoDate(date),
        operativeBasis: "enacted-date",
      };
      expect(
        readFinalEnactedLawTerm(world, law, {
          questionKey,
          termKey: "target",
          unit: "minor/hour",
          onDate: makeIsoDate(date),
        })?.value,
      ).toBe(value);
      expect(
        readFinalEnactedLawTerm(world, law, {
          questionKey,
          termKey: "target",
          unit: "minor/hour",
          onDate: addDays(makeIsoDate(date), -1),
        }),
      ).toBeNull();
      expect(
        readFinalEnactedLawTerm(world, law, {
          questionKey,
          termKey: "target",
          unit: "minor",
          onDate: makeIsoDate(date),
        }),
      ).toBeNull();
    },
  );
});
