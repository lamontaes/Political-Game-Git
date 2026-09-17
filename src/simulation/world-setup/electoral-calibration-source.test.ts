import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalJson } from "../canonical-json";
import calibration from "./electoral-calibration.generated.json" with { type: "json" };

/**
 * The integrity this data actually claims.
 *
 * CRUNCH47 C1 asks for the electoral-calibration source domain to be
 * registered with `scripts/source/registry.ts` so `source:validate`'s domain
 * count covers it. That registry compiles a corpus inside the framework from
 * its own artifact lock, and this domain's compiler is an offline Node script
 * that parses PDFs and HTML; porting it is a separate piece of work, and the
 * NGA pages' redistribution terms are not established. Until that is done the
 * honest position is that the data is checked here rather than counted there:
 * this test verifies every claim the manifest and lock make, so nothing rests
 * on a receipt from other domains.
 */
const DIR = resolve(
  import.meta.dirname,
  "../../../data/source/electoral-calibration-2024",
);

const sha256 = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");

interface LockArtifact {
  readonly id: string;
  readonly localPath: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly url: string;
  readonly mediaType: string;
}

const lock = JSON.parse(
  readFileSync(resolve(DIR, "artifact-lock.json"), "utf8"),
) as { readonly artifacts: readonly LockArtifact[] };
const manifest = JSON.parse(
  readFileSync(resolve(DIR, "corpus-manifest.json"), "utf8"),
) as {
  readonly canonicalSha256: string;
  readonly corpusPath: string;
  readonly compiler: string;
  readonly compilerVersion: string;
  readonly asOf: string;
};

describe("electoral calibration source integrity", () => {
  it("every locked artifact is present with the recorded bytes", () => {
    expect(lock.artifacts.length).toBeGreaterThan(50);
    for (const artifact of lock.artifacts) {
      const path = resolve(DIR, "../../..", artifact.localPath);
      const bytes = readFileSync(path);
      expect(statSync(path).size, artifact.id).toBe(artifact.byteLength);
      expect(sha256(bytes), artifact.id).toBe(artifact.sha256);
      expect(artifact.url.startsWith("https://"), artifact.id).toBe(true);
    }
  });

  it("the runtime artifact is the compiled corpus, byte for byte", () => {
    const corpusText = readFileSync(resolve(DIR, "corpus.json"), "utf8");
    const runtimeText = readFileSync(
      resolve(import.meta.dirname, "electoral-calibration.generated.json"),
      "utf8",
    );
    expect(runtimeText).toBe(corpusText);
    // The manifest digests the corpus file's own bytes, as the compiler writes
    // them; canonicalJson of the parsed value must agree with those bytes too,
    // so neither key order nor formatting can drift unnoticed.
    expect(sha256(corpusText)).toBe(manifest.canonicalSha256);
    expect(canonicalJson(JSON.parse(corpusText) as unknown)).toBe(
      canonicalJson(calibration as unknown),
    );
  });

  it("the corpus cites its own compiler and reference date", () => {
    const corpus = calibration as unknown as {
      compiler: string;
      compilerVersion: string;
      asOfDate: string;
      sources: readonly { id: string; sha256: string }[];
    };
    expect(corpus.compiler).toBe(manifest.compiler);
    expect(corpus.compilerVersion).toBe(manifest.compilerVersion);
    expect(corpus.asOfDate).toBe(manifest.asOf);
    // Every downloaded source the corpus cites is a locked artifact with the
    // same digest. A source compiled from a file already in this repository
    // (the Census district identities) has no downloaded artifact and says so.
    const locked = new Map(lock.artifacts.map((a) => [a.id, a.sha256]));
    for (const source of corpus.sources) {
      if (!locked.has(source.id)) {
        expect(source.id, "unlocked source").toBe("census-119-identities");
        continue;
      }
      expect(locked.get(source.id), source.id).toBe(source.sha256);
    }
  });
});
