/**
 * PW-4 step 3: SNAP pays by its statute. The allotment is the law row's
 * maximum for the household's size less 30 percent of net income; it slides
 * down as income rises, a household of one or two gets at least the minimum,
 * and a household over the gross income test gets nothing.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import startingLaw from "./data/laws/starting-law.json" with { type: "json" };
import { paymentParameter, snapAllotmentMinor } from "./law-reach/law-payments";
import { povertyLineDollars } from "./law-reach/group-b-people";
import type { LawRowInput } from "./laws-starting";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`law-payments:${Date.now()}`).digest("hex");
const jurisdictions = (
  startingLaw as unknown as {
    jurisdictions: Record<string, Omit<LawRowInput, "id" | "jurisdiction">[]>;
  }
).jurisdictions;
/** A random state or territory whose law carries a SNAP maximum. */
const withSnap = Object.keys(jurisdictions)
  .filter((k) => k.startsWith("US-"))
  .filter((k) => jurisdictions[k]!.some((r) => r.series === "snap-maximum"))
  .sort();
const stateKey =
  withSnap[
    parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) %
      withSnap.length
  ]!;
const row = {
  ...jurisdictions[stateKey]!.find(
    (r) =>
      r.series === "snap-maximum" && r.tier === "general" && r.endDate === null,
  )!,
  id: `law:${stateKey}:snap`,
  jurisdiction: stateKey,
} as LawRowInput;

describe(`PW-4: SNAP allotments (${stateKey}, seed ${seed})`, () => {
  it("pays the maximum with no income and slides down as income rises", () => {
    const sizes = (row.terms as { byHouseholdSize: Record<string, number> })
      .byHouseholdSize;
    const none = snapAllotmentMinor(
      row,
      { size: 3, incomeDollars: 0 },
      stateKey,
    );
    expect(none).toBe(Math.round(sizes["3"]! * 100));
    const some = snapAllotmentMinor(
      row,
      { size: 3, incomeDollars: 12_000 },
      stateKey,
    );
    const more = snapAllotmentMinor(
      row,
      { size: 3, incomeDollars: 20_000 },
      stateKey,
    );
    expect(some).toBeLessThan(none);
    expect(more).toBeLessThan(some);
  });

  it("pays nothing over the gross income test and the minimum to a small household under it", () => {
    const limit =
      paymentParameter("snapGrossIncomeLimitShareOfPoverty") *
      povertyLineDollars(stateKey, 1);
    expect(
      snapAllotmentMinor(
        row,
        { size: 1, incomeDollars: limit + 100 },
        stateKey,
      ),
    ).toBe(0);
    expect(
      snapAllotmentMinor(
        row,
        { size: 1, incomeDollars: limit - 100 },
        stateKey,
      ),
    ).toBeGreaterThanOrEqual(paymentParameter("snapMinimumBenefitMinor"));
  });
});
