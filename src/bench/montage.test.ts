/**
 * The address's montage (owner, Oct 29 02:35): one beat per part of the
 * speech, each with its picture and people from the records. In places drawn
 * from all 56: the speaker at the desk and on the colonnade, the town's own
 * people along a route, the key people named by office, and the household at
 * home (the montage is checked on a longer address than the words session
 * writes today, which is three parts).
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addressMontage, beatKinds } from "./montage";
import { buildBenchWorld } from "./world";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`montage:${Date.now()}`).digest("hex");

it("orders the beats: the desk first, home last, the cutaways between", () => {
  expect(beatKinds(1)).toEqual(["home"]);
  expect(beatKinds(3)).toEqual(["oval-desk", "america", "home"]);
  expect(beatKinds(6)).toEqual([
    "oval-desk",
    "america",
    "colonnade",
    "officials",
    "america",
    "home",
  ]);
});

it.each(["a", "b", "c"])(
  "stages every beat of a six-part address with its people (draw %s)",
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
    const beats = addressMontage(
      world.core,
      world.playerId!,
      story.president.id,
      6,
      20 * 60 + 30,
    );
    expect(
      beats.map((beat) => beat.kind),
      where,
    ).toEqual(beatKinds(6));
    for (const beat of beats) {
      expect(beat.people.length, `${where}: ${beat.kind}`).toBeGreaterThan(0);
      expect(beat.backdrop.url, where).toContain("/art/backdrops/");
    }
    // The speaker is the one at the desk and on the colonnade.
    for (const kind of ["oval-desk", "colonnade"])
      expect(
        beats
          .find((beat) => beat.kind === kind)!
          .people.map((person) => person.personId),
        `${where}: ${kind}`,
      ).toContain(story.president.id);
    // The officials are named by office.
    expect(
      beats.find((beat) => beat.kind === "officials")!.caption,
      where,
    ).toMatch(/\S+ \S+/);
    // Home holds the player.
    expect(
      beats.at(-1)!.people.map((person) => person.personId),
      where,
    ).toContain(world.playerId);
  },
);
