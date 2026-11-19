/**
 * The address's montage (owner, Oct 29 02:35): one beat per part of the
 * speech, each with its picture and people from the records, staged where the
 * address is given (owner, Nov 17; CTO, Nov 19). In places drawn from all 56:
 * the speaker in the chamber, the key people named by office on the floor,
 * and the household at home, hearing it without the speaker among them.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addressMontage, namedInParts, beatKinds, partLevels } from "./montage";
import { buildBenchWorld } from "./world";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`montage:${Date.now()}`).digest("hex");

it("keys the beats to each part's role: the chamber first, home last, the level between", () => {
  expect(beatKinds(["salutation"])).toEqual(["home"]);
  // The Player's address at #9995 (Nov 19 09:40Z): its stance part (beat 3)
  // was on a train depot platform, a picture chosen from the subject; the
  // stance is given in the chamber, and only the close cuts home.
  expect(beatKinds(["occasion", "country", "close"])).toEqual([
    "chamber",
    "chamber",
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
    "chamber",
    "chamber",
    "chamber",
    "officials",
    "officials",
    "chamber",
    "chamber",
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
    const named = namedInParts(
      world.core,
      story.address.sentences,
      parts,
      story.president.id,
    );
    const beats = addressMontage(
      world.core,
      world.playerId!,
      story.president.id,
      levels,
      20 * 60 + 30,
      named,
    );
    // Each beat but home shows the people its part names (owner, Nov 12:
    // "random busts of people ... unless it's people that he's
    // introducing"), the Vice President when the part names her.
    beats.forEach((beat, at) => {
      if (beat.kind !== "home")
        for (const id of named[at]!)
          expect(
            beat.sourceRecordIds,
            `${where}: part ${at} names ${id}`,
          ).toContain(id);
    });
    expect(
      beats.map((beat) => beat.kind),
      where,
    ).toEqual(beatKinds(levels));
    expect(beats.length, where).toBe(parts);
    // Every beat stages where the address is given (CTO, Nov 19, from the
    // Player's beats 3 and 4): the chamber's floor, or home for a beat that
    // cuts there. Nothing is a picture chosen from the part's subject.
    for (const [at, beat] of beats.entries()) {
      expect(beat.backdrop.url, where).toContain("/art/backdrops/");
      if (beat.kind === "home") continue;
      expect(beat.backdrop.file, `${where}: part ${at}`).toMatch(
        /^us-(house|senate)-floor/,
      );
      expect(beat.people.length, `${where}: ${beat.kind}`).toBeGreaterThan(0);
    }
    // The speaker is the one in the chamber, and never at home among the
    // household (the Player's beat 4, "hold me to it").
    for (const beat of beats)
      expect(
        beat.people
          .map((person) => person.personId)
          .includes(story.president.id),
        `${where}: ${beat.kind}`,
      ).toBe(beat.kind === "chamber");
    // An officials' part (an address's asks of Congress said on their own)
    // names its people by office. Since the speech outline (Nov 12) the asks
    // close the theme's paragraph, so an address may have none.
    for (const beat of beats.filter((row) => row.kind === "officials"))
      for (const person of beat.people)
        expect(person.role, `${where}: ${person.name}`).toMatch(/\S/);
    // Home lists the people the player lives with (nobody, for someone who
    // lives alone), and never the player: the strip shows who else is there.
    const household = world.core.households.get(
      world.core.people.get(world.playerId!)!.householdId,
    );
    const home = beats.at(-1)!.people.map((person) => person.personId);
    expect(home, where).not.toContain(world.playerId);
    for (const id of home)
      expect(household?.memberIds ?? [], where).toContain(id);
  },
);
