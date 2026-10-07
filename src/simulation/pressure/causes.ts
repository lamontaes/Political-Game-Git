/**
 * The causes the pressure layer can read today. Each reader looks at one
 * quarter and returns contributions keyed to the record that caused them; it
 * never writes. Every cause not read here is listed in `PRESSURE_SEAMS` with
 * the reason.
 */

import { TOWN_POLICE_LOG, type CrimeOffense } from "../crime/contract";
import { CRIME_EVENT_TYPES, offenseOf } from "../crime/producer";
import type { HazardMagnitude } from "../crisis/types";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../life-places";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { angerCausesInPeriod } from "./anger";
import type { PressureContribution } from "./contract";

/**
 * ESTIMATED FROM AVERAGE: how much one declared hazard episode adds to the pressure to leave
 * its state, and to fear there, by magnitude. Filed as
 * `state-to-state-moves-what-pushes-and-pulls`.
 */
export const HAZARD_PRESSURE_ESTIMATE: Readonly<
  Record<HazardMagnitude, number>
> = {
  minor: 0.02,
  moderate: 0.05,
  major: 0.1,
  catastrophic: 0.2,
};

/**
 * ESTIMATED FROM AVERAGE: pressure per unit of tax rate change. A one-point rise (0.01) adds
 * 0.05 to the pressure to leave; a one-point cut adds 0.05 to the pull to
 * arrive.
 */
export const TAX_RATE_PRESSURE_ESTIMATE = 5;

/**
 * ESTIMATED FROM AVERAGE: how much one reported offense beyond a town's ordinary police log
 * adds to fear in its state. Violent offenses count double. Only fear: the
 * pressure to leave a town over crime is the migration lane's town push, and
 * counting it here too would count it twice. Filed as
 * `what-crime-does-to-a-town-and-its-people`.
 */
export const CRIME_PRESSURE_ESTIMATE: Readonly<Record<CrimeOffense, number>> = {
  assault: 0.002,
  robbery: 0.002,
  burglary: 0.001,
  vandalism: 0.001,
};

/**
 * ESTIMATED FROM AVERAGE: pressure per percentage point a state's recorded unemployment sits
 * above the nation's, to leave; below it, to arrive.
 */
export const UNEMPLOYMENT_GAP_PRESSURE_ESTIMATE = 0.02;

/** Contributions by state key for one quarter, `periodStart` to `periodEnd` inclusive. */
export function causesInPeriod(
  world: World,
  periodStart: IsoDate,
  periodEnd: IsoDate,
): ReadonlyMap<string, readonly PressureContribution[]> {
  const byState = new Map<string, PressureContribution[]>();
  const add = (stateKey: string, contribution: PressureContribution) => {
    const list = byState.get(stateKey) ?? [];
    list.push(contribution);
    byState.set(stateKey, list);
  };
  const within = (date: IsoDate) => date >= periodStart && date <= periodEnd;

  for (const record of world.history.crisisRecords ?? []) {
    if (record.kind !== "hazard-episode" || !within(record.effectiveAt))
      continue;
    const stateKey = `US-${record.stateUsps}`;
    const amount = HAZARD_PRESSURE_ESTIMATE[record.magnitude];
    const causeKey = `hazard:${record.family}:${record.magnitude}`;
    add(stateKey, { causeKey, kind: "leave", amount, sourceId: record.id });
    add(stateKey, { causeKey, kind: "fear", amount, sourceId: record.id });
  }

  const proposals = new Map(
    (world.history.taxProposals ?? []).map((row) => [row.id, row]),
  );
  const policies = new Map(
    (world.history.taxPolicies ?? []).map((row) => [row.id, row]),
  );
  const rateOf = (policyId: EntityId | null): number => {
    const terms = policyId
      ? proposals.get(policies.get(policyId)?.proposalId as EntityId)?.terms
      : undefined;
    return terms ? terms.rateNumerator / terms.rateDenominator : 0;
  };
  for (const policy of world.history.taxPolicies ?? []) {
    if (!within(policy.effectiveAt) || policy.recordedAt > world.currentDate)
      continue;
    const proposal = proposals.get(policy.proposalId);
    const jurisdiction = proposal
      ? world.jurisdictions[proposal.jurisdictionId]
      : undefined;
    const stateKey = jurisdiction
      ? stateKeyForJurisdiction(jurisdiction)
      : null;
    if (!proposal || !stateKey) continue;
    const change =
      proposal.terms.rateNumerator / proposal.terms.rateDenominator -
      rateOf(policy.supersedesPolicyId);
    if (change === 0) continue;
    add(stateKey, {
      causeKey: `tax:${proposal.terms.seriesKey}`,
      kind: change > 0 ? "leave" : "arrive",
      amount: Math.abs(change) * TAX_RATE_PRESSURE_ESTIMATE,
      sourceId: policy.id,
    });
  }
  // Reported crime beyond a town's ordinary police log: an ordinary month of
  // reports is background, not news that frightens a state.
  const periodDays =
    (Date.parse(periodEnd) - Date.parse(periodStart)) / 86_400_000 + 1;
  const ordinaryReports = Math.round(
    (TOWN_POLICE_LOG.reportedPerMonth * periodDays * 12) / 365.25,
  );
  const reportedByTown = new Map<EntityId, HistoricalEvent[]>();
  for (const event of world.history.events) {
    if (event.type !== CRIME_EVENT_TYPES.reported || !within(event.occurredAt))
      continue;
    if (!event.jurisdictionId) continue;
    const list = reportedByTown.get(event.jurisdictionId) ?? [];
    list.push(event);
    reportedByTown.set(event.jurisdictionId, list);
  }
  for (const [townId, events] of reportedByTown) {
    // A town is not its state: read the state the town sits in.
    const stateKey =
      lifePlaceByJurisdictionId(townId)?.stateJurisdictionKey ?? null;
    if (!stateKey) continue;
    const ordered = [...events].sort(
      (a, b) =>
        a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id),
    );
    for (const event of ordered.slice(ordinaryReports)) {
      const offense = offenseOf(event);
      if (!offense) continue;
      add(stateKey, {
        causeKey: `crime:${offense}`,
        kind: "fear",
        amount: CRIME_PRESSURE_ESTIMATE[offense],
        sourceId: event.id,
      });
    }
  }

  // Jobs: a state's own recorded month against the nation's. Only a state the
  // economy records separately has one (today, after a shock there); every
  // other state reads as the nation and adds nothing.
  const months = world.macroEconomy?.months ?? [];
  const national = new Map(
    months
      .filter((row) => row.scope === "national")
      .map((row) => [row.periodEnd, row]),
  );
  const latestByScope = new Map<string, (typeof months)[number]>();
  for (const row of months) {
    if (row.scope === "national" || !within(row.recordedAt)) continue;
    latestByScope.set(row.scope, row);
  }
  for (const [scope, row] of latestByScope) {
    const jurisdiction =
      world.jurisdictions[scope.slice("jurisdiction:".length) as EntityId];
    if (jurisdiction?.kind !== "state-placeholder") continue;
    const stateKey = stateKeyForJurisdiction(jurisdiction);
    const nation = national.get(row.periodEnd);
    if (!stateKey || !nation) continue;
    const gap = row.unemploymentPct - nation.unemploymentPct;
    if (gap === 0) continue;
    add(stateKey, {
      causeKey: "jobs:unemployment-gap",
      kind: gap > 0 ? "leave" : "arrive",
      amount: Math.abs(gap) * UNEMPLOYMENT_GAP_PRESSURE_ESTIMATE,
      sourceId: row.key as EntityId,
    });
  }

  // Anger and fear, read in `anger.ts`.
  const stateKeys = [
    ...new Set(
      world.jurisdictionOrder.flatMap((id) => {
        const jurisdiction = world.jurisdictions[id];
        const key = jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null;
        return key ? [key] : [];
      }),
    ),
  ];
  for (const [stateKey, list] of angerCausesInPeriod(
    world,
    periodStart,
    periodEnd,
    stateKeys,
  ))
    for (const contribution of list) add(stateKey, contribution);
  return byState;
}
