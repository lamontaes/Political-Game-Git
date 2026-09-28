/**
 * The town's families change as time passes: people start dating, move in
 * together, marry, break up and have children.
 *
 * Nothing did this before for anybody but the player. In five watched years
 * near Belzoni and Columbus the world recorded no partnership and no birth.
 *
 * Four times a year, on the town's quarterly review (`migration/review.ts`,
 * after the jobs turn over), every couple and every single adult living in
 * the town is weighed once:
 *
 * - a couple may break up, more often early on, after a layoff, when neither
 *   of them works and when unemployment is high, less often with a small
 *   child at home and after many years together;
 * - a dating couple may move in together, and a couple living together may
 *   marry, more readily when both of them work;
 * - a woman aged 15 to 49 may have a child. On average she has her age's
 *   real yearly birth rate; being married or living with a partner, the
 *   children she already has, a first year together and whether anybody at
 *   home works move her chance around it, and the town's total is rescaled
 *   to the age rates. The outcome web's links into the birth rate move it
 *   (`../outcome-web`): about 1.4% fewer for each point of unemployment
 *   nine months before, as research measures;
 * - a single adult may start dating another single adult in town of a near
 *   age, more often in their twenties and thirties and when they work.
 *
 * So the chances follow conditions that last (age, years together, children,
 * work, the economy), not one flat chance for everybody. The player's own
 * relationships and children stay the player's choice and are never touched
 * here. Every change is a dated record with its own event, on the day of the
 * review, written through the same writers play uses.
 *
 * The chances below are GAME ASSUMPTIONS, not read from a source, except
 * the birth rates by age, which are calibrated to national figures. What the
 * game does not claim: this models no biology beyond an age band, no
 * adoption, no custody law and no attraction. A child's second parent is
 * the partner the mother lives with, when there is one; after a breakup the
 * children stay in the home unless only the partner who leaves is their
 * parent.
 */

import { outcomeFactor } from "../outcome-web";
import { ageOnDate, addDays } from "../dates";
import { createStableId } from "../ids";
import {
  createHousehold,
  createPartnership,
  recordHouseholdLocation,
  recordHouseholdMembershipState,
  recordPartnershipState,
  startHouseholdMembership,
} from "../life";
import { householdMembershipsAt } from "../life-queries";
import { lifePlaceByJurisdictionId } from "../life-places";
import { personName } from "../people";
import { recordFamilyAddition } from "../people-family";
import { SeededRng } from "../rng";
import type {
  EntityId,
  IsoDate,
  LifeRecordProvenance,
  Partnership,
  Person,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  TOWN_JOB_END_REASONS,
  townUnemploymentPressure,
} from "./town-labor-market";

export const TOWN_FAMILIES_VERSION = "town-families-v1";

/** The stages a town couple passes through, as partnership kinds. */
export const TOWN_PARTNERSHIP_KINDS = {
  dating: "romantic:dating",
  cohabiting: "romantic:cohabiting",
  married: "legal:marriage",
} as const;

export const TOWN_FAMILY_EVENTS = {
  startedDating: "life.started-dating",
  movedIn: "life.moved-in-together",
  married: "life.married",
  brokeUp: "life.broke-up",
  divorced: "life.divorced",
} as const;

type Stage = keyof typeof TOWN_PARTNERSHIP_KINDS;

/** GAME ASSUMPTIONS: chances per quarter, before conditions are weighed. */
export const TOWN_FAMILY_CHANCES = {
  breakUp: { dating: 0.09, cohabiting: 0.035, married: 0.005 },
  /** Dating couples, after at least six months together. */
  moveIn: 0.12,
  /** Couples living together, after at least a year of it. */
  marry: 0.07,
  /** A single adult's chance of starting to date somebody, by age. */
  dateByAge: [
    [20, 0.035],
    [25, 0.04],
    [35, 0.025],
    [45, 0.012],
    [65, 0],
  ] as readonly (readonly [number, number])[],
  /** Share of adults who look for a partner of their own gender. */
  sameGender: 0.06,
} as const;

/**
 * CALIBRATION, approved by Claude CTO on 9/28/2026: births per 1,000 women a
 * year, by age, from NCHS "Births: Final Data for 2024" (National Vital
 * Statistics Reports vol. 75 no. 2), as quoted in search excerpts; the
 * report's table itself was not read. The same rates serve every state and territory until
 * state tables are read. The 45-49 rate includes mothers 50 and over.
 */
export const TOWN_BIRTH_RATES_BY_AGE: readonly (readonly [number, number])[] = [
  [15, 12.6],
  [20, 55.8],
  [25, 89.5],
  [30, 93.7],
  [35, 54.3],
  [40, 12.7],
  [45, 1.1],
  [50, 0],
];

/**
 * GAME ASSUMPTIONS: how a woman's own conditions weigh her chance against
 * other women her age in town. Only the ratios matter; the town's total is
 * rescaled to the age rates above.
 */
export const TOWN_BIRTH_WEIGHTS = {
  married: 1.3,
  cohabiting: 1,
  dating: 0.4,
  single: 0.3,
  /** By children she already has: none, one, two, three or more. */
  byChildren: [1, 1.1, 0.55, 0.3] as readonly number[],
  /** In a couple's first year of living together. */
  firstYear: 0.7,
  /** Nobody in her household has a job. */
  nobodyWorking: 0.8,
} as const;

/** The five-year age band a rate belongs to. */
function bandOf(age: number): number {
  return Math.floor(age / 5) * 5;
}

/** The widest age gap between two people who start dating, in years. */
export const TOWN_DATING_AGE_GAP = 8;

const BIRTH_SPACING_DAYS = 456; // about 15 months
const QUIET_AFTER_ENDING_DAYS = 365;

function byAge(
  table: readonly (readonly [number, number])[],
  age: number,
): number {
  let chance = 0;
  for (const [from, value] of table) if (age >= from) chance = value;
  return chance;
}

function yearsBetween(from: IsoDate, to: IsoDate): number {
  return (Date.parse(to) - Date.parse(from)) / (365.25 * 86_400_000);
}

interface Couple {
  readonly partnership: Partnership;
  readonly stage: Stage;
  readonly stateId: EntityId;
}

interface TownPerson {
  readonly person: Person;
  readonly age: number;
}

/** Everything one review reads, gathered once from the history. */
interface FamilyView {
  readonly today: IsoDate;
  readonly town: EntityId;
  readonly people: ReadonlyMap<EntityId, TownPerson>;
  readonly dead: ReadonlySet<EntityId>;
  readonly couples: readonly Couple[];
  readonly partnered: ReadonlySet<EntityId>;
  readonly lastEnded: ReadonlyMap<EntityId, IsoDate>;
  readonly household: ReadonlyMap<EntityId, EntityId>;
  readonly householdMembers: ReadonlyMap<EntityId, readonly EntityId[]>;
  readonly kin: ReadonlyMap<EntityId, ReadonlySet<EntityId>>;
  readonly childrenOf: ReadonlyMap<EntityId, readonly EntityId[]>;
  readonly working: ReadonlySet<EntityId>;
  readonly laidOffThisYear: ReadonlySet<EntityId>;
}

const STAGE_OF_KIND = new Map<string, Stage>(
  Object.entries(TOWN_PARTNERSHIP_KINDS).map(([stage, kind]) => [
    kind,
    stage as Stage,
  ]),
);

function readFamilies(world: World, town: EntityId): FamilyView {
  const today = world.currentDate;
  const h = world.history;
  const diedOn = new Map(
    h.personDeaths.map((row) => [row.personId, row.diedAt]),
  );
  const dead = new Set(diedOn.keys());
  const people = new Map<EntityId, TownPerson>();
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person || person.homeJurisdictionId !== town || dead.has(personId))
      continue;
    if (person.birthDate > today) continue;
    people.set(personId, { person, age: ageOnDate(person.birthDate, today) });
  }

  const latestPartnershipState = new Map<
    EntityId,
    { id: EntityId; status: string; effectiveAt: IsoDate }
  >();
  for (const state of h.partnershipStates)
    if (state.effectiveAt <= today)
      latestPartnershipState.set(state.partnershipId, state);
  const couples: Couple[] = [];
  const partnered = new Set<EntityId>();
  const lastEnded = new Map<EntityId, IsoDate>();
  const noteEnded = (id: EntityId, date: IsoDate) => {
    if ((lastEnded.get(id) ?? "") < date) lastEnded.set(id, date);
  };
  for (const partnership of h.partnerships) {
    const state = latestPartnershipState.get(partnership.id);
    if (!state) continue;
    const [a, b] = partnership.personIds;
    if (state.status !== "active") {
      noteEnded(a, state.effectiveAt);
      noteEnded(b, state.effectiveAt);
      continue;
    }
    // A widow or widower is single again, a year after the death.
    const died = diedOn.get(a) ?? diedOn.get(b);
    if (died) {
      noteEnded(a, died);
      noteEnded(b, died);
      continue;
    }
    partnered.add(a);
    partnered.add(b);
    const stage = STAGE_OF_KIND.get(partnership.kind);
    if (stage) couples.push({ partnership, stage, stateId: state.id });
  }

  const latestMembershipState = new Map<
    EntityId,
    { status: string; residenceRole: string }
  >();
  for (const state of h.householdMembershipStates)
    if (state.effectiveAt <= today)
      latestMembershipState.set(state.membershipId, state);
  const household = new Map<EntityId, EntityId>();
  const householdMembers = new Map<EntityId, EntityId[]>();
  for (const membership of h.householdMemberships) {
    const state = latestMembershipState.get(membership.id);
    if (
      !state ||
      state.status === "ended" ||
      state.residenceRole !== "primary" ||
      dead.has(membership.personId)
    )
      continue;
    household.set(membership.personId, membership.householdId);
  }
  for (const [personId, householdId] of household) {
    const list = householdMembers.get(householdId) ?? [];
    list.push(personId);
    householdMembers.set(householdId, list);
  }

  const kin = new Map<EntityId, Set<EntityId>>();
  const childrenOf = new Map<EntityId, EntityId[]>();
  for (const kinship of h.kinshipRelationships) {
    const [a, b] = kinship.personIds;
    for (const [x, y] of [
      [a, b],
      [b, a],
    ] as const) {
      const set = kin.get(x) ?? new Set<EntityId>();
      set.add(y);
      kin.set(x, set);
    }
    if (!/parent-child$/.test(kinship.kind)) continue;
    const personA = world.people[a];
    const personB = world.people[b];
    if (!personA || !personB) continue;
    const [parent, child] =
      personA.birthDate <= personB.birthDate ? [a, b] : [b, a];
    const list = childrenOf.get(parent) ?? [];
    list.push(child);
    childrenOf.set(parent, list);
  }

  const latestWork = new Map<EntityId, string>();
  const yearAgo = addDays(today, -365);
  const endedWork = new Map<EntityId, string>();
  for (const status of h.workStatuses)
    if (status.effectiveAt <= today) {
      latestWork.set(status.workRelationshipId, status.status);
      if (
        status.status === "ended" &&
        (status.reason === TOWN_JOB_END_REASONS.laidOff ||
          status.reason === TOWN_JOB_END_REASONS.businessClosed) &&
        status.effectiveAt > yearAgo
      )
        endedWork.set(status.workRelationshipId, status.reason);
    }
  const working = new Set<EntityId>();
  const laidOffThisYear = new Set<EntityId>();
  for (const relationship of h.workRelationships) {
    if (latestWork.get(relationship.id) === "active")
      working.add(relationship.personId);
    if (endedWork.has(relationship.id))
      laidOffThisYear.add(relationship.personId);
  }

  return {
    today,
    town,
    people,
    dead,
    couples,
    partnered,
    lastEnded,
    household,
    householdMembers,
    kin,
    childrenOf,
    working,
    laidOffThisYear,
  };
}

/** Whether two people could start dating, by who each of them looks for. */
function drawnToEachOther(world: World, a: Person, b: Person): boolean {
  const sameGenderSeeker = (person: Person) =>
    new SeededRng(world.seed)
      .fork(`${TOWN_FAMILIES_VERSION}:looks-for:${person.id}`)
      .next() < TOWN_FAMILY_CHANCES.sameGender;
  const genderA = a.identity?.gender;
  const genderB = b.identity?.gender;
  const known = (gender: string | undefined) =>
    gender === "female" || gender === "male";
  if (!known(genderA) || !known(genderB)) return true;
  const same = genderA === genderB;
  return same
    ? sameGenderSeeker(a) && sameGenderSeeker(b)
    : !sameGenderSeeker(a) && !sameGenderSeeker(b);
}

/** One quarterly turn of the town's families, on the world's current date. */
export function reviewTownFamilies(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null,
  round: string,
): World {
  const prefix = `${TOWN_FAMILIES_VERSION}:${town}:${round}:`;
  // A review already run for this round writes nothing new.
  if (world.history.events.some((event) => event.stableKey.startsWith(prefix)))
    return world;
  const view = readFamilies(world, town);
  if (view.people.size === 0) return world;
  const today = view.today;
  const pressure = Math.sqrt(townUnemploymentPressure(world, town));
  const rngFor = (key: string) =>
    new SeededRng(world.seed).fork(`${prefix}${key}`);
  const touched = new Set<EntityId>();
  const isPlayer = (id: EntityId) => id === playerPersonId;
  let next = world;

  const householdOf = (id: EntityId) => view.household.get(id) ?? null;
  const childUnder = (householdId: EntityId | null, years: number) =>
    householdId !== null &&
    (view.householdMembers.get(householdId) ?? []).some(
      (id) => (view.people.get(id)?.age ?? 99) < years,
    );

  const event = (
    key: string,
    type: `${string}.${string}`,
    ids: readonly EntityId[],
    summary: string,
  ): LifeRecordProvenance => {
    next = recordWorldEvent(next, {
      stableKey: `${prefix}${key}`,
      type,
      occurredAt: today,
      recordedAt: today,
      jurisdictionId: town,
      involvedEntityIds: [...ids],
      participants: ids.map((personId) => ({
        personId,
        role: "focus:subject" as const,
        detail: summary,
      })),
      personFactConstraints: [],
      visibility: "limited",
      tags: ["life.couple", TOWN_FAMILIES_VERSION],
      summary,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    return { kind: "simulated-event", eventId: next.history.events.at(-1)!.id };
  };

  const endPartnership = (
    couple: Couple,
    key: string,
    provenance: LifeRecordProvenance,
  ) => {
    next = recordPartnershipState(next, {
      stableKey: `${prefix}${key}:state`,
      partnershipId: couple.partnership.id,
      effectiveAt: today,
      status: "ended",
      provenance,
      supersedesStateId: couple.stateId,
    });
  };

  /** Moves a person, and the children only they parent, into a household. */
  const moveInto = (
    key: string,
    moverId: EntityId,
    toHouseholdId: EntityId,
    stayingParentId: EntityId | null,
    provenance: LifeRecordProvenance,
  ) => {
    const fromHouseholdId = householdOf(moverId);
    const children = (view.childrenOf.get(moverId) ?? []).filter(
      (child) =>
        (view.people.get(child)?.age ?? 99) < 18 &&
        householdOf(child) === fromHouseholdId &&
        !(
          stayingParentId !== null &&
          (view.childrenOf.get(stayingParentId) ?? []).includes(child)
        ) &&
        !(
          (fromHouseholdId && view.householdMembers.get(fromHouseholdId)) ||
          []
        ).some(
          (other) =>
            other !== moverId &&
            (view.childrenOf.get(other) ?? []).includes(child),
        ),
    );
    for (const personId of [moverId, ...children]) {
      const entry = householdMembershipsAt(next, personId).find(
        (candidate) =>
          candidate.household.id === fromHouseholdId &&
          candidate.state.residenceRole === "primary",
      );
      if (entry)
        next = recordHouseholdMembershipState(next, {
          stableKey: `${prefix}${key}:left:${entry.membership.id}`,
          membershipId: entry.membership.id,
          effectiveAt: today,
          status: "ended",
          residenceRole: entry.state.residenceRole,
          kind: entry.state.kind,
          provenance,
          supersedesStateId: entry.state.id,
        });
      next = startHouseholdMembership(next, {
        stableKey: `${prefix}${key}:joined:${personId}`,
        personId,
        householdId: toHouseholdId,
        startedAt: today,
        residenceRole: "primary",
        kind: personId === moverId ? "resident:partner" : "resident:child",
        provenance,
      });
    }
  };

  /** A new home in town for somebody leaving a shared one. */
  const newHousehold = (
    key: string,
    person: Person,
    provenance: LifeRecordProvenance,
  ): EntityId => {
    const householdKey = `${prefix}${key}:household`;
    next = createHousehold(next, {
      stableKey: householdKey,
      formedAt: today,
      label: `${personName(person)}'s household`,
      provenance,
    });
    const householdId = createStableId(
      "household",
      `${next.id}:${householdKey}`,
    );
    next = recordHouseholdLocation(next, {
      stableKey: `${householdKey}:location`,
      householdId,
      effectiveAt: today,
      jurisdictionId: town,
      label: lifePlaceByJurisdictionId(town)?.displayName ?? "Home",
      kind: "residence:home",
      provenance,
      supersedesLocationId: null,
    });
    return householdId;
  };

  // Couples: a breakup, else the next step together, else a child.
  for (const couple of view.couples) {
    const [a, b] = couple.partnership.personIds;
    if (isPlayer(a) || isPlayer(b)) continue;
    const personA = view.people.get(a);
    const personB = view.people.get(b);
    if (!personA || !personB) continue;
    const key = `couple:${couple.partnership.id}`;
    const rng = rngFor(key);
    const years = yearsBetween(couple.partnership.startedAt, today);
    const homeA = householdOf(a);
    const together = homeA !== null && homeA === householdOf(b);
    const names = `${personName(personA.person)} and ${personName(personB.person)}`;

    let breakUp = TOWN_FAMILY_CHANCES.breakUp[couple.stage] * pressure;
    if (couple.stage !== "dating") {
      if (years < 3) breakUp *= 1.5;
      else if (years >= 15) breakUp *= 0.5;
    }
    if (view.laidOffThisYear.has(a) || view.laidOffThisYear.has(b))
      breakUp *= 1.6;
    if (
      !view.working.has(a) &&
      !view.working.has(b) &&
      personA.age < 67 &&
      personB.age < 67
    )
      breakUp *= 1.3;
    if (together && childUnder(homeA, 6)) breakUp *= 0.75;
    if (rng.fork("break-up").next() < breakUp) {
      const married = couple.stage === "married";
      const provenance = event(
        key,
        married ? TOWN_FAMILY_EVENTS.divorced : TOWN_FAMILY_EVENTS.brokeUp,
        [a, b],
        married ? `${names} divorced.` : `${names} broke up.`,
      );
      endPartnership(couple, key, provenance);
      if (together && couple.stage !== "dating") {
        const [leaving, staying] =
          rng.fork("who-leaves").next() < 0.5 ? [a, b] : [b, a];
        const home = newHousehold(
          key,
          view.people.get(leaving)!.person,
          provenance,
        );
        moveInto(key, leaving, home, staying, provenance);
      }
      touched.add(a).add(b);
      continue;
    }

    const bothWork = view.working.has(a) && view.working.has(b) ? 1.2 : 1;
    if (
      couple.stage === "dating" &&
      years >= 0.5 &&
      rng.fork("move-in").next() <
        (TOWN_FAMILY_CHANCES.moveIn * bothWork) / pressure
    ) {
      const provenance = event(
        key,
        TOWN_FAMILY_EVENTS.movedIn,
        [a, b],
        `${names} moved in together.`,
      );
      endPartnership(couple, key, provenance);
      next = createPartnership(next, {
        stableKey: `${prefix}${key}:cohabiting`,
        personIds: [a, b],
        startedAt: today,
        kind: TOWN_PARTNERSHIP_KINDS.cohabiting,
        provenance,
      });
      if (!together) {
        const homeB = householdOf(b);
        const size = (id: EntityId | null) =>
          id === null ? 0 : (view.householdMembers.get(id)?.length ?? 0);
        // The one from the smaller household moves in with the other.
        const [mover, host] =
          size(homeA) > size(homeB) ||
          (size(homeA) === size(homeB) && rng.fork("host").next() < 0.5)
            ? [b, a]
            : [a, b];
        const hostHome = householdOf(host);
        if (hostHome !== null) moveInto(key, mover, hostHome, null, provenance);
      }
      touched.add(a).add(b);
      continue;
    }
    if (
      couple.stage === "cohabiting" &&
      years >= 1 &&
      rng.fork("marry").next() <
        (TOWN_FAMILY_CHANCES.marry * bothWork) / pressure
    ) {
      const provenance = event(
        key,
        TOWN_FAMILY_EVENTS.married,
        [a, b],
        `${names} married.`,
      );
      endPartnership(couple, key, provenance);
      next = createPartnership(next, {
        stableKey: `${prefix}${key}:married`,
        personIds: [a, b],
        startedAt: today,
        kind: TOWN_PARTNERSHIP_KINDS.married,
        provenance,
      });
      touched.add(a).add(b);
      continue;
    }
  }

  // Children. Each woman aged 15 to 49 has her age's real yearly birth rate
  // on average; her own conditions move her chance up or down around it, and
  // the chances are rescaled so the town's total still matches the rates.
  const stageOf = new Map<
    EntityId,
    { stage: Stage; partner: EntityId; years: number }
  >();
  for (const couple of view.couples) {
    const [a, b] = couple.partnership.personIds;
    const years = yearsBetween(couple.partnership.startedAt, today);
    stageOf.set(a, { stage: couple.stage, partner: b, years });
    stageOf.set(b, { stage: couple.stage, partner: a, years });
  }
  const mothers: {
    person: TownPerson;
    weight: number;
    partner: EntityId | null;
  }[] = [];
  const bandWeight = new Map<number, { sum: number; count: number }>();
  for (const entry of view.people.values()) {
    if (entry.person.identity?.gender !== "female") continue;
    const rate = byAge(TOWN_BIRTH_RATES_BY_AGE, entry.age);
    if (rate <= 0) continue;
    const id = entry.person.id;
    const band = bandOf(entry.age);
    const tally = bandWeight.get(band) ?? { sum: 0, count: 0 };
    tally.count += 1;
    bandWeight.set(band, tally);
    // The player and the player's partner decide their own children.
    const couple = stageOf.get(id);
    if (isPlayer(id) || (couple && isPlayer(couple.partner))) continue;
    if (touched.has(id)) continue;
    const children = view.childrenOf.get(id) ?? [];
    const youngest = Math.min(
      ...children.map(
        (child) =>
          Date.parse(today) -
          Date.parse(world.people[child]?.birthDate ?? "1900-01-01"),
      ),
    );
    if (youngest < BIRTH_SPACING_DAYS * 86_400_000) continue;
    const together =
      couple !== undefined &&
      householdOf(id) !== null &&
      householdOf(id) === householdOf(couple.partner);
    const weights = TOWN_BIRTH_WEIGHTS;
    let weight = !couple
      ? weights.single
      : couple.stage === "married"
        ? weights.married
        : couple.stage === "cohabiting" && together
          ? weights.cohabiting
          : weights.dating;
    weight *=
      weights.byChildren[
        Math.min(children.length, weights.byChildren.length - 1)
      ]!;
    if (couple && couple.stage !== "dating" && couple.years < 1)
      weight *= weights.firstYear;
    const home = householdOf(id);
    if (
      home === null ||
      !(view.householdMembers.get(home) ?? []).some((member) =>
        view.working.has(member),
      )
    )
      weight *= weights.nobodyWorking;
    tally.sum += weight;
    const partner =
      couple && couple.stage !== "dating" && together ? couple.partner : null;
    mothers.push({ person: entry, weight, partner });
  }
  // Hard times and other causes in the outcome web move the town's birth
  // rate (unemployment nine months earlier: about 1.4% fewer births per point).
  const birthFactor = outcomeFactor(
    next,
    town,
    "births.rate",
    today,
  ).multiplier;
  for (const mother of mothers) {
    const tally = bandWeight.get(bandOf(mother.person.age))!;
    const mean = tally.sum / tally.count;
    if (mean <= 0) continue;
    const yearly = byAge(TOWN_BIRTH_RATES_BY_AGE, mother.person.age) / 1000;
    // Unemployment reaches births only through the web, never twice.
    const chance = (yearly / 4) * (mother.weight / mean) * birthFactor;
    const id = mother.person.person.id;
    const rng = rngFor(`mother:${id}`);
    if (rng.fork("child").next() >= chance) continue;
    const partner =
      mother.partner && view.people.has(mother.partner) ? mother.partner : null;
    next = recordFamilyAddition(next, {
      kind: "birth",
      stableKey: `${prefix}mother:${id}:birth`,
      occurredAt: today,
      parentPersonIds: partner ? [id, partner] : [id],
      tags: [TOWN_FAMILIES_VERSION],
    }).world;
    touched.add(id);
    if (partner) touched.add(partner);
  }

  // Single adults: somebody in town of a near age may start dating them.
  const quietSince = addDays(today, -QUIET_AFTER_ENDING_DAYS);
  const singles = [...view.people.values()]
    .filter(
      ({ person, age }) =>
        age >= 20 &&
        age < 65 &&
        !isPlayer(person.id) &&
        !view.partnered.has(person.id) &&
        !touched.has(person.id) &&
        (view.lastEnded.get(person.id) ?? "") <= quietSince,
    )
    .sort((x, y) => (x.person.id < y.person.id ? -1 : 1));
  const paired = new Set<EntityId>();
  for (const seeker of singles) {
    if (paired.has(seeker.person.id)) continue;
    const rng = rngFor(`single:${seeker.person.id}`);
    let chance = byAge(TOWN_FAMILY_CHANCES.dateByAge, seeker.age);
    chance *= view.working.has(seeker.person.id) ? 1.2 : 0.85;
    if (rng.fork("looks").next() >= chance) continue;
    const kin = view.kin.get(seeker.person.id);
    const candidates = singles.filter(
      (other) =>
        other !== seeker &&
        !paired.has(other.person.id) &&
        Math.abs(other.age - seeker.age) <= TOWN_DATING_AGE_GAP &&
        !kin?.has(other.person.id) &&
        drawnToEachOther(world, seeker.person, other.person),
    );
    if (candidates.length === 0) continue;
    const match = candidates[rng.fork("who").integer(0, candidates.length)]!;
    const ids = [seeker.person.id, match.person.id] as const;
    const key = `dating:${[...ids].sort().join(":")}`;
    const provenance = event(
      key,
      TOWN_FAMILY_EVENTS.startedDating,
      ids,
      `${personName(seeker.person)} and ${personName(match.person)} started dating.`,
    );
    next = createPartnership(next, {
      stableKey: `${prefix}${key}:partnership`,
      personIds: [ids[0], ids[1]],
      startedAt: today,
      kind: TOWN_PARTNERSHIP_KINDS.dating,
      provenance,
    });
    paired.add(ids[0]).add(ids[1]);
  }
  return next;
}

/** Counts of what the town's families did, from the records. */
export function describeTownFamilies(world: World, town: EntityId) {
  const counts: Record<string, number> = {};
  for (const event of world.history.events)
    if (
      event.jurisdictionId === town &&
      event.tags.includes(TOWN_FAMILIES_VERSION)
    )
      counts[event.type] = (counts[event.type] ?? 0) + 1;
  const births = world.history.events.filter(
    (event) =>
      event.stableKey.startsWith(`${TOWN_FAMILIES_VERSION}:${town}:`) &&
      event.type === "life.family-member-added",
  ).length;
  return { ...counts, births };
}
