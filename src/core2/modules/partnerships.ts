/**
 * Households that change in town: a young adult leaves a parent's home, and
 * two single adults become partners.
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
export const PARTNERED_EVENT = "people.partnered";
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
const PARTNER = { id: "partner-up", actKinds: ["commit", "change"] } as const;
const STAY_SINGLE = {
  id: "stay-single",
  actKinds: ["keep-same", "play-safe"],
} as const;

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
  definition: typeof GO | typeof STAY | typeof PARTNER | typeof STAY_SINGLE,
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

export interface PartneredRow {
  readonly id: string;
  readonly linkId: string;
  readonly personIds: readonly [string, string];
  readonly householdId: string;
  readonly date: string;
  readonly reasons: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

export function partneredOf(api: CoreAPI): readonly PartneredRow[] {
  return store(api).table("partnered").rows() as unknown as PartneredRow[];
}

/** Whether a household owns the home it lives in (a home is for its owners to sell, not to leave). */
function ownsHome(api: CoreAPI, householdId: string): boolean {
  if (!api.state.modules.has("housing")) return false;
  const dwelling = api
    .moduleState("housing")
    .table("dwellings")
    .get(`dwelling:${householdId}`) as unknown as
    { tenure?: string } | undefined;
  return dwelling?.tenure === "own";
}

/** How the two weigh becoming partners: pulls toward it and what holds each back. */
function partnerReasons(
  api: CoreAPI,
  person: Readonly<PersonState>,
  other: Readonly<PersonState>,
  rentMinor: number,
): Record<string, number> {
  const core = api.state as CoreState;
  const years = (born: string) =>
    Number(core.date.slice(0, 4)) -
    Number(born.slice(0, 4)) -
    (core.date.slice(5) < born.slice(5) ? 1 : 0);
  const together = monthlyPay(api, person) + monthlyPay(api, other);
  return {
    baseline: p(api, "partnerBaseline"),
    closeness:
      p(api, "partnerClosenessWeight") *
      closenessBetween(core, person.id, other.id),
    "age-gap":
      -p(api, "partnerAgeGapWeight") *
      Math.abs(years(person.birthDate) - years(other.birthDate)),
    means:
      p(api, "partnerMeansWeight") *
      Math.min(
        p(api, "partnerMeansCap"),
        rentMinor > 0 ? together / rentMinor : p(api, "partnerMeansCap"),
      ),
  };
}

/**
 * Single adults who know each other weigh becoming partners, each through the
 * chooser; when both choose it they share one household (the one that owns its
 * home, else the larger, else the dearer lease keeps its place) and become
 * partners. A woman and a man only (SG-PEOPLE-partnership-orientation).
 */
export function reviewPartnerships(api: CoreAPI): PartneredRow[] {
  const core = api.state as CoreState;
  const town = townPlaceOf(core);
  if (!town) return [];
  const adultAge = api.parameter("benchmarkAdultMinimumAge");
  const years = (born: string) =>
    Number(core.date.slice(0, 4)) -
    Number(born.slice(0, 4)) -
    (core.date.slice(5) < born.slice(5) ? 1 : 0);
  const partnered = new Set(
    [...core.familyLinks.values()]
      .filter((row) => row.kind === "partner")
      .flatMap((row) => row.personIds),
  );
  const single = (person: Readonly<PersonState> | undefined) =>
    !!person &&
    person.alive &&
    person.tier !== INACTIVE_TIER &&
    person.placeId === town &&
    !partnered.has(person.id) &&
    years(person.birthDate) >= adultAge;
  const rentMinor = typicalRentMinor(api, town);
  const formed: PartneredRow[] = [];
  for (const id of [...(core.peopleByPlace.get(town) ?? [])].sort()) {
    const person = core.people.get(id);
    if (!single(person) || partnered.has(id)) continue;
    // The people they know who could be their partner, closest first.
    const options = [...(core.relationshipsByPerson.get(id) ?? [])]
      .map((key) => core.relationships.get(key)!)
      .map((row) => (row.actorId === id ? row.otherId : row.actorId))
      .map((otherId) => core.people.get(otherId))
      .filter(
        (other): other is PersonState =>
          single(other) &&
          !partnered.has(other!.id) &&
          other!.id !== id &&
          !person!.familyIds.has(other!.id) &&
          !!person!.looks?.gender &&
          !!other!.looks?.gender &&
          person!.looks.gender !== other!.looks.gender,
      )
      .sort(
        (a, b) =>
          closenessBetween(core, id, b.id) - closenessBetween(core, id, a.id) ||
          a.id.localeCompare(b.id),
      );
    const other = options[0];
    if (!other) continue;
    // stopgapId: SG-PEOPLE-partnership-orientation
    api.stopgap("SG-PEOPLE-partnership-orientation");
    const weigh = (me: Readonly<PersonState>, them: Readonly<PersonState>) => {
      const reasons = partnerReasons(api, me, them, rentMinor);
      const chosen = chooseAct(core, me.id, [
        offerOf(STAY_SINGLE, me.id, {}),
        offerOf(PARTNER, me.id, reasons),
      ]).selected!;
      return { yes: chosen.definition.id === PARTNER.id, reasons };
    };
    const mine = weigh(person!, other);
    if (!mine.yes) continue;
    const theirs = weigh(other, person!);
    if (!theirs.yes) continue;
    // Whose household they share: an owner's home stays, else the larger.
    const size = (who: Readonly<PersonState>) =>
      core.households.get(who.householdId)?.memberIds.length ?? 0;
    const owns = (who: Readonly<PersonState>) => ownsHome(api, who.householdId);
    if (owns(person!) && owns(other)) continue;
    const hostFirst =
      owns(person!) ||
      (!owns(other) &&
        (size(person!) > size(other) ||
          (size(person!) === size(other) && person!.id < other.id)));
    const host = hostFirst ? person! : other;
    const mover = hostFirst ? other : person!;
    const moverHome = core.households.get(mover.householdId)!;
    // Their own minor children go with them when no other adult stays.
    const kin = kinOf(core);
    const minors = (kin.children.get(mover.id) ?? []).filter(
      (childId) =>
        moverHome.memberIds.includes(childId) &&
        years(core.people.get(childId)!.birthDate) < adultAge,
    );
    const staysAdult = moverHome.memberIds.some(
      (memberId) =>
        memberId !== mover.id &&
        !minors.includes(memberId) &&
        years(core.people.get(memberId)!.birthDate) >= adultAge,
    );
    const moving = staysAdult ? [mover.id] : [mover.id, ...minors];
    if (
      !staysAdult &&
      moverHome.memberIds.some((memberId) => !moving.includes(memberId))
    )
      continue;
    if (ownsHome(api, mover.householdId)) continue;
    const source = {
      tag: "ESTIMATED" as const,
      asOf: core.date,
      citation: `${person!.givenName} ${person!.familyName} and ${other.givenName} ${other.familyName} became partners and share a home.`,
      estimatedFrom: "SG-PEOPLE-partnership-weights",
    };
    if (host.householdId !== mover.householdId)
      api.changeHouseholdV1({
        personIds: moving,
        householdId: host.householdId,
        source,
      });
    const [a, b] = [person!.id, other.id].sort() as [string, string];
    api.setPartnersV1({ personIds: [a, b], together: true, source });
    partnered.add(a);
    partnered.add(b);
    const link = `partnership:${a}:${b}:${core.date}`;
    const row: PartneredRow = {
      id: `${PARTNERED_EVENT}:${a}:${b}:${core.date}`,
      linkId: link,
      personIds: [a, b],
      householdId: host.householdId,
      date: core.date,
      reasons: { [person!.id]: mine.reasons, [other.id]: theirs.reasons },
    };
    store(api)
      .table("partnered")
      .put(row as unknown as ModuleRow);
    formed.push(row);
  }
  return formed;
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
  reviewPartnerships(api);
}

export const partnershipsModule: CoreModule = {
  id: PARTNERSHIPS_MODULE_ID,
  state: { schemaVersion: 1, tables: { state: {}, left: {}, partnered: {} } },
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
