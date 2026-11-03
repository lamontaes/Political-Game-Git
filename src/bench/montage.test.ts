/**
 * The address's montage (owner, Oct 29 02:35): one beat per part of the
 * speech, each with its picture and people from the records. In places drawn
 * from all 56: the speaker at the desk and on the colonnade, the town's own
 * people along a route, the key people named by office, and the household at
 * home (Words' address is 7 to 11 parts, each sentence carrying its level).
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addressMontage, beatKinds, partLevels } from "./montage";
import { buildBenchWorld } from "./world";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`montage:${Date.now()}`).digest("hex");

it("keys the beats to each part's role: the desk first, home last, the level between", () => {
  expect(beatKinds(["salutation"])).toEqual(["home"]);
  expect(beatKinds(["occasion", "country", "close"])).toEqual([
    "oval-desk",
    "america",
    "home",
  ]);
  expect(
    beatKinds([
      "occasion",
      "occasion",
      "country",
      "congress",
      "vice-president",
      "people",
      "states",
      "families",
      "close",
    ]),
  ).toEqual([
    "oval-desk",
    "colonnade",
    "america",
    "officials",
    "officials",
    "america",
    "officials",
    "home",
    "home",
  ]);
  expect(
    partLevels(
      [
        { level: "salutation", part: 0 },
        { level: "occasion", part: 0 },
        { level: "country", part: 1 },
      ],
      3,
    ),
  ).toEqual(["occasion", "country", "occasion"]);
});

it.each(["a", "b", "c"])(
  "stages every beat of the world's own address with its people (draw %s)",
  { timeout: 900_000 },
  (draw) => {
    setBookkeeping(false);
    const place = drawPlace(`${runSeed}:${draw}`, "montage");
    const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}, run seed ${runSeed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const story = world.director.ledger.opening!;
    // The real address of the world: one beat per part, keyed to its level.
    const parts = story.address.parts.length;
    const levels = partLevels(story.address.sentences, parts);
    const beats = addressMontage(
      world.core,
      world.playerId!,
      story.president.id,
      levels,
      20 * 60 + 30,
    );
    expect(
      beats.map((beat) => beat.kind),
      where,
    ).toEqual(beatKinds(levels));
    expect(beats.length, where).toBe(parts);
    for (const beat of beats) {
      if (beat.kind !== "america")
        expect(beat.people.length, `${where}: ${beat.kind}`).toBeGreaterThan(0);
      expect(beat.backdrop.url, where).toContain("/art/backdrops/");
    }
    // The speaker is the one at the desk (and on the colonnade when it cuts there).
    for (const kind of ["oval-desk", "colonnade"])
      for (const beat of beats.filter((row) => row.kind === kind))
        expect(
          beat.people.map((person) => person.personId),
          `${where}: ${kind}`,
        ).toContain(story.president.id);
    // Every address has the officials' parts (congress, the Vice President,
    // the states): their cutaways name them by office.
    const officials = beats.filter((beat) => beat.kind === "officials");
    expect(officials.length, where).toBeGreaterThan(0);
    for (const beat of officials)
      expect(beat.caption, where).toMatch(/\S+ \S+/);
    // Home holds the player.
    expect(
      beats.at(-1)!.people.map((person) => person.personId),
      where,
    ).toContain(world.playerId);
  },
);
