/**
 * Social Security's retirement ages are federal law in force (owner, Oct 12),
 * in a random place: the full retirement age by birth year under the 1983
 * amendments, the earliest claim at 62, delayed credits to 70; and Congress
 * can change them like any other law.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, openLaws, socialSecurityAges } from "./modules/laws";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-10-12";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`ss-law:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("Social Security ages as law", () => {
  it("reads each birth year's ages from federal law, and an act of Congress changes them", () => {
    const state = pick(
      [...corePlaceStateIdentities()].map((s) => s.jurisdictionKey).sort(),
      "state",
    );
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "place").key;
    const where = `seed ${seed}, ${state} place ${key}`;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 50,
      }),
    );
    openLaws(core);
    const api = coreAPI(core);
    const at = (birth: string) => socialSecurityAges(api, birth);
    expect(at("1950-06-01"), where).toEqual({
      earliestMonths: 744,
      fullMonths: 792,
      delayedMaxMonths: 840,
    });
    expect(at("1957-03-15").fullMonths).toBe(798);
    expect(at("1965-08-20").fullMonths).toBe(804);
    // Born January 1, 1960: treated as born in 1959 (20 C.F.R. § 404.102).
    expect(at("1960-01-01").fullMonths).toBe(802);
    // Congress raises the full retirement age to 68.
    enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: "social-security-full-retirement-age",
      value: 68,
      unit: "years",
      effectiveDate: "2026-10-14",
      measureId: "test:ss-68",
      citation: "Test act raising the full retirement age",
    });
    expect(at("1965-08-20").fullMonths).toBe(804);
    advanceCore(core, "2026-10-15");
    expect(at("1965-08-20").fullMonths, where).toBe(816);
    expect(at("1965-08-20").earliestMonths).toBe(744);
  }, 300_000);
});
