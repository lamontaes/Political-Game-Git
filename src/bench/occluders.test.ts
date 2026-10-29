import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import index from "../../art/backdrops/occluders/index.json" with { type: "json" };
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import { occluderFor, occluderPath } from "./occluders";

const places = index.places as unknown as Record<
  string,
  {
    parent: string;
    parentSha256: string;
    spots: Record<string, { file: string; widthPercent: number }>;
  }
>;
const staged = staging.places as unknown as Record<
  string,
  { spots: { id?: string }[] }
>;

describe("occluder masks baked from each place painting", () => {
  it("covers every staged place, each mask naming its parent painting by hash", () => {
    expect(Object.keys(places).sort()).toEqual(Object.keys(staged).sort());
    for (const [place, entry] of Object.entries(places)) {
      const parent = new URL(
        `../../art/backdrops/${entry.parent}`,
        import.meta.url,
      );
      expect(entry.parent.startsWith(`${place}__`)).toBe(true);
      expect(
        createHash("sha256").update(readFileSync(parent)).digest("hex"),
      ).toBe(entry.parentSha256);
    }
  });

  // A random place each run, named so a failure can be replayed.
  const names = Object.keys(places).filter(
    (place) => Object.keys(places[place]!.spots).length,
  );
  const place =
    process.env.PEOPLE_TEST_PLACE ??
    names[Math.floor(Math.random() * names.length)]!;

  it(`gives ${place}'s masks to its own spots, as alpha masks no larger than the picture`, () => {
    const ids = new Set(staged[place]!.spots.map((spot) => spot.id));
    for (const [spotId, entry] of Object.entries(places[place]!.spots)) {
      expect(ids.has(spotId)).toBe(true);
      const occluder = occluderFor(place, spotId)!;
      expect(occluder.url).toBe(`/art/backdrops/occluders/${entry.file}`);
      const file = occluderPath(entry.file);
      expect(existsSync(file)).toBe(true);
      const png = PNG.sync.read(readFileSync(file));
      expect(png.width).toBeLessThanOrEqual(1672);
      expect(png.height).toBeLessThanOrEqual(941);
      expect(occluder.leftPercent + occluder.widthPercent).toBeLessThanOrEqual(
        100.01,
      );
      expect(occluder.topPercent + occluder.heightPercent).toBeLessThanOrEqual(
        100.01,
      );
    }
  });

  it("refuses a path outside the masks", () => {
    expect(() => occluderPath("../staging.json")).toThrow();
    expect(occluderFor(place, "no-such-spot")).toBeNull();
  });
});
