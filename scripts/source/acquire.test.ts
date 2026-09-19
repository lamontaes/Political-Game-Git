import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquirePlan } from "./acquire";
import {
  sha256Hex,
  type ArtifactLock,
  type AcquisitionPlan,
  type RawArtifact,
} from "../../src/source/core/index";
import baseline from "../../data/source/municipal-governance/artifact-lock.json";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "w65-acquire-test-"));
  const bytes = Buffer.from("Existing locked evidence");
  const raw = join(root, "retained.html");
  writeFileSync(raw, bytes);
  const original = baseline.artifacts[0] as RawArtifact;
  const retained: RawArtifact = {
    ...original,
    artifactId: "retained",
    localPath: raw,
    bytes: { length: bytes.length, sha256: sha256Hex(bytes) },
    retrieval: { ...original.retrieval, responseBytes: bytes.length },
  };
  const lock: ArtifactLock = {
    domain: "municipal-governance",
    artifacts: [retained],
  };
  const lockPath = join(root, "artifact-lock.json");
  writeFileSync(lockPath, JSON.stringify(lock));
  const plan: AcquisitionPlan = {
    domain: lock.domain,
    requests: ["retained", "new"].map((artifactId) => ({
      artifactId,
      provider: original.provider,
      url: `https://example.invalid/${artifactId}`,
      method: "GET",
      mediaType: "text/html",
      publisher: original.publisher,
      rights: original.rights,
      storage: "committed",
      localPath: artifactId === "retained" ? raw : join(root, "new.html"),
    })),
  };
  return { root, raw, lock, lockPath, plan };
}
afterEach(() => vi.unstubAllGlobals());
describe("bounded artifact acquisition", () => {
  it("downloads only the named artifact and preserves verified unrelated lock entries", async () => {
    const f = fixture();
    const fetch = vi.fn(
      async () => new Response("New official bytes", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetch);
    await acquirePlan(f.lock.domain, f.plan, f.lockPath, "new");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://example.invalid/new",
      expect.anything(),
    );
    const result = JSON.parse(
      readFileSync(f.lockPath, "utf-8"),
    ) as ArtifactLock;
    expect(result.artifacts[0]).toEqual(f.lock.artifacts[0]);
    expect(readFileSync(f.raw, "utf-8")).toBe("Existing locked evidence");
    expect(result.artifacts[1]?.bytes.sha256).toBe(
      sha256Hex(Buffer.from("New official bytes")),
    );
  });
  it("preserves old bytes and lock on retrieval failure", async () => {
    const f = fixture();
    const before = readFileSync(f.lockPath, "utf-8");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Unauthorized", { status: 401 })),
    );
    await expect(
      acquirePlan(f.lock.domain, f.plan, f.lockPath, "retained"),
    ).rejects.toThrow("HTTP 401");
    expect(readFileSync(f.lockPath, "utf-8")).toBe(before);
    expect(readFileSync(f.raw, "utf-8")).toBe("Existing locked evidence");
  });
  it("refuses changed retained evidence before network access", async () => {
    const f = fixture();
    writeFileSync(f.raw, "Unexpected change");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      acquirePlan(f.lock.domain, f.plan, f.lockPath, "new"),
    ).rejects.toThrow("differs from its lock");
    expect(fetch).not.toHaveBeenCalled();
  });
});
