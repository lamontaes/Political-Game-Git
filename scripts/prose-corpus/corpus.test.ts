import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  describeHistoryProblems,
  loadAnchorBaseline,
  loadAnchorLedger,
  verifyAllocationHistory,
} from "./anchor-history";
import {
  contextRevisionOf,
  liveBindingsOf,
  loadAnchorFile,
  revisionOf,
} from "./anchors";
import { buildCoverageReport } from "./coverage";
import { runDiagnostics } from "./diagnostics";
import { findIdCollisions, parseProseId, proseId, templateSlots } from "./ids";
import { buildProseInventory, inventoryCsv } from "./inventory";
import {
  buildProseMetrics,
  compareToBaseline,
  normalizeText,
  type ProseBaseline,
} from "./metrics";
import { renderReviewPacket, reviewPacketStats } from "./review-packet";
import { scanLiterals } from "./scan";
import { runSeedTranscript, SEED_FAMILIES } from "./transcripts";
import type { ProseRecord } from "./types";

/**
 * What the corpus has to keep being true.
 *
 * Every claim here is about the measuring system, not about the prose. None of
 * these should ever be made to pass by editing a production string: the whole
 * point of the system is that it describes the banks as they are, so a test
 * that pushed back on the banks would be the tail wagging the dog.
 */

const inventory = buildProseInventory();
const records = inventory.records;

function fakeRecord(overrides: Partial<ProseRecord> = {}): ProseRecord {
  return {
    id: "prose:life:episode:fake/stage#line:0",
    domain: "life",
    bank: "episode",
    stableKey: "fake/stage",
    field: "line:0",
    surface: "scene-line",
    sourcePath: "src/simulation/fake.ts",
    sourceSymbol: "FAKE",
    text: "A plain sentence.",
    realization: "static",
    slots: [],
    reachability: "PLAYER_REACHABLE",
    reachabilityReason: "fixture",
    grounding: [],
    provenance: null,
    tags: [],
    textRevision: revisionOf("A plain sentence."),
    contextRevision: contextRevisionOf([]),
    ...overrides,
  };
}

describe("semantic identity", () => {
  it("builds readable coordinates rather than positions", () => {
    expect(
      proseId({
        domain: "life",
        bank: "episode",
        stableKey: "companionship.the-friend-you-named/best-friend-pact",
        field: "line:0",
      }),
    ).toBe(
      "prose:life:episode:companionship.the-friend-you-named/best-friend-pact#line:0",
    );
  });

  it("round-trips through parsing, colons in the field and all", () => {
    const id = proseId({
      domain: "life",
      bank: "episode",
      stableKey: "a.family/a-stage",
      field: "option:speak-up:label",
    });
    expect(parseProseId(id)).toStrictEqual({
      domain: "life",
      bank: "episode",
      stableKey: "a.family/a-stage",
      field: "option:speak-up:label",
    });
  });

  it("has no collisions across the whole inventory", () => {
    expect(findIdCollisions(records)).toStrictEqual([]);
  });

  it("fails closed when two records claim the same coordinates", () => {
    const collisions = findIdCollisions([fakeRecord(), fakeRecord()]);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.sources).toHaveLength(2);
  });

  it("gives identical text at two locations two distinct ids", () => {
    const byText = new Map<string, ProseRecord[]>();
    for (const record of records) {
      const list = byText.get(record.text) ?? [];
      list.push(record);
      byText.set(record.text, list);
    }
    const duplicated = [...byText.values()].filter((list) => list.length > 1);
    expect(duplicated.length).toBeGreaterThan(0);
    for (const list of duplicated) {
      expect(new Set(list.map((record) => record.id)).size).toBe(list.length);
    }
  });

  it("does not renumber existing ids when an unrelated line is inserted", () => {
    // The defect the old S-0001/C-0251 scheme had. An episode stage's own line
    // ordinal is scoped to that stage, so a new stage or a new family cannot
    // reach it, and neither can a new line in a different stage.
    const episodeIds = records
      .filter((record) => record.bank === "episode")
      .map((record) => record.id);
    const sampled = episodeIds.slice(0, 40);
    const withInsertion = [
      ...records,
      fakeRecord({
        id: "prose:life:episode:zzz-new-family/new-stage#line:0",
        stableKey: "zzz-new-family/new-stage",
      }),
    ];
    const after = new Set(withInsertion.map((record) => record.id));
    for (const id of sampled) expect(after.has(id)).toBe(true);
    expect(findIdCollisions(withInsertion)).toStrictEqual([]);
  });

  it("names the slots a template expects", () => {
    expect(
      templateSlots("{self} told {role:guardian} at {place}."),
    ).toStrictEqual(["place", "role:guardian", "self"]);
  });
});

describe("determinism", () => {
  it("regenerates the inventory byte-identically", () => {
    const first = buildProseInventory();
    const second = buildProseInventory();
    expect(second.digest).toBe(first.digest);
    expect(JSON.stringify(second.records)).toBe(JSON.stringify(first.records));
    expect(inventoryCsv(second)).toBe(inventoryCsv(first));
  });

  it("orders records by semantic id, not by adapter order", () => {
    const ids = records.map((record) => record.id);
    expect([...ids].sort()).toStrictEqual(ids);
  });
});

describe("PR #119 withholding is preserved, never fabricated", () => {
  const withheld = records.filter(
    (record) => record.reachability === "WITHHELD_BY_GROUNDING",
  );

  it("classifies the ten withheld 92C stages as withheld", () => {
    const stages = new Set(
      withheld
        .filter((record) => record.bank === "episode")
        .map((record) => record.stableKey.split("/")[1]),
    );
    for (const stage of [
      "called-in",
      "asked-by-a-colleague",
      "it-came-back-round",
      "pooled-tips",
      "what-you-said-stuck",
      "the-commute",
      "carrying-the-group",
      "the-family-shop",
      "the-third-weekend",
      "sandbag-line",
    ]) {
      expect(stages).toContain(stage);
    }
  });

  it("carries the bank's own reason and never calls one reachable", () => {
    expect(withheld.length).toBeGreaterThan(0);
    for (const record of withheld) {
      expect(record.reachability).not.toBe("PLAYER_REACHABLE");
      expect(record.reachabilityReason.trim().length).toBeGreaterThan(0);
      expect(record.grounding.some((ref) => ref.kind === "withheld")).toBe(
        true,
      );
    }
  });

  it("never lets a withheld stage appear in a played transcript", () => {
    const withheldStages = new Set(
      withheld
        .filter((record) => record.bank === "episode")
        .map((record) => record.stableKey),
    );
    for (const family of SEED_FAMILIES) {
      const transcript = runSeedTranscript(family, inventory);
      for (const beat of transcript.beats) {
        if (!beat.episodeKey || !beat.stageKey) continue;
        expect(withheldStages).not.toContain(
          `${beat.episodeKey}/${beat.stageKey}`,
        );
      }
    }
  });
});

describe("coverage discovery", () => {
  const coverage = buildCoverageReport(inventory);

  it("reports unclassified candidates instead of discarding them", () => {
    expect(coverage.counts.NEEDS_CLASSIFICATION).toBeGreaterThan(0);
    const needing = coverage.candidates.filter(
      (candidate) => candidate.verdict === "NEEDS_CLASSIFICATION",
    );
    expect(needing).toHaveLength(coverage.counts.NEEDS_CLASSIFICATION);
    for (const candidate of needing) {
      expect(candidate.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it("gives every exclusion a stated reason", () => {
    for (const exclusion of coverage.exclusions) {
      expect(exclusion.reason.trim().length).toBeGreaterThan(20);
    }
    for (const candidate of coverage.candidates) {
      if (candidate.verdict === "INVENTORIED") continue;
      expect(candidate.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it("actually finds the inventory's own prose in the source", () => {
    expect(coverage.counts.INVENTORIED).toBeGreaterThan(1000);
  });
});

describe("diagnostics", () => {
  const report = runDiagnostics(records);

  it("finds no hard errors on current main", () => {
    expect(report.hardErrors).toStrictEqual([]);
  });

  it("reports warnings without banning the wording", () => {
    // "something" is legitimate in a grounded line. It must be counted and
    // must not be an error, or the lint would push prose into worse shapes.
    const vague = report.warnings.filter(
      (finding) => finding.family === "vague-referent",
    );
    expect(vague.length).toBeGreaterThan(0);
    for (const finding of vague)
      expect(finding.severity).toBe("REVIEW_WARNING");
  });

  it("raises a hard error for a slot no declared role can bind", () => {
    const broken = runDiagnostics([
      fakeRecord({
        text: "You told {role:supervisor} you would.",
        slots: ["role:supervisor"],
        grounding: [
          { key: "role:guardian", description: "guardian", kind: "role" },
        ],
      }),
    ]);
    expect(broken.hardErrors).toHaveLength(1);
    expect(broken.hardErrors[0]?.family).toBe("unbindable-slot");
  });

  it("accepts a slot the record's own grounding declares", () => {
    const fine = runDiagnostics([
      fakeRecord({
        text: "You told {role:guardian} you would.",
        slots: ["role:guardian"],
        grounding: [
          { key: "role:guardian", description: "guardian", kind: "role" },
        ],
      }),
    ]);
    expect(fine.hardErrors).toStrictEqual([]);
  });

  it("flags a description that only restates its own label", () => {
    const found = runDiagnostics([
      fakeRecord({
        id: "prose:life:episode:f/s#option:go:label",
        field: "option:go:label",
        text: "Go to the meeting",
      }),
      fakeRecord({
        id: "prose:life:episode:f/s#option:go:description",
        field: "option:go:description",
        text: "You go to the meeting.",
      }),
    ]);
    expect(
      found.warnings.some(
        (finding) => finding.family === "label-restated-in-description",
      ),
    ).toBe(true);
  });
});

describe("repetition metrics", () => {
  const metrics = buildProseMetrics(records);

  it("detects exact duplicates across semantic locations", () => {
    expect(metrics.exactDuplicates.length).toBeGreaterThan(0);
    for (const duplicate of metrics.exactDuplicates) {
      expect(duplicate.ids.length).toBeGreaterThan(1);
    }
  });

  it("detects normalized duplicates the exact check misses", () => {
    expect(metrics.normalizedDuplicates.length).toBeGreaterThanOrEqual(
      metrics.exactDuplicates.length,
    );
    expect(normalizeText("You said, “No.”  ")).toBe("you said no");
  });

  it("clusters near-duplicates", () => {
    const found = buildProseMetrics([
      fakeRecord({
        id: "prose:life:episode:a/s#line:0",
        text: "The bus that gets you to class on time leaves before your shift ends.",
      }),
      fakeRecord({
        id: "prose:life:episode:b/s#line:0",
        text: "The bus that gets you to class on time leaves before the shift ends.",
      }),
    ]);
    expect(found.nearDuplicateClusters).toHaveLength(1);
    expect(found.nearDuplicateClusters[0]?.ids).toHaveLength(2);
  });

  it("counts repeated n-grams and sentence edges", () => {
    expect(metrics.frequentNgrams.length).toBeGreaterThan(0);
    for (const entry of metrics.frequentNgrams) {
      expect(entry.count).toBeGreaterThanOrEqual(6);
      expect(entry.ngram.split(" ").length).toBeGreaterThanOrEqual(3);
    }
    expect(metrics.repeatedOpenings.length).toBeGreaterThan(0);
    expect(metrics.repeatedEndings.length).toBeGreaterThan(0);
  });

  it("differentials name what changed rather than only how much", () => {
    const before: ProseBaseline = {
      digest: "a",
      totalRecords: 2,
      distinctTexts: 2,
      exactDuplicateGroups: 0,
      normalizedDuplicateGroups: 0,
      nearDuplicateClusters: 0,
      warningsByFamily: { "vague-referent": 3 },
      reachability: {},
      texts: { "prose:life:episode:a/s#line:0": "1111", gone: "2222" },
      contexts: { "prose:life:episode:a/s#line:0": "ctx1", gone: "ctx2" },
    };
    const after: ProseBaseline = {
      ...before,
      digest: "b",
      totalRecords: 2,
      warningsByFamily: { "vague-referent": 1 },
      texts: { "prose:life:episode:a/s#line:0": "3333", added: "4444" },
      contexts: { "prose:life:episode:a/s#line:0": "ctx1", added: "ctx4" },
    };
    const differential = compareToBaseline(before, after);
    expect(differential.reworded).toStrictEqual([
      "prose:life:episode:a/s#line:0",
    ]);
    expect(differential.addedSites).toStrictEqual(["added"]);
    expect(differential.removedSites).toStrictEqual(["gone"]);
    expect(differential.warningDeltas["vague-referent"]).toBe(-2);
  });
});

describe("transcripts", () => {
  it("are deterministic for a fixed seed", () => {
    const family = SEED_FAMILIES[0]!;
    const first = runSeedTranscript(family, inventory);
    const second = runSeedTranscript(family, inventory);
    expect(JSON.stringify(second.beats)).toBe(JSON.stringify(first.beats));
  });

  it("link realized lines back to their template ids", () => {
    const transcript = runSeedTranscript(SEED_FAMILIES[0]!, inventory);
    const linked = transcript.realizations.filter(
      (entry) => entry.templateId !== null,
    );
    expect(linked.length).toBeGreaterThan(0);
    for (const entry of linked) {
      expect(records.some((record) => record.id === entry.templateId)).toBe(
        true,
      );
    }
  });

  it("report what each seed actually demonstrated", () => {
    const seen = new Set<string>();
    for (const family of SEED_FAMILIES) {
      for (const claim of runSeedTranscript(family, inventory).demonstrated) {
        seen.add(claim);
      }
    }
    // The matrix must actually reach these, not merely intend to.
    for (const claim of [
      "age-band:childhood",
      "age-band:adolescence",
      "age-band:adult",
      "scene:ordinary-stretch",
      "connective-narration",
      "thread-recap",
      "persistent-instance-continuation",
      "candidacy-filed",
      "campaign-sessions",
      "election-won",
      "election-lost",
      // P12: this inherited campaign fixture reaches its first introduction
      // after the sourced session deadline. Preserve its actual refusal;
      // valid-window briefing behavior remains covered by the LEG route tests.
      "legislative-session-unavailable",
    ]) {
      expect(seen).toContain(claim);
    }
  });
});

describe("review packet", () => {
  const diagnostics = runDiagnostics(records);
  const html = renderReviewPacket({
    inventory,
    diagnostics,
    baseSha: "test",
    generatedFor: "test",
  });
  const stats = reviewPacketStats(html, inventory.counts.total);

  it("pre-renders every item on the server", () => {
    // The old packet shipped zero rendered items and built ~1,500 of them in
    // client script. This is the regression guard for that, as far as the
    // repository's tooling can check it.
    expect(stats.renderedItems).toBe(inventory.counts.total);
    expect(stats.endsCleanly).toBe(true);
  });

  it("ends without a large empty trailing allocation", () => {
    expect(stats.trailingBytes).toBeLessThan(8192);
  });

  it("keys owner marks to semantic ids, not ordinal positions", () => {
    const first = records[0]!;
    expect(html).toContain(`data-id="${first.id}"`);
    expect(html).not.toMatch(/data-id="[SC]-\d{4}"/);
  });

  it("escapes prose rather than letting it become markup", () => {
    const escaped = renderReviewPacket({
      inventory: {
        ...inventory,
        records: [fakeRecord({ text: '<script>x</script> & "q"' })],
        counts: { ...inventory.counts, total: 1 },
      },
      diagnostics,
      baseSha: "t",
      generatedFor: "t",
    });
    expect(escaped).toContain("&lt;script&gt;");
    expect(escaped).not.toContain("<script>x</script>");
  });
});

describe("evidence reconciliation (P125-REPAIR-02 phase 3)", () => {
  it("classifies canonical-record contract text as developer-route only", () => {
    // COMMIT_CONTRACTS writes event context — setting, socialContext,
    // motivation, pressure, choice. The only surface that renders those is
    // EventHistory, which DeveloperViewer mounts and App.tsx shows only for
    // `?view=developer`. Calling it player-reachable because one sample read
    // like prose was the mistake this corrects.
    const contracts = records.filter(
      (record) => record.bank === "commit-contract",
    );
    expect(contracts.length).toBeGreaterThan(0);
    for (const record of contracts) {
      expect(record.reachability).toBe("DEV_FIXTURE_ONLY");
      expect(record.reachabilityReason).toContain("view=developer");
    }
  });

  it("keeps the genuinely player-rendered conversation surface reachable", () => {
    const spoken = records.filter(
      (record) => record.bank === "conversation-subject",
    );
    expect(spoken.length).toBeGreaterThan(0);
    for (const record of spoken) {
      expect(record.reachability).toBe("PLAYER_REACHABLE");
    }
  });

  it("does not claim the 92C pact callback without an actual trace", () => {
    // Generic multi-year continuation is not evidence of the particular
    // childhood-pact callback. The matrix may claim it only when the pact
    // stage and a later stage of the same instance are both played.
    for (const family of SEED_FAMILIES) {
      const transcript = runSeedTranscript(family, inventory);
      const claimsCallback = transcript.demonstrated.includes(
        "92c-childhood-pact-callback",
      );
      const playedPact = transcript.beats.some(
        (beat) => beat.stageKey === "best-friend-pact",
      );
      if (claimsCallback) expect(playedPact).toBe(true);
    }
  });

  it("claims persistent cast across years only with a bound role and a span", () => {
    for (const family of SEED_FAMILIES) {
      const transcript = runSeedTranscript(family, inventory);
      if (!transcript.demonstrated.includes("persistent-cast-across-years")) {
        continue;
      }
      const byInstance = new Map<string, number[]>();
      for (const beat of transcript.beats) {
        if (!beat.instanceKey) continue;
        const ages = byInstance.get(beat.instanceKey) ?? [];
        ages.push(beat.age);
        byInstance.set(beat.instanceKey, ages);
      }
      const qualifying = [...byInstance.entries()].some(
        ([key, ages]) =>
          key.includes("=") &&
          ages.length > 1 &&
          Math.max(...ages) - Math.min(...ages) >= 5,
      );
      expect(qualifying).toBe(true);
    }
  });

  it("reports counts that match a live measurement, not a stale run", () => {
    // Neither side's pin is selected; the combined tree (current accepted
    // main plus CIVIL-AUTHORITY13) is scanned and these values are updated
    // from that measurement.
    const coverage = buildCoverageReport(inventory);
    expect(coverage.totalLiterals).toBe(66744);
    expect(coverage.counts.INVENTORIED).toBe(2107);
    expect(coverage.scannedFiles).toBe(478);
  });
});

describe("the corpus stays out of production runtime", () => {
  it("is imported by nothing under src/", () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of listDir(dir)) {
        if (entry.isDirectory) walk(entry.path);
        else if (/\.(ts|tsx)$/.test(entry.path)) {
          const text = readFileSync(entry.path, "utf8");
          if (/from\s+["'][^"']*prose-corpus/.test(text)) {
            offenders.push(entry.path);
          }
        }
      }
    };
    walk("src");
    expect(offenders).toStrictEqual([]);
  });

  it("reads production banks in the one permitted direction", () => {
    const literals = scanLiterals("scripts/prose-corpus/sources/episodes.ts");
    expect(literals.length).toBeGreaterThan(0);
    expect(records.some((record) => record.bank === "episode")).toBe(true);
  });
});

/**
 * The one gate that has to run in CI, over the repository's own files.
 *
 * 128R1 integration test. Claims only itself: it pins no count and touches no
 * other case in this file.
 *
 * `npm run corpus:prose -- check` verifies allocation history too, but nothing
 * in CI runs that command — `npm run validate` runs format, lint, typecheck,
 * `npm run test`, the source and build steps, and `validate:art`. So a check
 * that lives only in the CLI is a check that never runs on a pull request, and
 * an emptied ledger reached `main` green. This case is how the integrity
 * contract gets onto the path CI actually executes.
 *
 * Read-only by construction: it loads the three files and reports. It cannot
 * repair them, which is the point — a validator that rewrites what it is
 * validating cannot be trusted to have found anything.
 */
describe("computed-anchor allocation history is intact", () => {
  it("verifies the committed ledger against its independent checkpoint", () => {
    const problems = verifyAllocationHistory({
      ledger: loadAnchorLedger(),
      baseline: loadAnchorBaseline(),
      live: liveBindingsOf(loadAnchorFile().anchors),
    });
    // A failure here means a retired id could be re-issued to unrelated prose,
    // carrying an owner's recorded judgement onto text nobody reviewed.
    expect(problems.length === 0 ? "" : describeHistoryProblems(problems)).toBe(
      "",
    );
  });
});

/** Minimal directory listing, kept local so the test needs no extra helper. */
function listDir(
  dir: string,
): readonly { path: string; isDirectory: boolean }[] {
  return readdirSync(dir, { withFileTypes: true }).map((entry) => ({
    path: `${dir}/${entry.name}`,
    isDirectory: entry.isDirectory(),
  }));
}
