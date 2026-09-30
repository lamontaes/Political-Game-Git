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
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { legislatureForState } from "../../src/simulation/legislature-game-profile";
import { SeededRng } from "../../src/simulation/rng";
import { PUBLIC_LAND_ACCESS_QUESTION } from "../../src/simulation/public-land-access-law";
import { BUDGET_PROGRAMS } from "../../src/simulation/public-budgets/store";
import { lawInForce } from "../../src/simulation/governing/law-in-force";
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
const jurisdiction = stateJurisdictionForKey(state.jurisdictionKey)!;
const pack = legislatureForState(state.jurisdictionKey)!;
const proposition = Object.values(opened.world.policyCatalog.propositions).find(
  (p) => p.stableKey === PUBLIC_LAND_ACCESS_QUESTION,
)!;
const pair = prepareLawPair(opened.world, {
  jurisdictionId: jurisdiction.id,
  rulePackId: pack.packId,
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
const control = run(pair.control, "control");
const treated = run(pair.treated, "treated");
const spending = (world: World) =>
  world
    .publicBudgets!.governments.find(
      (g) => g.lawJurisdictionId === jurisdiction.id && g.level === "state",
    )!
    .months.filter(
      (m) => m.month >= pair.control.currentDate.slice(0, 7) + "-01",
    )
    .reduce(
      (sum, m) =>
        sum + m.spending[BUDGET_PROGRAMS.indexOf("naturalResources")]!,
      0,
    );
const businessCash = (world: World) =>
  Object.values(world.townFinances?.businesses ?? {}).reduce(
    (sum, b) => sum + b.cash,
    0,
  );
const sales = (world: World) =>
  Object.values(world.townFinances?.markets ?? {}).reduce(
    (sum, m) => sum + (m.publicLandVisitorSales ?? 0),
    0,
  );
const result = {
  seed,
  place: place.displayName,
  from: pair.control.currentDate,
  to: control.currentDate,
  stateManagementDollars: spending(treated) - spending(control),
  businessCashDollars: businessCash(treated) - businessCash(control),
  annualGuestSalesDollars: sales(treated) - sales(control),
  controlLaw: lawInForce(control, jurisdiction.id, proposition.id)?.answer,
  treatedLaw: lawInForce(treated, jurisdiction.id, proposition.id)?.answer,
};
writeFileSync(
  "/private/tmp/public-land-watched-result.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(result);
if (result.stateManagementDollars <= 0 || result.businessCashDollars === 0)
  throw Error("Public-land law did not move both state and business money");
