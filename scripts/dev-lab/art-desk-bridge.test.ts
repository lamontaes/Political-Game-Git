import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { handleArtDeskBridge, hashBytes } from "./art-desk-bridge";

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
