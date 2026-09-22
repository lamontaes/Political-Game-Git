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
 *   enactment's effective date, or the blanket default where the state's
 *   effective-date rule is not modelled;
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
import { addDays } from "./dates";
import { createStableId } from "./ids";
import { requireMeasure } from "./legislation";
import { rulePackById } from "./legislature-rule-packs";
import type { EntityId, IsoDate, World } from "./types";

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
  "body.seats": { min: 1, max: 1000, needsOffice: true },
  "term.years": { min: 1, max: 10, needsOffice: true },
  "qualification.minimumAge": { min: 18, max: 100, needsOffice: true },
  "qualification.stateResidenceYears": { min: 0, max: 30, needsOffice: true },
  "qualification.districtResidenceYears": {
    min: 0,
    max: 30,
    needsOffice: true,
  },
} as const;

export type AmendableRuleField = keyof typeof AMENDABLE_RULE_FIELDS;

/**
 * Rule fields a law cannot change YET, each with why. A law aimed at one of
 * these is refused with this reason rather than recorded as though it acted.
 */
export const NOT_YET_AMENDABLE_RULE_FIELDS: Readonly<Record<string, string>> = {
  "term.start":
    "A term's commencement is a date rule with several shapes; enacting a new one is not modelled yet.",
  "term.expiry":
    "A term's end follows from its length and start; change the length instead.",
  "election.date":
    "The game has no compiled state election calendar to amend; elections run on the game's own calendar.",
  "election.cycle":
    "The game has no compiled state election calendar to amend; elections run on the game's own calendar.",
  "institution.form":
    "Changing the form of a legislature (for example to unicameral) is not modelled yet.",
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
};

/** Plain words for a rule a law can change, for a player-facing sentence. */
export function amendableRuleFieldLabel(field: AmendableRuleField): string {
  return AMENDABLE_RULE_FIELD_LABELS[field];
}

/**
 * The blanket effective date for a statute whose state's effective-date rule is
 * not modelled: ninety days after the act is recorded. Ninety days is the most
 * common default among the states the game has read (Alaska, Missouri, Ohio);
 * it is a game profile, not a claim about any other state's law.
 */
export const STATUTE_EFFECTIVE_DEFAULT_DAYS = 90;

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
  readonly value: number;
  readonly filedAt: IsoDate;
}

/** An operative-dated change, derived from what was enacted. */
export interface EnactedRuleChange {
  readonly stateUsps: string;
  readonly officeKey: string;
  readonly field: AmendableRuleField;
  readonly value: number;
  readonly operativeAt: IsoDate;
  /**
   * `enacted-date` when the law's own record dates it; `game-default` when the
   * state's effective-date rule is not modelled and the blanket rule applied.
   */
  readonly operativeBasis: "enacted-date" | "game-default";
  readonly instrument: "statute" | "constitutional-amendment";
  readonly measureId: EntityId;
  readonly designation: string;
  /** Orders two changes operative on the same day: the later record wins. */
  readonly sequence: number;
}

export function assertAmendableRuleValue(
  field: string,
  value: number,
  officeKey: string | null,
): asserts field is AmendableRuleField {
  if (!isAmendableRuleField(field)) {
    throw new Error(
      NOT_YET_AMENDABLE_RULE_FIELDS[field] ??
        `"${field}" is not a rule the game reads.`,
    );
  }
  const bounds = AMENDABLE_RULE_FIELDS[field];
  if (!Number.isInteger(value) || value < bounds.min || value > bounds.max) {
    throw new Error(
      `${field} must be a whole number from ${bounds.min} to ${bounds.max}.`,
    );
  }
  if (bounds.needsOffice && !officeKey?.trim()) {
    throw new Error(
      `${field} belongs to an office or chamber; none was named.`,
    );
  }
}

function stateUspsForPack(rulePackId: string): string | null {
  const key = rulePackById(rulePackId).jurisdictionKey;
  return /^US-[A-Z]{2}$/.test(key) ? key.slice(3) : null;
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
    readonly value: number;
  },
): World {
  const measure = requireMeasure(world, input.measureId);
  assertAmendableRuleValue(input.field, input.value, input.officeKey);
  const stateUsps = stateUspsForPack(measure.rulePackId);
  if (!stateUsps) {
    // Local governments change these rules by charter, which is not routed
    // here yet; say so instead of recording a clause that could never act.
    throw new Error(
      "Only a state legislature's bill can change these rules yet; local charter changes are not modelled.",
    );
  }
  if (!input.officeKey.startsWith(`${measure.rulePackId}:`)) {
    throw new Error(
      `A ${stateUsps} bill can only change rules for ${stateUsps}'s own offices.`,
    );
  }
  if (
    (world.history.legislativeEnactments ?? []).some(
      (row) => row.measureId === measure.id,
    )
  ) {
    throw new Error(
      "The bill has already reached its final outcome; its text cannot gain a clause now.",
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
    value: input.value,
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
    // NOT MODELLED: a state's own default effective-date rule. The rule packs
    // hold it as prose, nothing computes a date from it, and no caller in play
    // passes one, so every enactment carries a null effective date. A null
    // date is not "effective now". Blanket rule meanwhile: the change operates
    // STATUTE_EFFECTIVE_DEFAULT_DAYS after the act was recorded, and says so.
    const explicit = enactment.effectiveAt;
    changes.push({
      stateUsps: provision.stateUsps,
      officeKey: provision.officeKey,
      field: provision.field,
      value: provision.value,
      operativeAt:
        explicit ??
        addDays(enactment.resolvedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS),
      operativeBasis: explicit ? "enacted-date" : "game-default",
      instrument: "statute",
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
    const stateUsps = constitutionalStateUsps(measure.jurisdictionKey);
    if (!stateUsps) continue;
    const position = constitutionalPosition(world, measure.id);
    if (!position.operativeAt) continue;
    changes.push({
      stateUsps,
      officeKey: delta.officeKey,
      field: delta.field,
      value: delta.value,
      operativeAt: position.operativeAt,
      operativeBasis: "enacted-date",
      instrument: "constitutional-amendment",
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
  return (
    enactedRuleChanges(world)
      .filter(
        (change) =>
          change.stateUsps === query.stateUsps &&
          change.officeKey === query.officeKey &&
          change.field === query.field &&
          change.operativeAt <= query.onDate,
      )
      .at(-1) ?? null
  );
}

export function assertRuleChangeProvisionIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
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
    assertAmendableRuleValue(row.field, row.value, row.officeKey);
    if (
      stateUspsForPack(measure.rulePackId) !== row.stateUsps ||
      !row.officeKey.startsWith(`${measure.rulePackId}:`)
    )
      throw new Error("Rule change provision names another government.");
    const clause = `${row.measureId}|${row.officeKey}|${row.field}`;
    if (seenClauses.has(clause))
      throw new Error("A bill changes the same rule twice.");
    seenClauses.add(clause);
    if (row.filedAt < measure.introducedAt || row.filedAt > world.currentDate)
      throw new Error("Rule change provision is dated outside its bill.");
    // A clause added after the bill's final outcome was never voted on.
    const enactment = (world.history.legislativeEnactments ?? []).find(
      (e) => e.measureId === row.measureId,
    );
    if (enactment && enactment.sequence < row.sequence)
      throw new Error(
        "Rule change provision was added after the bill's outcome.",
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
    readonly value: number;
    readonly officeKey: string;
  },
): void {
  const stateUsps = constitutionalStateUsps(jurisdictionKey);
  if (!stateUsps)
    throw new Error(
      "Only a state constitution's amendment can change these rules yet; federal and charter changes are not modelled.",
    );
  assertAmendableRuleValue(delta.field, delta.value, delta.officeKey);
}
