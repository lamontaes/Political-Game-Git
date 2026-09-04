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
        // The production hearing room, added when its master arrived.
        "civic-hearing-room",
        // The production chamber floor, added when Packet 71's master arrived.
        "legislative-chamber",
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

  it("asserts no measurement, because this file measures nothing", () => {
    for (const candidate of request.candidates) {
      expect(candidate.source_width).toBeUndefined();
      expect(candidate.source_height).toBeUndefined();
    }
  });

  /**
   * A batch is reconciled, not frozen. Three of these were approved when the
   * request was written and have since been moved into the rejected
   * high-resolution folder; leaving an owner's approval standing on a file the
   * owner rejected is how a rejected picture gets ingested by a tool doing
   * exactly what it was told.
   */
  it("keeps no approver on a candidate the owner has since rejected", () => {
    const withdrawn = request.candidates.filter((candidate) =>
      (candidate.approval_note ?? "").startsWith("WITHDRAWN"),
    );
    expect(withdrawn.length).toBeGreaterThan(0);
    for (const candidate of withdrawn) {
      expect(candidate.approved_by, candidate.asset_id).toBeUndefined();
      expect(candidate.approval_note, candidate.asset_id).toContain(
        "REJECTED BY THE OWNER",
      );
      expect(candidate.approval_note, candidate.asset_id).toContain(
        "05Y_REJECTED_HIGH_RES_CALIBRATION",
      );
    }
  });

  /**
   * Anything still approved and still wanted must say its bytes are not here,
   * so the queue can never be mistaken for coverage.
   */
  it("says plainly which candidates are still waiting on bytes", () => {
    const waiting = request.candidates.filter(
      (candidate) =>
        candidate.approved_by !== undefined &&
        !(candidate.approval_note ?? "").startsWith("INGESTED"),
    );
    expect(waiting.length).toBeGreaterThan(0);
    for (const candidate of waiting) {
      expect(candidate.approval_note ?? "", candidate.asset_id).toContain(
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
