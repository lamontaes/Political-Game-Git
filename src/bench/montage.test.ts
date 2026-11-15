/**
 * The address's montage (owner, Oct 29 02:35): one beat per part of the
 * speech, each with its picture and people from the records. In places drawn
 * from all 56: the speaker at the desk and on the colonnade, the town's own
 * people along a route, the key people named by office, and the household at
 * home (Words' address is 7 to 11 parts, each sentence carrying its level).
 */
import { keyPeopleOf } from "../core2/modules/people";
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
    "state",
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
    // Each beat shows the people its part names (owner, Nov 12: "random
    // busts of people ... unless it's people that he's introducing"): an
    // "america" beat shows no one else, and every other beat but home
    // includes them (the Vice President when the part names her).
    beats.forEach((beat, at) => {
      const shown = beat.people.map((person) => person.personId);
      if (beat.kind === "america")
        for (const id of shown)
          expect(named[at], `${where}: part ${at} shows ${id}`).toContain(id);
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
    for (const beat of beats) {
      if (beat.kind === "state") {
        // The states' part names its people over the capitol. Nobody is
        // painted into the picture; since the owner's call 11 (Nov 11) the
        // people a scene names stand as busts on the strip, each with their
        // office under their name.
        for (const person of beat.people)
          expect(person.role, `${where}: ${person.name}`).toMatch(/\S/);
      } else if (beat.kind !== "america" && beat.kind !== "home")
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
    // An officials' part (an address's asks of Congress said on their own)
    // names its people by office. Since the speech outline (Nov 12) the asks
    // close the theme's paragraph, so an address may have none.
    const officials = beats.filter((beat) => beat.kind === "officials");
    for (const beat of officials)
      for (const person of beat.people)
        expect(person.role, `${where}: ${person.name}`).toMatch(/\S/);
    // The states' part names the player's governor by office over their
    // state's capitol, by the governor's own records.
    const governor = keyPeopleOf(world.core, world.playerId!).find((person) =>
      person.reasons.includes("governor"),
    );
    for (const beat of beats.filter((row) => row.kind === "state")) {
      expect(beat.backdrop.file, where).toMatch(/^state-capitol-/);
      if (!governor) continue;
      // The governor stands on the strip with the office under the name.
      expect(
        beat.people.map((person) => `${person.role} ${person.name}`),
        where,
      ).toContain(`${governor.officeTitle} ${governor.name}`);
      for (const id of governor.sourceRecordIds)
        expect(beat.sourceRecordIds, `${where}: ${id}`).toContain(id);
      expect(beat.backdrop.file, where).toContain(
        `state-capitol-${governor.stateKey!.slice(3).toLowerCase()}`,
      );
      console.log(
        `${where}: ${beat.people.map((person) => `${person.role} ${person.name}`).join(", ")} over ${beat.backdrop.file}`,
      );
    }
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
