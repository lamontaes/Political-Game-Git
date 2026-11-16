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
import { buildBenchWorld } from "../bench/world";
import { subjectsBetween, type Subject } from "./conversation";
import { acceptSubjects, OWN_RECORD_KINDS } from "./subject-tie";

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
