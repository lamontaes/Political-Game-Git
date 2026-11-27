/**
 * What a retired household's home is worth and rents for on day one, against
 * its town's other households (People item 4, the household income's proof).
 *
 *   node --import tsx scripts/people/retired-housing.ts --seeds a,b,c
 *
 * For each seed it draws a place from all 56, opens the played world (no year
 * run) and prints, as JSON, the median home value of the owners and the
 * median rent of the renters, for the retired households (those paid an
 * income award) and for everyone, each household weighted by how many real
 * households it stands for. The town's own medians are what the opening
 * normalizes to, so the "everyone" medians should not move; the retired ones
 * should come up from where a household valued as earning nothing sits.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import {
  HOUSING_MODULE_ID,
  rentValueOf,
} from "../../src/core2/modules/housing";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { coreAPI } from "../../src/core2/state";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const at = args.indexOf("--seeds");
const seeds = (at >= 0 ? args[at + 1]! : "people-a,people-b,people-c").split(
  ",",
);

function median(rows: readonly { value: number; weight: number }[]): number {
  const sorted = [...rows].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((n, row) => n + row.weight, 0);
  let seen = 0;
  for (const row of sorted) {
    seen += row.weight;
    if (seen >= total / 2) return row.value;
  }
  return 0;
}

setBookkeeping(false);
for (const seed of seeds) {
  const drawn = drawPlace(seed, "retired-housing");
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const retired = new Set<string>();
  for (const contract of core.finance.contracts.values())
    if (contract.recipientIncome && !contract.endedAt)
      retired.add(contract.recipientIncome.householdId);
  const rt = residentsRuntime(core);
  const weights = new Map<string, number>();
  if (rt)
    for (const h of rt.store.liveHouseholds()) {
      weights.set(h.id, rt.store.weightOf(h));
      if (h.retirementMinorYear > 0) retired.add(h.id);
    }
  const rows = api
    .moduleState(HOUSING_MODULE_ID)
    .table("dwellings")
    .rows() as unknown as {
    householdId: string;
    tenure: string;
    valueMinor?: number;
    rentMinor?: number;
  }[];
  // The medians the opening aims at: the county's published figures, moved by
  // this world's own offset (`rentValueOf`), in dollars.
  const [targetRent, targetValue] = rentValueOf(
    core.placeMetadata?.housingCounty ?? "",
    core.seed,
  );
  const pick = (tenure: "own" | "rent", only?: Set<string>) =>
    rows
      .filter(
        (row) => row.tenure === tenure && (!only || only.has(row.householdId)),
      )
      .map((row) => ({
        value: (tenure === "own" ? row.valueMinor : row.rentMinor) ?? 0,
        weight: weights.get(row.householdId) ?? 1,
      }))
      .filter((row) => row.value > 0);
  const owners = pick("own"),
    renters = pick("rent"),
    retiredOwners = pick("own", retired),
    retiredRenters = pick("rent", retired);
  console.log(
    JSON.stringify({
      seed,
      place: drawn.name,
      key: drawn.key,
      targetValueDollars: targetValue === null ? null : Math.round(targetValue),
      targetRentDollars: targetRent === null ? null : Math.round(targetRent),
      households: rows.length,
      retiredHouseholds: rows.filter((row) => retired.has(row.householdId))
        .length,
      ownerMedianDollars: Math.round(median(owners) / 100),
      retiredOwnerMedianDollars: Math.round(median(retiredOwners) / 100),
      retiredOwners: retiredOwners.length,
      renterMedianDollars: Math.round(median(renters) / 100),
      retiredRenterMedianDollars: Math.round(median(retiredRenters) / 100),
      retiredRenters: retiredRenters.length,
    }),
  );
}
