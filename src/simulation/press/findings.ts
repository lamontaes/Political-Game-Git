import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { CLAIM_CONTRADICTION_EVENT } from "../claim-stances";
import type {
  MatterRecord,
  MatterProceedingRecord,
  ProceedingOutcome,
  ProceedingStepRecord,
} from "./records";
import { pressRecordsOfKind } from "./store";

/**
 * Which proceeding outcomes count against the person they name once they are
 * public. A complaint, a notice, reason to believe and probable cause are
 * procedural stages, not findings. A confidential reprimand is adverse but
 * nobody outside the proceeding knows of it, so it reaches no voter, donor,
 * relative or party. A simulated inquiry's report is issued only when the
 * record supports the allegation (see `procedures.ts`), and it says so in
 * public, but it has no sanction power: it can cost standing, never money.
 */
export const ADVERSE_PUBLIC_OUTCOMES = [
  "finding",
  "conciliation",
  "report-issued",
] as const satisfies readonly ProceedingOutcome[];

export type AdversePublicOutcome = (typeof ADVERSE_PUBLIC_OUTCOMES)[number];

export function isAdversePublicStep(
  step: Pick<ProceedingStepRecord, "publicStep" | "outcome">,
): step is ProceedingStepRecord & { outcome: AdversePublicOutcome } {
  return (
    step.publicStep &&
    step.outcome !== null &&
    (ADVERSE_PUBLIC_OUTCOMES as readonly string[]).includes(step.outcome)
  );
}

/**
 * RECORDED GAME RULE. A finding or conciliation removes 300 basis points of
 * support, a report removes 150, and each public finding subtracts 90 from a
 * later contest's starting weight. Public findings remain in the record. The game's
 * research memo records a 6-to-11-point association for corruption charges in
 * 1968-1978 U.S. House districts but explicitly does not validate these ethics-
 * finding magnitudes. These values are therefore game rules, not real-world
 * estimates. A directly matched study must replace them under a new version.
 */
export const RECORDED_FINDING_EFFECTS = {
  version: "finding-consequences-recorded-v1",
  provenance: "recorded-game-rule-informed-by-us-house-corruption-charge-range",
  /** Basis points of contest support a respondent loses when it lands. */
  supportLossBasisPoints: {
    finding: 300,
    conciliation: 300,
    "report-issued": 150,
  } satisfies Record<AdversePublicOutcome, number>,
  /**
   * Starting-weight penalty in a later contest, per public finding. Starting
   * weights are drawn from 850 to 1150 in
   * `campaigns.ts`, so 90 is roughly a quarter of that spread.
   */
  laterContestWeightPenalty: 90,
} as const;

export interface AdversePublicFinding {
  readonly step: ProceedingStepRecord & { outcome: AdversePublicOutcome };
  readonly proceeding: MatterProceedingRecord;
}

/**
 * Public adverse outcomes naming `personId`, recorded on or before `asOf`.
 * Read-only: it writes nothing and draws nothing.
 */
export function publicAdverseFindingsAgainst(
  world: World,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): readonly AdversePublicFinding[] {
  const proceedings = new Map(
    pressRecordsOfKind(world, "matter-proceeding")
      .filter((proceeding) => proceeding.respondentPersonIds.includes(personId))
      .map((proceeding) => [proceeding.id, proceeding]),
  );
  if (proceedings.size === 0) return [];
  return pressRecordsOfKind(world, "proceeding-step").flatMap((step) => {
    const proceeding = proceedings.get(step.proceedingId);
    if (!proceeding || step.at > asOf || !isAdversePublicStep(step)) return [];
    return [{ step, proceeding }];
  });
}

/** Public matter, response and caught-lie events a rival can cite. */
export function publicPressEventsAbout(
  world: World,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): readonly HistoricalEvent[] {
  const events = new Map(
    world.history.events.map((event) => [event.id, event]),
  );
  const matters = pressRecordsOfKind(world, "matter").filter((matter) =>
    matter.subjectPersonIds.includes(personId),
  );
  const mattersById = new Map<EntityId, MatterRecord>(
    matters.map((matter) => [matter.id, matter]),
  );
  const selected = new Map<EntityId, HistoricalEvent>();
  const add = (eventId: EntityId) => {
    const event = events.get(eventId);
    if (
      event?.visibility === "public" &&
      event.occurredAt <= asOf &&
      event.recordedAt <= asOf
    )
      selected.set(event.id, event);
  };
  for (const matter of matters)
    if (matter.openedAt <= asOf) add(matter.originEventId);
  for (const response of pressRecordsOfKind(world, "matter-response")) {
    const matter = mattersById.get(response.matterId);
    if (
      response.respondedAt <= asOf &&
      (response.actorPersonId === personId ||
        matter?.subjectPersonIds.includes(personId))
    )
      add(response.eventId);
  }
  for (const event of world.history.events)
    if (
      event.type === CLAIM_CONTRADICTION_EVENT &&
      event.tags.includes("claim.intent.deceive") &&
      event.participants.some(
        (participant) => participant.personId === personId,
      )
    )
      add(event.id);
  return [...selected.values()].sort(
    (left, right) =>
      left.occurredAt.localeCompare(right.occurredAt) ||
      left.sequence - right.sequence,
  );
}

/**
 * RECORDED GAME RULE DERIVED FROM FIRST-OFFENSE CONSEQUENCES. Each prior
 * finding adds half of the first finding's electoral effect and one complete
 * restitution-sized civil-penalty step, capped at three times the first
 * consequence. The comparison set is every place using the recorded adverse
 * outcome rule; the game has no place-specific escalation table. The filed
 * `repeat-ethics-offense-escalation` research can replace this rule.
 */
export const RECORDED_REPEAT_OFFENSE = {
  version: "repeat-offense-recorded-v1",
  provenance: "recorded-game-rule-derived-from-first-offense-consequences",
  /** Added to the support-loss multiplier for each earlier finding. */
  supportLossStepPerPriorFinding: 0.5,
  /** Added to the civil-penalty multiplier for each earlier finding. */
  civilPenaltyStepPerPriorFinding: 1,
  maxMultiplier: 3,
} as const;

/**
 * Earlier public findings against `personId`, before the one in `step`. Every
 * earlier finding counts, remembered by voters or not: a regulator's record
 * does not fade the way a voter's memory does.
 */
export function priorAdverseFindings(
  world: World,
  personId: EntityId,
  step: Pick<ProceedingStepRecord, "id" | "at">,
): readonly AdversePublicFinding[] {
  return publicAdverseFindingsAgainst(world, personId, step.at).filter(
    (finding) => finding.step.id !== step.id && finding.step.at <= step.at,
  );
}

export function repeatOffenseMultiplier(
  priorFindings: number,
  kind: "support-loss" | "civil-penalty",
): number {
  const rule = RECORDED_REPEAT_OFFENSE;
  const stepSize =
    kind === "support-loss"
      ? rule.supportLossStepPerPriorFinding
      : rule.civilPenaltyStepPerPriorFinding;
  return Math.min(rule.maxMultiplier, 1 + stepSize * priorFindings);
}
