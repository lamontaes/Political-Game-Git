import crypto from "crypto";
import fs from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { serializeAssetBankManifest } from "../../src/authoring/asset-bank";
import { toCanonicalJson } from "../../src/authoring/canonical-json";
import { runEnvironmentIntake } from "./environment-intake";

/**
 * AX-92B1 — the two existing environment sources, asserted as data.
 *
 * The owner generated a park pavilion and a press briefing room, and could not
 * reach either in play. This suite locks down what the intake slice actually
 * did and, just as importantly, what it did NOT do, so a later change cannot
 * quietly turn "measured and registered" into "released" or "reachable".
 *
 * Four claims are held apart:
 *
 *   A. the source bytes are unchanged, and are the bytes that were measured;
 *   B. intake regenerates byte-identically from the committed request;
 *   C. candidate registration is not production release;
 *   D. no player-facing surface resolves either asset.
 *
 * If C or D ever fails, a picture reached a player through a mechanical step
 * rather than through the human gates the release review names.
 */

const REPO_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");

const REQUEST_PATH = "art/intake/environment-batch-ax-92b1.request.json";
const REPORT_PATH = "art/intake/ax-92b1/environment-intake-report.json";
const BANK_PATH = "art/intake/ax-92b1/asset-bank.json";
const OBSERVED_BANK_PATH = "art/intake/ax-92b1/asset-bank-observed.json";

/**
 * The exact bytes AX-92B1 consumed. These hashes are the same values the P95
 * recent-Drive sweep recorded for Drive 1SVG_lRUgoMJTmyreTsmhLJB6roJitFr1 and
 * 1SPvoi-0L7T4mK156yFg1dpOW82ggb4J6, and their byte counts are the file sizes
 * live Drive reports for those ids.
 */
const SOURCES = [
  {
    assetId: "env_park_community_pavilion_5504x3072_01",
    driveId: "1SVG_lRUgoMJTmyreTsmhLJB6roJitFr1",
    file: "art/references/candidates/recent-drive-sweep/source-images/IMG_5204.JPG",
    sha256: "935ce236f421786061677da8f017fc775fab50e47693d7f611c916920f22f59f",
    byteLength: 3_464_125,
  },
  {
    assetId: "env_press_briefing_room_5504x3072_01",
    driveId: "1SPvoi-0L7T4mK156yFg1dpOW82ggb4J6",
    file: "art/references/candidates/recent-drive-sweep/source-images/IMG_5202.JPG",
    sha256: "e16e1b0b0c5cd93a6254ac1b1145f5439351a4e6b8530d739844bd62e973d065",
    byteLength: 3_068_797,
  },
] as const;

interface IntakeRecord {
  readonly assetId: string;
  readonly path: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly format: string;
  readonly contentHash: string;
  readonly byteLength: number;
  readonly nativeDetailState: string;
  readonly nativeDetailWidth: number | null;
  readonly rightsStatus: string;
  readonly disposition: string;
}

const report = JSON.parse(read(REPORT_PATH)) as {
  readonly records: readonly IntakeRecord[];
};

const recordFor = (assetId: string): IntakeRecord => {
  const found = report.records.find((entry) => entry.assetId === assetId);
  if (!found) throw new Error(`Intake report has no record for '${assetId}'.`);
  return found;
};

describe("AX-92B1 A. the source bytes are unchanged", () => {
  it.each(SOURCES)(
    "$assetId preserves the bytes swept from Drive $driveId",
    (source) => {
      const bytes = fs.readFileSync(path.join(REPO_ROOT, source.file));
      expect(bytes.length).toBe(source.byteLength);
      expect(crypto.createHash("sha256").update(bytes).digest("hex")).toBe(
        source.sha256,
      );
    },
  );

  it.each(SOURCES)(
    "$assetId was measured from those exact bytes, as a JPEG at 5504x3072",
    (source) => {
      const record = recordFor(source.assetId);
      expect(record.path).toBe(source.file);
      expect(record.contentHash).toBe(source.sha256);
      expect(record.byteLength).toBe(source.byteLength);
      expect(record.format).toBe("jpg");
      expect(record.width).toBe(5504);
      expect(record.height).toBe(3072);
    },
  );

  it.each(SOURCES)(
    "$assetId still declares unknown rights and unverified native detail",
    (source) => {
      const record = recordFor(source.assetId);
      // Neither may drift to a confident value without a human saying so.
      expect(record.rightsStatus).toBe("unknown");
      expect(record.nativeDetailState).toBe("unverified");
      expect(record.nativeDetailWidth).toBeNull();
    },
  );
});

describe("AX-92B1 B. intake regenerates deterministically", () => {
  it("reproduces the committed report and asset bank byte-for-byte", () => {
    const result = runEnvironmentIntake(
      path.join(REPO_ROOT, REQUEST_PATH),
      REPO_ROOT,
    );
    expect(toCanonicalJson(result.report)).toBe(read(REPORT_PATH));
    expect(serializeAssetBankManifest(result.assetBank)).toBe(read(BANK_PATH));
  });

  it("adopts exactly the two declared candidates and nothing else", () => {
    const result = runEnvironmentIntake(
      path.join(REPO_ROOT, REQUEST_PATH),
      REPO_ROOT,
    );
    expect(result.report.records.map((entry) => entry.assetId)).toEqual(
      [...SOURCES].map((source) => source.assetId).sort(),
    );
    expect(result.undeclaredFiles).toEqual([]);
  });
});

describe("AX-92B1 C. candidate registration is not release", () => {
  const manifest = JSON.parse(read("art/manifest/asset_manifest.json")) as {
    readonly assets: readonly {
      readonly asset_id: string;
      readonly raster_tiers?: readonly { readonly path: string }[];
    }[];
  };

  it.each(SOURCES)(
    "$assetId is absent from the production asset manifest",
    (source) => {
      expect(
        manifest.assets.some((asset) => asset.asset_id === source.assetId),
      ).toBe(false);
    },
  );

  it.each(SOURCES)(
    "no released raster tier is derived from $assetId's source file",
    (source) => {
      const tierPaths = manifest.assets.flatMap((asset) =>
        (asset.raster_tiers ?? []).map((tier) => tier.path),
      );
      expect(tierPaths).not.toContain(source.file);
    },
  );

  it("leaves every bank judgement that needs a human unassessed", () => {
    for (const bankPath of [BANK_PATH, OBSERVED_BANK_PATH]) {
      const bank = JSON.parse(read(bankPath)) as {
        readonly entries: readonly Record<string, unknown>[];
      };
      expect(bank.entries).toHaveLength(2);
      for (const entry of bank.entries) {
        // `production` here would mean released cargo. Undecided is the truth.
        expect(entry.disposition).toBe("undecided");
        expect(entry.styleFamilyStatus).toBe("unassessed");
        expect(entry.heroSlot).toBe("unassessed");
        // Geometry needs the floor calibration a human owns; it is not guessed.
        expect(entry.floorUsable).toBe("unassessed");
        expect(entry.seatUsable).toBe("unassessed");
        expect(entry.uiSafeRegions).toEqual([]);
      }
    }
  });

  it("never records an approver for either candidate", () => {
    const request = JSON.parse(read(REQUEST_PATH)) as {
      readonly candidates: readonly Record<string, unknown>[];
    };
    for (const candidate of request.candidates) {
      expect(Object.hasOwn(candidate, "approved_by")).toBe(false);
    }
    for (const bankPath of [BANK_PATH, OBSERVED_BANK_PATH]) {
      const bank = JSON.parse(read(bankPath)) as {
        readonly entries: readonly { readonly assessedBy: string }[];
      };
      for (const entry of bank.entries) {
        expect(entry.assessedBy).not.toBe("human-review");
      }
    }
  });
});

describe("AX-92B1 D. neither room is reachable in normal play", () => {
  /**
   * Read as text rather than imported, because the claim is about what the
   * runtime source says, and an import would only prove the module loads.
   */
  const runtimeSurfaces = [
    "src/presentation/scene-registry.ts",
    "src/presentation/scene-consumers.ts",
    "src/presentation/production-office.ts",
    ...fs
      .readdirSync(path.join(REPO_ROOT, "src/environment/scenes"))
      .map((name) => `src/environment/scenes/${name}`),
  ];

  it.each(SOURCES)(
    "no runtime scene, registry entry or consumer names $assetId",
    (source) => {
      for (const surface of runtimeSurfaces) {
        expect(read(surface)).not.toContain(source.assetId);
      }
    },
  );

  it.each(SOURCES)(
    "no runtime surface reaches for $assetId's source bytes",
    (source) => {
      for (const surface of runtimeSurfaces) {
        expect(read(surface)).not.toContain(path.basename(source.file));
      }
    },
  );
});
