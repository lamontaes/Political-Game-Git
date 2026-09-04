import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  openAssetRequests,
  summarizeAssetRequests,
  validateAssetRequests,
  type AssetRequest,
  type AssetRequestDocument,
} from "../src/authoring/asset-request";
import assetManifest from "../art/manifest/asset_manifest.json";
import {
  SCENE_CONSUMERS,
  reportSceneConsumers,
  unconsumedProductionScenes,
} from "../src/presentation/scene-consumers";

const REQUEST_PATH = path.resolve(
  __dirname,
  "..",
  "art/requests/asset-requests.json",
);

const document = JSON.parse(
  fs.readFileSync(REQUEST_PATH, "utf8"),
) as AssetRequestDocument;

const requests = document.requests;

describe("the structured asset request queue", () => {
  it("validates as a queue", () => {
    const validation = validateAssetRequests(requests);
    expect(validation.findings.filter((f) => f.severity === "error")).toEqual(
      [],
    );
    expect(validation.valid).toBe(true);
  });

  /**
   * The seed invariant, exercised rather than asserted in prose. A diffusion
   * seed is provenance: it names one roll of one model's dice, survives no
   * model change, and cannot be searched for by anyone asking whether the
   * asset already exists.
   */
  it("refuses a generator seed as an asset's identity", () => {
    const base = requests[0]!;
    for (const identity of ["20348571", "seed-20348571", "a3f9c1d8e7b62f04"]) {
      const validation = validateAssetRequests([
        { ...base, requestId: identity },
      ]);
      expect(
        validation.findings.map((finding) => finding.code),
        identity,
      ).toContain("seed-shaped-request-id");
      expect(validation.valid).toBe(false);
    }
  });

  it("refuses a request that searched nowhere before asking", () => {
    const base = requests[0]!;
    const validation = validateAssetRequests([
      {
        ...base,
        inventoryCheck: {
          ...base.inventoryCheck,
          repositoryPathsSearched: [],
          driveLocationsSearched: [],
        },
      },
    ]);
    expect(validation.findings.map((f) => f.code)).toContain(
      "empty-inventory-check",
    );
  });

  it("makes a finished request say how it finished", () => {
    const base = requests.find(
      (request) => request.status === "accepted-promoted",
    )!;
    const stripped: AssetRequest = { ...base };
    delete (stripped as { resolutionNote?: string }).resolutionNote;
    const validation = validateAssetRequests([stripped]);
    expect(validation.findings.map((f) => f.code)).toContain(
      "terminal-without-resolution",
    );
  });

  /**
   * A request for something already released is a request to make a second
   * copy of it. Reconciling the queue against the manifest is the check the
   * report queues never had.
   */
  it("asks for nothing the manifest has already released", () => {
    const released = new Set(
      (
        assetManifest.assets as {
          asset_id: string;
          runtime_release_status?: string;
        }[]
      )
        .filter((asset) => asset.runtime_release_status === "released")
        .map((asset) => asset.asset_id),
    );
    for (const request of openAssetRequests(requests)) {
      for (const assetId of released) {
        expect(
          assetId.includes(request.requestId.replace(/^env-/, "")),
          `${request.requestId} vs ${assetId}`,
        ).toBe(false);
      }
    }
  });

  it("every request a consumer names is in the queue", () => {
    const known = new Set(requests.map((request) => request.requestId));
    for (const consumer of SCENE_CONSUMERS) {
      for (const requestId of consumer.openRequestIds) {
        expect(known, consumer.consumerId).toContain(requestId);
      }
    }
  });

  it("every open request is still open in the queue", () => {
    const open = new Set(
      openAssetRequests(requests).map((request) => request.requestId),
    );
    for (const consumer of SCENE_CONSUMERS) {
      for (const requestId of consumer.openRequestIds) {
        expect(open, `${consumer.consumerId} -> ${requestId}`).toContain(
          requestId,
        );
      }
    }
  });

  it("counts what is open without anyone tallying it by hand", () => {
    const summary = summarizeAssetRequests(requests);
    expect(summary.total).toBe(requests.length);
    expect(summary.open).toBe(openAssetRequests(requests).length);
    expect(summary.byPriority.P0).toBeGreaterThan(0);
  });
});

describe("the scene consumer matrix", () => {
  it("gives every consumer a derived disposition", () => {
    for (const report of reportSceneConsumers()) {
      expect(report.disposition, report.consumerId).toBeTruthy();
      // A consumer cannot claim production art it does not resolve.
      if (report.disposition === "wired-to-production-art") {
        expect(report.hasProductionPlate, report.consumerId).toBe(true);
        expect(report.wiredThrough, report.consumerId).not.toBeNull();
      }
    }
  });

  /**
   * The check that stops an approved plate from being ingested, hashed,
   * registered and then quietly forgotten — which is the whole reason the
   * inventory discipline exists.
   */
  it("strands no registered production scene", () => {
    expect(unconsumedProductionScenes()).toEqual([]);
  });

  /**
   * `wiredThrough` is the one fact in the matrix that is asserted rather than
   * derived, so it is the one that could drift. This reads the module and
   * checks it reaches `PRODUCTION_VISUAL_LIBRARY`, which is the only thing
   * that turns a registered scene into a URL a browser can paint. A module
   * that does not reach it is not painting anything, whatever it claims.
   */
  it("proves each claimed seam by reading the module that claims it", () => {
    for (const report of reportSceneConsumers()) {
      if (report.wiredThrough === null) continue;
      const source = fs.readFileSync(
        path.resolve(__dirname, "..", report.wiredThrough),
        "utf8",
      );
      expect(
        source.includes("PRODUCTION_VISUAL_LIBRARY"),
        `${report.consumerId} claims ${report.wiredThrough} paints it`,
      ).toBe(true);
    }
  });

  /** The quarantine, at the consumer level. */
  it("names the Lexington office for exactly one consumer", () => {
    const lexington = reportSceneConsumers().filter(
      (report) => report.sceneId === "office-council-staff-fixture",
    );
    expect(lexington.map((report) => report.consumerId)).toEqual([
      "council-staff-office",
    ]);
    expect(lexington[0]!.canonicalGate).toContain("Lexington-Fayette");
  });
});
