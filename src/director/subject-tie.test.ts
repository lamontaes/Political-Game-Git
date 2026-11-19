/**
 * The tie rule: a Subject with no tie record to the speaker or the hearer is
 * refused whoever built it. Unit rows prove the one check (a builder the rule
 * has never seen is refused the same way); the played row proves every
 * subject a talk can raise in a built world carries one. Ridgeville, Alabama
 * (0164656), the draw "8341-pin"/"p6" the bench tests pin.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { CRIME_EVENT } from "../core2/modules/crime";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "../bench/world";
import { subjectsBetween, type Subject } from "./conversation";
import { acceptSubjects, OWN_RECORD_KINDS, storyTie } from "./subject-tie";
import type { Story } from "../core2/modules/news";

const PINNED = { run: "8341-pin", purpose: "p6", key: "0164656" };

const row = (kind: string, extra: Partial<Subject> = {}): Subject => ({
  id: `${kind}:1`,
  kind,
  facts: {},
  ...extra,
});

it("refuses a subject with no tie, whichever builder made it", () => {
  const refused: string[] = [];
  const accepted = acceptSubjects(
    [
      row("weather-chat"), // a builder the rule has never seen, no tie
      row("news"), // a printed story with only a stance on its question
      row("headline-gossip", { tie: { kind: "record", recordIds: [] } }), // a tie that names no record
      row("news", {
        tie: { kind: "place", recordIds: ["story:1", "office:a"] },
      }),
      row("home", { facts: { x: { sourceRecordIds: ["record:a:1"] } } }), // cites the speaker's own record
      row("home", { facts: { x: { sourceRecordIds: ["organization:z"] } } }), // cites nobody's record: the kind alone is no tie
    ],
    (id) => id.startsWith("record:a:"),
    (subject) => refused.push(subject.kind),
  );
  expect(refused).toEqual(["weather-chat", "news", "headline-gossip", "home"]);
  expect(accepted.map((subject) => subject.kind)).toEqual(["news", "home"]);
  expect(accepted[1]!.tie).toEqual({
    kind: "record",
    recordIds: ["record:a:1"],
  });
  expect(OWN_RECORD_KINDS.has("weather-chat")).toBe(false);
});

it("every subject a built world's people can raise to the player carries its tie (Ridgeville AL)", () => {
  setBookkeeping(false);
  const place = drawPlace(PINNED.run, PINNED.purpose);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  expect(place.key, `${where}: the pinned place moved`).toBe(PINNED.key);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId as PersonId;
  let raised = 0;
  for (const person of core.people.values()) {
    if (person.id === playerId || !person.alive) continue;
    for (const subject of subjectsBetween(
      core,
      person.id,
      playerId,
      director,
      {},
    )) {
      raised += 1;
      expect(
        subject.tie?.recordIds.length,
        `${where}: ${subject.id} said by ${person.id} has no tie`,
      ).toBeGreaterThan(0);
    }
  }
  expect(raised, `${where}: no subject was raised`).toBeGreaterThan(0);
}, 60_000);

it("a printed story that names the speaker as its winner, a loser, the appointee or who appointed them is tied to them (Ridgeville AL)", () => {
  setBookkeeping(false);
  const place = drawPlace(PINNED.run, PINNED.purpose);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const playerId = world.playerId as PersonId;
  const [speaker, stranger] = [...core.people.values()].filter(
    (row) =>
      row.alive &&
      row.tier !== "husk" &&
      row.id !== playerId &&
      row.householdId !== core.people.get(playerId)!.householdId,
  );
  const story = (facts: Record<string, string>): Story =>
    ({ id: "story:test", facts }) as unknown as Story;
  // The speaker's own record in the story: each way a story names a person.
  for (const facts of [
    { winnerId: speaker!.id },
    { outIds: JSON.stringify([stranger!.id, speaker!.id]) },
    { appointee: speaker!.id },
    { appointedBy: speaker!.id },
  ])
    expect(
      storyTie(core, story(facts), speaker!.id, playerId)?.recordIds,
      JSON.stringify(facts),
    ).toContain(speaker!.id);
  // A story that names someone else, or nobody of theirs, is no tie.
  expect(
    storyTie(core, story({ winnerId: stranger!.id }), speaker!.id, playerId),
  ).toBeNull();
  expect(
    storyTie(core, story({ outIds: "not json" }), speaker!.id, playerId),
  ).toBeNull();
}, 60_000);

it("only someone a crime record names raises it, tied by the record itself (Ridgeville AL)", () => {
  setBookkeeping(false);
  const place = drawPlace(PINNED.run, PINNED.purpose);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId as PersonId;
  // A household of two the player has not met: the log keeps none of its
  // records, so only the crime record itself can tie the talk.
  const home = [...core.households.values()].find((row) => {
    const living = row.memberIds.filter((id) => {
      const person = core.people.get(id);
      return person?.alive && person.tier !== "husk";
    });
    return (
      living.length >= 2 &&
      !row.memberIds.includes(playerId) &&
      !living.some((id) => core.focusPersonIds.has(id))
    );
  });
  expect(home, `${where}: no unmet household of two`).toBeDefined();
  const [victim, housemate] = home!.memberIds.filter(
    (id) => core.people.get(id)?.alive,
  ) as PersonId[];
  director.watch(core, victim!);
  director.watch(core, housemate!);
  // An assault, as the crime engine records one: it names the one person it
  // happened to.
  const eventId = `${CRIME_EVENT}:assault:${home!.id}:${core.date}`;
  coreAPI(core).emit({
    id: eventId,
    kind: CRIME_EVENT,
    date: core.date,
    placeId: core.people.get(victim!)!.placeId,
    personIds: [victim!],
    facts: { type: "assault", householdId: home!.id },
    source: { tag: "SOURCED", asOf: core.date, citation: "test" },
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  expect(core.durableLog.has(eventId as never), `${where}: kept`).toBe(false);
  const raised = (speaker: PersonId, hearer: PersonId) =>
    subjectsBetween(core, speaker, hearer, director, {}).find(
      (row) => row.kind === "victimization",
    );
  expect(raised(victim!, housemate!)?.tie, `${where}: ${victim}`).toEqual({
    kind: "record",
    recordIds: [eventId],
  });
  expect(raised(housemate!, victim!), `${where}: ${housemate}`).toBeUndefined();
}, 60_000);
