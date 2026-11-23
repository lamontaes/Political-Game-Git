/**
 * Every town of a drawn state sits in a district of each legislative chamber
 * its state has (`townDistrict`, which reads the Census place join and, for a
 * place the files do not know, the county estimate): a town covered by no
 * district is a path the world cannot produce, so the old "unmatched town"
 * test is gone (CTO, Nov 17: replaced means deleted). A state with no
 * district rows for a chamber (a unicameral legislature, a territory) has
 * none to check for it; an at-large seat is one district in the rows.
 * States are drawn from the seed and named; the checker itself is shown to
 * fail on a fixture where a town is dropped from the join.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { districtIdentityCatalog } from "../districts/catalog";
import type { DistrictChamber } from "../districts/types";
import { townDistrict } from "./offices-state";
import { corePlaceStateIdentities, searchCorePlaces } from "./place-lookup";

const AS_OF = "2026-10-20";
const CHAMBERS = ["state-lower", "state-upper"] as const;
const DRAWS = 6;
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

type Town = { readonly key: string; readonly geoid: string };
type Placer = (
  town: Town,
  usps: string,
  chamber: DistrictChamber,
) => { readonly geoid: string } | null;

/** The towns, by chamber, that no district of the state's chamber holds. */
export function townsInNoDistrict(
  towns: readonly Town[],
  usps: string,
  chambers: readonly DistrictChamber[],
  placeOf: Placer,
): string[] {
  return chambers.flatMap((chamber) =>
    towns
      .filter((town) => placeOf(town, usps, chamber) === null)
      .map((town) => `${town.key} (${chamber})`),
  );
}

const realPlacer: Placer = (town, usps, chamber) =>
  townDistrict(town.geoid, usps, chamber, AS_OF);

const rowsOf = (usps: string, chamber: DistrictChamber) =>
  districtIdentityCatalog().filter(
    (d) =>
      d.stateUsps === usps && d.chamber === chamber && !d.isUnassignedResidual,
  );

const townsOf = (jurisdictionKey: string): Town[] =>
  [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: jurisdictionKey,
      scope: "locality",
    }),
  ].map((place) => ({
    key: place.key,
    geoid: place.sourceGeoid ?? place.key,
  }));

describe("every town sits in a district of each chamber its state has", () => {
  const states = corePlaceStateIdentities();
  const drawn = Array.from({ length: DRAWS }, (_, at) => {
    const hash = createHash("sha256").update(`${seed}:${at}`).digest("hex");
    return states[parseInt(hash.slice(0, 8), 16) % states.length]!;
  });

  it(`holds at drawn states (seed ${seed})`, () => {
    const seen: string[] = [];
    for (const state of drawn) {
      const usps = state.jurisdictionKey.replace(/^US-/, "");
      const chambers = CHAMBERS.filter((c) => rowsOf(usps, c).length > 0);
      const towns = townsOf(state.jurisdictionKey);
      const outside = townsInNoDistrict(towns, usps, chambers, realPlacer);
      expect(
        outside.slice(0, 5),
        `${state.jurisdictionKey}, seed ${seed}: towns in no district`,
      ).toEqual([]);
      seen.push(
        `${state.jurisdictionKey}: ${towns.length} towns, chambers with districts: ${chambers.join(", ") || "none (at large or unicameral)"}`,
      );
    }
    process.stdout.write(`town-in-every-district: ${seen.join("; ")}\n`);
  }, 300_000);

  it("fails where a town is dropped from the join", () => {
    // A state that has both chambers' rows, so the fixture has a chamber to fail.
    const state = states.find((s) => {
      const usps = s.jurisdictionKey.replace(/^US-/, "");
      return CHAMBERS.every((c) => rowsOf(usps, c).length > 0);
    })!;
    const usps = state.jurisdictionKey.replace(/^US-/, "");
    const towns = townsOf(state.jurisdictionKey).slice(0, 20);
    expect(towns.length).toBeGreaterThan(1);
    const dropped = towns[0]!;
    const withDropped: Placer = (town, u, chamber) =>
      town.key === dropped.key ? null : realPlacer(town, u, chamber);
    expect(townsInNoDistrict(towns, usps, CHAMBERS, withDropped)).toEqual([
      `${dropped.key} (state-lower)`,
      `${dropped.key} (state-upper)`,
    ]);
    expect(townsInNoDistrict(towns, usps, CHAMBERS, realPlacer)).toEqual([]);
  }, 120_000);
});
