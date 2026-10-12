/** KEEP closure from governing/law-in-force.ts. Geometry/catalog are raw facts; authority is the independently lifted legislature producer's dated output. Judicial events are saved inputs only. No World reads or writers. */
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  LegislativeProvisionRecord,
  HistoricalEvent,
  PolicyCatalog,
} from "../../simulation/types";
import type { ConstitutionalMeasureRecord } from "../../simulation/constitutional-types";
import type { PropositionAnswer } from "../../simulation/issue-record";
import type { LawLevel } from "../../simulation/law-hierarchy";
import { lawLevelRank } from "./law-in-force";
import { lawLevelForInstrument } from "./instrument-level";
import { measureAnswersAt, type BillAnswerFacts } from "./bill-answers";
import {
  enactmentStatuteDateContext,
  stateRuleBasis,
  operativeDateForEnactment,
  type EnactmentContextFacts,
} from "./enactment-calendar";
import {
  constitutionalPolicyProvisions,
  type ConstitutionalPolicyFacts,
} from "../legislatures/constitutional-policy";
import type { StatuteFacts } from "../legislatures/statute-date-dependency";
import { makeIsoDate as checkDate } from "../elections/calendar";
function makeIsoDate(date: string) {
  return checkDate(date) as IsoDate;
}
function recordById<T extends { readonly id: EntityId }>(
  rows: readonly T[],
  id: EntityId,
) {
  return rows.find((row) => row.id === id);
}
function recordByStableKey<T extends { readonly stableKey: string }>(
  rows: readonly T[],
  key: string,
) {
  return rows.find((row) => row.stableKey === key);
}
export function authorityReceiptKey(
  id: EntityId,
  q: EntityId,
  date: IsoDate,
  cutoff?: HistoricalCutoff,
) {
  return JSON.stringify([
    id,
    q,
    date,
    cutoff?.asOfDate,
    cutoff?.historySequenceExclusive,
  ]);
}
function mayAnswerQuestion(
  facts: LawFacts,
  id: EntityId,
  q: EntityId,
  date: IsoDate,
  cutoff?: HistoricalCutoff,
) {
  const key = authorityReceiptKey(id, q, date, cutoff);
  if (!facts.authority.has(key))
    throw Error("Missing dated legislature authority receipt: " + key);
  return facts.authority.get(key)!;
}
export interface LawFacts extends BillAnswerFacts, EnactmentContextFacts {
  readonly onDate: IsoDate;
  readonly enactments: readonly LegislativeEnactmentRecord[];
  readonly events: readonly HistoricalEvent[];
  readonly constitutionalMeasures: readonly ConstitutionalMeasureRecord[];
  readonly policyCatalog: PolicyCatalog;
  readonly statute: StatuteFacts;
  readonly constitutional: ConstitutionalPolicyFacts;
  readonly startingLaw: {
    readonly defaultOperativeAt: string;
    readonly questions: Readonly<
      Record<
        string,
        { readonly answers: Readonly<Record<string, StartingLawRow>> }
      >
    >;
  };
  readonly federalId: EntityId;
  readonly stateKeys: readonly string[];
  readonly states: ReadonlyMap<string, { readonly id: EntityId }>;
  readonly startingPlaceKeys: ReadonlyMap<EntityId, string>;
  readonly placeContexts: ReadonlyMap<
    EntityId,
    { readonly stateJurisdictionKey: string | null }
  >;
  readonly wholeGovernmentIds: ReadonlyMap<string, EntityId>;
  readonly counties: ReadonlyMap<EntityId, readonly EntityId[]>;
  readonly authority: ReadonlyMap<string, boolean>;
}
export interface LawInForce {
  readonly answer: PropositionAnswer;
  readonly measureId: EntityId;
  readonly origin: "enacted" | "in-force-at-start";
  readonly level: LawLevel;
  readonly operativeAt: IsoDate;
  readonly operativeBasis:
    "enacted-date" | "state-rule" | "estimated-state-rule" | "game-default";
  readonly preempts?: boolean;
}

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
  facts: LawFacts,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate = facts.onDate,
  scope: "all" | "enacted-only" = "all",
  cutoff?: HistoricalCutoff,
): LawInForce | null {
  const chain = governingChain(facts, jurisdictionId);
  let best: Candidate | null = null;
  const authority = new Map<EntityId, boolean>();
  for (const { enactment, measure } of enactedByQuestion(facts).get(
    propositionId,
  ) ?? []) {
    if (
      cutoff &&
      (enactment.sequence >= cutoff.historySequenceExclusive ||
        measure.sequence >= cutoff.historySequenceExclusive ||
        enactment.resolvedAt > cutoff.asOfDate)
    )
      continue;
    const baseLevel = chain.get(measure.jurisdictionId);
    if (!baseLevel) continue;
    const level = lawLevelForInstrument(
      baseLevel,
      measure.governmentInstrument ?? "statute",
    );
    const answer =
      measureAnswersAt(facts, measure.id, enactment.sequence).find(
        (row) => row.propositionId === propositionId,
      )?.answer ?? null;
    if (!answer) continue;
    let may = authority.get(measure.jurisdictionId);
    if (may === undefined) {
      may = mayAnswerQuestion(
        facts,
        measure.jurisdictionId,
        propositionId,
        onDate,
        cutoff,
      );
      authority.set(measure.jurisdictionId, may);
    }
    if (!may) continue;
    const operative = enactmentOperative(facts, measure, enactment, cutoff);
    if (!operative) continue;
    const { operativeAt, operativeBasis } = operative;
    if (operativeAt > onDate) continue;
    if (
      measure.governmentInstrument &&
      measure.governmentInstrument !== "statute" &&
      (!enactment.publishedAt || enactment.publishedAt > onDate)
    )
      continue;
    if (enactment.expiresAt && enactment.expiresAt < onDate) continue;
    if (struckDownBy(facts, enactment.id, propositionId, onDate, cutoff))
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
    facts,
    chain,
    propositionId,
    onDate,
    cutoff,
  );
  if (scope === "all") {
    if (starting && (!best || governs(starting, best))) best = starting;
  } else if (
    best &&
    starting?.level === "state-constitution" &&
    governs(starting, best)
  )
    best = null;
  const amended = constitutionalCandidate(
    facts,
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

export function enactmentOperative(
  facts: LawFacts,
  measure: LegislativeMeasureRecord,
  enactment: LegislativeEnactmentRecord,
  cutoff?: HistoricalCutoff,
): {
  readonly operativeAt: IsoDate;
  readonly operativeBasis: LawInForce["operativeBasis"];
} | null {
  const placeKey = startingLawPlaceKey(facts, measure.jurisdictionId);
  const context = enactmentStatuteDateContext(facts, enactment, cutoff);
  const operative = operativeDateForEnactment(
    facts.statute,
    enactment,
    placeKey,
    context,
  );
  if (!operative) return null;
  return {
    operativeAt: operative.date,
    operativeBasis:
      operative.basis === "state-rule"
        ? stateRuleBasis(
            facts.statute,
            placeKey!,
            enactment.resolvedAt,
            context,
          )
        : operative.basis,
  };
}

export function judicialRulingKey(
  enactmentId: EntityId,
  propositionId: EntityId,
): string {
  return `judicial-review:${enactmentId}:${propositionId}`;
}

function struckDownBy(
  facts: LawFacts,
  enactmentId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
): boolean {
  const events = facts.events;
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

export function enactmentsAnswering(
  facts: LawFacts,
  propositionId: EntityId,
): readonly EnactedMeasure[] {
  return enactedByQuestion(facts).get(propositionId) ?? [];
}

export function stateJurisdictionOf(
  facts: LawFacts,
  jurisdictionId: EntityId,
): EntityId | null {
  return stateOf(facts, jurisdictionId);
}

export interface EnactedMeasure {
  readonly enactment: LegislativeEnactmentRecord;
  readonly measure: LegislativeMeasureRecord;
}

function enactedByQuestion(
  facts: LawFacts,
): ReadonlyMap<EntityId, readonly EnactedMeasure[]> {
  const enactments = facts.enactments ?? [];
  const measures = facts.measures ?? [];
  const byQuestion = new Map<EntityId, EnactedMeasure[]>();
  for (const enactment of enactments) {
    if (enactment.outcome !== "enacted") continue;
    const measure = recordById(measures, enactment.measureId);
    if (!measure) continue;
    for (const propositionId of new Set([
      ...(measure.propositionIds ?? []),
      ...measureAnswersAt(facts, measure.id, enactment.sequence).map(
        (row) => row.propositionId,
      ),
    ])) {
      const list = byQuestion.get(propositionId) ?? [];
      list.push({ enactment, measure });
      byQuestion.set(propositionId, list);
    }
  }
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

export interface StartingLawRow {
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
  readonly preempts?: boolean;
  readonly before?: {
    readonly scopeEvidence?: StartingLawScope;
    readonly lawTerms?: LegislativeProvisionRecord["lawTerms"];
    readonly lawCategories?: LegislativeProvisionRecord["lawCategories"];
    readonly lawSchedules?: LegislativeProvisionRecord["lawSchedules"];
    readonly answer: PropositionAnswer;
    readonly preempts?: boolean;
  };
  readonly constitution?: {
    readonly cite: string;
    readonly source: string;
    readonly note?: string;
  };
}

export function startingLawPlaceKey(
  facts: LawFacts,
  jurisdictionId: EntityId,
): string | undefined {
  return facts.startingPlaceKeys.get(jurisdictionId);
}

function startingLawRowAt(
  facts: LawFacts,
  dated: StartingLawRow,
  onDate: IsoDate,
): {
  readonly row: StartingLawRow;
  readonly operativeAt: IsoDate;
} | null {
  const defaultAt = makeIsoDate(facts.startingLaw.defaultOperativeAt);
  const answerAt = makeIsoDate(dated.operativeAt ?? defaultAt);
  let selected: {
    row: StartingLawRow;
    operativeAt: IsoDate;
  } | null =
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

function selectedStartingLawRow(
  facts: LawFacts,
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
  const dated = facts.startingLaw.questions[questionKey]?.answers[placeKey];
  if (!dated) return null;
  const selected = startingLawRowAt(facts, dated, onDate);
  if (
    !selected ||
    selected.row.answer !== law.answer ||
    selected.operativeAt !== law.operativeAt
  )
    return null;
  return selected.row;
}

export function startingLawTerms(
  facts: LawFacts,
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
  workplaceKey?: string,
): NonNullable<LegislativeProvisionRecord["lawTerms"]> {
  const row = selectedStartingLawRow(facts, law, questionKey, onDate);
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

export function startingLawTermScope(
  facts: LawFacts,
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
): "statewide" | "regional" | null {
  const row = selectedStartingLawRow(facts, law, questionKey, onDate);
  if (!row) return null;
  return row.regionalTerms === undefined ? "statewide" : "regional";
}

export function startingLawCategories(
  facts: LawFacts,
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
): NonNullable<LegislativeProvisionRecord["lawCategories"]> {
  return (
    selectedStartingLawRow(facts, law, questionKey, onDate)?.lawCategories ?? []
  );
}

export function startingLawSchedules(
  facts: LawFacts,
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
): NonNullable<LegislativeProvisionRecord["lawSchedules"]> {
  return (
    selectedStartingLawRow(facts, law, questionKey, onDate)?.lawSchedules ?? []
  );
}

export function startingLawScope(
  facts: LawFacts,
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
): StartingLawScope | null {
  const evidence = selectedStartingLawRow(
    facts,
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
  readonly yieldsToLocal?: boolean;
};

function startingLawCandidate(
  facts: LawFacts,
  chain: ReadonlyMap<EntityId, LawLevel>,
  propositionId: EntityId,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
): Candidate | null {
  let best: Candidate | null = null;
  const questionKey =
    facts.policyCatalog?.propositions?.[propositionId]?.stableKey ?? null;
  const starting = questionKey
    ? facts.startingLaw.questions[questionKey]
    : null;
  if (starting) {
    for (const [placeId, level] of chain) {
      const placeKey = startingLawPlaceKey(facts, placeId);
      const dated = placeKey ? starting.answers[placeKey] : undefined;
      if (!dated) continue;
      const selected = startingLawRowAt(facts, dated, onDate);
      if (!selected) continue;
      const { row, operativeAt } = selected;
      const candidate: Candidate = {
        answer: row.answer,
        measureId: `starting-law:${placeKey}:${questionKey}` as EntityId,
        level: startingLevel(
          facts,
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

function startingLevel(
  facts: LawFacts,
  level: LawLevel,
  row: StartingLawRow,
  placeKey: string,
  propositionId: EntityId,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
): LawLevel {
  if (!row.constitution || level !== "state-statute") return level;
  const amended =
    (facts.constitutionalMeasures ?? []).some(
      (measure) =>
        measure.ruleDelta.kind === "policy-provision" &&
        measure.ruleDelta.propositionId === propositionId,
    ) &&
    constitutionalPolicyProvisions(
      facts.constitutional,
      placeKey.slice(3),
      onDate,
      cutoff,
    ).some((provision) => provision.propositionId === propositionId);
  return amended ? level : "state-constitution";
}

function constitutionalCandidate(
  facts: LawFacts,
  chain: ReadonlyMap<EntityId, LawLevel>,
  propositionId: EntityId,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
): Candidate | null {
  if (
    !(facts.constitutionalMeasures ?? []).some(
      (row) =>
        row.ruleDelta.kind === "policy-provision" &&
        row.ruleDelta.propositionId === propositionId,
    )
  )
    return null;
  let best: Candidate | null = null;
  for (const [placeId, level] of chain) {
    const placeKey = startingLawPlaceKey(facts, placeId);
    if (!placeKey || level === "local-ordinance") continue;
    const federal = placeKey === "US";
    if (
      !federal &&
      !mayAnswerQuestion(facts, placeId, propositionId, onDate, cutoff)
    )
      continue;
    const provision = constitutionalPolicyProvisions(
      facts.constitutional,
      federal ? "US" : placeKey.slice(3),
      onDate,
      cutoff,
    ).find((row) => row.propositionId === propositionId);
    if (!provision || provision.stance !== "adopt") continue;
    const measure = facts.constitutionalMeasures!.find(
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

export function lawInForceAtStart(
  facts: LawFacts,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate,
): PropositionAnswer | null {
  return (
    startingLawInForce(facts, jurisdictionId, propositionId, onDate)?.answer ??
    null
  );
}

export function startingLawInForce(
  facts: LawFacts,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
): LawInForce | null {
  return startingLawCandidate(
    facts,
    governingChain(facts, jurisdictionId),
    propositionId,
    onDate,
    cutoff,
  );
}

// stopgapId: "laws.starting-local-rank-offset"
function governingRank(law: Candidate): number {
  return law.yieldsToLocal
    ? lawLevelRank("local-ordinance") - 0.5
    : lawLevelRank(law.level);
}

function governs(candidate: Candidate, current: Candidate): boolean {
  const rank = governingRank(candidate) - governingRank(current);
  if (rank !== 0) return rank > 0;
  if (candidate.origin !== current.origin)
    return candidate.origin === "enacted";
  if (candidate.operativeAt !== current.operativeAt)
    return candidate.operativeAt > current.operativeAt;
  return candidate.sequence > current.sequence;
}

export function ownLawLevel(
  facts: LawFacts,
  jurisdictionId: EntityId,
): LawLevel {
  return (
    governingChain(facts, jurisdictionId).get(jurisdictionId) ??
    "local-ordinance"
  );
}

function governingChain(
  facts: LawFacts,
  jurisdictionId: EntityId,
): ReadonlyMap<EntityId, LawLevel> {
  const chain = new Map<EntityId, LawLevel>();
  const federal = facts.federalId;
  chain.set(federal, "federal-statute");
  if (jurisdictionId === federal) return chain;
  const state = stateOf(facts, jurisdictionId);
  if (state) chain.set(state, "state-statute");
  if (state !== jurisdictionId) {
    const stateKey =
      facts.placeContexts.get(jurisdictionId)?.stateJurisdictionKey;
    const isWholeGovernment =
      stateKey &&
      facts.wholeGovernmentIds.get(stateKey.slice(3)) === jurisdictionId;
    chain.set(
      jurisdictionId,
      isWholeGovernment ? "state-statute" : "local-ordinance",
    );
  }
  for (const county of facts.counties.get(jurisdictionId) ?? [])
    chain.set(county, "local-ordinance");
  return chain;
}

function stateOf(facts: LawFacts, jurisdictionId: EntityId): EntityId | null {
  const isState = facts.stateKeys.some(
    (usps) => facts.states.get(`US-${usps}`)?.id === jurisdictionId,
  );
  if (isState) return jurisdictionId;
  const key = facts.placeContexts.get(jurisdictionId)?.stateJurisdictionKey;
  return key ? (facts.states.get(key)?.id ?? null) : null;
}

export function operativeDateInWorld(
  facts: LawFacts,
  enactment: LegislativeEnactmentRecord,
  cutoff?: HistoricalCutoff,
): ReturnType<typeof operativeDateForEnactment> {
  const measure = (facts.measures ?? []).find(
    (row) => row.id === enactment.measureId,
  );
  return operativeDateForEnactment(
    facts.statute,
    enactment,
    measure ? startingLawPlaceKey(facts, measure.jurisdictionId) : null,
    enactmentStatuteDateContext(facts, enactment, cutoff),
  );
}
