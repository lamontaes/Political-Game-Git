import { addDays } from "./dates";
import { recordById } from "./history-index";
import { recordLawExposure } from "./law-exposure";
import { money } from "./resources";
import type { EntityId, IsoDate, World } from "./types";

/**
 * A law that changed someone's pay reaches that person.
 *
 * The writers that carry out a law (a minimum wage raising town pay, a raise
 * on the player's own job) record the new pay terms and cite the law's
 * enactment as their cause. Until now nothing told the person: the paycheck
 * rose and nobody connected it to the lawmakers, so no view of an official
 * formed and nobody told a friend. This reads those records after each payday
 * and writes the exposure: the person, the law, and the monthly difference it
 * made next to their pay. Their partner hears of it at home.
 *
 * Nothing is drawn. Only a record that names an enacted law counts, and a
 * change the record does not tie to a law is left alone.
 */

export const LAW_EFFECTS_NOTICED_VERSION = "law-effects-noticed/v1";

/*
 * How far back a payday looks for new terms. Paydays come at least monthly
 * (town-pay.ts), so five weeks covers the longest gap with room to spare;
 * the stable key keeps a change from being noticed twice.
 */
const LOOK_BACK_DAYS = 35;

/** Pay periods in a year, read from the flow's cadence. */
export function periodsPerYear(cadenceKind: string): number | null {
  const match = /(semimonthly|biweekly|weekly|monthly)/.exec(cadenceKind);
  if (!match) return null;
  return { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 }[
    match[1] as "weekly" | "biweekly" | "semimonthly" | "monthly"
  ];
}

/**
 * Records an exposure for every pay change since `since` whose record cites an
 * enacted law. Idempotent.
 */
export function noticeLawPayChanges(world: World, since: IsoDate): World {
  const lawOfEvent = new Map<EntityId, EntityId>();
  for (const enactment of world.history.legislativeEnactments ?? []) {
    if (enactment.outcome === "enacted" && enactment.outcomeEventId)
      lawOfEvent.set(enactment.outcomeEventId, enactment.measureId);
  }
  if (lawOfEvent.size === 0) return world;
  const from = addDays(since, -LOOK_BACK_DAYS);
  // Read only when a term names a law: every payday passes through here, and
  // listing every flow and term in the world each time grew with its years.
  let noticed: Set<string> | null = null;
  let next = world;
  for (const row of world.history.resourceFlowTerms) {
    if (row.effectiveAt < from || row.effectiveAt > world.currentDate) continue;
    if (row.provenance.kind !== "simulated-event") continue;
    const measureId = lawOfEvent.get(row.provenance.eventId);
    if (!measureId || !row.supersedesTermsId) continue;
    const flow = recordById(world.history.resourceFlows, row.resourceFlowId);
    if (
      !flow ||
      flow.basisReference.kind !== "work" ||
      flow.recipient.kind !== "person"
    )
      continue;
    const personId = flow.recipient.personId;
    const stableKey = `${LAW_EFFECTS_NOTICED_VERSION}:${row.id}`;
    noticed ??= new Set(
      (world.history.lawExposures ?? []).map((exposure) => exposure.stableKey),
    );
    if (noticed.has(stableKey) || !next.people[personId]) continue;
    const before = recordById(
      world.history.resourceFlowTerms,
      row.supersedesTermsId,
    );
    const periods = periodsPerYear(row.cadenceKind);
    const beforePeriods = before ? periodsPerYear(before.cadenceKind) : null;
    if (!before || periods === null || beforePeriods === null) continue;
    // Compare annual amounts: changing pay frequency alone is not a raise.
    const change =
      row.amount.minorUnits * periods -
      before.amount.minorUnits * beforePeriods;
    if (change === 0) continue;
    next = recordLawExposure(next, {
      stableKey,
      personId,
      measureId,
      channel: "paycheck",
      direction: change > 0 ? "gain" : "cost",
      amount: money(Math.round(Math.abs(change) / 12), row.amount.currency),
      cadence: "monthly",
      sourceRecordId: row.id,
    });
    noticed.add(stableKey);
  }
  return next;
}
