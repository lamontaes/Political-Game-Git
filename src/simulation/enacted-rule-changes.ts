/**
 * Enacted rule changes — a law passed in the game changing a rule the game
 * reads.
 *
 * Before this, the institutional rules the game consults (how many seats a
 * chamber has, how long a term runs, how old a candidate must be) were compiled
 * constants. A legislature could pass a bill that moved money — taxes, transit
 * appropriations, program spending — but nothing it passed could change who may
 * stand, how long they serve or how big the body is. A state constitutional
 * amendment could change exactly one thing: the vote needed to propose the next
 * amendment.
 *
 * This module is the one place those laws land. Two producers feed it:
 *
 * - an ordinary statute, through a rule-change provision filed on the measure
 *   before it is enacted (`fileRuleChangeProvision`), operative from the
 *   enactment's effective date, else its state's effective-date rule, or the
 *   blanket default where that rule does not date the act;
 * - a constitutional amendment carrying a `rule-field` delta
 *   (`ConstitutionalRuleDelta`), operative from its ratified operative date.
 *
 * One reader serves every consumer (`enactedRuleChangeAt`), and the
 * rules-capability resolver overlays it when handed a World, so every system
 * that already reads rules through that resolver or the nationwide port picks
 * an enacted change up without its own override store.
 *
 * Nothing is stored as "the current rule". The operative value is derived from
 * the provision and the enactment each time it is read, so a save carries only
 * what happened, and a bill that never becomes law never changes anything.
 */

import { constitutionalPosition } from "./constitutional-process";
import { isLawEffectStamp, type LawEffectStamp } from "./law-effect-stamp";
import type { LawAmountUnit } from "./law-consequence-types";
import { organizationProfileAt } from "./life-queries";
import { measureAnswersAt } from "./vote-bundle";
import { addDays } from "./dates";
import { createStableId } from "./ids";
import {
  stateStatuteOperativeAt,
  statuteEffectiveDateEstimated,
  type StatuteDateContext,
} from "./governing/statute-effective-date";
import { recordedSessionAdjournment } from "./governing/session-adjournments";
import { requireMeasure } from "./legislation";
import { lawLevelRank, type LawLevel } from "./law-hierarchy";
import { rulePackById } from "./legislature-rule-packs";
import { FEDERAL_COURTS_PROJECTION } from "./judiciary/generated/federal-courts";
import type { MunicipalRecallDoctrine } from "./municipal-election-rules";
import {
  describeElectionDateRule,
  isElectionDateRule,
  type ElectionDateRule,
} from "./nominations/date-rules";
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  LegislativeEnactmentRecord,
  World,
} from "./types";

/**
 * The rules a law in the game can change today, with the bounds a value must
 * sit inside. The bounds are game bounds that keep a value playable (a chamber
 * of zero seats, a term of forty years), not a statement of what any real
 * legislature could lawfully enact.
 *
 * Which instrument a real state requires for each (statute or constitutional
 * amendment) is NOT compiled. Blanket rule meanwhile: either instrument may
 * change any of these, and the record keeps which one did.
 */
export const AMENDABLE_RULE_FIELDS = {
  "body.seats": { kind: "integer", min: 1, max: 1000, family: "legislature" },
  "term.years": { kind: "integer", min: 1, max: 10, family: "legislature" },
  "qualification.minimumAge": {
    kind: "integer",
    min: 18,
    max: 100,
    family: "legislature",
  },
  "qualification.stateResidenceYears": {
    kind: "integer",
    min: 0,
    max: 30,
    family: "legislature",
  },
  "qualification.districtResidenceYears": {
    kind: "integer",
    min: 0,
    max: 30,
    family: "legislature",
  },
  /** A chief executive's term length. Read by the executive-term consumer. */
  "executive.term.years": {
    kind: "integer",
    min: 1,
    max: 10,
    family: "executive",
  },
  /**
   * A chief executive's term limit: a `TermLimitRule`, or null for "no limit".
   * Read by the executive-term consumer, which owns what the limit means.
   */
  "executive.term.limit": { kind: "term-limit", family: "executive" },
  /**
   * Whether and how a state lets its towns' voters recall an official, as a
   * `MunicipalRecallDoctrine`. The office key is the state's municipal law,
   * `us-xx-municipal-law`. Read by `recall.ts` through the municipal rule
   * resolver, which draws a petition window where the new law is silent.
   */
  "municipal.recall.doctrine": {
    kind: "choice",
    options: [
      "two-question-standalone",
      "simultaneous-incumbent-replacement",
      "yes-no-retention",
      "judicial-cause-removal-trial",
      "prohibited",
    ] satisfies readonly MunicipalRecallDoctrine[],
    family: "municipal",
  },
  /**
   * A state's basic minimum wage, in cents an hour. The office key is the
   * state's labor law, `us-xx-labor-law`. Read by town pay, which never pays
   * below the higher of this and the federal minimum.
   */
  "labor.minimumWage.hourlyCents": {
    kind: "integer",
    min: 0,
    max: 100_000,
    family: "labor",
  },
  /**
   * How many judges a court has. The office key is the court's own id
   * (`us-supreme-court`, `ca9`, `us-ky:highest_court`, `dc-court-of-appeals`).
   * Congress sets the size of the federal courts; a state sets its own. Read
   * by `judiciary/court-size-law.ts`, which opens new seats and retires only
   * empty ones: a smaller court shrinks as judges leave, as in 1866. The
   * bounds are game bounds; a real court has had from 1 to 15 or so seats.
   */
  "court.seats": { kind: "integer", min: 1, max: 99, family: "judiciary" },
  /**
   * How every state's U.S. senators are chosen. The office key is the Senate,
   * `us-senate`. The Seventeenth Amendment (1913) has the people of each
   * state elect them; before it, Article I, section 3 had each state's
   * legislature choose. Only a federal constitutional amendment changes it.
   * Read by `governing/senate-selection.ts`, which Congress turnover and
   * Senate vacancies consult.
   */
  "senate.selection": {
    kind: "choice",
    options: ["popular-vote", "state-legislature"],
    family: "senate",
  },
  /**
   * What a state pays its governor, in whole dollars a year. The office key is
   * the state's pay law, `us-xx-office-pay-law`. Read by office salaries
   * (`office-pay.ts`), which pay the published salary until a law sets one.
   */
  "pay.governor.annualDollars": {
    kind: "integer",
    min: 0,
    max: 10_000_000,
    family: "pay",
  },
  /**
   * What a state pays each member of its legislature, in whole dollars a year.
   * One figure for both chambers: the salary tables the game holds give one.
   * Office key `us-xx-office-pay-law`.
   */
  "pay.stateLegislator.annualDollars": {
    kind: "integer",
    min: 0,
    max: 10_000_000,
    family: "pay",
  },
  /**
   * What a state pays a trial court judge, in whole dollars a year. Office key
   * `us-xx-office-pay-law`. NOT MODELED: other courts; the game records no
   * court level yet.
   */
  "pay.trialJudge.annualDollars": {
    kind: "integer",
    min: 0,
    max: 10_000_000,
    family: "pay",
  },
  /**
   * The day a state's parties hold their nominating primary, as an
   * `ElectionDateRule`. The office key is the state's election law,
   * `us-xx-election-law`. Read by the nomination stage
   * (`nominations/nomination-rules.ts`) for every partisan office it runs.
   */
  "nomination.primary.dateRule": { kind: "date-rule", family: "election" },
  /**
   * How a state's parties choose their general-election candidates: each
   * party's own primary, an all-party primary that sends the top two or four
   * on, or an all-party primary a majority wins outright. Office key
   * `us-xx-election-law`.
   */
  "nomination.method": {
    kind: "choice",
    options: [
      "party-primary",
      "top-two",
      "top-four",
      "all-party-majority",
    ] satisfies readonly NominationMethodChoice[],
    family: "election",
  },
} as const;

/** The office key the rule for choosing senators is recorded under. */
export const SENATE_SELECTION_OFFICE_KEY = "us-senate";

/** The nomination methods a law can choose among. */
export type NominationMethodChoice =
  "party-primary" | "top-two" | "top-four" | "all-party-majority";

/** The office key a state's election law is recorded under. */
export function electionLawOfficeKey(stateUsps: string): string {
  return `us-${stateUsps.toLowerCase()}-election-law`;
}

/** The office key a state's law on its towns is recorded under. */
export function municipalLawOfficeKey(stateUsps: string): string {
  return `us-${stateUsps.toLowerCase()}-municipal-law`;
}

/** The office key a state's labor law is recorded under. */
export function laborLawOfficeKey(stateUsps: string): string {
  return `us-${stateUsps.toLowerCase()}-labor-law`;
}

/** The office key a state's law on what its officials are paid is recorded under. */
export function officePayLawOfficeKey(stateUsps: string): string {
  return `us-${stateUsps.toLowerCase()}-office-pay-law`;
}

/** A term limit as a law states it; null in any part means the law is silent on it. */
export interface TermLimitRule {
  readonly maxConsecutiveTerms: number | null;
  readonly maxLifetimeTerms: number | null;
  readonly lookbackYears: number | null;
}

/**
 * A whole number for most rules; a term limit or null ("no limit") for one;
 * one of a fixed set of named choices for a choice rule.
 */
export type RuleChangeValue =
  number | TermLimitRule | ElectionDateRule | string | null;

/**
 * Whom a change reaches, as the law says. Null in either part means the law
 * is silent; the consumer that owns the rule decides the default.
 */
export interface RuleChangeApplicability {
  readonly appliesTo: "terms-beginning-after" | "immediately" | null;
  readonly countsPriorService: boolean | null;
}

export type AmendableRuleField = keyof typeof AMENDABLE_RULE_FIELDS;

/**
 * Rule fields a law cannot change YET, each with why. A law aimed at one of
 * these is refused with this reason rather than recorded as though it acted.
 */
export const NOT_YET_AMENDABLE_RULE_FIELDS: Readonly<Record<string, string>> = {
  "term.start":
    "A term's commencement is a date rule with several shapes; enacting a new one is not modeled yet.",
  "term.expiry":
    "A term's end follows from its length and start; change the length instead.",
  "election.date":
    "The game has no compiled state election calendar to amend; elections run on the game's own calendar.",
  "election.cycle":
    "The game has no compiled state election calendar to amend; elections run on the game's own calendar.",
  "institution.form":
    "Changing the form of a legislature (for example to unicameral) is not modeled yet.",
  "ordinance.passage":
    "Local ordinance procedure is changed by charter, and charter changes are not routed here yet.",
  "ordinance.introductionToPassage":
    "Local ordinance procedure is changed by charter, and charter changes are not routed here yet.",
  "ordinance.effective":
    "Local ordinance procedure is changed by charter, and charter changes are not routed here yet.",
  "finance.appropriationVote":
    "Local appropriation votes are changed by charter, and charter changes are not routed here yet.",
};

const AMENDABLE_RULE_FIELD_LABELS: Readonly<
  Record<AmendableRuleField, string>
> = {
  "body.seats": "the number of seats",
  "term.years": "the length of a term in years",
  "qualification.minimumAge": "the minimum age to serve",
  "qualification.stateResidenceYears":
    "the years of state residence required to serve",
  "qualification.districtResidenceYears":
    "the years of district residence required to serve",
  "executive.term.years": "the length of the chief executive's term in years",
  "executive.term.limit": "the chief executive's term limit",
  "municipal.recall.doctrine": "how towns' voters may recall an official",
  "labor.minimumWage.hourlyCents": "state minimum wage",
  "court.seats": "the number of judges on the court",
  "senate.selection": "how each state's U.S. senators are chosen",
  "pay.governor.annualDollars": "the governor's salary",
  "pay.stateLegislator.annualDollars": "a state legislator's salary",
  "pay.trialJudge.annualDollars": "a trial court judge's salary",
  "nomination.primary.dateRule": "the day of the party primary",
  "nomination.method": "how parties choose their candidates",
};

const CHOICE_WORDS: Readonly<Record<string, string>> = {
  "two-question-standalone":
    "a recall vote with the replacement chosen on the same ballot",
  "simultaneous-incumbent-replacement":
    "a recall race in which the official runs against challengers",
  "yes-no-retention": "a keep-or-remove recall vote",
  "judicial-cause-removal-trial":
    "removal by a court for cause, with no recall vote",
  prohibited: "no recall of town officials",
  "popular-vote": "election by the people of each state",
  "state-legislature": "election by each state's legislature",
  "party-primary": "a primary for each party",
  "top-two": "one primary for all candidates, with the top two going on",
  "top-four": "one primary for all candidates, with the top four going on",
  "all-party-majority":
    "one primary for all candidates, won outright by a majority",
};

/** Plain words for a changed value, for a player-facing sentence. */
export function describeRuleChangeValue(
  value: RuleChangeValue,
  field?: AmendableRuleField,
): string {
  if (field === "labor.minimumWage.hourlyCents" && typeof value === "number")
    return `$${(value / 100).toFixed(2)} an hour`;
  if (field?.startsWith("pay.") && typeof value === "number")
    return `$${value.toLocaleString("en-US")} a year`;
  if (value === null) return "no limit";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return CHOICE_WORDS[value] ?? value;
  if (isElectionDateRule(value)) return describeElectionDateRule(value);
  const parts = [
    value.maxConsecutiveTerms === null
      ? null
      : `${value.maxConsecutiveTerms} consecutive terms`,
    value.maxLifetimeTerms === null
      ? null
      : `${value.maxLifetimeTerms} terms in a lifetime`,
    value.lookbackYears === null
      ? null
      : `counted over ${value.lookbackYears} years`,
  ].filter((part): part is string => part !== null);
  return parts.length ? parts.join(", ") : "no limit";
}

/** Plain words for a rule a law can change, for a player-facing sentence. */
export function amendableRuleFieldLabel(field: AmendableRuleField): string {
  return AMENDABLE_RULE_FIELD_LABELS[field];
}

/** Whether the date the state's effective-date rule gives an act enacted on
 * `enactedAt` was read or rests on an estimate (the rule, or the session end
 * it counts from). */
export function stateRuleBasis(
  jurisdictionKey: string,
  enactedAt: IsoDate,
  context: StatuteDateContext = {},
): "state-rule" | "estimated-state-rule" {
  return statuteEffectiveDateEstimated(jurisdictionKey, enactedAt, context)
    ? "estimated-state-rule"
    : "state-rule";
}

/**
 * The blanket effective date for a statute whose state's effective-date rule
 * does not date it, such as an act of a special session
 * (`governing/statute-effective-date.ts`): ninety days after the act is recorded. Ninety days is the most
 * common default among the states the game has read (Alaska, Missouri, Ohio);
 * it is a game profile, not a claim about any other state's law.
 */
export const STATUTE_EFFECTIVE_DEFAULT_DAYS = 90;

/**
 * The dates an act's record carries that a state's effective-date rule may
 * count from: the final passage its enactment recorded, and the day its
 * legislature's leaders adjourned the session, where they did.
 */
export function enactmentStatuteDateContext(
  world: World,
  enactment: LegislativeEnactmentRecord,
): StatuteDateContext {
  return {
    finalPassageAt: () => enactment.finalPassageAt ?? null,
    sessionEnds: (year) => {
      const measure = (world.history.legislativeMeasures ?? []).find(
        (row) => row.id === enactment.measureId,
      );
      const adjourned = measure
        ? recordedSessionAdjournment(world, measure.rulePackId, year)
        : null;
      return adjourned ? [adjourned.adjournedOn] : null;
    },
  };
}

export function isAmendableRuleField(
  field: string,
): field is AmendableRuleField {
  return Object.hasOwn(AMENDABLE_RULE_FIELDS, field);
}

/** A clause of an ordinary bill that changes one rule if the bill becomes law. */
export interface RuleChangeProvisionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly stateUsps: string;
  /** The office or chamber the rule belongs to, in rules-capability form. */
  readonly officeKey: string;
  readonly field: AmendableRuleField;
  readonly value: RuleChangeValue;
  /** Absent on records written before applicability existed: silent. */
  readonly applicability?: RuleChangeApplicability;
  readonly filedAt: IsoDate;
}

interface InstitutionBindingBase {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly officeKey: string;
  readonly jurisdictionId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly sourceRecordIds: readonly EntityId[];
}

/** Written by the actual office producer, never inferred from names or IDs. */
export interface InstitutionOfficeBindingRecord extends InstitutionBindingBase {
  readonly kind: "office-organization";
  readonly organizationId: EntityId;
  readonly supersedesBindingId: EntityId | null;
}

/** Application attribution is separate: the original filed rule is immutable. */
export interface RuleChangeLawBindingRecord extends InstitutionBindingBase {
  readonly kind: "law-application";
  readonly ruleChangeProvisionId: EntityId;
  readonly officeBindingId: EntityId;
  readonly bodyOrganizationId: EntityId;
  readonly measureId: EntityId;
  readonly rowId: string;
  readonly questionKey: string;
  readonly provisionId: EntityId;
  readonly provisionKey: string;
  readonly enactmentId: EntityId;
  readonly unit: LawAmountUnit;
  readonly lawEffectStamps: readonly LawEffectStamp[];
}

/** Both dated relations are append-only members of one owned binding family. */
export type RuleChangeConsequenceBindingRecord =
  InstitutionOfficeBindingRecord | RuleChangeLawBindingRecord;

export function ruleChangeConsequenceBindingHistoryRecords(
  world: World,
): readonly RuleChangeConsequenceBindingRecord[] {
  return world.history.ruleChangeConsequenceBindings ?? [];
}

/** No organization fallback: missing and ambiguous recorded identity are explicit. */
export function institutionOfficeBindingAt(
  world: World,
  officeKey: string,
  jurisdictionId: EntityId,
  cutoff: HistoricalCutoff,
): InstitutionOfficeBindingRecord | null {
  if (
    cutoff.asOfDate > world.currentDate ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  )
    throw new Error("Institution identity cutoff is outside saved history");
  const available = ruleChangeConsequenceBindingHistoryRecords(world).filter(
    (record): record is InstitutionOfficeBindingRecord =>
      record.kind === "office-organization" &&
      record.officeKey === officeKey &&
      record.jurisdictionId === jurisdictionId &&
      record.sequence < cutoff.historySequenceExclusive &&
      record.recordedAt <= cutoff.asOfDate &&
      record.effectiveAt <= cutoff.asOfDate,
  );
  const superseded = new Set(
    available.flatMap((record) =>
      record.supersedesBindingId ? [record.supersedesBindingId] : [],
    ),
  );
  const current = available.filter((record) => !superseded.has(record.id));
  if (current.length > 1)
    throw new Error("Ambiguous recorded institution identity");
  return current[0] ?? null;
}

export function institutionRuleAmountUnit(field: string): LawAmountUnit | null {
  if (field === "body.seats" || field === "court.seats") return "count";
  if (
    [
      "term.years",
      "executive.term.years",
      "qualification.minimumAge",
      "qualification.stateResidenceYears",
      "qualification.districtResidenceYears",
    ].includes(field)
  )
    return "years";
  return null;
}

function assertInstitutionOfficeBinding(
  world: World,
  record: InstitutionOfficeBindingRecord,
): void {
  const cutoff = {
    asOfDate: record.recordedAt,
    historySequenceExclusive: record.sequence,
  };
  const organization = world.history.organizations.find(
    (entry) => entry.id === record.organizationId,
  );
  const profile = organizationProfileAt(world, record.organizationId, cutoff);
  if (
    !record.officeKey.trim() ||
    !world.jurisdictions[record.jurisdictionId] ||
    record.effectiveAt > record.recordedAt ||
    !organization ||
    organization.sequence >= record.sequence ||
    organization.formedAt > record.effectiveAt ||
    !profile ||
    profile.closed ||
    profile.locationJurisdictionId !== record.jurisdictionId ||
    ![record.organizationId, profile.id, record.jurisdictionId].every((id) =>
      record.sourceRecordIds.includes(id),
    )
  )
    throw new Error(
      "Institution identity requires its actual saved organization, place and profile sources",
    );
  const previous = institutionOfficeBindingAt(
    world,
    record.officeKey,
    record.jurisdictionId,
    cutoff,
  );
  if ((previous?.id ?? null) !== record.supersedesBindingId)
    throw new Error(
      "Institution identity must supersede the unique recorded prior relation",
    );
}

function assertRuleChangeLawBinding(
  world: World,
  binding: RuleChangeLawBindingRecord,
): void {
  const clause = ruleChangeProvisionHistoryRecords(world).find(
    (record) => record.id === binding.ruleChangeProvisionId,
  );
  const cutoff = {
    asOfDate: binding.recordedAt,
    historySequenceExclusive: binding.sequence,
  };
  const office = institutionOfficeBindingAt(
    world,
    binding.officeKey,
    binding.jurisdictionId,
    cutoff,
  );
  if (
    !clause ||
    clause.sequence >= binding.sequence ||
    clause.measureId !== binding.measureId ||
    clause.officeKey !== binding.officeKey ||
    !office ||
    office.id !== binding.officeBindingId ||
    office.organizationId !== binding.bodyOrganizationId
  )
    throw new Error(
      "Institution application requires the original rule and actual dated office identity",
    );
  const enactment = world.history.legislativeEnactments?.find(
    (record) =>
      record.id === binding.enactmentId &&
      record.measureId === clause.measureId &&
      record.outcome === "enacted",
  );
  if (
    !enactment ||
    enactment.sequence >= binding.sequence ||
    !enactment.effectiveAt ||
    enactment.resolvedAt > binding.effectiveAt ||
    enactment.effectiveAt > binding.effectiveAt ||
    binding.effectiveAt > binding.recordedAt
  )
    throw new Error(
      "Institution application requires an actual operative enactment",
    );
  if (
    !measureAnswersAt(world, clause.measureId, enactment.sequence).some(
      (answer) =>
        world.policyCatalog.propositions[answer.propositionId]?.stableKey ===
        binding.questionKey,
    )
  )
    throw new Error(
      "Institution application question was not adopted by this law",
    );
  const versions = (world.history.legislativeProvisions ?? []).filter(
    (record) =>
      record.measureId === clause.measureId &&
      record.sequence <= enactment.sequence &&
      record.recordedAt <= binding.recordedAt,
  );
  const superseded = new Set(
    versions.flatMap((record) =>
      record.supersedesProvisionId ? [record.supersedesProvisionId] : [],
    ),
  );
  const final = versions.filter((record) => !superseded.has(record.id));
  const matches = final.flatMap((record) =>
    record.applicationScope.segmentKey === null
      ? (record.lawTerms ?? [])
          .filter(
            (term) =>
              term.questionKey === binding.questionKey &&
              term.key === clause.field,
          )
          .map((term) => ({ record, term }))
      : [],
  );
  if (
    matches.length !== 1 ||
    matches[0]!.record.id !== binding.provisionId ||
    matches[0]!.record.provisionKey !== binding.provisionKey ||
    matches[0]!.term.value !== clause.value ||
    matches[0]!.term.unit !== binding.unit ||
    institutionRuleAmountUnit(clause.field) !== binding.unit
  )
    throw new Error(
      "Institution application must agree with one final adopted typed term",
    );
  const required = [
    clause.id,
    clause.measureId,
    enactment.id,
    binding.provisionId,
    binding.jurisdictionId,
    office.id,
    binding.bodyOrganizationId,
    ...office.sourceRecordIds,
  ];
  const stamp = binding.lawEffectStamps[0];
  if (
    !binding.rowId ||
    !binding.questionKey ||
    !required.every((id) => binding.sourceRecordIds.includes(id)) ||
    binding.lawEffectStamps.length !== 1 ||
    !isLawEffectStamp(stamp) ||
    stamp.source !== "enacted" ||
    stamp.effectKind !== "institution-rule" ||
    stamp.governingLawKey !== clause.measureId ||
    stamp.questionKey !== binding.questionKey ||
    stamp.jurisdictionId !== binding.jurisdictionId ||
    stamp.operativeAt !== enactment.effectiveAt ||
    stamp.appliedAt !== binding.effectiveAt ||
    !required.every((id) => stamp.sourceRecordIds?.includes(id))
  )
    throw new Error(
      "Institution application stamp is missing its actual saved source chain",
    );
}

type InstitutionBindingInput =
  | Omit<InstitutionOfficeBindingRecord, "id" | "sequence" | "recordedAt">
  | Omit<RuleChangeLawBindingRecord, "id" | "sequence" | "recordedAt">;

function appendInstitutionBinding(
  world: World,
  input: InstitutionBindingInput,
): World {
  const existing = ruleChangeConsequenceBindingHistoryRecords(world);
  const prior = existing.find((record) => record.stableKey === input.stableKey);
  if (prior) {
    if (
      JSON.stringify(prior) ===
      JSON.stringify({
        ...input,
        id: prior.id,
        sequence: prior.sequence,
        recordedAt: prior.recordedAt,
      })
    )
      return world;
    throw new Error(
      "Institution binding key already records another consequence",
    );
  }
  const record = {
    ...structuredClone(input),
    id: createStableId(
      "rule-change-consequence-binding",
      `${world.id}:${input.stableKey}`,
    ),
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
  } as RuleChangeConsequenceBindingRecord;
  if (record.kind === "office-organization")
    assertInstitutionOfficeBinding(world, record);
  else assertRuleChangeLawBinding(world, record);
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      ruleChangeConsequenceBindings: [...existing, record],
    },
  };
}

export function recordInstitutionOfficeBinding(
  world: World,
  input: Omit<
    InstitutionOfficeBindingRecord,
    "id" | "sequence" | "recordedAt" | "kind"
  >,
): World {
  return appendInstitutionBinding(world, {
    ...input,
    kind: "office-organization",
  });
}

export function recordRuleChangeLawBinding(
  world: World,
  input: Omit<
    RuleChangeLawBindingRecord,
    "id" | "sequence" | "recordedAt" | "kind"
  >,
): World {
  if (
    ruleChangeConsequenceBindingHistoryRecords(world).some(
      (record) =>
        record.kind === "law-application" &&
        record.rowId === input.rowId &&
        record.ruleChangeProvisionId === input.ruleChangeProvisionId &&
        record.enactmentId === input.enactmentId,
    )
  )
    return world;
  return appendInstitutionBinding(world, { ...input, kind: "law-application" });
}

/** An operative-dated change, derived from what was enacted. */
export interface EnactedRuleChange {
  /** The state's postal code, or `US` for a federal amendment. */
  readonly stateUsps: string;
  /** `US-` plus the postal code, as jurisdictions are keyed elsewhere; `US` for a federal amendment. */
  readonly jurisdictionKey: string;
  readonly officeKey: string;
  readonly field: AmendableRuleField;
  readonly value: RuleChangeValue;
  readonly applicability: RuleChangeApplicability;
  readonly operativeAt: IsoDate;
  /**
   * `enacted-date` when the law's own record dates it; `state-rule` when the
   * state's own effective-date rule dates it; `game-default` when that rule is
   * not researched and the blanket rule applied.
   */
  readonly operativeBasis:
    "enacted-date" | "state-rule" | "estimated-state-rule" | "game-default";
  readonly instrument: "statute" | "constitutional-amendment";
  /** Where the law ranks; see `law-hierarchy.ts`. */
  readonly level: LawLevel;
  readonly measureId: EntityId;
  readonly designation: string;
  /**
   * Orders two changes of one instrument operative on the same day: the later
   * record wins (the enactment for a statute, the proposal for an amendment).
   */
  readonly sequence: number;
}

const SILENT: RuleChangeApplicability = {
  appliesTo: null,
  countsPriorService: null,
};

function wholeOrNull(value: unknown, min: number): boolean {
  return (
    value === null ||
    (typeof value === "number" && Number.isInteger(value) && value >= min)
  );
}

export function assertAmendableRuleValue(
  field: string,
  value: RuleChangeValue,
  officeKey: string | null,
  applicability?: RuleChangeApplicability,
): asserts field is AmendableRuleField {
  if (!isAmendableRuleField(field)) {
    throw new Error(
      NOT_YET_AMENDABLE_RULE_FIELDS[field] ??
        `"${field}" is not a rule the game reads.`,
    );
  }
  const spec = AMENDABLE_RULE_FIELDS[field];
  if (spec.kind === "integer") {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < spec.min ||
      value > spec.max
    ) {
      throw new Error(
        `${field} must be a whole number from ${spec.min} to ${spec.max}.`,
      );
    }
  } else if (spec.kind === "date-rule") {
    if (!isElectionDateRule(value) || value.kind === "days-after-primary") {
      throw new Error(`${field} must be a date rule the game can read.`);
    }
  } else if (spec.kind === "choice") {
    if (
      typeof value !== "string" ||
      !(spec.options as readonly string[]).includes(value)
    ) {
      throw new Error(`${field} must be one of: ${spec.options.join(", ")}.`);
    }
  } else if (value !== null) {
    const keys =
      typeof value === "object" ? Object.keys(value).sort().join(",") : "";
    if (
      typeof value !== "object" ||
      !("maxConsecutiveTerms" in value) ||
      keys !== "lookbackYears,maxConsecutiveTerms,maxLifetimeTerms" ||
      !wholeOrNull(value.maxConsecutiveTerms, 1) ||
      !wholeOrNull(value.maxLifetimeTerms, 1) ||
      !wholeOrNull(value.lookbackYears, 1) ||
      (value.maxConsecutiveTerms === null && value.maxLifetimeTerms === null)
    ) {
      throw new Error(
        `${field} must be null (no limit) or a limit naming consecutive or lifetime terms as whole numbers.`,
      );
    }
  }
  if (!officeKey?.trim()) {
    throw new Error(
      `${field} belongs to an office or chamber; none was named.`,
    );
  }
  if (applicability) {
    if (
      ![null, "terms-beginning-after", "immediately"].includes(
        applicability.appliesTo,
      ) ||
      ![null, true, false].includes(applicability.countsPriorService) ||
      Object.keys(applicability).length !== 2
    ) {
      throw new Error("A change's applicability is not one the game reads.");
    }
  }
}

/**
 * Whether an office key belongs to this state. A legislative rule names a
 * chamber of the state's own rule pack. NOT MODELED: a registry of executive
 * offices this module can check against without depending on the executive
 * consumer. Blanket rule meanwhile: an executive office key must carry the
 * state's own prefix (`us-nh-governor`, `dc-mayor`).
 */
function officeBelongsToState(
  field: AmendableRuleField,
  officeKey: string,
  stateUsps: string,
  rulePackId: string | null,
): boolean {
  const lower = stateUsps.toLowerCase();
  if (AMENDABLE_RULE_FIELDS[field].family === "judiciary") {
    // Congress reaches the federal courts and nothing else; a state reaches
    // only its own courts.
    if (stateUsps === FEDERAL_JURISDICTION_KEY)
      return FEDERAL_COURT_IDS.has(officeKey);
    return (
      officeKey.startsWith(`us-${lower}:`) || officeKey.startsWith(`${lower}-`)
    );
  }
  // No state's own law reaches how the Senate is chosen.
  if (AMENDABLE_RULE_FIELDS[field].family === "senate") return false;
  if (AMENDABLE_RULE_FIELDS[field].family === "legislature" && rulePackId) {
    // A statute names a chamber its own legislature actually has.
    const [packId, chamberKey] = officeKey.split(":");
    return (
      packId === rulePackId &&
      rulePackById(rulePackId).chambers.some(
        (chamber) => chamber.chamberKey === chamberKey,
      )
    );
  }
  // NOT MODELED: a registry of every state's offices (a state with no
  // compiled legislature has no chamber list to check). Blanket rule: the
  // key must carry the state's own prefix, so no law reaches another state.
  return (
    officeKey.startsWith(`us-${lower}-`) || officeKey.startsWith(`${lower}-`)
  );
}

function stateUspsForPack(
  rulePackId: string,
  field?: AmendableRuleField,
): string | null {
  const key = rulePackById(rulePackId).jurisdictionKey;
  // A Congress bill can change a rule of the federal government's own; the
  // only such rule routed here is the size of a federal court.
  if (
    key === FEDERAL_JURISDICTION_KEY &&
    field !== undefined &&
    AMENDABLE_RULE_FIELDS[field].family === "judiciary"
  )
    return FEDERAL_JURISDICTION_KEY;
  return /^US-[A-Z]{2}$/.test(key) ? key.slice(3) : null;
}

/** Every federal court a Congress bill can resize. */
const FEDERAL_COURT_IDS: ReadonlySet<string> = new Set([
  "us-supreme-court",
  ...FEDERAL_COURTS_PROJECTION.map((court) => court.courtId),
]);

/**
 * Whether a statute may change this court's size, by the route the court's
 * rules record. A court whose size its constitution fixes changes only by
 * constitutional amendment; an unknown route does not block (it is recorded
 * with the change, and the court's writer applies it).
 */
function statuteMayResizeCourt(world: World, courtId: string): boolean {
  const route = world.judiciary?.courts[courtId]?.rules.amendmentRoute;
  return !(route?.state === "known" && route.value === "constitution");
}

/**
 * The first recorded vote of a whole chamber or joint session on a bill. A
 * committee vote does not close the text; a floor vote does. NOT MODELED: a
 * rule-change clause offered as a floor amendment. Blanket rule meanwhile:
 * clauses are filed before the first floor vote or not at all.
 */
function firstFloorVoteSequence(
  world: World,
  measureId: EntityId,
): number | null {
  const floor = (world.history.legislativeVotes ?? []).filter(
    (vote) => vote.measureId === measureId && vote.forum.kind !== "committee",
  );
  return floor.length ? Math.min(...floor.map((vote) => vote.sequence)) : null;
}

export function ruleChangeProvisionHistoryRecords(
  world: World,
): readonly RuleChangeProvisionRecord[] {
  return world.history.ruleChangeProvisions ?? [];
}

/**
 * File a rule change on an ordinary bill. It changes nothing until the bill is
 * enacted and its effective date arrives.
 */
export function fileRuleChangeProvision(
  world: World,
  input: {
    readonly stableKey: string;
    readonly measureId: EntityId;
    readonly officeKey: string;
    readonly field: string;
    readonly value: RuleChangeValue;
    readonly applicability?: RuleChangeApplicability;
  },
): World {
  const measure = requireMeasure(world, input.measureId);
  assertAmendableRuleValue(
    input.field,
    input.value,
    input.officeKey,
    input.applicability,
  );
  if (AMENDABLE_RULE_FIELDS[input.field].family === "senate")
    throw new Error(
      "How senators are chosen is set by the Seventeenth Amendment; only an amendment to the U.S. Constitution can change it.",
    );
  const stateUsps = stateUspsForPack(measure.rulePackId, input.field);
  if (!stateUsps) {
    // Local governments change these rules by charter, which is not routed
    // here yet; say so instead of recording a clause that could never act.
    throw new Error(
      "Only a state legislature's bill can change these rules yet; local charter changes are not modeled.",
    );
  }
  if (
    !officeBelongsToState(
      input.field,
      input.officeKey,
      stateUsps,
      measure.rulePackId,
    )
  ) {
    throw new Error(
      `A ${stateUsps} bill can only change rules for ${stateUsps}'s own offices.`,
    );
  }
  if (
    input.field === "court.seats" &&
    !statuteMayResizeCourt(world, input.officeKey)
  ) {
    throw new Error(
      "This court's size is set by its constitution; only a constitutional amendment can change it.",
    );
  }
  if (firstFloorVoteSequence(world, measure.id) !== null) {
    throw new Error(
      "A chamber has already voted on this bill; a clause added now would become law without a vote on it.",
    );
  }
  const existing = ruleChangeProvisionHistoryRecords(world);
  if (existing.some((row) => row.stableKey === input.stableKey)) {
    throw new Error("Rule change provision key already exists.");
  }
  if (
    existing.some(
      (row) =>
        row.measureId === measure.id &&
        row.officeKey === input.officeKey &&
        row.field === input.field,
    )
  ) {
    throw new Error("This bill already changes that rule for that office.");
  }
  const record: RuleChangeProvisionRecord = {
    id: createStableId(
      "rule-change-provision",
      `${world.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    measureId: measure.id,
    stateUsps,
    officeKey: input.officeKey,
    field: input.field,
    value: structuredClone(input.value),
    ...(input.applicability
      ? { applicability: { ...input.applicability } }
      : {}),
    filedAt: world.currentDate,
  };
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      ruleChangeProvisions: [...existing, record],
    },
  };
}

/** Every change a law has made, whether or not it is operative yet. */
export function enactedRuleChanges(world: World): readonly EnactedRuleChange[] {
  const changes: EnactedRuleChange[] = [];
  for (const provision of ruleChangeProvisionHistoryRecords(world)) {
    const enactment = (world.history.legislativeEnactments ?? []).find(
      (row) => row.measureId === provision.measureId,
    );
    if (!enactment || enactment.outcome !== "enacted") continue;
    // No caller in play passes an effective date, so an enactment's own date
    // is usually null, and a null date is not "effective now". The state's
    // own effective-date rule dates it where that rule is researched
    // (`statute-effective-date.ts`). Blanket rule elsewhere: the change
    // operates STATUTE_EFFECTIVE_DEFAULT_DAYS after the act was recorded, and
    // says so.
    const explicit = enactment.effectiveAt;
    const federal = provision.stateUsps === FEDERAL_JURISDICTION_KEY;
    const stateRuleAt =
      explicit || federal
        ? null
        : stateStatuteOperativeAt(
            `US-${provision.stateUsps}`,
            enactment.resolvedAt,
            enactmentStatuteDateContext(world, enactment),
          );
    changes.push({
      stateUsps: provision.stateUsps,
      jurisdictionKey: federal
        ? FEDERAL_JURISDICTION_KEY
        : `US-${provision.stateUsps}`,
      officeKey: provision.officeKey,
      field: provision.field,
      value: structuredClone(provision.value),
      applicability: { ...(provision.applicability ?? SILENT) },
      operativeAt:
        explicit ??
        stateRuleAt ??
        addDays(enactment.resolvedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS),
      operativeBasis: explicit
        ? "enacted-date"
        : stateRuleAt
          ? stateRuleBasis(
              `US-${provision.stateUsps}`,
              enactment.resolvedAt,
              enactmentStatuteDateContext(world, enactment),
            )
          : "game-default",
      instrument: "statute",
      level: federal ? "federal-statute" : "state-statute",
      measureId: provision.measureId,
      designation:
        enactment.actDesignation ??
        requireMeasure(world, provision.measureId).designation,
      sequence: enactment.sequence,
    });
  }
  for (const measure of world.history.constitutionalMeasures ?? []) {
    const delta = measure.ruleDelta;
    if (delta.kind !== "rule-field") continue;
    const federal = measure.jurisdictionKey === FEDERAL_JURISDICTION_KEY;
    const stateUsps = federal
      ? FEDERAL_JURISDICTION_KEY
      : constitutionalStateUsps(measure.jurisdictionKey);
    if (!stateUsps) continue;
    const position = constitutionalPosition(world, measure.id);
    if (!position.operativeAt) continue;
    changes.push({
      stateUsps,
      jurisdictionKey: federal ? FEDERAL_JURISDICTION_KEY : `US-${stateUsps}`,
      officeKey: delta.officeKey,
      field: delta.field,
      value: structuredClone(delta.value),
      applicability: { ...(delta.applicability ?? SILENT) },
      operativeAt: position.operativeAt,
      operativeBasis: "enacted-date",
      instrument: "constitutional-amendment",
      level: federal ? "federal-constitution" : "state-constitution",
      measureId: measure.id,
      designation: measure.designation,
      sequence: measure.sequence,
    });
  }
  return changes.sort(
    (a, b) =>
      a.operativeAt.localeCompare(b.operativeAt) || a.sequence - b.sequence,
  );
}

/**
 * The key federal constitutional changes carry in place of a state's postal
 * code, so one reader serves both: `ruleValueInWorld(world, { jurisdiction:
 * "US", ... })`.
 */
export const FEDERAL_JURISDICTION_KEY = "US";
/** National offices an Article V amendment can reach in the game. */
export const FEDERAL_AMENDABLE_OFFICES: readonly string[] = ["us-president"];

/** The state a constitutional process amends, when it amends a state's rules. */
export function constitutionalStateUsps(
  jurisdictionKey: string,
): string | null {
  return /^US-[A-Z]{2}$/.test(jurisdictionKey)
    ? jurisdictionKey.slice(3)
    : null;
}

/** The change in force for one rule on one date, or null for the compiled rule. */
export function enactedRuleChangeAt(
  world: World,
  query: {
    readonly stateUsps: string;
    readonly officeKey: string | null;
    readonly field: string;
    readonly onDate: IsoDate;
  },
): EnactedRuleChange | null {
  if (!query.officeKey || !isAmendableRuleField(query.field)) return null;
  const inForce = enactedRuleChanges(world).filter(
    (change) =>
      change.stateUsps === query.stateUsps &&
      change.officeKey === query.officeKey &&
      change.field === query.field &&
      change.operativeAt <= query.onDate,
  );
  return ruleChangeInForce(inForce);
}

/**
 * Of changes already in force for one rule, in operative order, the one that
 * governs: the highest level of law in force, and the latest law at that
 * level. A statute cannot override its state's constitution, whenever each
 * took effect. The blanket rules behind this (field preemption everywhere, no
 * rule delegated to statute) are listed in `law-hierarchy.ts`.
 */
export function ruleChangeInForce(
  inForce: readonly EnactedRuleChange[],
): EnactedRuleChange | null {
  if (inForce.length === 0) return null;
  const top = Math.max(...inForce.map((change) => lawLevelRank(change.level)));
  return (
    inForce.filter((change) => lawLevelRank(change.level) === top).at(-1) ??
    null
  );
}

/** A rule as this World's law has it, and where that value came from. */
export type RuleValueInWorld<T> =
  | { readonly source: "compiled"; readonly value: T }
  | {
      readonly source: "enacted";
      readonly value: RuleChangeValue;
      readonly measureId: EntityId;
      readonly designation: string;
      readonly effectiveAt: IsoDate;
      readonly operativeBasis: EnactedRuleChange["operativeBasis"];
      readonly instrument: EnactedRuleChange["instrument"];
      readonly level: LawLevel;
      readonly applicability: RuleChangeApplicability;
    };

/**
 * The value in force: an enacted change if one is operative on the date,
 * otherwise the compiled value the consumer supplies. Accepts the state as a
 * postal code or a `US-XX` jurisdiction key.
 */
export function ruleValueInWorld<T>(
  world: World,
  query: {
    readonly jurisdiction: string;
    readonly officeKey: string;
    readonly field: AmendableRuleField;
    readonly onDate: IsoDate;
  },
  compiled: T,
): RuleValueInWorld<T> {
  const stateUsps = query.jurisdiction.replace(/^US-/, "");
  const change = enactedRuleChangeAt(world, {
    stateUsps,
    officeKey: query.officeKey,
    field: query.field,
    onDate: query.onDate,
  });
  if (!change) return { source: "compiled", value: compiled };
  return {
    source: "enacted",
    value: structuredClone(change.value),
    measureId: change.measureId,
    designation: change.designation,
    effectiveAt: change.operativeAt,
    operativeBasis: change.operativeBasis,
    instrument: change.instrument,
    level: change.level,
    applicability: { ...change.applicability },
  };
}

export function assertRuleChangeProvisionIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const bindingKeys = new Set<string>();
  const appliedRules = new Set<string>();
  let lastBindingSequence = -1;
  for (const binding of ruleChangeConsequenceBindingHistoryRecords(world)) {
    if (
      ids.has(binding.id) ||
      bindingKeys.has(binding.stableKey) ||
      binding.sequence <= lastBindingSequence ||
      binding.sequence >= world.history.nextSequence ||
      binding.recordedAt > world.currentDate ||
      !binding.stableKey.trim() ||
      binding.id !==
        createStableId(
          "rule-change-consequence-binding",
          `${world.id}:${binding.stableKey}`,
        )
    )
      throw new Error(
        "Invalid append-only institution binding identity, date or sequence",
      );
    ids.add(binding.id);
    bindingKeys.add(binding.stableKey);
    lastBindingSequence = binding.sequence;
    if (binding.kind === "office-organization")
      assertInstitutionOfficeBinding(world, binding);
    else if (binding.kind === "law-application") {
      const key = `${binding.ruleChangeProvisionId}:${binding.rowId}:${binding.enactmentId}`;
      if (appliedRules.has(key))
        throw new Error("Institution rule application was recorded twice");
      appliedRules.add(key);
      assertRuleChangeLawBinding(world, binding);
    } else throw new Error("Unknown institution binding record kind");
  }
  const seenKeys = new Set<string>();
  const seenClauses = new Set<string>();
  let lastSequence = -1;
  for (const row of ruleChangeProvisionHistoryRecords(world)) {
    if (ids.has(row.id)) throw new Error("Duplicate rule change identity.");
    ids.add(row.id);
    if (seenKeys.has(row.stableKey))
      throw new Error("Duplicate rule change provision key.");
    seenKeys.add(row.stableKey);
    if (row.sequence <= lastSequence)
      throw new Error("Rule change provisions are out of sequence.");
    lastSequence = row.sequence;
    if (
      row.id !==
      createStableId("rule-change-provision", `${world.id}:${row.stableKey}`)
    )
      throw new Error("Rule change provision identity does not match its key.");
    const measure = requireMeasure(world, row.measureId);
    assertAmendableRuleValue(
      row.field,
      row.value,
      row.officeKey,
      row.applicability,
    );
    if (
      stateUspsForPack(measure.rulePackId, row.field) !== row.stateUsps ||
      !officeBelongsToState(
        row.field,
        row.officeKey,
        row.stateUsps,
        measure.rulePackId,
      )
    )
      throw new Error("Rule change provision names another government.");
    const clause = `${row.measureId}|${row.officeKey}|${row.field}`;
    if (seenClauses.has(clause))
      throw new Error("A bill changes the same rule twice.");
    seenClauses.add(clause);
    if (row.filedAt < measure.introducedAt || row.filedAt > world.currentDate)
      throw new Error("Rule change provision is dated outside its bill.");
    // A clause added after a chamber voted was never voted on by it.
    const floor = firstFloorVoteSequence(world, row.measureId);
    if (floor !== null && floor < row.sequence)
      throw new Error(
        "Rule change provision was added after a chamber voted on the bill.",
      );
  }
  for (const measure of world.history.constitutionalMeasures ?? []) {
    if (measure.ruleDelta.kind !== "rule-field") continue;
    assertConstitutionalRuleFieldDelta(
      measure.jurisdictionKey,
      measure.ruleDelta,
    );
  }
}

export function assertConstitutionalRuleFieldDelta(
  jurisdictionKey: string,
  delta: {
    readonly field: string;
    readonly value: RuleChangeValue;
    readonly officeKey: string;
    readonly applicability?: RuleChangeApplicability;
  },
): void {
  if (jurisdictionKey === FEDERAL_JURISDICTION_KEY) {
    // An amendment may fix a federal court's size in the Constitution itself,
    // as the "Keep Nine" proposals would.
    if (delta.field === "court.seats") {
      assertAmendableRuleValue(
        delta.field,
        delta.value,
        delta.officeKey,
        delta.applicability,
      );
      if (!FEDERAL_COURT_IDS.has(delta.officeKey))
        throw new Error("The amendment names a court that is not federal.");
      return;
    }
    // An amendment may return the choice of senators to the legislatures,
    // as Article I, section 3 had it before 1913, or restore election by the
    // people.
    if (delta.field === "senate.selection") {
      assertAmendableRuleValue(
        delta.field,
        delta.value,
        delta.officeKey,
        delta.applicability,
      );
      if (delta.officeKey !== SENATE_SELECTION_OFFICE_KEY)
        throw new Error("How senators are chosen is a rule of the Senate.");
      return;
    }
    // An Article V amendment reaches the national offices only. NOT MODELED:
    // any other federal rule (House size, Senate terms, qualifications).
    if (
      delta.field !== "executive.term.limit" ||
      !FEDERAL_AMENDABLE_OFFICES.includes(delta.officeKey)
    )
      throw new Error(
        "A federal amendment can change the President's term limit; no other federal rule is modeled yet.",
      );
    // The Twenty-Second Amendment counts terms over a lifetime, and that is
    // the only count the presidency's reader keeps.
    const limit = delta.value as TermLimitRule | null;
    if (
      limit !== null &&
      typeof limit === "object" &&
      (limit.maxConsecutiveTerms !== null || limit.lookbackYears !== null)
    )
      throw new Error(
        "A presidential term limit is counted over a lifetime; consecutive and look-back limits are not modeled.",
      );
    assertAmendableRuleValue(
      delta.field,
      delta.value,
      delta.officeKey,
      delta.applicability,
    );
    return;
  }
  const stateUsps = constitutionalStateUsps(jurisdictionKey);
  if (!stateUsps)
    throw new Error(
      "Only a state or federal constitutional amendment can change these rules yet; charter changes are not modeled.",
    );
  assertAmendableRuleValue(
    delta.field,
    delta.value,
    delta.officeKey,
    delta.applicability,
  );
  if (!officeBelongsToState(delta.field, delta.officeKey, stateUsps, null))
    throw new Error("The amendment names another state's office.");
}
