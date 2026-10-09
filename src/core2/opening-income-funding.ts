import dataJson from "./data/opening-income-funding.json" with { type: "json" };
import {
  daysBetween,
  isoDateFromParts,
  makeIsoDate,
} from "../simulation/dates";
import { stableHash } from "../simulation/ids";
import { seatOfGovernmentPlace } from "../simulation/life-places";
import { PARAMETERS, parameter, type Parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import {
  DEFAULT_OPENING_INCOME_DATA,
  type OpeningIncomeContract,
  type OpeningIncomeInput,
  type OpeningIncomePlace,
} from "./opening-income";
import type { OrganizationInput, Source } from "./types";

/** Funding is not a recipient income payment, purchase, loan or asset-to-cash conversion. */
export interface OpeningRetirementFundingContract extends OpeningIncomeContract {
  salesReceipt: boolean;
  /** Exclusive end; root's finite-budget writer stops indexing later bills. */
  endsAt: string;
}

export interface OpeningRetirementFundingData {
  version: string;
  stopgapId: string;
  contractIdPrefix: string;
  contributorIdPrefix: string;
  settlementPhaseId: string;
  contractKind: string;
  contributorJurisdictionKey: string;
  contributorNameTemplate: string;
  contributorKind: string;
  contributorClassification: string;
  contributorKinds: readonly string[];
  eligiblePayerClassifications: readonly string[];
  incomeKindIds: readonly string[];
  parameters: {
    envelopeShare: string;
    openingLiquidShare: string;
    nationalAnnualOutlayMinor: string;
    periodMonths: string;
    windowMonths: string;
  };
  flowEvidence: {
    publisher: string;
    title: string;
    url: string;
    sourceFile: string;
    sourceField: string;
    sourceVintage: string;
    scope: string;
  };
  citation: string;
  identityBasis: string;
  gaps: readonly string[];
}

export const DEFAULT_OPENING_RETIREMENT_FUNDING_DATA: OpeningRetirementFundingData =
  dataJson;

export interface OpeningRetirementFundingOptions {
  data?: OpeningRetirementFundingData;
  parameters?: Readonly<Record<string, Parameter>>;
  /** Actual already resolved external place. Default uses the canonical seat lookup. */
  contributorPlace?: OpeningIncomePlace;
  /** Existing finite records; unused supplied records are not appended. */
  recordedContributors?: readonly OrganizationInput[];
  contributorIdByPayer?: Readonly<Record<string, string>>;
}

export interface OpeningRetirementFundingBuild {
  input: OpeningIncomeInput;
  receipt: {
    version: string;
    groups: readonly {
      retirementPayerId: string;
      personIds: readonly string[];
      sourceAwardIds: readonly string[];
      savedCoveredMonthsByPerson: Readonly<Record<string, number>>;
      nominalRecipientMonthlyMinor: number;
      annualEnvelopeMinor: number;
      contributorId: string;
      contractId: string;
      monthlyFundingMinor: number;
      dueAt: string;
      endsAt: string;
    }[];
    ignoredIncomeContractIds: readonly string[];
    addedContractIds: readonly string[];
    contributorAccounts: readonly {
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
    nominalAnnualAwardsMinor: number;
    boundedAnnualEnvelopeMinor: number;
    allocatedAnnualEnvelopeMinor: number;
    scheduledFundingMinor: number;
    unallocatedRoundingMinor: number;
    parameterKeys: readonly string[];
    flowEvidence: OpeningRetirementFundingData["flowEvidence"];
    gaps: readonly string[];
  };
}

function canonical(value: unknown): string | undefined {
  if (Array.isArray(value)) return JSON.stringify(value.map(canonical));
  if (value !== null && typeof value === "object")
    return JSON.stringify(
      Object.entries(value)
        .filter(([, row]) => row !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, row]) => [key, canonical(row)]),
    );
  return JSON.stringify(value);
}

/** Pure one-time WHO/terms admission. Only the canonical finance writer later moves cash. */
export function buildOpeningRetirementFunding(
  input: OpeningIncomeInput,
  options: OpeningRetirementFundingOptions = {},
): OpeningRetirementFundingBuild {
  const data = options.data ?? DEFAULT_OPENING_RETIREMENT_FUNDING_DATA;
  const registry = options.parameters ?? PARAMETERS;
  const p = (key: string) => parameter(key, registry);
  const zero = p("zero"),
    one = p("one"),
    months = p("monthsPerYear");
  const value = Object.fromEntries(
    Object.entries(data.parameters).map(([key, ref]) => [key, p(ref)]),
  );
  const opening = makeIsoDate(input.startedAt);
  const marker = stopgap(data.stopgapId);
  const minor = (amount: number, label: string): number => {
    if (!Number.isSafeInteger(amount) || amount < zero)
      throw new Error(
        `Opening retirement funding requires safe nonnegative minor units: ${label}`,
      );
    return amount;
  };
  const sum = (left: number, right: number, label: string) =>
    minor(left + right, label);
  const source = (row: Source, label: string): void => {
    if (
      !row ||
      !["SOURCED", "ESTIMATED"].includes(row.tag) ||
      !row.citation.trim() ||
      makeIsoDate(row.asOf) > opening
    )
      throw new Error(
        `Opening retirement funding requires a dated nonfuture source: ${label}`,
      );
  };
  if (
    !Number.isSafeInteger(zero) ||
    !Number.isSafeInteger(one) ||
    one <= zero ||
    !Number.isSafeInteger(months) ||
    months <= one ||
    value.windowMonths !== months ||
    value.periodMonths !== one ||
    value.envelopeShare! < zero ||
    value.envelopeShare! > one ||
    value.openingLiquidShare! < zero ||
    value.openingLiquidShare! > one
  )
    throw new Error(
      "Invalid bounded annual retirement funding units or allocation prior.",
    );
  minor(value.nationalAnnualOutlayMinor!, "published annual source cap");
  if (value.nationalAnnualOutlayMinor! <= zero)
    throw new Error("Missing positive public funding-flow context.");
  const unique = <T extends { id: string }>(
    rows: readonly T[],
    label: string,
  ) => {
    const result = new Map<string, T>();
    for (const row of rows) {
      if (!row.id || result.has(row.id))
        throw new Error(`Duplicate ${label}: ${row.id}`);
      result.set(row.id, row);
    }
    return result;
  };
  const people = unique(input.people, "funding person"),
    organizations = unique(input.organizations, "funding account");
  const households = unique(input.households, "funding household");
  const contracts = unique(input.finance?.contracts ?? [], "funding contract");
  const operatingAccounts = new Set(
    (input.finance?.businesses ?? []).map((row) => row.organizationId),
  );
  let originalPeopleCash = zero,
    originalOrganizationCash = zero;
  for (const row of people.values()) {
    if (organizations.has(row.id))
      throw new Error("Ambiguous funding cash endpoint.");
    originalPeopleCash = sum(
      originalPeopleCash,
      minor(row.liquidMinor, row.id),
      "original person cash",
    );
  }
  for (const row of organizations.values()) {
    source(row.source, row.id);
    originalOrganizationCash = sum(
      originalOrganizationCash,
      minor(row.liquidMinor, row.id),
      "original organization cash",
    );
  }
  const accounts = new Map(organizations);
  for (const row of options.recordedContributors ?? []) {
    source(row.source, row.id);
    minor(row.liquidMinor, row.id);
    if (people.has(row.id))
      throw new Error("Contributor collides with person cash identity.");
    const existing = accounts.get(row.id);
    if (existing && canonical(existing) !== canonical(row))
      throw new Error(`Conflicting recorded contributor ID: ${row.id}`);
    accounts.set(row.id, row);
  }
  const calendarAfterMonths = (at: string, count: number): string => {
    const [y, m, d] = makeIsoDate(at).split("-");
    const index = Number(m) - one + count;
    const year = Number(y) + Math.floor(index / months),
      month = (index % months) + one;
    const first = isoDateFromParts(year, month, one);
    const last = new Date(`${first}T00:00:00.000Z`);
    last.setUTCMonth(last.getUTCMonth() + one);
    last.setUTCDate(zero);
    return isoDateFromParts(
      year,
      month,
      Math.min(Number(d), last.getUTCDate()),
    );
  };
  type Group = {
    payer: OrganizationInput;
    monthlyMinor: number;
    dueAt: string;
    personIds: Set<string>;
    awardIds: Set<string>;
    coveredMonths: Record<string, number>;
  };
  const groups = new Map<string, Group>(),
    seenAwards = new Set<string>(),
    ignored: string[] = [];
  for (const contract of [...contracts.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const income = contract.recipientIncome;
    if (!income || !data.incomeKindIds.includes(income.kindId)) continue;
    if (contract.payerIds.length !== one)
      throw new Error("Retirement income needs one recorded segregated payer.");
    const payer = organizations.get(contract.payerIds[zero]!);
    if (!payer || payer.id === income.personId)
      throw new Error("Absent or ambiguous retirement payer.");
    if (
      !data.eligiblePayerClassifications.includes(payer.classification ?? "") ||
      operatingAccounts.has(payer.id)
    ) {
      ignored.push(contract.id);
      continue;
    }
    const person = people.get(income.personId),
      home = households.get(income.householdId);
    const award = person?.pastFacts?.find(
      (row) => row.id === income.sourceFactId,
    );
    const fields = award?.facts;
    if (
      !person ||
      contract.payeeId !== person.id ||
      person.householdId !== income.householdId ||
      !home ||
      home.placeId !== person.placeId ||
      !home.memberIds.includes(person.id) ||
      !award ||
      !DEFAULT_OPENING_INCOME_DATA.recordedMonthlyAwardKinds.includes(
        award.kind,
      ) ||
      fields?.status !== DEFAULT_OPENING_INCOME_DATA.awardStatus ||
      fields.payerId !== payer.id ||
      Number(fields.monthlyMinor) !== contract.amountMinor ||
      (fields.kindId !== undefined && fields.kindId !== income.kindId) ||
      (fields.householdId !== undefined &&
        fields.householdId !== person.householdId) ||
      (fields.placeId !== undefined && fields.placeId !== person.placeId) ||
      contract.accruesArrears ||
      contract.salesReceiptBudget ||
      contract.marketAdjusted ||
      contract.periodMonths !== one
    )
      throw new Error(
        "Funding contradicts actual retirement recipient, saved award or monthly term.",
      );
    if (
      !DEFAULT_OPENING_INCOME_DATA.awardKinds.includes(award.kind) &&
      (fields.basis !== DEFAULT_OPENING_INCOME_DATA.recordedStandingBasis ||
        fields.paymentMedium !==
          DEFAULT_OPENING_INCOME_DATA.recordedPaymentMedium)
    )
      throw new Error(
        "Retirement funding requires saved cash standing-entitlement evidence for a generic monthly award.",
      );
    source(award.source, award.id);
    source(contract.source, contract.id);
    if (makeIsoDate(award.date) < person.birthDate || award.date >= opening)
      throw new Error("Retirement award is not a pre-start lifetime record.");
    const covered = fields.coverageFactId
      ? person.pastFacts?.find((row) => row.id === fields.coverageFactId)
      : undefined;
    const claim = fields.claimFactId
      ? person.pastFacts?.find((row) => row.id === fields.claimFactId)
      : undefined;
    if (
      (fields.coverageFactId || fields.claimFactId) &&
      (!covered ||
        !claim ||
        !DEFAULT_OPENING_INCOME_DATA.coverageKinds.includes(covered.kind) ||
        !DEFAULT_OPENING_INCOME_DATA.claimKinds.includes(claim.kind) ||
        covered.facts?.status !== DEFAULT_OPENING_INCOME_DATA.coveredStatus ||
        claim.facts?.status !== DEFAULT_OPENING_INCOME_DATA.claimStatus ||
        claim.facts.coverageFactId !== covered.id ||
        claim.date > award.date ||
        claim.date >= opening ||
        makeIsoDate(covered.facts.endedAt ?? "") > claim.date ||
        makeIsoDate(covered.facts.startedAt ?? "") < person.birthDate)
    )
      throw new Error(
        "Retirement funding has contradictory covered-work/claim references.",
      );
    if (covered && claim) {
      source(covered.source, covered.id);
      source(claim.source, claim.id);
      if (
        makeIsoDate(covered.date) < person.birthDate ||
        covered.date > makeIsoDate(claim.date) ||
        claim.date < person.birthDate
      )
        throw new Error(
          "Retirement funding has contradictory covered-work/claim dates.",
        );
      const workStarts = makeIsoDate(covered.facts!.startedAt!),
        workEnds = makeIsoDate(covered.facts!.endedAt!);
      const coveredMonths = minor(
        Number(covered.facts!.coveredMonths),
        "qualified saved covered months",
      );
      if (
        workStarts >= workEnds ||
        coveredMonths <
          p(DEFAULT_OPENING_INCOME_DATA.parameters.minimumCoveredMonths) ||
        coveredMonths >
          Math.ceil(
            (daysBetween(workStarts, workEnds) / p("daysPerMeanYear")) * months,
          )
      )
        throw new Error(
          "Retirement funding has contradictory covered-work extent.",
        );
    }
    const key = JSON.stringify([person.id, award.id]);
    if (seenAwards.has(key))
      throw new Error("Duplicate funding of one retirement award.");
    seenAwards.add(key);
    const at = makeIsoDate(contract.dueAt);
    if (at < opening)
      throw new Error("Opening retirement payment is already overdue.");
    if (contract.endsAt !== undefined && makeIsoDate(contract.endsAt) <= at)
      throw new Error(
        "Retirement income term has no admitted future due window.",
      );
    minor(contract.amountMinor, contract.id);
    const group: Group = groups.get(payer.id) ?? {
      payer,
      monthlyMinor: zero,
      dueAt: at,
      personIds: new Set<string>(),
      awardIds: new Set<string>(),
      coveredMonths: {},
    };
    group.monthlyMinor = sum(
      group.monthlyMinor,
      contract.amountMinor,
      "saved monthly awards",
    );
    if (at < group.dueAt) group.dueAt = at;
    group.personIds.add(person.id);
    group.awardIds.add(award.id);
    if (covered)
      group.coveredMonths[person.id] = minor(
        Number(covered.facts!.coveredMonths),
        "saved covered months",
      );
    groups.set(payer.id, group);
  }
  const orderedGroups = [...groups.values()].sort((a, b) =>
    a.payer.id.localeCompare(b.payer.id),
  );
  const nominalAnnual = orderedGroups.reduce(
    (total, group) =>
      sum(
        total,
        minor(group.monthlyMinor * value.windowMonths!, "annual award plan"),
        "combined annual award plan",
      ),
    zero,
  );
  const boundedAnnual = Math.min(
    minor(
      Math.floor(nominalAnnual * value.envelopeShare!),
      "authored annual envelope",
    ),
    value.nationalAnnualOutlayMinor!,
  );
  const generatedSource = (detail: string): Source => ({
    tag: "ESTIMATED",
    asOf: opening,
    citation: data.citation,
    estimatedFrom: `${detail} ${marker.whatItFakes}`,
    generationPriorVintage: data.flowEvidence.sourceVintage,
  });
  const id = (prefix: string, payerId: string) =>
    `${prefix}:${stableHash(JSON.stringify([data.version, input.seed, opening, payerId]))}`;
  let externalPlace = options.contributorPlace;
  const resolveExternalPlace = (): OpeningIncomePlace => {
    if (!externalPlace) {
      const actual = seatOfGovernmentPlace(data.contributorJurisdictionKey);
      if (!actual)
        throw new Error("No canonical named external contributor place.");
      externalPlace = {
        id: actual.place.context.jurisdiction.id,
        name: actual.place.displayName,
        source: {
          tag: "SOURCED",
          asOf: opening,
          citation: `Canonical seat-of-government place record for ${actual.jurisdictionKey}; recent place identity, not historical account existence.`,
        },
      };
    }
    source(externalPlace.source, externalPlace.id);
    if (!externalPlace.id || !externalPlace.name.trim())
      throw new Error(
        "External contributor place must resolve its real named record.",
      );
    return externalPlace;
  };
  const resultGroups: OpeningRetirementFundingBuild["receipt"]["groups"][number][] =
    [];
  const addedContracts: string[] = [],
    usedContributors = new Set<string>();
  let allocatedAnnual = zero,
    scheduledFunding = zero;
  for (const group of orderedGroups) {
    if (group.monthlyMinor === zero) continue;
    const annual = minor(
      group.monthlyMinor * value.windowMonths!,
      "group annual awards",
    );
    const envelope = minor(
      Number((BigInt(boundedAnnual) * BigInt(annual)) / BigInt(nominalAnnual)),
      "group annual envelope",
    );
    const monthly = minor(
      Math.floor(envelope / value.windowMonths!),
      "monthly funding terms",
    );
    const endsAt = calendarAfterMonths(group.dueAt, value.windowMonths!);
    calendarAfterMonths(group.dueAt, value.periodMonths!);
    const contributorId =
      options.contributorIdByPayer?.[group.payer.id] ??
      id(data.contributorIdPrefix, group.payer.id);
    let contributor = accounts.get(contributorId);
    if (options.contributorIdByPayer?.[group.payer.id] && !contributor)
      throw new Error("Recorded funding contributor is absent.");
    if (!options.contributorIdByPayer?.[group.payer.id]) {
      const at = resolveExternalPlace();
      const stock = minor(
        Math.floor(envelope * value.openingLiquidShare!),
        "new contributor opening liquid allocation",
      );
      const proposed: OrganizationInput = {
        id: contributorId,
        placeId: at.id,
        name: data.contributorNameTemplate
          .replace("{publisher}", data.flowEvidence.publisher)
          .replace("{payerName}", group.payer.name),
        kind: data.contributorKind,
        classification: data.contributorClassification,
        liquidMinor: stock,
        source: generatedSource(
          `Finite new cash allocation ${stock} minor units from annual saved-award envelope ${envelope}; opening liquid share ${value.openingLiquidShare}. This is an authored allocation, not national reserve assets turned into cash. The payer's existing cash remains separately preserved.`,
        ),
        governmentFacts: {
          retirementFundingVersion: data.version,
          retirementPayerId: group.payer.id,
          annualEnvelopeMinor: String(envelope),
          openingLiquidShare: String(value.openingLiquidShare),
          fundingStartsAt: group.dueAt,
          fundingEndsAt: endsAt,
          sourceAwardDigest: stableHash(
            JSON.stringify([...group.awardIds].sort()),
          ),
          publicFlowSourceFile: data.flowEvidence.sourceFile,
          publicFlowSourceField: data.flowEvidence.sourceField,
          identityBasis: data.identityBasis,
          stopgapId: marker.id,
        },
      };
      if (contributor && canonical(contributor) !== canonical(proposed))
        throw new Error(
          `Conflicting generated contributor ID: ${contributorId}`,
        );
      contributor ??= proposed;
      accounts.set(contributorId, contributor);
    }
    if (
      !contributor ||
      contributor.id === group.payer.id ||
      people.has(contributor.id) ||
      operatingAccounts.has(contributor.id) ||
      !data.contributorKinds.includes(contributor.kind)
    )
      throw new Error(
        "Funding needs an actual distinct nonoperating public contributor account.",
      );
    source(contributor.source, contributor.id);
    minor(contributor.liquidMinor, contributor.id);
    const contractId = id(data.contractIdPrefix, group.payer.id);
    const contract: OpeningRetirementFundingContract = {
      id: contractId,
      payerIds: [contributor.id],
      payeeId: group.payer.id,
      kind: data.contractKind,
      amountMinor: monthly,
      dueAt: group.dueAt,
      endsAt,
      periodMonths: value.periodMonths!,
      accruesArrears: false,
      marketAdjusted: false,
      salesReceiptBudget: false,
      salesReceipt: false,
      settlementPhaseId: data.settlementPhaseId,
      source: generatedSource(
        `Saved eligible award/person portfolio ${[...group.awardIds].sort().join(", ")} bounds a one-year nominal funding envelope. Published flow is contextual and a global upper cap; portfolio allocation and liquidity are authored, not observed 2021 appropriation or tax receipts.`,
      ),
    };
    const prior = contracts.get(contractId);
    if (prior && canonical(prior) !== canonical(contract))
      throw new Error(
        `Conflicting retirement funding contract ID: ${contractId}`,
      );
    if (!prior) {
      contracts.set(contractId, contract);
      addedContracts.push(contractId);
    }
    usedContributors.add(contributor.id);
    allocatedAnnual = sum(
      allocatedAnnual,
      envelope,
      "allocated annual funding envelope",
    );
    scheduledFunding = sum(
      scheduledFunding,
      monthly * value.windowMonths!,
      "scheduled annual funding terms",
    );
    resultGroups.push({
      retirementPayerId: group.payer.id,
      personIds: [...group.personIds].sort(),
      sourceAwardIds: [...group.awardIds].sort(),
      savedCoveredMonthsByPerson: group.coveredMonths,
      nominalRecipientMonthlyMinor: group.monthlyMinor,
      annualEnvelopeMinor: envelope,
      contributorId: contributor.id,
      contractId,
      monthlyFundingMinor: monthly,
      dueAt: group.dueAt,
      endsAt,
    });
  }
  const extra = [...usedContributors]
    .filter((key) => !organizations.has(key))
    .sort()
    .map((key) => accounts.get(key)!);
  const addedCash = extra.reduce(
    (total, row) =>
      sum(total, row.liquidMinor, "disclosed new contributor stocks"),
    zero,
  );
  sum(
    sum(
      originalPeopleCash,
      originalOrganizationCash,
      "original combined funding-stage cash",
    ),
    addedCash,
    "enriched total cash",
  );
  const output: OpeningIncomeInput = {
    ...input,
    organizations: extra.length
      ? [...input.organizations, ...extra]
      : input.organizations,
    ...(input.finance
      ? {
          finance: {
            ...input.finance,
            contracts: [...contracts.values()],
            gaps: [...new Set([...input.finance.gaps, ...data.gaps])],
          },
        }
      : {}),
    gaps: [...new Set([...input.gaps, ...data.gaps])],
  };
  return {
    input: output,
    receipt: {
      version: data.version,
      groups: resultGroups,
      ignoredIncomeContractIds: ignored,
      addedContractIds: addedContracts,
      contributorAccounts: [...usedContributors].sort().map((key) => {
        const row = accounts.get(key)!;
        return {
          id: row.id,
          name: row.name,
          placeId: row.placeId,
          added: !organizations.has(key),
          openingLiquidMinor: row.liquidMinor,
          source: row.source,
        };
      }),
      originalPeopleCashMinor: originalPeopleCash,
      originalOrganizationCashMinor: originalOrganizationCash,
      addedOpeningLiquidMinor: addedCash,
      nominalAnnualAwardsMinor: nominalAnnual,
      boundedAnnualEnvelopeMinor: boundedAnnual,
      allocatedAnnualEnvelopeMinor: allocatedAnnual,
      scheduledFundingMinor: scheduledFunding,
      unallocatedRoundingMinor: boundedAnnual - allocatedAnnual,
      parameterKeys: Object.values(data.parameters),
      flowEvidence: data.flowEvidence,
      gaps: data.gaps,
    },
  };
}
