/* eslint-disable @typescript-eslint/no-explicit-any */
// Full people alive each year: tsx tiers-fullcount.ts <seed> <placeKey> <years> <label>
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { coreAPI } from "../../src/core2/state";
import { countedDemotions } from "../../src/core2/modules/counted-demotion";
import { isDemoted } from "../../src/core2/counted-groups";
setBookkeeping(false);
const [seed = "k7", key = "0179944", years = "6", label = "x"] =
  process.argv.slice(2);
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
const count = () => {
  let full = 0,
    demoted = 0,
    husks = 0;
  for (const p of w.core.people.values()) {
    if (!p.alive) continue;
    if (isDemoted(p)) demoted++;
    else if (p.tier === "husk") husks++;
    else full++;
  }
  let households = 0;
  try {
    households = countedDemotions(coreAPI(w.core)).length;
  } catch {
    households = -1;
  }
  return { full, demoted, husks, demotedHouseholds: households };
};
console.log(`FULL ${label} year 0`, JSON.stringify(count()));
for (let y = 1; y <= Number(years); y++) {
  try {
    advanceCore(w.core, addDays(makeIsoDate(w.core.date), 365));
  } catch (error) {
    console.log("FAIL", (error as Error).message);
    for (const c of w.core.finance.contracts.values()) {
      const term = c.recipientIncome;
      if (!term || c.endedAt) continue;
      const person = w.core.people.get(term.personId);
      const has = (person?.pastFacts ?? []).some(
        (f: any) => f.id === term.sourceFactId,
      );
      const home = w.core.households.get(term.householdId);
      if (
        !has ||
        person?.householdId !== term.householdId ||
        !home?.memberIds.includes(term.personId)
      )
        console.log(
          "BAD",
          JSON.stringify({
            contract: c.id,
            personId: term.personId,
            found: !!person,
            has,
            tier: person?.tier,
            place: person?.placeId,
            personHome: person?.householdId,
            termHome: term.householdId,
            homeFound: !!home,
            member: home?.memberIds.includes(term.personId),
            alive: person?.alive,
          }),
        );
    }
    break;
  }
  console.log(`FULL ${label} year ${y}`, JSON.stringify(count()));
}
