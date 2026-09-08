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
  atomicWriteFile,
  baselineOf,
  highWaterOf,
  issuedDigest,
  ledgerOf,
  loadAnchorBaseline,
  loadAnchorLedger,
  verifyAllocationHistory,
  writeAnchorBaseline,
  writeAnchorLedger,
  type AnchorBaseline,
  type AnchorLedger,
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

/** A written pair, the way a mint leaves one. */
function written(issued: readonly string[]): {
  ledgerPath: string;
  baselinePath: string;
} {
  const dir = tempDir();
  const ledgerPath = join(dir, "ledger.json");
  const baselinePath = join(dir, "baseline.json");
  const ledger = ledgerOf(issued);
  writeAnchorLedger(ledger, ledgerPath);
  writeAnchorBaseline(baselineOf(ledger.issued), baselinePath);
  return { ledgerPath, baselinePath };
}

function verify(
  ledger: AnchorLedger | null,
  baseline: AnchorBaseline | null,
  liveIds: readonly string[] = [],
) {
  return verifyAllocationHistory({ ledger, baseline, liveIds });
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
          schema: 1,
          note: "n",
          ...(issued === undefined ? {} : { issued }),
        }),
      );
      expect(() => loadAnchorLedger(path)).toThrow(/no `issued` array/);
    }
  });

  it("rejects entries that are not anchor ids", () => {
    const path = join(tempDir(), "ledger.json");
    writeFileSync(
      path,
      JSON.stringify({
        schema: 1,
        note: "n",
        issued: [`${SYMBOL}-0001`, "", 3],
      }),
    );
    expect(() => loadAnchorLedger(path)).toThrow(/not anchor ids/);
  });

  it("rejects a duplicated entry, per the declared de-duplication policy", () => {
    const path = join(tempDir(), "ledger.json");
    writeFileSync(
      path,
      JSON.stringify({
        schema: 1,
        note: "n",
        issued: [`${SYMBOL}-0001`, `${SYMBOL}-0001`],
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
    bad(
      { schema: 1, note: "n", digest: "0".repeat(16), highWater: {} },
      /count/,
    );
    bad(
      { schema: 1, note: "n", count: 1, digest: "nope", highWater: {} },
      /digest/,
    );
    bad(
      { schema: 1, note: "n", count: 1, digest: "0".repeat(16) },
      /highWater/,
    );
    bad(
      {
        schema: 1,
        note: "n",
        count: 1,
        digest: "0".repeat(16),
        highWater: { a: "x" },
      },
      /non-integer high-water/,
    );
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
    const lost = verify(null, baselineOf(THREE));
    expect(lost.map((problem) => problem.kind)).toStrictEqual(["lost-ledger"]);
    expect(lost[0]?.detail).toMatch(
      /cannot be re-seeded from the live sidecar/,
    );
  });

  it("detects exactly one retired id removed from a valid-schema ledger", () => {
    // The surgical case. The file still parses, still validates, and still
    // looks like a ledger; only the independently retained checkpoint knows
    // that it used to hold one more id.
    const checkpoint = baselineOf(THREE);
    const shortened = ledgerOf([`${SYMBOL}-0001`, `${SYMBOL}-0003`]);
    const problems = verify(shortened, checkpoint);
    expect(problems.map((problem) => problem.kind)).toStrictEqual([
      "history-mismatch",
    ]);
    expect(problems[0]?.detail).toMatch(/2 ids/);
    expect(problems[0]?.detail).toMatch(/attests 3 ids/);
  });

  it("detects a ledger whose per-symbol reach has gone backwards", () => {
    const checkpoint = baselineOf(THREE);
    const truncated = ledgerOf([`${SYMBOL}-0001`]);
    const kinds = verify(truncated, checkpoint).map((problem) => problem.kind);
    expect(kinds).toContain("history-regressed");
    expect(kinds).toContain("history-mismatch");
  });

  it("detects a missing checkpoint behind an otherwise intact ledger", () => {
    const problems = verify(ledgerOf(THREE), null);
    expect(problems.map((problem) => problem.kind)).toStrictEqual([
      "lost-baseline",
    ]);
  });

  it("passes an intact pair", () => {
    const ledger = ledgerOf(THREE);
    expect(verify(ledger, baselineOf(ledger.issued), THREE)).toStrictEqual([]);
  });

  it("detects a live id the ledger never absorbed, rather than seeding from it", () => {
    const ledger = ledgerOf(THREE);
    const problems = verify(ledger, baselineOf(ledger.issued), [
      ...THREE,
      `${SYMBOL}-0009`,
    ]);
    expect(problems.map((problem) => problem.kind)).toStrictEqual([
      "unreserved-live-id",
    ]);
    expect(problems[0]?.detail).toMatch(/-- ledger/);
  });

  it("detects one id bound to two live sites", () => {
    const ledger = ledgerOf(THREE);
    const problems = verify(ledger, baselineOf(ledger.issued), [
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
    const forged = ledgerOf([`${SYMBOL}-0001`]);
    expect(verify(forged, baselineOf(forged.issued))).toStrictEqual([]);
  });
});

describe("the allocator's floor is independent of the ledger", () => {
  it("keeps a mark the ledger has lost", () => {
    const checkpoint = baselineOf(THREE);
    const shortened = ledgerOf([`${SYMBOL}-0001`]);
    const history = allocationHistory(shortened, checkpoint);
    // Detection has already refused this state; the floor is the second,
    // independent guard, so that a shrunken ledger still cannot offer 0002 or
    // 0003 back even if it were somehow allocated against.
    expect(history.highWater[SYMBOL]).toBe(3);
  });

  it("takes the higher of the checkpoint's mark and the ledger's own reach", () => {
    const ledger = ledgerOf([...THREE, `${SYMBOL}-0009`]);
    const history = allocationHistory(ledger, baselineOf(THREE));
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
    writeAnchorLedger(ledgerOf(THREE), path);
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
    expect(baseline?.digest).toBe(issuedDigest(THREE));
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
    expect(baseline.digest).toBe(issuedDigest(ledger.issued));
    expect(baseline.highWater).toStrictEqual({
      openingBeat: 1,
      [SYMBOL]: 3,
    });
  });
});
