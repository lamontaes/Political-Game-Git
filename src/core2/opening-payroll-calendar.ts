/** Fresh opening WHO payroll calendars. This producer never earns or pays wages. */
import rows from "./data/opening-payroll-calendar.json" with { type: "json" };
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import type { IsoDate } from "./kernel/brands";
import { stableHash } from "./kernel/ids";
import { OPENING_CUSTOMER_QUALIFICATION_PREFIX } from "./opening-customer-qualification";
import { parameter, PARAMETERS, type Parameter } from "./parameters";
import type { WorkPayrollCalendarInput } from "./work-pay-period";
import type {
  CoreInput,
  OrganizationInput,
  Source,
  WorkCommitmentInput,
} from "./types";

export type OpeningPayrollFrequency =
  "weekly" | "biweekly" | "semimonthly" | "monthly";
interface FrequencyWeight {
  frequency: OpeningPayrollFrequency;
  weightParameter: string;
}
interface PayrollPrimarySource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  availableAt: string;
  publicationDate?: string;
  publicationMonth?: string;
  reference: string;
}
export interface OpeningPayrollCalendarData {
  version: string;
  stopgapId: string;
  targetRef: string;
  priorNamespace: string;
  calendarIdPrefix: string;
  parameterRefs: {
    phaseSpan: string;
    lagDays: string;
    monthlyBoundary: string;
    semimonthlyFirstBoundary: string;
    semimonthlySecondBoundary: string;
  };
  frequencyGroups: Readonly<Record<string, readonly FrequencyWeight[]>>;
  industryByClassification: Readonly<Record<string, string>>;
  educationClassifications: readonly string[];
  educationKinds: readonly string[];
  farmClassifications: readonly string[];
  governmentKinds: readonly string[];
  governmentClassificationPrefixes: readonly string[];
  governmentIdentityKinds: readonly string[];
  privateClassificationPrefixes: readonly string[];
  privateSourceId: string;
  educationSourceId: string;
  sources: Readonly<Record<string, PayrollPrimarySource>>;
  governmentProxy: {
    sourceId: string;
    firstPeriodStartsAt: string;
    firstPaydayAt: string;
    frequency: "biweekly";
    nonbusinessDayRule: "no-adjustment";
    limitation: string;
  };
  nonbusinessDayRule: "no-adjustment";
  arrearsRule: "carry-to-next-recorded-payday";
  shortMonthRule: "clamp-to-calendar-month-end";
  scopeNotes: readonly string[];
  unmeasuredConventions: string;
}
export const DEFAULT_OPENING_PAYROLL_CALENDAR_DATA =
  rows as OpeningPayrollCalendarData;
export const OPENING_PAYROLL_CALENDAR_STOPGAP =
  "SG-P8-opening-employer-pay-calendar";

export interface OpeningPayrollCalendarOptions {
  data?: OpeningPayrollCalendarData;
  parameters?: Readonly<Record<string, Parameter>>;
}
export type OpeningPayrollInput = Pick<
  CoreInput,
  "seed" | "startedAt" | "people" | "jobs" | "organizations" | "workCommitments"
> & { workPayrollCalendars?: readonly WorkPayrollCalendarInput[] };
type LinkedCommitment = WorkCommitmentInput & { payrollCalendarId?: string };
export interface OpeningPayrollCalendarEstimate {
  organizationId: string;
  calendarId: string;
  route:
    | "eligible-private"
    | "education-proxy"
    | "government-proxy"
    | "farm-extrapolation"
    | "unqualified-owner-extrapolation";
  frequency: OpeningPayrollFrequency;
  parameterRefs: readonly string[];
  source: Source;
}

type Units = Readonly<{
  zero: number;
  one: number;
  two: number;
  daysPerWeek: number;
  monthsPerYear: number;
}>;
function identity(value: string, field: string): void {
  if (typeof value !== "string" || !value || value !== value.trim())
    throw new Error(`Opening payroll requires a canonical identity: ${field}`);
}
function date(value: string): IsoDate {
  const result = makeIsoDate(value);
  if (result !== value)
    throw new Error("Opening payroll date must retain its exact ISO form");
  return result;
}
function availableSource(
  source: Source,
  at: string,
  field: string,
  requireEstimate = false,
): void {
  if (
    !source ||
    !["SOURCED", "ESTIMATED"].includes(source.tag) ||
    !source.citation?.trim() ||
    date(source.asOf) > at ||
    (requireEstimate &&
      source.tag === "ESTIMATED" &&
      !source.estimatedFrom?.trim())
  )
    throw new Error(
      `Opening payroll requires an available qualified Source: ${field}`,
    );
}
function settings(options: OpeningPayrollCalendarOptions) {
  const data = options.data ?? DEFAULT_OPENING_PAYROLL_CALENDAR_DATA;
  const registry = options.parameters ?? PARAMETERS;
  const read = (key: string): number => {
    const row = registry[key],
      value = parameter(key, registry);
    if (
      !row ||
      !["SOURCED", "ESTIMATED", "TUNABLE"].includes(row.tag) ||
      !row.citation?.trim() ||
      (row.tag !== "TUNABLE" && row.checkRange !== undefined) ||
      (row.tag === "ESTIMATED" &&
        (!row.estimatedFrom?.trim() || !row.stopgapId?.trim())) ||
      (row.tag === "TUNABLE" &&
        (!row.estimatedFrom?.trim() ||
          !row.stopgapId?.trim() ||
          !row.checkRange?.ref?.trim() ||
          !row.spread ||
          ("status" in row.spread
            ? row.spread.status !== "unmeasured" || !row.spread.reason.trim()
            : !Number.isFinite(row.spread.low) ||
              !Number.isFinite(row.spread.high) ||
              row.spread.low > row.spread.high ||
              !row.spread.unit.trim() ||
              !row.spread.citation.trim())))
    )
      throw new Error(
        `Opening payroll parameter requires actual qualified metadata: ${key}`,
      );
    return value;
  };
  const u: Units = {
    zero: read("zero"),
    one: read("one"),
    two: read("two"),
    daysPerWeek: read("daysPerWeek"),
    monthsPerYear: read("monthsPerYear"),
  };
  if (
    u.zero !== u.one - u.one ||
    u.one !== Math.sign(u.one) ||
    u.one <= u.zero ||
    u.two !== u.one + u.one ||
    !Number.isSafeInteger(u.daysPerWeek) ||
    u.daysPerWeek <= u.one ||
    !Number.isSafeInteger(u.monthsPerYear) ||
    u.monthsPerYear <= u.one ||
    !data.stopgapId.trim() ||
    !data.targetRef.trim() ||
    !data.priorNamespace.trim() ||
    !data.calendarIdPrefix.trim() ||
    data.nonbusinessDayRule !== "no-adjustment" ||
    data.shortMonthRule !== "clamp-to-calendar-month-end" ||
    data.arrearsRule !== "carry-to-next-recorded-payday"
  )
    throw new Error(
      "Opening payroll requires exact units and declared calendar conventions",
    );
  return { data, registry, read, u };
}

/** WHO-only employer startup state; seed/identity never selects a later outcome. */
export function openingPayrollEmployerPrior(
  seed: string,
  organizationId: string,
  domain: "frequency" | "phase",
  options: OpeningPayrollCalendarOptions = {},
): number {
  const { data, read, u } = settings(options);
  identity(seed, "world seed");
  identity(organizationId, "organization");
  const radix = read("seedPlaceHashRadix"),
    digits = read("seedHashDigits");
  const hash = stableHash(
    JSON.stringify([data.priorNamespace, domain, seed, organizationId]),
  );
  const denominator = radix ** digits;
  if (
    radix !== u.two ** (u.two * u.two) ||
    !Number.isSafeInteger(digits) ||
    digits <= u.zero ||
    digits > hash.length ||
    !Number.isSafeInteger(denominator) ||
    denominator <= u.one
  )
    throw new Error(
      "Opening payroll prior requires safe hexadecimal identity representation",
    );
  const integer = Number.parseInt(hash.slice(u.zero, digits), radix);
  const quantile = (integer + u.one / u.two) / denominator;
  if (
    !Number.isSafeInteger(integer) ||
    integer < u.zero ||
    integer >= denominator ||
    !Number.isFinite(quantile) ||
    quantile <= u.zero ||
    quantile >= u.one
  )
    throw new Error("Opening payroll employer startup quantile is invalid");
  return quantile;
}

/** Applies real option weights only to an explicitly estimated opening calendar. */
export function openingPayrollFrequencyAtQuantile(
  groupId: string,
  quantile: number,
  options: OpeningPayrollCalendarOptions = {},
): { frequency: OpeningPayrollFrequency; parameterRefs: readonly string[] } {
  const { data, read, u } = settings(options),
    group = data.frequencyGroups[groupId];
  if (
    !group?.length ||
    !Number.isFinite(quantile) ||
    quantile < u.zero ||
    quantile >= u.one ||
    new Set(group.map((row) => row.frequency)).size !== group.length ||
    group.some(
      (row) =>
        !["weekly", "biweekly", "semimonthly", "monthly"].includes(
          row.frequency,
        ),
    )
  )
    throw new Error(
      "Opening payroll needs a real bounded frequency group and quantile",
    );
  const weights = group.map((row) => read(row.weightParameter));
  if (weights.some((value) => value < u.zero))
    throw new Error("Opening payroll frequency weight is negative");
  const total = weights.reduce((sum, value) => sum + value, u.zero);
  if (!Number.isFinite(total) || total <= u.zero)
    throw new Error(
      "Opening payroll frequency weights have no positive finite mass",
    );
  // Published rounded weights retain their actual values and normalize by their own sum.
  const coordinate = quantile * total;
  let cumulative = u.zero;
  for (let index = u.zero; index < group.length; index += u.one) {
    cumulative += weights[index]!;
    if (coordinate < cumulative)
      return {
        frequency: group[index]!.frequency,
        parameterRefs: group.map((row) => row.weightParameter),
      };
  }
  throw new Error(
    "Opening payroll quantile failed its finite recorded option partition",
  );
}

function monthBoundary(
  at: string,
  offsetMonths: number,
  nominalDay: number,
  u: Units,
): IsoDate {
  const first = new Date(`${date(at)}T00:00:00.000Z`);
  first.setUTCDate(u.one);
  first.setUTCMonth(first.getUTCMonth() + offsetMonths);
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + u.one);
  last.setUTCDate(u.zero);
  first.setUTCDate(Math.min(nominalDay, last.getUTCDate()));
  return date(first.toISOString().split("T")[u.zero]!);
}
function validNominalDays(at: string, days: readonly number[], u: Units): void {
  const january = new Date(`${date(at)}T00:00:00.000Z`);
  january.setUTCDate(u.one);
  january.setUTCMonth(u.one);
  january.setUTCDate(u.zero);
  const maximum = january.getUTCDate();
  if (
    !days.length ||
    days.some(
      (day, index) =>
        !Number.isSafeInteger(day) ||
        day <= u.zero ||
        day > maximum ||
        (index > u.zero && day <= days[index - u.one]!),
    )
  )
    throw new Error(
      "Opening payroll requires distinct valid nominal civil-month boundaries",
    );
  if (days.length === u.two) {
    let shortest = maximum;
    for (let yearOffset = u.zero; yearOffset < u.two; yearOffset += u.one) {
      const february = new Date(`${date(at)}T00:00:00.000Z`);
      february.setUTCDate(u.one);
      february.setUTCFullYear(february.getUTCFullYear() + yearOffset);
      february.setUTCMonth(u.two);
      february.setUTCDate(u.zero);
      shortest = Math.min(shortest, february.getUTCDate());
    }
    if (days[u.zero]! >= Math.min(days[u.one]!, shortest))
      throw new Error(
        "Opening payroll twice-month boundaries collapse in a short month",
      );
  }
}
function monthTerms(
  at: string,
  days: readonly number[],
  lag: number,
  u: Units,
): Pick<
  WorkPayrollCalendarInput,
  | "firstPeriodStartsAt"
  | "firstPaydayAt"
  | "nominalBoundaryDays"
  | "shortMonthRule"
> {
  validNominalDays(at, days, u);
  const thisMonth = days.map((day) => monthBoundary(at, u.zero, day, u));
  let position = thisMonth.length - u.one;
  while (position >= u.zero && thisMonth[position]! > at) position -= u.one;
  const containing =
    position >= u.zero
      ? thisMonth[position]!
      : monthBoundary(at, -u.one, days[days.length - u.one]!, u);
  const prior =
    position > u.zero
      ? thisMonth[position - u.one]!
      : position === u.zero
        ? monthBoundary(at, -u.one, days[days.length - u.one]!, u)
        : monthBoundary(
            at,
            -u.one,
            days[Math.max(u.zero, days.length - u.two)]!,
            u,
          );
  // For monthly, the containing period's previous boundary is one whole civil month earlier.
  const first =
    days.length === u.one
      ? monthBoundary(containing, -u.one, days[u.zero]!, u)
      : prior;
  return {
    firstPeriodStartsAt: first,
    firstPaydayAt: addDays(addDays(containing, -u.one), lag),
    nominalBoundaryDays: [...days],
    shortMonthRule: "clamp-to-calendar-month-end",
  };
}

function firstTerms(
  frequency: OpeningPayrollFrequency,
  at: string,
  phase: number,
  options: OpeningPayrollCalendarOptions,
): {
  terms: Pick<
    WorkPayrollCalendarInput,
    | "rule"
    | "firstPeriodStartsAt"
    | "firstPaydayAt"
    | "periodDays"
    | "periodMonths"
    | "nominalBoundaryDays"
    | "shortMonthRule"
  >;
  parameterRefs: readonly string[];
} {
  const { data, read, u } = settings(options),
    lag = read(data.parameterRefs.lagDays);
  if (!Number.isSafeInteger(lag) || lag < u.zero)
    throw new Error(
      "Opening payroll lag must be a nonnegative registered calendar-day count",
    );
  if (frequency === "weekly" || frequency === "biweekly") {
    const span = read(data.parameterRefs.phaseSpan);
    if (span < u.zero || span > u.one)
      throw new Error(
        "Opening payroll phase span must stay within one recorded cycle",
      );
    const periodDays = u.daysPerWeek * (frequency === "weekly" ? u.one : u.two);
    const phaseDays = Math.floor(phase * periodDays * span);
    const containing = addDays(date(at), -phaseDays);
    return {
      terms: {
        rule: "fixed-days-after-inclusive-period-end",
        periodDays,
        firstPeriodStartsAt: addDays(containing, -periodDays),
        firstPaydayAt: addDays(containing, lag - u.one),
      },
      parameterRefs: [data.parameterRefs.phaseSpan, data.parameterRefs.lagDays],
    };
  }
  const refs =
    frequency === "monthly"
      ? [data.parameterRefs.monthlyBoundary]
      : [
          data.parameterRefs.semimonthlyFirstBoundary,
          data.parameterRefs.semimonthlySecondBoundary,
        ];
  const days = refs.map(read);
  return {
    terms: {
      rule:
        frequency === "monthly"
          ? "calendar-months-after-inclusive-period-end"
          : "twice-calendar-month-after-inclusive-period-end",
      ...monthTerms(at, days, lag, u),
      ...(frequency === "monthly" ? { periodMonths: u.one } : {}),
    },
    parameterRefs: [...refs, data.parameterRefs.lagDays],
  };
}

function unique<T extends { id: string }>(
  rows: readonly T[],
  field: string,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const row of rows) {
    identity(row.id, field);
    if (result.has(row.id))
      throw new Error(`Duplicate opening payroll ${field}: ${row.id}`);
    result.set(row.id, row);
  }
  return result;
}
function suppliedCalendar(
  calendar: WorkPayrollCalendarInput,
  at: string,
  u: Units,
): void {
  identity(calendar.id, "calendar");
  identity(calendar.organizationId, "calendar employer");
  for (const ids of [calendar.workCommitmentIds, calendar.basisRecordIds])
    if (
      !ids?.length ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !id || id !== id.trim())
    )
      throw new Error(
        "Supplied payroll calendar has malformed bounded identity membership",
      );
  availableSource(calendar.source, at, calendar.id, true);
  date(calendar.firstPeriodStartsAt);
  date(calendar.firstPaydayAt);
  date(calendar.effectiveFrom);
  if (
    calendar.effectiveUntil !== undefined &&
    date(calendar.effectiveUntil) <= calendar.effectiveFrom
  )
    throw new Error(
      "Supplied payroll calendar has invalid exclusive effective bounds",
    );
  if (
    calendar.nonbusinessDayRule !== "no-adjustment" ||
    calendar.arrearsRule !== "carry-to-next-recorded-payday"
  )
    throw new Error(
      "Supplied payroll holiday/retry rule is unsupported; it is never rewritten",
    );
  let next: string;
  if (calendar.rule === "fixed-days-after-inclusive-period-end") {
    if (
      !Number.isSafeInteger(calendar.periodDays) ||
      calendar.periodDays! <= u.zero ||
      calendar.periodMonths !== undefined ||
      calendar.nominalBoundaryDays !== undefined ||
      calendar.shortMonthRule !== undefined
    )
      throw new Error(
        "Supplied fixed payroll calendar has incompatible cadence fields",
      );
    next = addDays(date(calendar.firstPeriodStartsAt), calendar.periodDays!);
  } else if (
    calendar.rule === "calendar-months-after-inclusive-period-end" ||
    calendar.rule === "twice-calendar-month-after-inclusive-period-end"
  ) {
    const days = calendar.nominalBoundaryDays ?? [];
    validNominalDays(calendar.firstPeriodStartsAt, days, u);
    const expected =
      calendar.rule === "calendar-months-after-inclusive-period-end"
        ? u.one
        : u.two;
    if (
      days.length !== expected ||
      calendar.periodDays !== undefined ||
      calendar.shortMonthRule !== "clamp-to-calendar-month-end" ||
      (expected === u.one
        ? !Number.isSafeInteger(calendar.periodMonths) ||
          calendar.periodMonths! <= u.zero
        : calendar.periodMonths !== undefined)
    )
      throw new Error(
        "Supplied monthly payroll calendar has incompatible cadence fields",
      );
    const position = days.findIndex(
      (day) =>
        monthBoundary(calendar.firstPeriodStartsAt, u.zero, day, u) ===
        calendar.firstPeriodStartsAt,
    );
    if (position < u.zero)
      throw new Error(
        "Supplied payroll first boundary differs from its own month rule",
      );
    next =
      expected === u.one
        ? monthBoundary(
            calendar.firstPeriodStartsAt,
            calendar.periodMonths!,
            days[u.zero]!,
            u,
          )
        : position + u.one < days.length
          ? monthBoundary(
              calendar.firstPeriodStartsAt,
              u.zero,
              days[position + u.one]!,
              u,
            )
          : monthBoundary(
              calendar.firstPeriodStartsAt,
              u.one,
              days[u.zero]!,
              u,
            );
  } else
    throw new Error(
      "Supplied payroll period rule is unsupported; it is never replaced",
    );
  if (calendar.firstPaydayAt < addDays(date(next), -u.one))
    throw new Error(
      "Supplied payroll payday precedes its inclusive period end",
    );
}
function routeFor(
  organization: OrganizationInput,
  data: OpeningPayrollCalendarData,
): OpeningPayrollCalendarEstimate["route"] {
  const classification = organization.classification ?? "",
    facts = organization.governmentFacts;
  // All educational establishments stay out of the BLS private cohort, including private schools.
  const matchesClass = (candidate: string) =>
    classification === candidate || classification.startsWith(`${candidate}:`);
  if (
    data.educationClassifications.some(matchesClass) ||
    data.educationKinds.includes(organization.kind)
  )
    return "education-proxy";
  if (
    data.governmentKinds.includes(organization.kind) ||
    data.governmentIdentityKinds.includes(facts?.governmentKind ?? "") ||
    data.governmentClassificationPrefixes.some((prefix) =>
      classification.startsWith(prefix),
    )
  )
    return "government-proxy";
  if (data.farmClassifications.some(matchesClass)) return "farm-extrapolation";
  if (
    (facts &&
      Object.keys(facts).some(
        (key) => !key.startsWith(OPENING_CUSTOMER_QUALIFICATION_PREFIX),
      )) ||
    !data.privateClassificationPrefixes.some((prefix) =>
      classification.startsWith(prefix),
    )
  )
    return "unqualified-owner-extrapolation";
  return "eligible-private";
}

/**
 * The pay calendar a government employer follows: the base biweekly option the
 * data declares, advanced to the period before `at`. Used at the opening for
 * every government employer and for a post filled later with no job to follow.
 */
export function governmentPayrollTerms(
  at: string,
  options: OpeningPayrollCalendarOptions = {},
): Pick<
  WorkPayrollCalendarInput,
  | "rule"
  | "periodDays"
  | "firstPeriodStartsAt"
  | "firstPaydayAt"
  | "nonbusinessDayRule"
  | "arrearsRule"
> {
  const { data, u } = settings(options);
  if (
    data.governmentProxy.frequency !== "biweekly" ||
    data.governmentProxy.nonbusinessDayRule !== data.nonbusinessDayRule ||
    !data.governmentProxy.limitation.trim()
  )
    throw new Error(
      "Opening government payroll requires its declared qualified proxy convention",
    );
  const periodDays = u.daysPerWeek * u.two;
  const original = date(data.governmentProxy.firstPeriodStartsAt),
    firstDue = date(data.governmentProxy.firstPaydayAt);
  const currentOffset =
    Math.floor(daysBetween(original, date(at)) / periodDays) * periodDays;
  const offset = currentOffset - periodDays;
  return {
    rule: "fixed-days-after-inclusive-period-end",
    periodDays,
    firstPeriodStartsAt: addDays(original, offset),
    firstPaydayAt: addDays(firstDue, offset),
    nonbusinessDayRule: data.nonbusinessDayRule,
    arrearsRule: data.arrearsRule,
  };
}

/**
 * Opening admission only. Existing calendar objects/Sources and organization/job/
 * person/attendance terms remain exact. New links clone only the commitment row.
 * Prior-period date bounds are a calendar phase, never invented opening earned wages.
 */
export function openingWorkPayrollCalendars(
  input: OpeningPayrollInput,
  options: OpeningPayrollCalendarOptions = {},
): {
  calendars: readonly WorkPayrollCalendarInput[];
  workCommitments: readonly LinkedCommitment[];
  estimates: readonly OpeningPayrollCalendarEstimate[];
  gaps: readonly string[];
} {
  const { data, registry, read, u } = settings(options),
    at = date(input.startedAt);
  const organizations = unique(input.organizations, "organization"),
    people = unique(input.people, "person"),
    jobs = unique(input.jobs, "job");
  const commitments = unique(input.workCommitments ?? [], "commitment");
  const supplied = unique(input.workPayrollCalendars ?? [], "calendar");
  const ownedByCommitment = new Map<string, WorkPayrollCalendarInput>();
  for (const calendar of supplied.values()) {
    suppliedCalendar(calendar, at, u);
    if (!organizations.has(calendar.organizationId))
      throw new Error("Supplied payroll calendar employer does not exist");
    for (const id of calendar.workCommitmentIds) {
      const commitment = commitments.get(id);
      if (
        !commitment ||
        commitment.organizationId !== calendar.organizationId ||
        ownedByCommitment.has(id)
      )
        throw new Error(
          "Supplied payroll calendar membership differs from actual owned commitments",
        );
      const exact = commitment as LinkedCommitment;
      if (
        exact.payrollCalendarId !== undefined &&
        exact.payrollCalendarId !== calendar.id
      )
        throw new Error(
          "Supplied payroll calendar differs from the actual commitment link",
        );
      ownedByCommitment.set(id, calendar);
    }
  }
  const groups = new Map<string, WorkCommitmentInput[]>(),
    gaps = new Set<string>();
  for (const commitment of commitments.values()) {
    const job = jobs.get(commitment.jobId),
      person = people.get(commitment.personId),
      organization = organizations.get(commitment.organizationId);
    if (
      !job ||
      !person ||
      !organization ||
      job.personId !== commitment.personId ||
      job.organizationId !== commitment.organizationId
    )
      throw new Error(
        "Opening payroll commitment lacks its actual worker/job/employer",
      );
    const exact = commitment as LinkedCommitment;
    if (
      exact.payrollCalendarId !== undefined &&
      !ownedByCommitment.has(commitment.id)
    )
      throw new Error(
        "Actual supplied payroll calendar link cannot be replaced by a startup prior",
      );
    if (ownedByCommitment.has(commitment.id)) continue;
    if (
      (commitment.endsAt !== undefined && date(commitment.endsAt) <= at) ||
      (job.endsAt !== undefined && date(job.endsAt) <= at)
    )
      continue;
    if (person.jobId !== job.id)
      throw new Error("Opening payroll requires the actual active owned job");
    date(commitment.startsAt);
    availableSource(job.source, at, job.id);
    availableSource(organization.source, at, organization.id);
    availableSource(commitment.paySource, at, commitment.id);
    availableSource(commitment.scheduleSource, at, commitment.id);
    const group = groups.get(organization.id) ?? [];
    group.push(commitment);
    groups.set(organization.id, group);
  }
  const calendars: WorkPayrollCalendarInput[] = [...supplied.values()],
    estimates: OpeningPayrollCalendarEstimate[] = [];
  for (const [organizationId, members] of groups) {
    const organization = organizations.get(organizationId)!,
      route = routeFor(organization, data);
    const sourceId =
      route === "government-proxy"
        ? data.governmentProxy.sourceId
        : route === "education-proxy"
          ? data.educationSourceId
          : data.privateSourceId;
    const reference = data.sources[sourceId];
    if (
      !reference?.id.trim() ||
      reference.id !== sourceId ||
      !reference.title.trim() ||
      !reference.publisher.trim() ||
      !reference.url.startsWith("https://") ||
      (reference.publicationDate !== undefined &&
        date(reference.publicationDate) > date(reference.availableAt)) ||
      date(reference.availableAt) > at
    )
      throw new Error(
        `Opening payroll source is unavailable at opening for ${route}: ${organizationId}; preserve a qualified prior supplied calendar`,
      );
    let frequency: OpeningPayrollFrequency, terms: WorkPayrollCalendarInput;
    let refs: readonly string[];
    const id = `${data.calendarIdPrefix}${organizationId}`;
    if (supplied.has(id))
      throw new Error(
        "Opening payroll generated calendar ID collides with a supplied calendar",
      );
    if (route === "government-proxy") {
      frequency = "biweekly";
      refs = ["daysPerWeek", "two"];
      terms = {
        id,
        organizationId,
        workCommitmentIds: members.map((row) => row.id),
        basisRecordIds: [organizationId],
        ...governmentPayrollTerms(at, options),
        effectiveFrom: at,
        source: { tag: "ESTIMATED", asOf: at, citation: "", estimatedFrom: "" },
      };
    } else {
      const groupId =
        route === "education-proxy"
          ? "education-proxy"
          : route === "eligible-private"
            ? (data.industryByClassification[
                organization.classification ?? ""
              ] ?? "all-private")
            : "all-private";
      const selected = openingPayrollFrequencyAtQuantile(
        groupId,
        openingPayrollEmployerPrior(
          input.seed,
          organizationId,
          "frequency",
          options,
        ),
        options,
      );
      frequency = selected.frequency;
      const built = firstTerms(
        frequency,
        at,
        openingPayrollEmployerPrior(
          input.seed,
          organizationId,
          "phase",
          options,
        ),
        options,
      );
      refs = [
        ...selected.parameterRefs,
        ...built.parameterRefs,
        "zero",
        "one",
        "two",
        "daysPerWeek",
        "monthsPerYear",
        "seedPlaceHashRadix",
        "seedHashDigits",
      ];
      terms = {
        id,
        organizationId,
        workCommitmentIds: members.map((row) => row.id),
        basisRecordIds: [organizationId],
        ...built.terms,
        effectiveFrom: at,
        nonbusinessDayRule: data.nonbusinessDayRule,
        arrearsRule: data.arrearsRule,
        source: { tag: "ESTIMATED", asOf: at, citation: "", estimatedFrom: "" },
      };
      if (route === "eligible-private" && groupId === "all-private")
        gaps.add(
          `opening-payroll:private-industry-national-fallback:${organizationId}`,
        );
    }
    const parameterRefs = [...new Set(refs)];
    const bindings = parameterRefs
      .map((key) => {
        const value = read(key),
          row = registry[key]!;
        return `${key}=${value} (${row.tag}; ${row.citation}${row.estimatedFrom ? `; ${row.estimatedFrom}` : ""})`;
      })
      .join(" ");
    const scope =
      route === "eligible-private"
        ? "Private nonfarm classification model; BLS counts single-pay-period businesses, not workers. Industry, legal-form, vintage and single-group crosswalks remain estimates."
        : route === "government-proxy"
          ? data.governmentProxy.limitation
          : route === "education-proxy"
            ? "Education is excluded from BLS private weights. The university example confirms two options only; equal mix, modeled employer/group assignment, phase and lag remain unmeasured. It does not supply a full2021 calendar."
            : route === "farm-extrapolation"
              ? "Farm payroll is outside the CES nonfarm cohort. This is an explicitly extrapolated private-options startup estimate, not a sampled farm frequency or an eligible BLS business."
              : "Private/nonfarm/education status is not established for this owner. This separately flagged best-available private-options extrapolation is not an eligible BLS observation or public money authority.";
    const source: Source = {
      tag: "ESTIMATED",
      asOf: at,
      generationPriorVintage: reference.reference,
      citation: `${reference.publisher}, ${reference.title}; ${reference.url}; available no earlier than ${reference.availableAt}. Owning organization record ${organizationId}: ${organization.source.citation}`,
      estimatedFrom: `${scope} ${data.unmeasuredConventions} No pre-opening earned pay, actual attendance, payment, appropriation, owner capital, deficit rescue or legal compliance is inferred. Model employer calendar remains open under ${data.stopgapId}; parameter binding: ${bindings}`,
    };
    terms = { ...terms, source };
    suppliedCalendar(terms, at, u);
    for (const commitment of members)
      ownedByCommitment.set(commitment.id, terms);
    calendars.push(terms);
    estimates.push({
      organizationId,
      calendarId: id,
      route,
      frequency,
      parameterRefs,
      source,
    });
    gaps.add(`opening-payroll:${route}:${organizationId}`);
  }
  const workCommitments = [...commitments.values()].map((row) => {
    const calendar = ownedByCommitment.get(row.id),
      linked = row as LinkedCommitment;
    return !calendar || linked.payrollCalendarId === calendar.id
      ? linked
      : { ...row, payrollCalendarId: calendar.id };
  });
  return { calendars, workCommitments, estimates, gaps: [...gaps] };
}
