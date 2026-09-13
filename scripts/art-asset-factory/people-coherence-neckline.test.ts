import fs from "node:fs";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import revision from "../../art/manifest/character_candidate_coherence_registry.json";
import sources from "../../art/manifest/character_candidate_visual4_registry.json";
import { readRasterSpans } from "./garment-fit-measure";

describe("neckline alpha authoring", () => {
  for (const r of revision.assets)
    it(`preserves RGB, dimensions, outer fit and original bytes: ${r.asset_id}`, () => {
      const source = sources.assets.find(
        (s) => s.asset_id === r.candidate_component.supersedes_asset_id,
      )!;
      const bytes = fs.readFileSync(source.final_path);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        source.hash,
      );
      const before = PNG.sync.read(bytes),
        after = PNG.sync.read(fs.readFileSync(r.final_path));
      expect([after.width, after.height]).toEqual([
        before.width,
        before.height,
      ]);
      let removed = 0;
      for (let i = 0; i < before.data.length; i += 4) {
        for (let c = 0; c < 3; c++)
          if (before.data[i + c] !== after.data[i + c])
            throw new Error("Source RGB changed");
        if (after.data[i + 3]! > before.data[i + 3]!)
          throw new Error("Alpha added");
        if (after.data[i + 3] !== before.data[i + 3]) {
          removed++;
          const y = Math.floor(i / 4 / before.width);
          expect(y).toBeLessThan(74);
        }
      }
      expect(removed).toBeGreaterThan(100);
      expect(readRasterSpans(r.final_path)).toEqual(
        readRasterSpans(source.final_path),
      );
    });
});
