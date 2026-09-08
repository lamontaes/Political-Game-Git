import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  allocationHistory,
  assertMonotonicAdvance,
  atomicWriteFile,
  attestedIds,
  BASELINE_SCHEMA,
  DEFAULT_ANCHOR_PATHS,
  formatIndexRanges,
  indexOfId,
  LEDGER_SCHEMA,
  parseIndexRanges,
  issuanceOf,
  resolveAnchorPaths,
  baselineOf,
  highWaterOf,
  issuedDigest,
  ledgerOf,
  loadAnchorBaseline,
  loadAnchorLedger,
  siteDigest,
  symbolOf,
  verifyAllocationHistory,
  writeAnchorBaseline,
  writeAnchorLedger,
  type AnchorBaseline,
  type AnchorIssuance,
  type AnchorLedger,
  type LiveBinding,
} from "./anchor-history";

/**
 * What allocation history has to survive, stated against real files on disk.
 *
 * The ledger alone was not enough, and these cases are the reproductions that
 * showed it. Driven through the production CLI first, a missing ledger, an
 * `issued` that was absent, null or a bare string, and a valid-schema ledger
 * with exactly one retired entry deleted all produced a successful exit and
 * handed the retired number to unrelated new text. The loader's defaults could
 * not tell a legitimate first install from destroyed history.
 *
 * So the cases here are deliberately about corruption on disk rather than
 * about well-typed values passed to a helper. A helper that only ever sees a
 * valid `string[]` cannot fail the way the real thing failed.
 *
 * `anchor-cli.test.ts` drives the same corruptions through the actual command.
 * These prove the boundary; those prove the boundary is on the path that runs.
 */

const SYMBOL = "recapSentence";
const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "anchor-history-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true });
});

/**
 * A deterministic issuance per id, so a membership case can say what it means.
 *
 * These cases are about whether history LOSES an id, not about any particular
 * binding, so each id gets one stable synthetic site and text. Every helper here
 * derives the pair the same way, which is what lets a live binding built by
 * `live()` match the record built by `records()` — a mismatch in one of these
 * tests is a real finding, not fixture noise.
 */
function siteFor(id: string): string {
  return siteDigest(
    "scripts/prose-corpus/probe.ts",
    symbolOf(id),
    indexOfId(id),
  );
}

function records(ids: readonly string[]): AnchorIssuance[] {
  return ids.map((id) =>
    issuanceOf(id, siteFor(id), siteDigest("text", id, 0)),
  );
}

/** The same ids as live sidecar bindings, at the sites they were issued for. */
function live(ids: readonly string[]): LiveBinding[] {
  return ids.map((id) => ({
    id,
    site: siteFor(id),
    where: `probe.ts ${symbolOf(id)} #${indexOfId(id)}`,
  }));
}

/** A written pair, the way a mint leaves one. */
function written(issued: readonly string[]): {
  ledgerPath: string;
  baselinePath: string;
} {
  const dir = tempDir();
  const ledgerPath = join(dir, "ledger.json");
  const baselinePath = join(dir, "baseline.json");
  const ledger = ledgerOf(records(issued));
  writeAnchorLedger(ledger, ledgerPath);
  writeAnchorBaseline(baselineOf(ledger.issuances), baselinePath);
  return { ledgerPath, baselinePath };
}

function verify(
  ledger: AnchorLedger | null,
  baseline: AnchorBaseline | null,
  liveIds: readonly string[] = [],
) {
  return verifyAllocationHistory({ ledger, baseline, live: live(liveIds) });
}

const THREE = [`${SYMBOL}-0001`, `${SYMBOL}-0002`, `${SYMBOL}-0003`];

describe("the loader refuses malformed history instead of defaulting it", () => {
  it("rejects an `issued` that is missing, null, or a bare string", () => {
    // All three reproduced a successful mint that reused a retired id, because
    // `parsed.issued ?? []` read every one of them as "no history yet".
    for (const issued of [undefined, null, `${SYMBOL}-0002`, 7, {}]) {
      const path = join(tempDir(), "ledger.json");
      writeFileSync(
        path,
        JSON.stringify({
          schema: LEDGER_SCHEMA,
          note: "n",
          ...(issued === undefined ? {} : { issued }),
        }),
      );
      expect(() => loadAnchorLedger(path)).toThrow(/no `issued` array/);
    }
  });

  it("rejects an inherited id-only ledger rather than reading it as current", () => {
    // The id-only schema is not wrong so much as insufficient — it cannot say
    // which site an id was issued for — so it is refused with the one-way
    // migration named, never silently upgraded underneath a mint.
    const path = join(tempDir(), "ledger.json");
    writeFileSync(
      path,
      JSON.stringify({ schema: 1, note: "n", issued: THREE }),
    );
    expect(() => loadAnchorLedger(path)).toThrow(/-- migrate/);
    expect(() => loadAnchorLedger(path)).toThrow(
      /one binding identity is lost/,
    );
  });

  it("rejects a record that omits its provenance instead of declaring it unknown", () => {
    // The shape of the original defect, at the new layer: a missing field must
    // never read as "nothing was retained". Either a digest is recorded or the
    // absence is named.
    const dir = tempDir();
    const omitted = join(dir, "omitted.json");
    writeFileSync(
      omitted,
      JSON.stringify({
        schema: LEDGER_SCHEMA,
        note: "n",
        issued: [{ id: `${SYMBOL}-0001`, site: "a".repeat(12) }],
      }),
    );
    expect(() => loadAnchorLedger(omitted)).toThrow(
      /no valid `text` provenance/,
    );

    const bothWays = join(dir, "both.json");
    writeFileSync(
      bothWays,
      JSON.stringify({
        schema: LEDGER_SCHEMA,
        note: "n",
        issued: [
          {
            id: `${SYMBOL}-0001`,
            site: "a".repeat(12),
            text: "b".repeat(12),
            unknown: ["text"],
          },
        ],
      }),
    );
    expect(() => loadAnchorLedger(bothWays)).toThrow(/may not do both/);
  });

  it("rejects one id recorded twice for two different sites", () => {
    // The cross-branch collision preserved in one file. Both claims are kept so
    // that this refusal is possible at all.
    const path = join(tempDir(), "ledger.json");
    writeFileSync(
      path,
      JSON.stringify({
        schema: LEDGER_SCHEMA,
        note: "n",
        issued: [
          { id: `${SYMBOL}-0001`, site: "a".repeat(12), text: "1".repeat(12) },
          { id: `${SYMBOL}-0001`, site: "b".repeat(12), text: "2".repeat(12) },
        ],
      }),
    );
    expect(() => loadAnchorLedger(path)).toThrow(/two different sites/);
  });

  it("rejects entries that are not anchor ids", () => {
    const path = join(tempDir(), "ledger.json");
    writeFileSync(
      path,
      JSON.stringify({
        schema: LEDGER_SCHEMA,
        note: "n",
        issued: [
          { id: `${SYMBOL}-0001`, unknown: ["site", "text"] },
          { id: "", unknown: ["site", "text"] },
        ],
      }),
    );
    expect(() => loadAnchorLedger(path)).toThrow(/not an anchor id/);
  });

  it("rejects a duplicated entry, per the declared de-duplication policy", () => {
    const path = join(tempDir(), "ledger.json");
    writeFileSync(
      path,
      JSON.stringify({
        schema: LEDGER_SCHEMA,
        note: "n",
        issued: [
          { id: `${SYMBOL}-0001`, unknown: ["site", "text"] },
          { id: `${SYMBOL}-0001`, unknown: ["site", "text"] },
        ],
      }),
    );
    expect(() => loadAnchorLedger(path)).toThrow(/more than once/);
  });

  it("keeps rejecting an empty file, truncated JSON, and an unknown schema", () => {
    // These three already failed closed before this repair. They still do.
    const dir = tempDir();
    const empty = join(dir, "empty.json");
    writeFileSync(empty, "");
    expect(() => loadAnchorLedger(empty)).toThrow(/is empty/);

    const truncated = join(dir, "truncated.json");
    writeFileSync(truncated, '{"schema": 1, "iss');
    expect(() => loadAnchorLedger(truncated)).toThrow(/truncated or corrupt/);

    const unknown = join(dir, "unknown.json");
    writeFileSync(
      unknown,
      JSON.stringify({ schema: 99, note: "", issued: [] }),
    );
    expect(() => loadAnchorLedger(unknown)).toThrow(/schema 99/);
  });

  it("validates the checkpoint's own shape", () => {
    const dir = tempDir();
    const bad = (body: unknown, pattern: RegExp) => {
      const path = join(dir, `b-${Math.random()}.json`);
      writeFileSync(path, JSON.stringify(body));
      expect(() => loadAnchorBaseline(path)).toThrow(pattern);
    };
    const V = BASELINE_SCHEMA;
    bad(
      {
        schema: V,
        note: "n",
        digest: "0".repeat(16),
        highWater: {},
        issuedIndexes: {},
      },
      /count/,
    );
    bad(
      {
        schema: V,
        note: "n",
        count: 1,
        digest: "nope",
        highWater: {},
        issuedIndexes: {},
      },
      /digest/,
    );
    bad(
      {
        schema: V,
        note: "n",
        count: 1,
        digest: "0".repeat(16),
        issuedIndexes: {},
      },
      /highWater/,
    );
    bad(
      {
        schema: V,
        note: "n",
        count: 1,
        digest: "0".repeat(16),
        highWater: { a: "x" },
        issuedIndexes: { a: "1" },
      },
      /non-integer high-water/,
    );

    // The exact-membership half is required, and must agree with the marks
    // beside it. A checkpoint whose two halves disagree attests nothing.
    bad(
      {
        schema: V,
        note: "n",
        count: 1,
        digest: "0".repeat(16),
        highWater: { a: 1 },
      },
      /no `issuedIndexes` object/,
    );
    bad(
      {
        schema: V,
        note: "n",
        count: 1,
        digest: "0".repeat(16),
        highWater: { a: 3 },
        issuedIndexes: { a: "1-2" },
      },
      /two halves of one checkpoint must agree/,
    );
    bad(
      {
        schema: V,
        note: "n",
        count: 1,
        digest: "0".repeat(16),
        highWater: { a: 3 },
        issuedIndexes: { a: "3,1" },
      },
      /not their canonical form/,
    );
    bad(
      {
        schema: V,
        note: "n",
        count: 1,
        digest: "0".repeat(16),
        highWater: { a: 3 },
        issuedIndexes: { a: "3-1" },
      },
      /runs backwards/,
    );
  });

  it("rejects an inherited checkpoint rather than reading it as current", () => {
    const path = join(tempDir(), "baseline.json");
    writeFileSync(
      path,
      JSON.stringify({
        schema: 1,
        note: "n",
        count: 3,
        digest: "0".repeat(16),
        highWater: { [SYMBOL]: 3 },
      }),
    );
    expect(() => loadAnchorBaseline(path)).toThrow(/-- migrate/);
  });

  it("reports absence as absence, distinct from an empty history", () => {
    const dir = tempDir();
    expect(loadAnchorLedger(join(dir, "nope.json"))).toBeNull();
    expect(loadAnchorBaseline(join(dir, "nope.json"))).toBeNull();
  });
});

describe("lost or truncated established history is detected", () => {
  it("distinguishes a first install from a destroyed ledger", () => {
    // Nothing at all: a bootstrap is legitimate, and is named as the remedy.
    const fresh = verify(null, null);
    expect(fresh.map((problem) => problem.kind)).toStrictEqual(["no-history"]);
    expect(fresh[0]?.detail).toMatch(/bootstrap/);

    // A checkpoint with no ledger is not a first install. It is loss, and the
    // remedy is restoration rather than re-seeding from the live sidecar.
    const lost = verify(null, baselineOf(records(THREE)));
    expect(lost.map((problem) => problem.kind)).toStrictEqual(["lost-ledger"]);
    expect(lost[0]?.detail).toMatch(
      /cannot be re-seeded from the live sidecar/,
    );
  });

  it("detects exactly one retired id removed from a valid-schema ledger", () => {
    // The surgical case. The file still parses, still validates, and still
    // looks like a ledger; only the independently retained checkpoint knows
    // that it used to hold one more id.
    const checkpoint = baselineOf(records(THREE));
    const shortened = ledgerOf(records([`${SYMBOL}-0001`, `${SYMBOL}-0003`]));
    const problems = verify(shortened, checkpoint);
    // Two independent findings now, not one: the checkpoint's digest disagrees,
    // AND its exact membership names the id that went missing. The second is
    // what closes the case where a ledger drops a member and still grows.
    const kinds = problems.map((problem) => problem.kind);
    expect(kinds).toContain("history-mismatch");
    expect(kinds).toContain("history-regressed");
    expect(problems[0]?.detail).toMatch(/2 issuances/);
    expect(problems[0]?.detail).toMatch(/attests 3 /);
    expect(
      problems.find((problem) => problem.kind === "history-regressed")?.detail,
    ).toMatch(new RegExp(`${SYMBOL}-0002`));
  });

  it("detects a ledger whose per-symbol reach has gone backwards", () => {
    const checkpoint = baselineOf(records(THREE));
    const truncated = ledgerOf(records([`${SYMBOL}-0001`]));
    const kinds = verify(truncated, checkpoint).map((problem) => problem.kind);
    expect(kinds).toContain("history-regressed");
    expect(kinds).toContain("history-mismatch");
  });

  it("detects a missing checkpoint behind an otherwise intact ledger", () => {
    const problems = verify(ledgerOf(records(THREE)), null);
    expect(problems.map((problem) => problem.kind)).toStrictEqual([
      "lost-baseline",
    ]);
  });

  it("passes an intact pair", () => {
    const ledger = ledgerOf(records(THREE));
    expect(verify(ledger, baselineOf(ledger.issuances), THREE)).toStrictEqual(
      [],
    );
  });

  it("detects a live id the ledger never absorbed, rather than seeding from it", () => {
    const ledger = ledgerOf(records(THREE));
    const problems = verify(ledger, baselineOf(ledger.issuances), [
      ...THREE,
      `${SYMBOL}-0009`,
    ]);
    expect(problems.map((problem) => problem.kind)).toStrictEqual([
      "unreserved-live-id",
    ]);
    expect(problems[0]?.detail).toMatch(/-- ledger/);
  });

  it("detects one id bound to two live sites", () => {
    const ledger = ledgerOf(records(THREE));
    const problems = verify(ledger, baselineOf(ledger.issuances), [
      `${SYMBOL}-0001`,
      `${SYMBOL}-0001`,
      `${SYMBOL}-0002`,
    ]);
    expect(problems.map((problem) => problem.kind)).toStrictEqual([
      "duplicate-live-id",
    ]);
    expect(problems[0]?.detail).toMatch(/does not transfer|stays with/);
  });

  it("states the boundary it does not defend: a consistent rewrite of both files", () => {
    // Honest limit. Anyone who rewrites the ledger AND its checkpoint together
    // can declare any history. Detection covers losing or truncating either
    // one, which is what a crash, a bad merge, or a stray delete produces.
    const forged = ledgerOf(records([`${SYMBOL}-0001`]));
    expect(verify(forged, baselineOf(forged.issuances))).toStrictEqual([]);
  });
});

describe("the allocator's floor is independent of the ledger", () => {
  it("keeps a mark the ledger has lost", () => {
    const checkpoint = baselineOf(records(THREE));
    const shortened = ledgerOf(records([`${SYMBOL}-0001`]));
    const history = allocationHistory(shortened, checkpoint);
    // Detection has already refused this state; the floor is the second,
    // independent guard, so that a shrunken ledger still cannot offer 0002 or
    // 0003 back even if it were somehow allocated against.
    expect(history.highWater[SYMBOL]).toBe(3);
  });

  it("takes the higher of the checkpoint's mark and the ledger's own reach", () => {
    const ledger = ledgerOf(records([...THREE, `${SYMBOL}-0009`]));
    const history = allocationHistory(ledger, baselineOf(records(THREE)));
    expect(history.highWater[SYMBOL]).toBe(9);
  });

  it("derives marks per symbol", () => {
    expect(highWaterOf([`a-0004`, `a-0002`, `b-0001`])).toStrictEqual({
      a: 4,
      b: 1,
    });
  });
});

describe("persistence survives interruption", () => {
  it("leaves the previous file untouched when a write fails part-way", () => {
    // `writeFileSync` truncates in place, so a failure mid-write used to leave
    // a half-written authoritative file. An atomic replace cannot: the old
    // bytes stand until the new file is complete.
    const dir = tempDir();
    const path = join(dir, "ledger.json");
    writeAnchorLedger(ledgerOf(records(THREE)), path);
    const before = readFileSync(path, "utf8");

    expect(() =>
      atomicWriteFile(join(dir, "no-such-directory", "ledger.json"), "x"),
    ).toThrow();
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("leaves no temp debris behind after a successful write", () => {
    const dir = tempDir();
    atomicWriteFile(join(dir, "ledger.json"), "{}\n");
    expect(readdirSync(dir)).toStrictEqual(["ledger.json"]);
  });

  it("round-trips a written pair through the strict loader", () => {
    const { ledgerPath, baselinePath } = written(THREE);
    const ledger = loadAnchorLedger(ledgerPath);
    const baseline = loadAnchorBaseline(baselinePath);
    expect(ledger?.issued).toStrictEqual(THREE);
    expect(baseline?.count).toBe(3);
    expect(baseline?.digest).toBe(issuedDigest(records(THREE)));
    expect(verify(ledger, baseline, THREE)).toStrictEqual([]);
  });

  it("writes a checkpoint that matches the ledger it was written beside", () => {
    const { ledgerPath, baselinePath } = written([
      ...THREE,
      "openingBeat-0001",
    ]);
    const ledger = loadAnchorLedger(ledgerPath)!;
    const baseline = loadAnchorBaseline(baselinePath)!;
    expect(baseline.count).toBe(ledger.issued.length);
    expect(baseline.digest).toBe(issuedDigest(ledger.issuances));
    expect(baseline.highWater).toStrictEqual({
      openingBeat: 1,
      [SYMBOL]: 3,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 128R2                                                                      */
/* -------------------------------------------------------------------------- */

describe("no write path may move history backwards", () => {
  const prior = ledgerOf(records(THREE));
  const checkpoint = baselineOf(prior.issuances);

  function advance(next: readonly string[]) {
    return () =>
      assertMonotonicAdvance({
        next: records(next),
        priorLedger: prior,
        priorBaseline: checkpoint,
        operation: "`-- ledger`",
      });
  }

  it("refuses to drop an id the ledger already recorded", () => {
    // The controlling 128A2 blocker, as a property rather than a route:
    // `-- ledger` was reproduced writing a checkpoint that agreed with a
    // ledger one retired id shorter, after which that id was allocatable.
    expect(advance([`${SYMBOL}-0001`, `${SYMBOL}-0003`])).toThrow(
      /never un-issued/,
    );
  });

  it("refuses to shrink the attested count", () => {
    expect(advance([`${SYMBOL}-0001`])).toThrow(/only advances/);
  });

  it("refuses to lower a per-symbol high-water mark", () => {
    // Same count, lower reach: swapping the top id for a fresh lower one.
    const sideways = [`${SYMBOL}-0001`, `${SYMBOL}-0002`, "openingBeat-0001"];
    expect(advance(sideways)).toThrow(/lower the recapSentence high-water/);
  });

  it("allows a genuine advance, and an unchanged set", () => {
    expect(advance(THREE)).not.toThrow();
    expect(advance([...THREE, `${SYMBOL}-0090`])).not.toThrow();
  });

  it("refuses a set that grew while dropping an attested member", () => {
    // 128A3's recovery blocker as a property. The count rises and every mark
    // rises, and the set is still not a superset of what is attested.
    expect(
      advance([
        ...THREE.filter((id) => !id.endsWith("0002")),
        `${SYMBOL}-0031`,
        `${SYMBOL}-0032`,
      ]),
    ).toThrow(/NOT a superset/);
  });

  it("refuses to rewrite the recorded issuance of an id", () => {
    // Retirement removes a live binding. It never re-points the issuance behind
    // it, which is how a retired number would quietly become another site's.
    const rebound = records(THREE).map((issuance) =>
      issuance.id === `${SYMBOL}-0002`
        ? issuanceOf(issuance.id, "f".repeat(12), "e".repeat(12))
        : issuance,
    );
    expect(() =>
      assertMonotonicAdvance({
        next: rebound,
        priorLedger: prior,
        priorBaseline: checkpoint,
        operation: "`-- ledger`",
      }),
    ).toThrow(/a recorded binding is immutable/);
  });

  it("refuses one id offered for two sites in a single write", () => {
    expect(() =>
      assertMonotonicAdvance({
        next: [
          ...records(THREE),
          issuanceOf(`${SYMBOL}-0002`, "f".repeat(12), "e".repeat(12)),
        ],
        priorLedger: null,
        priorBaseline: null,
        operation: "`-- ledger`",
      }),
    ).toThrow(/two different sites at once/);
  });

  it("allows anything when there is no prior state to protect", () => {
    expect(() =>
      assertMonotonicAdvance({
        next: records([`${SYMBOL}-0001`]),
        priorLedger: null,
        priorBaseline: null,
        operation: "`-- bootstrap`",
      }),
    ).not.toThrow();
  });
});

describe("exact issued membership survives a round trip", () => {
  it("formats ascending indexes as compact ranges", () => {
    expect(formatIndexRanges([1, 2, 3, 5, 7, 8])).toBe("1-3,5,7-8");
    expect(formatIndexRanges([4, 2, 3])).toBe("2-4");
    expect(formatIndexRanges([9])).toBe("9");
    expect(formatIndexRanges([])).toBe("");
  });

  it("reads them back as exactly the same set", () => {
    for (const indexes of [[1], [1, 2, 3], [1, 3, 5], [2, 3, 4, 9, 10]]) {
      expect(parseIndexRanges(formatIndexRanges(indexes))).toStrictEqual(
        indexes,
      );
    }
  });

  it("names every id a checkpoint attests, which is what a maximum cannot", () => {
    const checkpoint = baselineOf(
      records([`${SYMBOL}-0001`, `${SYMBOL}-0003`, "openingBeat-0002"]),
    );
    expect(checkpoint.issuedIndexes).toStrictEqual({
      openingBeat: "2",
      [SYMBOL]: "1,3",
    });
    expect(attestedIds(checkpoint)).toStrictEqual([
      "openingBeat-0002",
      `${SYMBOL}-0001`,
      `${SYMBOL}-0003`,
    ]);
    // 0002 was never issued, so it is not attested and stays allocatable; the
    // high-water mark alone could not express that.
    expect(attestedIds(checkpoint)).not.toContain(`${SYMBOL}-0002`);
  });
});

describe("anchor paths are one coupled set, or none", () => {
  const complete = {
    PROSE_ANCHOR_FILE: "/scratch/anchors.json",
    PROSE_ANCHOR_LEDGER_FILE: "/scratch/ledger.json",
    PROSE_ANCHOR_BASELINE_FILE: "/scratch/baseline.json",
  };

  it("uses the repository's own files when nothing is overridden", () => {
    const paths = resolveAnchorPaths({});
    expect(paths.overridden).toBe(false);
    expect(paths.anchors).toBe(DEFAULT_ANCHOR_PATHS.anchors);
    expect(paths.ledger).toBe(DEFAULT_ANCHOR_PATHS.ledger);
    expect(paths.baseline).toBe(DEFAULT_ANCHOR_PATHS.baseline);
  });

  it("accepts a complete override", () => {
    const paths = resolveAnchorPaths(complete);
    expect(paths.overridden).toBe(true);
    expect(paths.ledger).toBe("/scratch/ledger.json");
  });

  it("refuses every partial combination, naming what is missing", () => {
    // Overriding only the sidecar was reproduced making a disposable probe
    // absorb a scratch id into the CANONICAL ledger and checkpoint.
    for (const omitted of Object.keys(complete)) {
      const partial = { ...complete, [omitted]: undefined };
      expect(() => resolveAnchorPaths(partial)).toThrow(
        /Partial anchor path override/,
      );
      expect(() => resolveAnchorPaths(partial)).toThrow(new RegExp(omitted));
    }
  });

  it("treats an empty value as not set", () => {
    expect(() =>
      resolveAnchorPaths({ ...complete, PROSE_ANCHOR_FILE: "   " }),
    ).toThrow(/Partial anchor path override/);
  });

  it("refuses an override aimed back at a repository file", () => {
    expect(() =>
      resolveAnchorPaths({
        ...complete,
        PROSE_ANCHOR_LEDGER_FILE: DEFAULT_ANCHOR_PATHS.ledger,
      }),
    ).toThrow(/resolves to the repository's own/);
  });

  it("refuses two overrides that name the same file", () => {
    expect(() =>
      resolveAnchorPaths({
        ...complete,
        PROSE_ANCHOR_BASELINE_FILE: complete.PROSE_ANCHOR_LEDGER_FILE,
      }),
    ).toThrow(/three distinct files/);
  });
});
