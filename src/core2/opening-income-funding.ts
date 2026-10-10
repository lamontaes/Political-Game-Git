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

/** Producer linkage only; the root finance provider admits each genuine due source. */
export interface OpeningRetirementExternalInflow {
  kind: string;
  /** Organization owner ID; the journal provider resolves the actual account. */
  ownerId: string;
  incomeContractIds: readonly string[];
  sourceAwardIds: readonly string[];
  source: Source;
}

/** An outside payment is a flow; this descriptor creates no cash or authority. */
export interface OpeningRetirementFundingContract extends OpeningIncomeContract {
  salesReceipt: boolean;
  /** Only an actual supplied income-term end; no invented annual cutoff. */
  endsAt?: string;
  externalInflow: OpeningRetirementExternalInflow;
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
  externalFlow: {
    kind: string;
    ownerSubject: string;
    openingCashBasis: string;
    identityCitation: string;
    identityAsOf: string;
    identityVintage: string;
  };
  contributorKinds: readonly string[];
  eligiblePayerClassifications: readonly string[];
  incomeKindIds: readonly string[];
  parameters: { periodMonths: string };
  flowEvidence: {
    publisher: string;
    title: string;
    url: string;
    sourceFile: string;
    sourceField: string;
    sourceVintage: string;
    publishedAt: string;
    financialKind: string;
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
  /** Existing zero-cash outside-flow owners; unused records are not appended. */
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
      incomeContractIds: readonly string[];
      savedCoveredMonthsByPerson: Readonly<Record<string, number>>;
      nominalRecipientMonthlyMinor: number;
      contributorId: string;
      contractId: string;
      monthlyFundingMinor: number;
      dueAt: string;
      endsAt?: string;
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
      accountingBasis: "external-net-flow";
    }[];
    externalFlow: {
      kind: string;
      ownerId?: string;
      openingStockMinor: number;
      accountingBasis: "external-net-flow";
      kernelAdmission: "PENDING";
    };
    originalPeopleCashMinor: number;
    originalOrganizationCashMinor: number;
    addedOpeningLiquidMinor: number;
    nominalMonthlyAwardsMinor: number;
    scheduledMonthlyFundingMinor: number;
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

/** Pure WHO/terms producer. Incoming flow and balanced posting remain root obligations. */
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
    value.periodMonths !== one
  )
    throw new Error("Invalid monthly outside retirement funding cadence.");
  if (
    data.flowEvidence.financialKind !== "ANNUAL_EXPENDITURE_FLOW" ||
    makeIsoDate(data.flowEvidence.sourceVintage) > opening ||
    !data.flowEvidence.url.trim() ||
    !data.externalFlow.kind.trim() ||
    !data.externalFlow.ownerSubject.trim() ||
    data.externalFlow.openingCashBasis !== "zero-opening-flow-boundary" ||
    makeIsoDate(data.externalFlow.identityAsOf) > opening ||
    !data.externalFlow.identityCitation.trim()
  )
    throw new Error("Outside retirement flow requires dated typed evidence.");
  // Later publication is retrospective research, never opening actor knowledge.
  makeIsoDate(data.flowEvidence.publishedAt);
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
    incomeContractIds: Set<string>;
    scheduleKey: string;
    incomeEndsAt?: string;
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
    const scheduleKey = JSON.stringify([
      payer.id,
      at,
      contract.periodMonths,
      contract.endsAt ?? null,
    ]);
    const group: Group = groups.get(scheduleKey) ?? {
      payer,
      monthlyMinor: zero,
      dueAt: at,
      personIds: new Set<string>(),
      awardIds: new Set<string>(),
      coveredMonths: {},
      incomeContractIds: new Set<string>(),
      scheduleKey,
      ...(contract.endsAt === undefined
        ? {}
        : { incomeEndsAt: makeIsoDate(contract.endsAt) }),
    };
    group.monthlyMinor = sum(
      group.monthlyMinor,
      contract.amountMinor,
      "saved monthly awards",
    );
    // Keep exact schedules separate; a later award cannot be funded early.
    group.incomeContractIds.add(contract.id);
    group.personIds.add(person.id);
    group.awardIds.add(award.id);
    if (covered)
      group.coveredMonths[person.id] = minor(
        Number(covered.facts!.coveredMonths),
        "saved covered months",
      );
    groups.set(scheduleKey, group);
  }
  const orderedGroups = [...groups.values()].sort((a, b) =>
    a.scheduleKey.localeCompare(b.scheduleKey),
  );
  const nominalMonthly = orderedGroups.reduce(
    (total, group) =>
      sum(total, group.monthlyMinor, "saved monthly award terms"),
    zero,
  );
  const generatedSource = (detail: string): Source => ({
    tag: "ESTIMATED",
    asOf: opening,
    citation: data.citation,
    estimatedFrom: `${detail} ${marker.whatItFakes}`,
    generationPriorVintage: `Actual saved income/award source terms and ${data.externalFlow.identityVintage}; annual program spending is research context only and does not size this payment.`,
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
  const explicitOwnerIds = new Set(
    orderedGroups
      .filter((group) => group.monthlyMinor > zero)
      .map((group) => options.contributorIdByPayer?.[group.payer.id])
      .filter((ownerId): ownerId is string => ownerId !== undefined),
  );
  if (explicitOwnerIds.size > one)
    throw new Error(
      "Outside retirement funding uses one shared owner per world.",
    );
  const explicitSharedOwnerId = [...explicitOwnerIds].at(zero);
  if (
    explicitSharedOwnerId !== undefined &&
    (!explicitSharedOwnerId.trim() || !accounts.has(explicitSharedOwnerId))
  )
    throw new Error("Recorded outside-flow owner is absent.");
  const sharedOwnerId =
    explicitSharedOwnerId ??
    id(data.contributorIdPrefix, data.externalFlow.ownerSubject);
  const resultGroups: OpeningRetirementFundingBuild["receipt"]["groups"][number][] =
    [];
  const addedContracts: string[] = [],
    usedContributors = new Set<string>();
  let scheduledMonthly = zero;
  for (const group of orderedGroups) {
    if (group.monthlyMinor === zero) continue;
    const monthly = group.monthlyMinor;
    // Only source-owned income terms determine amount and duration.
    // No national annual flow, allocation share or year-survival window changes either.
    calendarAfterMonths(group.dueAt, value.periodMonths!);
    const contributorId = sharedOwnerId;
    let contributor = accounts.get(contributorId);
    const at = resolveExternalPlace();
    const outsideFlow: Source = {
      tag: "ESTIMATED",
      asOf: opening,
      citation: data.externalFlow.identityCitation,
      estimatedFrom:
        "One modeled outside-payment owner per world. Zero cash is an accounting boundary, not observed Treasury liquidity. Its genuine due terms and referenced awards must be resolved by the owning finance provider. National cash, annual outlays, securities and tax forecasts supply no opening stock. Individual eligibility and allocation remain estimated.",
      generationPriorVintage: data.externalFlow.identityVintage,
    };
    // The root-owned OrganizationInput seam adds outsideFlow?: Source.
    // This local intersection keeps the producer candidate against the exact API8 preimage.
    const proposed: OrganizationInput & { outsideFlow: Source } = {
      id: contributorId,
      placeId: at.id,
      name: data.contributorNameTemplate,
      kind: data.contributorKind,
      classification: data.contributorClassification,
      liquidMinor: zero,
      source: outsideFlow,
      outsideFlow,
      governmentFacts: {
        retirementFundingVersion: data.version,
        externalFlowKind: data.externalFlow.kind,
        externalFlowOwnerSubject: data.externalFlow.ownerSubject,
        openingCashBasis: data.externalFlow.openingCashBasis,
        identityBasis: data.identityBasis,
        stopgapId: marker.id,
      },
    };
    if (explicitSharedOwnerId === undefined) {
      if (contributor && canonical(contributor) !== canonical(proposed))
        throw new Error(
          `Conflicting generated outside-flow owner ID: ${contributorId}`,
        );
      contributor ??= proposed;
      accounts.set(contributorId, contributor);
    }
    const ownerFlow = (
      contributor as (OrganizationInput & { outsideFlow?: Source }) | undefined
    )?.outsideFlow;
    if (
      !contributor ||
      !ownerFlow ||
      contributor.id === group.payer.id ||
      people.has(contributor.id) ||
      operatingAccounts.has(contributor.id) ||
      !data.contributorKinds.includes(contributor.kind) ||
      contributor.classification !== data.contributorClassification ||
      contributor.liquidMinor !== zero ||
      contributor.governmentFacts?.externalFlowKind !==
        data.externalFlow.kind ||
      contributor.governmentFacts.externalFlowOwnerSubject !==
        data.externalFlow.ownerSubject ||
      contributor.governmentFacts.openingCashBasis !==
        data.externalFlow.openingCashBasis
    )
      throw new Error(
        "Outside funding requires one actual zero-cash nonoperating outside-flow owner.",
      );
    source(contributor.source, contributor.id);
    source(ownerFlow, `${contributor.id}:outsideFlow`);
    usedContributors.add(contributor.id);
    const contractId = id(data.contractIdPrefix, group.scheduleKey);
    const incomeContractIds = [...group.incomeContractIds].sort();
    const sourceAwardIds = [...group.awardIds].sort();
    const contractSource = generatedSource(
      `Saved due schedule ${group.dueAt}, payer ${group.payer.id}, income contracts ${incomeContractIds.join(", ")} and awards ${sourceAwardIds.join(", ")} support exact dated modeled obligations. National expenditure is research context only; it supplies no stock, allocation, cap or invented end.`,
    );
    const contract: OpeningRetirementFundingContract = {
      id: contractId,
      payerIds: [contributor.id],
      payeeId: group.payer.id,
      kind: data.contractKind,
      amountMinor: monthly,
      dueAt: group.dueAt,
      ...(group.incomeEndsAt === undefined
        ? {}
        : { endsAt: group.incomeEndsAt }),
      periodMonths: value.periodMonths!,
      accruesArrears: false,
      marketAdjusted: false,
      salesReceiptBudget: false,
      salesReceipt: false,
      settlementPhaseId: data.settlementPhaseId,
      source: contractSource,
      externalInflow: {
        kind: data.externalFlow.kind,
        ownerId: contributor.id,
        incomeContractIds,
        sourceAwardIds,
        source: contractSource,
      },
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
    scheduledMonthly = sum(
      scheduledMonthly,
      monthly,
      "exact scheduled monthly funding terms",
    );
    resultGroups.push({
      retirementPayerId: group.payer.id,
      personIds: [...group.personIds].sort(),
      sourceAwardIds,
      incomeContractIds,
      savedCoveredMonthsByPerson: group.coveredMonths,
      nominalRecipientMonthlyMinor: group.monthlyMinor,
      contributorId: contributor.id,
      contractId,
      monthlyFundingMinor: monthly,
      dueAt: group.dueAt,
      ...(group.incomeEndsAt === undefined
        ? {}
        : { endsAt: group.incomeEndsAt }),
    });
  }
  const extra = [...usedContributors]
    .filter((key) => !organizations.has(key))
    .sort()
    .map((key) => accounts.get(key)!);
  const addedCash = extra.reduce(
    (total, row) =>
      sum(total, row.liquidMinor, "outside-flow opening cash (must stay zero)"),
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
          accountingBasis: "external-net-flow" as const,
        };
      }),
      externalFlow: {
        kind: data.externalFlow.kind,
        ...(usedContributors.size ? { ownerId: sharedOwnerId } : {}),
        openingStockMinor: zero,
        accountingBasis: "external-net-flow",
        kernelAdmission: "PENDING",
      },
      originalPeopleCashMinor: originalPeopleCash,
      originalOrganizationCashMinor: originalOrganizationCash,
      addedOpeningLiquidMinor: addedCash,
      nominalMonthlyAwardsMinor: nominalMonthly,
      scheduledMonthlyFundingMinor: scheduledMonthly,
      parameterKeys: Object.values(data.parameters),
      flowEvidence: data.flowEvidence,
      gaps: data.gaps,
    },
  };
}
