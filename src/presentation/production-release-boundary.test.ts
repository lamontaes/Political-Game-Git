import { describe, expect, it } from "vitest";

import assetManifest from "../../art/manifest/asset_manifest.json";
import bodyDispositions from "../../art/qa/p71/source_intake_dispositions.json";
import despillReport from "../../art/qa/p76/edge_despill_report.json";
import {
  PRODUCTION_CHARACTER_LIBRARY,
  CANDIDATE_REVIEW_CHARACTER_LIBRARY,
} from "./visual-integration";
import {
  evaluateMasterDimensions,
  STANDING_BODY_MASTER_MINIMUM,
  SEATED_BODY_MASTER_MINIMUM,
} from "./component-masters";
import {
  validateCharacterComponentCandidates,
  type CharacterComponentManifestRecord,
} from "./character-components";

/**
 * The production-release boundary, asserted as data (Packet 92B).
 *
 * The owner can see generated character art — the eight-pose adult feminine
 * body family, the twelve heads, the twelve footwear, the pg-modular masters —
 * yet no arbitrary person composes into any released room. This suite proves
 * that is CORRECT and truthful rather than a missed intake step, by locking
 * three separate claims apart so a future change cannot blur them:
 *
 *   A. the source/generated image exists;
 *   B. the image has passed mechanical intake/QA;
 *   C. the image is released and eligible for production runtime composition.
 *
 * If any of these assertions ever fails, either art was released without the
 * human gate it needs, or the runtime stopped failing closed. Both are exactly
 * the failures the modular-person contract exists to prevent.
 */

const assets =
  assetManifest.assets as readonly CharacterComponentManifestRecord[];

interface DispositionCell {
  readonly assetId: string;
  readonly exportSize: string;
  readonly disposition: string;
}
interface DispositionSheet {
  readonly master: string;
  readonly cells: readonly DispositionCell[];
}
const sheets = (
  bodyDispositions as unknown as {
    readonly sheets: Record<string, DispositionSheet>;
  }
).sheets;

interface DespillEntry {
  readonly assetId: string;
  readonly disposition: string;
}
const despillEntries = (
  despillReport as unknown as { readonly entries: readonly DespillEntry[] }
).entries;

function dimsOf(exportSize: string): { width: number; height: number } {
  const [width, height] = exportSize.split("x").map((value) => Number(value));
  return { width: width ?? 0, height: height ?? 0 };
}

describe("C — production runtime composition is released art only", () => {
  const components = [...PRODUCTION_CHARACTER_LIBRARY.components.values()];

  it("releases no PRODUCTION component of any kind, so people fail closed", () => {
    // Every runtime-released component is a development fixture. The instant a
    // real production part is released this flips, and it must flip through the
    // deliberate promotion + human-acceptance gate, not by accident.
    const releasedProduction = components.filter(
      (component) => component.released && !component.fixture,
    );
    expect(releasedProduction).toEqual([]);
  });

  it("releases no production BODY, which is why no arbitrary person can be drawn", () => {
    const releasedBodies = components.filter(
      (component) =>
        component.released &&
        !component.fixture &&
        component.definition.kind === "body",
    );
    expect(releasedBodies).toEqual([]);
  });

  it("keeps the runtime catalog at development generation 2", () => {
    expect(PRODUCTION_CHARACTER_LIBRARY.catalogGeneration).toBe(2);
    for (const component of components) {
      if (component.released) expect(component.fixture).toBe(true);
    }
  });

  it("never lets a banked candidate or master reach the production library", () => {
    for (const id of CANDIDATE_REVIEW_CHARACTER_LIBRARY.components.keys()) {
      expect(PRODUCTION_CHARACTER_LIBRARY.components.has(id)).toBe(false);
    }
    // The review surface must still be able to show the banked art for the
    // human accept/reject decision — otherwise nothing can ever be promoted.
    expect(CANDIDATE_REVIEW_CHARACTER_LIBRARY.components.size).toBeGreaterThan(
      0,
    );
  });
});

describe("manifest — released is a development-fixture claim, never a candidate one", () => {
  it("marks every runtime-released character component a development fixture", () => {
    for (const record of assets) {
      if (
        record.asset_type === "character-component" &&
        record.runtime_release_status === "released"
      ) {
        expect(record.availability).toBe("development-fixture");
      }
    }
  });

  it("leaves every production candidate and master unreleased", () => {
    for (const record of assets) {
      if (
        record.asset_type === "character-component-candidate" ||
        record.asset_type === "character-component-master"
      ) {
        expect(record.runtime_release_status).toBe("unreleased");
      }
    }
  });

  it("keeps the banked candidates well-formed (unreleased, no generation)", () => {
    expect(validateCharacterComponentCandidates(assets)).toEqual([]);
  });
});

describe("B — the feminine body family passed intake but is not shippable art", () => {
  const bodies = sheets.bodyPose.cells;

  it("chopped and dispositioned all eight poses REVISE for the green contour", () => {
    expect(bodies).toHaveLength(8);
    for (const cell of bodies) expect(cell.disposition).toBe("REVISE");
  });

  it("salvaged all eight by deterministic despill without moving the alpha", () => {
    expect(despillEntries).toHaveLength(8);
    for (const entry of despillEntries) {
      expect(entry.disposition).toBe("SALVAGEABLE BY DETERMINISTIC DESPILL");
    }
  });

  it("is below the production body-master floor on every cell, so it cannot promote", () => {
    // The smaller of the two body floors is the seated width, 1530px. Every
    // cell off the 5056x3392 sheet is narrower than that, so a green-clean
    // re-export at the SAME sheet resolution still would not pass the floor:
    // the sheet itself has to be regenerated larger. Undersized masters are
    // rejected, never enlarged.
    const floor = Math.min(
      STANDING_BODY_MASTER_MINIMUM.minimumWidth ?? Infinity,
      SEATED_BODY_MASTER_MINIMUM.minimumWidth ?? Infinity,
    );
    for (const cell of bodies) {
      expect(dimsOf(cell.exportSize).width).toBeLessThan(floor);
    }

    const standing = bodies.find((cell) =>
      cell.assetId.includes("standing_neutral_a"),
    );
    expect(standing).toBeDefined();
    const verdict = evaluateMasterDimensions(
      "body",
      dimsOf(standing!.exportSize),
      "standing-neutral",
    );
    expect(verdict.accepted).toBe(false);
    expect(verdict.requiredUpscaleFactor).toBeGreaterThan(1);
  });
});

describe("B — heads pass the chop but are not production head masters", () => {
  const heads = sheets.headDiversity.cells;

  it("dispositioned all twelve heads PASS", () => {
    expect(heads).toHaveLength(12);
    for (const cell of heads) expect(cell.disposition).toBe("PASS");
  });

  it("is under the 1024px square head-master requirement on every head", () => {
    for (const cell of heads) {
      const { width, height } = dimsOf(cell.exportSize);
      const isSquare = Math.abs(width / height - 1) <= 0.01;
      // A production head master is >=1024px and square; these are narrow and
      // taller than wide, so a square re-frame is required before promotion.
      expect(width < 1024 || !isSquare).toBe(true);
    }
  });
});

describe("B — footwear is the right size but the wrong viewpoint", () => {
  const footwear = sheets.footwear.cells;

  it("dispositioned all twelve footwear REVISE", () => {
    expect(footwear).toHaveLength(12);
    for (const cell of footwear) expect(cell.disposition).toBe("REVISE");
  });

  it("clears the 1024px long-edge floor, so the gap is viewpoint not resolution", () => {
    for (const cell of footwear) {
      const { width, height } = dimsOf(cell.exportSize);
      expect(Math.max(width, height)).toBeGreaterThanOrEqual(1024);
    }
  });
});
