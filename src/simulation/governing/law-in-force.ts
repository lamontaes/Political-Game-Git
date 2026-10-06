import { recordById, recordByStableKey } from "../history-index";
import { operativeDateForEnactment } from "../legislative-effective-date";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import {
  enactmentStatuteDateContext,
  stateRuleBasis,
} from "../enacted-rule-changes";
import { type PropositionAnswer } from "../issue-record";
import { lawLevelRank, type LawLevel } from "../law-hierarchy";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { STATES } from "../state-reference";
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  LegislativeProvisionRecord,
  World,
} from "../types";
import { measureAnswersAt } from "../vote-bundle";
import { mayAnswerQuestion } from "./question-authority";
import { unincorporatedCountyJurisdictionIds } from "../nationwide-world/local-governments";
import { constitutionalPolicyProvisions } from "../policy-provisions";

/**
 * What the law in force says on one policy question, for one place.
 *
 * Derived, never stored: read from the enacted measures that answered the
 * question (`propositionAnswers`), each operative from its enactment's own
 * saved date and profile through `operativeDateForEnactment`. A source-dated
 * enactment without its required date governs nothing until that date is known.
 *
 * Which law governs follows `law-hierarchy.ts`: the place's own ordinances,
 * then its state's statutes, then Acts of Congress, and a higher level in
 * force outranks a lower one. Within a level, the later law governs.
 *
 * Null means no law in force has answered the question here. That is not
 * "no": the status quo on a question nobody has legislated is unknown, and a
 * caller must say so rather than read it as either answer.
 *
 * What a place's law already said when the game began is read from
 * `data/research/laws/starting-law-2026.json` (researched, for the questions
 * it covers): a state's answer is a state statute, the United States' a
 * federal one, each in force from its operative date. It ranks like any other
 * law, so a law enacted in play at the same or a higher level governs once it
 * takes effect. A place the file leaves out has no answer, not "no".
 *
 * A level answers only the questions its powers cover (`question-authority.ts`):
 * an enacted measure whose level may not answer the question (a city ordinance
 * on the state's income tax) is kept on the record and governs nothing.
 *
 * A starting-law state "no" says whether it preempts (`preempts` on the row):
 * "no, and localities are barred" outranks a local ordinance like any state
 * law; "no statewide law, localities may act" (`preempts: false`) yields to a
 * city's or county's own answer where that local government may give one. A
 * row that does not say keeps the blanket rank.
 *
 * NOT MODELED, blanket rule meanwhile: floor preemption for laws enacted in
 * play (every conflict is resolved by rank), and each state's local-authority
 * doctrine beyond the powers catalog (where the catalog has not settled a
 * power, an ordinance counts where no higher law answers it).
 *
 * A ratified amendment that writes a policy into a constitution (a state's,
 * or the United States') answers its question "yes" at that constitution's
 * rank, above every statute beneath it (`policy-provisions.ts`).
 */

export interface LawInForce {
  readonly answer: PropositionAnswer;
  /**
   * The enacted measure, or for a law already in force when the game began,
   * a key of the form `starting-law:<place key>:<question key>` that names no
   * measure.
   */
  readonly measureId: EntityId;
  /** Whether a law enacted in play governs, or the law the game began with. */
  readonly origin: "enacted" | "in-force-at-start";
  readonly level: LawLevel;
  readonly operativeAt: IsoDate;
  /**
   * `state-rule` when the state's own effective-date rule dated it,
   * `game-default` when the blanket effective date was applied.
   */
  readonly operativeBasis:
    "enacted-date" | "state-rule" | "estimated-state-rule" | "game-default";
  /**
   * For a law the game began with: whether it also bars the place's
   * localities from answering otherwise, where the starting-law row says.
   */
  readonly preempts?: boolean;
}

/**
 * The law in force as a legislature filing a bill reads it: its answer, or
 * `closed` when a constitution settles the question. A statute ranks below
 * the constitution, so no bill on it could change what is in force, and a
 * member files none (only an amendment can).
 */
export function statuteAnswer(
  law: LawInForce | null,
): PropositionAnswer | null | "closed" {
  if (!law) return null;
  return law.level === "federal-constitution" ||
    law.level === "state-constitution"
    ? "closed"
    : law.answer;
}

export function lawInForce(
  world: World,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate = world.currentDate,
  /**
   * `enacted-only` leaves out the law the game began with. A law enacted in
   * play always comes after the start, so it governs over a starting law on
   * the same question even where the starting law is dated to take effect
   * later (a program scheduled for 2028 and repealed in 2026 stays repealed).
   */
  scope: "all" | "enacted-only" = "all",
  cutoff?: HistoricalCutoff,
): LawInForce | null {
  const chain = governingChain(jurisdictionId);
  let best: Candidate | null = null;
  const authority = new Map<EntityId, boolean>();
  for (const { enactment, measure } of enactedByQuestion(world).get(
    propositionId,
  ) ?? []) {
    if (
      cutoff &&
      (enactment.sequence >= cutoff.historySequenceExclusive ||
        measure.sequence >= cutoff.historySequenceExclusive ||
        enactment.resolvedAt > cutoff.asOfDate)
    )
      continue;
    const level = chain.get(measure.jurisdictionId);
    if (!level) continue;
    // The law as enacted, sections an amendment or a rider put in included.
    const answer =
      measureAnswersAt(world, measure.id, enactment.sequence).find(
        (row) => row.propositionId === propositionId,
      )?.answer ?? null;
    if (!answer) continue;
    // Beyond its level's powers: on the record, and governing nothing.
    let may = authority.get(measure.jurisdictionId);
    if (may === undefined) {
      may = mayAnswerQuestion(
        world,
        measure.jurisdictionId,
        propositionId,
        onDate,
        cutoff,
      );
      authority.set(measure.jurisdictionId, may);
    }
    if (!may) continue;
    const operative = enactmentOperative(world, measure, enactment, cutoff);
    if (!operative) continue;
    const { operativeAt, operativeBasis } = operative;
    if (operativeAt > onDate) continue;
    // Struck down by a court before this day: on the record, and governing
    // nothing (judiciary/judicial-review.ts).
    if (struckDownBy(world, enactment.id, propositionId, onDate, cutoff))
      continue;
    const candidate = {
      answer,
      measureId: measure.id,
      level,
      operativeAt,
      operativeBasis,
      origin: "enacted" as const,
      sequence: enactment.sequence,
    };
    if (!best || governs(candidate, best)) best = candidate;
  }
  const starting = startingLawCandidate(
    world,
    chain,
    propositionId,
    onDate,
    cutoff,
  );
  if (scope === "all") {
    if (starting && (!best || governs(starting, best))) best = starting;
  } else if (
    // A statute enacted in play against what the state's constitution wrote
    // when the game began governs nothing, for a reader of enacted law too.
    best &&
    starting?.level === "state-constitution" &&
    governs(starting, best)
  )
    best = null;
  const amended = constitutionalCandidate(
    world,
    chain,
    propositionId,
    onDate,
    cutoff,
  );
  if (amended && (!best || governs(amended, best))) best = amended;
  if (!best) return null;
  return {
    answer: best.answer,
    measureId: best.measureId,
    origin: best.origin,
    level: best.level,
    operativeAt: best.operativeAt,
    operativeBasis: best.operativeBasis,
    ...(best.preempts === undefined ? {} : { preempts: best.preempts }),
  };
}

/** The shared day and basis, or null when the saved source date is missing. */
export function enactmentOperative(
  world: World,
  measure: LegislativeMeasureRecord,
  enactment: LegislativeEnactmentRecord,
  cutoff?: HistoricalCutoff,
): {
  readonly operativeAt: IsoDate;
  readonly operativeBasis: LawInForce["operativeBasis"];
} | null {
  const placeKey = startingLawPlaceKey(measure.jurisdictionId);
  const context = enactmentStatuteDateContext(world, enactment, cutoff);
  const operative = operativeDateForEnactment(enactment, placeKey, context);
  if (!operative) return null;
  return {
    operativeAt: operative.date,
    operativeBasis:
      operative.basis === "state-rule"
        ? stateRuleBasis(placeKey!, enactment.resolvedAt, context)
        : operative.basis,
  };
}

/** The record key of a court's ruling on one question a law answers. */
export function judicialRulingKey(
  enactmentId: EntityId,
  propositionId: EntityId,
): string {
  return `judicial-review:${enactmentId}:${propositionId}`;
}

/** Whether a court struck the law's answer to this question by `onDate`. */
function struckDownBy(
  world: World,
  enactmentId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
): boolean {
  // A partial world read by a rule's own tests may carry no events.
  const events = world.history.events;
  if (!events?.length) return false;
  const ruling = recordByStableKey(
    events,
    judicialRulingKey(enactmentId, propositionId),
  );
  return (
    ruling !== undefined &&
    (!cutoff ||
      (ruling.sequence < cutoff.historySequenceExclusive &&
        ruling.occurredAt <= cutoff.asOfDate)) &&
    ruling.occurredAt <= onDate &&
    ruling.tags.includes("outcome:struck")
  );
}

/** Every law enacted in play that answers this question. */
export function enactmentsAnswering(
  world: World,
  propositionId: EntityId,
): readonly EnactedMeasure[] {
  return enactedByQuestion(world).get(propositionId) ?? [];
}

/** The state a jurisdiction belongs to: itself for a state. */
export function stateJurisdictionOf(jurisdictionId: EntityId): EntityId | null {
  return stateOf(jurisdictionId);
}

export interface EnactedMeasure {
  readonly enactment: LegislativeEnactmentRecord;
  readonly measure: LegislativeMeasureRecord;
}

const ENACTED_BY_QUESTION = new WeakMap<
  readonly LegislativeEnactmentRecord[],
  {
    readonly measures: readonly LegislativeMeasureRecord[];
    readonly byQuestion: ReadonlyMap<EntityId, readonly EnactedMeasure[]>;
  }
>();

/**
 * The enacted measures that answer each question, in enactment order. Every
 * member's every vote asks what law is in force, and reading every enactment
 * the world has ever had for each one grew with the save. Both lists only
 * grow, so this is rebuilt when either one changes.
 */
function enactedByQuestion(
  world: World,
): ReadonlyMap<EntityId, readonly EnactedMeasure[]> {
  const enactments = world.history.legislativeEnactments ?? [];
  const measures = world.history.legislativeMeasures ?? [];
  const cached = ENACTED_BY_QUESTION.get(enactments);
  if (cached && cached.measures === measures) return cached.byQuestion;
  const byQuestion = new Map<EntityId, EnactedMeasure[]>();
  for (const enactment of enactments) {
    if (enactment.outcome !== "enacted") continue;
    const measure = recordById(measures, enactment.measureId);
    if (!measure) continue;
    // Every question the law answers as enacted: the ones it was filed on,
    // and any a section an amendment or a rider put in answers (Build 25).
    for (const propositionId of new Set([
      ...(measure.propositionIds ?? []),
      ...measureAnswersAt(world, measure.id, enactment.sequence).map(
        (row) => row.propositionId,
      ),
    ])) {
      const list = byQuestion.get(propositionId) ?? [];
      list.push({ enactment, measure });
      byQuestion.set(propositionId, list);
    }
  }
  ENACTED_BY_QUESTION.set(enactments, { measures, byQuestion });
  return byQuestion;
}

export interface StartingLawScope {
  readonly kind:
    "federal-standard" | "unresolved-regional" | "unresolved-industry";
  readonly rows: readonly {
    readonly matrixRow: string;
    readonly source: string;
    readonly operativeAt: string;
  }[];
}

interface StartingLawRow {
  /** Exact recorded workplace identities; no name or county-containment guess. */
  readonly regionalTerms?: readonly {
    readonly workplaceKeys: readonly string[];
    readonly operativeAt: string;
    readonly lawTerms: NonNullable<LegislativeProvisionRecord["lawTerms"]>;
    readonly source: string;
  }[];
  readonly scopeEvidence?: StartingLawScope;
  readonly phases?: readonly (Omit<StartingLawRow, "phases" | "before"> & {
    readonly operativeAt: string;
  })[];
  readonly lawTerms?: LegislativeProvisionRecord["lawTerms"];
  readonly lawCategories?: LegislativeProvisionRecord["lawCategories"];
  readonly lawSchedules?: LegislativeProvisionRecord["lawSchedules"];
  readonly answer: PropositionAnswer;
  readonly operativeAt?: string;
  /**
   * On a state's "no": true when the state also bars its localities from
   * answering otherwise, false when it leaves them free. Unsaid keeps the
   * blanket rank.
   */
  readonly preempts?: boolean;
  /**
   * What the place's law said before `operativeAt`, for a row whose answer
   * takes effect after the game begins (a program enacted but not yet
   * started). Unsaid: nothing is known before that date.
   */
  readonly before?: {
    readonly scopeEvidence?: StartingLawScope;
    readonly lawTerms?: LegislativeProvisionRecord["lawTerms"];
    readonly lawCategories?: LegislativeProvisionRecord["lawCategories"];
    readonly lawSchedules?: LegislativeProvisionRecord["lawSchedules"];
    readonly answer: PropositionAnswer;
    readonly preempts?: boolean;
  };
  /**
   * Where the state's own constitution writes this answer, so no statute can
   * change it and only an amendment can: the clause, and the ruling that
   * reads it that way where the text alone does not say so.
   */
  readonly constitution?: {
    readonly cite: string;
    readonly source: string;
    readonly note?: string;
  };
}

const STARTING_LAW = startingLaw as unknown as {
  readonly defaultOperativeAt: string;
  readonly questions: Readonly<
    Record<
      string,
      { readonly answers: Readonly<Record<string, StartingLawRow>> }
    >
  >;
};

/**
 * Each jurisdiction's key in the starting-law file: `US`, or `US-XX`. Built on
 * first use: the places it reads are not ready while modules load.
 */
let startingLawPlaceKeys: ReadonlyMap<EntityId, string> | null = null;
export function startingLawPlaceKey(
  jurisdictionId: EntityId,
): string | undefined {
  startingLawPlaceKeys ??= new Map([
    [NATIONAL_ELECTION_JURISDICTION.id, "US"],
    ...Object.keys(STATES).flatMap((usps): [EntityId, string][] => {
      const id = stateJurisdictionForKey(`US-${usps}`)?.id;
      return id ? [[id, `US-${usps}`]] : [];
    }),
  ]);
  return startingLawPlaceKeys.get(jurisdictionId);
}

/** The same dated legal text is used by authority selection and numeric readers. */
function startingLawRowAt(
  dated: StartingLawRow,
  onDate: IsoDate,
): {
  readonly row: StartingLawRow;
  readonly operativeAt: IsoDate;
} | null {
  const defaultAt = makeIsoDate(STARTING_LAW.defaultOperativeAt);
  const answerAt = makeIsoDate(dated.operativeAt ?? defaultAt);
  let selected: { row: StartingLawRow; operativeAt: IsoDate } | null =
    answerAt <= onDate
      ? { row: dated, operativeAt: answerAt }
      : dated.before && defaultAt <= onDate
        ? { row: dated.before, operativeAt: defaultAt }
        : null;
  const seen = new Set<string>([answerAt]);
  for (const phase of dated.phases ?? []) {
    const operativeAt = makeIsoDate(phase.operativeAt);
    if (operativeAt <= answerAt || seen.has(operativeAt))
      throw new Error(
        "Starting law phases require distinct dates after the initial rule",
      );
    seen.add(operativeAt);
    if (
      operativeAt <= onDate &&
      (!selected || operativeAt > selected.operativeAt)
    )
      selected = { row: phase, operativeAt };
  }
  return selected;
}

/** Numeric text belonging to the canonical starting row, not an invented enactment. */
function selectedStartingLawRow(
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
): StartingLawRow | null {
  if (
    law.origin !== "in-force-at-start" ||
    law.operativeAt > onDate ||
    typeof law.measureId !== "string"
  )
    return null;
  const prefix = "starting-law:";
  const suffix = `:${questionKey}`;
  if (!law.measureId.startsWith(prefix) || !law.measureId.endsWith(suffix))
    return null;
  const placeKey = law.measureId.slice(prefix.length, -suffix.length);
  const dated = STARTING_LAW.questions[questionKey]?.answers[placeKey];
  if (!dated) return null;
  const selected = startingLawRowAt(dated, onDate);
  if (
    !selected ||
    selected.row.answer !== law.answer ||
    selected.operativeAt !== law.operativeAt
  )
    return null;
  return selected.row;
}

export function startingLawTerms(
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
  workplaceKey?: string,
): NonNullable<LegislativeProvisionRecord["lawTerms"]> {
  const row = selectedStartingLawRow(law, questionKey, onDate);
  if (!row?.regionalTerms) return row?.lawTerms ?? [];
  if (!workplaceKey) return [];
  const matches = row.regionalTerms.filter(
    (region) =>
      region.workplaceKeys.includes(workplaceKey) &&
      region.operativeAt <= onDate,
  );
  const latest = matches.reduce<string | null>(
    (date, region) =>
      date === null || region.operativeAt > date ? region.operativeAt : date,
    null,
  );
  const active = matches.filter((region) => region.operativeAt === latest);
  return active.length === 1 ? active[0]!.lawTerms : [];
}

/** Whether starting numeric terms are statewide or explicitly workplace-scoped. */
export function startingLawTermScope(
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
): "statewide" | "regional" | null {
  const row = selectedStartingLawRow(law, questionKey, onDate);
  if (!row) return null;
  return row.regionalTerms === undefined ? "statewide" : "regional";
}

export function startingLawCategories(
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
): NonNullable<LegislativeProvisionRecord["lawCategories"]> {
  return selectedStartingLawRow(law, questionKey, onDate)?.lawCategories ?? [];
}

export function startingLawSchedules(
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
): NonNullable<LegislativeProvisionRecord["lawSchedules"]> {
  return selectedStartingLawRow(law, questionKey, onDate)?.lawSchedules ?? [];
}

/** Structured applicability evidence; absent or not yet operative stays unknown. */
export function startingLawScope(
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
): StartingLawScope | null {
  const evidence = selectedStartingLawRow(
    law,
    questionKey,
    onDate,
  )?.scopeEvidence;
  if (!evidence) return null;
  const rows = evidence.rows.filter((row) => row.operativeAt <= onDate);
  return rows.length ? { kind: evidence.kind, rows } : null;
}

type Candidate = LawInForce & {
  readonly sequence: number;
  /** A state "no" that leaves its localities free to answer otherwise. */
  readonly yieldsToLocal?: boolean;
};

/**
 * The law each place already had when the game began, as it stood on
 * `onDate`: the highest-ranked starting law in the governing chain.
 */
function startingLawCandidate(
  world: World,
  chain: ReadonlyMap<EntityId, LawLevel>,
  propositionId: EntityId,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
): Candidate | null {
  let best: Candidate | null = null;
  const questionKey =
    world.policyCatalog?.propositions?.[propositionId]?.stableKey ?? null;
  const starting = questionKey ? STARTING_LAW.questions[questionKey] : null;
  if (starting) {
    for (const [placeId, level] of chain) {
      const placeKey = startingLawPlaceKey(placeId);
      const dated = placeKey ? starting.answers[placeKey] : undefined;
      if (!dated) continue;
      const selected = startingLawRowAt(dated, onDate);
      if (!selected) continue;
      const { row, operativeAt } = selected;
      const candidate: Candidate = {
        answer: row.answer,
        measureId: `starting-law:${placeKey}:${questionKey}` as EntityId,
        level: startingLevel(
          world,
          level,
          row,
          placeKey!,
          propositionId,
          onDate,
          cutoff,
        ),
        operativeAt,
        operativeBasis: "enacted-date" as const,
        origin: "in-force-at-start" as const,
        // Before any enactment: a law enacted in play on the same day governs.
        sequence: -1,
        ...(row.preempts === undefined ? {} : { preempts: row.preempts }),
        ...(level === "state-statute" &&
        row.answer === "no" &&
        row.preempts === false
          ? { yieldsToLocal: true }
          : {}),
      };
      if (!best || governs(candidate, best)) best = candidate;
    }
  }
  return best;
}

/**
 * The rank of a starting row: a state constitution's where the state's own
 * constitution writes the answer (`constitution` on the row), until an
 * amendment on the question takes effect. After that the amendment speaks
 * for the constitution, and what the state's statutes said remains only at
 * a statute's rank: a repealed bar leaves the flat tax in place, and a new
 * statute may change it.
 */
function startingLevel(
  world: World,
  level: LawLevel,
  row: StartingLawRow,
  placeKey: string,
  propositionId: EntityId,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
): LawLevel {
  if (!row.constitution || level !== "state-statute") return level;
  const amended =
    (world.history.constitutionalMeasures ?? []).some(
      (measure) =>
        measure.ruleDelta.kind === "policy-provision" &&
        measure.ruleDelta.propositionId === propositionId,
    ) &&
    constitutionalPolicyProvisions(
      world,
      placeKey.slice(3),
      onDate,
      cutoff,
    ).some((provision) => provision.propositionId === propositionId);
  return amended ? level : "state-constitution";
}

/**
 * The answer a constitution in the governing chain writes on the question:
 * the U.S. Constitution's, then the state's, each only where a ratified
 * amendment adopted the policy and no later one repealed it.
 */
function constitutionalCandidate(
  world: World,
  chain: ReadonlyMap<EntityId, LawLevel>,
  propositionId: EntityId,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
): Candidate | null {
  // Cheap guard: only a measure on this very question can answer it.
  if (
    !(world.history.constitutionalMeasures ?? []).some(
      (row) =>
        row.ruleDelta.kind === "policy-provision" &&
        row.ruleDelta.propositionId === propositionId,
    )
  )
    return null;
  let best: Candidate | null = null;
  for (const [placeId, level] of chain) {
    const placeKey = startingLawPlaceKey(placeId);
    if (!placeKey || level === "local-ordinance") continue;
    const federal = placeKey === "US";
    // A state constitution answers only what the state may decide, as a
    // state statute does.
    if (
      !federal &&
      !mayAnswerQuestion(world, placeId, propositionId, onDate, cutoff)
    )
      continue;
    const provision = constitutionalPolicyProvisions(
      world,
      federal ? "US" : placeKey.slice(3),
      onDate,
      cutoff,
    ).find((row) => row.propositionId === propositionId);
    if (!provision || provision.stance !== "adopt") continue;
    const measure = world.history.constitutionalMeasures!.find(
      (row) => row.id === provision.measureId,
    )!;
    const candidate: Candidate = {
      answer: "yes",
      measureId: provision.measureId,
      level: federal ? "federal-constitution" : "state-constitution",
      operativeAt: provision.operativeAt,
      operativeBasis: "enacted-date",
      origin: "enacted",
      sequence: measure.sequence,
    };
    if (!best || governs(candidate, best)) best = candidate;
  }
  return best;
}

/**
 * What the law a place began with said on a question on `onDate`, ignoring
 * every law enacted in play. The outcome web measures a law's effect from
 * this, because a place's base data already reflects the law it had then.
 */
export function lawInForceAtStart(
  world: World,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate,
): PropositionAnswer | null {
  return (
    startingLawInForce(world, jurisdictionId, propositionId, onDate)?.answer ??
    null
  );
}

/** The canonical starting law, for readers that also need its adopted terms. */
export function startingLawInForce(
  world: World,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
): LawInForce | null {
  return startingLawCandidate(
    world,
    governingChain(jurisdictionId),
    propositionId,
    onDate,
    cutoff,
  );
}

/**
 * A law's rank when laws conflict. A state "no" that leaves its localities
 * free sits just below their ordinances, so a local answer governs in that
 * place and the state's "no" governs everywhere no ordinance answers.
 */
function governingRank(law: Candidate): number {
  return law.yieldsToLocal
    ? lawLevelRank("local-ordinance") - 0.5
    : lawLevelRank(law.level);
}

function governs(candidate: Candidate, current: Candidate): boolean {
  const rank = governingRank(candidate) - governingRank(current);
  if (rank !== 0) return rank > 0;
  // A law enacted in play was passed after every law the game began with,
  // so it governs even when a starting law takes effect later: a repeal of
  // a starting law not yet in force leaves nothing of it to take effect.
  if (candidate.origin !== current.origin)
    return candidate.origin === "enacted";
  if (candidate.operativeAt !== current.operativeAt)
    return candidate.operativeAt > current.operativeAt;
  return candidate.sequence > current.sequence;
}

/**
 * The jurisdictions whose law reaches a place, each with the level its
 * ordinary acts rank at: the place itself, its state, and the United States.
 */
/** The rank of the law a place's own lawmakers enact there. */
export function ownLawLevel(jurisdictionId: EntityId): LawLevel {
  return (
    governingChain(jurisdictionId).get(jurisdictionId) ?? "local-ordinance"
  );
}

function governingChain(
  jurisdictionId: EntityId,
): ReadonlyMap<EntityId, LawLevel> {
  const chain = new Map<EntityId, LawLevel>();
  const federal = NATIONAL_ELECTION_JURISDICTION.id;
  chain.set(federal, "federal-statute");
  if (jurisdictionId === federal) return chain;
  const state = stateOf(jurisdictionId);
  if (state) chain.set(state, "state-statute");
  if (state !== jurisdictionId) chain.set(jurisdictionId, "local-ordinance");
  // A place with no town government lives under its county's ordinances.
  for (const county of unincorporatedCountyJurisdictionIds(jurisdictionId))
    chain.set(county, "local-ordinance");
  return chain;
}

function stateOf(jurisdictionId: EntityId): EntityId | null {
  const isState = Object.keys(STATES).some(
    (usps) => stateJurisdictionForKey(`US-${usps}`)?.id === jurisdictionId,
  );
  if (isState) return jurisdictionId;
  const key = lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey;
  return key ? (stateJurisdictionForKey(key)?.id ?? null) : null;
}

/**
 * The date an enacted state measure takes effect, by the one reading every
 * consumer shares: the enactment's saved date, else its state's own effective-date
 * rule, else the game interval.
 */
export function operativeDateInWorld(
  world: World,
  enactment: LegislativeEnactmentRecord,
  cutoff?: HistoricalCutoff,
): ReturnType<typeof operativeDateForEnactment> {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === enactment.measureId,
  );
  return operativeDateForEnactment(
    enactment,
    measure ? startingLawPlaceKey(measure.jurisdictionId) : null,
    enactmentStatuteDateContext(world, enactment, cutoff),
  );
}
