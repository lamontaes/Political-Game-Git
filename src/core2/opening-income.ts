import dataJson from "./data/opening-income.json" with { type: "json" };
import {
  daysBetween,
  isoDateFromParts,
  makeIsoDate,
} from "../simulation/dates";
import { stableHash } from "../simulation/ids";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import type { EntityId } from "../simulation/types";
import { PARAMETERS, parameter, type Parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import type { FinanceContractInput, FinanceInput } from "./finance-types";
import type {
  CoreInput,
  OrganizationInput,
  PersonInput,
  Source,
} from "./types";

type PastFact = NonNullable<PersonInput["pastFacts"]>[number];

/** Local candidate seam. Root integrates and versions these pending finance fields. */
export interface OpeningIncomeContract extends FinanceContractInput {
  settlementPhaseId?: string;
  recipientIncome?: {
    personId: string;
    householdId: string;
    kindId: string;
    sourceFactId: string;
  };
  salesReceiptBudget?: boolean;
}

export interface OpeningIncomeInput extends Omit<CoreInput, "finance"> {
  finance?: Omit<FinanceInput, "contracts"> & {
    contracts: readonly OpeningIncomeContract[];
  };
}

export interface OpeningIncomeData {
  version: string;
  stopgapId: string;
  settlementPhaseId: string;
  incomeKindId: string;
  contractKindTemplate: string;
  contractIdPrefix: string;
  payerIdPrefix: string;
  coverageIdPrefix: string;
  claimIdPrefix: string;
  awardIdPrefix: string;
  contextKinds: readonly string[];
  contextStage: string;
  contextTrait: string;
  coverageKinds: readonly string[];
  claimKinds: readonly string[];
  awardKinds: readonly string[];
  recordedMonthlyAwardKinds: readonly string[];
  recordedStandingBasis: string;
  recordedPaymentMedium: string;
  generatedCoverageKind: string;
  generatedClaimKind: string;
  generatedAwardKind: string;
  coveredStatus: string;
  claimStatus: string;
  awardStatus: string;
  payer: {
    nameTemplate: string;
    kind: string;
    classification: string;
    identityBasis: string;
  };
  parameters: Readonly<Record<string, string>> & {
    careerStartAgeYears: string;
    schoolContextYears: string;
    claimAgeYears: string;
    claimTraitPullYears: string;
    coveredFraction: string;
    coveredTraitPull: string;
    minimumCoveredMonths: string;
    benefitMonthlyMinor: string;
    benefitReferenceCoveredMonths: string;
    benefitFactorMinimum: string;
    benefitFactorMaximum: string;
    payerReserveMonths: string;
    periodMonths: string;
  };
  labels: { coverage: string; claim: string; award: string };
  citation: string;
  generationPriorVintage: string;
  placeCitation: string;
  reasons: Readonly<Record<string, string>>;
  gaps: readonly string[];
}

export const DEFAULT_OPENING_INCOME_DATA: OpeningIncomeData = dataJson;

export interface OpeningIncomePlace {
  id: string;
  name: string;
  source: Source;
}

export interface RecordedMonthlyIncome {
  personId: string;
  householdId: string;
  payerId: string;
  kindId: string;
  sourceFactId: string;
  amountMinor: number;
  source: Source;
  contractId?: string;
  dueAt?: string;
}

export interface OpeningIncomeOptions {
  data?: OpeningIncomeData;
  parameters?: Readonly<Record<string, Parameter>>;
  /** Tests or prepared-input callers can supply their actual already resolved places. */
  places?: readonly OpeningIncomePlace[];
  /** Existing named payer records win; unused supplied accounts are not appended. */
  recordedPayers?: readonly OrganizationInput[];
  payerIdByPlace?: Readonly<Record<string, string>>;
  recordedMonthlyIncomes?: readonly RecordedMonthlyIncome[];
  allowPastGeneration?: boolean;
}

export interface OpeningIncomeRecipient {
  personId: string;
  householdId: string;
  placeId: string;
  status: "generated" | "recorded" | "quiet";
  reason: string;
  factIds: readonly string[];
  awardFactId?: string;
  contractId?: string;
  payerId?: string;
  monthlyMinor?: number;
}

export interface OpeningIncomeBuild {
  input: OpeningIncomeInput;
  receipt: {
    version: string;
    recipients: readonly OpeningIncomeRecipient[];
    addedPersonFactIds: readonly string[];
    addedContractIds: readonly string[];
    payerAccounts: readonly {
      id: string;
      name: string;
      placeId: string;
      added: boolean;
      openingLiquidMinor: number;
      source: Source;
    }[];
    originalPeopleCashMinor: number;
    originalOrganizationCashMinor: number;
    addedOpeningLiquidMinor: number;
    plannedMonthlyIncomeMinor: number;
    parameterKeys: readonly string[];
    gaps: readonly string[];
  };
}

function canonical(value: unknown): string | undefined {
  if (Array.isArray(value)) return JSON.stringify(value.map(canonical));
  if (value !== null && typeof value === "object")
    return JSON.stringify(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  return JSON.stringify(value);
}

function same(left: unknown, right: unknown): boolean {
  return canonical(left) === canonical(right);
}

/**
 * Pure one-time opening retirement records. Generated WHO/PAST is explicit;
 * no current choice, transfer, payment, firm rescue or cash refill happens here.
 */
export function buildOpeningRetirementIncome(
  input: CoreInput,
  options: OpeningIncomeOptions = {},
): OpeningIncomeBuild {
  const data = options.data ?? DEFAULT_OPENING_INCOME_DATA;
  const p = (key: string) => parameter(key, options.parameters ?? PARAMETERS);
  const zero = p("zero"),
    one = p("one"),
    months = p("monthsPerYear");
  const values = Object.fromEntries(
    Object.entries(data.parameters).map(([key, ref]) => [key, p(ref)]),
  );
  const opening = makeIsoDate(input.startedAt);
  const marker = stopgap(data.stopgapId);
  const minor = (value: number, field: string): number => {
    if (!Number.isSafeInteger(value) || value < zero)
      throw new Error(
        `Opening income requires nonnegative integer minor units: ${field}`,
      );
    return value;
  };
  const sum = (left: number, right: number, field: string) =>
    minor(left + right, field);
  const source = (row: Source, field: string): void => {
    if (
      !["SOURCED", "ESTIMATED"].includes(row.tag) ||
      !row.citation.trim() ||
      makeIsoDate(row.asOf) > opening
    )
      throw new Error(
        `Opening income requires a dated nonfuture source: ${field}`,
      );
  };
  const whole = (value: number, field: string, positive = false): void => {
    if (
      !Number.isSafeInteger(value) ||
      (positive ? value <= zero : value < zero)
    )
      throw new Error(`Invalid whole opening income value: ${field}`);
  };
  whole(zero, "zero calendar unit");
  whole(one, "one calendar unit", true);
  whole(months, "months per year", true);
  if (one <= zero || months <= one || p("daysPerMeanYear") <= zero)
    throw new Error("Invalid opening income calendar units.");
  for (const key of [
    "careerStartAgeYears",
    "schoolContextYears",
    "claimAgeYears",
    "minimumCoveredMonths",
    "benefitMonthlyMinor",
    "benefitReferenceCoveredMonths",
    "periodMonths",
  ])
    whole(values[key]!, key, true);
  if (
    values.periodMonths !== one ||
    values.coveredFraction! <= zero ||
    values.coveredFraction! > one ||
    values.payerReserveMonths! < zero ||
    values.benefitFactorMinimum! <= zero ||
    values.benefitFactorMaximum! < values.benefitFactorMinimum!
  )
    throw new Error("Invalid opening retirement prior or monthly cadence.");

  const unique = <T extends { id: string }>(
    rows: readonly T[],
    field: string,
  ) => {
    const result = new Map<string, T>();
    for (const row of rows) {
      if (!row.id || result.has(row.id))
        throw new Error(`Duplicate opening ${field}: ${row.id}`);
      result.set(row.id, row);
    }
    return result;
  };
  const people = unique(input.people, "person");
  const households = unique(input.households, "household");
  const organizations = unique(input.organizations, "organization");
  const jobs = unique(input.jobs, "job");
  const allPayers = new Map(organizations);
  for (const row of options.recordedPayers ?? []) {
    minor(row.liquidMinor, row.id);
    source(row.source, row.id);
    const prior = allPayers.get(row.id);
    if (prior && !same(prior, row))
      throw new Error(`Conflicting opening payer ID: ${row.id}`);
    if (people.has(row.id))
      throw new Error(`Ambiguous opening cash ID: ${row.id}`);
    allPayers.set(row.id, row);
  }
  const places = unique(options.places ?? [], "place");
  const factsByPerson = new Map<string, Map<string, PastFact>>();
  const ownerByGeneratedFactId = new Map<string, string>();
  const addedFacts = new Map<string, PastFact[]>();
  const addedFactIds: string[] = [];
  let originalPeopleCash = zero,
    originalOrganizationCash = zero;
  for (const person of people.values()) {
    if (organizations.has(person.id))
      throw new Error(`Ambiguous opening cash ID: ${person.id}`);
    originalPeopleCash = sum(
      originalPeopleCash,
      minor(person.liquidMinor, person.id),
      "original people cash",
    );
    const birth = makeIsoDate(person.birthDate);
    if (birth > opening)
      throw new Error(`Person not born at opening: ${person.id}`);
    const home = households.get(person.householdId);
    if (
      !home ||
      home.placeId !== person.placeId ||
      !home.memberIds.includes(person.id)
    )
      throw new Error(
        `Income recipient has no actual household residence: ${person.id}`,
      );
    if (
      person.jobId &&
      (!jobs.has(person.jobId) ||
        jobs.get(person.jobId)!.personId !== person.id)
    )
      throw new Error(
        `Income recipient has conflicting current job ownership: ${person.id}`,
      );
    const facts = new Map<string, PastFact>();
    for (const fact of person.pastFacts ?? []) {
      const prior = facts.get(fact.id);
      if (prior && !same(prior, fact))
        throw new Error(`Conflicting past fact ID: ${fact.id}`);
      source(fact.source, fact.id);
      const at = makeIsoDate(fact.date);
      if (at < birth || at > opening)
        throw new Error(
          `Past fact outside recipient lifetime/opening: ${fact.id}`,
        );
      facts.set(fact.id, fact);
      if (
        [data.coverageIdPrefix, data.claimIdPrefix, data.awardIdPrefix].some(
          (prefix) => fact.id.startsWith(`${prefix}:`),
        )
      ) {
        const owner = ownerByGeneratedFactId.get(fact.id);
        if (owner && owner !== person.id)
          throw new Error(`Conflicting generated fact owner: ${fact.id}`);
        ownerByGeneratedFactId.set(fact.id, person.id);
      }
    }
    factsByPerson.set(person.id, facts);
  }
  for (const row of organizations.values()) {
    source(row.source, row.id);
    originalOrganizationCash = sum(
      originalOrganizationCash,
      minor(row.liquidMinor, row.id),
      "original organization cash",
    );
  }

  const calendarAfterMonths = (date: string, count: number): string => {
    whole(count, "calendar months");
    const [yearText, monthText, dayText] = makeIsoDate(date).split("-");
    const index = Number(monthText) - one + count;
    const year = Number(yearText) + Math.floor(index / months);
    const month = (index % months) + one;
    const first = isoDateFromParts(year, month, one);
    const last = new Date(`${first}T00:00:00.000Z`);
    last.setUTCMonth(last.getUTCMonth() + one);
    last.setUTCDate(zero);
    return isoDateFromParts(
      year,
      month,
      Math.min(Number(dayText), last.getUTCDate()),
    );
  };
  const firstDue = () => {
    const [yearText, monthText] = opening.split("-");
    const index = Number(monthText) - one + values.periodMonths!;
    return isoDateFromParts(
      Number(yearText) + Math.floor(index / months),
      (index % months) + one,
      one,
    );
  };
  const id = (prefix: string, subject: string) =>
    `${prefix}:${stableHash(JSON.stringify([data.version, input.seed, subject]))}`;
  const priorSource = (at: string, detail: string): Source => ({
    tag: "ESTIMATED",
    asOf: makeIsoDate(at),
    citation: data.citation,
    estimatedFrom: `${detail} ${marker.whatItFakes}`,
    generationPriorVintage: data.generationPriorVintage,
  });
  const latest = (facts: Map<string, PastFact>, kinds: readonly string[]) =>
    [...facts.values()]
      .filter((fact) => kinds.includes(fact.kind))
      .sort(
        (left, right) =>
          left.date.localeCompare(right.date) ||
          left.id.localeCompare(right.id),
      )
      .at(-one);
  const addFact = (person: PersonInput, fact: PastFact): void => {
    const facts = factsByPerson.get(person.id)!;
    const prior = facts.get(fact.id);
    if (prior) {
      if (!same(prior, fact))
        throw new Error(`Conflicting generated past fact ID: ${fact.id}`);
      return;
    }
    const owner = ownerByGeneratedFactId.get(fact.id);
    if (owner && owner !== person.id)
      throw new Error(`Conflicting generated fact owner: ${fact.id}`);
    ownerByGeneratedFactId.set(fact.id, person.id);
    facts.set(fact.id, fact);
    const rows = addedFacts.get(person.id) ?? [];
    rows.push(fact);
    addedFacts.set(person.id, rows);
    addedFactIds.push(fact.id);
  };
  const placeFor = (placeId: string): OpeningIncomePlace | undefined => {
    const prior = places.get(placeId);
    if (prior) {
      source(prior.source, prior.id);
      if (!prior.name.trim()) throw new Error("Unnamed opening income place.");
      return prior;
    }
    const actual = lifePlaceByJurisdictionId(placeId as EntityId);
    if (!actual) return undefined;
    const row = {
      id: placeId,
      name: actual.displayName,
      source: {
        tag: "SOURCED" as const,
        asOf: opening,
        citation: data.placeCitation,
      },
    };
    places.set(placeId, row);
    return row;
  };
  const reportRows: OpeningIncomeRecipient[] = [];
  const incomes: RecordedMonthlyIncome[] = [];
  const generatedPayers = new Map<
    string,
    { place: OpeningIncomePlace; monthlyMinor: number; earliestAwardAt: string }
  >();
  const usedPayers = new Set<string>();
  const explicitlyRecorded = new Map<string, RecordedMonthlyIncome[]>();
  for (const income of options.recordedMonthlyIncomes ?? []) {
    if (!people.has(income.personId))
      throw new Error(`Absent recorded income recipient: ${income.personId}`);
    const rows = explicitlyRecorded.get(income.personId) ?? [];
    if (rows.some((prior) => prior.sourceFactId === income.sourceFactId))
      throw new Error("Duplicate recorded monthly award.");
    rows.push(income);
    explicitlyRecorded.set(income.personId, rows);
  }
  const quiet = (
    person: PersonInput,
    reason: string,
    factIds: readonly string[] = [],
  ) => {
    reportRows.push({
      personId: person.id,
      householdId: person.householdId,
      placeId: person.placeId,
      status: "quiet",
      reason,
      factIds,
    });
  };
  const qualified = (
    person: PersonInput,
    coverage: PastFact,
    claim: PastFact,
  ): boolean => {
    const c = coverage.facts,
      q = claim.facts;
    if (
      !c ||
      !q ||
      c.status !== data.coveredStatus ||
      q.status !== data.claimStatus ||
      q.coverageFactId !== coverage.id
    )
      return false;
    const startedAt = makeIsoDate(c.startedAt ?? ""),
      endedAt = makeIsoDate(c.endedAt ?? "");
    const coveredMonths = Number(c.coveredMonths);
    whole(coveredMonths, "covered months");
    const availableMonths =
      (daysBetween(startedAt, endedAt) / p("daysPerMeanYear")) * months;
    if (
      startedAt < person.birthDate ||
      startedAt >= endedAt ||
      endedAt > claim.date ||
      claim.date >= opening ||
      coveredMonths > Math.ceil(availableMonths)
    )
      throw new Error("Contradictory covered-work/claim chronology.");
    return coveredMonths >= values.minimumCoveredMonths!;
  };
  const validateGeneratedPayer = (
    payer: OrganizationInput,
    place: OpeningIncomePlace,
  ): void => {
    const evidence = payer.governmentFacts;
    if (
      payer.placeId !== place.id ||
      payer.kind !== data.payer.kind ||
      payer.classification !== data.payer.classification ||
      payer.name !==
        data.payer.nameTemplate.replace("{placeName}", place.name) ||
      payer.source.citation !== data.citation ||
      evidence?.openingIncomeVersion !== data.version ||
      evidence.jurisdictionId !== place.id ||
      evidence.identityBasis !== data.payer.identityBasis ||
      evidence.stopgapId !== marker.id
    )
      throw new Error(`Conflicting generated payer ID: ${payer.id}`);
    const stockBasis = Number(evidence.stockBasisMonthlyMinor),
      reserve = Number(evidence.stockReserveMonths);
    minor(stockBasis, "saved payer stock basis");
    if (
      !Number.isFinite(reserve) ||
      reserve < zero ||
      payer.liquidMinor !== Math.floor(stockBasis * reserve)
    )
      throw new Error(`Conflicting generated payer opening stock: ${payer.id}`);
    makeIsoDate(evidence.startedAt ?? "");
  };

  for (const person of [...people.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    const facts = factsByPerson.get(person.id)!;
    const explicit = explicitlyRecorded.get(person.id);
    if (explicit) {
      incomes.push(...explicit);
      continue;
    }
    let coverage = latest(facts, data.coverageKinds),
      claim = latest(facts, data.claimKinds);
    const award = latest(facts, data.awardKinds);
    if (award) {
      const fields = award.facts;
      if (fields?.status !== data.awardStatus) {
        quiet(person, data.reasons.inactiveClaim!, [award.id]);
        continue;
      }
      if (fields.coverageFactId || fields.claimFactId) {
        const savedCoverage = fields.coverageFactId
          ? facts.get(fields.coverageFactId)
          : undefined;
        const savedClaim = fields.claimFactId
          ? facts.get(fields.claimFactId)
          : undefined;
        if (
          !savedCoverage ||
          !savedClaim ||
          !qualified(person, savedCoverage, savedClaim) ||
          award.date < savedClaim.date
        )
          throw new Error(
            "Saved retirement award contradicts its covered-work/claim references.",
          );
      }
      if (!fields.payerId || !allPayers.has(fields.payerId)) {
        quiet(person, data.reasons.missingPayer!, [award.id]);
        continue;
      }
      incomes.push({
        personId: person.id,
        householdId: person.householdId,
        payerId: fields.payerId,
        kindId: fields.kindId ?? data.incomeKindId,
        sourceFactId: award.id,
        amountMinor: Number(fields.monthlyMinor),
        source: award.source,
      });
      continue;
    }
    if (person.jobId) {
      quiet(person, data.reasons.currentWork!);
      continue;
    }
    if (claim && claim.facts?.status !== data.claimStatus) {
      quiet(person, data.reasons.inactiveClaim!, [claim.id]);
      continue;
    }
    if (coverage && claim && !qualified(person, coverage, claim)) {
      quiet(person, data.reasons.insufficientCoverage!, [
        coverage.id,
        claim.id,
      ]);
      continue;
    }
    if (!coverage || !claim) {
      if (options.allowPastGeneration === false) {
        quiet(person, data.reasons.generationDisabled!);
        continue;
      }
      const context = latest(
        new Map(
          [...facts].filter(
            ([, fact]) =>
              data.contextKinds.includes(fact.kind) &&
              fact.facts?.stage === data.contextStage,
          ),
        ),
        data.contextKinds,
      );
      const traitValue = person.traits[data.contextTrait];
      const traitSource = person.traitSources?.[data.contextTrait];
      if (!coverage && !context && (traitValue === undefined || !traitSource)) {
        quiet(person, data.reasons.missingContext!);
        continue;
      }
      if (traitValue !== undefined && !Number.isFinite(traitValue))
        throw new Error("Nonfinite retirement context trait.");
      if (traitSource) source(traitSource, `${person.id}:${data.contextTrait}`);
      const trait = traitValue ?? zero;
      const claimMonths = Math.round(
        (values.claimAgeYears! + trait * values.claimTraitPullYears!) * months,
      );
      const claimAt =
        claim?.date ?? calendarAfterMonths(person.birthDate, claimMonths);
      if (claimAt >= opening) {
        quiet(person, data.reasons.tooEarly!);
        continue;
      }
      let startAt = calendarAfterMonths(
        person.birthDate,
        values.careerStartAgeYears! * months,
      );
      if (context) {
        const contextAt = calendarAfterMonths(
          context.date,
          values.schoolContextYears! * months,
        );
        if (contextAt > startAt) startAt = contextAt;
      }
      if (startAt >= claimAt) {
        quiet(person, data.reasons.insufficientCoverage!);
        continue;
      }
      if (!coverage) {
        const fraction = Math.max(
          zero,
          Math.min(
            one,
            values.coveredFraction! + trait * values.coveredTraitPull!,
          ),
        );
        const coveredMonths = Math.floor(
          (daysBetween(makeIsoDate(startAt), makeIsoDate(claimAt)) /
            p("daysPerMeanYear")) *
            months *
            fraction,
        );
        if (coveredMonths < values.minimumCoveredMonths!) {
          quiet(person, data.reasons.insufficientCoverage!);
          continue;
        }
        coverage = {
          id: id(data.coverageIdPrefix, person.id),
          date: claimAt,
          kind: data.generatedCoverageKind,
          summary: data.labels.coverage,
          source: priorSource(
            claimAt,
            "Generated summarized covered months; former employers, individual historical earnings and legal credits are not reconstructed.",
          ),
          facts: {
            status: data.coveredStatus,
            startedAt: startAt,
            endedAt: claimAt,
            coveredMonths: String(coveredMonths),
            contextFactId: context?.id ?? "",
            traitKey: data.contextTrait,
            traitContext:
              traitValue === undefined ? "not-recorded" : String(traitValue),
            coverageFractionPrior: String(fraction),
            stopgapId: marker.id,
          },
        };
        addFact(person, coverage);
      }
      if (!claim) {
        claim = {
          id: id(data.claimIdPrefix, person.id),
          date: claimAt,
          kind: data.generatedClaimKind,
          summary: data.labels.claim,
          source: priorSource(
            claimAt,
            "Fictional pre-start claim follows modeled covered-work and cohort/context history, not an automatic age-only award.",
          ),
          facts: {
            status: data.claimStatus,
            coverageFactId: coverage.id,
            householdId: person.householdId,
            placeId: person.placeId,
            stopgapId: marker.id,
          },
        };
        addFact(person, claim);
      }
    }
    if (!coverage || !claim)
      throw new Error("Opening retirement context remains incomplete.");
    if (!qualified(person, coverage, claim)) {
      quiet(person, data.reasons.insufficientCoverage!, [
        coverage.id,
        claim.id,
      ]);
      continue;
    }
    const place = placeFor(person.placeId);
    if (!place) {
      quiet(person, data.reasons.missingPlace!, [coverage.id, claim.id]);
      continue;
    }
    const payerId =
      options.payerIdByPlace?.[person.placeId] ??
      id(data.payerIdPrefix, person.placeId);
    const existing = allPayers.get(payerId);
    if (options.payerIdByPlace?.[person.placeId] && !existing)
      throw new Error("Explicit opening income payer is absent.");
    if (existing && !options.payerIdByPlace?.[person.placeId])
      validateGeneratedPayer(existing, place);
    const factor = Math.max(
      values.benefitFactorMinimum!,
      Math.min(
        values.benefitFactorMaximum!,
        Number(coverage.facts!.coveredMonths) /
          values.benefitReferenceCoveredMonths!,
      ),
    );
    const monthlyMinor = minor(
      Math.floor(values.benefitMonthlyMinor! * factor),
      "generated monthly award",
    );
    const awardFact: PastFact = {
      id: id(data.awardIdPrefix, person.id),
      date: claim.date,
      kind: data.generatedAwardKind,
      summary: data.labels.award,
      source: priorSource(
        claim.date,
        "Participant-average amount proxy scaled by the saved modeled covered-work extent; variation is a registered assumption, not an empirical individual spread.",
      ),
      facts: {
        status: data.awardStatus,
        payerId,
        monthlyMinor: String(monthlyMinor),
        kindId: data.incomeKindId,
        householdId: person.householdId,
        placeId: person.placeId,
        coverageFactId: coverage.id,
        claimFactId: claim.id,
        stopgapId: marker.id,
      },
    };
    addFact(person, awardFact);
    if (!existing) {
      const pool = generatedPayers.get(payerId);
      generatedPayers.set(payerId, {
        place,
        monthlyMinor: sum(
          pool?.monthlyMinor ?? zero,
          monthlyMinor,
          "payer opening monthly obligations",
        ),
        earliestAwardAt:
          pool && pool.earliestAwardAt < claim.date
            ? pool.earliestAwardAt
            : claim.date,
      });
    }
    incomes.push({
      personId: person.id,
      householdId: person.householdId,
      payerId,
      kindId: data.incomeKindId,
      sourceFactId: awardFact.id,
      amountMinor: monthlyMinor,
      source: awardFact.source,
    });
  }

  for (const [payerId, pool] of generatedPayers) {
    if (people.has(payerId))
      throw new Error(`Generated payer collides with person: ${payerId}`);
    const liquidMinor = minor(
      Math.floor(pool.monthlyMinor * values.payerReserveMonths!),
      "new payer opening stock",
    );
    allPayers.set(payerId, {
      id: payerId,
      placeId: pool.place.id,
      name: data.payer.nameTemplate.replace("{placeName}", pool.place.name),
      kind: data.payer.kind,
      classification: data.payer.classification,
      liquidMinor,
      source: priorSource(
        opening,
        `Finite opening cash prior from current modeled monthly awards ${pool.monthlyMinor} minor units and reserve months ${values.payerReserveMonths}; independent of firms, their cash, costs, forecasts, deficits and future survival.`,
      ),
      governmentFacts: {
        openingIncomeVersion: data.version,
        jurisdictionId: pool.place.id,
        startedAt: pool.earliestAwardAt,
        identityBasis: data.payer.identityBasis,
        stockBasisMonthlyMinor: String(pool.monthlyMinor),
        stockReserveMonths: String(values.payerReserveMonths),
        stopgapId: marker.id,
      },
    });
  }
  const contracts = unique<OpeningIncomeContract>(
    input.finance?.contracts ?? [],
    "finance contract",
  );
  const existingIncomeByAward = new Map<string, OpeningIncomeContract>();
  for (const row of contracts.values()) {
    if (!row.recipientIncome) continue;
    const key = JSON.stringify([
      row.recipientIncome.personId,
      row.recipientIncome.sourceFactId,
    ]);
    if (existingIncomeByAward.has(key))
      throw new Error("Duplicate income contracts for the same award.");
    existingIncomeByAward.set(key, row);
  }
  const addedContracts: string[] = [];
  let plannedMonthly = zero;
  const seenIncome = new Set<string>();
  for (const income of incomes) {
    const person = people.get(income.personId)!;
    const award = factsByPerson.get(person.id)!.get(income.sourceFactId);
    const fields = award?.facts;
    if (
      income.householdId !== person.householdId ||
      !income.kindId ||
      !award ||
      !data.recordedMonthlyAwardKinds.includes(award.kind) ||
      fields?.status !== data.awardStatus ||
      fields.payerId !== income.payerId ||
      Number(fields.monthlyMinor) !== income.amountMinor ||
      (fields.kindId !== undefined && fields.kindId !== income.kindId) ||
      (fields.householdId !== undefined &&
        fields.householdId !== person.householdId) ||
      (fields.placeId !== undefined && fields.placeId !== person.placeId)
    )
      throw new Error(
        "Recorded monthly income contradicts its actual recipient/award.",
      );
    if (
      !data.awardKinds.includes(award.kind) &&
      (fields.basis !== data.recordedStandingBasis ||
        fields.paymentMedium !== data.recordedPaymentMedium)
    )
      throw new Error(
        "Recorded monthly income requires saved cash standing-entitlement evidence; work and restricted benefits use their own writers.",
      );
    if (fields.coverageFactId || fields.claimFactId) {
      const savedCoverage = fields.coverageFactId
        ? factsByPerson.get(person.id)!.get(fields.coverageFactId)
        : undefined;
      const savedClaim = fields.claimFactId
        ? factsByPerson.get(person.id)!.get(fields.claimFactId)
        : undefined;
      if (
        !savedCoverage ||
        !savedClaim ||
        !qualified(person, savedCoverage, savedClaim) ||
        award.date < savedClaim.date
      )
        throw new Error(
          "Saved monthly award contradicts covered-work/claim evidence.",
        );
    }
    minor(income.amountMinor, "recorded monthly income");
    source(income.source, income.sourceFactId);
    const payer = allPayers.get(income.payerId);
    if (!payer || payer.id === person.id)
      throw new Error("Income requires an actual distinct finite payer.");
    minor(payer.liquidMinor, payer.id);
    source(payer.source, payer.id);
    if (payer.id === id(data.payerIdPrefix, person.placeId)) {
      const place = placeFor(person.placeId);
      if (!place)
        throw new Error("Generated income payer has no actual place identity.");
      validateGeneratedPayer(payer, place);
    }
    const key = JSON.stringify([person.id, award.id]);
    if (seenIncome.has(key)) throw new Error("Duplicate monthly income award.");
    seenIncome.add(key);
    usedPayers.add(payer.id);
    const saved = existingIncomeByAward.get(key);
    const contract: OpeningIncomeContract = {
      id: income.contractId ?? saved?.id ?? id(data.contractIdPrefix, key),
      payerIds: [payer.id],
      payeeId: person.id,
      kind: data.contractKindTemplate.replace("{kindId}", income.kindId),
      amountMinor: income.amountMinor,
      dueAt: makeIsoDate(income.dueAt ?? saved?.dueAt ?? firstDue()),
      periodMonths: values.periodMonths!,
      accruesArrears: false,
      marketAdjusted: false,
      salesReceiptBudget: false,
      settlementPhaseId: data.settlementPhaseId,
      recipientIncome: {
        personId: person.id,
        householdId: person.householdId,
        kindId: income.kindId,
        sourceFactId: award.id,
      },
      source: income.source,
    };
    if (contract.dueAt < opening)
      throw new Error("Opening income term is already overdue.");
    calendarAfterMonths(contract.dueAt, contract.periodMonths);
    const previous = contracts.get(contract.id);
    if (
      (saved && saved.id !== contract.id) ||
      (previous && !same(previous, contract))
    )
      throw new Error(`Conflicting income contract ID: ${contract.id}`);
    if (!previous) {
      contracts.set(contract.id, contract);
      addedContracts.push(contract.id);
    }
    plannedMonthly = sum(
      plannedMonthly,
      income.amountMinor,
      "planned monthly income",
    );
    const generated =
      addedFacts.get(person.id)?.some((fact) => fact.id === award.id) ?? false;
    reportRows.push({
      personId: person.id,
      householdId: person.householdId,
      placeId: person.placeId,
      status: generated ? "generated" : "recorded",
      reason: generated ? data.reasons.generated! : data.reasons.recorded!,
      factIds: [fields.coverageFactId, fields.claimFactId, award.id].filter(
        (value): value is string => value !== undefined && value !== "",
      ),
      awardFactId: award.id,
      contractId: contract.id,
      payerId: payer.id,
      monthlyMinor: income.amountMinor,
    });
  }
  const extraPayers = [...usedPayers]
    .filter((payerId) => !organizations.has(payerId))
    .sort()
    .map((payerId) => allPayers.get(payerId)!);
  const addedCash = extraPayers.reduce(
    (total, payer) => sum(total, payer.liquidMinor, "added payer stocks"),
    zero,
  );
  sum(
    sum(originalPeopleCash, originalOrganizationCash, "original combined cash"),
    addedCash,
    "enriched combined cash",
  );
  const gaps = [...new Set([...input.gaps, ...data.gaps])];
  const financeGaps = [
    ...new Set([...(input.finance?.gaps ?? []), ...data.gaps]),
  ];
  const next: OpeningIncomeInput = {
    ...input,
    people: input.people.map((person) =>
      addedFacts.has(person.id)
        ? {
            ...person,
            pastFacts: [
              ...(person.pastFacts ?? []),
              ...addedFacts.get(person.id)!,
            ],
          }
        : person,
    ),
    organizations: extraPayers.length
      ? [...input.organizations, ...extraPayers]
      : input.organizations,
    finance: {
      ...(input.finance ?? { facilities: [], businesses: [] }),
      contracts: [...contracts.values()],
      gaps: financeGaps,
    },
    gaps,
  };
  return {
    input: next,
    receipt: {
      version: data.version,
      recipients: reportRows,
      addedPersonFactIds: addedFactIds,
      addedContractIds: addedContracts,
      payerAccounts: [...usedPayers].sort().map((payerId) => {
        const row = allPayers.get(payerId)!;
        return {
          id: row.id,
          name: row.name,
          placeId: row.placeId,
          added: !organizations.has(row.id),
          openingLiquidMinor: row.liquidMinor,
          source: row.source,
        };
      }),
      originalPeopleCashMinor: originalPeopleCash,
      originalOrganizationCashMinor: originalOrganizationCash,
      addedOpeningLiquidMinor: addedCash,
      plannedMonthlyIncomeMinor: plannedMonthly,
      parameterKeys: Object.values(data.parameters),
      gaps: data.gaps,
    },
  };
}
