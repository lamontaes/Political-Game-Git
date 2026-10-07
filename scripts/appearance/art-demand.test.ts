import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { placeDressCode } from "../../src/presentation/dress-code";
import {
  artDemand,
  readOutfitSpecs,
  type DemandPack,
  type DemandStaging,
  type OutfitSpecs,
} from "./art-demand";

const root = resolve(import.meta.dirname, "../..");
const fixtureStaging: DemandStaging = {
  places: {
    fixture: { spots: [{ id: "fixture:0", pose: "stand", facing: "viewer" }] },
  },
};
const fixtureSpecs: OutfitSpecs = {
  feminine: [{ id: "fixture-outfit", tags: ["casual"] }],
  masculine: [{ id: "fixture-outfit", tags: ["casual"] }],
};
function coveredPack(): DemandPack {
  const builds = Object.fromEntries(
    ["lean", "average", "fuller"].map((build) => [build, { file: "body.png" }]),
  );
  const outfits = [
    {
      id: "fixture-outfit",
      parts: { top: "top" },
      builds: Object.fromEntries(
        Object.keys(builds).map((build) => [
          build,
          {
            file: "outfit.png",
            hides: "hides.png",
            regions: { top: "top.png" },
          },
        ]),
      ),
    },
  ];
  const presentation = {
    bodies: builds,
    faces: [{ id: "face", file: "face.png" }],
    hair: [{ id: "hair", front: "front.png", back: "back.png" }],
    outfits,
  };
  return {
    presentations: {
      feminine: structuredClone(presentation),
      masculine: structuredClone(presentation),
    },
    slotKindsByPose: { standing: ["stand"] },
  };
}

describe("appearance demand", () => {
  it("reads literal specs without executing the art builder", () => {
    const specs = readOutfitSpecs(
      'throw new Error("Do not execute"); const OUTFITS = { feminine: [{id: "first", tags: ["business", "formal"]}], masculine: [{id: "second", tags: ["casual"]}] };',
    );
    expect(specs.feminine).toEqual([
      { id: "first", tags: ["business", "formal"] },
    ]);
    expect(specs.masculine).toEqual([{ id: "second", tags: ["casual"] }]);
    expect(() =>
      readOutfitSpecs(
        "const OUTFITS = { feminine: getSpecs(), masculine: [] };",
      ),
    ).toThrow("expected an array");
  });

  it("produces an empty missing list for a fully covered fixture", () => {
    const demand = artDemand(
      fixtureStaging,
      coveredPack(),
      fixtureSpecs,
      () => "casual",
    );
    expect(demand.cells).toHaveLength(1 * 2 * 3 * 1);
    expect(demand.heads).toHaveLength(2 * 2 * 1);
    expect(demand.missing).toEqual([]);
    expect(demand.missingHeads).toEqual([]);
  });

  it("rejects front or standing art as coverage for other required views or poses", () => {
    for (const facing of ["left", "right", "away"] as const) {
      const staging: DemandStaging = {
        places: { fixture: { spots: [{ pose: "stand", facing }] } },
      };
      const demand = artDemand(
        staging,
        coveredPack(),
        fixtureSpecs,
        () => "casual",
      );
      expect(demand.missing).toHaveLength(6);
      expect(
        demand.missing.every(
          (cell) =>
            cell.view === (facing === "away" ? "back" : "three-quarter") &&
            cell.missing.includes("body") &&
            cell.missing.includes("outfit"),
        ),
      ).toBe(true);
      expect(demand.missingHeads).toHaveLength(4);
    }
    for (const pose of ["sit", "podium", "lean"] as const) {
      const staging: DemandStaging = {
        places: { fixture: { spots: [{ pose, facing: "viewer" }] } },
      };
      const demand = artDemand(
        staging,
        coveredPack(),
        fixtureSpecs,
        () => "casual",
      );
      expect(demand.missing).toHaveLength(6);
      expect(
        demand.missing.every(
          (cell) =>
            cell.missing.includes("body") && cell.missing.includes("outfit"),
        ),
      ).toBe(true);
    }
  });

  it("requires declared garment masks and exact head layers", () => {
    const pack = coveredPack();
    delete pack.presentations.feminine.outfits[0]!.builds!.lean!.regions!.top;
    delete pack.presentations.masculine.hair[0]!.front;
    const demand = artDemand(
      fixtureStaging,
      pack,
      fixtureSpecs,
      () => "casual",
    );
    expect(
      demand.missing.filter((cell) => cell.missing.includes("outfit")),
    ).toHaveLength(1);
    expect(
      demand.missing.filter((cell) => cell.missing.includes("hair")),
    ).toHaveLength(3);
    expect(demand.missingHeads).toEqual([
      { presentation: "masculine", view: "front", kind: "hair", id: "hair" },
    ]);
  });

  it("runs the script and independently counts the real product from the files", () => {
    const output = join(
      mkdtempSync(join(tmpdir(), "session127-art-demand-")),
      "missing.json",
    );
    const stdout = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/appearance/art-demand.ts",
        "--output",
        output,
      ],
      { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    const report = JSON.parse(readFileSync(output, "utf8")) as {
      gridSize: number;
      headGridSize: number;
      missing: Record<string, unknown>[];
      sources: { path: string; sha256: string }[];
    };
    const staging = JSON.parse(
      readFileSync(resolve(root, "art/backdrops/staging.json"), "utf8"),
    ) as DemandStaging;
    const source = readFileSync(
      resolve(root, "scripts/appearance/build-people-pack.ts"),
      "utf8",
    );
    const block = source.match(/const OUTFITS[\s\S]*?\n};/)?.[0];
    expect(block).toBeDefined();
    // Independent regex counts the builder's literal id/tag rows, not the production parser.
    const parts = block!.split("masculine: [");
    const tags = parts.map((part) =>
      [
        ...part.matchAll(
          /id: "[^"]+",\s*label: "[^"]+",\s*tags: \[([^\]]+)\]/g,
        ),
      ].map((match) =>
        [...match[1]!.matchAll(/"([^"]+)"/g)].map((tag) => tag[1]),
      ),
    );
    expect(tags).toHaveLength(2);
    expect(tags.every((entries) => entries.length > 0)).toBe(true);
    let expected = 0;
    for (const [place, stage] of Object.entries(staging.places)) {
      const dress = placeDressCode(place).dress;
      expected +=
        stage.spots.length *
        3 *
        tags.reduce(
          (sum, entries) =>
            sum + entries.filter((entry) => entry.includes(dress)).length,
          0,
        );
    }
    expect(report.gridSize).toBe(expected);
    expect(stdout.trim().split("\n")).toHaveLength(
      report.gridSize + report.headGridSize + 1,
    );
    for (const cell of report.missing)
      for (const key of [
        "place",
        "spot",
        "pose",
        "view",
        "presentation",
        "build",
        "outfit",
      ])
        expect(typeof cell[key]).toBe("string");
    for (const input of report.sources)
      expect(input.sha256).toBe(
        createHash("sha256")
          .update(readFileSync(resolve(root, input.path)))
          .digest("hex"),
      );
    expect(
      JSON.parse(
        readFileSync(resolve(root, "art/coverage/missing.json"), "utf8"),
      ),
    ).toEqual(report);
    process.stdout.write(
      `Demand product: ${report.gridSize} outfit cells; ${report.missing.length} missing.\n`,
    );
  }, 30_000);
});
