import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  validateCargoDisposition,
  type CargoDispositionLedger,
} from "../scripts/art-asset-factory/cargo-disposition";
import type { AssetManifest } from "../scripts/art-asset-factory/schemas";

const REPO_ROOT = path.resolve(__dirname, "..");

function loadJson<T>(relative: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, relative), "utf8"),
  ) as T;
}

const ledger = loadJson<CargoDispositionLedger>(
  "art/manifest/cargo_disposition.json",
);
const manifest = loadJson<AssetManifest>("art/manifest/asset_manifest.json");

function mutate(
  entryId: string,
  change: (entry: Record<string, unknown>) => void,
): CargoDispositionLedger {
  const copy = JSON.parse(JSON.stringify(ledger)) as CargoDispositionLedger;
  const entry = copy.entries.find(
    (candidate) => candidate.entry_id === entryId,
  );
  if (!entry) throw new Error(`No cargo entry '${entryId}'.`);
  change(entry as unknown as Record<string, unknown>);
  return copy;
}

describe("cargo disposition ledger", () => {
  it("validates against the real asset manifest", () => {
    expect(validateCargoDisposition(ledger, manifest)).toEqual([]);
  });

  it("dispositions every superseded branch and every downloaded pack", () => {
    const sources = new Set(ledger.entries.map((entry) => entry.source_id));
    expect(sources).toEqual(
      new Set([
        "pr-48",
        "pr-74",
        "pr-80",
        "pack-universal-base-characters",
        "pack-universal-animation-library",
        "pack-office-cubicle-set",
      ]),
    );
    for (const source of ledger.sources) {
      expect(source.reference.length).toBeGreaterThan(0);
    }
  });

  it("re-homes the only two masters that meet the dimension contract", () => {
    const bodies = ledger.entries.find(
      (entry) => entry.entry_id === "pr48-body-masters",
    )!;
    expect(bodies.disposition).toBe("re-homed");
    expect(bodies.verified_by).toBe("measured-in-repository");
    expect(bodies.rehomed_asset_ids).toHaveLength(2);
    for (const assetId of bodies.rehomed_asset_ids!) {
      const asset = manifest.assets.find(
        (candidate) => candidate.asset_id === assetId,
      );
      expect(asset).toBeDefined();
      // A source master makes no runtime claim.
      expect(asset!.runtime_release_status).toBe("unreleased");
      expect(asset!.final_path).toMatch(/^art\/references\/masters\//);
    }
  });

  it("keeps every re-homed master out of the released runtime set", () => {
    const rehomed = new Set(
      ledger.entries
        .filter((entry) => entry.disposition === "re-homed")
        .flatMap((entry) => entry.rehomed_asset_ids ?? []),
    );
    const masters = [...rehomed].filter((assetId) =>
      assetId.startsWith("pg_master_"),
    );
    expect(masters.length).toBe(25);
    for (const assetId of masters) {
      const asset = manifest.assets.find(
        (candidate) => candidate.asset_id === assetId,
      )!;
      expect(asset.runtime_release_status).toBe("unreleased");
    }
  });

  it("carries no demographic token into a body, head or hair identifier", () => {
    // Scoped to the classes where such a word would be a claim about a person.
    // A shoe may be black and a shirt may be white; a head may not.
    const forbidden =
      /(^|[_/-])(black|white|asian|caucasian|latino|hispanic|male|female)([_/-]|\.|$)/i;
    const personClasses =
      /^(pg_master_(body|head|hair)|dev(_g2)?_(body|head|hair))/;
    const subjects = manifest.assets.filter(
      (asset) =>
        personClasses.test(asset.asset_id) ||
        ["body", "head", "hair-front", "hair-back", "facial-hair"].includes(
          asset.component?.kind ?? "",
        ),
    );
    expect(subjects.length).toBeGreaterThan(20);
    for (const asset of subjects) {
      expect(asset.asset_id).not.toMatch(forbidden);
      if (asset.final_path) expect(asset.final_path).not.toMatch(forbidden);
    }
  });

  it("refuses to re-home anything that was never measured here", () => {
    const overclaimed = mutate("pack-office-cubicle-set", (entry) => {
      entry.disposition = "re-homed";
      entry.rehomed_asset_ids = ["pg_master_head_01_bald_neutral"];
    });
    const errors = validateCargoDisposition(overclaimed, manifest).join("\n");
    expect(errors).toContain("Nothing is re-homed on metadata alone");
  });

  it("refuses a re-homed claim naming an asset the manifest does not hold", () => {
    const invented = mutate("pr48-body-masters", (entry) => {
      entry.rehomed_asset_ids = ["pg_master_body_that_does_not_exist"];
    });
    expect(validateCargoDisposition(invented, manifest).join("\n")).toContain(
      "which the asset manifest does not contain",
    );
  });

  it("requires an unverified entry to say how it would be settled", () => {
    // Every pack in the ledger has now actually been opened, so an unsettled
    // entry has to be constructed: drop the evidence level back to
    // metadata-only and the command becomes owed again.
    const silent = mutate("pack-universal-base-characters", (entry) => {
      entry.verified_by = "metadata-only";
      delete entry.verify_command;
    });
    expect(validateCargoDisposition(silent, manifest).join("\n")).toContain(
      "must name the 'verify_command' that would settle it",
    );
  });

  it("treats an archive somebody opened as settled, wherever the bytes live", () => {
    // An inspected archive is not measured HERE and never will be — the zip is
    // in Drive. Asking it for the command that would settle it would be asking
    // how to re-answer a question that has an answer.
    const inspected = ledger.entries.filter(
      (entry) => entry.verified_by === "inspected-outside-repository",
    );
    expect(inspected.length).toBeGreaterThanOrEqual(3);
    for (const entry of inspected) {
      expect(entry.verify_command, entry.entry_id).toBeUndefined();
      expect(entry.disposition, entry.entry_id).not.toBe(
        "pending-verification",
      );
    }
    expect(validateCargoDisposition(ledger, manifest)).toEqual([]);
  });

  it("checks a code-cargo re-home against the repository, not against prose", () => {
    const invented = mutate("pr80-authoring-contracts", (entry) => {
      entry.rehomed_modules = ["src/authoring/not-a-real-module.ts"];
    });
    expect(validateCargoDisposition(invented, manifest).join("\n")).toContain(
      "claims re-homed module 'src/authoring/not-a-real-module.ts', which is not in the repository",
    );
  });

  it("refuses a re-home that names neither an asset nor a module", () => {
    const empty = mutate("pr80-authoring-contracts", (entry) => {
      delete entry.rehomed_modules;
    });
    expect(validateCargoDisposition(empty, manifest).join("\n")).toContain(
      "must name the manifest assets or the repository modules it became",
    );
  });

  it("requires every disposition to carry a reason", () => {
    const bare = mutate("pr48-normalized-derivatives", (entry) => {
      entry.reason = "";
    });
    expect(validateCargoDisposition(bare, manifest).join("\n")).toContain(
      "A disposition without one is an assertion, not a decision",
    );
  });

  it("holds no external pack open as usable coverage", () => {
    const packs = ledger.entries.filter((entry) =>
      entry.source_id.startsWith("pack-"),
    );
    expect(packs.length).toBe(3);
    for (const pack of packs) {
      expect(["archive", "pending-verification", "rejected"]).toContain(
        pack.disposition,
      );
      expect(pack.rehomed_asset_ids ?? []).toEqual([]);
    }
  });
});
