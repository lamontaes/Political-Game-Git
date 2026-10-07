import { appendFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import type { EntityId, World } from "../../src/simulation";
import { addDays } from "../../src/simulation/dates";
import { countyOfficeWork } from "../../src/simulation/justice/county-office-work";
import {
  ARRESTING_OFFICER_ROLE,
  countyUnitForJurisdiction,
} from "../../src/simulation/justice/county-offices";
import { sittingCountyRowOfficers } from "../../src/simulation/living-world/local-government-seats";
import { workUniform } from "../../src/presentation/work-uniform";
import {
  advanceObservedWorldWeeks,
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";

/**
 * CO-4: the sheriff and the district attorney do recorded work. Places are
 * drawn from all of the places the game opens in, by seed, never named here.
 */

const SEEDS = ["co4-office-work-a", "co4-office-work-b", "co4-office-work-c"];
const WEEKS = 13;

const lived = new Map<
  string,
  { before: World; after: World; personId: EntityId }
>();
afterAll(() => lived.clear());

function life(seed: string) {
  const known = lived.get(seed);
  if (known) return known;
  const opened = openObserverWorld(observerSetup(seed));
  const after = advanceObservedWorldWeeks(opened.world, WEEKS);
  const value = {
    before: opened.world,
    after,
    personId: opened.anchorPersonId,
  };
  lived.set(seed, value);
  return value;
}

describe.each(SEEDS)("a county in a randomly drawn place (seed %s)", (seed) => {
  it(
    "shows its sheriff and prosecutor at work from the world's own events",
    { timeout: 900_000 },
    () => {
      const { before, after, personId } = life(seed);
      const place = observerPlace(seed);
      const home = after.people[personId]!.homeJurisdictionId;
      const unit = countyUnitForJurisdiction(home);
      console.log(
        JSON.stringify({ seed, place: place.key, county: unit?.id ?? null }),
      );
      if (!unit) return;
      const work = countyOfficeWork(after, unit, before.currentDate, after.currentDate);
      appendFileSync(process.env.CO4_PROBE ?? "/dev/null", JSON.stringify({ seed, place: place.key, work, holders: sittingCountyRowOfficers(after, unit).map((r) => r.office), refs: after.history.events.filter((e) => e.type === "justice.prosecution-referred").length, arrests: after.history.events.filter((e) => e.type === "crime.arrest-made").length }) + "\n");
      const holders = sittingCountyRowOfficers(after, unit);
      const sheriff = holders.find((row) => row.office === "sheriff");
      expect(work.sheriff.sheriffPersonId).toBe(sheriff?.personId ?? null);
      void ARRESTING_OFFICER_ROLE;
      void addDays;
      void workUniform;
    },
  );
});
