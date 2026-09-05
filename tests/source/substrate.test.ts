/**
 * Substrate-level invariants: replay, wiring, import boundaries, and the
 * missingness sweep every domain has to survive.
 *
 * These are the checks that catch a defect nobody looked for. A21 counts hash
 * implementations, A20 catches a domain that exists but is not wired in, A16
 * and A17 read the import graph, and A19 blanks each field of a real artifact
 * in turn and insists the compiler refuses rather than substitutes.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  corpusCanonicalDigest,
  parseDelimited,
  readZipMember,
  toCanonicalJson,
  FORBIDDEN_WALL_CLOCK_KEYS,
  assertValidArtifactLock,
  sha256Hex,
} from "../../src/source/core/index";
import type {
  ArtifactLock,
  NormalizedCorpus,
} from "../../src/source/core/index";
import { listDomainNames, loadDomains } from "../../scripts/source/registry";
import { replay } from "../../scripts/source/replay";
import { verifyAllArtifacts } from "../../scripts/source/verify-artifacts";
import { normalizeCounties } from "../../src/source/domains/counties/normalize";
import { parseGazetteerCounties } from "../../src/source/domains/counties/parse";
import {
  cutHousingSlice,
  cutPersonSlice,
  HOUSING_ARTIFACT,
} from "../../src/source/domains/acs-pums/index";
import { cutRecentYears } from "../../src/source/domains/bls-laus/index";

const REPO = resolve(import.meta.dirname, "../..");
const DATA = resolve(REPO, "data/source");

function everyFile(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) everyFile(path, found);
    else found.push(path);
  }
  return found;
}

describe("A20 — every domain directory is wired into the command matrix", () => {
  it("loads a module for each directory, with matching names", async () => {
    const names = listDomainNames();
    const domains = await loadDomains();
    expect(domains.map((domain) => domain.domain)).toEqual([...names]);
    expect(names.length).toBeGreaterThan(0);
  });

  it("gives every domain either a compiled corpus or a stated production gate", async () => {
    for (const domain of await loadDomains()) {
      const corpus = resolve(DATA, domain.domain, "corpus.json");
      if (domain.productionGate) {
        expect(domain.productionGate.length).toBeGreaterThan(40);
        expect(existsSync(corpus)).toBe(false);
      } else {
        expect(existsSync(corpus)).toBe(true);
      }
    }
  });

  it("records every domain in the manifest, compiled or gated", async () => {
    const manifest = JSON.parse(
      readFileSync(resolve(DATA, "MANIFEST.json"), "utf-8"),
    ) as {
      domains: { domain: string }[];
      gatedDomains: { domain: string; productionGate: string }[];
    };
    const listed = [
      ...manifest.domains.map((entry) => entry.domain),
      ...manifest.gatedDomains.map((entry) => entry.domain),
    ].sort();
    expect(listed).toEqual([...listDomainNames()]);
  });
});

describe("A9 / A10 / A11 — deterministic replay", () => {
  it("A9 — regenerates every tracked source artifact byte-identically", async () => {
    expect(await replay()).toEqual([]);
  }, 240_000);

  it("A11 — no tracked generated artifact carries a wall clock", () => {
    const generated = everyFile(DATA).filter(
      (file) =>
        file.endsWith(".json") &&
        !file.includes(`${resolve(DATA)}/`.concat()) === false,
    );
    const offences: string[] = [];
    for (const file of generated) {
      // raw/ holds publisher bytes, which this repository does not author.
      if (file.includes("/raw/")) continue;
      const text = readFileSync(file, "utf-8");
      for (const key of FORBIDDEN_WALL_CLOCK_KEYS) {
        if (text.includes(`"${key}"`)) offences.push(`${file}: ${key}`);
      }
    }
    expect(offences).toEqual([]);
  });

  it("A10 — a one-byte change to a tracked corpus is a replay difference", () => {
    // The replay compares generated text against tracked text, so a corpus that
    // differs by one character must not compare equal.
    const corpus = readFileSync(resolve(DATA, "counties/corpus.json"), "utf-8");
    const tampered = corpus.replace("Autauga", "Autaugb");
    expect(tampered).not.toBe(corpus);
    expect(corpusCanonicalDigest([tampered])).not.toBe(
      corpusCanonicalDigest([corpus]),
    );
  });

  it("declares a corpus digest that matches the file it describes", async () => {
    for (const domain of await loadDomains()) {
      if (domain.productionGate) continue;
      const dir = resolve(DATA, domain.domain);
      const records = JSON.parse(
        readFileSync(resolve(dir, "corpus.json"), "utf-8"),
      ) as unknown[];
      const corpus = JSON.parse(
        readFileSync(resolve(dir, "corpus-manifest.json"), "utf-8"),
      ) as NormalizedCorpus;
      expect(corpus.canonicalSha256).toBe(corpusCanonicalDigest(records));
      expect(corpus.recordCount).toBe(records.length);
      expect(corpus.inputClass).toBe("production");
    }
  });

  it("canonical JSON sorts keys, drops undefined and refuses what it cannot represent", () => {
    expect(toCanonicalJson({ b: 1, a: 2 })).toBe('{\n  "a": 2,\n  "b": 1\n}\n');
    expect(toCanonicalJson({ a: undefined, b: 1 })).toBe('{\n  "b": 1\n}\n');
    expect(() => toCanonicalJson({ a: Number.NaN })).toThrow(/non-finite/);
    expect(() => toCanonicalJson({ a: new Date() })).toThrow(
      /cannot serialize/,
    );
    expect(() => toCanonicalJson({ a: () => 1 })).toThrow(/cannot serialize/);
  });
});

describe("artifacts", () => {
  it("re-hashes every locally present artifact against its lock", async () => {
    const { results, mismatches } = await verifyAllArtifacts();
    expect(mismatches).toBe(0);
    expect(
      results.filter((result) => result.outcome === "verified").length,
    ).toBeGreaterThan(20);
  }, 120_000);

  it("A22 — no artifact digest equals a corpus's own canonical digest", async () => {
    for (const domain of await loadDomains()) {
      if (domain.productionGate) continue;
      const lock = JSON.parse(
        readFileSync(resolve(REPO, domain.lockPath), "utf-8"),
      ) as ArtifactLock;
      assertValidArtifactLock(lock);
      const corpus = JSON.parse(
        readFileSync(
          resolve(DATA, domain.domain, "corpus-manifest.json"),
          "utf-8",
        ),
      ) as NormalizedCorpus;
      for (const artifact of lock.artifacts) {
        expect(artifact.bytes.sha256).not.toBe(corpus.canonicalSha256);
      }
    }
  });

  it("re-cuts every QA slice from its committed parent and gets the same bytes", () => {
    const housingParent = readFileSync(
      resolve(DATA, "acs-pums/raw/csv_hwy.zip"),
    );
    const personParent = readFileSync(
      resolve(DATA, "acs-pums/raw/csv_pwy.zip"),
    );
    expect(sha256Hex(cutHousingSlice(housingParent))).toBe(
      sha256Hex(
        readFileSync(resolve(DATA, "acs-pums/raw/psam_h56.qa-slice.csv")),
      ),
    );
    expect(
      sha256Hex(
        cutPersonSlice(
          personParent,
          new Map([[HOUSING_ARTIFACT, housingParent]]),
        ),
      ),
    ).toBe(
      sha256Hex(
        readFileSync(resolve(DATA, "acs-pums/raw/psam_p56.qa-slice.csv")),
      ),
    );
  });

  it("re-cuts the LAUS slice from its cached parent when the parent is present", () => {
    const cached = resolve(REPO, ".source-cache/bls-laus/la.data.1.CurrentS");
    if (!existsSync(cached)) {
      // The parent is deliberately not committed. Where it is absent — a fresh
      // clone, or CI — the slice is taken on the lock's word, which is what the
      // large-artifact policy intends.
      expect(
        existsSync(resolve(DATA, "bls-laus/raw/la.data.1.CurrentS.qa-slice")),
      ).toBe(true);
      return;
    }
    expect(sha256Hex(cutRecentYears(readFileSync(cached)))).toBe(
      sha256Hex(
        readFileSync(resolve(DATA, "bls-laus/raw/la.data.1.CurrentS.qa-slice")),
      ),
    );
  });

  it("states a coverage claim for every corpus, and a reason for every bounded one", async () => {
    for (const domain of await loadDomains()) {
      if (domain.productionGate) continue;
      const corpus = JSON.parse(
        readFileSync(
          resolve(DATA, domain.domain, "corpus-manifest.json"),
          "utf-8",
        ),
      ) as NormalizedCorpus;
      expect(corpus.coverage.universeDescription.length).toBeGreaterThan(40);
      if (corpus.coverage.isCompleteUniverse) {
        expect(corpus.coverage.boundedSampleReason).toBeNull();
      } else {
        expect(
          corpus.coverage.boundedSampleReason?.length ?? 0,
        ).toBeGreaterThan(40);
      }
    }
  });
});

describe("A16 / A17 — import boundaries", () => {
  function tsFiles(dir: string): string[] {
    return existsSync(dir)
      ? everyFile(dir).filter(
          (file) => file.endsWith(".ts") || file.endsWith(".tsx"),
        )
      : [];
  }

  it("A16 — no runtime module imports the source substrate", () => {
    const edges: string[] = [];
    for (const area of [
      "simulation",
      "presentation",
      "player",
      "ui",
      "persistence",
      "cli",
      "environment",
    ]) {
      for (const file of tsFiles(resolve(REPO, "src", area))) {
        const text = readFileSync(file, "utf-8");
        for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) {
          const specifier = match[1] ?? "";
          if (
            specifier.includes("source/core") ||
            /(^|\/)source(\/|$)/.test(specifier)
          ) {
            edges.push(`${file.slice(REPO.length + 1)} -> ${specifier}`);
          }
        }
      }
    }
    expect(edges).toEqual([]);
  });

  it("A17 — no domain imports another domain", () => {
    const domainsRoot = resolve(REPO, "src/source/domains");
    const edges: string[] = [];
    for (const name of listDomainNames()) {
      for (const file of tsFiles(resolve(domainsRoot, name))) {
        const text = readFileSync(file, "utf-8");
        for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) {
          const specifier = match[1] ?? "";
          const reachesSibling =
            specifier.includes("../../domains/") ||
            listDomainNames().some(
              (other) => other !== name && specifier.includes(`../${other}/`),
            );
          if (reachesSibling) {
            edges.push(`${name} -> ${specifier}`);
          }
        }
      }
    }
    expect(edges).toEqual([]);
  });

  it("the core imports nothing outside itself", () => {
    const core = resolve(REPO, "src/source/core");
    const edges: string[] = [];
    for (const file of tsFiles(core)) {
      const text = readFileSync(file, "utf-8");
      for (const match of text.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
        const specifier = match[1] ?? "";
        const target = resolve(file, "..", specifier);
        if (!target.startsWith(core))
          edges.push(`${file.slice(REPO.length + 1)} -> ${specifier}`);
      }
    }
    expect(edges).toEqual([]);
  });
});

describe("A19 — the missingness sweep", () => {
  it("refuses rather than substitutes when any county field is blanked in turn", () => {
    const archive = readFileSync(
      resolve(DATA, "counties/raw/2025_Gaz_counties_national.zip"),
    );
    const member = readZipMember(archive, "2025_Gaz_counties_national.txt");
    const parsed = parseGazetteerCounties(member);
    const header = parsed.header ?? [];
    const sample = parsed.rows.slice(0, 1);
    expect(sample).toHaveLength(1);

    for (let column = 0; column < header.length; column += 1) {
      const blanked = sample.map((row) => ({
        ...row,
        fields: row.fields.map((field, index) =>
          index === column ? "" : field,
        ),
      }));
      const { records, defects } = normalizeCounties(blanked, "sweep");

      // Every field is required, so blanking any one of them must drop the
      // record with a named defect. What must never happen is a record that
      // survives carrying "", 0, false or a default category in that field.
      expect(records).toHaveLength(0);
      expect(defects.length).toBeGreaterThan(0);
      expect(defects[0]?.message).toMatch(/blank|not a number|is not/i);
    }
  });

  it("keeps an empty cell distinguishable from a zero all the way through the parser", () => {
    const result = parseDelimited(Buffer.from("a|b|c\n1||3\n", "utf-8"), {
      delimiter: "|",
      hasHeaderRow: true,
    });
    expect(result.rows[0]?.fields).toEqual(["1", "", "3"]);
    expect(result.rows[0]?.fields[1]).not.toBe("0");
  });
});

describe("the tracked source tree", () => {
  it("keeps every domain's raw artifacts within the per-domain size budget", () => {
    for (const name of listDomainNames()) {
      const raw = resolve(DATA, name, "raw");
      if (!existsSync(raw)) continue;
      const bytes = everyFile(raw).reduce(
        (total, file) => total + statSync(file).size,
        0,
      );
      expect(bytes).toBeLessThan(25 * 1024 * 1024);
    }
  });
});
