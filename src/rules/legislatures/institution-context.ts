import type {
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
  LegislativeVoteDisposition,
  LegislativeQuestionIdentity,
} from "../../simulation/types";
import type { LegislativeRulePack } from "../../simulation/legislature-rules";
import type { MeasureStepKey } from "../../simulation/legislation";
import type {
  LegislativeBlueprint,
  SeatedBody,
} from "../../simulation/legislation-scenarios";
import type { LegislativeStartingProcedureEntry } from "../../simulation/legislative-starting-procedures";
import { measurePosition, type MeasureReplayFacts } from "./measure-replay";
import { sessionClosesOn, type SessionClosureFacts } from "./session-closure";
import { sessionStatus } from "./session-status";
import { regularSessionYearForWorld } from "./session-rules";
import {
  nextSessionCalendarDate,
  type SittingCalendar,
} from "./sitting-calendar";
import { makeIsoDate as validateDate } from "../elections/calendar";
import { seatChamber } from "./chamber-seating";
import { authoredScenarioSeatCount } from "./authored-seats";
import { decideChamberVote, type ChamberDecisionFacts } from "./chamber-vote";
import { dispositionsFromCounts } from "./vote-dispositions";
export type MeasureStepOwner = "sponsor-office" | "institution" | "executive";
export interface InstitutionCommand {
  readonly command: string;
  readonly input: unknown;
}
export type InstitutionStepPlan = {
  readonly kind:
    | "applied"
    | "wait-until"
    | "blocked"
    | "ended"
    | "executive"
    | "idle"
    | "prepare";
  readonly step?: MeasureStepKey;
  readonly date?: IsoDate;
  readonly reason?: string;
  readonly commands?: readonly InstitutionCommand[];
};
export interface InstitutionFacts
  extends MeasureReplayFacts, SessionClosureFacts {
  readonly starting: LegislativeStartingProcedureEntry | null;
  readonly isCongress: boolean;
  readonly playerPersonId: EntityId | null;
  readonly blueprint: LegislativeBlueprint;
  readonly measures: readonly LegislativeMeasureRecord[];
  readonly seated: ReadonlyMap<string, { readonly body: SeatedBody } | null>;
  readonly people: ReadonlyMap<
    EntityId,
    { readonly id: EntityId; readonly name: string }
  >;
  readonly authoredCounts: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  readonly chamberVotes: ReadonlyMap<string, ChamberDecisionFacts>;
  readonly playerBallots: ReadonlyMap<
    string,
    LegislativeVoteDisposition["disposition"] | null
  >;
  readonly defaultCalendar: SittingCalendar;
  readonly blockedKeys: readonly ReadonlySet<string>[];
}
function makeIsoDate(raw: string): IsoDate {
  return validateDate(raw) as IsoDate;
}
function maxIsoDate(a: string, b: string): IsoDate {
  return (a > b ? a : b) as IsoDate;
}
export function chamberQuestionFactKey(
  question: Omit<
    LegislativeQuestionIdentity,
    "amendmentStableKey" | "provisionKey"
  >,
): string {
  return JSON.stringify(question);
}
export function measureSessionYear(facts: InstitutionFacts): number {
  const first = facts.actions
    .filter((row) => row.measureId === facts.measure.id)
    .slice()
    .sort((a, b) => a.sequence - b.sequence)[0];
  return Number((first?.occurredAt ?? facts.onDate).slice(0, 4));
}
export function nextMeasureStableKey(
  facts: Pick<InstitutionFacts, "blockedKeys">,
  measureId: EntityId,
  prefix: string,
): string {
  if (prefix.trim().length === 0)
    throw new Error("A stable key prefix must not be empty.");
  const blocked = facts.blockedKeys;
  const size = blocked.reduce((sum, keys) => sum + keys.size, 0);
  for (let n = 1; n <= size + 1; n += 1) {
    const candidate = `${prefix}:${n}`;
    if (!blocked.some((keys) => keys.has(candidate))) return candidate;
  }
  throw new Error(`Could not derive a free stable key for '${prefix}'.`);
}
export function measureStepOwner(
  facts: InstitutionFacts,
  measureId: EntityId,
  sponsorChamberKey: string,
): MeasureStepOwner | null {
  const position = measurePosition(facts, facts.measure.id);
  const recordedMemberDecision = facts.starting !== null || facts.isCongress;
  switch (position.phase) {
    case "awaiting-referral":
    case "awaiting-floor":
      return position.chamberKey === sponsorChamberKey
        ? "sponsor-office"
        : "institution";
    case "in-committee":
    case "on-floor":
    case "awaiting-concurrence":
      return recordedMemberDecision || position.chamberKey !== sponsorChamberKey
        ? "institution"
        : "sponsor-office";
    case "awaiting-transmittal":
    case "awaiting-enrollment":
    case "awaiting-presentation":
    case "awaiting-enactment":
      return "institution";
    case "awaiting-executive":
      return "executive";
    case "awaiting-override":
      return recordedMemberDecision ? "institution" : "sponsor-office";
    default:
      return null;
  }
}

export function playerOfficeHoldsMeasure(
  facts: InstitutionFacts,
  measure: LegislativeMeasureRecord,
): boolean {
  if (facts.playerPersonId === null) return false;
  if (measure.sponsorPersonId === facts.playerPersonId) return true;
  return measure.stableKey.startsWith("legislative-work:");
}

export function effectiveOwner(
  facts: InstitutionFacts,
  measure: LegislativeMeasureRecord,
): MeasureStepOwner | null {
  const owner = measureStepOwner(facts, measure.id, measure.originChamberKey);
  if (owner === "sponsor-office" && !playerOfficeHoldsMeasure(facts, measure))
    return measurePosition(facts, facts.measure.id).phase ===
      "awaiting-override"
      ? isSeatedChamber(facts, facts.blueprint)
        ? "institution"
        : null
      : "institution";
  return owner;
}

export function measureSessionClosedOn(
  facts: InstitutionFacts,
  measure: LegislativeMeasureRecord,
  pack: LegislativeRulePack,
): IsoDate | null {
  const starting = facts.starting;
  let year = starting?.measuresCarryOver
    ? Number(facts.onDate.slice(0, 4))
    : measureSessionYear(facts);
  if (
    starting?.measuresCarryOver &&
    !regularSessionYearForWorld(facts.starting, measure.jurisdictionId, year)
  ) {
    year -= 1;
  }
  return sessionClosesOn(facts, pack, year);
}

function vetoWaitsForNextSitting(
  facts: InstitutionFacts,
  measure: LegislativeMeasureRecord,
  phase: string,
): boolean {
  if (phase !== "awaiting-override") return false;
  const dies = facts.blueprint.pack.session.measuresDieAtAdjournment;
  return !(dies.kind === "known" && dies.value);
}

function legislatureSatSince(
  facts: InstitutionFacts,
  measure: LegislativeMeasureRecord,
  closedOn: IsoDate,
): boolean {
  return (facts.measures ?? []).some(
    (candidate) =>
      candidate.rulePackId === measure.rulePackId &&
      candidate.introducedAt > closedOn &&
      candidate.introducedAt <= facts.onDate,
  );
}

export function bodiesForMeasure(
  facts: InstitutionFacts,
  measure: LegislativeMeasureRecord,
  blueprint: LegislativeBlueprint,
): readonly SeatedBody[] {
  const seated = blueprint.pack.chambers.map(
    (chamber) => facts.seated.get(chamber.chamberKey) ?? null,
  );
  if (seated.every((chamber) => chamber !== null))
    return seated.map((chamber) => chamber!.body);
  if (blueprint.scenarioKey.startsWith("institution:")) return [];
  return blueprint.pack.chambers.map((chamber) => {
    const sponsor = measure.sponsorPersonId
      ? facts.people.get(measure.sponsorPersonId)
      : undefined;
    return seatChamber(
      chamber.chamberKey,
      chamber.name,
      authoredScenarioSeatCount(
        facts.authoredCounts,
        blueprint.pack,
        chamber.chamberKey,
      ),
      chamber.chamberKey === measure.originChamberKey && sponsor
        ? [{ personId: sponsor.id, name: sponsor.name }]
        : [],
      blueprint.nonpartisan,
    );
  });
}

function votes(
  blueprint: LegislativeBlueprint,
  members: SeatedBody["members"],
  question: string,
) {
  const plan = blueprint.votePlan[question];
  return plan ? dispositionsFromCounts(members, plan) : null;
}

export function decide(
  facts: InstitutionFacts,
  blueprint: LegislativeBlueprint,
  members: SeatedBody["members"],
  planKey: string,
  question: Omit<
    LegislativeQuestionIdentity,
    "amendmentStableKey" | "provisionKey"
  >,
  stableKey: string,
  contested?: boolean,
) {
  const seated = members.length > 0 && members.every((m) => m.personId);
  if (!seated || !isSeatedChamber(facts, blueprint)) {
    const authored = votes(blueprint, members, planKey);
    return authored
      ? { dispositions: authored, method: "authored-fixture" as const }
      : null;
  }
  return {
    dispositions: decideChamberVote(facts.chamberVotes.get(stableKey)!, {
      stableKey,
      question: {
        question: { ...question, amendmentStableKey: null, provisionKey: null },
        questionLabel: planKey,
      },
      members,
      playerPersonId: facts.playerPersonId,
      playerBallot: facts.playerPersonId
        ? (facts.playerBallots.get(chamberQuestionFactKey(question)) ?? null)
        : null,
      ...(contested === undefined ? {} : { contested }),
      nonpartisan: blueprint.nonpartisan,
    }),
    method: "member-decisions" as const,
  };
}

export function isSeatedChamber(
  facts: InstitutionFacts,
  blueprint: LegislativeBlueprint,
) {
  return blueprint.pack.chambers.every(
    (chamber) => (facts.seated.get(chamber.chamberKey) ?? null) !== null,
  );
}

export function present(dispositions: readonly LegislativeVoteDisposition[]) {
  return dispositions.filter(
    (entry) =>
      entry.disposition !== "absent" && entry.disposition !== "excused",
  ).length;
}

export function provenance(
  note: string,
  method: "authored-fixture" | "member-decisions" = "authored-fixture",
) {
  return {
    method,
    note,
    sourceEntityIds: [],
  };
}

export function applyInstitutionSessionEnd(
  facts: InstitutionFacts,
  measureId: EntityId,
): InstitutionStepPlan | null {
  const measure = facts.measure;
  const position = measurePosition(facts, facts.measure.id);
  if (position.terminal) return { kind: "idle" };
  const pack = facts.pack;
  const phase = position.phase;
  const session = sessionStatus(
    facts.onDate,
    measureSessionClosedOn(facts, measure, pack),
    measure,
    pack,
    phase,
  );
  if (!session.closed) return null;
  const owner = measureStepOwner(facts, measureId, measure.originChamberKey);
  const reconsidersVetoLater =
    session.closed && vetoWaitsForNextSitting(facts, measure, phase);
  if (
    reconsidersVetoLater &&
    !legislatureSatSince(facts, measure, session.closedOn!)
  )
    return {
      kind: "wait-until",
      date: maxIsoDate(
        makeIsoDate(`${Number(session.closedOn!.slice(0, 4)) + 1}-01-01`),
        nextSessionCalendarDate(
          pack.session.sittingCalendar ?? facts.defaultCalendar,
          facts.onDate,
        ),
      ),
    };
  const closed = session.closed && !reconsidersVetoLater;
  const dies = pack.session.measuresDieAtAdjournment;
  if (closed && owner !== "executive" && dies.kind === "known" && dies.value)
    return {
      kind: "ended",
      commands: [
        {
          command: "recordAdjournmentDeath",
          input: {
            stableKey: nextMeasureStableKey(
              facts,
              measureId,
              `measure:${measureId}:died-on-adjournment`,
            ),
            measureId,
          },
        },
      ],
    };
  if (closed)
    return {
      kind: "blocked",
      reason: facts.starting?.measuresCarryOver
        ? `The regular session ended on ${session.closedOn}; the bill remains pending for the next regular session.`
        : `The session ended on ${session.closedOn}; whether this bill carries over is not established, so nothing more happens to it.`,
    };
  return null;
}
