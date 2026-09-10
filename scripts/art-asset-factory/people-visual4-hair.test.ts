import { describe, expect, it } from "vitest";
import * as PImage from "pureimage";
import fs from "node:fs";
import { contains, placement, uniformReduce } from "./people-visual4-hair";
import { hashArtFile } from "./content-hash";
import {
  validateCharacterComponentCandidates,
  type CharacterComponentManifestRecord,
} from "../../src/presentation/character-components";

describe("PEOPLE-VISUAL4 exact hair derivation", () => {
  it("refuses enlargement and uses one scale with transparent partial edge pixels", () => {
    const source = PImage.make(3, 5);
    source.data.fill(255);
    expect(() => uniformReduce(source, 1.01)).toThrow(/enlargement/);
    const reduced = uniformReduce(source, 0.5);
    expect([reduced.width, reduced.height]).toEqual([2, 3]);
    expect(reduced.data[(2 * reduced.width + 1) * 4 + 3]).toBe(64);
    expect(reduced.data[3]).toBe(255);
  });
  it("pads a hair canvas around the shared neck origin without shifting its anchor", () => {
    const head = {
      canvas: { width: 100, height: 176 },
      neck_origin: { x: 0.5, y: 0.94 },
      temples: { left: { x: 10, y: 50 }, right: { x: 90, y: 50 } },
    };
    const p = placement(
      {
        sourceWidth: 1000,
        sourceHeight: 1300,
        temples: { left: { x: 300, y: 500 }, right: { x: 700, y: 500 } },
      },
      head,
    );
    expect(p.scale).toBe(0.2);
    expect(p.origin.x).toBeGreaterThan(0);
    expect(p.origin.x).toBeLessThan(1);
    expect(p.origin.y).toBeGreaterThan(0);
    expect(p.origin.y).toBeLessThan(1);
    expect(p.origin.x * p.width + p.left).toBeCloseTo(50);
    expect(p.origin.y * p.height + p.top).toBeCloseTo(176 * 0.94);
  });
  it("only masks inside declared authored polygons and half-open rectangles", () => {
    expect(
      contains({ shape: "rectangle", x: 2, y: 4, width: 3, height: 5 }, 4, 8),
    ).toBe(true);
    expect(
      contains({ shape: "rectangle", x: 2, y: 4, width: 3, height: 5 }, 5, 8),
    ).toBe(false);
    const triangle = {
      shape: "polygon",
      points: [
        [0, 0],
        [10, 0],
        [0, 10],
      ],
    };
    expect(contains(triangle, 1, 1)).toBe(true);
    expect(contains(triangle, 9, 9)).toBe(false);
  });
  it("preserves all recovered bytes and keeps rear-only sources outside frontal pairing", () => {
    const manifest = JSON.parse(
      fs.readFileSync(
        "art/manifest/people_visual4_hair_attachments.json",
        "utf8",
      ),
    );
    expect(manifest.entries).toHaveLength(63);
    for (const source of manifest.entries)
      expect(hashArtFile(source.sourcePath)).toBe(source.sourceSha256);
    expect(
      manifest.entries
        .filter((s: { status: string }) => s.status === "excluded-front-view")
        .map((s: { reviewIndex: number }) => s.reviewIndex),
    ).toEqual([26, 35]);
  });
  it("registers only reviewed exact pairs and binds back layers to the same head and neck", () => {
    const registry = JSON.parse(
      fs.readFileSync(
        "art/manifest/character_candidate_visual4_hair_registry.json",
        "utf8",
      ),
    ).assets as CharacterComponentManifestRecord[];
    const report = JSON.parse(
      fs.readFileSync("art/qa/people-visual4-hair/pair-report.json", "utf8"),
    );
    expect(validateCharacterComponentCandidates(registry)).toEqual([]);
    expect(report.frontal_pair_count).toBe(61 * 9);
    const byId = new Map(registry.map((r) => [r.asset_id, r]));
    for (const pair of report.pairs.filter(
      (p: { pair_id?: string }) => p.pair_id,
    )) {
      expect(byId.has(`${pair.pair_id}_front`)).toBe(
        pair.status === "usable-candidate",
      );
      expect(pair.transform.scale).toBeLessThanOrEqual(1);
      for (const value of Object.values(pair.transform.origin) as number[]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
    for (const record of registry) {
      const def = record.candidate_component!;
      expect(def.compatible_head_families).toHaveLength(1);
      expect(record.runtime_release_status).toBe("unreleased");
      if (def.kind === "hair-front") expect(def.layer).toBe(50);
      if (def.paired_with) {
        const back = byId.get(def.paired_with)!.candidate_component!;
        expect(back.kind).toBe("hair-back");
        expect(back.layer).toBe(15);
        expect(back.origin).toEqual(def.origin);
        expect(back.canvas).toEqual(def.canvas);
        expect(back.compatible_head_families).toEqual(
          def.compatible_head_families,
        );
      }
    }
  });
});
