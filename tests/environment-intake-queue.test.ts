import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  parseIntakeRequest,
  ENVIRONMENT_INTAKE_REQUEST_VERSION,
} from "../scripts/art-asset-factory/environment-intake";
import {
  ASSET_LINEAGE_CLASSES,
  ASSET_TARGET_CLASSES,
} from "../src/authoring/asset-lineage";
import type { EnvironmentFamiliesData } from "../scripts/art-asset-factory/schemas";

/**
 * The approved environment library, as a production-authoring queue rather
 * than Drive research.
 *
 * The point of this suite is that the queue is a DECLARATION, not a claim. It
 * names each approved environment, the family it belongs to, the lineage its
 * submitter is willing to state, and where the bytes are. It deliberately does
 * not assert any measurement: intake measures the real file and rejects a
 * declaration that does not match it.
 */

const REPO_ROOT = path.resolve(__dirname, "..");
const REQUEST_PATH = "art/intake/environment-batch-2026-09-03.request.json";

const request = parseIntakeRequest(
  fs.readFileSync(path.join(REPO_ROOT, REQUEST_PATH), "utf8"),
);
const families = JSON.parse(
  fs.readFileSync(
    path.join(REPO_ROOT, "art/manifest/environment_families.json"),
    "utf8",
  ),
) as EnvironmentFamiliesData;

describe("environment production-authoring queue", () => {
  it("parses as an ordinary intake request the existing pipeline can run", () => {
    expect(request.requestVersion).toBe(ENVIRONMENT_INTAKE_REQUEST_VERSION);
    expect(request.candidates.length).toBeGreaterThanOrEqual(7);
  });

  it("names a registered environment family for every candidate", () => {
    const familyIds = new Set(
      families.families.map((family) => family.family_id),
    );
    expect(familyIds).toEqual(
      new Set([
        "council-staff-office",
        "apartment-ordinary",
        "civic-community-meeting",
        "executive-private-office",
        // The production workroom the 5504x3072 master lives in (D-067).
        "shared-workroom-office",
      ]),
    );
    for (const candidate of request.candidates) {
      expect(candidate.family_id).toBeDefined();
      expect(familyIds.has(candidate.family_id!)).toBe(true);
    }
  });

  it("declares a closed lineage and native-detail state for every candidate", () => {
    for (const candidate of request.candidates) {
      expect(ASSET_TARGET_CLASSES).toContain(candidate.target_class);
      expect(ASSET_LINEAGE_CLASSES).toContain(candidate.lineage_class);
      expect(["native", "declared-upscale", "unverified"]).toContain(
        candidate.native_detail_state,
      );
      // Rights are recorded as unknown rather than invented.
      expect(candidate.rights_status).toBe("unknown");
      expect(candidate.approval_note ?? "").toContain("Drive ");
    }
  });

  it("asserts no measurement, because nothing here has been measured", () => {
    for (const candidate of request.candidates) {
      expect(candidate.source_width).toBeUndefined();
      expect(candidate.source_height).toBeUndefined();
      expect(candidate.approval_note ?? "").toContain(
        "Bytes are NOT in the repository yet",
      );
    }
  });

  it("has no candidate file present, so the queue cannot be mistaken for coverage", () => {
    const requestDirectory = path.dirname(path.join(REPO_ROOT, REQUEST_PATH));
    for (const candidate of request.candidates) {
      expect(fs.existsSync(path.join(requestDirectory, candidate.file))).toBe(
        false,
      );
    }
  });

  it("declares the JPEG sibling as reference rather than as a plate", () => {
    const jpeg = request.candidates.find((candidate) =>
      candidate.file.endsWith(".jpg"),
    )!;
    expect(jpeg.target_class).toBe("reference");
    expect(jpeg.approval_note).toContain("bitstream");
  });
});
