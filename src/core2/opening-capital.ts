/** Fresh opening estimates only. No money writer, contract, world, or runtime top-up. */
import {
  addDays,
  daysBetween,
  isoDateFromParts,
  makeIsoDate,
  yearOf,
} from "../simulation/dates";
import { stableHash } from "../simulation/ids";
import {
  classifyBusiness,
  projectOpeningBusiness,
  type BusinessBooksOptions,
} from "./business-books";
import dataJson from "./data/opening-capital.json" with { type: "json" };
import { OPENING_CUSTOMER_QUALIFICATION_PREFIX } from "./opening-customer-qualification";
import { plannedWorkMinutesBetween } from "./modules/work";
import { parameter, PARAMETERS, type Parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import type {
  CoreInput,
  OrganizationInput,
  Source,
  WorkCommitmentInput,
} from "./types";

export interface OpeningCapitalData {
  version: string;
  source: { citation: string; vintage: string; limit: string };
  excludedOrganizationKinds: readonly string[];
  overallIndustry: string;
  medianDaysParameterByIndustry: Readonly<Record<string, string>>;
  industryByClassification: Readonly<Record<string, string>>;
  stopgapId: string;
  openingPriorNamespace: string;
  tailSpanParameter: string;
  spreadStopgapId: string;
  spreadTargetRef: string;
  unsupportedOpening: {
    stopgapId: string;
    status: string;
    citation: string;
    estimatedFrom: string;
    replacementModules: readonly string[];
  };
}

export const DEFAULT_OPENING_CAPITAL_DATA: OpeningCapitalData = dataJson;

export interface OpeningCapitalOptions {
  data?: OpeningCapitalData;
  books?: BusinessBooksOptions;
  parameters?: Readonly<Record<string, Parameter>>;
}

export interface OpeningCapitalEstimate {
  organizationId: string;
  status:
    | "estimated-private-buffer"
    | "modeled-zero-funded-opening-pending-dated-funding";
  liquidMinor: number;
  source: Source;
  parameterRefs: readonly string[];
  industry?: string;
  overallFallback?: boolean;
  bufferDays?: number;
  startupQuantile?: number;
  observedBufferDays?: {
    percentile25: number;
    median: number;
    percentile75: number;
  };
  estimatedBufferEndpoints?: { low: number; high: number };
  tailSpan?: number;
  from?: string;
  through?: string;
  calendarDays?: number;
  plannedPayrollMinor?: number;
  plannedOtherCostsMinor?: number;
  plannedDailyOutflowMinor?: number;
  commitmentIds?: readonly string[];
  gap?: string;
}

type OpeningCapitalInput = Pick<
  CoreInput,
  "seed" | "startedAt" | "people" | "jobs" | "organizations" | "workCommitments"
>;

export interface OpeningEmployerCashBufferPrior {
  bufferDays: number;
  startupQuantile: number;
  observedBufferDays: {
    percentile25: number;
    median: number;
    percentile75: number;
  };
  estimatedBufferEndpoints: { low: number; high: number };
  tailSpan: number;
  medianParameter: string;
  tailSpanParameter: string;
}

function openingCapitalUnits(registry: Readonly<Record<string, Parameter>>) {
  const zero = parameter("zero", registry);
  const one = parameter("one", registry);
  const two = parameter("two", registry);
  if (
    zero !== zero - zero ||
    one <= zero ||
    one !== Math.sign(one) ||
    two !== one + one
  )
    throw new Error(
      "Opening capital requires exact mathematical unit parameters",
    );
  return { zero, one, two };
}

/**
 * Continuous estimated opening-state quantile curve, not an empirical CDF.
 * Only its q25/median/q75 anchors are observed. Linear interpolation, uniform
 * startup ranks and extrapolated endpoints remain explicit open assumptions.
 * This pure calculator has no future year, deficit, refill or outcome input.
 */
export function openingEmployerCashBufferAtQuantile(
  industry: string,
  startupQuantile: number,
  options: OpeningCapitalOptions = {},
): OpeningEmployerCashBufferPrior {
  const data = options.data ?? DEFAULT_OPENING_CAPITAL_DATA;
  const registry =
    options.parameters ?? options.books?.parameters ?? PARAMETERS;
  const p = (key: string) => parameter(key, registry);
  const { zero, one, two } = openingCapitalUnits(registry);
  if (
    !Number.isFinite(startupQuantile) ||
    startupQuantile < zero ||
    startupQuantile > one
  )
    throw new Error(
      "Opening employer startup quantile must be finite and within the unit interval",
    );
  const medianParameter = data.medianDaysParameterByIndustry[industry];
  const row = medianParameter ? registry[medianParameter] : undefined;
  const spread = row?.spread;
  if (
    !medianParameter ||
    !row ||
    row.tag !== "ESTIMATED" ||
    !row.citation.trim() ||
    !row.estimatedFrom?.trim() ||
    row.stopgapId !== data.stopgapId ||
    row.checkRange !== undefined ||
    !spread ||
    !("low" in spread) ||
    !Number.isFinite(spread.low) ||
    !Number.isFinite(spread.high) ||
    spread.low < zero ||
    !Number.isFinite(row.value) ||
    row.value <= zero ||
    spread.low > row.value ||
    spread.high < row.value ||
    !spread.unit.trim() ||
    !spread.citation.trim()
  )
    throw new Error(
      `Opening capital requires a sourced estimated median and observed spread: ${industry}`,
    );
  const tail = registry[data.tailSpanParameter];
  if (
    !tail ||
    tail.tag !== "TUNABLE" ||
    !tail.citation.trim() ||
    !tail.estimatedFrom?.trim() ||
    tail.stopgapId !== data.spreadStopgapId ||
    !tail.spread ||
    !("status" in tail.spread) ||
    tail.spread.status !== "unmeasured" ||
    !tail.spread.reason.trim() ||
    !tail.checkRange ||
    Object.keys(tail.checkRange).length !== one ||
    tail.checkRange.ref !== data.spreadTargetRef
  )
    throw new Error(
      "Opening employer tail span requires its genuine open TUNABLE source and target",
    );
  const tailSpan = p(data.tailSpanParameter);
  if (tailSpan < zero)
    throw new Error("Opening employer tail span must be nonnegative");
  stopgap(data.stopgapId);
  stopgap(data.spreadStopgapId);
  const median = p(medianParameter);
  const low = Math.max(zero, spread.low - tailSpan * (median - spread.low));
  const high = spread.high + tailSpan * (spread.high - median);
  if (!Number.isFinite(low) || !Number.isFinite(high) || high < spread.high)
    throw new Error(
      "Opening employer estimated tail endpoints must be finite and ordered",
    );
  const quarter = one / (two * two);
  const half = one / two;
  const knots = [
    { quantile: zero, days: low },
    { quantile: quarter, days: spread.low },
    { quantile: half, days: median },
    { quantile: one - quarter, days: spread.high },
    { quantile: one, days: high },
  ];
  let bufferDays = high;
  for (let index = one; index < knots.length; index += one) {
    const right = knots[index]!;
    if (startupQuantile > right.quantile) continue;
    const left = knots[index - one]!;
    bufferDays =
      left.days +
      ((startupQuantile - left.quantile) / (right.quantile - left.quantile)) *
        (right.days - left.days);
    break;
  }
  if (!Number.isFinite(bufferDays) || bufferDays < zero)
    throw new Error("Opening employer buffer must be finite and nonnegative");
  return {
    bufferDays,
    startupQuantile,
    observedBufferDays: {
      percentile25: spread.low,
      median,
      percentile75: spread.high,
    },
    estimatedBufferEndpoints: { low, high },
    tailSpan,
    medianParameter,
    tailSpanParameter: data.tailSpanParameter,
  };
}

/** WHO-only stable startup state; identity inputs never select a later decision. */
export function openingEmployerCashBufferPrior(
  seed: string,
  organizationId: string,
  industry: string,
  options: OpeningCapitalOptions = {},
): OpeningEmployerCashBufferPrior {
  const data = options.data ?? DEFAULT_OPENING_CAPITAL_DATA;
  const registry =
    options.parameters ?? options.books?.parameters ?? PARAMETERS;
  const { zero, one, two } = openingCapitalUnits(registry);
  if (
    typeof seed !== "string" ||
    !seed.trim() ||
    typeof organizationId !== "string" ||
    !organizationId.trim() ||
    !data.openingPriorNamespace.trim()
  )
    throw new Error(
      "Opening employer startup prior requires a world seed, firm identity and domain",
    );
  const radix = parameter("seedPlaceHashRadix", registry);
  const digits = parameter("seedHashDigits", registry);
  const hash = stableHash(
    JSON.stringify([data.openingPriorNamespace, seed, organizationId]),
  );
  const denominator = radix ** digits;
  if (
    radix !== two ** (two * two) ||
    !Number.isSafeInteger(digits) ||
    digits <= zero ||
    digits > hash.length ||
    !Number.isSafeInteger(denominator) ||
    denominator <= one
  )
    throw new Error(
      "Opening employer stable hash requires safe hexadecimal representation parameters",
    );
  const integer = Number.parseInt(hash.slice(zero, digits), radix);
  const startupQuantile = (integer + one / two) / denominator;
  if (
    !Number.isSafeInteger(integer) ||
    integer < zero ||
    integer >= denominator ||
    !Number.isFinite(startupQuantile) ||
    startupQuantile <= zero ||
    startupQuantile >= one
  )
    throw new Error("Opening employer stable startup quantile is invalid");
  return openingEmployerCashBufferAtQuantile(
    industry,
    startupQuantile,
    options,
  );
}

/**
 * The caller explicitly names freshly generated organizations. All other cash
 * balances and sources are preserved, including recorded zero balances. The
 * population adapter is the only production caller; existing inputs and saves
 * never pass through this opening estimate.
 */
export function createOpeningEmployerCapital(
  input: OpeningCapitalInput,
  freshOrganizationIds: ReadonlySet<string>,
  options: OpeningCapitalOptions = {},
): {
  organizations: readonly OrganizationInput[];
  estimates: readonly OpeningCapitalEstimate[];
  gaps: readonly string[];
} {
  const data = options.data ?? DEFAULT_OPENING_CAPITAL_DATA;
  const registry =
    options.parameters ?? options.books?.parameters ?? PARAMETERS;
  const p = (key: string) => parameter(key, registry);
  const { zero, one } = openingCapitalUnits(registry);
  if (freshOrganizationIds.size === zero)
    return { organizations: input.organizations, estimates: [], gaps: [] };
  const at = makeIsoDate(input.startedAt);
  const nextYear = isoDateFromParts(yearOf(at) + one, one, one);
  const through = addDays(nextYear, -one);
  const calendarDays = daysBetween(at, nextYear);
  const booksOptions: BusinessBooksOptions = {
    ...options.books,
    parameters: registry,
  };
  const unique = <T extends { id: string }>(
    rows: readonly T[],
    field: string,
  ) => {
    const result = new Map<string, T>();
    for (const row of rows) {
      if (!row.id || result.has(row.id))
        throw new Error(`Opening capital requires unique ${field}: ${row.id}`);
      result.set(row.id, row);
    }
    return result;
  };
  const organizations = unique(input.organizations, "organization");
  const people = unique(input.people, "person");
  const jobs = unique(input.jobs, "job");
  const commitments = unique(input.workCommitments ?? [], "commitment");
  for (const id of freshOrganizationIds)
    if (!organizations.has(id))
      throw new Error(`Fresh opening organization is missing: ${id}`);
  const minor = (value: number, field: string) => {
    if (!Number.isSafeInteger(value) || value < zero)
      throw new Error(
        `Opening capital requires nonnegative safe minor units: ${field}`,
      );
    return value;
  };
  const validSource = (source: Source, field: string) => {
    if (
      !["SOURCED", "ESTIMATED"].includes(source.tag) ||
      !source.citation.trim() ||
      makeIsoDate(source.asOf) > at
    )
      throw new Error(
        `Opening capital requires a dated nonfuture source: ${field}`,
      );
  };
  const jobsByOrganization = new Map<string, CoreInput["jobs"][number][]>();
  for (const job of jobs.values()) {
    if (!people.has(job.personId) || !organizations.has(job.organizationId))
      throw new Error(
        `Opening capital job has no actual worker/employer: ${job.id}`,
      );
    const rows = jobsByOrganization.get(job.organizationId) ?? [];
    rows.push(job);
    jobsByOrganization.set(job.organizationId, rows);
  }
  const commitmentsByOrganization = new Map<string, WorkCommitmentInput[]>();
  for (const commitment of commitments.values()) {
    const rows = commitmentsByOrganization.get(commitment.organizationId) ?? [];
    rows.push(commitment);
    commitmentsByOrganization.set(commitment.organizationId, rows);
  }
  const estimates: OpeningCapitalEstimate[] = [];
  const gaps = new Set<string>();
  const result = input.organizations.map((organization) => {
    if (!freshOrganizationIds.has(organization.id)) return organization;
    validSource(organization.source, organization.id);
    const organizationJobs = jobsByOrganization.get(organization.id) ?? [];
    const classification = classifyBusiness(
      organization.classification ?? "",
      booksOptions,
    );
    if (
      data.excludedOrganizationKinds.includes(organization.kind) ||
      (organization.governmentFacts &&
        Object.keys(organization.governmentFacts).some(
          (key) => !key.startsWith(OPENING_CUSTOMER_QUALIFICATION_PREFIX),
        )) ||
      !classification.kind
    ) {
      // Explicit unfunded fresh model state, never an observed zero balance.
      // REVIEW16 institution funding belongs to public-budget/national modules.
      const funding = data.unsupportedOpening;
      stopgap(funding.stopgapId);
      if (
        funding.status !==
          "modeled-zero-funded-opening-pending-dated-funding" ||
        !funding.citation.trim() ||
        !funding.estimatedFrom.trim()
      )
        throw new Error(
          "Unsupported opening capital requires its explicit unfunded status and source",
        );
      const liquidMinor = zero;
      const source: Source = {
        tag: "ESTIMATED",
        asOf: at,
        citation: funding.citation,
        estimatedFrom: `${funding.estimatedFrom} Organization identity/classification context only: ${organization.source.citation} ${organization.source.estimatedFrom ?? ""}`,
      };
      const gap = `opening-capital:modeled-zero-funded-pending-dated-funding:${organization.id}`;
      gaps.add(gap);
      estimates.push({
        organizationId: organization.id,
        status: "modeled-zero-funded-opening-pending-dated-funding",
        liquidMinor,
        source,
        parameterRefs: ["zero"],
        gap,
      });
      return { ...organization, liquidMinor, source };
    }
    const currentJobs = new Map(
      organizationJobs
        .filter(
          (job) =>
            job.endsAt === undefined &&
            people.get(job.personId)?.jobId === job.id,
        )
        .map((job) => [job.id, job]),
    );
    const active = new Map<string, WorkCommitmentInput>();
    for (const commitment of commitmentsByOrganization.get(organization.id) ??
      []) {
      const job = currentJobs.get(commitment.jobId);
      if (!job || commitment.personId !== job.personId)
        throw new Error(
          `Opening capital commitment requires its current owned job: ${commitment.id}`,
        );
      const startsAt = makeIsoDate(commitment.startsAt);
      const endsAt = commitment.endsAt
        ? makeIsoDate(commitment.endsAt)
        : undefined;
      makeIsoDate(commitment.anchorDate);
      if (
        startsAt < makeIsoDate(people.get(job.personId)!.birthDate) ||
        (endsAt && endsAt < startsAt)
      )
        throw new Error(
          `Invalid opening capital work interval: ${commitment.id}`,
        );
      if (startsAt > at || (endsAt && endsAt < at)) continue;
      if (active.has(job.id))
        throw new Error(
          `Opening capital requires one active commitment per job: ${job.id}`,
        );
      if (
        !Number.isSafeInteger(commitment.periodDays) ||
        commitment.periodDays <= zero ||
        !Number.isSafeInteger(commitment.hourlyMinor) ||
        commitment.hourlyMinor < zero ||
        !Number.isFinite(commitment.expectedWeeklyMinutes) ||
        commitment.expectedWeeklyMinutes <= zero ||
        commitment.slots.length <= zero
      )
        throw new Error(`Invalid opening capital work plan: ${commitment.id}`);
      const dayMinutes = p("hoursPerDay") * p("minutesPerHour");
      const spans = commitment.slots
        .map((slot) => {
          if (
            !Number.isSafeInteger(slot.offsetDays) ||
            slot.offsetDays < zero ||
            slot.offsetDays >= commitment.periodDays ||
            !Number.isFinite(slot.startMinute) ||
            slot.startMinute < zero ||
            slot.startMinute >= dayMinutes ||
            !Number.isFinite(slot.minutes) ||
            slot.minutes <= zero ||
            slot.minutes > dayMinutes
          )
            throw new Error(
              `Invalid opening capital work minutes: ${commitment.id}`,
            );
          return {
            start: slot.offsetDays * dayMinutes + slot.startMinute,
            minutes: slot.minutes,
          };
        })
        .sort((left, right) => left.start - right.start);
      for (const [index, span] of spans.entries()) {
        const next =
          spans[index + one]?.start ??
          spans[zero]!.start + commitment.periodDays * dayMinutes;
        if (span.start + span.minutes > next)
          throw new Error(
            `Opening capital periodic slots overlap: ${commitment.id}`,
          );
      }
      validSource(commitment.scheduleSource, commitment.id);
      validSource(commitment.paySource, commitment.id);
      validSource(job.source, job.id);
      active.set(job.id, commitment);
    }
    for (const job of currentJobs.values())
      if (!active.has(job.id))
        throw new Error(
          `Opening capital requires recorded scheduled payroll: ${job.id}`,
        );
    let plannedPayrollMinor = zero;
    const payrollCitations = new Set<string>();
    for (const commitment of active.values()) {
      const payMinor = minor(
        Math.round(
          (plannedWorkMinutesBetween(commitment, at, through, registry) /
            p("minutesPerHour")) *
            commitment.hourlyMinor,
        ),
        commitment.id,
      );
      plannedPayrollMinor = minor(
        plannedPayrollMinor + payMinor,
        organization.id,
      );
      payrollCitations.add(commitment.scheduleSource.citation);
      payrollCitations.add(commitment.paySource.citation);
    }
    const projected = projectOpeningBusiness(
      {
        organizationId: organization.id,
        classification: organization.classification ?? "",
        at,
        annualPlannedPayMinor: plannedPayrollMinor,
        existingCashMinor: zero,
        source: {
          ...organization.source,
          citation: [organization.source.citation, ...payrollCitations].join(
            " ",
          ),
        },
      },
      booksOptions,
    );
    if (!projected.books)
      throw new Error(`Opening capital books are unbound: ${organization.id}`);
    const industry =
      data.industryByClassification[organization.classification ?? ""] ??
      data.overallIndustry;
    const prior = openingEmployerCashBufferPrior(
      input.seed,
      organization.id,
      industry,
      options,
    );
    const { bufferDays, medianParameter, tailSpanParameter } = prior;
    const row = registry[medianParameter]!;
    const tail = registry[tailSpanParameter]!;
    const plannedOtherCostsMinor = projected.books.annualOtherCostsMinor;
    const plannedDailyOutflowMinor =
      (plannedPayrollMinor + plannedOtherCostsMinor) / calendarDays;
    const liquidMinor = minor(
      Math.round(plannedDailyOutflowMinor * bufferDays),
      organization.id,
    );
    const source: Source = {
      tag: "ESTIMATED",
      asOf: at,
      generationPriorVintage: `${data.source.vintage}; ${projected.books.source.generationPriorVintage}`,
      citation: `${projected.books.source.citation} ${data.source.citation} ${row.citation} ${tail.citation}`,
      estimatedFrom: `Fresh generated opening WHO stock: ${bufferDays} ${industry} cash-buffer days at stable firm startup quantile ${prior.startupQuantile}, times planned payroll plus compatible IRS accounting-cost proxy per actual calendar day from ${at} through ${through}. Scheduled terms are plans, not future paid wages. ${data.source.limit} ${projected.books.source.estimatedFrom} Real observed q25/median/q75 anchors are ${prior.observedBufferDays.percentile25}/${prior.observedBufferDays.median}/${prior.observedBufferDays.percentile75} days. Uniform identity-keyed ranks, continuous piecewise-linear interpolation and estimated endpoints ${prior.estimatedBufferEndpoints.low}/${prior.estimatedBufferEndpoints.high} days with tail span ${prior.tailSpan} are unmeasured assumptions, not observed minima/maxima or a fitted full distribution. No individual cash measurement, survival floor or identified owner-capital contribution is established.`,
    };
    gaps.add(
      `opening-capital:cash-debit-denominator-and-individual-crosswalk-unmeasured:${organization.id}`,
    );
    gaps.add(
      `opening-capital:startup-quantile-shape-and-tails-unmeasured:${organization.id}`,
    );
    estimates.push({
      organizationId: organization.id,
      status: "estimated-private-buffer",
      liquidMinor,
      source,
      parameterRefs: [
        medianParameter,
        tailSpanParameter,
        classification.kind.marginParameter,
        classification.kind.payrollShareParameter,
      ],
      industry,
      overallFallback: !Object.hasOwn(
        data.industryByClassification,
        organization.classification ?? "",
      ),
      bufferDays,
      startupQuantile: prior.startupQuantile,
      observedBufferDays: prior.observedBufferDays,
      estimatedBufferEndpoints: prior.estimatedBufferEndpoints,
      tailSpan: prior.tailSpan,
      from: at,
      through,
      calendarDays,
      plannedPayrollMinor,
      plannedOtherCostsMinor,
      plannedDailyOutflowMinor,
      commitmentIds: [...active.values()].map((row) => row.id),
    });
    return { ...organization, liquidMinor, source };
  });
  return { organizations: result, estimates, gaps: [...gaps] };
}
