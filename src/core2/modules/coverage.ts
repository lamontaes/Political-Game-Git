/**
 * Health coverage (P10 health engine): each full person's coverage comes from
 * their own circumstances, reviewed monthly. At 65, Medicare. A worker whose
 * employer offers a plan and who works full time chooses whether to enroll;
 * an enrolled worker's plan covers their partner and children. Under the
 * state's Medicaid or CHIP limit for their household's income, Medicaid. An
 * adult otherwise chooses between a marketplace plan, at the share of income
 * the law in force asks after the premium credit, and going without. Each
 * choice weighs need (age), cost against income and temperament through the
 * shared chooser; real rates (MEPS take-up, ACS uninsured) only check totals.
 */
import eligibilityJson from "../data/health-coverage/eligibility.json" with { type: "json" };
import rows from "../data/health-coverage/parameters.json" with { type: "json" };
import { ageOnDate, makeIsoDate } from "../../simulation/dates";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import { decisionFromScores, scoreOffers } from "../choice";
import { decisionKinds, decisionLean } from "../trait-decisions";
import type { Parameter } from "../parameters";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";

import { declareSnapshotCovered } from "../snapshot";
export const COVERAGE_MODULE_ID = "coverage";
export const COVERAGE_LOST_EVENT = "health.coverage-lost";
export const COVERAGE_PARAMETERS = rows as unknown as Readonly<
  Record<string, Parameter>
>;
const STOPGAP = "SG-P15-coverage-weights";
/** Territories' own poverty levels, disability Medicare, premiums paid. */
const GAPS_STOPGAP = "SG-P15-coverage-gaps";
const REVIEW_KIND = "coverage-review";
const DECISION = "coverage.enroll";
const TAKE = "take-cover";
const WITHOUT = "go-without";
const INACTIVE_TIER = "husk";

export type CoverageKind =
  | "medicare"
  | "employer"
  | "employer-dependent"
  | "medicaid"
  | "marketplace"
  | "uninsured";

export interface CoverageRow {
  id: PersonId;
  kind: CoverageKind;
  since: string;
  /** Days with coverage and without, since the opening. */
  coveredDays: number;
  uninsuredDays: number;
  /** Days covered while under the child age (the outcome web's child coverage years). */
  childCoveredDays: number;
  /** What decided it, by cause. */
  reasons: Readonly<Record<string, number>>;
}

interface Eligibility {
  medicaidLimitPctFpl: Readonly<
    Record<
      string,
      {
        adultsNoKids: number | null;
        parents: number | null;
        children: number | null;
      }
    >
  >;
  povertyGuideline: Readonly<Record<string, readonly [number, number]>>;
  employerOfferBySize: readonly (readonly [number | null, number])[];
  marketplaceContribution: {
    schedules: readonly {
      from: string;
      until: string | null;
      points: readonly (readonly [number, number])[];
      aboveLastNoCredit?: boolean;
    }[];
  };
}
const ELIGIBILITY = eligibilityJson as unknown as Eligibility;

function c(api: CoreAPI, key: string): number {
  const row = COVERAGE_PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
}

function store(api: CoreAPI) {
  return api.moduleState(COVERAGE_MODULE_ID);
}

const ageOf = (api: CoreAPI, person: Readonly<PersonState>) =>
  ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(api.state.date));

function stateOf(person: Readonly<PersonState>): string | undefined {
  return lifePlaceByJurisdictionId(person.placeId as never)
    ?.stateJurisdictionKey?.split("-")
    .at(-1);
}

/** The household's yearly pay, in minor units, from its members' jobs. */
function householdIncome(api: CoreAPI, householdId: string): number {
  const core = api.state as CoreState;
  let total = api.parameter("zero");
  for (const id of core.households.get(householdId)?.memberIds ?? []) {
    const jobId = core.people.get(id)?.jobId;
    const job = jobId ? core.jobs.get(jobId) : undefined;
    if (job && job.endsAt === undefined)
      total += job.wageDailyMinor * api.parameter("daysPerMeanYear");
  }
  return total;
}

/** Household income as a percent of the poverty guideline for its size. */
function povertyPercent(
  api: CoreAPI,
  householdId: string,
  state: string | undefined,
): number {
  const size = Math.max(
    api.parameter("one"),
    api.state.households.get(householdId)?.memberIds.length ??
      api.parameter("one"),
  );
  const [base, per] =
    ELIGIBILITY.povertyGuideline[state ?? ""] ??
    ELIGIBILITY.povertyGuideline.contiguous!;
  const guidelineMinor =
    (base + per * (size - api.parameter("one"))) *
    api.parameter("minorPerDollar");
  return (
    (householdIncome(api, householdId) / guidelineMinor) *
    api.parameter("percent")
  );
}

/** The share of income the law asks toward the benchmark plan, or null for no credit. */
function marketplaceShare(api: CoreAPI, fplPct: number): number | null {
  const date = api.state.date;
  const schedule = ELIGIBILITY.marketplaceContribution.schedules.find(
    (row) => row.from <= date && (row.until === null || date < row.until),
  );
  if (!schedule) return null;
  const points = schedule.points;
  if (fplPct < points[0]![0]) return null;
  const last = points.at(-1)!;
  if (fplPct > last[0]) return schedule.aboveLastNoCredit ? null : last[1];
  for (let i = api.parameter("one"); i < points.length; i += 1) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (fplPct <= x1)
      return (
        (y0 + ((y1 - y0) * (fplPct - x0)) / Math.max(x1 - x0, 1e-9)) /
        api.parameter("percent")
      );
  }
  return last[1] / api.parameter("percent");
}

/** Whether an employer offers a plan: within its size band, the better-paying employers do, as many as MEPS finds offer. */
function offeringEmployers(api: CoreAPI): Set<string> {
  const core = api.state as CoreState;
  const held = store(api).table("state").get("coverage:offers") as
    { ids: readonly string[] } | undefined;
  if (held) return new Set(held.ids);
  const bands = ELIGIBILITY.employerOfferBySize;
  const byBand = new Map<number, { id: string; pay: number }[]>();
  for (const [organizationId, jobIds] of core.finance.jobsByOrganization) {
    const jobs = [...jobIds]
      .map((id) => core.jobs.get(id))
      .filter((job) => job && job.endsAt === undefined);
    if (!jobs.length) continue;
    const size = jobs.length;
    const band = bands.findIndex(([max]) => max === null || size <= max);
    const pay =
      jobs.reduce(
        (sum, job) => sum + (job!.hourlyMinor ?? job!.wageDailyMinor),
        0,
      ) / size;
    byBand.set(band, [
      ...(byBand.get(band) ?? []),
      { id: organizationId, pay },
    ]);
  }
  const offers: string[] = [];
  for (const [band, list] of byBand) {
    const rate = bands[band]![1];
    const sorted = list.sort(
      (a, b) => b.pay - a.pay || a.id.localeCompare(b.id),
    );
    offers.push(
      ...sorted.slice(0, Math.round(rate * sorted.length)).map((row) => row.id),
    );
  }
  store(api).table("state").put({ id: "coverage:offers", ids: offers });
  return new Set(offers);
}

function action(id: string, taking: boolean): ActionDefinition {
  return {
    id: `coverage-${id}`,
    actKinds: decisionKinds(DECISION, id),
    goalKinds: [],
    need: "security",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "self",
    effect: "coverage",
    reasonBindings: [
      {
        id: "coverage",
        provider: "coverage-value",
        weightParameter: "one",
        arguments: { taking: String(taking) },
        stopgapId: STOPGAP,
      },
    ],
  };
}
export const TAKE_COVER = action(TAKE, true);
export const GO_WITHOUT = action(WITHOUT, false);
const pending = new WeakMap<object, number>();

/** Whether this adult takes a plan that costs this share of their household's income. */
function chooses(
  api: CoreAPI,
  person: Readonly<PersonState>,
  costShare: number,
  stayKey: string,
  reasons: Record<string, number>,
): boolean {
  const age = ageOf(api, person);
  reasons.need =
    c(api, "coverageNeedWeight") *
    Math.min(
      api.parameter("one"),
      Math.max(
        api.parameter("zero"),
        (age - c(api, "coverageChildAge")) /
          (c(api, "coverageMedicareAge") - c(api, "coverageChildAge")),
      ),
    );
  reasons.cost = -c(api, "coverageCostWeight") * costShare;
  reasons.temperament =
    c(api, "coverageTemperamentWeight") *
    decisionLean(api.state, person, DECISION, TAKE, WITHOUT);
  reasons.stay = -c(api, stayKey);
  pending.set(
    api.state,
    Object.values(reasons).reduce((sum, v) => sum + v, api.parameter("zero")),
  );
  const offers: ActOffer[] = [GO_WITHOUT, TAKE_COVER].map((definition) => ({
    definition,
    targetId: person.id,
    availableHours: api.parameter("hoursPerDay"),
  }));
  const scored = scoreOffers(api.state, person.id, offers, {
    needValues: { security: api.parameter("zero") },
  });
  const decision = decisionFromScores(api.state, person.id, scored);
  pending.delete(api.state);
  return decision.selected?.definition.id === TAKE_COVER.id;
}

/** One household's coverage this month. */
function reviewHousehold(
  api: CoreAPI,
  householdId: string,
  offers: ReadonlySet<string>,
): Map<PersonId, { kind: CoverageKind; reasons: Record<string, number> }> {
  const core = api.state as CoreState;
  const members = (core.households.get(householdId)?.memberIds ?? [])
    .map((id) => core.people.get(id))
    .filter(
      (person): person is PersonState =>
        !!person?.alive && person.tier !== INACTIVE_TIER,
    );
  const out = new Map<
    PersonId,
    { kind: CoverageKind; reasons: Record<string, number> }
  >();
  if (!members.length) return out;
  const state = stateOf(members[0]!);
  const limits = ELIGIBILITY.medicaidLimitPctFpl[state ?? ""];
  if (!limits || limits === ELIGIBILITY.medicaidLimitPctFpl.PR)
    api.stopgap(GAPS_STOPGAP);
  const fpl = povertyPercent(api, householdId, state);
  const income = Math.max(
    householdIncome(api, householdId),
    api.parameter("one"),
  );
  const childAge = c(api, "coverageChildAge");
  const children = members.filter((p) => ageOf(api, p) < childAge);
  const hasChildren = children.length > api.parameter("zero");
  const adults = members.filter((p) => ageOf(api, p) >= childAge);
  // Medicare first, then each worker's own plan.
  for (const person of adults)
    if (ageOf(api, person) >= c(api, "coverageMedicareAge"))
      out.set(person.id, {
        kind: "medicare",
        reasons: { age: ageOf(api, person) },
      });
  const family = members.length > api.parameter("one");
  for (const person of adults) {
    if (out.has(person.id)) continue;
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    if (
      !job ||
      job.endsAt !== undefined ||
      !offers.has(job.organizationId) ||
      job.hoursDaily * api.parameter("daysPerWeek") <
        c(api, "coverageFullTimeHoursWeekly")
    )
      continue;
    const reasons: Record<string, number> = { offered: api.parameter("one") };
    const share =
      c(
        api,
        family ? "coverageEmployeeShareFamily" : "coverageEmployeeShareSingle",
      ) / income;
    if (chooses(api, person, share, "coverageEmployerStayPull", reasons))
      out.set(person.id, { kind: "employer", reasons });
  }
  const enrolled = adults.some((p) => out.get(p.id)?.kind === "employer");
  for (const person of members) {
    if (out.has(person.id)) continue;
    const child = ageOf(api, person) < childAge;
    // A worker's family plan covers their partner and children.
    if (enrolled && (child || person.familyIds.size)) {
      const partnerOrParent = adults.some(
        (other) =>
          out.get(other.id)?.kind === "employer" &&
          person.familyIds.has(other.id),
      );
      if (partnerOrParent) {
        out.set(person.id, {
          kind: "employer-dependent",
          reasons: { familyPlan: api.parameter("one") },
        });
        continue;
      }
    }
    const limit = child
      ? limits?.children
      : hasChildren
        ? limits?.parents
        : limits?.adultsNoKids;
    if (limit !== null && limit !== undefined && fpl <= limit) {
      out.set(person.id, {
        kind: "medicaid",
        reasons: { incomePctFpl: fpl, limit },
      });
      continue;
    }
  }
  // Adults left choose a marketplace plan or none; children follow them.
  for (const person of adults) {
    if (out.has(person.id)) continue;
    const share = marketplaceShare(api, fpl);
    const reasons: Record<string, number> = { incomePctFpl: fpl };
    const cost =
      share === null ? c(api, "coverageBenchmarkPremium") / income : share;
    out.set(person.id, {
      kind: chooses(api, person, cost, "coverageMarketStayPull", reasons)
        ? "marketplace"
        : "uninsured",
      reasons,
    });
  }
  for (const person of children) {
    if (out.has(person.id)) continue;
    const parent = adults.find((other) => person.familyIds.has(other.id));
    const kind = parent ? out.get(parent.id)?.kind : undefined;
    out.set(person.id, {
      kind: kind === "marketplace" ? "marketplace" : "uninsured",
      reasons: {
        followsParent: parent ? api.parameter("one") : api.parameter("zero"),
      },
    });
  }
  return out;
}

/** The month's review: every full person's coverage, and days counted since the last. */
export function monthlyReview(api: CoreAPI): void {
  const core = api.state as CoreState;
  const offers = offeringEmployers(api);
  const table = store(api).table("people");
  const households = new Set<string>();
  for (const person of core.people.values())
    if (person.alive && person.tier !== INACTIVE_TIER)
      households.add(person.householdId);
  for (const householdId of [...households].sort())
    for (const [personId, row] of reviewHousehold(api, householdId, offers)) {
      const prior = table.get(personId) as unknown as CoverageRow | undefined;
      const days = prior
        ? Math.max(
            api.parameter("zero"),
            Math.round(
              (Date.parse(`${api.state.date}T00:00:00Z`) -
                Date.parse(
                  `${(prior as unknown as { reviewedAt: string }).reviewedAt}T00:00:00Z`,
                )) /
                86_400_000,
            ),
          )
        : api.parameter("zero");
      const wasCovered = prior && prior.kind !== "uninsured";
      // Losing all coverage is the person's own news.
      if (wasCovered && row.kind === "uninsured") {
        const person = core.people.get(personId)!;
        api.emit({
          id: `${COVERAGE_LOST_EVENT}:${api.state.date}:${personId}`,
          date: api.state.date,
          kind: COVERAGE_LOST_EVENT,
          personIds: [personId],
          placeId: person.placeId,
          source: {
            tag: "ESTIMATED",
            asOf: api.state.date,
            citation: `Coverage review: ${prior!.kind} coverage ended.`,
            estimatedFrom: STOPGAP,
          },
          publicRecord: false,
          facts: { from: prior!.kind },
        });
      }
      table.put({
        id: personId,
        kind: row.kind,
        since: prior && prior.kind === row.kind ? prior.since : api.state.date,
        coveredDays: (prior?.coveredDays ?? 0) + (wasCovered ? days : 0),
        uninsuredDays:
          (prior?.uninsuredDays ?? 0) + (prior && !wasCovered ? days : 0),
        childCoveredDays:
          (prior?.childCoveredDays ?? 0) +
          (wasCovered &&
          ageOf(api, core.people.get(personId)!) < c(api, "coverageChildAge")
            ? days
            : 0),
        reasons: { ...row.reasons },
        reviewedAt: api.state.date,
      });
    }
}

export function coverageOf(
  api: CoreAPI,
  personId: PersonId,
): CoverageRow | undefined {
  return store(api).table("people").get(personId) as unknown as
    CoverageRow | undefined;
}

/**
 * The engine's readings for the outcome web: a place's share of full people
 * covered ("health.coverage-pct", 0 to 100; "health.coverage", 0 to 1), or a
 * person's share of their time covered since the opening
 * ("person:health.coverage-pct") and their years covered as a child
 * ("person:health.child-coverage-years"). Null for a measure it does not keep.
 */
export function coverageMeasure(
  api: CoreAPI,
  id: string,
  measure: string,
): number | null {
  const percent = api.parameter("percent");
  if (measure === "person:health.coverage-pct") {
    const row = coverageOf(api, id);
    if (!row) return null;
    const days = row.coveredDays + row.uninsuredDays;
    return days > 0
      ? (row.coveredDays / days) * percent
      : row.kind === "uninsured"
        ? 0
        : percent;
  }
  if (measure === "person:health.child-coverage-years") {
    const row = coverageOf(api, id);
    return row ? row.childCoveredDays / api.parameter("daysPerMeanYear") : null;
  }
  if (measure !== "health.coverage-pct" && measure !== "health.coverage")
    return null;
  let covered = 0;
  let all = 0;
  for (const personId of api.state.peopleByPlace.get(id) ?? []) {
    const row = coverageOf(api, personId);
    if (!row) continue;
    all += 1;
    if (row.kind !== "uninsured") covered += 1;
  }
  if (!all) return null;
  return measure === "health.coverage"
    ? covered / all
    : (covered / all) * percent;
}

function scheduleReview(api: CoreAPI): void {
  const [year, month] = api.state.date.split("-").map(Number) as [
    number,
    number,
  ];
  const next =
    month === api.parameter("monthsPerYear")
      ? `${year + api.parameter("one")}-01-01`
      : `${year}-${String(month + api.parameter("one")).padStart(2, "0")}-01`;
  api.moduleCalendar(COVERAGE_MODULE_ID).schedule({
    key: `review:${next}`,
    date: next,
    kind: REVIEW_KIND,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: "The monthly review of each person's health coverage.",
      estimatedFrom: STOPGAP,
    },
    sourceRecordIds: ["coverage:state"],
  });
}

export const coverageModule: CoreModule = {
  id: COVERAGE_MODULE_ID,
  state: { schemaVersion: 1, tables: { state: {}, people: {} } },
  onDay(api) {
    if (store(api).table("state").get("coverage:opened")) return;
    store(api)
      .table("state")
      .put({ id: "coverage:opened", openedAt: api.state.date });
    monthlyReview(api);
    scheduleReview(api);
  },
  onCalendarWork(api, work) {
    if (work.kind !== REVIEW_KIND) return;
    monthlyReview(api);
    scheduleReview(api);
  },
  reasonProviders: {
    "coverage-value": (api, actor, _offer, binding) => {
      const held = pending.get(api.state);
      if (held === undefined) return undefined;
      return {
        value:
          binding.arguments?.taking === "true" ? held : api.parameter("zero"),
        sourceIds: [actor.id],
      };
    },
  },
};

declareSnapshotCovered(COVERAGE_MODULE_ID);
