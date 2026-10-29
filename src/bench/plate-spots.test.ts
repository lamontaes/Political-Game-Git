import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import heads from "./data/figure-heads.json" with { type: "json" };
import { backdropStaging, type StagingSpot } from "./staging";
import { figureOn, pickLook } from "./whole-figures";
import type { CoreState } from "../core2/types";

// Places whose spots come from a mannequin plate (art/people-rooms).
const plated = Object.entries(
  staging.places as unknown as Record<string, { spotsFrom?: string }>,
).filter(([, stage]) => stage.spotsFrom);
const place =
  process.env.PEOPLE_TEST_PLACE ??
  plated[Math.floor(Math.random() * plated.length)]![0];

interface PlateSpot {
  headTop: number;
  headX: number;
  headWidth: number;
  pose: string;
  tags: { facing: number; pose?: string };
}

describe(`spots measured from a mannequin plate at ${place}`, () => {
  const stage = backdropStaging(place)!;
  const from = (
    staging.places as unknown as Record<string, { spotsFrom: string }>
  )[place]!.spotsFrom;
  const plate = JSON.parse(readFileSync(from, "utf8")) as {
    size: [number, number];
    spots: PlateSpot[];
  };

  it("has every mannequin as a spot with its head, pose and facing", () => {
    expect(existsSync(from)).toBe(true);
    const measured = stage.spots.filter((spot) => spot.head);
    expect(measured.length).toBe(plate.spots.length);
    const [width, height] = plate.size;
    plate.spots.forEach((m, n) => {
      // The tagged pose is the art session's call (scripts/people/room-spots.ts).
      m.pose = m.tags.pose ?? m.pose;
      const spot = stage.spots.find((s) => s.id === `${place}:spot:${n}`)!;
      expect(spot.head!.top).toBeCloseTo((m.headTop / height) * 100, 1);
      expect(spot.head!.x).toBeCloseTo((m.headX / width) * 100, 1);
      expect(spot.head!.width).toBeCloseTo((m.headWidth / width) * 100, 2);
      expect(spot.pose).toBe(
        m.pose === "lectern" ||
          ((m.tags as { role?: string }).role === "speaker" && m.pose !== "sit")
          ? "podium"
          : m.pose,
      );
      const angle = Math.abs(m.tags.facing);
      expect(spot.facing).toBe(
        angle >= 135
          ? "away"
          : angle < 22.5
            ? "viewer"
            : m.tags.facing < 0
              ? "left"
              : "right",
      );
    });
  });

  it("draws a person's head where the mannequin's head is, at its width", () => {
    const core = {
      date: "2026-10-13",
      people: new Map(),
      jobs: new Map(),
      organizations: new Map(),
    } as unknown as CoreState;
    const look = pickLook(
      core,
      { id: "person:plate", birthDate: "1980-01-01", official: true },
      place,
    )!;
    for (const spot of stage.spots.filter(
      (s): s is StagingSpot & { head: NonNullable<StagingSpot["head"]> } =>
        !!s.head,
    )) {
      const whole = figureOn(look, "adult", place, stage, spot);
      // A pose is drawn where it was painted, at its own size (poses.test.ts).
      if (!whole || whole.file.startsWith("pose-")) continue;
      const name = whole.file
        .split("/")
        .pop()!
        .replace(/\.png$/, "");
      const [top, , width] = (heads.heads as Record<string, number[]>)[name]!;
      const f = whole.figure;
      const figureWidthPx = (f.widthPercent / 100) * 1672;
      const png = PNG.sync.read(
        readFileSync(`art/people-engine/v2/figures/${name}.png`),
      );
      const scale = figureWidthPx / png.width;
      expect((width! * scale * 100) / 1672).toBeCloseTo(spot.head.width, 3);
      expect(f.topPercent + (top! * scale * 100) / 941).toBeCloseTo(
        spot.head.top,
        3,
      );
    }
  });
});
