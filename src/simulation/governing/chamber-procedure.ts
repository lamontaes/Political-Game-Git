import germanenessTable from "../../../data/research/legislative-procedure/germaneness.json" with { type: "json" };
import singleSubjectTable from "../../../data/research/legislative-procedure/single-subject.json" with { type: "json" };
import { createStableId } from "../ids";
import type {
  ChamberRule,
  FloorStageRule,
  LegislativeRulePack,
} from "../legislature-rules";
import type {
  ChamberProcedureRuleKey,
  ChamberRuleChangeRecord,
  EntityId,
  LegislativeMeasureRecord,
  PropositionAnswerRef,
  World,
} from "../types";
import { measureAnswersAt } from "../vote-bundle";
import { recordWorldEvent } from "../world";

/**
 * Each chamber's own procedure for amendments (Build 25 step 4, design D-5).
 *
 * A chamber starts a game under its real 2026 rules, read by Research 6 from
 * each constitution, joint rule, chamber rule or adopted manual
 * (`data/research/legislative-procedure/`). A rule a chamber made for itself
 * can be changed in play by that chamber, and every change is a
 * `ChamberRuleChangeRecord` naming the vote that adopted it. A rule that
 * comes from the constitution cannot be changed by a rules vote (CTO ruling,
 * September 28, 10:24 p.m.): the writer refuses it.
 *
 * Two rules decide whether a floor amendment is in order:
 *
 * 1. Germaneness. 109 of the 110 chambers read require an amendment to be
 *    germane to the bill; the U.S. Senate has no general rule. A chamber whose
 *    rules could not be read starts with the rule every read chamber has,
 *    marked estimated from average (Research 6, 10:50 p.m.).
 * 2. Single subject. 44 of 56 constitutions confine a law to one subject.
 *    The rule binds the text of the law, so it reaches every amendment.
 *
 * GAME ASSUMPTION (hand-set, not measured): a presiding officer judges
 * germaneness by several tests (subject matter, fundamental purpose, the
 * committee that would hold it). The game has one: an amendment is germane
 * when the question it answers lies in a policy domain the bill already
 * answers a question in. It affects which amendments members may offer; it
 * stands in until the precedents are read.
 */

export type GermanenessSetting =
  | "required"
  | "not-required"
  /** Required only on money bills, as the U.S. Senate's Rule XVI does. */
  | "appropriations-only";

export type AmendmentAccess = "open" | "structured" | "closed";

/** How a chamber's rule is held: which body can change it. */
export type ProcedureRoute =
  | "constitution"
  | "joint-rule"
  | "chamber-rule"
  | "adopted-manual"
  | "estimated";

export interface ProcedureRuleState<Value extends string> {
  readonly value: Value;
  /** "read" from a source, or "estimated-from-average" where none was read. */
  readonly basis: "read" | "estimated-from-average" | "game-default";
  readonly route: ProcedureRoute;
  readonly citation: string;
  /** The in-play change that set it, when the chamber changed it. */
  readonly change: ChamberRuleChangeRecord | null;
}

interface GermanenessRow {
  readonly code: string;
  readonly chamber: string;
  readonly chamberName: string;
  readonly germaneRequired: string;
  readonly sourceType: string;
  readonly citation: string;
  readonly evidence: string;
}

interface SingleSubjectRow {
  readonly code: string;
  readonly singleSubject: string;
  readonly scope: string | null;
  readonly appropriationsException: string | null;
  readonly citation: string;
}

const GERMANENESS_ROWS = (germanenessTable as { rows: GermanenessRow[] }).rows;
const SINGLE_SUBJECT_ROWS = singleSubjectTable as SingleSubjectRow[];

function placeCode(pack: LegislativeRulePack): string {
  return pack.jurisdictionKey.replace(/^US-/, "");
}

/**
 * The research row for one chamber of a pack: a unicameral pack reads its
 * place's only row; a bicameral pack's first chamber is the place's lower
 * house, whatever it is called, and its second the Senate.
 */
function germanenessRow(
  pack: LegislativeRulePack,
  chamberKey: string,
): GermanenessRow | null {
  const rows = GERMANENESS_ROWS.filter((row) => row.code === placeCode(pack));
  if (rows.length === 0) return null;
  if (pack.structure !== "bicameral" || rows.length === 1)
    return rows.length === 1 ? rows[0]! : null;
  const upper = pack.chamberOrder[1] === chamberKey;
  return rows.find((row) => (row.chamber === "Senate") === upper) ?? null;
}

function routeOf(sourceType: string): ProcedureRoute {
  if (sourceType === "constitution") return "constitution";
  if (sourceType === "joint-rule") return "joint-rule";
  if (sourceType === "chamber-rule") return "chamber-rule";
  if (sourceType.endsWith("manual-adopted")) return "adopted-manual";
  return "estimated";
}

function latestChange(
  world: World,
  rulePackId: string,
  chamberKey: string,
  rule: ChamberProcedureRuleKey,
): ChamberRuleChangeRecord | null {
  let found: ChamberRuleChangeRecord | null = null;
  for (const record of world.history.chamberRuleChanges ?? []) {
    if (
      record.rulePackId === rulePackId &&
      record.chamberKey === chamberKey &&
      record.rule === rule &&
      (!found || record.sequence > found.sequence)
    )
      found = record;
  }
  return found;
}

/** The germaneness rule a chamber starts a game with, before any change. */
export function startingGermaneness(
  pack: LegislativeRulePack,
  chamberKey: string,
): ProcedureRuleState<GermanenessSetting> {
  const row = germanenessRow(pack, chamberKey);
  if (!row) {
    // No research row: a town council, or a place the table does not
    // cover. ESTIMATED FROM AVERAGE: all 83 chambers whose rule was read
    // from primary text require germane amendments (germaneness.json).
    return {
      value: "required",
      basis: "estimated-from-average",
      route: "estimated",
      citation:
        "Most common rule among read chambers: 83 of 83 require germane amendments (Research 6, germaneness.json).",
      change: null,
    };
  }
  const value: GermanenessSetting =
    row.germaneRequired === "yes"
      ? "required"
      : // The U.S. Senate, the one "no": germaneness binds general
        // appropriation bills (Rule XVI) and post-cloture debate, not bills
        // in general.
        "appropriations-only";
  return {
    value,
    basis:
      row.evidence === "estimated-from-average"
        ? "estimated-from-average"
        : "read",
    route: routeOf(row.sourceType),
    citation: row.citation,
    change: null,
  };
}

export function germanenessRule(
  world: World,
  pack: LegislativeRulePack,
  chamberKey: string,
): ProcedureRuleState<GermanenessSetting> {
  const start = startingGermaneness(pack, chamberKey);
  const change = latestChange(world, pack.packId, chamberKey, "germaneness");
  return change
    ? { ...start, value: change.value as GermanenessSetting, change }
    : start;
}

/**
 * Who may offer a floor amendment. A chamber whose floor takes amendments
 * starts open; the U.S. House starts structured, because nearly every bill
 * reaches its floor under a special rule from the Rules Committee that names
 * the amendments in order (House Practice ch. 26; Rule XIII cl. 6).
 */
export function amendmentAccessRule(
  world: World,
  pack: LegislativeRulePack,
  chamberKey: string,
): ProcedureRuleState<AmendmentAccess> {
  const usHouse =
    placeCode(pack) === "US" && pack.chamberOrder[0] === chamberKey;
  const start: ProcedureRuleState<AmendmentAccess> = usHouse
    ? {
        value: "structured",
        basis: "read",
        route: "chamber-rule",
        citation: "Rules of the House, Rule XIII cl. 6 (special rules)",
        change: null,
      }
    : {
        value: "open",
        basis: "game-default",
        route: "chamber-rule",
        citation:
          "The chamber's floor takes amendments under its rule pack; no rule read limits who may offer one.",
        change: null,
      };
  const change = latestChange(
    world,
    pack.packId,
    chamberKey,
    "amendment-access",
  );
  return change
    ? { ...start, value: change.value as AmendmentAccess, change }
    : start;
}

export interface SingleSubjectRule {
  readonly generalBills: boolean;
  /** A money bill may carry nothing but appropriations. */
  readonly appropriationBills: boolean;
  readonly citation: string;
}

/**
 * The constitution's single-subject rule for a place. The scope text is read
 * as written: a rule for "all bills" or "all laws" binds general bills; a
 * rule for "appropriation bills only", or an exception that confines the
 * general appropriation bill to appropriations, binds money bills.
 */
export function singleSubjectRule(
  pack: LegislativeRulePack,
): SingleSubjectRule | null {
  const row = SINGLE_SUBJECT_ROWS.find(
    (candidate) => candidate.code === placeCode(pack),
  );
  if (!row || row.singleSubject !== "yes") return null;
  const scope = (row.scope ?? "").toLowerCase();
  const exception = (row.appropriationsException ?? "").toLowerCase();
  const localOnly = scope.includes("private or local");
  const moneyOnly = scope.includes("appropriation bills only");
  const generalBills = !localOnly && !moneyOnly;
  const appropriationBills =
    moneyOnly ||
    /nothing but|embrace only|only ordinary|shall contain only|confined to/.test(
      exception,
    ) ||
    (generalBills &&
      (exception === "" ||
        exception === "n/a" ||
        exception.startsWith("none stated")));
  return { generalBills, appropriationBills, citation: row.citation };
}

/** The policy domains a bill already answers a question in, as it now reads. */
export function billDomains(
  world: World,
  measure: LegislativeMeasureRecord,
): ReadonlySet<string> {
  const domains = new Set<string>();
  const ids = new Set<EntityId>([
    ...(measure.propositionIds ?? []),
    ...measureAnswersAt(world, measure.id, undefined, "all").map(
      (row) => row.propositionId,
    ),
  ]);
  for (const id of ids) {
    const domain = domainOf(world, id);
    if (domain) domains.add(domain);
  }
  return domains;
}

function domainOf(world: World, propositionId: EntityId): string | null {
  const proposition = world.policyCatalog.propositions[propositionId];
  if (!proposition) return null;
  return world.policyCatalog.issues[proposition.issueId]?.domainId ?? null;
}

export interface Admissibility {
  readonly admissible: boolean;
  /** Plain words a presiding officer would give, for the record. */
  readonly reason: string;
}

/**
 * Whether a floor amendment carrying `part` is in order in this chamber, on
 * this bill, under the chamber's rules as they stand in the world now.
 */
export function amendmentAdmissible(
  world: World,
  pack: LegislativeRulePack,
  chamberKey: string,
  measure: LegislativeMeasureRecord,
  part: PropositionAnswerRef,
): Admissibility {
  const access = amendmentAccessRule(world, pack, chamberKey);
  if (access.value === "closed")
    return {
      admissible: false,
      reason: "The chamber has closed the floor to amendments.",
    };
  if (access.value === "structured")
    return {
      admissible: false,
      // The Rules Committee's choices are not modeled, so no amendment is
      // made in order; the gap is said rather than guessed.
      reason:
        "Only amendments a special rule makes in order may be offered, and none was made in order.",
    };
  const domain = domainOf(world, part.propositionId);
  const domains = billDomains(world, measure);
  const inSubject = domain !== null && domains.has(domain);
  const money = measure.subjectClass === "appropriation";

  const subject = singleSubjectRule(pack);
  if (subject) {
    if (money && subject.appropriationBills)
      return {
        admissible: false,
        reason: `The constitution confines an appropriation bill to appropriations (${subject.citation}).`,
      };
    if (!money && subject.generalBills && !inSubject && domains.size > 0)
      return {
        admissible: false,
        reason: `The constitution confines a law to one subject (${subject.citation}).`,
      };
  }

  const germane = germanenessRule(world, pack, chamberKey);
  // The U.S. Senate's Rule XVI: no general legislation on a general
  // appropriation bill, whatever its subject.
  if (germane.value === "appropriations-only" && money)
    return {
      admissible: false,
      reason: `An appropriation bill may not carry general legislation (${germane.change ? "the chamber's rule as changed" : germane.citation}).`,
    };
  // GAME ASSUMPTION (hand-set): a general appropriation bill funds every
  // area of government, so a part in any area is germane to it. Where the
  // constitution confines a money bill to appropriations, the check above
  // has already refused it; elsewhere a rider can ride.
  if (germane.value === "required" && !inSubject && !money)
    return {
      admissible: false,
      reason: `The amendment is not germane to the bill (${germane.change ? "the chamber's rule as changed" : germane.citation}).`,
    };
  return { admissible: true, reason: "In order." };
}

export interface RecordChamberRuleChangeInput {
  readonly stableKey: string;
  readonly pack: LegislativeRulePack;
  readonly chamberKey: string;
  readonly rule: ChamberProcedureRuleKey;
  readonly value: GermanenessSetting | AmendmentAccess;
  readonly adoptedByVoteId: EntityId | null;
  readonly rationale: string;
  readonly jurisdictionId: EntityId;
}

const VALUES: Readonly<Record<ChamberProcedureRuleKey, readonly string[]>> = {
  germaneness: ["required", "not-required", "appropriations-only"],
  "amendment-access": ["open", "structured", "closed"],
};

/**
 * Record a chamber changing its own procedure. Refuses a change to a rule
 * the constitution holds or a joint rule the other chamber shares, which a
 * chamber's rules vote cannot reach.
 */
export function recordChamberRuleChange(
  world: World,
  input: RecordChamberRuleChangeInput,
): World {
  if (!input.pack.chambers.some((c) => c.chamberKey === input.chamberKey))
    throw new Error(
      `Rule pack '${input.pack.packId}' has no chamber '${input.chamberKey}'.`,
    );
  if (!VALUES[input.rule].includes(input.value))
    throw new Error(
      `'${input.value}' is not a setting of the ${input.rule} rule.`,
    );
  if (
    (world.history.chamberRuleChanges ?? []).some(
      (r) => r.stableKey === input.stableKey,
    )
  )
    return world;
  const current =
    input.rule === "germaneness"
      ? germanenessRule(world, input.pack, input.chamberKey)
      : amendmentAccessRule(world, input.pack, input.chamberKey);
  if (current.route === "constitution" || current.route === "joint-rule")
    throw new Error(
      `A rules vote in one chamber cannot change a rule held by ${current.route === "constitution" ? "the constitution" : "a joint rule"} (${current.citation}).`,
    );
  const chamberName =
    input.pack.chambers.find((c) => c.chamberKey === input.chamberKey)?.name ??
    input.chamberKey;
  const eventStableKey = `event:${input.stableKey}`;
  let next = recordWorldEvent(world, {
    stableKey: eventStableKey,
    type: "legislation.chamber-rule-changed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.jurisdictionId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "legislation.chamber-rules"],
    summary: `The ${chamberName} changed its ${input.rule} rule to ${input.value}.`,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label:
          world.jurisdictions[input.jurisdictionId]?.name ?? "jurisdiction",
        setting: null,
      },
      socialContext: input.rationale,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.find(
    (candidate) => candidate.stableKey === eventStableKey,
  );
  if (!event) throw new Error("Failed to record the chamber rule change.");
  const record: ChamberRuleChangeRecord = {
    id: createStableId("chamber-rule-change", input.stableKey),
    stableKey: input.stableKey,
    sequence: next.history.nextSequence,
    rulePackId: input.pack.packId,
    chamberKey: input.chamberKey,
    rule: input.rule,
    value: input.value,
    adoptedAt: next.currentDate,
    adoptedByVoteId: input.adoptedByVoteId,
    rationale: input.rationale,
    eventId: event.id,
  };
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      chamberRuleChanges: [...(next.history.chamberRuleChanges ?? []), record],
    },
  };
  return next;
}

/**
 * Whether members may offer amendments on the floor at this stage: only
 * where the pack reads both the chamber's rule and the stage's as allowing
 * them. The legislative record refuses an amendment under a rule the pack
 * has not resolved, so an unread rule offers none; the pack, not this
 * reader, is where an estimate from the average would go.
 */
export function floorStageTakesAmendments(
  chamber: ChamberRule,
  stage: FloorStageRule,
): boolean {
  const chamberRule = chamber.amendments.floorAmendmentsAllowed;
  return (
    chamberRule.kind === "known" &&
    chamberRule.value &&
    stage.amendable.kind === "known" &&
    stage.amendable.value
  );
}
