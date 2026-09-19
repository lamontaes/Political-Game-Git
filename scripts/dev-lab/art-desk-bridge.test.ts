import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  handleArtDeskBridge,
  handleArtDeskInputs,
  hashBytes,
} from "./art-desk-bridge";
import { ART_DESK_CANDIDATE_SIDECAR } from "./art-desk-inputs";
import { tinyPng } from "./art-desk-inputs.test";

describe("loopback Art Desk bridge", () => {
  const workspace = mkdtempSync(join(tmpdir(), "art-desk-bridge-"));
  mkdirSync(join(workspace, "art/requests"), { recursive: true });
  const relative = "art/requests/asset-reviews.json";
  writeFileSync(
    join(workspace, relative),
    '{"documentVersion":1,"reviews":[]}\n',
  );

  const loopback = {
    remoteAddress: "127.0.0.1",
    origin: "http://127.0.0.1:5388",
    host: "127.0.0.1:5388",
    localReviewEnabled: true,
  };

  it("refuses production mounting, traversal, foreign origin and stale revisions", () => {
    expect(
      handleArtDeskBridge(workspace, {
        ...loopback,
        localReviewEnabled: false,
        method: "GET",
        relativePath: relative,
      }).ok,
    ).toBe(false);
    expect(
      handleArtDeskBridge(workspace, {
        ...loopback,
        method: "GET",
        relativePath: "art/requests/../../package.json",
      }).ok,
    ).toBe(false);
    expect(
      handleArtDeskBridge(workspace, {
        ...loopback,
        origin: "https://example.invalid",
        method: "PUT",
        relativePath: relative,
        body: Buffer.from("{}"),
      }).ok,
    ).toBe(false);
    const first = handleArtDeskBridge(workspace, {
      ...loopback,
      method: "PUT",
      relativePath: relative,
      ifMatch: hashBytes(readFileSync(join(workspace, relative))),
      body: Buffer.from('{"documentVersion":1,"reviews":[]}\n'),
    });
    expect(first.ok).toBe(true);
    const stale = handleArtDeskBridge(workspace, {
      ...loopback,
      method: "PUT",
      relativePath: relative,
      ifMatch: "0".repeat(64),
      body: Buffer.from('{"documentVersion":1,"reviews":[{"x":1}]}\n'),
    });
    expect(stale.ok).toBe(false);
    if (stale.ok) return;
    expect(stale.code).toBe("revision-conflict");
    expect(
      JSON.parse(readFileSync(join(workspace, relative), "utf8")).reviews,
    ).toEqual([]);
  });

  it("serves allowlisted candidate rasters with an image content type", () => {
    const candidate =
      "art/generated/candidates/art-desk/env-neighborhood-doorstep-generic/deadbeef.jpg";
    mkdirSync(dirname(join(workspace, candidate)), { recursive: true });
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    writeFileSync(join(workspace, candidate), bytes);
    const got = handleArtDeskBridge(workspace, {
      ...loopback,
      method: "GET",
      relativePath: candidate,
    });
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(got.contentType).toBe("image/jpeg");
    expect(got.body?.equals(bytes)).toBe(true);
    expect(got.revision).toBe(hashBytes(bytes));
  });
});

describe("Art Desk bridge input receipts and write boundaries", () => {
  const workspace = mkdtempSync(join(tmpdir(), "art-desk-bridge-inputs-"));
  mkdirSync(join(workspace, "art/requests"), { recursive: true });
  const reviewsPath = "art/requests/asset-reviews.json";
  writeFileSync(
    join(workspace, reviewsPath),
    '{"documentVersion":1,"reviews":[]}\n',
  );
  const loopback = {
    remoteAddress: "127.0.0.1",
    origin: "http://127.0.0.1:5388",
    host: "127.0.0.1:5388",
    localReviewEnabled: true,
  };
  const options = { now: "2026-09-16T00:00:00.000Z" };
  const png = tinyPng(4, 2);
  const sha = hashBytes(png);
  const candidatePath = `art/generated/candidates/art-desk/qa-bridge/${sha}.png`;

  it("stores a candidate only under its own hash and only when it decodes", () => {
    const wrongName = handleArtDeskBridge(
      workspace,
      {
        ...loopback,
        method: "PUT",
        relativePath: `art/generated/candidates/art-desk/qa-bridge/${"0".repeat(64)}.png`,
        body: png,
      },
      options,
    );
    expect(wrongName.ok).toBe(false);
    if (!wrongName.ok) expect(wrongName.code).toBe("invalid-raster");
    const text = Buffer.from("hello");
    const notRaster = handleArtDeskBridge(
      workspace,
      {
        ...loopback,
        method: "PUT",
        relativePath: `art/generated/candidates/art-desk/qa-bridge/${hashBytes(text)}.png`,
        body: text,
      },
      options,
    );
    expect(notRaster.ok).toBe(false);
    const stored = handleArtDeskBridge(
      workspace,
      { ...loopback, method: "PUT", relativePath: candidatePath, body: png },
      options,
    );
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    expect(stored.payload).toMatchObject({
      sha256: sha,
      container: "png",
      width: 4,
      height: 2,
    });
    expect(existsSync(join(workspace, candidatePath))).toBe(true);
  });

  it("serves the sidecar and the inputs receipt with verified candidate state", () => {
    const sidecar = JSON.stringify({
      documentVersion: 1,
      candidates: [
        {
          requestId: "qa-bridge",
          sha256: sha,
          path: candidatePath,
          byteLength: png.length,
          container: "png",
          width: 4,
          height: 2,
          storedAt: options.now,
          declaredBy: "test-fixture",
          rightsStatus: "unknown",
          sourceDeclaration: "fixture",
        },
      ],
    });
    const written = handleArtDeskBridge(
      workspace,
      {
        ...loopback,
        method: "PUT",
        relativePath: ART_DESK_CANDIDATE_SIDECAR,
        body: Buffer.from(sidecar),
      },
      options,
    );
    expect(written.ok).toBe(true);
    const receipt = handleArtDeskInputs(
      workspace,
      { ...loopback, method: "GET", relativePath: "" },
      options,
    );
    expect(receipt.ok).toBe(true);
    if (!receipt.ok) return;
    const parsed = JSON.parse(receipt.body!.toString("utf8"));
    expect(parsed.privatePack.status).toBe("not-configured");
    expect(parsed.candidates).toHaveLength(1);
    expect(parsed.candidates[0]).toMatchObject({
      requestId: "qa-bridge",
      bytes: "verified",
      raster: { container: "png", width: 4, height: 2 },
    });
    const denied = handleArtDeskInputs(
      workspace,
      {
        ...loopback,
        remoteAddress: "10.0.0.9",
        method: "GET",
        relativePath: "",
      },
      options,
    );
    expect(denied.ok).toBe(false);
  });

  it("refuses a new review whose bytes are missing or changed, and accepts a verified one", () => {
    const review = (outputSha256: string, reviewId: string) => ({
      reviewId,
      requestId: "qa-bridge",
      requestVersion: 1,
      outputSha256,
      contractVersion: "alive43-art-desk-v1",
      fitContractHash: "f".repeat(64),
      sceneContractHash: "s".repeat(64),
      decision: "approve",
      authorId: "test-fixture",
      decidedAt: options.now,
      rightsStatus: "unknown",
      sourceDeclaration: "fixture",
    });
    const current = hashBytes(readFileSync(join(workspace, reviewsPath)));
    const unknownBytes = handleArtDeskBridge(
      workspace,
      {
        ...loopback,
        method: "PUT",
        relativePath: reviewsPath,
        ifMatch: current,
        body: Buffer.from(
          JSON.stringify({
            documentVersion: 1,
            reviews: [review("2".repeat(64), "qa-bridge-unknown")],
          }),
        ),
      },
      options,
    );
    expect(unknownBytes.ok).toBe(false);
    if (!unknownBytes.ok)
      expect(unknownBytes.code).toBe("candidate-unverified");
    // Corrupt the stored bytes: the recorded hash no longer matches.
    writeFileSync(
      join(workspace, candidatePath),
      Buffer.concat([png, Buffer.from([0])]),
    );
    const changed = handleArtDeskBridge(
      workspace,
      {
        ...loopback,
        method: "PUT",
        relativePath: reviewsPath,
        ifMatch: current,
        body: Buffer.from(
          JSON.stringify({
            documentVersion: 1,
            reviews: [review(sha, "qa-bridge-changed")],
          }),
        ),
      },
      options,
    );
    expect(changed.ok).toBe(false);
    if (!changed.ok) expect(changed.message).toContain("hash-mismatch");
    writeFileSync(join(workspace, candidatePath), png);
    const accepted = handleArtDeskBridge(
      workspace,
      {
        ...loopback,
        method: "PUT",
        relativePath: reviewsPath,
        ifMatch: current,
        body: Buffer.from(
          JSON.stringify({
            documentVersion: 1,
            reviews: [review(sha, "qa-bridge-verified")],
          }),
        ),
      },
      options,
    );
    expect(accepted.ok).toBe(true);
    expect(
      JSON.parse(readFileSync(join(workspace, reviewsPath), "utf8")).reviews,
    ).toHaveLength(1);
  });
});
