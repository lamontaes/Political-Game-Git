/**
 * Moves (M1-09, part 2): who leaves town, and why. Leaving is a choice, never
 * a draw. Each adult carries a pull to leave that builds month by month: from
 * their stage of life (how often people their age in their state leave the
 * county, American Community Survey 2024) held back by what ties them to the
 * town (a home they own, children at home, relatives here, a job), and from
 * what happens to them (an eviction, a lost job, a parent, child or sibling
 * moving away). Each month every adult weighs leaving against staying through
 * the core's one chooser; the pull is the reason to go. A householder takes
 * their partner and children; a grown child living with a parent leaves on
 * their own. Where they go is a record, never a draw: to a relative living
 * elsewhere, else where people from their county most often move (IRS).
 *
 * A leaver's records stay. Their job ends, the household's rent and spending
 * here end, they take the destination as their place (with their household,
 * or in a new one there when others stay), so the town's residents and voter
 * rolls no longer list them, and they are no longer simulated in town (the
 * same inactive tier as relatives who live elsewhere). The ACS rates check a
 * year's totals.
 */
import { addDays, ageOnDate, makeIsoDate } from "../kernel/dates";
import { corePlaceByJurisdictionId, corePlaceByKey } from "../place-lookup";
import moverRates from "../../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import destinations from "../data/moves/destinations.json" with { type: "json" };
import rows from "../data/moves/parameters.json" with { type: "json" };
import { decisionFromScores, scoreOffers } from "../choice";
import { decisionLean, decisionTraitWeight } from "../trait-decisions";
import { MORTGAGE_PREFIX } from "../housing-mortgages";
import { moveRecipientIncomeHome } from "../finance-state";
import { sellHome } from "../housing-sale";
import { endLivingPlan } from "../cost-of-living";
import { OUTSIDE_MARKET_KIND } from "../opening-outside-market";
import { currentCloseness } from "../closeness";
import { regionalLevel, regionalRegistered } from "./regional";
import { registerModule } from "../state";
import type { Parameter } from "../parameters";
import type { EntityId } from "../kernel/brands";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";

export const MOVES_MODULE_ID = "moves";
export const MOVES_PARAMETERS = rows as unknown as Readonly<
  Record<string, Parameter>
>;
export const MOVED_AWAY_EVENT = "person.moved-away";
const STOPGAP = "SG-P15-moves-weights";
const OWNER_STOPGAP = "SG-P15-moves-owners-stay";
const INACTIVE_TIER = "husk";

type Rates = Readonly<Record<string, number>>;
const RATES = moverRates as unknown as {
  ageBands: readonly string[];
  national: { departurePerYearByAge: Rates };
  places: Readonly<Record<string, { departurePerYearByAge: Rates }>>;
};
const TOP_DESTINATION = destinations.topDestinationByCounty as Readonly<
  Record<string, string>
>;

/** The causes an event adds to the pull, by event kind. */
const EVENT_PULLS: Readonly<Record<string, string>> = {
  "housing.eviction": "movesEvictedPull",
  "work.job-lost": "movesJobLostPull",
  [MOVED_AWAY_EVENT]: "movesKinMovedPull",
  "life.death": "movesHouseholdLossPull",
};

export interface Departure {
  id: string;
  personId: PersonId;
  /** Everyone who left with them (a partner and children), them included. */
  withIds: readonly PersonId[];
  householdId: string;
  date: string;
  /** The town they left. */
  fromPlaceId: string;
  /** The place they went: a county or state jurisdiction, from a record. */
  destinationId: string;
  destinationBasis: "relative" | "county-flow" | "state";
  /** The pull that built up, by cause, the latest pushes and what held them. */
  reasons: Readonly<Record<string, number>>;
  /** The records each reason read, by reason. */
  reads: Readonly<Record<string, readonly string[]>>;
  /** Cash the leavers took out of the town's books, to the place's outside account (as a counted mover's does). */
  cashLeftMinor?: number;
  /** The record of the home the household sold on leaving, when it owned one. */
  homeSaleId?: string;
}

function m(api: CoreAPI, key: string): number {
  const row = MOVES_PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
}

function store(api: CoreAPI) {
  return api.moduleState(MOVES_MODULE_ID);
}

interface Pull {
  id: string;
  /** Built up so far, on the scale where staying weighs movesStayPull. */
  value: number;
  /** What built it, by cause. */
  causes: Record<string, number>;
  /** The records each cause read, by cause. */
  reads: Record<string, readonly string[]>;
  /** The latest month's pushes, on the scale of the holds. */
  pushes?: Record<string, number>;
  /** The region's conditions as they last scaled the pull. */
  placeFactor?: number;
  /** At the opening: the pushes less the holds the opening pull was ranked by. */
  openingNet?: number;
}

function pullOf(api: CoreAPI, person: Readonly<PersonState>): Pull {
  const held = store(api).table("pulls").get(person.id) as unknown as
    Pull | undefined;
  // Stored rows are frozen; work on a copy.
  if (held)
    return {
      ...held,
      causes: { ...held.causes },
      reads: { ...(held.reads ?? {}) },
    };
  // Someone who comes of age or into town life starts with no pull built;
  // the adults already in town at the opening get theirs from their records
  // at the first review (openingPulls).
  return { id: person.id, value: api.parameter("zero"), causes: {}, reads: {} };
}

function savePull(api: CoreAPI, pull: Pull): void {
  store(api)
    .table("pulls")
    .put(pull as unknown as { id: string });
}

function ageOf(api: CoreAPI, person: Readonly<PersonState>): number {
  return ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(api.state.date));
}

/** The ACS age band a person is in, or none below the youngest. */
function bandOf(api: CoreAPI, person: Readonly<PersonState>): string | null {
  const age = ageOf(api, person);
  for (const band of RATES.ageBands) {
    const [low, high] = band.replace("+", "-").split("-");
    if (age >= Number(low) && (!high || age <= Number(high))) return band;
  }
  return null;
}

/** The ACS rate of leaving the county for this person's age band and state. */
function lifeStageRate(
  api: CoreAPI,
  person: Readonly<PersonState>,
  band: string,
): number {
  const place = corePlaceByJurisdictionId(person.placeId as EntityId);
  const byAge = (
    (place?.stateJurisdictionKey && RATES.places[place.stateJurisdictionKey]) ||
    RATES.national
  ).departurePerYearByAge;
  return byAge[band] ?? api.parameter("zero");
}

interface Kin {
  parents: Map<PersonId, PersonId[]>;
  children: Map<PersonId, PersonId[]>;
  partner: Map<PersonId, PersonId>;
  size: number;
}
const kinCache = new WeakMap<CoreState, Kin>();

/** Parents, children and partners from the family links, rebuilt when links change. */
function kinOf(core: CoreState): Kin {
  const held = kinCache.get(core);
  if (held && held.size === core.familyLinks.size) return held;
  const kin: Kin = {
    parents: new Map(),
    children: new Map(),
    partner: new Map(),
    size: core.familyLinks.size,
  };
  for (const link of core.familyLinks.values()) {
    const [a, b] = link.personIds;
    if (link.kind === "partner") {
      kin.partner.set(a, b);
      kin.partner.set(b, a);
    } else {
      kin.children.set(a, [...(kin.children.get(a) ?? []), b]);
      kin.parents.set(b, [...(kin.parents.get(b) ?? []), a]);
    }
  }
  kinCache.set(core, kin);
  return kin;
}

function inTown(core: CoreState, id: PersonId): boolean {
  const person = core.people.get(id);
  return !!person?.alive && person.tier !== INACTIVE_TIER;
}

function ownsWithMortgage(core: CoreState, householdId: string): boolean {
  for (const row of core.finance.contracts.values())
    if (
      row.householdId === householdId &&
      !row.endedAt &&
      row.id.startsWith(MORTGAGE_PREFIX)
    )
      return true;
  return false;
}

/** Whether every member of the household still in town is going, so the home is sold. */
function wholeHouseholdGoes(
  core: CoreState,
  householdId: string,
  going: readonly PersonId[],
): boolean {
  return (
    core.modules.has("housing") &&
    !(core.households.get(householdId)?.memberIds ?? []).some(
      (id) => inTown(core, id) && !going.includes(id),
    )
  );
}

function ownsHome(api: CoreAPI, householdId: string): boolean {
  const core = api.state as CoreState;
  if (core.modules.has("housing")) {
    const row = api
      .moduleState("housing")
      .table("dwellings")
      .get(`dwelling:${householdId}`) as { tenure?: string } | undefined;
    if (row?.tenure) return row.tenure === "own";
  }
  return ownsWithMortgage(core, householdId);
}

/**
 * Who holds an office today: the officials roster's seated members and the
 * offices engine's serving terms. Read by module id: the offices engine
 * imports this one.
 */
const officeByCore = new WeakMap<
  CoreState,
  { date: string; ids: Set<string> }
>();
function officeholders(api: CoreAPI): ReadonlySet<PersonId> {
  const core = api.state as CoreState;
  const held = officeByCore.get(core);
  if (held?.date === core.date) return held.ids;
  const ids = new Set<string>();
  if (core.modules.has("core2-officials-v1"))
    for (const row of api
      .moduleState("core2-officials-v1")
      .table("officials")
      .rows())
      if (row.ended === null) ids.add(row.id);
  if (core.modules.has("core2-offices-v1"))
    for (const row of api.moduleState("core2-offices-v1").table("terms").rows())
      if (row.status === "serving" && typeof row.personId === "string")
        ids.add(row.personId);
  officeByCore.set(core, { date: core.date, ids });
  return ids;
}

/** What holds this person in town, each a weight against the pull. */
export function holdsOf(
  api: CoreAPI,
  person: Readonly<PersonState>,
): Record<string, number> {
  const core = api.state as CoreState;
  const zero = api.parameter("zero");
  const kin = kinOf(core);
  const minimum = m(api, "movesMinimumAge");
  const atHome = (id: PersonId) =>
    inTown(core, id) && core.people.get(id)!.householdId === person.householdId;
  // A grown child living with a parent does not own the parent's home.
  const childAtHome = (kin.parents.get(person.id) ?? []).some(atHome);
  // Their own children under the minimum age, living with them.
  const children = (kin.children.get(person.id) ?? []).some(
    (id) => atHome(id) && ageOf(api, core.people.get(id)!) < minimum,
  );
  // Relatives in town, at home or not, other than their own young children.
  const relatives = [...person.familyIds].filter(
    (id) =>
      inTown(core, id) &&
      !(
        (kin.children.get(person.id) ?? []).includes(id) &&
        ageOf(api, core.people.get(id)!) < minimum
      ),
  ).length;
  // Every trait's lean toward moving away over staying put, through the
  // shared trait table (about -1 to 1).
  const temperament = decisionLean(
    api.state,
    person,
    "moves.move-away",
    "move-away",
    "stay-put",
  );
  return {
    owner:
      !childAtHome && ownsHome(api, person.householdId)
        ? m(api, "movesOwnerHold")
        : zero,
    children: children ? m(api, "movesChildrenHold") : zero,
    kin:
      m(api, "movesKinHold") * Math.min(relatives, m(api, "movesKinHoldCap")),
    // Holding office is a job, and the strongest hold: leaving town gives up the seat.
    job:
      person.jobId || officeholders(api).has(person.id)
        ? m(api, "movesJobHold")
        : zero,
    office: officeholders(api).has(person.id)
      ? m(api, "movesOfficeHold")
      : zero,
    // A lean toward change and risk loosens the hold; one toward keeping
    // things the same tightens it.
    temperament: -decisionTraitWeight(core, "moves.move-away") * temperament,
  };
}

interface Conditions {
  date: string;
  /** Each household's monthly rent or mortgage, and the contracts read. */
  shelter: Map<string, { minor: number; ids: string[] }>;
}
const conditionsByCore = new WeakMap<CoreState, Conditions>();

/** The town's shelter contracts, indexed once a day. */
function conditionsOf(core: CoreState): Conditions {
  const held = conditionsByCore.get(core);
  if (held?.date === core.date) return held;
  const shelter = new Map<string, { minor: number; ids: string[] }>();
  for (const row of core.finance.contracts.values()) {
    if (row.endedAt || !row.householdId) continue;
    if (!row.id.startsWith("lease:") && !row.id.startsWith(MORTGAGE_PREFIX))
      continue;
    const entry = shelter.get(row.householdId) ?? { minor: 0, ids: [] };
    entry.minor += row.amountMinor / Math.max(row.periodMonths, 1);
    entry.ids.push(row.id);
    shelter.set(row.householdId, entry);
  }
  const built = { date: core.date, shelter };
  conditionsByCore.set(core, built);
  return built;
}

/** A household's monthly income from its records: its members' open jobs and recorded income awards. */
function householdIncome(
  api: CoreAPI,
  householdId: string,
): { minor: number; ids: string[] } {
  const core = api.state as CoreState;
  const ids: string[] = [];
  let minor = api.parameter("zero");
  const perMonth = m(api, "movesDaysPerYear") / api.parameter("monthsPerYear");
  for (const id of core.households.get(householdId)?.memberIds ?? []) {
    const jobId = core.people.get(id)?.jobId;
    const job = jobId ? core.jobs.get(jobId) : undefined;
    if (job && job.endsAt === undefined) {
      minor += job.wageDailyMinor * perMonth;
      ids.push(job.id);
    }
    for (const contractId of core.finance.incomeContractsByPerson.get(id) ??
      []) {
      const row = core.finance.contracts.get(contractId);
      if (!row || row.endedAt) continue;
      minor += row.amountMinor / Math.max(row.periodMonths, 1);
      ids.push(row.id);
    }
  }
  return { minor, ids };
}

/**
 * What pushes this person toward leaving, each read from their own records,
 * on the same scale as what holds them (holdsOf): what their home costs
 * against what their household earns, a job paid from another place, and
 * the people close to them who live elsewhere. Each part names the records
 * it read. Being out of work loosens the job hold instead (holdsOf), and a
 * lost job, an eviction, a death at home or a relative leaving add their own
 * push on the day (EVENT_PULLS).
 */
export function pushesOf(
  api: CoreAPI,
  person: Readonly<PersonState>,
): { parts: Record<string, number>; reads: Record<string, string[]> } {
  const core = api.state as CoreState;
  const zero = api.parameter("zero");
  const parts: Record<string, number> = {};
  const reads: Record<string, string[]> = {};
  // Rent or mortgage against income, sliding: the share of income it takes,
  // up to the cap (no income at all reads as the cap).
  const shelter = conditionsOf(core).shelter.get(person.householdId);
  if (shelter && shelter.minor > zero) {
    const income = householdIncome(api, person.householdId);
    const cap = m(api, "movesHousingCostShareCap");
    const share =
      income.minor > zero ? Math.min(shelter.minor / income.minor, cap) : cap;
    parts.housingCost = m(api, "movesHousingCostWeight") * share;
    reads.housingCost = [...shelter.ids, ...income.ids];
  }
  // A job whose employer is in another place.
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  const employer = job ? core.organizations.get(job.organizationId) : undefined;
  if (
    job &&
    job.endsAt === undefined &&
    employer?.placeId &&
    employer.placeId !== person.placeId
  ) {
    parts.jobElsewhere = m(api, "movesJobElsewherePush");
    reads.jobElsewhere = [job.id, employer.id];
  }
  // A partner, parent or child living elsewhere, by how close they are now.
  const kin = kinOf(core);
  const close = new Set<PersonId>([
    ...(kin.parents.get(person.id) ?? []),
    ...(kin.children.get(person.id) ?? []),
  ]);
  const partner = kin.partner.get(person.id);
  if (partner) close.add(partner);
  let closeness = zero;
  const away: string[] = [];
  for (const id of core.relationshipsByPerson.get(person.id) ?? []) {
    const row = core.relationships.get(id);
    if (!row) continue;
    const other = row.actorId === person.id ? row.otherId : row.actorId;
    if (!close.has(other)) continue;
    const relative = core.people.get(other);
    if (!relative?.alive || inTown(core, other)) continue;
    closeness += currentCloseness(core, row);
    away.push(row.id);
  }
  if (away.length) {
    parts.closeElsewhere =
      m(api, "movesCloseElsewherePull") *
      Math.min(closeness, m(api, "movesKinHoldCap"));
    reads.closeElsewhere = away;
  }
  return { parts, reads };
}

/**
 * The town's conditions: unemployment in its region against the nation's,
 * as it has moved since the opening (the ACS rates the pull is scaled to
 * are the opening's). A worsening region speeds everyone's pull, sliding;
 * one that improves slows it.
 */
function placeConditions(
  api: CoreAPI,
  placeId: string,
): { factor: number; reads: string[] } {
  const core = api.state as CoreState;
  if (!core.modules.has("macro") || !regionalRegistered(api))
    return { factor: api.parameter("one"), reads: [] };
  const region = regionalLevel(api, placeId);
  const nation = region
    ? (api
        .moduleState("macro")
        .table("months")
        .get(`macro-month:${region.month}`) as
        { id: string; unemploymentPct: number } | undefined)
    : undefined;
  if (!region || !nation) return { factor: api.parameter("one"), reads: [] };
  const change =
    region.unemploymentPct - nation.unemploymentPct - region.openingGapPct;
  return {
    factor: Math.exp(m(api, "movesUnemploymentGapWeight") * change),
    reads: [region.id, nation.id],
  };
}

const sum = (values: Readonly<Record<string, number>>, zero: number) =>
  Object.values(values).reduce((total, value) => total + value, zero);

function action(id: string, leaving: boolean): ActionDefinition {
  return {
    id,
    // One act kind for both, so temperament weighs on how fast the pull
    // builds (a hold), never on where the bar sits.
    actKinds: ["commit"],
    goalKinds: [],
    need: "time",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "place",
    effect: "move",
    reasonBindings: [
      {
        id: "pull",
        provider: "moves-pull",
        weightParameter: "one",
        arguments: { leaving: String(leaving) },
        stopgapId: STOPGAP,
      },
    ],
  };
}
export const MOVE_AWAY = action("move-away", true);
export const STAY_PUT = action("stay-put", false);

/** Where they go: a relative living elsewhere, else the county's most common destination, else the state. */
function destinationFor(
  api: CoreAPI,
  person: Readonly<PersonState>,
  goingIds: ReadonlySet<PersonId>,
): Pick<Departure, "destinationId" | "destinationBasis"> & {
  countyId?: string;
} {
  const core = api.state as CoreState;
  const kin = kinOf(core);
  const close = [
    ...(kin.parents.get(person.id) ?? []),
    ...(kin.children.get(person.id) ?? []),
    ...[...person.familyIds],
  ];
  for (const id of close) {
    if (goingIds.has(id)) continue;
    const relative = core.people.get(id);
    if (relative?.alive && relative.placeId !== person.placeId)
      return {
        destinationId: relative.placeId,
        destinationBasis: "relative",
        ...(relative.countyId ? { countyId: relative.countyId } : {}),
      };
  }
  const county = person.countyId
    ? corePlaceByJurisdictionId(person.countyId as EntityId)
    : undefined;
  const top = county?.sourceGeoid
    ? TOP_DESTINATION[county.sourceGeoid]
    : undefined;
  const to = top
    ? corePlaceByKey(`county:${top}`)?.context.jurisdiction.id
    : undefined;
  if (to)
    return { destinationId: to, destinationBasis: "county-flow", countyId: to };
  const place = corePlaceByJurisdictionId(person.placeId as EntityId);
  const state = place?.stateJurisdictionKey
    ? corePlaceByKey(place.stateJurisdictionKey)?.context.jurisdiction.id
    : undefined;
  return {
    destinationId: state ?? person.placeId,
    destinationBasis: "state",
  };
}

/**
 * The people who go with a leaver: a householder's partner and children under
 * the minimum age, and any minor who would otherwise be left in the household
 * with no adult at home (they follow the guardian they live with).
 */
function goingWith(api: CoreAPI, person: Readonly<PersonState>): PersonId[] {
  const core = api.state as CoreState;
  const kin = kinOf(core);
  const household = core.households.get(person.householdId);
  const members = new Set(
    (household?.memberIds ?? []).filter((id) => inTown(core, id)),
  );
  const minimum = m(api, "movesMinimumAge");
  const going = [person.id];
  // A grown child living with a parent leaves on their own.
  if (!(kin.parents.get(person.id) ?? []).some((id) => members.has(id))) {
    const partner = kin.partner.get(person.id);
    if (partner && members.has(partner)) going.push(partner);
    for (const parent of [...going])
      for (const child of kin.children.get(parent) ?? [])
        if (
          members.has(child) &&
          !going.includes(child) &&
          ageOf(api, core.people.get(child)!) < minimum
        )
          going.push(child);
  }
  // Whoever is left at home must not be minors alone: the leaver is the
  // guardian they live with, whether or not the family links name the tie.
  const left = [...members].filter((id) => !going.includes(id));
  if (
    left.length &&
    left.every((id) => ageOf(api, core.people.get(id)!) < minimum)
  )
    going.push(...left);
  return going;
}

/** Ends what the household paid here when no one in it stays. */
function closeHousehold(api: CoreAPI, householdId: string): void {
  const core = api.state as CoreState;
  for (const row of [...core.finance.contracts.values()])
    if (
      row.householdId === householdId &&
      !row.endedAt &&
      !row.salesReceiptBudget &&
      !row.recipientIncome
    )
      api.endStandingContract(row.id);
  endLivingPlan(core, householdId);
}

function leave(
  api: CoreAPI,
  person: Readonly<PersonState>,
  pull: Pull,
  holds: Readonly<Record<string, number>>,
): Departure {
  const core = api.state as CoreState;
  const going = goingWith(api, person);
  const { countyId, ...where } = destinationFor(api, person, new Set(going));
  const fromPlaceId = person.placeId;
  const household = core.households.get(person.householdId);
  const staying = (household?.memberIds ?? []).filter(
    (id) => inTown(core, id) && !going.includes(id),
  );
  const departure: Departure = {
    id: `${MOVED_AWAY_EVENT}:${person.id}:${api.state.date}`,
    personId: person.id,
    withIds: going,
    householdId: person.householdId,
    date: api.state.date,
    fromPlaceId,
    ...where,
    reasons: {
      ...pull.causes,
      ...Object.fromEntries(
        Object.entries(pull.pushes ?? {}).map(([key, value]) => [
          `push:${key}`,
          value,
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(holds).map(([key, value]) => [`hold:${key}`, -value]),
      ),
    },
    reads: pull.reads,
  };
  // The inactive tier takes them out of town life; the new place takes them
  // off the town's residents and voter rolls.
  const witnessIds = [
    ...new Set([
      ...staying,
      ...going.flatMap((id) =>
        [...core.people.get(id)!.familyIds].filter(
          (other) => !going.includes(other) && inTown(core, other),
        ),
      ),
    ]),
  ].sort();
  // A household that owned its home sells it as the last of its members go:
  // the lender is paid off from the price, and the surplus leaves with them.
  const sale = !staying.length
    ? sellHome(api, person.householdId, "moves.departure")
    : undefined;
  if (sale) departure.homeSaleId = sale.id;
  // Their cash leaves the town's books the way a counted mover's does: to the
  // place's outside account, so the town's money isn't left holding it.
  // (The place's own outside market; a leaver living elsewhere uses the world's.)
  const markets = [...core.organizations.values()]
    .filter((row) => row.kind === OUTSIDE_MARKET_KIND)
    .sort((a, b) => a.id.localeCompare(b.id));
  const outside = (
    markets.find((row) => row.placeId === fromPlaceId) ?? markets[0]
  )?.id;
  if (outside) {
    const accounts = api.accounts();
    let left = 0;
    for (const id of going) {
      const from = accounts.main(id),
        amount = accounts.balance(from);
      if (amount <= 0) continue;
      accounts.transfer({
        id: `mover-departure:${id}:${api.state.date}`,
        from,
        to: accounts.main(outside),
        amountMinor: amount,
        reasonKey: "moves.departure.cash",
        source: {
          tag: "ESTIMATED",
          asOf: api.state.date,
          citation: `${id} moved away and took their cash out of town.`,
          estimatedFrom: STOPGAP,
        },
      });
      left += amount;
    }
    if (left > 0) departure.cashLeftMinor = left;
  }
  // The jobs each mover leaves, named on the event so their employers replace them.
  const jobsLeft: Record<string, string> = {};
  for (const id of going) {
    const mover = core.people.get(id)!;
    if (mover.jobId) {
      jobsLeft[`person:${id}:job`] = mover.jobId;
      api.endJob(mover.jobId, departure.id);
    }
    api.updatePerson(id, { tier: INACTIVE_TIER });
    store(api).table("pulls").remove(id);
  }
  if (!staying.length) closeHousehold(api, person.householdId);
  const source = {
    tag: "ESTIMATED" as const,
    asOf: api.state.date,
    citation: `${person.givenName} ${person.familyName} moved away (${where.destinationBasis}).`,
    estimatedFrom: STOPGAP,
  };
  // A whole household moves as itself; those who leave others behind
  // start a household at the new place.
  const arrivalHousehold = household?.memberIds.every((id) =>
    going.includes(id),
  )
    ? person.householdId
    : `${person.householdId}:moved:${person.id}:${api.state.date}`;
  api.relocatePeopleV1({
    personIds: going,
    placeId: where.destinationId,
    ...(countyId ? { countyId } : {}),
    householdId: arrivalHousehold,
    source,
  });
  // A recorded income award (a pension, Social Security) is paid into the
  // household where its person lives now, the same amount from its next due date.
  for (const id of going) moveRecipientIncomeHome(core, id, arrivalHousehold);
  api.emit({
    id: departure.id,
    date: api.state.date,
    kind: MOVED_AWAY_EVENT,
    personIds: going,
    // Their relatives and housemates who stay in town know they left.
    witnessIds,
    placeId: fromPlaceId,
    publicRecord: false,
    topic: where.destinationId,
    source,
    facts: {
      ...Object.fromEntries(
        going.map((id) => [`person:${id}:residence`, where.destinationId]),
      ),
      ...jobsLeft,
      ...(sale ? { homeSaleId: sale.id } : {}),
      [DEPARTURE_FACT]: JSON.stringify(departure),
    },
  });
  return departure;
}

const pending = new WeakMap<object, { pull: Pull }>();

/** How fast this person's pull builds against no ties and no pushes: their pushes over their holds. */
function netFactor(
  api: CoreAPI,
  person: Readonly<PersonState>,
): { factor: number; net: number; pushes: ReturnType<typeof pushesOf> } {
  const zero = api.parameter("zero");
  const pushes = pushesOf(api, person);
  const net = sum(pushes.parts, zero) - sum(holdsOf(api, person), zero);
  return { factor: Math.exp(net), net, pushes };
}

/** One adult's pull builds by a month of their stage of life, weighed by their ties and pushes. */
function accumulate(
  api: CoreAPI,
  person: Readonly<PersonState>,
  typical?: ReadonlyMap<string, number>,
  place?: { factor: number; reads: string[] },
): void {
  const band = bandOf(api, person);
  if (!band) return;
  // A seat holds its holder: only a recorded event (a job lost, a death at
  // home, an eviction, kin leaving) builds their pull while they serve.
  if (officeholders(api).has(person.id)) return;
  const pull = pullOf(api, person);
  const { factor, pushes } = netFactor(api, person);
  const conditions = place ?? placeConditions(api, person.placeId);
  // Records decide who of an age leaves, not how many: the person's pushes
  // over their ties against the town's typical for their age band. The
  // region's conditions move how many.
  const stage =
    (lifeStageRate(api, person, band) / api.parameter("monthsPerYear")) *
    m(api, "movesLifeStageScale") *
    (factor / (typical?.get(band) ?? factor)) *
    conditions.factor;
  pull.value += stage;
  pull.causes = {
    ...pull.causes,
    lifeStage: (pull.causes.lifeStage ?? api.parameter("zero")) + stage,
  };
  pull.reads = {
    ...pull.reads,
    ...pushes.reads,
    ...(conditions.reads.length ? { placeConditions: conditions.reads } : {}),
  };
  pull.pushes = { ...pushes.parts };
  if (conditions.reads.length) pull.placeFactor = conditions.factor;
  savePull(api, pull);
}

/**
 * Where each adult in town already is in their thinking about moving at the
 * opening, from their records: the town's adults ordered by how hard their
 * records push them out over what holds them, spread evenly over the way to
 * leaving, so departures run steadily from the first month (a town that has
 * been running for years) and the first to go are the ones their records
 * push hardest. Equal records stand at the same place.
 */
function openingPulls(api: CoreAPI, adults: readonly PersonState[]): void {
  const zero = api.parameter("zero");
  const one = api.parameter("one");
  const seated = officeholders(api);
  const rows = adults
    .filter((person) => bandOf(api, person) && !seated.has(person.id))
    .map((person) => ({ person, ...netFactor(api, person) }))
    .sort((a, b) => a.net - b.net);
  const stay = m(api, "movesStayPull");
  let start = zero;
  while (start < rows.length) {
    let end = start;
    while (end + one < rows.length && rows[end + one]!.net === rows[start]!.net)
      end += one;
    // The middle of the run of equal records, as a share of the town.
    const at = ((start + end) / 2 + one / 2) / rows.length;
    for (let index = start; index <= end; index += one) {
      const row = rows[index]!;
      const pull = pullOf(api, row.person);
      const opening = at * stay;
      pull.value += opening;
      pull.causes = { ...pull.causes, opening };
      pull.reads = {
        ...pull.reads,
        ...row.pushes.reads,
        opening: Object.keys(row.pushes.parts)
          .concat(
            Object.keys(holdsOf(api, row.person)).map((key) => `hold:${key}`),
          )
          .sort(),
      };
      pull.openingNet = row.net;
      savePull(api, pull);
    }
    start = end + one;
  }
}

/** The partner a person shares a household with in town, if any. */
function partnerAtHome(
  api: CoreAPI,
  person: Readonly<PersonState>,
): Readonly<PersonState> | undefined {
  const core = api.state as CoreState;
  const id = kinOf(core).partner.get(person.id);
  const partner = id ? core.people.get(id) : undefined;
  return partner &&
    inTown(core, partner.id) &&
    partner.householdId === person.householdId &&
    ageOf(api, partner) >= m(api, "movesMinimumAge")
    ? partner
    : undefined;
}

/**
 * One decision about leaving: an adult on their own, or a couple together on
 * the mean of their two pulls (the partner listed first decides for both).
 */
function decide(api: CoreAPI, person: Readonly<PersonState>): Departure | null {
  const partner = partnerAtHome(api, person);
  if (partner && partner.id.localeCompare(person.id) < api.parameter("zero"))
    return null;
  const own = pullOf(api, person);
  const pulls = partner ? [own, pullOf(api, partner)] : [own];
  const causes: Record<string, number> = {};
  for (const row of pulls)
    for (const [key, value] of Object.entries(row.causes))
      causes[key] =
        (causes[key] ?? api.parameter("zero")) + value / pulls.length;
  const reads: Record<string, readonly string[]> = {};
  for (const row of pulls)
    for (const [key, ids] of Object.entries(row.reads))
      reads[key] = [...new Set([...(reads[key] ?? []), ...ids])].sort();
  const pull: Pull = {
    id: person.id,
    reads,
    ...(own.pushes ? { pushes: own.pushes } : {}),
    value:
      pulls.reduce((sum, row) => sum + row.value, api.parameter("zero")) /
      pulls.length,
    causes,
  };
  const holds = holdsOf(api, person);
  // An owner household with a mortgage sells its home when all of its members
  // go; when only some go, it stays together (registered stopgap) and a grown
  // child in it can still leave.
  const going = goingWith(api, person);
  // The player's moves are the player's own choice, never the engine's.
  const playerId = (api.state as CoreState).playerId;
  if (playerId && (going.includes(playerId) || partner?.id === playerId))
    return null;
  if (
    going.length > api.parameter("one") &&
    ownsWithMortgage(api.state as CoreState, person.householdId) &&
    !wholeHouseholdGoes(api.state as CoreState, person.householdId, going)
  ) {
    api.stopgap(OWNER_STOPGAP);
    return null;
  }
  // An officeholder in the household leaves only for a recorded cause (an
  // event's pull), never on a partner's stage of life alone.
  const seated = officeholders(api);
  if (
    going.some((id) => seated.has(id)) &&
    !Object.keys(pull.causes).some((key) => EVENT_PULLS[key] !== undefined)
  )
    return null;
  pending.set(api.state, { pull });
  const offers: ActOffer[] = [STAY_PUT, MOVE_AWAY].map((definition) => ({
    definition,
    targetId: person.placeId,
    availableHours: api.parameter("hoursPerDay"),
  }));
  const scored = scoreOffers(api.state, person.id, offers, {
    needValues: { time: api.parameter("zero") },
  });
  const decision = decisionFromScores(api.state, person.id, scored);
  pending.delete(api.state);
  if (decision.selected?.definition.id !== MOVE_AWAY.id) return null;
  return leave(api, person, pull, holds);
}

/**
 * The pull at which leaving would outscore staying for this person today,
 * with every other reason in their choice as it stands: the chooser's two
 * scores are straight lines in the pull, so two readings place the point.
 */
function leavingPoint(api: CoreAPI, person: Readonly<PersonState>): number {
  const zero = api.parameter("zero");
  const offers: ActOffer[] = [STAY_PUT, MOVE_AWAY].map((definition) => ({
    definition,
    targetId: person.placeId,
    availableHours: api.parameter("hoursPerDay"),
  }));
  const margin = (value: number) => {
    pending.set(api.state, {
      pull: { id: person.id, value, causes: {}, reads: {} },
    });
    const scored = scoreOffers(api.state, person.id, offers, {
      needValues: { time: zero },
    });
    pending.delete(api.state);
    const score = (id: string) =>
      scored.find((row) => row.offer.definition.id === id)!.score;
    return score(MOVE_AWAY.id) - score(STAY_PUT.id);
  };
  const atZero = margin(zero);
  const slope = margin(api.parameter("one")) - atZero;
  return slope > zero ? -atZero / slope : Number.POSITIVE_INFINITY;
}

/** The partner who decides for a couple (listed first), or the person alone. */
function decider(
  api: CoreAPI,
  person: Readonly<PersonState>,
): Readonly<PersonState> {
  const partner = partnerAtHome(api, person);
  return partner && partner.id.localeCompare(person.id) < api.parameter("zero")
    ? partner
    : person;
}

const PERSON_REVIEW_KIND = "moves-person-review";

/**
 * Books one person's own review of leaving on a day (the earliest booked
 * stands): the day a cause reached them, or the day their building pull
 * reaches the point where leaving would win.
 */
function bookReview(api: CoreAPI, personId: PersonId, date: string): void {
  const calendar = api.moduleCalendar(MOVES_MODULE_ID);
  const key = `person-review:${personId}`;
  const held = calendar.get(key);
  if (held?.status === "running") return;
  if (held?.status === "pending") {
    if (held.date <= date) return;
    calendar.cancel(key);
  } else if (held) calendar.forget(key);
  calendar.schedule({
    key,
    date,
    kind: PERSON_REVIEW_KIND,
    payload: { personId },
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation:
        "The day a cause reached this person, or the day their pull to leave reaches the point where leaving wins.",
      estimatedFrom: STOPGAP,
    },
    sourceRecordIds: [personId],
  });
}

/** One adult's month: their pull builds, then they (or their couple) choose. */
export function reviewMove(
  api: CoreAPI,
  personId: PersonId,
  typical?: ReadonlyMap<string, number>,
): Departure | null {
  const person = api.state.people.get(personId);
  if (!person?.alive || person.tier === INACTIVE_TIER) return null;
  if (ageOf(api, person) < m(api, "movesMinimumAge")) return null;
  accumulate(api, person, typical);
  return decide(api, person);
}

const REVIEW_KIND = "moves-review";

/** The first day of the month after a date. */
function scheduleDate(api: CoreAPI, date: string): string {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return month === api.parameter("monthsPerYear")
    ? `${year + api.parameter("one")}-01-01`
    : `${year}-${String(month + api.parameter("one")).padStart(2, "0")}-01`;
}

/** Books the next month's building of every pull, on its first day. */
function scheduleReview(api: CoreAPI): void {
  const next = scheduleDate(api, api.state.date);
  api.moduleCalendar(MOVES_MODULE_ID).schedule({
    key: `review:${next}`,
    date: next,
    kind: REVIEW_KIND,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation:
        "The month's building of each adult's pull to leave, at their stage of life.",
      estimatedFrom: STOPGAP,
    },
    sourceRecordIds: ["moves:state"],
  });
}

/**
 * Once a month every adult's pull builds by a month of their stage of life
 * (the rates are yearly, by age), and each one whose pull will reach the
 * point of leaving is booked a review on that day.
 */
function monthlyReview(api: CoreAPI): void {
  const core = api.state as CoreState;
  const adults = [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.tier !== INACTIVE_TIER &&
        ageOf(api, row) >= m(api, "movesMinimumAge"),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  // The town's typical hold for each age band, from this month's ties.
  const sums = new Map<string, [number, number]>();
  for (const person of adults) {
    const band = bandOf(api, person);
    if (!band) continue;
    const [sum, count] = sums.get(band) ?? [
      api.parameter("zero"),
      api.parameter("zero"),
    ];
    sums.set(band, [
      sum + netFactor(api, person).factor,
      count + api.parameter("one"),
    ]);
  }
  const typical = new Map(
    [...sums].map(([band, [sum, count]]) => [band, sum / count]),
  );
  const state = store(api).table("state").get("moves:state") as
    { id: string; openingRanked?: boolean } | undefined;
  if (state && !state.openingRanked) {
    openingPulls(api, adults);
    store(api)
      .table("state")
      .put({ ...state, openingRanked: true });
  }
  const places = new Map<string, { factor: number; reads: string[] }>();
  const before = new Map<PersonId, number>();
  for (const person of adults) {
    let place = places.get(person.placeId);
    if (!place) {
      place = placeConditions(api, person.placeId);
      places.set(person.placeId, place);
    }
    before.set(person.id, pullOf(api, person).value);
    accumulate(api, person, typical, place);
  }
  // Each couple or adult alone leaves on the day in the month their pull,
  // building evenly, reaches the point where leaving wins; nobody's choice
  // waits for the 1st.
  const next = makeIsoDate(scheduleDate(api, api.state.date));
  const monthDays = Math.round(
    (Date.parse(`${next}T00:00:00Z`) -
      Date.parse(`${api.state.date}T00:00:00Z`)) /
      86_400_000,
  );
  for (const person of adults) {
    if (!inTown(core, person.id) || decider(api, person) !== person) continue;
    const partner = partnerAtHome(api, person);
    const ids = partner ? [person.id, partner.id] : [person.id];
    const mean = (values: number[]) =>
      values.reduce((n, v) => n + v, api.parameter("zero")) / values.length;
    const from = mean(ids.map((id) => before.get(id) ?? api.parameter("zero")));
    const to = mean(ids.map((id) => pullOf(api, core.people.get(id)!).value));
    const point = leavingPoint(api, person);
    if (to < point) continue;
    const share =
      from >= point || to <= from
        ? api.parameter("zero")
        : (point - from) / (to - from);
    const day = Math.max(api.parameter("one"), Math.ceil(share * monthDays));
    bookReview(api, person.id, addDays(makeIsoDate(api.state.date), day));
  }
}

/** An event's push toward leaving, added to the people it names. */
function addEventPull(api: CoreAPI, event: CoreEventInput): void {
  const key = EVENT_PULLS[event.kind];
  if (!key) return;
  const core = api.state as CoreState;
  const amount = m(api, key);
  let named: PersonId[] = [...event.personIds];
  if (event.kind === MOVED_AWAY_EVENT) {
    // A parent, child or sibling still in town feels the pull to follow.
    const kin = kinOf(core);
    const relatives = new Set<PersonId>();
    for (const id of event.personIds) {
      for (const other of [
        ...(kin.parents.get(id) ?? []),
        ...(kin.children.get(id) ?? []),
      ])
        relatives.add(other);
      for (const parent of kin.parents.get(id) ?? [])
        for (const sibling of kin.children.get(parent) ?? [])
          relatives.add(sibling);
    }
    named = [...relatives].filter(
      (id) => !event.personIds.includes(id) && inTown(core, id),
    );
  } else if (event.kind === "life.death") {
    // A death changes the household: the partner and the others at home.
    const kin = kinOf(core);
    const left = new Set<PersonId>();
    for (const id of event.personIds) {
      const partner = kin.partner.get(id);
      if (partner) left.add(partner);
      const home = core.people.get(id)?.householdId;
      for (const member of core.households.get(home ?? "")?.memberIds ?? [])
        left.add(member);
    }
    named = [...left].filter(
      (id) => !event.personIds.includes(id) && inTown(core, id),
    );
  }
  for (const id of named) {
    const person = core.people.get(id);
    if (!person?.alive || person.tier === INACTIVE_TIER) continue;
    if (ageOf(api, person) < m(api, "movesMinimumAge")) continue;
    const pull = pullOf(api, person);
    pull.value += amount;
    pull.causes = {
      ...pull.causes,
      [event.kind]: (pull.causes[event.kind] ?? api.parameter("zero")) + amount,
    };
    pull.reads = {
      ...pull.reads,
      [event.kind]: [...(pull.reads[event.kind] ?? []), event.id],
    };
    savePull(api, pull);
    // The cause changed their pull: they weigh leaving the next day.
    if (inTown(core, id))
      bookReview(
        api,
        decider(api, person).id,
        addDays(makeIsoDate(api.state.date), api.parameter("one")),
      );
  }
}

/** The departure record rides on its event, for tests and proofs that watch departures. */
const DEPARTURE_FACT = "moves:departure";
const watched = new WeakMap<object, Departure[]>();

/**
 * Starts recording each departure the engine emits (for tests and year proofs;
 * no engine reads departures in play). Register it right after the world is
 * built, before any day runs; the departures seen so far come from
 * `departuresSeen`.
 */
export function watchDepartures(core: CoreState): void {
  if (watched.has(core)) return;
  const seen: Departure[] = [];
  watched.set(core, seen);
  registerModule(core, {
    id: "moves:departures-watch",
    eventKinds: [MOVED_AWAY_EVENT],
    onEvent: (_api, event) => {
      const record = event.facts?.[DEPARTURE_FACT];
      if (record) seen.push(JSON.parse(record) as Departure);
    },
  });
}

export function departuresSeen(core: CoreState): Departure[] {
  const seen = watched.get(core);
  if (!seen) throw new Error("watchDepartures(core) was not called first");
  return seen;
}

export const movesModule: CoreModule = {
  id: MOVES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { state: {}, pulls: {} },
  },
  eventKinds: Object.keys(EVENT_PULLS),
  onEvent(api, event) {
    addEventPull(api, event);
  },
  // Leaving ends jobs, which happens only from calendar work: each person's
  // review is booked on the module calendar for their own day.
  onDay(api) {
    if (store(api).table("state").get("moves:state")) return;
    store(api)
      .table("state")
      .put({ id: "moves:state", openedAt: api.state.date });
    scheduleReview(api);
  },
  onCalendarWork(api, work) {
    if (work.kind === PERSON_REVIEW_KIND) {
      const id = (work.payload as { personId?: string } | undefined)?.personId;
      const person = id ? api.state.people.get(id) : undefined;
      if (
        person?.alive &&
        person.tier !== INACTIVE_TIER &&
        inTown(api.state as CoreState, person.id) &&
        ageOf(api, person) >= m(api, "movesMinimumAge")
      )
        decide(api, decider(api, person));
      return;
    }
    if (work.kind !== REVIEW_KIND) return;
    monthlyReview(api);
    scheduleReview(api);
  },
  reasonProviders: {
    "moves-pull": (api, actor, _offer, binding) => {
      const held = pending.get(api.state);
      if (!held) return undefined;
      return {
        value:
          binding.arguments?.leaving === "true"
            ? held.pull.value
            : m(api, "movesStayPull"),
        sourceIds: [actor.id, actor.householdId],
      };
    },
  },
};
