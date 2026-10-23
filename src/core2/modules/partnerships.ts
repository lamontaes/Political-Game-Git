/**
 * Households that change in town: a young adult leaves a parent's home.
 * Each month every adult living with a parent weighs staying against going
 * through the core's one chooser. Leaving needs a real vacant home their own
 * pay and cash reach (the housing engine's completed rentals); given that,
 * what pulls them out is their age, how freely their pay covers the rent
 * and a crowded home, and what holds them is closeness to the parent they
 * live with and the share of their pay the rent would take. Nothing is
 * rolled. A leaver starts a household of their own through the core's
 * household call, signs the lease, and their share of the family's everyday
 * spending goes with them. ACS B09021 checks a year's totals.
 */
import { createStableId } from "../kernel/ids";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import rows from "../data/partnerships/parameters.json" with { type: "json" };
import { chooseAct } from "../choice";
import { closenessBetween } from "../closeness";
import { completedRentalOffer } from "../housing-occupancy";
import { leaseHousehold, typicalRentMinor } from "./housing";
import { kinOf } from "./moves";
import { townPlaceOf } from "./residents";
import type { ModuleRow } from "../module-data";
import type {
  ActOffer,
  CoreAPI,
  CoreModule,
  CoreState,
  PersonState,
} from "../types";

export const PARTNERSHIPS_MODULE_ID = "core2-partnerships-v1";
export const LEFT_HOME_EVENT = "people.left-home";
const REVIEW_KIND = "partnerships-review";
const STOPGAP = "SG-PEOPLE-home-leaving-weights";
/** The inactive tier takes someone out of town life (a relative living elsewhere). */
const INACTIVE_TIER = "husk";
const PARAMETERS = rows as unknown as Readonly<
  Record<string, { readonly value: number; readonly stopgapId?: string }>
>;
const PULL = "partnerships:pull";
const GO = { id: "home-leave", actKinds: ["change", "take-risk"] } as const;
const STAY = { id: "home-stay", actKinds: ["keep-same", "play-safe"] } as const;

function p(api: CoreAPI, key: string): number {
  const row = PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
}

const store = (api: CoreAPI) => api.moduleState(PARTNERSHIPS_MODULE_ID);

export interface LeftHomeRow {
  readonly id: string;
  readonly personId: string;
  readonly fromHouseholdId: string;
  readonly householdId: string;
  readonly date: string;
  readonly rentMinor: number;
  readonly projectId?: string;
  readonly leaseId?: string;
  readonly reasons: Readonly<Record<string, number>>;
}

export function leftHomeOf(api: CoreAPI): readonly LeftHomeRow[] {
  return store(api).table("left").rows() as unknown as LeftHomeRow[];
}

function offerOf(
  definition: typeof GO | typeof STAY,
  personId: string,
  reasons: Record<string, number>,
): ActOffer {
  return {
    definition: {
      id: definition.id,
      actKinds: [...definition.actKinds],
      goalKinds: [],
      need: "money",
      effortParameter: "zero",
      effectParameter: "zero",
      targetKind: "housing-option",
      effect: "housing-choice",
    },
    targetId: personId,
    availableHours: 1,
    effortHours: 0,
    reasonBindings: Object.entries(reasons).map(([id, value]) => ({
      id,
      provider: PULL,
      weightParameter: "one",
      arguments: { value: String(value) },
    })),
  };
}

/** The adult's monthly pay from their open job. */
function monthlyPay(api: CoreAPI, person: Readonly<PersonState>): number {
  const core = api.state as CoreState;
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  return job && job.endsAt === undefined
    ? (job.wageDailyMinor * api.parameter("jobsDaysPerYear")) /
        api.parameter("macroMonthsPerYear")
    : api.parameter("zero");
}

/** One adult living with a parent weighs leaving for a home of their own. */
export function reviewLeavingHome(
  api: CoreAPI,
  personId: string,
): LeftHomeRow | null {
  const core = api.state as CoreState;
  const person = core.people.get(personId);
  if (!person?.alive || person.tier === INACTIVE_TIER) return null;
  const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date));
  if (age < api.parameter("benchmarkAdultMinimumAge")) return null;
  const household = core.households.get(person.householdId);
  if (!household) return null;
  const parents = (kinOf(core).parents.get(person.id) ?? []).filter(
    (id) => id !== person.id && household.memberIds.includes(id),
  );
  if (!parents.length) return null;
  const income = monthlyPay(api, person);
  // A real vacant unit if the town has one this person can take, else a home
  // at the town's typical rent (as a household without one is rehoused).
  const offer = completedRentalOffer(api, person.placeId, income);
  const rentMinor = offer?.rentMinor ?? typicalRentMinor(api, person.placeId);
  const landlord =
    offer?.project.payerId ?? `organization:landlord:${person.placeId}`;
  if (
    rentMinor <= 0 ||
    !core.organizations.has(landlord) ||
    income < rentMinor * api.parameter("housingRehouseIncomeMultiple") ||
    person.liquidMinor < rentMinor
  )
    return null;
  const zero = api.parameter("zero"),
    one = api.parameter("one");
  const closeness = Math.max(
    ...parents.map((id) => closenessBetween(core, person.id, id)),
  );
  const reasons = {
    baseline: p(api, "homeLeavingBaseline"),
    age:
      p(api, "homeLeavingAgeWeight") *
      (age - api.parameter("benchmarkAdultMinimumAge")),
    means:
      p(api, "homeLeavingMeansWeight") *
      Math.min(p(api, "homeLeavingMeansCap"), income / rentMinor),
    crowding:
      p(api, "homeLeavingCrowdingWeight") *
      Math.max(zero, household.memberIds.length - 2),
  };
  const holds = {
    kin: p(api, "homeLeavingKinHold") * closeness,
    rent:
      p(api, "homeLeavingRentHold") *
      Math.min(one, income > zero ? rentMinor / income : one),
  };
  const chosen = chooseAct(core, person.id, [
    offerOf(STAY, person.id, holds),
    offerOf(GO, person.id, reasons),
  ]).selected!;
  if (chosen.definition.id !== GO.id) return null;
  const householdId = createStableId(
    "household",
    `${core.seed}:${PARTNERSHIPS_MODULE_ID}:${person.id}:${core.date}`,
  );
  const source = {
    tag: "ESTIMATED" as const,
    asOf: core.date,
    citation: `${person.givenName} ${person.familyName} left a parent's home for a home of their own.`,
    estimatedFrom: STOPGAP,
  };
  api.changeHouseholdV1({
    personIds: [person.id],
    householdId,
    source,
  });
  const leaseId = leaseHousehold(api, householdId, rentMinor, offer);
  const row: LeftHomeRow = {
    id: `${LEFT_HOME_EVENT}:${person.id}:${core.date}`,
    personId: person.id,
    fromHouseholdId: household.id,
    householdId,
    date: core.date,
    rentMinor,
    ...(offer ? { projectId: offer.project.id } : {}),
    ...(leaseId ? { leaseId } : {}),
    reasons: {
      ...reasons,
      ...Object.fromEntries(
        Object.entries(holds).map(([key, value]) => [`hold:${key}`, -value]),
      ),
    },
  };
  store(api)
    .table("left")
    .put(row as unknown as ModuleRow);
  api.emit({
    id: row.id,
    date: core.date,
    kind: LEFT_HOME_EVENT,
    personIds: [person.id],
    witnessIds: parents,
    placeId: person.placeId,
    publicRecord: false,
    topic: householdId,
    source,
    facts: { fromHouseholdId: household.id, householdId },
  });
  return row;
}

/** The first day of the month after a date. */
function nextMonth(api: CoreAPI): string {
  const [year, month] = api.state.date.split("-").map(Number) as [
    number,
    number,
  ];
  return month === api.parameter("monthsPerYear")
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

function scheduleReview(api: CoreAPI): void {
  const next = nextMonth(api);
  api.moduleCalendar(PARTNERSHIPS_MODULE_ID).schedule({
    key: `review:${next}`,
    date: next,
    kind: REVIEW_KIND,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: "The month's review of who leaves a parent's home.",
      estimatedFrom: STOPGAP,
    },
    sourceRecordIds: [`review:${next}`],
  });
}

function monthlyReview(api: CoreAPI): void {
  const core = api.state as CoreState;
  const town = townPlaceOf(core);
  const ids = [...(core.peopleByPlace.get(town ?? "") ?? [])].sort();
  for (const id of ids) reviewLeavingHome(api, id);
}

export const partnershipsModule: CoreModule = {
  id: PARTNERSHIPS_MODULE_ID,
  state: { schemaVersion: 1, tables: { state: {}, left: {} } },
  onDay(api) {
    if (store(api).table("state").get("partnerships:state")) return;
    store(api)
      .table("state")
      .put({ id: "partnerships:state", openedAt: api.state.date });
    scheduleReview(api);
  },
  onCalendarWork(api, work) {
    if (work.kind !== REVIEW_KIND) return;
    monthlyReview(api);
    scheduleReview(api);
  },
  reasonProviders: {
    [PULL]: (_api, _actor, _offer, binding) => ({
      value: Number(binding.arguments!.value),
    }),
  },
};
