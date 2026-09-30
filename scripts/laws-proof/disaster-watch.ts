import { writeFileSync } from "node:fs";
import {
  openWatchedWorld,
  createObserverDayButton,
  anniversary,
} from "../dev-lab/world-aging";
import { advanceObservedWorld } from "../../src/presentation/observer-world";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../../src/simulation/life-places";
import { SeededRng } from "../../src/simulation/rng";
import { DISASTER_COST_SHARING_QUESTION } from "../../src/simulation/governing/disaster-cost-sharing";
import { declareHazardEpisode } from "../../src/simulation/crisis/disaster";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../../src/simulation/national-election-geography";
import { US_CONGRESS_PACK_ID } from "../../src/simulation/congress-rule-pack";
import { assertWorldIntegrity } from "../../src/simulation/world";
import type { World } from "../../src/simulation/types";
import { prepareLawPair } from "./enact";
const seed = "public-land-watched-2026";
const state = new SeededRng(seed).pick(lifePlaceStateIdentities());
const place = searchLifePlaces("", 5000, {
  stateJurisdictionKey: state.jurisdictionKey,
}).find((p) => p.scope !== "state")!;
console.log("Opening", seed, place.displayName);
const opened = openWatchedWorld(seed, place.key);
const jurisdiction = NATIONAL_ELECTION_JURISDICTION;

const proposition = Object.values(opened.world.policyCatalog.propositions).find(
  (p) => p.stableKey === DISASTER_COST_SHARING_QUESTION,
)!;
const pair = prepareLawPair(ensureNationalElectionJurisdiction(opened.world), {
  jurisdictionId: jurisdiction.id,
  rulePackId: US_CONGRESS_PACK_ID,
  propositionId: proposition.id,
  sponsorPersonId: opened.anchorPersonId,
  advance: advanceObservedWorld,
});
console.log("Enacted", pair.treated.currentDate, pair.measureId);
const run = (world: World, label: string) => {
  const button = createObserverDayButton(world);
  const end = anniversary(world.currentDate, 1);
  let days = 0;
  while (button.world.currentDate < end) {
    const moved = button.press();
    if (moved.status !== "moved") throw new Error(`${label}: ${moved.problem}`);
    if (++days % 30 === 0) console.log(label, days, button.world.currentDate);
  }
  assertWorldIntegrity(button.world);
  return button.world;
};
const hazard = (world: World) =>
  declareHazardEpisode(world, {
    stableKey: "law-proof-disaster",
    family: "flood",
    magnitude: "catastrophic",
    stateUsps: state.usps,
    jurisdictionIds: [
      opened.world.people[opened.anchorPersonId]!.homeJurisdictionId,
    ],
    durationDays: 3,
    basis:
      "Explicit matched disaster intervention, not a claim of local hazard incidence.",
    sourceReference: null,
  });
const control = run(hazard(pair.control), "control");
const treated = run(hazard(pair.treated), "treated");
const stateExpense = (w: World) =>
  (w.publicBudgets?.disasterRepairs ?? []).reduce(
    (n, r) => n + r.stateCents,
    0,
  ) / 100;
const federalExpense = (w: World) =>
  (w.publicBudgets?.disasterRepairs ?? []).reduce(
    (n, r) => n + r.federalCents,
    0,
  ) / 100;
const units = (w: World) =>
  (w.publicBudgets?.disasterRepairs ?? []).reduce((n, r) => n + r.units, 0);
const result = {
  seed,
  place: place.displayName,
  from: pair.control.currentDate,
  to: control.currentDate,
  stateRepairDollars: stateExpense(treated) - stateExpense(control),
  federalRepairDollars: federalExpense(treated) - federalExpense(control),
  controlFundedUnits: units(control),
  treatedFundedUnits: units(treated),
};
writeFileSync(
  "/private/tmp/disaster-watched-result.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(result);
if (result.stateRepairDollars === 0 || result.federalRepairDollars === 0)
  throw Error("Disaster cost-sharing moved no government expense");
