/**
 * The quarterly migration review: waves take their step, some households in
 * the player's town leave, and some newcomers arrive.
 *
 * Why the player's town only: it is the one town the world seats with
 * residents. Everybody else lives at state level (Congress, executives), is
 * tied to a seat, or is not a resident of anywhere in particular. When other
 * towns are seated this loop covers each of them the same way.
 *
 * Cost: every scheduled transition costs the runner two whole-world
 * serializations and an integrity check, so the review runs four times a year,
 * not monthly (a monthly review measurably timed out long election tests).
 * Inside it: one pass over the town's residents, the last year's causes read
 * once (`causes.ts`), the tie records and a decision read only for somebody
 * with a recorded cause, a person reviewed once a year in their own quarter,
 * no integrity check per move, and one batched person writer for the
 * quarter's arrivals.
 */

import { inventedPersonBirthDate } from "../invented-person-age";
import { reviewTownCivicActions } from "../living-world/civic-actions";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import type { CharacterHistoryContextPersonInput } from "../character-history";
import { addDays, ageOnDate, daysBetween, makeIsoDate } from "../dates";
import { schoolTermOn } from "../school-calendar";
import { attendingSchool } from "../school-moves";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
  type LifePlace,
} from "../life-places";
import { drawCanonicalNamedIdentity } from "../people";
import { observerAnchorPersonId } from "../people-continuation";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  OccupationClassification,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  MIGRATION_ARRIVED_EVENT,
  MIGRATION_CONTRACT_VERSION,
  MIGRATION_REVIEW_TRANSITION_KEY,
} from "./contract";
import { crisisRecords } from "../crisis/records";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import {
  householdMembershipsAt,
  peopleInHouseholdAt,
  workRoleAt,
} from "../life-queries";
import { LOCAL_CRIME_RATES, TOWN_POLICE_LOG } from "../crime/contract";
import { localCrimeFigures } from "../crime/producer";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import { activeDwellingOccupanciesAt } from "../resource-queries";
import {
  applyMoves,
  deadPeople,
  moveTieReader,
  planMove,
  playerHouseholdPeople,
  type PlannedMove,
} from "./relocate";
import {
  latestReadings,
  pushOf,
  stepPressure,
  stepPressureEvents,
} from "../pressure";
import { activeWavesCovering, stepWaves, wavePressure } from "./waves";
import {
  causeReader,
  decideToLeave,
  homeLostCause,
  type CauseReader,
  type HOME_LOST_STRENGTH,
  type LeaveCause,
} from "./causes";
import { placeToLookFor } from "./employers-elsewhere";
import { ensureJurisdiction } from "../national-election-geography";
import {
  nationalMedianAnnualWage,
  townJobRate,
  townPayPercentile,
} from "../living-world/town-pay";
import {
  bedroomsForHousehold,
  hudRentRowFor,
  marketRentMinor,
} from "../living-world/town-rent";
import { townUnemploymentRate } from "../living-world/town-economy-measures";
import {
  answerOfferElsewhere,
  openOfferElsewhere,
  reviewJobSearchElsewhere,
} from "./job-offers";
import { ensurePeopleTraits } from "../people-traits";
import {
  reviewTownJobs,
  TOWN_JOB_END_REASONS,
} from "../living-world/town-labor-market";
import { staffPublicJobs } from "../public-budgets/staffing";
import {
  reviewTownBusinesses,
  reviewTownGroups,
} from "../living-world/town-businesses";
import { reviewTownFamilies } from "../living-world/town-families";
import { reviewTownHomes } from "../living-world/town-homes";
import moverRates from "../../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };

/**
 * MEASURED (A165): the yearly share of a place's residents in each age band
 * who move to another county or state, and the newcomers it gains from
 * another county, state or abroad per resident, from the American Community
 * Survey 2024 one-year estimates for its own state, D.C. or Puerto Rico
 * (data/research/migration/mover-rates-acs-2024.json, tables B07401 and
 * B07001). Guam, the Virgin Islands, American Samoa and the Northern Mariana
 * Islands, which the survey does not cover, take the national rates, marked
 * ESTIMATED FROM AVERAGE there. Answers `migration-rates-and-reasons`
 * (1) and (2).
 */
type MoverRates = {
  readonly departurePerYearByAge: Readonly<Record<string, number>>;
  readonly arrivalsPerResidentPerYear: number;
};
const MOVER_PLACES = moverRates.places as Readonly<Record<string, MoverRates>>;

/** A place's own mover rates, or the nation's where it has none on file. */
function moverRatesFor(stateKey: string | null | undefined): MoverRates {
  return (stateKey ? MOVER_PLACES[stateKey] : undefined) ?? moverRates.national;
}

/** The survey's age band an age falls in, from 18 and 19 up to 75 and over. */
function moverAgeBand(age: number): string {
  if (age >= 75) return "75+";
  if (age < 20) return "18-19";
  const low = Math.floor(age / 5) * 5;
  return `${low}-${low + 4}`;
}

/**
 * The yearly share of residents of this age in the place's state who move
 * to another county or state: how strongly a resident's age weighs on
 * leaving, before the town's own pushes.
 */
export function moverDepartureRate(
  stateKey: string | null | undefined,
  age: number,
): number {
  return moverRatesFor(stateKey).departurePerYearByAge[moverAgeBand(age)]!;
}

/** Newcomers per resident per year for the place's state. */
export function moverArrivalRate(stateKey: string | null | undefined): number {
  return moverRatesFor(stateKey).arrivalsPerResidentPerYear;
}

/**
 * Why a job in town is left open for somebody from elsewhere: its worker
 * moved away (`relocate.ts`), died or retired. A layoff or a quit leaves no
 * opening: the employer cut the job, or the worker is still in town looking.
 */
const OPENING_REASONS: ReadonlySet<string> = new Set([
  "labor:moved-away",
  TOWN_JOB_END_REASONS.died,
  TOWN_JOB_END_REASONS.retired,
]);

/**
 * PLACEHOLDER (research: `migration-rates-and-reasons`): how many reviews an employer holds a
 * job open for somebody from elsewhere before it stops looking: two years.
 */
export const OPENING_REVIEWS_HELD = 8;

/** HUD's cost-burden line: rent over 30 percent of pay, severe over half. */
const RENT_BURDEN_LINE = 0.3;
const RENT_BURDEN_SEVERE = 0.5;

/**
 * BLANKET: how much a reported assault or robbery in town beyond the police
 * log's usual quarter adds to the chance a free household leaves. Not
 * researched.
 */
export const BLANKET_TOWN_CRIME_PUSH_PER_EXCESS_REPORT = 0.05;

/**
 * BLANKET: how much each percentage point of the town's recorded unemployment
 * above the nation's adds to the chance a free household leaves (and below
 * it, takes away, never below half). Not researched.
 */
export const BLANKET_TOWN_UNEMPLOYMENT_GAP_PUSH = 0.05;

/** Reviews per year; each person is considered in one of them. */
export const MIGRATION_REVIEWS_PER_YEAR = 4;
export const MIGRATION_REVIEW_INTERVAL_DAYS = 91;

const REVIEW_KEY_PREFIX = "migration:review:";

/** Schedules the first review for a life opened at the current version. Idempotent. */
export function ensureMigrationSchedule(world: World): World {
  const stableKey = `${REVIEW_KEY_PREFIX}0`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(world.currentDate, MIGRATION_REVIEW_INTERVAL_DAYS),
    transitionKey: MIGRATION_REVIEW_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: {
      kind: "initialization",
      reference: MIGRATION_CONTRACT_VERSION,
    },
  });
}

export function migrationReviewHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== MIGRATION_REVIEW_TRANSITION_KEY)
    throw new Error("The migration review received another transition.");
  const index = Number(dueItem.stableKey.slice(REVIEW_KEY_PREFIX.length));
  // The state pressures step first, so this review's movers read this
  // quarter's pull and push. What a new quarter's pressure sets off (unrest,
  // threats, attacks, international crises) follows it once.
  const stepped = stepPressure(world);
  let next = reviewTown(
    stepped === world ? world : stepPressureEvents(stepped),
    index,
  );
  // The town's jobs turn over on the same quarterly review, after the moves,
  // so a newcomer can be hired and a mover's job is already closed.
  const town = migrationTown(next);
  // Then its families: couples forming and parting, and children born.
  if (town) {
    const player =
      next.control.kind === "person" ? next.control.personId : null;
    // Businesses close and open first, so their staff look for work with
    // everyone else this quarter.
    next = reviewTownBusinesses(next, town, player, String(index));
    next = reviewTownGroups(next, town, player, String(index));
    next = reviewTownJobs(next, town, player, String(index));
    // Then its budgets' funded public jobs: police and teachers are hired or
    // laid off to what the budgets fund this quarter.
    next = staffPublicJobs(next, town, player, String(index));
    next = reviewTownFamilies(next, town, player, String(index));
    // And its homes: newcomers and new households move in, others move.
    next = reviewTownHomes(next, town, String(index));
    // And its civic life: residents contact officials and attend meetings.
    next = reviewTownCivicActions(next, town, player, String(index));
  }
  next = scheduleFutureDueItem(next, {
    stableKey: `${REVIEW_KEY_PREFIX}${index + 1}`,
    dueAt: addDays(next.currentDate, MIGRATION_REVIEW_INTERVAL_DAYS),
    transitionKey: MIGRATION_REVIEW_TRANSITION_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: "migration:reviewed",
    context: null,
    outcomeEventId: null,
  };
}

/**
 * The player's town, when the player lives in a seated town. A world watched
 * from the start has no player, so the town is the observer anchor's.
 */
export function migrationTown(world: World): EntityId | null {
  const personId =
    world.control.kind === "person"
      ? world.control.personId
      : world.control.kind === "observer"
        ? observerAnchorPersonId(world)
        : null;
  if (!personId) return null;
  const home = world.people[personId]?.homeJurisdictionId;
  if (!home) return null;
  const kind = world.jurisdictions[home]?.kind;
  return kind === "census-place" || kind === "territory-place" ? home : null;
}

/**
 * What a scenario or a test may leave out of a review. Play leaves nothing
 * out. Nobody's departure or arrival is a rate: a departure is the resident's
 * own decision (`causes.ts`), and a newcomer comes for a job in town that
 * nobody in town is there to take (`townOpenings`).
 */
export interface MigrationReviewOptions {
  /** False keeps newcomers out, for a case that measures departures. */
  readonly arrivals?: boolean;
}

/**
 * One review of the player's town on the world's current date, as the
 * quarterly handler runs it. `index` is the review's count since opening.
 * Exposed so a scenario or a test can run one review.
 */
export function reviewTown(
  world: World,
  index: number,
  options: MigrationReviewOptions = {},
): World {
  const town = migrationTown(world);
  if (!town) return world;
  let next = stepWaves(world, town);
  const active = activeWavesCovering(next, town);
  const departure = wavePressure(active, "departure-pressure");
  const arrival = wavePressure(active, "arrival-pressure");

  const dead = deadPeople(next);
  const residents = next.personOrder.filter((id) => {
    const person = next.people[id]!;
    return (
      person.homeJurisdictionId === town &&
      !dead.has(id) &&
      person.birthDate <= next.currentDate
    );
  });
  // Read only once somebody has a cause to weigh or a wrecked home; most
  // reviews move nobody.
  let context: Parameters<typeof planMove>[2] | null = null;
  const destinations = destinationPool(next, town);
  const stateKey = lifePlaceByJurisdictionId(town)?.stateJurisdictionKey;
  // The town's waves, state, crime and jobs push on everyone alike; a
  // resident with a recorded cause weighs that push against their own bar.
  const townPush =
    departure.multiplier *
    statePushOnTown(next, town) *
    townCrimePush(next, town) *
    townJobsPush(next, town);
  const moving = new Set<EntityId>();
  const moves: PlannedMove[] = [];
  const planned = (plan: ReturnType<typeof planMove>) => {
    if (plan.kind === "refused") return;
    if (plan.move.personIds.some((id) => moving.has(id))) return;
    for (const id of plan.move.personIds) moving.add(id);
    moves.push(plan.move);
  };

  // Households whose homes a disaster destroyed or damaged since the last
  // review, whatever quarter they are reviewed in (`disaster-displacement`).
  // A household and its dwelling can both be recorded as damaged; it weighs
  // the wreck once, through its first living adult, with its other causes.
  const displaced = new Map<EntityId, LeaveCause>();
  const considered = new Set<EntityId>();
  for (const home of displacedHomes(next, town)) {
    if (home.personIds.some((id) => considered.has(id))) continue;
    for (const id of home.personIds) considered.add(id);
    const living = home.personIds.filter((id) => !dead.has(id));
    const personId =
      living.find(
        (id) => ageOnDate(next.people[id]!.birthDate, next.currentDate) >= 18,
      ) ?? living[0];
    if (personId)
      displaced.set(personId, homeLostCause(home.damageId, home.level));
  }

  // Everybody else reviewed this quarter: an adult leaves only when a
  // recorded cause pushes them past their own bar, to the cause's place.
  const reviewed = residents.filter(
    (personId) =>
      !considered.has(personId) &&
      reviewQuarter(personId) === index % MIGRATION_REVIEWS_PER_YEAR &&
      ageOnDate(next.people[personId]!.birthDate, next.currentDate) >= 18,
  );
  // First, who looks for work outside town, and what employers there answer
  // (`job-offers.ts`): an offer is a recorded cause to weigh below.
  const before = next;
  let kinReader: CauseReader | null = null;
  next = reviewJobSearchElsewhere(
    next,
    town,
    String(index),
    reviewed,
    () => (kinReader ??= causeReader(before, town)),
  );
  let causes: CauseReader | null = null;
  const offers: { personId: EntityId; placeId: EntityId }[] = [];
  const candidates: {
    personId: EntityId;
    found: readonly LeaveCause[];
    wreck: LeaveCause | null;
  }[] = [];
  for (const [personId, wreck] of displaced) {
    causes ??= causeReader(next, town);
    candidates.push({
      personId,
      found: [wreck, ...causes.causesFor(personId)],
      wreck,
    });
  }
  for (const personId of reviewed) {
    causes ??= causeReader(next, town);
    const found = causes.causesFor(personId);
    if (found.length > 0) candidates.push({ personId, found, wreck: null });
  }
  if (candidates.length > 0) {
    // Temperament is read for those with a cause only, in one batch.
    next = ensurePeopleTraits(
      next,
      candidates.map((row) => row.personId),
    );
    const reader = causeReader(next, town);
    context ??= {
      ties: moveTieReader(next),
      playerHousehold: playerHouseholdPeople(next),
      dead,
    };
    const ties = context;
    const owned = ownedTenureIds(next);
    for (const { personId, found, wreck } of candidates) {
      if (moving.has(personId)) continue;
      const followed = found.find((cause) => cause.placeId !== null);
      const place = followed
        ? { placeId: followed.placeId!, label: followed.explanation }
        : (reader.closestKinElsewhere(personId, town) ??
          (destinations.ownState
            ? {
                placeId: destinations.ownState,
                label: `the rest of ${next.jurisdictions[destinations.ownState]!.name} is home too`,
              }
            : null));
      if (!place) continue;
      const decision = decideToLeave(
        next,
        personId,
        `${MIGRATION_CONTRACT_VERSION}:leave:${index}:${personId}`,
        found,
        {
          ageMoverRate: moverDepartureRate(
            stateKey,
            ageOnDate(next.people[personId]!.birthDate, next.currentDate),
          ),
          ownsHome: ties.ties
            .housingOf(personId)
            .tenureIds.some((id) => owned.has(id)),
          childrenAtHome: childrenAtHome(next, personId),
          schoolYearDepth: schoolYearDepth(next, personId),
          townPush,
        },
        place,
      );
      const offer = found.find((cause) => cause.kind === "job-offer");
      if (offer) offers.push({ personId, placeId: offer.placeId! });
      if (!decision.leaves) continue;
      planned(
        planMove(
          next,
          {
            stableKey: wreck
              ? `${index}:displaced:${wreck.causeId}`
              : `${index}:${personId}`,
            personId,
            toJurisdictionId: place.placeId,
            reason: decision.lead.reason,
            waveKey: wreck ? null : departure.waveKey,
            ...(decision.lead.causeId
              ? { causeId: decision.lead.causeId }
              : {}),
            // A wrecked home is given up on the move.
            ...(wreck ? { endsHousing: true } : {}),
            why: decision.why,
          },
          ties,
        ),
      );
    }
  }
  next = applyMoves(next, moves);
  // Whoever moved to an offer's place takes it and starts there; whoever
  // stayed turns it down.
  for (const { personId, placeId } of offers) {
    const offer = openOfferElsewhere(next, personId, town);
    if (!offer || offer.placeId !== placeId) continue;
    next = answerOfferElsewhere(
      next,
      offer.applicationId,
      next.people[personId]!.homeJurisdictionId === placeId,
    );
  }

  if (options.arrivals === false) return next;
  // A town pushing its people out draws fewer in; a wave drawing people in
  // draws more.
  const arrivals = arrivalInputs(next, town, townPush / arrival.multiplier);
  if (arrivals.length === 0) return next;
  for (const { origin } of arrivals)
    next = ensureJurisdiction(next, origin.context.jurisdiction);
  next = createCharacterHistoryContextPeople(
    next,
    arrivals.map((row) => row.input),
  );
  for (const { input, opening, origin: from } of arrivals) {
    const personId = characterHistoryContextPersonId(next, input.stableKey);
    const origin = from.context.jurisdiction.id;
    const person = next.people[personId]!;
    next = recordWorldEvent(next, {
      stableKey: `migration:arrived:${input.stableKey}`,
      type: MIGRATION_ARRIVED_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: town,
      involvedEntityIds: [personId, town, origin],
      participants: [{ personId, role: "agency:mover", detail: null }],
      personFactConstraints: [],
      visibility: "limited",
      tags: [
        `reason:${ARRIVAL_REASON}`,
        `opening:${opening.statusId}`,
        `from:${origin}`,
        `to:${town}`,
        ...(arrival.waveKey ? [`wave:${arrival.waveKey}`] : []),
      ],
      summary: `${person.givenName} ${person.familyName} moved to ${next.jurisdictions[town]!.name} from ${next.jurisdictions[origin]!.name} to work as the town's new ${opening.title.toLowerCase()}.`,
      context: {
        location: {
          jurisdictionId: town,
          label: next.jurisdictions[town]!.name,
          setting: null,
        },
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: opening.why,
        immediateReaction: null,
      },
    });
    next = seatNewcomerHousehold(
      next,
      personId,
      input.stableKey,
      town,
      next.history.events.at(-1)!.id,
    );
  }
  return next;
}

/**
 * BLANKET (`arriving-families`): a newcomer lives alone in a household of
 * their own, located in town. It is what lets a disaster in town reach them
 * and what a later family or partner joins; it carries no dwelling yet.
 */
function seatNewcomerHousehold(
  world: World,
  personId: EntityId,
  stableKey: string,
  town: EntityId,
  eventId: EntityId,
): World {
  const provenance = { kind: "simulated-event" as const, eventId };
  const person = world.people[personId]!;
  let next = createHousehold(world, {
    stableKey: `${stableKey}:household`,
    formedAt: world.currentDate,
    label: `${person.givenName} ${person.familyName}'s household`,
    provenance,
  });
  const householdId = next.history.households.at(-1)!.id;
  next = recordHouseholdLocation(next, {
    stableKey: `${stableKey}:household-location`,
    householdId,
    effectiveAt: next.currentDate,
    jurisdictionId: town,
    label: next.jurisdictions[town]!.name,
    kind: "residence:arrived",
    provenance,
    supersedesLocationId: null,
  });
  return startHouseholdMembership(next, {
    stableKey: `${stableKey}:household-membership`,
    personId,
    householdId,
    startedAt: next.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
}

/**
 * How hard the town's own state is pushing people out, from the pressure
 * layer's latest reading: 1 with nothing recorded. A flood or a tax rise in
 * the state raises the chance a free household in town leaves (`town-movers`).
 */
export function statePushOnTown(world: World, town: EntityId): number {
  const stateKey = lifePlaceByJurisdictionId(town)?.stateJurisdictionKey;
  return stateKey ? pushOf(latestReadings(world).get(stateKey)) : 1;
}

interface DisplacedHome {
  readonly damageId: EntityId;
  readonly level: keyof typeof HOME_LOST_STRENGTH;
  readonly personIds: readonly EntityId[];
}

/**
 * Homes in town a disaster destroyed or damaged since the last review, with
 * who lived there. A damaged dwelling is read through who occupies it today.
 */
function displacedHomes(
  world: World,
  town: EntityId,
): readonly DisplacedHome[] {
  const since = addDays(world.currentDate, -MIGRATION_REVIEW_INTERVAL_DAYS);
  const homes: DisplacedHome[] = [];
  let occupancies: ReturnType<typeof activeDwellingOccupanciesAt> | null = null;
  for (const record of crisisRecords(world)) {
    if (record.kind !== "disaster-damage") continue;
    if (record.jurisdictionId !== town) continue;
    if (record.level !== "destroyed" && record.level !== "damaged") continue;
    if (record.effectiveAt <= since || record.effectiveAt > world.currentDate)
      continue;
    let personIds: readonly EntityId[] = [];
    if (record.targetKind === "household") {
      personIds = peopleInHouseholdAt(world, record.targetId);
    } else if (record.targetKind === "dwelling") {
      occupancies ??= activeDwellingOccupanciesAt(world);
      personIds = occupancies
        .filter((occupancy) => occupancy.dwellingId === record.targetId)
        .flatMap((occupancy) =>
          occupancy.occupant.kind === "person"
            ? [occupancy.occupant.personId]
            : peopleInHouseholdAt(world, occupancy.occupant.householdId),
        );
    }
    if (personIds.length > 0)
      homes.push({ damageId: record.id, level: record.level, personIds });
  }
  return homes;
}

/**
 * Crime in town beyond the usual (`cause-crime`): 1 when the last review
 * period's reported assaults and robberies are no more than the police log's
 * expected share, rising by a blanket step for each report beyond it. Every
 * town has the same expected log today, so only an unusually bad quarter
 * pushes anyone.
 */
export function townCrimePush(world: World, town: EntityId): number {
  const figures = localCrimeFigures(
    world,
    town,
    addDays(world.currentDate, 1 - MIGRATION_REVIEW_INTERVAL_DAYS),
    world.currentDate,
  );
  const violent = figures.reported.assault + figures.reported.robbery;
  const weight = (offense: string) => {
    const rule = LOCAL_CRIME_RATES.offenses.find(
      (row) => row.offense === offense,
    )!;
    return rule.annualRate * rule.reportedShare;
  };
  const all = LOCAL_CRIME_RATES.offenses.reduce(
    (sum, rule) => sum + weight(rule.offense),
    0,
  );
  const expected =
    ((TOWN_POLICE_LOG.reportedPerMonth * MIGRATION_REVIEW_INTERVAL_DAYS) /
      30.4) *
    ((weight("assault") + weight("robbery")) / all);
  const excess = Math.max(0, violent - expected);
  return 1 + excess * BLANKET_TOWN_CRIME_PUSH_PER_EXCESS_REPORT;
}

/**
 * Jobs in town against the nation (`cause-state-economy`, town side): 1 when
 * the economy records no month of the town's own, which is the case until a
 * disaster or public spending there gives it one.
 */
export function townJobsPush(world: World, town: EntityId): number {
  const local = macroConditionsAt(
    world,
    macroScopeForJurisdiction(town),
    world.currentDate,
  );
  if (!local) return 1;
  const nation = (world.macroEconomy?.months ?? []).find(
    (row) => row.scope === "national" && row.periodEnd === local.periodEnd,
  );
  if (!nation) return 1;
  const gap = local.unemploymentPct - nation.unemploymentPct;
  return Math.max(0.5, 1 + gap * BLANKET_TOWN_UNEMPLOYMENT_GAP_PUSH);
}

/**
 * Housing tenures held as owners today (`town-homes.ts` writes `ownership:`
 * kinds), read once per review and only when somebody has a cause to weigh.
 */
function ownedTenureIds(world: World): ReadonlySet<EntityId> {
  return new Set(
    world.history.housingTenures
      .filter((tenure) => tenure.kind.startsWith("ownership:"))
      .map((tenure) => tenure.id),
  );
}

/**
 * How deep into the school year today is for a household with a pupil in it:
 * 0 at either break or with nobody at school, 1 at the middle of the term,
 * changing smoothly between (the shared calendar, `school-calendar.ts`).
 */
export function schoolYearDepth(world: World, personId: EntityId): number {
  const term = schoolTermOn(world.currentDate);
  if (!term) return 0;
  const household = householdMembershipsAt(world, personId).find(
    (active) => active.state.residenceRole === "primary",
  )?.household.id;
  if (!household) return 0;
  const pupil = peopleInHouseholdAt(world, household).some(
    (id) =>
      ageOnDate(world.people[id]!.birthDate, world.currentDate) < 18 &&
      attendingSchool(world, id),
  );
  if (!pupil) return 0;
  const half = daysBetween(term.startsAt, term.endsAt) / 2;
  const fromBreak = Math.min(
    daysBetween(term.startsAt, world.currentDate),
    daysBetween(world.currentDate, term.endsAt),
  );
  return Math.max(0, Math.min(1, fromBreak / half));
}

/** Children under 18 living in this person's primary household today. */
function childrenAtHome(world: World, personId: EntityId): number {
  const household = householdMembershipsAt(world, personId).find(
    (active) => active.state.residenceRole === "primary",
  )?.household.id;
  if (!household) return 0;
  return peopleInHouseholdAt(world, household).filter(
    (id) =>
      id !== personId &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) < 18,
  ).length;
}

/**
 * This review's newcomers: one for each opening in town whose pull has
 * carried it to being taken (`townOpenings`). BLANKET (`arrival-history`,
 * `arriving-families`): single adults with a canonical name and identity, a
 * seeded pick among real options, and nothing else yet. Where they come from
 * is HARDWIRED: the town's own state's largest other town, the place a
 * resident looking for work elsewhere looks first (`placeToLookFor`).
 */
function arrivalInputs(
  world: World,
  town: EntityId,
  push: number,
): readonly {
  readonly input: CharacterHistoryContextPersonInput;
  readonly opening: TownOpening;
  readonly origin: LifePlace;
}[] {
  const taken = townOpenings(world, town, push).filter(
    (opening) => opening.pull * (opening.reviewsOpen + 1) >= 1,
  );
  if (taken.length === 0) return [];
  const origin = placeToLookFor(town, null);
  if (!origin) return [];
  const year = Number(world.currentDate.slice(0, 4));
  return taken.map((opening) => {
    const personRng = new SeededRng(world.seed).fork(
      `${MIGRATION_CONTRACT_VERSION}:arrive:${opening.statusId}`,
    );
    return {
      opening,
      origin,
      input: {
        stableKey: `migration:newcomer:${town}:${opening.statusId}`,
        ...drawCanonicalNamedIdentity(
          personRng.fork("name"),
          generatePersonIdentity(personRng.fork("identity")),
        ),
        birthDate: inventedPersonBirthDate(personRng, {
          role: "migration-newcomer",
          referenceDate: makeIsoDate(`${year}-01-01`),
        }),
        homeJurisdictionId: town,
        birthplaceJurisdictionId: origin.context.jurisdiction.id,
      },
    };
  });
}

/** Which quarter of the year a person is reviewed in: fixed per person. */
export function reviewQuarter(personId: EntityId): number {
  let hash = 0;
  for (let i = 0; i < personId.length; i += 1)
    hash = (hash * 31 + personId.charCodeAt(i)) >>> 0;
  return hash % MIGRATION_REVIEWS_PER_YEAR;
}

interface DestinationPool {
  readonly ownState: EntityId | null;
}

/**
 * The town's own state, where a resident with a push and no relative
 * elsewhere goes (`where-people-go`, HARDWIRED until a home found elsewhere
 * is recorded).
 */
function destinationPool(world: World, town: EntityId): DestinationPool {
  const stateKey = lifePlaceByJurisdictionId(town)?.stateJurisdictionKey;
  const ownStateId = stateKey ? stateJurisdictionForKey(stateKey)?.id : null;
  return {
    ownState:
      ownStateId &&
      world.jurisdictions[ownStateId]?.kind === "state-placeholder"
        ? ownStateId
        : null,
  };
}

/** Why a newcomer came: a job in town nobody in town was there to take. */
export const ARRIVAL_REASON = "work:job-opening" as const;

/** A job in town left open by a worker who moved away, died or retired. */
export interface TownOpening {
  /** The ended work status that left it open. */
  readonly statusId: EntityId;
  readonly title: string;
  readonly occupation: OccupationClassification | null;
  readonly openedAt: IsoDate;
  /** Reviews it has stood open, from 0 on the first one after it opened. */
  readonly reviewsOpen: number;
  /** A one-person home's rent against the job's pay; null when either is unknown. */
  readonly rentShare: number | null;
  /**
   * How strongly it draws somebody from elsewhere, from 1 when the rent of
   * a one-person home takes no more than 30 percent of its pay, sliding to
   * nothing at 80 percent, over the town's push.
   */
  readonly pull: number;
  /** In the words the arrival records. */
  readonly why: string;
}

/**
 * The jobs in town held open for somebody from elsewhere today: jobs whose
 * worker moved away, died or retired in the last two years
 * (`OPENING_REVIEWS_HELD`), that no newcomer has come for yet, less as many
 * of the newest as the town has residents looking for work, who are hired
 * first (`town-labor-market.ts`). Oldest first.
 *
 * An opening is taken once the review count it has stood open, times its
 * pull, reaches one: a job whose pay covers the town's rent is taken at the
 * first review, one whose pay barely does waits a year or more, and one the
 * rent swallows is never taken. Nothing is drawn.
 */
export function townOpenings(
  world: World,
  town: EntityId,
  push: number,
): readonly TownOpening[] {
  const today = world.currentDate;
  const since = addDays(
    today,
    -OPENING_REVIEWS_HELD * MIGRATION_REVIEW_INTERVAL_DAYS,
  );
  const ended = world.history.workStatuses.filter(
    (status) =>
      status.status === "ended" &&
      OPENING_REASONS.has(status.reason ?? "") &&
      status.effectiveAt > since &&
      status.effectiveAt <= today,
  );
  if (ended.length === 0) return [];
  // Openings a newcomer already came for, from the newest arrivals back.
  const taken = new Set<string>();
  const events = world.history.events;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.occurredAt <= since) break;
    if (event.type !== MIGRATION_ARRIVED_EVENT) continue;
    for (const tag of event.tags)
      if (tag.startsWith("opening:")) taken.add(tag.slice("opening:".length));
  }
  const rentRow = hudRentRowFor(town);
  const rentMinor = rentRow
    ? marketRentMinor(world, town, rentRow, bedroomsForHousehold(1), today)
    : null;
  const open: TownOpening[] = [];
  for (const status of ended) {
    if (taken.has(status.id)) continue;
    const role = workRoleAt(world, status.workRelationshipId);
    if (!role || role.locationJurisdictionId !== town) continue;
    // What the town pays a new hire in the line, or the nation's median
    // where BLS publishes no wage there; over the job's recorded hours.
    const hourlyMinor =
      townJobRate(
        role.occupationClassification,
        town,
        townPayPercentile(0, 0.5),
      )?.hourlyMinor ??
      (role.occupationClassification
        ? ((nationalMedianAnnualWage(role.occupationClassification) ?? 0) /
            (52 * 40)) *
          100
        : 0);
    const hours = role.timeDemand.expectedWeekly.maximumHours;
    const payMinor = (hourlyMinor * hours * 52) / 12;
    const rentShare =
      rentMinor !== null && payMinor > 0 ? rentMinor / payMinor : null;
    // Unknown pay or rent is not a burden: the job alone draws.
    const affordable =
      rentShare === null
        ? 1
        : 1 -
          Math.min(
            1,
            Math.max(0, (rentShare - RENT_BURDEN_LINE) / RENT_BURDEN_SEVERE),
          );
    const reviewsOpen = Math.floor(
      (Date.parse(today) - Date.parse(status.effectiveAt)) /
        86_400_000 /
        MIGRATION_REVIEW_INTERVAL_DAYS,
    );
    open.push({
      statusId: status.id,
      title: role.title,
      occupation: role.occupationClassification,
      openedAt: status.effectiveAt,
      reviewsOpen,
      rentShare,
      pull: affordable / push,
      why:
        rentShare === null
          ? `${role.title.toLowerCase()} work in town stood open`
          : `${role.title.toLowerCase()} work in town stood open, and a home there would take ${Math.round(rentShare * 100)} percent of its pay`,
    });
  }
  open.sort(
    (a, b) =>
      a.openedAt.localeCompare(b.openedAt) ||
      a.statusId.localeCompare(b.statusId),
  );
  const seekers = townUnemploymentRate(world, town);
  const looking =
    seekers.value === null
      ? 0
      : Math.round((seekers.value * seekers.basis) / 100);
  return open.slice(0, Math.max(0, open.length - looking));
}
