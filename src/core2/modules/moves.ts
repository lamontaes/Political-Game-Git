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
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { stableHash } from "../kernel/ids";
import {
  lifePlaceByJurisdictionId,
  lifePlaceByKey,
} from "../../simulation/life-places";
import moverRates from "../../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import destinations from "../data/moves/destinations.json" with { type: "json" };
import rows from "../data/moves/parameters.json" with { type: "json" };
import { decisionFromScores, scoreOffers } from "../choice";
import { decisionLean } from "../trait-decisions";
import { MORTGAGE_PREFIX } from "../housing-mortgages";
import { endLivingPlan } from "../cost-of-living";
import type { Parameter } from "../parameters";
import type { EntityId } from "../../simulation/types";
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
const PINNED_STOPGAP = "SG-P15-moves-pinned-jobs";
const INCOME_STOPGAP = "SG-FIXER-moves-income-household";

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
  /** The pull that built up, by cause, and what held them. */
  reasons: Readonly<Record<string, number>>;
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
}

function pullOf(api: CoreAPI, person: Readonly<PersonState>): Pull {
  const held = store(api).table("pulls").get(person.id) as unknown as
    Pull | undefined;
  // Stored rows are frozen; work on a copy.
  if (held) return { ...held, causes: { ...held.causes } };
  // Where each adult already is in their thinking about moving at the
  // opening: generation of the opening state, keyed to the person, so the
  // town's departures run steadily from the first month (a steady flow, like
  // a town that has been running for years).
  const digits = api.parameter("seedHashDigits");
  const radix = api.parameter("seedPlaceHashRadix");
  const draw = Number.parseInt(
    stableHash(`${api.state.seed}:moves:opening:${person.id}`).slice(
      api.parameter("zero"),
      digits,
    ),
    radix,
  );
  const opening = (draw / radix ** digits) * m(api, "movesStayPull");
  return { id: person.id, value: opening, causes: { opening } };
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
  const place = lifePlaceByJurisdictionId(person.placeId as EntityId);
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

const pinnedByCore = new WeakMap<CoreState, Set<string>>();

/** Every job id a saved record names under `jobIds`, through nested JSON text. */
function collectJobIds(value: unknown, ids: Set<string>): void {
  if (typeof value === "string") {
    if (!value.includes("jobIds")) return;
    try {
      collectJobIds(JSON.parse(value), ids);
    } catch {
      return;
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collectJobIds(item, ids);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "jobIds" && Array.isArray(item)) {
        for (const id of item) if (typeof id === "string") ids.add(id);
      } else collectJobIds(item, ids);
    }
  }
}

/**
 * Jobs a saved agreement (a visitor's lodging, a public supplier contract)
 * names as its provider's qualification: the core rejects the agreement's
 * next payment once such a job ends, so their holders stay for now. A copy
 * of the jobs engine's own lookup until it is exported (registered stopgap).
 */
function pinnedJobs(core: CoreState): Set<string> {
  let ids = pinnedByCore.get(core);
  if (ids) return ids;
  ids = new Set();
  collectJobIds(Object.values(core.placeMetadata ?? {}), ids);
  for (const organization of core.organizations.values())
    collectJobIds(Object.values(organization.governmentFacts ?? {}), ids);
  pinnedByCore.set(core, ids);
  return ids;
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
    job: person.jobId ? m(api, "movesJobHold") : zero,
    // A lean toward change and risk loosens the hold; one toward keeping
    // things the same tightens it.
    temperament: -m(api, "movesRiskWeight") * temperament,
  };
}

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
    ? lifePlaceByJurisdictionId(person.countyId as EntityId)
    : undefined;
  const top = county?.sourceGeoid
    ? TOP_DESTINATION[county.sourceGeoid]
    : undefined;
  const to = top
    ? lifePlaceByKey(`county:${top}`)?.context.jurisdiction.id
    : undefined;
  if (to)
    return { destinationId: to, destinationBasis: "county-flow", countyId: to };
  const place = lifePlaceByJurisdictionId(person.placeId as EntityId);
  const state = place?.stateJurisdictionKey
    ? lifePlaceByKey(place.stateJurisdictionKey)?.context.jurisdiction.id
    : undefined;
  return {
    destinationId: state ?? person.placeId,
    destinationBasis: "state",
  };
}

/** The people who go with a leaver: a householder's partner and children under the minimum age. */
function goingWith(api: CoreAPI, person: Readonly<PersonState>): PersonId[] {
  const core = api.state as CoreState;
  const kin = kinOf(core);
  const household = core.households.get(person.householdId);
  const members = new Set(
    (household?.memberIds ?? []).filter((id) => inTown(core, id)),
  );
  // A grown child living with a parent leaves on their own.
  if ((kin.parents.get(person.id) ?? []).some((id) => members.has(id)))
    return [person.id];
  const partner = kin.partner.get(person.id);
  const going = [person.id];
  if (partner && members.has(partner)) going.push(partner);
  const minimum = m(api, "movesMinimumAge");
  for (const parent of [...going])
    for (const child of kin.children.get(parent) ?? [])
      if (
        members.has(child) &&
        !going.includes(child) &&
        ageOf(api, core.people.get(child)!) < minimum
      )
        going.push(child);
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
        Object.entries(holds).map(([key, value]) => [`hold:${key}`, -value]),
      ),
    },
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
  for (const id of going) {
    const mover = core.people.get(id)!;
    if (mover.jobId) api.endJob(mover.jobId, departure.id);
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
  api.relocatePeopleV1({
    personIds: going,
    placeId: where.destinationId,
    ...(countyId ? { countyId } : {}),
    // A whole household moves as itself; those who leave others behind
    // start a household at the new place.
    householdId: household?.memberIds.every((id) => going.includes(id))
      ? person.householdId
      : `${person.householdId}:moved:${person.id}:${api.state.date}`,
    source,
  });
  store(api)
    .table("departures")
    .put(departure as unknown as { id: string });
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
    facts: Object.fromEntries(
      going.map((id) => [`person:${id}:residence`, where.destinationId]),
    ),
  });
  return departure;
}

const pending = new WeakMap<object, { pull: Pull }>();

/** One adult's pull builds by a month of their stage of life, weighed by their ties. */
function accumulate(
  api: CoreAPI,
  person: Readonly<PersonState>,
  typical?: ReadonlyMap<string, number>,
): void {
  const band = bandOf(api, person);
  if (!band) return;
  const pull = pullOf(api, person);
  const factor = holdFactor(api, holdsOf(api, person));
  // Ties decide who of an age leaves, not how many: the person's hold
  // against the town's typical hold for their age band.
  const stage =
    (lifeStageRate(api, person, band) / api.parameter("monthsPerYear")) *
    m(api, "movesLifeStageScale") *
    (factor / (typical?.get(band) ?? factor));
  pull.value += stage;
  pull.causes = {
    ...pull.causes,
    lifeStage: (pull.causes.lifeStage ?? api.parameter("zero")) + stage,
  };
  savePull(api, pull);
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
  const pull: Pull = {
    id: person.id,
    value:
      pulls.reduce((sum, row) => sum + row.value, api.parameter("zero")) /
      pulls.length,
    causes,
  };
  const holds = holdsOf(api, person);
  // An owner household with a mortgage stays together until a home sale is
  // modeled (registered stopgap); a grown child in it can still leave.
  const going = goingWith(api, person);
  // The player's moves are the player's own choice, never the engine's.
  const playerId = (api.state as CoreState).playerId;
  if (playerId && (going.includes(playerId) || partner?.id === playerId))
    return null;
  if (
    going.length > api.parameter("one") &&
    ownsWithMortgage(api.state as CoreState, person.householdId)
  ) {
    api.stopgap(OWNER_STOPGAP);
    return null;
  }
  const pinned = pinnedJobs(api.state as CoreState);
  if (
    going.some((id) => {
      const job = api.state.people.get(id)?.jobId;
      return !!job && pinned.has(job);
    })
  ) {
    api.stopgap(PINNED_STOPGAP);
    return null;
  }
  // A recorded income award (a pension, Social Security) names the household
  // it is paid into; a mover who would leave that household behind keeps
  // it until an award can follow its person (registered stopgap).
  const core = api.state as CoreState;
  const home = core.households.get(person.householdId);
  if (
    home?.memberIds.some((id) => !going.includes(id)) &&
    going.some((id) =>
      [...(core.finance.incomeContractsByPerson.get(id) ?? [])].some(
        (contractId) => {
          const row = core.finance.contracts.get(contractId);
          return (
            !row?.endedAt &&
            row?.recipientIncome?.householdId === person.householdId
          );
        },
      ),
    )
  ) {
    api.stopgap(INCOME_STOPGAP);
    return null;
  }
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

/** Books the next review on the first day of next month. */
function scheduleReview(api: CoreAPI): void {
  const [year, month] = api.state.date.split("-").map(Number) as [
    number,
    number,
  ];
  const next =
    month === api.parameter("monthsPerYear")
      ? `${year + api.parameter("one")}-01-01`
      : `${year}-${String(month + api.parameter("one")).padStart(2, "0")}-01`;
  api.moduleCalendar(MOVES_MODULE_ID).schedule({
    key: `review:${next}`,
    date: next,
    kind: REVIEW_KIND,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: "The monthly review of who chooses to move away.",
      estimatedFrom: STOPGAP,
    },
    sourceRecordIds: ["moves:state"],
  });
}

function holdFactor(
  api: CoreAPI,
  holds: Readonly<Record<string, number>>,
): number {
  return Math.exp(
    -Object.values(holds).reduce(
      (sum, value) => sum + value,
      api.parameter("zero"),
    ),
  );
}

/** Every adult in town reviews once a month, on its first day. */
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
      sum + holdFactor(api, holdsOf(api, person)),
      count + api.parameter("one"),
    ]);
  }
  const typical = new Map(
    [...sums].map(([band, [sum, count]]) => [band, sum / count]),
  );
  for (const person of adults) accumulate(api, person, typical);
  for (const person of adults) if (inTown(core, person.id)) decide(api, person);
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
    savePull(api, pull);
  }
}

export function departuresOf(api: CoreAPI): Departure[] {
  return store(api).table("departures").rows() as unknown as Departure[];
}

export const movesModule: CoreModule = {
  id: MOVES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { state: {}, pulls: {}, departures: {} },
  },
  eventKinds: Object.keys(EVENT_PULLS),
  onEvent(api, event) {
    addEventPull(api, event);
  },
  // Leaving ends jobs, which happens only from calendar work: the review is
  // booked on the module calendar for the first of each month.
  onDay(api) {
    if (store(api).table("state").get("moves:state")) return;
    store(api)
      .table("state")
      .put({ id: "moves:state", openedAt: api.state.date });
    scheduleReview(api);
  },
  onCalendarWork(api, work) {
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
