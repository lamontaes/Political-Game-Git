import { governingOfficeForPerson } from "./governing/state-governing";
import {
  macroConditionsAt,
  macroHistoryStart,
  macroScopeForJurisdiction,
} from "./macro-economy/readers";
import {
  rememberedAdverseFindingsAgainst,
  UNRESEARCHED_FINDING_EFFECTS,
} from "./press/findings";
import type { EntityId, IsoDate, World } from "./types";

/**
 * UNRESEARCHED. How far a governor's record on the economy moves their
 * starting position when they run again. A blanket game rule, not an estimate
 * of retrospective voting; filed with the research queue as
 * `record-in-office-electoral-magnitudes`. Starting weights are drawn from
 * 850 to 1150 in `campaigns.ts`, so the cap is half that spread.
 */
export const UNRESEARCHED_RECORD_IN_OFFICE = {
  version: "record-in-office-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  /** Weight per percentage point the unemployment rate fell in office. */
  weightPerUnemploymentPoint: 60,
  maxAbsoluteWeight: 150,
} as const;

export interface RecordInOffice {
  readonly officeTitle: string;
  readonly jurisdictionId: EntityId;
  readonly since: IsoDate;
  readonly unemploymentAtStartPct: number;
  readonly unemploymentNowPct: number;
  /** Positive helps the officeholder, negative hurts them. */
  readonly weight: number;
}

function unemploymentOn(
  world: World,
  jurisdictionId: EntityId,
  date: IsoDate,
): number | null {
  const local = macroConditionsAt(
    world,
    macroScopeForJurisdiction(jurisdictionId),
    date,
  );
  if (local) return local.unemploymentPct;
  const national = macroConditionsAt(world, "national", date);
  if (national) return national.unemploymentPct;
  const start = macroHistoryStart(world);
  return start && start.effectiveDate <= date
    ? start.initial.unemploymentPct
    : null;
}

/**
 * A sitting governor's record: what happened to unemployment in their state
 * (its own recorded layer where local events gave it one, otherwise the
 * national figure) between the start of their term and `asOf`. Read-only.
 * Null for somebody who holds no such office, or where the economy has no
 * recorded history to judge them by: an unknown record is not a good one.
 */
export function recordInOffice(
  world: World,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): RecordInOffice | null {
  const office = governingOfficeForPerson(world, personId);
  if (!office?.termStartedAt || office.termStartedAt > asOf) return null;
  const macroStart = macroHistoryStart(world);
  if (!macroStart) return null;
  const since =
    office.termStartedAt < macroStart.effectiveDate
      ? macroStart.effectiveDate
      : office.termStartedAt;
  const atStart = unemploymentOn(world, office.jurisdictionId, since);
  const now = unemploymentOn(world, office.jurisdictionId, asOf);
  if (atStart === null || now === null) return null;
  const rule = UNRESEARCHED_RECORD_IN_OFFICE;
  const raw = Math.round((atStart - now) * rule.weightPerUnemploymentPoint);
  return {
    officeTitle: office.title,
    jurisdictionId: office.jurisdictionId,
    since,
    unemploymentAtStartPct: atStart,
    unemploymentNowPct: now,
    weight: Math.max(
      -rule.maxAbsoluteWeight,
      Math.min(rule.maxAbsoluteWeight, raw),
    ),
  };
}

/**
 * What a candidate's past adds to or takes from their starting weight in a
 * new contest: a public ethics finding still in voters' memory starts them
 * further back, and a sitting governor starts ahead or behind on what
 * happened to unemployment on their watch. Both are UNRESEARCHED blanket
 * rules (`press/findings.ts` and above).
 */
export function startingSupportAdjustment(
  world: World,
  personId: EntityId,
  asOf: IsoDate,
): number {
  const findings = rememberedAdverseFindingsAgainst(world, personId, asOf);
  return (
    (recordInOffice(world, personId, asOf)?.weight ?? 0) -
    findings.length * UNRESEARCHED_FINDING_EFFECTS.laterContestWeightPenalty
  );
}
