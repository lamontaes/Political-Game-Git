/**
 * The tie rule: a Subject with no tie record to the speaker or the hearer is
 * refused whoever built it. Unit rows prove the one check (a builder the rule
 * has never seen is refused the same way); the played row proves every
 * subject a talk can raise in a built world carries one, at a place drawn
 * from all 56 (CTO, Nov 17: tests draw their place; it was pinned to
 * Ridgeville, Alabama). GOLDEN_PATH_SEED replays one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import { subjectsBetween, type Subject } from "./conversation";
import { acceptSubjects, OWN_RECORD_KINDS, storyTie } from "./subject-tie";
import type { Story } from "../core2/modules/news";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "subject-tie");

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

it(`every subject a built world's people can raise to the player carries its tie (seed ${seed})`, () => {
  setBookkeeping(false);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
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

it(`a printed story that names the speaker as its winner, a loser, the appointee or who appointed them is tied to them (seed ${seed})`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const playerId = world.playerId as PersonId;
  const player = core.people.get(playerId)!;
  const others = [...core.people.values()].filter(
    (row) =>
      row.alive &&
      row.tier !== "husk" &&
      row.id !== playerId &&
      row.householdId !== player.householdId &&
      !player.familyIds.has(row.id),
  );
  const speaker = others[0];
  // The stranger shares no household or family with the speaker or the
  // player: a story naming a speaker's own household member is rightly tied
  // to them (at Ogema, Wisconsin the first two people drawn were one household).
  const stranger = others.find(
    (row) =>
      row.id !== speaker!.id &&
      row.householdId !== speaker!.householdId &&
      !speaker!.familyIds.has(row.id) &&
      !row.familyIds.has(speaker!.id),
  );
  expect(stranger, `${place.name}: a stranger to the speaker`).toBeDefined();
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
