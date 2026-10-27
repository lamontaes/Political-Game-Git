/**
 * A staffing line carried into a new fiscal year keeps the positions it
 * funded, filled or not, so putting the line back later cuts only what the
 * raise added. Before, a new year took the staff in place as its base: a
 * raise that funded more positions than a small town could fill left a base
 * near the staff it held, and putting the line back then cut below the
 * staff the employer opened with.
 */
import { expect, it } from "vitest";
import { baseStaffFor, type StaffingRow } from "./law-reach/group-a-staffing";

const row = (over: Partial<StaffingRow>): StaffingRow => ({
  id: "budget-line:administration:organization_x",
  key: "budget-line:administration",
  organizationId: "organization_x",
  baseStaff: 25,
  positions: 93,
  lawId: "measure:raise",
  setOn: "2025-01-21",
  fiscalYear: 2025,
  ...over,
});

it("within a fiscal year the base is the one the year's first change took", () => {
  expect(baseStaffFor(row({}), 2025, 30)).toBe(25);
});

it("a new fiscal year starts from the positions the carried line funds, not the staff in place", () => {
  // The raised line carried in: the 93 positions it funds stay funded though
  // 30 are held, so putting the line back to its old amount (a ratio of
  // 25/93) funds the 25 the employer opened with, not 30 x 25/93, about 8.
  const base = baseStaffFor(row({}), 2026, 30);
  expect(base).toBe(93);
  expect(Math.round(base * (25 / 93))).toBe(25);
});

it("with no earlier change the base is the staff in place", () => {
  expect(baseStaffFor(null, 2026, 30)).toBe(30);
});

it("another government's change is not carried: the base is the staff in place", () => {
  // A state's schools line funded 93 positions at the district; the city's
  // own line change starts from the 30 teachers in place, not from them.
  expect(
    baseStaffFor(row({ governmentId: "US-NY" }), 2026, 30, "place:3625076"),
  ).toBe(30);
  expect(baseStaffFor(row({ governmentId: "US-NY" }), 2026, 30, "US-NY")).toBe(
    93,
  );
});
