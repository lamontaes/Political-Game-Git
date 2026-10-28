import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { CoreState } from "../core2/types";
import heads from "./data/figure-heads.json" with { type: "json" };
import { headshotFigure, headshotPng } from "./headshot";
import { benchScene, stagePeople } from "./scene";
import { buildBenchWorld } from "./world";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`headshot:${Date.now()}`).digest("hex");

/** A drawn person's figure name and colors, read from the address the room draws them by. */
function fromUrl(figureUrl: string) {
  const url = new URL(figureUrl, "http://bench");
  return {
    name: url.pathname
      .split("/")
      .pop()!
      .replace(/\.png$/, ""),
    colors: Object.fromEntries(url.searchParams),
  };
}

describe("a person's headshot", () => {
  it(
    "is the person's own figure, from the front, with the whole head in the middle of a square",
    { timeout: 600_000 },
    () => {
      setBookkeeping(false);
      const place = drawPlace(runSeed, "headshot");
      console.log(
        `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
      );
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core as CoreState;
      const me = world.playerId!;
      // The player and the people of their home, as the room draws them.
      const household = [
        ...(core.households.get(core.people.get(me)!.householdId)?.memberIds ??
          []),
      ];
      const scene = benchScene(core, me);
      const drawn = [
        ...scene.people,
        ...stagePeople(
          core,
          scene.place,
          household
            .filter((id) => !scene.people.some((p) => p.personId === id))
            .map((id) => ({ id, name: id, reason: "household" as const })),
        ).people,
      ].filter((p) => p.figureUrl);
      expect(drawn.length).toBeGreaterThan(0);
      for (const person of drawn.slice(0, 3)) {
        const { name, colors } = fromUrl(person.figureUrl!);
        const front = headshotFigure(name);
        const [, , width] = (heads.heads as Record<string, number[]>)[front]!;
        const png = PNG.sync.read(headshotPng(name, colors));
        console.log(person.personId, name, "->", front, png.width);
        expect(png.width).toBe(png.height);
        expect(png.width).toBe(Math.round(width! * 2.4));
        const opaque = (x: number, y: number) =>
          png.data[(y * png.width + x) * 4 + 3]! > 200;
        // Clear above the head: the crown is inside the square.
        for (let x = 0; x < png.width; x++) expect(opaque(x, 0)).toBe(false);
        // The face's row: the head spans the middle, with room at both sides.
        const row = Math.round(png.height * 0.3);
        const xs = [...Array(png.width).keys()].filter((x) => opaque(x, row));
        expect(xs[0]! / png.width).toBeLessThan(0.45);
        expect(xs.at(-1)! / png.width).toBeGreaterThan(0.55);
        expect(xs[0]).toBeGreaterThan(0);
        expect(xs.at(-1)).toBeLessThan(png.width - 1);
      }
    },
  );

  it("draws a person seen from behind or turned from their front figure", () => {
    const index = heads.heads as Record<string, number[]>;
    for (const name of Object.keys(index)) {
      const front = headshotFigure(name);
      expect(index[front]).toBeDefined();
    }
  });
});
