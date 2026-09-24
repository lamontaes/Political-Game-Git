import {
  ageOnDate,
  personName,
  type EntityId,
  type IsoDate,
  type World,
} from "../simulation";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  type LifePlace,
} from "../simulation/life-places";
import { observeFromOpening } from "../simulation/people-continuation";
import { activeWorkRelationshipsAt } from "../simulation/life-queries";
import {
  organizationNameAt,
  publicPartyAffiliation,
} from "../simulation/living-world";
import { SeededRng } from "../simulation/rng";
import {
  constitutionalPosition,
  type ConstitutionalPosition,
} from "../simulation/constitutional-process";
import { reformMeasureCause } from "../simulation/living-world/constitutional-reform";
import { explicitNewGameSetup } from "./new-game-geography";
import type { NewGameSetup } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { currentPublicOfficeholders } from "./opening-officeholders";
import { passOrdinaryDays } from "./ordinary-life";

/**
 * OBSERVER MODE — the world with nobody played in it (Constitution rule 30).
 *
 * A watched world is opened by the same generator as a played one, around one
 * resident of a real place, and then handed to nobody. Time moves through the
 * same `passOrdinaryDays` a player's week does, so everything that happens
 * while watching is what would have happened around a player who was not
 * there. Nothing here decides anything on anyone's behalf.
 */

/**
 * Where a watched world opens: a state drawn from all fifty-two jurisdictions,
 * then a town inside it. Seeded, so the same seed always opens the same place,
 * and never a fixed default.
 */
export function observerPlace(seed: string): LifePlace {
  const rng = new SeededRng(`observer-place:${seed}`);
  const states = [...lifePlaceStateIdentities()];
  for (let attempt = 0; attempt < states.length; attempt += 1) {
    const state = states.splice(rng.integer(0, states.length), 1)[0]!;
    const towns = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    });
    if (towns.length > 0) return rng.pick(towns);
    const whole = searchLifePlaces("", 5, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "state",
    });
    if (whole.length > 0) return whole[0]!;
  }
  throw new Error("There is no place the game can open a world in.");
}

export function observerSetup(seed: string, placeKey?: string): NewGameSetup {
  return explicitNewGameSetup({
    seed,
    placeKey: placeKey ?? observerPlace(seed).key,
    // The resident the world is opened around is a grown adult, so their
    // household, work and town all exist from the first day.
    startAge: 35,
    depth: "summarize-earlier-life",
  });
}

export interface ObserverWorld {
  readonly world: World;
  /** The resident the world was opened around; an ordinary person, not played. */
  readonly anchorPersonId: EntityId;
}

/** Opens a world and hands it to nobody. */
export function openObserverWorld(setup: NewGameSetup): ObserverWorld {
  const opened = generateOpeningLife(prepareOpeningLife(setup));
  const game = opened.game;
  if (!game) throw new Error("The world could not be opened.");
  return {
    world: observeFromOpening(game.world, game.playerPersonId),
    anchorPersonId: game.playerPersonId,
  };
}

/** How far one press moves a watched world. */
export const OBSERVER_STEPS = [
  { key: "day", label: "A day", days: 1 },
  { key: "week", label: "A week", days: 7 },
  { key: "month", label: "A month", days: 30 },
  { key: "year", label: "A year", days: 365 },
] as const;

export type ObserverStepKey = (typeof OBSERVER_STEPS)[number]["key"];

/**
 * Lets time pass in a watched world. The same clock as a played life, so the
 * people in it, their institutions and their elections all carry on. A world
 * with somebody played in it is refused: this never moves a life for them.
 */
export function advanceObservedWorld(world: World, days: number): World {
  if (world.control.kind !== "observer") {
    throw new Error("Only a world nobody is playing can be left to run.");
  }
  return passOrdinaryDays(world, days);
}

/* ------------------------------------------------------------------ *
 * The world record: everything, as it stands, for someone watching
 * ------------------------------------------------------------------ */

export interface ObserverLawRow {
  readonly id: EntityId;
  readonly designation: string;
  readonly title: string;
  readonly place: string;
  readonly introducedAt: IsoDate;
  readonly status: string;
  readonly resolvedAt: IsoDate | null;
}

export interface ObserverAmendmentRow {
  readonly id: EntityId;
  readonly text: string;
  readonly status: string;
  readonly at: IsoDate;
  /** Why the world proposed it, when the world did; null for anyone else's. */
  readonly cause: string | null;
}

export interface ObserverElectionRow {
  readonly id: EntityId;
  readonly office: string;
  readonly place: string;
  readonly date: IsoDate;
  readonly winnerPersonId: EntityId | null;
  readonly winnerName: string | null;
}

export interface ObserverOfficeRow {
  readonly key: string;
  readonly title: string;
  readonly personId: EntityId;
  readonly personName: string;
}

export interface ObserverPersonRow {
  readonly personId: EntityId;
  readonly name: string;
  readonly age: number;
  readonly place: string;
}

export interface ObserverHappening {
  readonly id: EntityId;
  readonly at: IsoDate;
  readonly text: string;
  /** The same thing, on the same day, in the same place. */
  readonly count: number;
}

export interface ObserverRecord {
  readonly date: IsoDate;
  readonly startedOn: IsoDate;
  readonly livingCount: number;
  readonly deathCount: number;
  readonly laws: readonly ObserverLawRow[];
  readonly enactedCount: number;
  readonly amendments: readonly ObserverAmendmentRow[];
  readonly elections: readonly ObserverElectionRow[];
  readonly officeholders: readonly ObserverOfficeRow[];
  readonly news: readonly ObserverHappening[];
  readonly happenings: readonly ObserverHappening[];
}

const OUTCOME_LABEL: Readonly<Record<string, string>> = {
  enacted: "Became law",
  "failed-in-committee": "Died in committee",
  "failed-on-floor": "Voted down",
  "failed-concurrence": "Chambers never agreed",
  "vetoed-and-sustained": "Vetoed",
  "died-on-adjournment": "Died when the session ended",
};

const AMENDMENT_PHASE: Readonly<
  Record<ConstitutionalPosition["phase"], string>
> = {
  consideration: "Before the legislature",
  "awaiting-nevada": "Awaiting approval",
  ratification: "Out for ratification",
  ratified: "Ratified, not yet in force",
  operative: "In force",
  rejected: "Rejected",
  expired: "Expired",
};

/**
 * Event families that are bookkeeping rather than something that happened:
 * the clock moving, every seat's standing tenure, every filing intention.
 * They stay in the record; the list of what happened leaves them out.
 */
const QUIET_EVENT = [
  /^simulation\./,
  /^setup\./,
  /^game\./,
  /^world\.legislative-seat-tenure$/,
  /candidacy-intent$/,
  /^party\.chapter-meeting-invited$/,
  /^governing\.repair-funding$/,
];

function placeName(world: World, jurisdictionId: EntityId | null): string {
  if (!jurisdictionId) return "";
  return world.jurisdictions[jurisdictionId]?.name ?? "";
}

function nameOf(world: World, personId: EntityId | null | undefined) {
  const person = personId ? world.people[personId] : undefined;
  return person ? personName(person) : null;
}

export function projectObserverRecord(world: World): ObserverRecord {
  const history = world.history;
  const dead = new Set(history.personDeaths.map((death) => death.personId));
  const enactments = new Map(
    (history.legislativeEnactments ?? []).map((row) => [row.measureId, row]),
  );
  const laws = (history.legislativeMeasures ?? [])
    .map((measure): ObserverLawRow => {
      const ended = enactments.get(measure.id) ?? null;
      return {
        id: measure.id,
        designation: measure.designation,
        title: measure.shortTitle,
        place: placeName(world, measure.jurisdictionId),
        introducedAt: measure.introducedAt,
        status: ended
          ? (OUTCOME_LABEL[ended.outcome] ?? ended.outcome)
          : "Still moving",
        resolvedAt: ended?.resolvedAt ?? null,
      };
    })
    .reverse();
  const actions = history.constitutionalActions ?? [];
  const amendments = (history.constitutionalMeasures ?? [])
    .map((measure): ObserverAmendmentRow => {
      const last = actions
        .filter((action) => action.measureId === measure.id)
        .at(-1);
      const phase = constitutionalPosition(world, measure.id).phase;
      return {
        id: measure.id,
        text: measure.text,
        status: AMENDMENT_PHASE[phase],
        at: last?.occurredAt ?? world.currentDate,
        cause: reformMeasureCause(measure),
      };
    })
    .reverse();
  const contests = new Map(
    (history.electionContests ?? []).map((contest) => [contest.id, contest]),
  );
  const elections = (history.electionContestResults ?? [])
    .map((result): ObserverElectionRow => {
      const contest = contests.get(result.contestId);
      return {
        id: result.id,
        office: contest?.office.title ?? "An election",
        place: placeName(world, contest?.jurisdictionId ?? null),
        date: result.resolvedAt,
        winnerPersonId: result.winnerPersonId ?? null,
        winnerName: nameOf(world, result.winnerPersonId),
      };
    })
    .reverse();
  const officeholders = currentPublicOfficeholders(world).map((holder) => ({
    key: `${holder.officeKey}:${holder.personId}`,
    title: holder.title,
    personId: holder.personId,
    personName: holder.personName,
  }));
  const news = (history.publications ?? [])
    .slice(-40)
    .reverse()
    .map((publication) => ({
      id: publication.id,
      at: publication.publishedAt,
      text: `${publication.outletName}: ${publication.headline}`,
      count: 1,
    }));
  const happenings: ObserverHappening[] = [];
  const seen = new Map<string, number>();
  for (let index = history.events.length - 1; index >= 0; index -= 1) {
    const event = history.events[index]!;
    if (event.visibility !== "public") continue;
    if (QUIET_EVENT.some((pattern) => pattern.test(event.type))) continue;
    const where = placeName(world, event.jurisdictionId);
    const text = where ? `${where}: ${event.summary}` : event.summary;
    const key = `${event.occurredAt}|${text}`;
    const earlier = seen.get(key);
    if (earlier !== undefined) {
      const row = happenings[earlier]!;
      happenings[earlier] = { ...row, count: row.count + 1 };
      continue;
    }
    if (happenings.length >= 60) break;
    seen.set(key, happenings.length);
    happenings.push({ id: event.id, at: event.occurredAt, text, count: 1 });
  }
  return {
    date: world.currentDate,
    startedOn: history.events[0]?.occurredAt ?? world.currentDate,
    livingCount: Object.values(world.people).filter(
      (person) => !dead.has(person.id),
    ).length,
    deathCount: dead.size,
    laws,
    enactedCount: [...enactments.values()].filter(
      (row) => row.outcome === "enacted",
    ).length,
    amendments,
    elections,
    officeholders,
    news,
    happenings,
  };
}

/** Everyone alive, searchable by name or town; the whole world, not a contact list. */
export function observerPeople(
  world: World,
  query: string,
  limit = 60,
): { readonly rows: readonly ObserverPersonRow[]; readonly total: number } {
  const needle = query.trim().toLowerCase();
  const dead = new Set(
    world.history.personDeaths.map((death) => death.personId),
  );
  const rows: ObserverPersonRow[] = [];
  for (const person of Object.values(world.people)) {
    if (dead.has(person.id)) continue;
    const name = personName(person);
    const place = placeName(world, person.homeJurisdictionId);
    if (
      needle &&
      !name.toLowerCase().includes(needle) &&
      !place.toLowerCase().includes(needle)
    ) {
      continue;
    }
    rows.push({
      personId: person.id,
      name,
      age: ageOnDate(person.birthDate, world.currentDate),
      place,
    });
  }
  rows.sort((left, right) => left.name.localeCompare(right.name, "en"));
  return { rows: rows.slice(0, limit), total: rows.length };
}

export interface ObserverPersonFile {
  readonly personId: EntityId;
  readonly name: string;
  readonly born: IsoDate;
  readonly age: number;
  readonly died: IsoDate | null;
  readonly home: string;
  readonly work: readonly string[];
  readonly party: string | null;
  /** Everything the world has recorded them taking part in, newest first. */
  readonly record: readonly ObserverHappening[];
}

/**
 * One person as the world records them, not as anyone in it knows them: their
 * work, their party and every recorded event they took part in, private ones
 * included. Only an observer is shown this.
 */
export function projectObserverPerson(
  world: World,
  personId: EntityId,
  limit = 40,
): ObserverPersonFile | null {
  const person = world.people[personId];
  if (!person) return null;
  const death = world.history.personDeaths.find(
    (row) => row.personId === personId,
  );
  const work = death
    ? []
    : activeWorkRelationshipsAt(world, personId).map((active) => {
        const employer = active.relationship.organizationId
          ? organizationNameAt(world, active.relationship.organizationId)
          : null;
        return employer
          ? `${active.role.title}, ${employer}`
          : active.role.title;
      });
  const partyId = death ? null : publicPartyAffiliation(world, personId);
  const record: ObserverHappening[] = [];
  const events = world.history.events;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (
      !event.involvedEntityIds.includes(personId) &&
      !event.participants.some((entry) => entry.personId === personId)
    ) {
      continue;
    }
    if (QUIET_EVENT.some((pattern) => pattern.test(event.type))) continue;
    record.push({
      id: event.id,
      at: event.occurredAt,
      text: event.summary,
      count: 1,
    });
    if (record.length >= limit) break;
  }
  return {
    personId,
    name: personName(person),
    born: person.birthDate,
    age: ageOnDate(person.birthDate, death?.diedAt ?? world.currentDate),
    died: death?.diedAt ?? null,
    home: placeName(world, person.homeJurisdictionId),
    work,
    party: partyId ? organizationNameAt(world, partyId) : null,
    record,
  };
}
