import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { openingFrames } from "./opening";
import { looksOf } from "./scene";

// A name tag, the person drawn and the highlight are the same person (owner,
// Oct 26: "the tag reads a man but the figure is a woman"). In a drawn place's
// opening, every tag shown names a person the frame draws, by record id, in a
// figure of their recorded sex; no council member or state legislator is
// tagged; the President's tag carries no state. A
// place is drawn from all 56 (GOLDEN_PATH_SEED pins a seed).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "opening-tags");
console.log(`opening tags: seed ${seed}, ${place.name} (${place.key})`);

it(`every tag of the opening names the person drawn (${place.name}, seed ${seed})`, () => {
  const world = buildBenchWorld(place.seed, "2025-01-20", {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const opening = openingFrames(
    core,
    world.playerId!,
    director.ledger.opening!,
  );
  let tags = 0;
  for (const frame of opening.frames)
    for (const tag of frame.pointOut) {
      tags += 1;
      const here = `${tag.name} (${tag.id}) in ${frame.stage} at ${frame.place}`;
      const drawn = frame.people.find((row) => row.personId === tag.id);
      expect(drawn, `${here}: tagged but not drawn`).toBeDefined();
      const sex = looksOf(core, tag.id)?.gender;
      // The painted file names its sex: v2-01-f-medium.png, v2-01-m-heavy.png.
      const drawnSex = /-(f|m)-/.exec(drawn!.figureUrl)?.[1];
      if (sex === "male" || sex === "female")
        expect(drawnSex, `${here}: drawn ${drawnSex}, recorded ${sex}`).toBe(
          sex === "male" ? "m" : "f",
        );
      // Nobody local is pointed out: national people and the state's stage only
      // (owner, Oct 27: "You don't need your own council member").
      expect(
        ["key:own-council-member", "key:own-state-legislator"],
        here,
      ).not.toContain(tag.role);
    }
  expect(tags, "the opening pointed out nobody").toBeGreaterThan(0);
  // The President's tag is his office alone.
  expect(opening.speaker.detail).toEqual([]);
}, 300000);
