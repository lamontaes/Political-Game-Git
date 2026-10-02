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
 * - a single adult may start dating another single adult in town of a near
 *   age, more often in their twenties and thirties and when they work;
 * - a couple who share a home weighs raising a family plan
 *   (`./town-family-plans`), from their own circumstances;
 * - a grown child living in a parent's home weighs setting up a home of
 *   their own (`./leaving-home`), from their age, their own pay against the
 *   town's rent for one, a partner of their own and their taste for risk.
 *
 * A new household forms only from one of these recorded causes: a grown
 * child leaving home, or the partner who moves out after a breakup.
 *
 * A child is born only when two people have a recorded family plan
 * (`../people-family-plan`): one of them raised it, the other agreed, and the
 * birth lands on the plan's own date through the family writer. That is one
 * rule for the player and for everybody in town; no quarterly draw makes a
 * baby.
 *
 * So the chances follow conditions that last (age, years together, children,
 * work, the economy), not one flat chance for everybody. The player's own
 * relationships stay the player's choice and are never touched
 * here. Every change is a dated record with its own event, on the day of the
 * review, written through the same writers play uses.
 *
 * The chances below are GAME ASSUMPTIONS, not read from a source. What the
 * game does not claim: this models no custody law and no attraction. After a
 * breakup the children stay in the home unless only the partner who leaves is
 * their parent.
 */

import { ageOnDate, addDays } from "../dates";
import { createStableId, stableHash } from "../ids";
import { largestRemainderAllocation } from "../largest-remainder";
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
import { SeededRng } from "../rng";
import type {
  EntityId,
  IsoDate,
  LifeRecordProvenance,
  Partnership,
  Person,
  World,
  HistoricalEvent,
} from "../types";
import { ensurePeopleTraits } from "../people-traits";
import { recordWorldEvent } from "../world";
import {
  decideToLeaveHome,
  LEAVING_HOME_EVENT,
  LEAVING_HOME_VERSION,
} from "./leaving-home";
import { weighTownFamilyPlans, type TownCouple } from "./town-family-plans";
import { SAME_SEX_COUPLE_SHARE } from "./town-residents";
import {
  hudRentRowFor,
  marketRentMinor,
  monthlyPayByPerson,
} from "./town-rent";
import { jobsLostBy, townUnemploymentPressure } from "./town-labor-market";

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
} as const;

/** The widest age gap between two people who start dating, in years. */
export const TOWN_DATING_AGE_GAP = 8;

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
  for (const status of h.workStatuses)
    if (status.effectiveAt <= today)
      latestWork.set(status.workRelationshipId, status.status);
  const working = new Set<EntityId>();
  for (const relationship of h.workRelationships)
    if (latestWork.get(relationship.id) === "active")
      working.add(relationship.personId);
  // A resident who lost a job in the past year, read by the one reader of a
  // lost job.
  const yearAgo = addDays(today, -365);
  const laidOffThisYear = new Set<EntityId>();
  for (const personId of people.keys())
    if (
      jobsLostBy(world, personId, today).some(
        (status) => status.effectiveAt > yearAgo,
      )
    )
      laidOffThisYear.add(personId);

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

/**
 * The share of a town's people who look for a partner of their own gender:
 * the same figure the opening pairs couples by (`SAME_SEX_COUPLE_SHARE`,
 * town-residents.ts), so a couple who meet in play are two women or two men
 * as often as the town's opening couples are. ESTIMATED FROM AVERAGE: no
 * place's own figure is on file, so every one of the 56 places takes the
 * national share inferred from the Census Bureau's American Community Survey
 * same-sex couple tables. In parts per million, the allocator's whole weights.
 */
export const SAME_GENDER_SHARE_PPM = Math.round(SAME_SEX_COUPLE_SHARE * 1e6);

/**
 * Who among the town's people looks for a partner of their own gender. It is
 * a fact about a person, not a decision anybody makes, so it is allocated,
 * not drawn: of the town's living women, and of its living men, exactly the
 * share's whole number (largest remainder, `largestRemainderAllocation`) do.
 * Which of them is the one choice left, among the real people there: they
 * stand in an order the world's seed fixes for each person, and the first
 * that many in it are the ones. Because the order is fixed, a person joining
 * or leaving the town moves the count by at most one and changes nobody else
 * but the one person at the edge of it. People who are neither recorded as a
 * woman nor as a man are left to `drawnToEachOther`, as before.
 */
export function sameGenderSeekers(
  world: World,
  people: Iterable<Person>,
): ReadonlySet<EntityId> {
  const byGender = new Map<string, { id: EntityId; order: string }[]>();
  for (const person of people) {
    const gender = person.identity?.gender;
    if (gender !== "female" && gender !== "male") continue;
    const group = byGender.get(gender) ?? [];
    group.push({
      id: person.id,
      order: stableHash(
        `${world.seed}\n${TOWN_FAMILIES_VERSION}:looks-for:${person.id}`,
      ),
    });
    byGender.set(gender, group);
  }
  const seekers = new Set<EntityId>();
  for (const group of byGender.values()) {
    const [count] = largestRemainderAllocation(
      [SAME_GENDER_SHARE_PPM, 1_000_000 - SAME_GENDER_SHARE_PPM],
      group.length,
    );
    group
      .sort((a, b) =>
        a.order !== b.order
          ? a.order < b.order
            ? -1
            : 1
          : a.id < b.id
            ? -1
            : 1,
      )
      .slice(0, count)
      .forEach(({ id }) => seekers.add(id));
  }
  return seekers;
}

/** Whether two people could start dating, by who each of them looks for. */
function drawnToEachOther(
  seekers: ReadonlySet<EntityId>,
  a: Person,
  b: Person,
): boolean {
  const genderA = a.identity?.gender;
  const genderB = b.identity?.gender;
  const known = (gender: string | undefined) =>
    gender === "female" || gender === "male";
  if (!known(genderA) || !known(genderB)) return true;
  const same = genderA === genderB;
  return same
    ? seekers.has(a.id) && seekers.has(b.id)
    : !seekers.has(a.id) && !seekers.has(b.id);
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
    tag = "life.couple",
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
      tags: [tag, TOWN_FAMILIES_VERSION],
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

  /** When this person moved into the home they live in now. */
  const settledSince = (id: EntityId): IsoDate =>
    householdMembershipsAt(next, id).find(
      (entry) =>
        entry.household.id === householdOf(id) &&
        entry.state.residenceRole === "primary",
    )?.membership.startedAt ?? today;
  /**
   * Of two people, the one who has lived in their home longer; with the same
   * date, the older of them. HARDWIRED tie-break: age, where the record
   * holds nothing else that tells them apart.
   */
  const settledLonger = (a: EntityId, b: EntityId): EntityId => {
    const [sinceA, sinceB] = [settledSince(a), settledSince(b)];
    if (sinceA !== sinceB) return sinceA < sinceB ? a : b;
    const born = (id: EntityId) => view.people.get(id)!.person.birthDate;
    return born(a) <= born(b) ? a : b;
  };
  /**
   * Who moves out when a couple sharing a home breaks up, from the home as it
   * stands: the children stay with their parent, so the partner who parents
   * more of the children living there keeps the home; otherwise the one who
   * lived there first does. Returns [leaving, staying].
   */
  const leavesAfterBreakUp = (
    a: EntityId,
    b: EntityId,
  ): readonly [EntityId, EntityId] => {
    const home = householdOf(a);
    const childrenHere = (id: EntityId) =>
      (view.childrenOf.get(id) ?? []).filter(
        (child) =>
          (view.people.get(child)?.age ?? 99) < 18 &&
          householdOf(child) === home,
      ).length;
    const [kidsA, kidsB] = [childrenHere(a), childrenHere(b)];
    const staying =
      kidsA !== kidsB ? (kidsA > kidsB ? a : b) : settledLonger(a, b);
    return staying === a ? [b, a] : [a, b];
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
        const [leaving, staying] = leavesAfterBreakUp(a, b);
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
        // The one from the smaller household moves in with the other; with
        // homes the same size, the one settled there longer keeps theirs.
        const [mover, host] =
          size(homeA) > size(homeB) ||
          (size(homeA) === size(homeB) && settledLonger(a, b) === a)
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

  // Grown children: one living in a parent's home weighs setting up a home
  // of their own (`./leaving-home`). A new household is their own decision.
  // The player's home is never changed here.
  const playerHome =
    playerPersonId === null ? null : householdOf(playerPersonId);
  const grownAtHome = [...view.people.values()]
    .filter(({ person, age }) => {
      const home = householdOf(person.id);
      return (
        age >= 18 &&
        !isPlayer(person.id) &&
        !touched.has(person.id) &&
        home !== null &&
        home !== playerHome &&
        (view.householdMembers.get(home) ?? []).some(
          (other) =>
            other !== person.id &&
            (view.childrenOf.get(other) ?? []).includes(person.id),
        )
      );
    })
    .sort((x, y) => (x.person.id < y.person.id ? -1 : 1));
  if (grownAtHome.length > 0) {
    next = ensurePeopleTraits(
      next,
      grownAtHome.map(({ person }) => person.id),
    );
    const pay = monthlyPayByPerson(next, today);
    const row = hudRentRowFor(town);
    const rentForOne = row ? marketRentMinor(next, town, row, 0, today) : null;
    for (const { person, age } of grownAtHome) {
      const home = householdOf(person.id);
      const partnerElsewhere = view.couples.some(
        (couple) =>
          couple.partnership.personIds.includes(person.id) &&
          couple.partnership.personIds.some(
            (other) => other !== person.id && householdOf(other) !== home,
          ),
      );
      const key = `left-home:${person.id}`;
      const decision = decideToLeaveHome(
        next,
        person.id,
        {
          age,
          payMinor: pay.get(person.id) ?? 0,
          rentForOneMinor: rentForOne,
          partnerElsewhere,
        },
        `${LEAVING_HOME_VERSION}:${prefix}${key}`,
      );
      if (!decision.leaves) continue;
      const provenance = event(
        key,
        LEAVING_HOME_EVENT,
        [person.id],
        `${personName(person)} moved out of a parent's home into a home of their own.`,
        LEAVING_HOME_EVENT,
      );
      const household = newHousehold(key, person, provenance);
      moveInto(key, person.id, household, null, provenance);
      touched.add(person.id);
    }
  }

  // Children: a couple who share a home weighs raising a family plan, and a
  // child comes only from a plan the other partner agrees to, on its date.
  const planning: TownCouple[] = [];
  for (const couple of view.couples) {
    if (couple.stage === "dating") continue;
    const [a, b] = couple.partnership.personIds;
    if (touched.has(a) || touched.has(b)) continue;
    if (!view.people.has(a) || !view.people.has(b)) continue;
    const home = householdOf(a);
    if (home === null || home !== householdOf(b)) continue;
    planning.push({
      personIds: [a, b],
      married: couple.stage === "married",
      startedAt: couple.partnership.startedAt,
      householdId: home,
      children: [
        ...new Set([
          ...(view.childrenOf.get(a) ?? []),
          ...(view.childrenOf.get(b) ?? []),
        ]),
      ],
    });
  }
  next = weighTownFamilyPlans(next, town, planning, isPlayer);

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
  const seekers = sameGenderSeekers(
    world,
    [...view.people.values()].map(({ person }) => person),
  );
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
        drawnToEachOther(seekers, seeker.person, other.person),
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
export function describeTownFamilies(
  world: World,
  town: EntityId,
): Readonly<Record<string, number>> & { readonly births: number } {
  const counts: Record<string, number> = {};
  for (const event of world.history.events)
    if (
      event.jurisdictionId === town &&
      event.tags.includes(TOWN_FAMILIES_VERSION)
    )
      counts[event.type] = (counts[event.type] ?? 0) + 1;
  const births = world.history.events.filter((event) =>
    isTownBirth(event, town),
  ).length;
  return { ...counts, births };
}

/**
 * A child born to parents living in this town, whatever led to it: the
 * family writer's birth record, dated and placed where the parents live.
 */
export function isTownBirth(event: HistoricalEvent, town: EntityId): boolean {
  return (
    event.type === "life.family-member-added" &&
    event.jurisdictionId === town &&
    event.tags.includes("family.birth")
  );
}
