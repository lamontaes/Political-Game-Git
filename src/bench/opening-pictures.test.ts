import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { openingFrames } from "./opening";
import { backdropStaging } from "./staging";

// The opening opens on the picture the address is given in (owner, Oct 14,
// 2026): the State of the Union on the House floor, and (until the inauguration
// record carries a venue) an inauguration there too, the President at the
// podium. The first frame is the President's stage; each world is built in a place drawn from all 56 on a fresh seed.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

const presidentFrame = (date: string) => {
  const place = drawPlace(`${seed}:${date}`, "opening-pictures");
  const world = buildBenchWorld(place.seed, date, {
    twoLevel: true,
    placeKey: place.key,
  });
  const story = world.director.ledger.opening!;
  const frame = openingFrames(world.core, world.playerId!, story).frames.find(
    (row) => row.stage === "president",
  );
  return { where: `${place.name}, seed ${seed}, ${date}`, story, frame };
};

describe("the opening's first picture", () => {
  it("puts the State of the Union on the House floor", () => {
    const { where, story, frame } = presidentFrame("2026-02-10");
    expect(story.speechKind, where).toBe("state-of-the-union");
    expect(frame?.place, where).toBe("us-house-floor");
    // The President speaks from the podium, in the lectern pose, with the
    // Vice President and the others seated behind (owner, Oct 26).
    const podium = backdropStaging("us-house-floor")!.spots.find(
      (spot) => spot.pose === "podium",
    )!;
    const speaker = frame?.people.find(
      (row) => row.personId === story.president.id,
    );
    expect(speaker?.spotId, where).toBe(podium.id);
    expect(frame?.people.length, where).toBeGreaterThan(1);
  }, 600_000);

  it("stages an inauguration at the House rostrum until its record carries a venue", () => {
    // SG-PLAY-opening-venue-has-no-inauguration-record
    const { where, story, frame } = presidentFrame("2025-01-20");
    expect(story.speechKind, where).toBe("inaugural");
    expect(frame?.place, where).toBe("us-house-floor");
    const podium = backdropStaging("us-house-floor")!.spots.find(
      (spot) => spot.pose === "podium",
    )!;
    expect(
      frame?.people.find((row) => row.personId === story.president.id)?.spotId,
      where,
    ).toBe(podium.id);
  }, 600_000);
});
