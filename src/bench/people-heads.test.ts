// @vitest-environment node
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { bustOf, type FigurePerson } from "./whole-figures";
import { buildBenchWorld, NoPlayerHereError } from "./world";

// The people on every screen draw their own head (CTO, #9995, Nov 18: "every
// person on a screen drawing their own head shape and shade"). The one reader,
// `bustOf`, gives a person a head shape and a skin shade from their record's
// appearance seed and their family's origin, the same on every screen, so a
// town is not five identical heads.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const fileOf = (url: string) => url.slice(url.lastIndexOf("/") + 1);

describe("the heads of a town's people", () => {
  it("vary in shape and shade, and are the same every time a person is drawn", () => {
    setBookkeeping(false);
    const passed: string[] = [];
    for (let draw = 0; draw < 6; draw++) {
      const place = drawPlace(draw === 0 ? seed : `${seed}:${draw}`, "heads");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      let core;
      try {
        ({ core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        }));
      } catch (error) {
        if (!(error instanceof NoPlayerHereError)) throw error;
        passed.push(`${where}: no player can live here`);
        continue;
      }
      const heads = new Map<string, string>();
      for (const [id, person] of core.people) {
        const who: FigurePerson = {
          id,
          birthDate: person.birthDate,
          ...(person.looks?.gender ? { gender: person.looks.gender } : {}),
          ...(person.looks?.origin ? { origin: person.looks.origin } : {}),
          official: false,
          seed: `${core.seed}:${person.looks?.seed ?? id}`,
        };
        const bust = bustOf(core, who, "street");
        if (!bust) continue; // a child has no bust
        heads.set(id, fileOf(bust.layers[0]!));
        // Drawn again, the same person is the same head.
        expect(fileOf(bustOf(core, who, "street")!.layers[0]!), id).toBe(
          heads.get(id),
        );
      }
      const files = [...heads.values()];
      const shapes = new Set(
        files.map(
          (f) =>
            /^head-(round|long|square|narrow|heart)-/.exec(f)?.[1] ??
            "standard",
        ),
      );
      const shades = new Set(
        files.map(
          (f) =>
            /-(fair|light|olive|medium|brown|dark)-(adult|older)\.png$/.exec(
              f,
            )?.[1],
        ),
      );
      if (files.length < 30) {
        passed.push(`${where}: only ${files.length} people with busts`);
        continue;
      }
      expect(
        shapes.size,
        `${where}: head shapes ${[...shapes]}`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        shades.size,
        `${where}: skin shades ${[...shades]}`,
      ).toBeGreaterThanOrEqual(3);
      return;
    }
    throw new Error(
      `No drawn place had a town to check (seed ${seed}):\n${passed.join("\n")}`,
    );
  });
});
