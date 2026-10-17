/**
 * Does a town open with the share of renters its Census place has? For each
 * drawn place, the played world on its first day: households that rent (a
 * full household with a lease, a counted one with tenure "rent", each counted
 * household at its weight) against the ACS 2020-2024 five-year table B25003
 * for the same place (occupied units and owner-occupied units).
 *
 * Reads: data/research/housing/tenure-acs-2024.json.
 * Run: node --import tsx scripts/core2-year/opening-tenure-check.ts [seed ...]
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { lawChain } from "../../src/core2/modules/laws";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { coreAPI } from "../../src/core2/state";
import { drawPlace } from "./place";

const TENURE = JSON.parse(
  readFileSync("data/research/housing/tenure-acs-2024.json", "utf8"),
) as { places: Record<string, [number, number]> };

const seeds = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [randomBytes(6).toString("hex")];
for (const seed of seeds) {
  const place = drawPlace(seed, "opening-tenure");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const town = lawChain(coreAPI(core)).townPlaceId;
  const leased = new Set(
    [...core.finance.contracts.values()]
      .filter((row) => row.id.startsWith("lease:") && row.householdId)
      .map((row) => row.householdId),
  );
  let households = 0;
  let renters = 0;
  for (const home of core.households.values())
    if (home.placeId === town) {
      households += 1;
      if (leased.has(home.id)) renters += 1;
    }
  const store = residentsRuntime(core)!.store;
  for (const home of store.liveHouseholds())
    if (home.placeId === town) {
      const weight = store.weightOf(home);
      households += weight;
      if (home.tenure === "rent") renters += weight;
    }
  const real = TENURE.places[place.key];
  console.log(
    `${place.name} (${place.key}), seed ${seed}: ${households} households, ${((renters / households) * 100).toFixed(0)}% rent` +
      (real
        ? `; ACS: ${real[0]} occupied units, ${(((real[0] - real[1]) / real[0]) * 100).toFixed(0)}% rent`
        : "; no ACS row for this place"),
  );
}
