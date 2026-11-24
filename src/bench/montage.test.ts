/**
 * The address's montage (owner, Oct 29 02:35): one beat per part of the
 * speech, each with its picture and people from the records. In places drawn
 * from all 56: the speaker in the chamber, the town's own
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

it("keys the beats to each part's role: the chamber first, home last, the level between", () => {
  expect(beatKinds(["salutation"])).toEqual(["home"]);
  // The Player's address at #9995 (Nov 19): its stance part cuts away to
  // America, and only its close is home.
  expect(beatKinds(["occasion", "country", "close"])).toEqual([
    "chamber",
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
    "chamber",
    "chamber",
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
      story.speechKind,
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
    ).toEqual(beatKinds(levels, story.speechKind));
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
    // The people the address names wear formal clothes, a jacket, wherever
    // the beat is drawn (owner, Nov 23, P10: "why is Stephen Morales not in
    // the right clothes?"); a person the bank paints with a whole top only
    // has none.
    beats.forEach((beat, at) => {
      if (beat.kind === "home") return;
      for (const person of beat.people.filter((row) =>
        named[at]!.includes(row.personId),
      ))
        expect(
          person.face.bust.layers.some((layer) => layer.includes("jacket")),
          `${where}: ${person.name} is not in a jacket in part ${at}`,
        ).toBe(true);
    });
    // The speaker is the one in the chamber.
    for (const kind of ["chamber"])
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
    // At home only the household listens: never the President among them
    // (the Player's beat 4, #9995 Nov 19 09:40Z). The America cutaway keeps
    // its own picture, the owner's montage (CTO, Nov 19 10:30Z).
    for (const beat of beats.filter((row) => row.kind === "home"))
      expect(
        beat.people.map((person) => person.personId),
        `${where}: home`,
      ).not.toContain(story.president.id);
    for (const beat of beats.filter((row) => row.kind === "america"))
      expect(beat.backdrop.file, `${where}: america`).toMatch(
        /^train-depot-platform/,
      );
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

it.each(["a", "b"])(
  "the address's middle parts cut away to America in the world's own address (draw %s)",
  { timeout: 900_000 },
  (draw) => {
    setBookkeeping(false);
    const place = drawPlace(`${runSeed}:america:${draw}`, "montage");
    const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}, run seed ${runSeed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const address = world.director.ledger.opening!.address;
    // One level per part the player sees, read from the record's sentences
    // whatever numbers their parts carry (P8, Nov 23).
    const levels = partLevels(address.sentences, address.parts.length);
    const kinds = beatKinds(levels);
    expect(kinds.length, where).toBe(address.parts.length);
    expect(
      kinds.slice(1, -1),
      `${where}: middle beats ${kinds.join(", ")}`,
    ).toContain("america");
  },
);

it("an inaugural is staged with its Oct 28 cutaways, never on the House floor (owner, Nov 23)", () => {
  const kinds = beatKinds(
    [
      "salutation",
      "occasion",
      "country",
      "people",
      "congress",
      "vice-president",
      "states",
      "close",
    ],
    "inaugural",
  );
  // The Oval Office window first, the Resolute desk, America along a route,
  // the key people named at the colonnade, the states, and home.
  expect(kinds).toEqual([
    "window",
    "desk",
    "america",
    "america",
    "colonnade",
    "colonnade",
    "state",
    "home",
  ]);
  expect(kinds).not.toContain("chamber");
  // A State of the Union is still given in the chamber.
  expect(beatKinds(["salutation", "occasion", "country", "close"])[0]).toBe(
    "chamber",
  );
});

it.each(["a", "b"])(
  "the world's inaugural address plays its cutaways with fallbacks for pictures not yet painted (draw %s)",
  { timeout: 900_000 },
  (draw) => {
    setBookkeeping(false);
    const place = drawPlace(`${runSeed}:inaugural:${draw}`, "montage");
    const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}, run seed ${runSeed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const story = world.director.ledger.opening!;
    // The game starts on Jan 20: its address is the inaugural.
    expect(story.speechKind, where).toBe("inaugural");
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
      story.speechKind,
    );
    // Beat 1 is the President at the Oval Office window (its fallback is the
    // Oval Office until the South Lawn view is painted); no beat is the House.
    expect(beats[0]!.kind, where).toBe("window");
    expect(beats[0]!.backdrop.file, where).toMatch(/^oval-office/);
    for (const beat of beats)
      expect(beat.backdrop.file, `${where}: ${beat.kind}`).not.toMatch(
        /^us-(house|senate)-floor/,
      );
    // Every part is the cutaway its level calls for: the desk for the
    // occasion, America along a route for the country, the colonnade for the
    // key people, in the order of the address.
    const expected = beatKinds(levels, "inaugural");
    expect(
      beats.map((beat) => beat.kind),
      where,
    ).toEqual(expected);
    levels.forEach((level, at) => {
      if (at === 0 || at === levels.length - 1) return;
      if (level === "country" || level === "people")
        expect(beats[at]!.kind, `${where}: part ${at}`).toBe("america");
      if (level === "congress" || level === "vice-president")
        expect(beats[at]!.kind, `${where}: part ${at}`).toBe("colonnade");
    });
    for (const beat of beats.filter((row) => row.kind === "colonnade"))
      expect(beat.backdrop.file, where).toMatch(/^white-house-colonnade/);
    for (const beat of beats.filter((row) => row.kind === "desk"))
      expect(beat.backdrop.file, where).toMatch(/^oval-/);
    // The key people a part names are on its beat as it is spoken.
    beats.forEach((beat, at) => {
      if (beat.kind === "home") return;
      for (const id of named[at]!)
        expect(
          beat.sourceRecordIds,
          `${where}: part ${at} names ${id}`,
        ).toContain(id);
    });
    // The President is the large bust on the beats that show him working.
    for (const beat of beats.filter((row) =>
      ["chamber", "window", "desk"].includes(row.kind),
    ))
      expect(
        beat.people.map((person) => person.personId),
        `${where}: ${beat.kind}`,
      ).toContain(story.president.id);
  },
);
