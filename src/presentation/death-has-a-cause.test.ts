import { describe, expect, it } from "vitest";

import {
  addDays,
  ageOnDate,
  assertWorldIntegrity,
  personName,
  recordKinship,
  recordPersonDeath,
  type EntityId,
  type IsoDate,
  type Person,
  type World,
} from "../simulation";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "../simulation/character-history";
import {
  DEATH_CAUSE_ILLNESS_WITH_COURSE,
  DEATH_CAUSE_INJURY,
  DEATH_CAUSE_SUDDEN_ILLNESS,
  FATAL_ILLNESS_EPISODE_PREFIX,
  FATAL_ILLNESS_ONSET_KEY,
  MORTALITY_CAUSE_KEY,
  MORTALITY_DEATH_KEY,
  MORTALITY_WINDOW_KEY,
  beginHealthEpisode,
  crisisRecords,
  deathSentence,
  drawDeathCause,
  firstThresholdDay,
  latestHealthState,
  personMortalityThreshold,
  thresholdUnits,
  type DeathCauseGroup,
} from "../simulation/crisis";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { BEREAVEMENT_NOTICE_EVENT } from "../simulation/people-bereavement";
import { knownHealthNotices } from "./crisis-shell";
import { deathNewsBetween } from "./death-news";
import { composeConnectiveNarration } from "./life-narration";
import { projectWorld39Journal } from "./world39-journal";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { requireLocalityInState } from "./new-game-geography";
import { projectObserverPerson } from "./observer-world";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { continueAs, projectLifeContinuation } from "./people-continuation";
import { proseDate } from "./prose-dates";
import { letStoryTimePass, nextQuietMoment } from "./life-story";

/**
 * A death has a cause (playtest: George Norris, Frostburg, Maryland, died at
 * 31 with no cause and no warning, and the quiet stretch ran seven weeks past
 * it). Not Kentucky: the fixture life is in Hagerstown, Maryland.
 */

const SLOW = 600_000;

function daysBetweenDates(from: IsoDate, to: IsoDate): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 864e5);
}

function hagerstownLife(seed: string) {
  const home = requireLocalityInState("US-MD", "Hagerstown");
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 31,
      placeKey: home.key,
    }),
  ).game!;
  return { world: game.world, playerId: game.playerPersonId };
}

function nextWindow(world: World): IsoDate {
  const due = world.history.futureDueItems
    .filter(
      (item) =>
        item.transitionKey === MORTALITY_WINDOW_KEY &&
        item.dueAt > world.currentDate,
    )
    .sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1))[0];
  if (!due) throw new Error("No mortality window is scheduled.");
  return due.dueAt;
}

/** Turns 31 the day before the window, so 31 for the year that follows. */
function birthDateFor31(window: IsoDate): IsoDate {
  const birthday = `${Number(window.slice(0, 4)) - 31}${window.slice(4)}`;
  return addDays(birthday as IsoDate, -1);
}

interface Candidate {
  readonly key: string;
  readonly personId: EntityId;
  readonly birthDate: IsoDate;
  /** The hazard death day, computed from the threshold model alone. */
  readonly diesOn: IsoDate;
  readonly leadDays: number;
}

/**
 * A person the hazard model kills within a year of first exposure, found by
 * trying stable keys before the person exists. The death day comes only from
 * the threshold and the hazard, never from the cause code.
 */
function findHazardDeath(
  world: World,
  want: DeathCauseGroup,
  label: string,
): Candidate {
  const window = nextWindow(world);
  const birthDate = birthDateFor31(window);
  for (let i = 0; i < 400_000; i += 1) {
    const key = `test:md-kin:${label}:${i}`;
    const personId = characterHistoryContextPersonId(world, key);
    const diesOn = firstThresholdDay(
      {
        birthDate,
        category: "equal-mixture",
        exposureStart: window,
        multipliers: [],
      },
      thresholdUnits(personMortalityThreshold(world, personId)),
      window,
      addDays(window, 330),
    );
    if (!diesOn || diesOn <= addDays(window, 1)) continue;
    const stub: World = {
      ...world,
      people: { ...world.people, [personId]: { birthDate } as Person },
    };
    const draw = drawDeathCause(stub, personId, diesOn);
    if (draw.group !== want) continue;
    return { key, personId, birthDate, diesOn, leadDays: draw.leadDays };
  }
  throw new Error(`No ${want} death found.`);
}

/** Adds the candidate as the played character's sibling, in their town. */
function addSibling(
  world: World,
  playerId: EntityId,
  candidate: Candidate,
): World {
  const withPerson = createCharacterHistoryContextPerson(world, {
    stableKey: candidate.key,
    givenName: "Dana",
    familyName: "Keller",
    birthDate: candidate.birthDate,
    homeJurisdictionId: world.people[playerId]!.homeJurisdictionId,
  });
  expect(withPerson.people[candidate.personId]).toBeDefined();
  return recordKinship(withPerson, {
    stableKey: `${candidate.key}:sibling`,
    personIds: [playerId, candidate.personId],
    establishedAt: world.currentDate,
    kind: "collateral:sibling",
    provenance: { kind: "authored", note: "Test fixture sibling." },
  });
}

function passUntil(world: World, date: IsoDate): World {
  let current = world;
  while (current.currentDate < date) {
    const before = current.currentDate;
    current = passOrdinaryDays(
      current,
      Math.min(
        120,
        Math.round((Date.parse(date) - Date.parse(before)) / 864e5),
      ),
    );
    if (current.currentDate === before) throw new Error("Time did not move.");
  }
  return current;
}

function deathOf(world: World, personId: EntityId) {
  return world.history.personDeaths.find((d) => d.personId === personId);
}

function fatalEpisodes(world: World, personId: EntityId) {
  return crisisRecords(world).filter(
    (record) =>
      record.kind === "health-episode" &&
      record.personId === personId &&
      record.stableKey.startsWith(FATAL_ILLNESS_EPISODE_PREFIX),
  );
}

describe("a hazard death has a cause (Hagerstown, Maryland)", () => {
  it(
    "a 31-year-old's illness begins months ahead, the family is told, and the death keeps its day",
    () => {
      const { world, playerId } = hagerstownLife("md-death-course");
      const candidate = findHazardDeath(world, "illness-with-course", "course");
      const start = addSibling(world, playerId, candidate);

      // The day before the death: ill, known to the sibling, still alive.
      const eve = passUntil(start, addDays(candidate.diesOn, -1));
      expect(deathOf(eve, candidate.personId)).toBeUndefined();
      const episodes = fatalEpisodes(eve, candidate.personId);
      expect(episodes).toHaveLength(1);
      const episode = episodes[0]!;
      expect(episode.effectiveAt < candidate.diesOn).toBe(true);
      expect(episode.kind === "health-episode" && episode.origin.kind).toBe(
        "authored",
      );
      const disclosure = crisisRecords(eve).find(
        (record) =>
          record.kind === "health-disclosure" &&
          record.episodeId === episode.id,
      );
      expect(
        disclosure?.kind === "health-disclosure" && disclosure.recipientIds,
      ).toContain(playerId);
      const known = knownHealthNotices(eve, playerId);
      expect(known.map((notice) => notice.personId)).toContain(
        candidate.personId,
      );
      // Nothing but the hazard day is pending for them: at most one death item
      // (none when the day opens a window, which writes it directly), on it.
      const deathItems = eve.history.futureDueItems.filter(
        (item) =>
          item.transitionKey === MORTALITY_DEATH_KEY &&
          item.entityIds.includes(candidate.personId),
      );
      expect(deathItems.length).toBeLessThanOrEqual(1);
      expect(deathItems.every((item) => item.dueAt === candidate.diesOn)).toBe(
        true,
      );
      expect(
        eve.history.futureDueItems.filter(
          (item) =>
            item.transitionKey === FATAL_ILLNESS_ONSET_KEY &&
            item.entityIds.includes(candidate.personId),
        ),
      ).toHaveLength(1);

      const after = passOrdinaryDays(eve, 2);
      const death = deathOf(after, candidate.personId)!;
      expect(death.diedAt).toBe(candidate.diesOn);
      expect(ageOnDate(candidate.birthDate, death.diedAt)).toBe(31);
      expect(death.causeKey).toBe(DEATH_CAUSE_ILLNESS_WITH_COURSE);
      expect(death.sourceEntityIds).toContain(episode.id);
      expect(latestHealthState(after, episode.id)?.state).toBe("deceased");
      expect(
        after.history.events.find((event) => event.id === death.eventId)
          ?.summary,
      ).toBe("Died after a serious illness.");
      expect(projectObserverPerson(after, candidate.personId)?.diedHow).toBe(
        "after a serious illness",
      );
      assertWorldIntegrity(deserializeWorld(serializeWorld(after)));
    },
    SLOW,
  );

  it(
    "a sibling's death in a multi-week stretch reaches the player once, with relation, name, cause and date",
    () => {
      const { world, playerId } = hagerstownLife("md-death-notice");
      const candidate = findHazardDeath(world, "illness-with-course", "notice");
      const stranger = findHazardDeath(world, "injury", "stranger");
      let start = addSibling(world, playerId, candidate);
      // Somebody in the same town with no tie to the player.
      start = createCharacterHistoryContextPerson(start, {
        stableKey: stranger.key,
        givenName: "Casey",
        familyName: "Morrow",
        birthDate: stranger.birthDate,
        homeJurisdictionId: world.people[playerId]!.homeJurisdictionId,
      });
      // Up to shortly before the death, then one long quiet stretch across it.
      let current = passUntil(start, addDays(candidate.diesOn, -20));
      const stretchFrom = current;
      while (!deathOf(current, candidate.personId))
        current = letStoryTimePass(current, playerId);
      expect(
        daysBetweenDates(stretchFrom.currentDate, current.currentDate),
      ).toBeGreaterThan(14);
      current = passUntil(
        current,
        stranger.diesOn > current.currentDate
          ? addDays(stranger.diesOn, 1)
          : addDays(current.currentDate, 1),
      );
      expect(deathOf(current, stranger.personId)).toBeDefined();

      const expected = `Your younger sibling, Dana Keller, died after a serious illness on ${proseDate(candidate.diesOn)}.`;
      const told = (w: World) =>
        w.history.events.filter(
          (event) =>
            event.type === BEREAVEMENT_NOTICE_EVENT &&
            event.participants.some(
              (entry) =>
                entry.personId === playerId && entry.role === "focus:told",
            ),
        );
      // Exactly one notice, for the sibling, dated the day of the death.
      expect(told(current)).toHaveLength(1);
      expect(told(current)[0]!.occurredAt).toBe(candidate.diesOn);
      expect(
        told(current)[0]!.involvedEntityIds.includes(stranger.personId),
      ).toBe(false);
      // Said once where the player reads their life, and on return.
      const journal = (w: World) =>
        projectWorld39Journal(w, playerId).entries.filter(
          (entry) => entry.text === expected,
        );
      expect(journal(current)).toHaveLength(1);
      expect(
        deathNewsBetween(
          current,
          playerId,
          stretchFrom.currentDate,
          current.currentDate,
        ).map((news) => news.sentence),
      ).toEqual([expected]);
      expect(
        composeConnectiveNarration({
          world: current,
          personId: playerId,
          since: stretchFrom.currentDate,
        }).sentences,
      ).toContain(expected);
      // It persists across save and reopen, still once.
      const reopened = deserializeWorld(serializeWorld(current));
      assertWorldIntegrity(reopened);
      expect(told(reopened)).toHaveLength(1);
      expect(journal(reopened)).toHaveLength(1);
      // Time going on does not tell it again.
      expect(told(passOrdinaryDays(reopened, 30))).toHaveLength(1);
    },
    SLOW,
  );

  it(
    "a death already in a save is not announced after the fact",
    () => {
      const { world, playerId } = hagerstownLife("md-death-no-flood");
      const candidate = findHazardDeath(world, "injury", "old-save");
      const withSibling = addSibling(world, playerId, candidate);
      // Recorded the way a save from before notices held it: the death, and no
      // family notice.
      const old = recordPersonDeath(withSibling, {
        stableKey: "test:old-save-death",
        personId: candidate.personId,
        diedAt: withSibling.currentDate,
        causeKey: MORTALITY_CAUSE_KEY,
        sourceEntityIds: [withSibling.id],
        summary:
          "Died. The cause is not represented; ordinary all-cause mortality applied.",
        provenance: { kind: "simulated", sourceEntityIds: [withSibling.id] },
      });
      const reopened = deserializeWorld(serializeWorld(old));
      const later = passOrdinaryDays(reopened, 120);
      // Deaths that happen from here on are told as they happen; the one
      // already in the save is never told.
      expect(
        later.history.events.filter(
          (event) =>
            event.type === BEREAVEMENT_NOTICE_EVENT &&
            event.involvedEntityIds.includes(candidate.personId),
        ),
      ).toEqual([]);
      expect(
        later.history.knowledge.filter(
          (row) =>
            row.personId === playerId &&
            row.eventId === deathOf(later, candidate.personId)!.eventId,
        ),
      ).toEqual([]);
    },
    SLOW,
  );

  it(
    "sudden illness and injury deaths happen on the hazard day, with a cause and no illness first",
    () => {
      const { world, playerId } = hagerstownLife("md-death-sudden");
      const sudden = findHazardDeath(world, "sudden-illness", "sudden");
      const injury = findHazardDeath(world, "injury", "injury");
      const start = addSibling(
        addSibling(world, playerId, sudden),
        playerId,
        injury,
      );
      const last =
        sudden.diesOn > injury.diesOn ? sudden.diesOn : injury.diesOn;
      const after = passUntil(start, addDays(last, 1));
      for (const [candidate, key] of [
        [sudden, DEATH_CAUSE_SUDDEN_ILLNESS],
        [injury, DEATH_CAUSE_INJURY],
      ] as const) {
        const death = deathOf(after, candidate.personId)!;
        expect(death.diedAt).toBe(candidate.diesOn);
        expect(ageOnDate(candidate.birthDate, death.diedAt)).toBe(31);
        expect(death.causeKey).toBe(key);
        expect(fatalEpisodes(after, candidate.personId)).toEqual([]);
      }
      expect(
        deathSentence("Dana Keller", DEATH_CAUSE_INJURY, "May 1, 2027"),
      ).toBe("Dana Keller died in an accident on May 1, 2027.");
      expect(
        deathSentence("Dana Keller", DEATH_CAUSE_SUDDEN_ILLNESS, "May 1, 2027"),
      ).toBe("Dana Keller died suddenly of an illness on May 1, 2027.");
      assertWorldIntegrity(deserializeWorld(serializeWorld(after)));
    },
    SLOW,
  );

  it(
    "a long quiet stretch ends on the day the played character dies, and says how",
    () => {
      const { world, playerId } = hagerstownLife("md-death-stop");
      // A test-only hazard on the played character so the death falls inside
      // the stretches below. The stop is what is under test, not the hazard.
      let current = beginHealthEpisode(world, {
        stableKey: "test-grave",
        personId: playerId,
        severity: "chronic",
        initialLimitation: "none",
        origin: { kind: "authored", note: "Test fixture hazard only." },
        causalParentIds: [],
        hazard: {
          micros: 2_000_000_000,
          basis: "Test fixture only; not clinical data.",
        },
      });
      let stretchFrom = current;
      // A stretch also stops at a meeting posted while it runs, so the count
      // of stretches to the death is not fixed; the bound only ends a loop.
      for (let i = 0; i < 60 && !deathOf(current, playerId); i += 1) {
        stretchFrom = current;
        current = letStoryTimePass(current, playerId);
      }
      const death = deathOf(current, playerId);
      expect(death).toBeDefined();
      // The death fell inside a multi-week stretch, which stopped on its day.
      expect(nextQuietMoment(stretchFrom) > death!.diedAt).toBe(true);
      expect(stretchFrom.currentDate < death!.diedAt).toBe(true);
      expect(current.currentDate).toBe(death!.diedAt);
      // Nothing was written past the death.
      expect(
        current.history.events.filter(
          (event) => event.occurredAt > death!.diedAt,
        ),
      ).toEqual([]);
      // Nobody was continued for the player: the life waits for a choice.
      expect(current.control).toEqual({ kind: "person", personId: playerId });
      const reopened = deserializeWorld(serializeWorld(current));
      assertWorldIntegrity(reopened);
      expect(reopened.currentDate).toBe(death!.diedAt);
      expect([
        DEATH_CAUSE_SUDDEN_ILLNESS,
        DEATH_CAUSE_INJURY,
      ] as string[]).toContain(death!.causeKey);
      const view = projectLifeContinuation(current, playerId)!;
      expect(view.heading).toBe(
        deathSentence(
          personName(current.people[playerId]!),
          death!.causeKey,
          proseDate(death!.diedAt),
        ),
      );
      expect(view.heading).not.toBe(
        `${personName(current.people[playerId]!)} died on ${proseDate(death!.diedAt)}.`,
      );
      // An explicit continuation choice then proceeds, from the death date.
      const successor = view.choices.find((choice) => choice.availableNow);
      expect(successor).toBeDefined();
      const continued = continueAs(reopened, playerId, successor!.personId);
      expect(continued.control).toEqual({
        kind: "person",
        personId: successor!.personId,
      });
      expect(continued.currentDate).toBe(death!.diedAt);
      const onward = passOrdinaryDays(continued, 3);
      expect(onward.currentDate > death!.diedAt).toBe(true);
      assertWorldIntegrity(onward);
    },
    SLOW,
  );

  it(
    "an old save's causeless death still loads and reads plainly as died",
    () => {
      const { world, playerId } = hagerstownLife("md-death-legacy");
      const dead = recordPersonDeath(world, {
        stableKey: "test:legacy-death",
        personId: playerId,
        diedAt: world.currentDate,
        causeKey: MORTALITY_CAUSE_KEY,
        sourceEntityIds: [world.id],
        summary:
          "Died. The cause is not represented; ordinary all-cause mortality applied.",
        provenance: { kind: "simulated", sourceEntityIds: [world.id] },
      });
      const reopened = deserializeWorld(serializeWorld(dead));
      assertWorldIntegrity(reopened);
      const name = personName(reopened.people[playerId]!);
      expect(projectLifeContinuation(reopened, playerId)?.heading).toBe(
        `${name} died on ${proseDate(reopened.currentDate)}.`,
      );
      expect(projectObserverPerson(reopened, playerId)?.diedHow).toBeNull();
    },
    SLOW,
  );
});
