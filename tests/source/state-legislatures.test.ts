/**
 * The state-legislatures domain.
 *
 * These tests exist to hold three lines that are easy to cross quietly:
 *
 *  1. a state's identity rests only on that state's instruments — the sampled
 *     states are geographically dispersed on purpose, because a template defect
 *     hides best among neighbours;
 *  2. identity coverage is not procedure coverage — forty-five states have a
 *     legislature here and no rule pack, and nothing in this domain may start
 *     claiming otherwise;
 *  3. where the two accepted representations of the same state overlap, they
 *     agree, and where this domain is silent it stays silent rather than
 *     inheriting the pack's number.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  DECLARED_STATE_COUNT,
  FIFTY_STATE_KEYS,
  FORBIDDEN_FIELDS,
  PROCEDURAL_PACK_STATES,
  REJECTED_PROVENANCE,
  buildCoverageReport,
  compileStateLegislatures,
  containsExcerpt,
  normalizeRetrievedText,
  numeralSpellings,
  openStateLegislatureArtifacts,
  sourceDomain,
  validateStateLegislatureCorpus,
} from "../../src/source/domains/state-legislatures/index";
import type { StateLegislatureIdentity } from "../../src/source/domains/state-legislatures/index";
import {
  REFERENCED_DELEGATION_PROVISIONS,
  STATE_DECLARATIONS,
} from "../../src/source/domains/state-legislatures/declarations";
import { STATE_LEGISLATURE_SOURCES } from "../../src/source/domains/state-legislatures/acquisition";
import { isClean, isUnresolved } from "../../src/source/core/index";
import type { CompiledCorpus } from "../../src/source/core/index";
import { LEGISLATIVE_RULE_PACKS } from "../../src/simulation/legislature-rule-packs";
import { listDomainNames } from "../../scripts/source/registry";
import {
  COVERAGE_JSON_PATH,
  COVERAGE_MARKDOWN_PATH,
  renderCoverageInto,
} from "../../scripts/source/state-legislature-coverage";

const REPO = resolve(import.meta.dirname, "../..");

function lock() {
  return JSON.parse(
    readFileSync(
      resolve(REPO, "data/source/state-legislatures/artifact-lock.json"),
      "utf-8",
    ),
  ) as Parameters<typeof openStateLegislatureArtifacts>[0];
}

function compiled(): CompiledCorpus<StateLegislatureIdentity, "production"> {
  return compileStateLegislatures(openStateLegislatureArtifacts(lock()));
}

function byKey(
  corpus: CompiledCorpus<StateLegislatureIdentity>,
  key: string,
): StateLegislatureIdentity {
  const found = corpus.records.find((record) => record.jurisdictionKey === key);
  if (!found) throw new Error(`No record for ${key}.`);
  return found;
}

/**
 * Geographically dispersed on purpose.
 *
 * The five accepted procedural states plus ten chosen to span the country —
 * west coast, southwest, gulf, northeast, mountain, plains and Pacific — so
 * that a defect which copies a neighbour's facts cannot pass by looking
 * regionally plausible.
 */
const SAMPLED = [
  "US-CA",
  "US-TX",
  "US-NY",
  "US-FL",
  "US-WA",
  "US-ME",
  "US-HI",
  "US-ND",
  "US-AL",
  "US-NM",
  "US-KY",
  "US-NE",
  "US-AK",
  "US-MN",
  "US-IL",
] as const;

describe("state-legislatures: fifty states, honestly counted", () => {
  it("compiles one record per state and no other jurisdiction", () => {
    const corpus = compiled();
    expect(corpus.records).toHaveLength(50);
    expect(DECLARED_STATE_COUNT).toBe(50);
    expect(
      corpus.records.map((record) => record.jurisdictionKey).sort(),
    ).toEqual([...FIFTY_STATE_KEYS].sort());
  });

  it("passes its own validator with no error", () => {
    const report = validateStateLegislatureCorpus(compiled());
    expect(report.findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(isClean(report)).toBe(true);
  });

  it("is wired into the command matrix by existing", () => {
    expect(listDomainNames()).toContain("state-legislatures");
    expect(sourceDomain.domain).toBe("state-legislatures");
    expect(sourceDomain.productionGate).toBeUndefined();
  });
});

describe("state-legislatures: a state resolves its own record and no other", () => {
  const corpus = compiled();

  for (const key of SAMPLED) {
    it(`${key} resolves to itself`, () => {
      const record = byKey(corpus, key);
      expect(record.recordId).toBe(key);
      expect(`US-${record.stateUsps}`).toBe(key);

      // Every artifact any value cites is named for this state.
      const prefix = `${record.stateUsps.toLowerCase()}-`;
      const serialized = JSON.stringify(record);
      for (const artifact of STATE_LEGISLATURE_SOURCES) {
        if (artifact.artifactId.startsWith(prefix)) continue;
        expect(
          serialized.includes(`"${artifact.artifactId}"`),
          `${key} must not cite ${artifact.artifactId}`,
        ).toBe(false);
      }
    });
  }

  it("the sample spans states this domain read and states it could not", () => {
    const read = SAMPLED.filter(
      (key) => !isUnresolved(byKey(corpus, key).structure),
    );
    const unread = SAMPLED.filter((key) =>
      isUnresolved(byKey(corpus, key).structure),
    );
    expect(read.length).toBeGreaterThan(0);
    expect(unread.length).toBeGreaterThan(0);
    // An unread state says why rather than being quietly empty.
    for (const key of unread) {
      expect(byKey(corpus, key).unresolvedGaps.length).toBeGreaterThan(0);
      for (const gap of byKey(corpus, key).unresolvedGaps) {
        expect(gap.reason.length).toBeGreaterThan(20);
      }
    }
  });

  it("no two states share a seat-count claim by accident of copying", () => {
    const corpusRecords = compiled().records;
    const seen = new Map<string, string[]>();
    for (const record of corpusRecords) {
      for (const chamber of record.chambers) {
        if (chamber.seatCount.state !== "KNOWN") continue;
        const key = `${chamber.chamberKey}:${chamber.seatCount.value}`;
        seen.set(key, [...(seen.get(key) ?? []), record.jurisdictionKey]);
      }
    }
    for (const [key, states] of seen) {
      if (states.length < 2) continue;
      // Two states may genuinely share a number; they may never share evidence.
      const artifacts = states.flatMap((state) =>
        byKey({ records: corpusRecords } as never, state).chambers.flatMap(
          (chamber) =>
            chamber.seatCount.state === "KNOWN"
              ? chamber.seatCount.evidence.map((e) => e.artifactId)
              : [],
        ),
      );
      expect(new Set(artifacts).size, `${key} shares evidence`).toBe(
        artifacts.length,
      );
    }
  });
});

describe("state-legislatures: agreement with the accepted rule packs", () => {
  const corpus = compiled();

  it("does not drift from a pack where both are KNOWN", () => {
    const disagreements: string[] = [];
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const record = corpus.records.find(
        (candidate) => candidate.jurisdictionKey === pack.jurisdictionKey,
      );
      expect(
        record,
        `${pack.jurisdictionKey} has no identity record`,
      ).toBeDefined();
      if (!record) continue;

      if (record.structure.state === "KNOWN") {
        if (record.structure.value !== pack.structure) {
          disagreements.push(
            `${pack.jurisdictionKey} structure: pack ${pack.structure}, source ${record.structure.value}`,
          );
        }
      }

      for (const packChamber of pack.chambers) {
        const chamber = record.chambers.find(
          (candidate) => candidate.chamberKey === packChamber.chamberKey,
        );
        if (!chamber) continue;
        if (
          chamber.seatCount.state === "KNOWN" &&
          chamber.seatCount.value !== packChamber.seats
        ) {
          disagreements.push(
            `${pack.jurisdictionKey} ${packChamber.chamberKey} seats: pack ${packChamber.seats}, source ${chamber.seatCount.value}`,
          );
        }
        if (
          chamber.name.state === "KNOWN" &&
          chamber.name.value.toLowerCase() !== packChamber.name.toLowerCase()
        ) {
          disagreements.push(
            `${pack.jurisdictionKey} ${packChamber.chamberKey} name: pack "${packChamber.name}", source "${chamber.name.value}"`,
          );
        }
      }
    }
    expect(disagreements).toEqual([]);
  });

  it("keeps identity coverage far wider than procedure coverage", () => {
    const report = buildCoverageReport(corpus);
    expect(report.proceduralPackStates).toEqual([...PROCEDURAL_PACK_STATES]);
    expect(report.stateCount).toBe(50);
    // States with identity but no pack: the whole reason this domain exists.
    expect(report.identityOnlyStates.length).toBeGreaterThan(0);
    for (const key of report.identityOnlyStates) {
      expect(PROCEDURAL_PACK_STATES).not.toContain(key);
    }
  });

  it("does not carry a LegislativeRulePack field", () => {
    const serialized = JSON.stringify(compiled().records);
    for (const forbidden of [
      "origination",
      "referral",
      "quorum",
      "interChamber",
      "standingCommittees",
      "concurrenceThreshold",
    ]) {
      expect(serialized.includes(`"${forbidden}"`)).toBe(false);
    }
  });
});

describe("state-legislatures: what the schema refuses to hold", () => {
  it("carries no qualification, filing, district, term or officeholder field", () => {
    const serialized = JSON.stringify(compiled().records);
    for (const forbidden of FORBIDDEN_FIELDS) {
      expect(serialized.includes(`"${forbidden}"`)).toBe(false);
    }
  });

  it("carries no rejected 92K provenance", () => {
    const serialized = JSON.stringify(compiled().records);
    for (const rejected of REJECTED_PROVENANCE) {
      expect(serialized.includes(rejected)).toBe(false);
    }
  });

  it("rejects a duplicated jurisdiction, a duplicated chamber and a zero-seat chamber", () => {
    const corpus = compiled();
    const california = byKey(corpus, "US-CA");

    const duplicated = validateStateLegislatureCorpus({
      corpus: corpus.corpus,
      records: [...corpus.records, california],
    });
    expect(
      duplicated.findings.some(
        (f) => f.code === "state-legislatures/duplicate-jurisdiction",
      ),
    ).toBe(true);

    const twoChambers = {
      ...california,
      chambers: [california.chambers[0]!, california.chambers[0]!],
    };
    const dupChamber = validateStateLegislatureCorpus({
      corpus: corpus.corpus,
      records: corpus.records.map((r) =>
        r.jurisdictionKey === "US-CA" ? twoChambers : r,
      ),
    });
    expect(
      dupChamber.findings.some(
        (f) => f.code === "state-legislatures/duplicate-chamber",
      ),
    ).toBe(true);

    const senate = california.chambers.find((c) => c.chamberKey === "senate")!;
    if (senate.seatCount.state !== "KNOWN") throw new Error("expected KNOWN");
    const zeroed = {
      ...california,
      chambers: california.chambers.map((c) =>
        c.chamberKey === "senate"
          ? { ...c, seatCount: { ...senate.seatCount, value: 0 } }
          : c,
      ),
    };
    const zeroReport = validateStateLegislatureCorpus({
      corpus: corpus.corpus,
      records: corpus.records.map((r) =>
        r.jurisdictionKey === "US-CA" ? (zeroed as typeof california) : r,
      ),
    });
    expect(
      zeroReport.findings.some(
        (f) => f.code === "state-legislatures/non-positive-seat-count",
      ),
    ).toBe(true);
  });

  it("rejects evidence borrowed from another state", () => {
    const corpus = compiled();
    const hawaii = byKey(corpus, "US-HI");
    const california = byKey(corpus, "US-CA");
    const borrowed = { ...hawaii, structure: california.structure };
    const report = validateStateLegislatureCorpus({
      corpus: corpus.corpus,
      records: corpus.records.map((r) =>
        r.jurisdictionKey === "US-HI" ? borrowed : r,
      ),
    });
    expect(
      report.findings.some(
        (f) =>
          f.code === "state-legislatures/evidence-from-another-jurisdiction",
      ),
    ).toBe(true);
  });

  it("rejects a bicameral state carrying one chamber", () => {
    const corpus = compiled();
    const hawaii = byKey(corpus, "US-HI");
    const halved = { ...hawaii, chambers: [hawaii.chambers[0]!] };
    const report = validateStateLegislatureCorpus({
      corpus: corpus.corpus,
      records: corpus.records.map((r) =>
        r.jurisdictionKey === "US-HI" ? halved : r,
      ),
    });
    expect(
      report.findings.some(
        (f) =>
          f.code ===
          "state-legislatures/chamber-count-disagrees-with-structure",
      ),
    ).toBe(true);
  });

  it("rejects a missing state and an invented one", () => {
    const corpus = compiled();
    const missing = validateStateLegislatureCorpus({
      corpus: corpus.corpus,
      records: corpus.records.filter((r) => r.jurisdictionKey !== "US-WY"),
    });
    expect(
      missing.findings.some(
        (f) => f.code === "state-legislatures/missing-state",
      ),
    ).toBe(true);

    const invented = validateStateLegislatureCorpus({
      corpus: corpus.corpus,
      records: [
        ...corpus.records,
        {
          ...byKey(corpus, "US-CA"),
          recordId: "US-PR",
          jurisdictionKey: "US-PR",
          stateUsps: "PR",
        },
      ],
    });
    expect(
      invented.findings.some(
        (f) => f.code === "state-legislatures/unexpected-jurisdiction",
      ),
    ).toBe(true);
  });

  it("rejects a generic citation with no pinpoint", () => {
    const corpus = compiled();
    const hawaii = byKey(corpus, "US-HI");
    const senate = hawaii.chambers.find((c) => c.chamberKey === "senate")!;
    const senateName = senate.name;
    if (senateName.state !== "KNOWN") throw new Error("expected KNOWN");
    const vague = {
      ...hawaii,
      chambers: hawaii.chambers.map((c) =>
        c.chamberKey === "senate"
          ? {
              ...c,
              name: {
                ...senateName,
                evidence: [
                  {
                    ...senateName.evidence[0],
                    locator: {
                      ...senateName.evidence[0].locator,
                      citation: "Hawaii Constitution legislative article",
                    },
                  },
                ] as typeof senateName.evidence,
              },
            }
          : c,
      ),
    };
    const report = validateStateLegislatureCorpus({
      corpus: corpus.corpus,
      records: corpus.records.map((r) =>
        r.jurisdictionKey === "US-HI" ? (vague as typeof hawaii) : r,
      ),
    });
    expect(
      report.findings.some(
        (f) => f.code === "state-legislatures/generic-citation",
      ),
    ).toBe(true);
  });
});

describe("state-legislatures: every claim is in the bytes", () => {
  it("finds every declared and investigated excerpt in its locked artifact", () => {
    const bytes = new Map(
      STATE_LEGISLATURE_SOURCES.map((spec) => [
        spec.artifactId,
        readFileSync(resolve(REPO, spec.localPath)),
      ]),
    );
    const text = new Map<string, string>();
    const textOf = (id: string): string => {
      const cached = text.get(id);
      if (cached !== undefined) return cached;
      const value = normalizeRetrievedText(bytes.get(id)!);
      text.set(id, value);
      return value;
    };

    const missing: string[] = [];
    let checked = 0;
    const check = (t: {
      artifactId: string;
      excerpt: string;
      citation: string;
    }) => {
      checked += 1;
      if (!containsExcerpt(textOf(t.artifactId), t.excerpt)) {
        missing.push(`${t.citation} in ${t.artifactId}`);
      }
    };
    /* Both shapes carry provisions; the kind of declaration does not change the check. */
    interface Provision {
      readonly artifactId: string;
      readonly excerpt: string;
      readonly citation: string;
    }
    interface AnyDeclared {
      readonly transcriptions?: readonly Provision[];
      readonly investigated?: readonly Provision[];
    }
    const visit = (declared: AnyDeclared): void => {
      for (const provision of declared.transcriptions ??
        declared.investigated ??
        []) {
        check(provision);
      }
    };
    for (const declaration of STATE_DECLARATIONS) {
      visit(declaration.legislatureName);
      visit(declaration.structure);
      for (const chamber of declaration.chambers) {
        visit(chamber.name);
        visit(chamber.seatCount);
        visit(chamber.membersElected);
      }
    }
    REFERENCED_DELEGATION_PROVISIONS.forEach(check);
    expect(missing).toEqual([]);
    expect(checked).toBeGreaterThan(80);
  });

  it("reads a number as digits or as its English cardinal, and nothing else", () => {
    expect(numeralSpellings(35)).toContain("thirty-five");
    expect(numeralSpellings(40)).toContain("forty");
    expect(numeralSpellings(120)).toContain("one hundred twenty");
    expect(numeralSpellings(120)).toContain("one hundred and twenty");
    expect(numeralSpellings(51)).toContain("51");
    expect(numeralSpellings(51)).not.toContain("fifty-two");
  });

  it("normalizes a page without rewriting a word of it", () => {
    const text = normalizeRetrievedText(
      Buffer.from(
        "<p>The senate shall&nbsp;consist of <b>forty</b> members.</p><script>x=1</script>",
        "utf-8",
      ),
    );
    expect(text).toBe("The senate shall consist of forty members.");
    expect(containsExcerpt(text, "shall consist of forty members")).toBe(true);
    expect(containsExcerpt(text, "shall consist of fifty members")).toBe(false);
  });
});

describe("state-legislatures: determinism", () => {
  it("compiles byte-identically twice", () => {
    const first = compiled();
    const second = compiled();
    expect(second.corpus.canonicalSha256).toBe(first.corpus.canonicalSha256);
    expect(JSON.stringify(second.records)).toBe(JSON.stringify(first.records));
  });

  it("matches the tracked corpus", () => {
    const tracked = JSON.parse(
      readFileSync(
        resolve(REPO, "data/source/state-legislatures/corpus-manifest.json"),
        "utf-8",
      ),
    ) as { canonicalSha256: string; recordCount: number };
    expect(tracked.recordCount).toBe(50);
    expect(tracked.canonicalSha256).toBe(compiled().corpus.canonicalSha256);
  });

  it("regenerates the coverage report byte-identically", () => {
    const scratch = mkdtempSync(
      resolve(tmpdir(), "state-legislature-coverage-"),
    );
    try {
      const generated = renderCoverageInto(scratch);
      expect(generated.json).toBe(
        readFileSync(resolve(REPO, COVERAGE_JSON_PATH), "utf-8"),
      );
      expect(generated.markdown).toBe(
        readFileSync(resolve(REPO, COVERAGE_MARKDOWN_PATH), "utf-8"),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("carries no wall clock", () => {
    const serialized = JSON.stringify(compiled());
    for (const key of ["compiledAt", "generatedAt", "timestamp", "runAt"]) {
      expect(serialized.includes(`"${key}"`)).toBe(false);
    }
  });
});
