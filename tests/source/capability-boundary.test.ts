/**
 * The production/fixture capability boundary.
 *
 * 13B M2 called an exported compiler directly with an unmarked synthetic
 * payload and got a production corpus containing a bill that does not exist.
 * These are that probe and its neighbours, promoted to permanent tests.
 */

import { describe, expect, it } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  assertValidArtifactLock,
  assertValidRawArtifact,
  openFixture,
  openProductionArtifacts,
  requireArtifact,
  writeProductionCorpus,
} from "../../src/source/core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  RawArtifact,
} from "../../src/source/core/index";
import {
  compileCounties,
  openCountyProduction,
} from "../../src/source/domains/counties/index";
import type { CountyRecord } from "../../src/source/domains/counties/index";

const REPO = resolve(import.meta.dirname, "../..");

function countiesLock(): ArtifactLock {
  return JSON.parse(
    readFileSync(
      resolve(REPO, "data/source/counties/artifact-lock.json"),
      "utf-8",
    ),
  ) as ArtifactLock;
}

describe("A1 — a compiler cannot be called with a plain object", () => {
  it("fails to typecheck and throws at runtime", () => {
    const synthetic = {
      artifacts: {
        gazetteer: {
          artifact: {
            artifactId: "invented",
            bytes: { sha256: "0".repeat(64), length: 1 },
          },
          bytes: Buffer.from("USPS|GEOID\nZZ|99999\n"),
        },
      },
    };
    // @ts-expect-error a plain object is not a ProductionInput or a FixtureInput
    expect(() => compileCounties(synthetic)).toThrow();
  });
});

describe("A2 / A14 / A15 — opening production artifacts", () => {
  it("A2 — refuses an unmarked synthetic payload placed at a production path", () => {
    const lock = countiesLock();
    const artifact = lock.artifacts[0] as RawArtifact;
    const scratch = mkdtempSync(resolve(tmpdir(), "capability-"));
    try {
      const fakePath = resolve(scratch, "fake.zip");
      writeFileSync(fakePath, Buffer.from("not the census file"));
      const tampered: ArtifactLock = {
        domain: "counties",
        artifacts: [{ ...artifact, localPath: fakePath }],
      };
      expect(() => openCountyProduction(tampered)).toThrow(
        /hashes to [0-9a-f]{64}, but the lock pins/,
      );
      expect(() => openCountyProduction(tampered)).toThrow(artifact.artifactId);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("A14 — refuses an artifact that is not in the lock", () => {
    const empty: ArtifactLock = { domain: "counties", artifacts: [] };
    expect(() => openCountyProduction(empty)).toThrow(
      /is not in the counties lock/,
    );
  });

  it("A15 — refuses a quarantined artifact and reports the reason", () => {
    const lock = countiesLock();
    const artifact = lock.artifacts[0] as RawArtifact;
    const quarantined: ArtifactLock = {
      domain: "counties",
      artifacts: [
        {
          ...artifact,
          quarantined: true,
          quarantineReason: "superseded by the 2026 vintage",
        },
      ],
    };
    expect(() => openCountyProduction(quarantined)).toThrow(/quarantined/);
    expect(() => openCountyProduction(quarantined)).toThrow(
      /superseded by the 2026 vintage/,
    );
  });

  it("refuses an artifact whose rights status is UNKNOWN", () => {
    const lock = countiesLock();
    const artifact = lock.artifacts[0] as RawArtifact;
    const unclear: ArtifactLock = {
      domain: "counties",
      artifacts: [
        {
          ...artifact,
          rights: {
            status: "UNKNOWN",
            declaredLicense: null,
            attributionRequired: "UNKNOWN",
          },
        },
      ],
    };
    expect(() => openCountyProduction(unclear)).toThrow(
      /UNKNOWN rights status/,
    );
  });

  it("refuses a lock belonging to another domain", () => {
    const lock = countiesLock();
    expect(() =>
      openProductionArtifacts(
        "places",
        { ...lock, domain: "counties" },
        { gazetteer: "x" },
      ),
    ).toThrow(/was handed the lock for/);
  });

  it("opens the real locked artifact and compiles it", () => {
    const compiled = compileCounties(openCountyProduction(countiesLock()));
    expect(compiled.corpus.inputClass).toBe("production");
    expect(compiled.records.length).toBeGreaterThan(3000);
  });
});

describe("A3 — fixtures resolve only under fixtures/source", () => {
  it("refuses a marked fixture placed outside the fixture root", () => {
    const scratch = mkdtempSync(resolve(tmpdir(), "fixture-"));
    try {
      const outside = resolve(scratch, "marked.json");
      writeFileSync(
        outside,
        JSON.stringify({
          __fixture: true,
          fixtureId: "counties/elsewhere",
          artifacts: {},
        }),
      );
      expect(() => openFixture("counties", outside)).toThrow(
        /outside fixtures\/source/,
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("refuses an unmarked file sitting inside the fixture root", () => {
    const path = resolve(REPO, "fixtures/source/demonstration/unmarked.json");
    mkdirSync(resolve(REPO, "fixtures/source/demonstration"), {
      recursive: true,
    });
    writeFileSync(path, JSON.stringify({ artifacts: {} }));
    try {
      expect(() => openFixture("demonstration", path)).toThrow(
        /does not declare/,
      );
    } finally {
      rmSync(path, { force: true });
    }
  });

  it("refuses a fixture belonging to another domain", () => {
    expect(() =>
      openFixture(
        "counties",
        "fixtures/source/state-office-qualifications/mixed-states.json",
      ),
    ).toThrow(/is not a counties fixture/);
  });
});

describe("A4 — a fixture corpus cannot be written into data/source", () => {
  it("fails to typecheck and is refused at runtime", () => {
    const fixtureCorpus = {
      corpus: {
        corpusId: "counties",
        compiler: { name: "counties", version: "1.0.0" },
        parser: { name: "p", version: "1.0.0" },
        inputs: [{ artifactId: "a", sha256: "0".repeat(64) }],
        asOf: "2025-01-01",
        recordCount: 0,
        canonicalSha256: "0".repeat(64),
        inputClass: "fixture" as const,
        coverage: {
          isCompleteUniverse: false,
          universeDescription: "a fixture",
          boundedSampleReason: "a fixture",
        },
      },
      records: [] as CountyRecord[],
    };
    const scratch = mkdtempSync(resolve(tmpdir(), "writer-"));
    try {
      expect(() =>
        writeProductionCorpus(
          // @ts-expect-error a fixture corpus is not a production corpus
          fixtureCorpus,
          resolve(scratch, "corpus.json"),
          resolve(scratch, "corpus-manifest.json"),
        ),
      ).toThrow(/may not be written into data\/source/);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("refuses a production corpus whose declared digest does not match its records", () => {
    const scratch = mkdtempSync(resolve(tmpdir(), "writer-"));
    try {
      const compiled = compileCounties(
        openCountyProduction(countiesLock()),
      ) as CompiledCorpus<CountyRecord, "production">;
      const tampered = {
        ...compiled,
        corpus: { ...compiled.corpus, canonicalSha256: "f".repeat(64) },
      } as CompiledCorpus<CountyRecord, "production">;
      expect(() =>
        writeProductionCorpus(
          tampered,
          resolve(scratch, "corpus.json"),
          resolve(scratch, "corpus-manifest.json"),
        ),
      ).toThrow(/but its records hash to/);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});

describe("A22 and the provenance invariants", () => {
  const base: RawArtifact = {
    artifactId: "probe",
    provider: "Some Publisher",
    retrieval: {
      url: "https://example.gov/file.zip",
      method: "bulk-download",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      httpStatus: 200,
      responseBytes: 10,
    },
    bytes: { length: 10, sha256: "a".repeat(64) },
    mediaType: "application/zip",
    publisher: {
      statedVintage: null,
      releaseDate: null,
      schemaVersion: null,
      documentationUrl: null,
    },
    rights: {
      status: "public-domain-us-government",
      declaredLicense: null,
      attributionRequired: false,
    },
    storage: "committed",
    localPath: "data/source/probe/raw/file.zip",
  };

  it("rejects a hash that is not a SHA-256 digest — a URL string cannot pass", () => {
    expect(() =>
      assertValidRawArtifact({
        ...base,
        bytes: { length: 10, sha256: "sha256-census-gus-2022-org-v1" },
      }),
    ).toThrow(/is not a SHA-256 hex digest/);
  });

  it("rejects a retrievedAt that is not an instant a retrieval produced", () => {
    expect(() =>
      assertValidRawArtifact({
        ...base,
        retrieval: { ...base.retrieval, retrievedAt: "2024-01-01" },
      }),
    ).toThrow(/not an ISO instant produced by a retrieval/);
  });

  it("rejects a container whose member digest equals its own", () => {
    expect(() =>
      assertValidRawArtifact({
        ...base,
        container: {
          memberPath: "x.txt",
          memberLength: 5,
          memberSha256: "a".repeat(64),
        },
      }),
    ).toThrow(/a zip and its member are different bytes/);
  });

  it("rejects a QA slice that declares no parent or no predicate", () => {
    expect(() =>
      assertValidRawArtifact({ ...base, storage: "derived-qa-slice" }),
    ).toThrow(/declares no derivation/);
    expect(() =>
      assertValidRawArtifact({
        ...base,
        storage: "derived-qa-slice",
        derivation: {
          parentArtifactId: "p",
          parentSha256: "b".repeat(64),
          selectionPredicate: "",
        },
      }),
    ).toThrow(/names no selection predicate/);
  });

  it("rejects a slice whose parent is not in the lock", () => {
    expect(() =>
      assertValidArtifactLock({
        domain: "probe",
        artifacts: [
          {
            ...base,
            storage: "derived-qa-slice",
            derivation: {
              parentArtifactId: "absent-parent",
              parentSha256: "b".repeat(64),
              selectionPredicate: "the first ten rows",
            },
          },
        ],
      }),
    ).toThrow(/which is not in the probe lock/);
  });

  it("rejects two artifacts sharing one id", () => {
    expect(() =>
      assertValidArtifactLock({ domain: "probe", artifacts: [base, base] }),
    ).toThrow(/twice/);
  });

  it("names what was asked for when an artifact is missing", () => {
    expect(() =>
      requireArtifact({ domain: "probe", artifacts: [] }, "wanted"),
    ).toThrow(/"wanted" is not in the probe lock/);
  });
});
