import research from "../../../data/research/laws/disaster-cost-sharing.json" with { type: "json" };
import { firstOfNextMonth } from "../public-budgets/fiscal";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { SeededRng } from "../rng";
import type { EntityId, IsoDate, World } from "../types";
import { policyTermsInForce } from "./policy-bill-terms";

export const DISASTER_COST_SHARING_QUESTION =
  "us-federal-positions:emergencies.states-share-disaster-costs";

/** Price the existing physical unit as a project-equivalent, with a stable starting cost spread. */
export function disasterRepairUnitCents(
  world: World,
  episodeId: EntityId,
): number {
  const held = world.publicBudgets?.disasterRepairs?.find(
    (row) => row.episodeId === episodeId,
  );
  if (held) return held.costPerUnitCents;
  const draw = new SeededRng(`${world.seed}:repair-cost:${episodeId}`).next();
  return Math.round(
    research.repairUnitCostCents *
      (research.costSpread[0]! +
        draw * (research.costSpread[1]! - research.costSpread[0]!)),
  );
}

/** GOVERNING funds only work the state's available balance can match. CRISIS receives units, never prices. */
export function fundDeclaredDisasterRepair(
  world: World,
  episodeId: EntityId,
  stateUsps: string,
  cycle: number,
  wantedUnits: number,
): { world: World; units: number } {
  const reading = policyTermsInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    DISASTER_COST_SHARING_QUESTION,
    world.currentDate,
  );
  const store = world.publicBudgets;
  // Legacy worlds retain their existing physical repair path; a new cost-share law cannot claim unfunded work.
  if (!store) return { world, units: reading?.terms ? 0 : wantedUnits };
  const key = `disaster-match:${episodeId}:${cycle}`;
  const recorded = store.disasterRepairs?.find((r) => r.key === key);
  if (recorded) return { world, units: recorded.units };
  const stateKey = `US-${stateUsps}`;
  const government = store.governments.find(
    (g) => g.level === "state" && g.stateKey === stateKey,
  );
  if (!government) return { world, units: reading?.terms ? 0 : wantedUnits };
  const share =
    reading?.terms?.values.federalShareBasisPoints ??
    research.startingFederalShareBasisPoints;
  if (!Number.isSafeInteger(share) || share < 0 || share > 10_000)
    throw Error("Disaster share must be between zero and 100 percent");
  const cost = disasterRepairUnitCents(world, episodeId);
  const latestMonth = government.months.at(-1)?.month;
  const unsettledFrom = latestMonth ? firstOfNextMonth(latestMonth) : null;
  const pending = (store.disasterRepairs ?? [])
    .filter(
      (r) =>
        r.stateKey === stateKey &&
        (!unsettledFrom || r.paidOn >= unsettledFrom),
    )
    .reduce((sum, r) => sum + r.stateCents, 0);
  const available = Math.max(
    0,
    Math.round((government.balance + government.reserve) * 100) - pending,
  );
  const matchPerUnit = Math.ceil((cost * (10_000 - share)) / 10_000);
  const units = Math.min(
    wantedUnits,
    matchPerUnit > 0 ? Math.floor(available / matchPerUnit) : wantedUnits,
  );
  const total = units * cost;
  const federalCents = Math.round((total * share) / 10_000);
  const expense = {
    key,
    episodeId,
    stateKey,
    paidOn: world.currentDate,
    units,
    costPerUnitCents: cost,
    federalCents,
    stateCents: total - federalCents,
    measureId: reading?.law.measureId ?? null,
    reason: `HARDWIRED cost share ${share}/10000; ${units} of ${wantedUnits} units affordable with ${available} cents of state balance and reserve. ESTIMATED FROM AVERAGE repair price ${cost} cents per unit (FEMA project-equivalent; data/research/laws/disaster-cost-sharing.json).`,
  };
  return {
    world: {
      ...world,
      publicBudgets: {
        ...store,
        disasterRepairs: [...(store.disasterRepairs ?? []), expense],
      },
    },
    units,
  };
}

/** Whole-dollar amounts consumed exactly once by each government's monthly books. */
export function disasterRepairExpenseDollars(
  world: World,
  month: IsoDate,
  stateKey?: string,
): number {
  return Math.round(
    (world.publicBudgets?.disasterRepairs ?? [])
      .filter(
        (r) =>
          r.paidOn.slice(0, 7) === month.slice(0, 7) &&
          (!stateKey || r.stateKey === stateKey),
      )
      .reduce((sum, r) => sum + (stateKey ? r.stateCents : r.federalCents), 0) /
      100,
  );
}

/** Checked at the same save and clock boundary as the world's other financial books. */
export function assertDisasterCostSharingIntegrity(world: World): void {
  const rows = world.publicBudgets?.disasterRepairs ?? [];
  const keys = new Set<string>();
  for (const row of rows) {
    if (keys.has(row.key)) throw Error("Duplicate disaster repair expense");
    keys.add(row.key);
    if (
      ![
        row.units,
        row.costPerUnitCents,
        row.federalCents,
        row.stateCents,
      ].every((n) => Number.isSafeInteger(n) && n >= 0) ||
      row.costPerUnitCents === 0 ||
      row.federalCents + row.stateCents !== row.units * row.costPerUnitCents ||
      row.paidOn > world.currentDate ||
      !row.reason.trim()
    )
      throw Error("Invalid disaster repair financing");
    if (
      !world.history.crisisRecords?.some(
        (r) => r.kind === "hazard-episode" && r.id === row.episodeId,
      )
    )
      throw Error("Disaster expense needs a recorded episode");
    if (
      !world.publicBudgets?.governments.some(
        (g) => g.level === "state" && g.stateKey === row.stateKey,
      )
    )
      throw Error("Disaster match needs a state budget");
    if (
      row.measureId &&
      !world.history.legislativeMeasures?.some((m) => m.id === row.measureId)
    )
      throw Error("Disaster match needs its filed law");
  }
}
