import { describe, expect, it } from "vitest";

import bankedMasterInventory from "../../art/qa/banked_master_inventory.json";
import { summarizeAssetBank, validateAssetBankManifest } from "./asset-bank";
import { PRODUCTION_PLATE_ASSET_BANK } from "./fixtures/production-asset-bank";
import { MODULAR_PERSON_GENERATION_QUEUE } from "./fixtures/generation-queue";
import {
  STATUSES_NEEDING_GENERATION,
  summarizeGenerationQueue,
  validateGenerationQueue,
  type GenerationQueueEntry,
} from "./generation-queue";

describe("the approved environment library, as a bank", () => {
  it("validates, and disposes nothing to production", () => {
    const result = validateAssetBankManifest(PRODUCTION_PLATE_ASSET_BANK);
    expect(result.findings).toEqual([]);
    expect(result.valid).toBe(true);

    for (const entry of PRODUCTION_PLATE_ASSET_BANK.entries) {
      // `production-while-unassessed` is a validation error, and the questions
      // that decide production need eyes on pixels at size. Nobody has looked.
      expect(entry.disposition, entry.entryId).not.toBe("production");
    }
  });

  it("banks eight files: six approved masters and two that are not what they claim", () => {
    expect(PRODUCTION_PLATE_ASSET_BANK.entries).toHaveLength(8);
    expect(summarizeAssetBank(PRODUCTION_PLATE_ASSET_BANK)).toEqual({
      production: 0,
      reference: 1,
      reject: 2,
      undecided: 5,
    });

    const rejected = PRODUCTION_PLATE_ASSET_BANK.entries.filter(
      (entry) => entry.disposition === "reject",
    );
    expect(rejected.map((entry) => entry.entryId)).toEqual([
      "apartment-ordinary-02-upscale-mislabelled",
      "apartment-settled-03-upscale-mislabelled",
    ]);
    for (const entry of rejected) {
      // A JPEG bitstream in a .png container. Every tool opens it, which is
      // what makes the defect quiet enough to reach a raster ladder.
      expect(entry.notes?.[0], entry.entryId).toContain("JPEG");
      expect(entry.duplicateOf, entry.entryId).toBeTruthy();
      expect(entry.artifactFlags, entry.entryId).toContain("compression-mush");
    }
  });

  it("marks the one plate with people painted into it", () => {
    const withPeople = PRODUCTION_PLATE_ASSET_BANK.entries.filter(
      (entry) => entry.bakedPeople === "yes",
    );
    expect(withPeople.map((entry) => entry.entryId)).toEqual([
      "civic-community-meeting-hall",
    ]);
    // It is also the only hero plate, and a hero claim needs a reason.
    expect(withPeople[0]!.heroSlot).toBe("yes");
    expect(withPeople[0]!.heroJustification).toBeTruthy();
  });

  it("leaves the style judgement unassessed for every plate nobody has seen", () => {
    for (const entry of PRODUCTION_PLATE_ASSET_BANK.entries) {
      if (entry.entryId === "office-council-staff-lexington") {
        // The one plate whose bytes are in this repository.
        expect(entry.styleFamilyStatus).toBe("in-family");
        continue;
      }
      expect(entry.styleFamilyStatus, entry.entryId).toBe("unassessed");
    }
  });
});

describe("the remaining generation queue", () => {
  it("validates", () => {
    const result = validateGenerationQueue(MODULAR_PERSON_GENERATION_QUEUE);
    expect(result.findings).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("says where the art is whenever it is anywhere", () => {
    for (const entry of MODULAR_PERSON_GENERATION_QUEUE) {
      if (entry.status === "missing") {
        expect(entry.location, entry.entryId).toBeUndefined();
      } else {
        expect(entry.location, entry.entryId).toBeTruthy();
      }
    }
  });

  it("separates what must be made from what already exists", () => {
    const summary = summarizeGenerationQueue(MODULAR_PERSON_GENERATION_QUEUE);
    expect(summary.entries).toBe(13);
    expect(summary.assets).toBe(115);

    // The point of the queue: most of what is wanted exists somewhere, so the
    // number of things to draw is much smaller than the number of things
    // missing from a finished person.
    expect(summary.byStatus.missing).toBe(58);
    expect(summary.byStatus["in-drive-below-standard"]).toBe(13);
    expect(summary.byStatus["in-drive-usable"]).toBe(2);
    expect(summary.byStatus["banked-here"]).toBe(35);
    expect(summary.byStatus["dev-fixture-only"]).toBe(7);
    expect(summary.toGenerate).toBe(78);
    expect(summary.alreadyExists).toBe(37);
  });

  it("quantifies every shortfall, so a re-render has a target", () => {
    const short = MODULAR_PERSON_GENERATION_QUEUE.filter(
      (entry) => entry.status === "in-drive-below-standard",
    );
    expect(short).toHaveLength(3);
    for (const entry of short) {
      expect(entry.shortfall, entry.entryId).toBeTruthy();
      // A measured number, not an impression.
      expect(entry.shortfall, entry.entryId).toMatch(/\d{3,4}/);
    }
  });

  it("does not call the seated body missing, because it is not", () => {
    const seated = MODULAR_PERSON_GENERATION_QUEUE.find(
      (entry) => entry.entryId === "body-seated-master",
    )!;
    expect(seated.status).toBe("in-drive-below-standard");
    expect(seated.shortfall).toContain("1216");
    expect(seated.shortfall).toContain("1530");

    // And the garments that would sit on it say what they are waiting for.
    const garments = MODULAR_PERSON_GENERATION_QUEUE.find(
      (entry) => entry.entryId === "garment-seated-derivatives",
    )!;
    expect(garments.blockedBy).toBe("body-seated-master");
  });

  it("agrees with the measurements it cites", () => {
    const inventory = bankedMasterInventory as {
      readonly passCount: number;
      readonly failCount: number;
      readonly entries: readonly {
        readonly file: string;
        readonly width: number | null;
        readonly verdict: string;
      }[];
    };
    expect(inventory.passCount).toBe(2);
    expect(inventory.failCount).toBe(12);

    // The two passing files are the pair the queue says to collect.
    const usable = MODULAR_PERSON_GENERATION_QUEUE.find(
      (entry) => entry.status === "in-drive-usable",
    )!;
    expect(usable.count).toBe(inventory.passCount);

    // The seated master's cited width is the width that was measured.
    const seated = inventory.entries.find((entry) =>
      entry.file.includes("DESK_seated_man"),
    )!;
    expect(seated.verdict).toBe("FAIL");
    expect(seated.width).toBe(1216);

    // Nine of the twelve failures are the one short-hair batch, which is why
    // re-generating it is the highest-value single task in the queue.
    const shortHair = inventory.entries.filter((entry) =>
      entry.file.startsWith("PG-HAIR_SHORT_"),
    );
    expect(shortHair).toHaveLength(9);
    const queued = MODULAR_PERSON_GENERATION_QUEUE.find(
      (entry) => entry.entryId === "hair-short-set",
    )!;
    expect(queued.count).toBe(shortHair.length);
  });

  it("keeps the fixture-covered slots visible", () => {
    const hidden = MODULAR_PERSON_GENERATION_QUEUE.filter(
      (entry) => entry.status === "dev-fixture-only",
    );
    // These are the slots where a placeholder renders and nothing reports a
    // gap, which is exactly why they have to be written down.
    expect(hidden.map((entry) => entry.entryId)).toEqual([
      "eyewear",
      "accessory",
    ]);
    for (const entry of hidden) {
      expect(entry.location, entry.entryId).toContain("dev-modular-g2");
    }
  });

  it("refuses an entry that says art exists without saying where", () => {
    const bad: GenerationQueueEntry = {
      entryId: "x",
      kind: "top",
      description: "A top that is apparently somewhere.",
      status: "in-drive-usable",
      count: 1,
    };
    const result = validateGenerationQueue([bad]);
    expect(result.valid).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "non-missing-without-location",
    );
    expect(STATUSES_NEEDING_GENERATION).not.toContain("in-drive-usable");
  });
});
