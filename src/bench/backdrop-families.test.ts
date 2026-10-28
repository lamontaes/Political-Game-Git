import { describe, expect, it } from "vitest";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import { hasBackdrop } from "./backdrop-places";
import { backdropFile, pictureFor } from "./scene";
import type { CoreState } from "../core2/types";

const town = (placeKey: string) =>
  ({ placeMetadata: { placeKey } }) as unknown as CoreState;
const families = scenePlaces.pictureFamilies.families;

describe("a scene's picture comes from its whole family, by town", () => {
  it("keeps one town's place the same, and gives towns different pictures of it", () => {
    for (const family of families) {
      const painted = family.filter(hasBackdrop);
      const seen = new Set<string>();
      for (let n = 0; n < 40; n++) {
        const core = town(`place-${n}`);
        const chosen = pictureFor(core, family[0]!, "public");
        expect(painted).toContain(chosen);
        expect(pictureFor(core, family[0]!, "public")).toBe(chosen);
        // Any member names the same family and the same town's choice.
        expect(pictureFor(core, family.at(-1)!, "public")).toBe(chosen);
        seen.add(chosen);
      }
      expect(seen.size).toBe(painted.length);
    }
  });

  it("at night draws a picture painted at night where the family has one", () => {
    for (const family of families) {
      const lit = family.filter(
        (place) =>
          hasBackdrop(place) && backdropFile(place, 0).variant === "night",
      );
      if (!lit.length) continue;
      for (let n = 0; n < 20; n++) {
        const chosen = pictureFor(town(`place-${n}`), family[0]!, "public", 0);
        expect(lit).toContain(chosen);
      }
    }
  });

  it("leaves a place with no family as named", () => {
    expect(pictureFor(town("x"), "oval-office", "public", 0)).toBe(
      "oval-office",
    );
  });
});
