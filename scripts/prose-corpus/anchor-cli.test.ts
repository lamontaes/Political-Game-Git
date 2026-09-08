import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { issuedDigestV1 as v1Digest } from "./anchor-history";

/**
 * The corruptions, driven through the command an operator actually runs.
 *
 * This file exists because the previous round's regressions all called the
 * mint helper directly with well-typed arguments, and every reproduced failure
 * lived somewhere that shape of test cannot reach: in the loader's defaults,
 * in the order two files were written, and in a validation path that never
 * looked at permanence at all. A helper handed a valid `string[]` cannot
 * reproduce a ledger that is missing, null-valued, or one entry short.
 *
 * So each case here spawns `corpus:prose` as a child process and asserts on
 * its exit code and its effect on disk. The CLI is pointed at disposable
 * copies through the documented path override, so nothing here reads or writes
 * the repository's own sidecar, ledger, or checkpoint — and because the
 * override only relocates the files, every one of these runs goes through the
 * same validation the real command does.
 *
 * The reference behaviour these pin, reproduced at the production CLI before
 * the repair: mint a synthetic id, retire it, then add unrelated text. With an
 * intact ledger the new text correctly took the next number. With the ledger
 * missing, with its `issued` absent, null or a bare string, or with only the
 * retired entry deleted, the run exited 0 and handed the new text the retired
 * number instead.
 */

const REPO = process.cwd();
const LIVE_ANCHORS = "scripts/prose-corpus/computed-anchors.json";
const LIVE_LEDGER = "scripts/prose-corpus/computed-anchor-ledger.json";
const LIVE_BASELINE = "scripts/prose-corpus/computed-anchor-baseline.json";

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true });
});

interface Scratch {
  readonly anchors: string;
  readonly ledger: string;
  readonly baseline: string;
}

/** Disposable copies of the real trio. Never the originals. */
function scratch(): Scratch {
  const dir = mkdtempSync(join(tmpdir(), "anchor-cli-"));
  dirs.push(dir);
  const paths = {
    anchors: join(dir, "computed-anchors.json"),
    ledger: join(dir, "computed-anchor-ledger.json"),
    baseline: join(dir, "computed-anchor-baseline.json"),
  };
  copyFileSync(join(REPO, LIVE_ANCHORS), paths.anchors);
  copyFileSync(join(REPO, LIVE_LEDGER), paths.ledger);
  copyFileSync(join(REPO, LIVE_BASELINE), paths.baseline);
  return paths;
}

function run(
  mode: string,
  paths: Scratch,
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/prose-corpus/cli.ts", mode],
    {
      cwd: REPO,
      encoding: "utf8",
      env: {
        ...process.env,
        PROSE_ANCHOR_FILE: paths.anchors,
        PROSE_ANCHOR_LEDGER_FILE: paths.ledger,
        PROSE_ANCHOR_BASELINE_FILE: paths.baseline,
      },
    },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function readJson(path: string): { issued?: unknown; anchors?: unknown } {
  return JSON.parse(readFileSync(path, "utf8")) as {
    issued?: unknown;
    anchors?: unknown;
  };
}

/** One ledger record: an issued id and the binding history recorded for it. */
interface Issuance {
  id: string;
  site?: string;
  text?: string;
  unknown?: string[];
}

function issuances(path: string): Issuance[] {
  return readJson(path).issued as Issuance[];
}

function issuedIds(path: string): string[] {
  return issuances(path).map((issuance) => issuance.id);
}

/** Surgically remove one issued id, leaving the file otherwise valid. */
function dropIssued(path: string, id: string): void {
  editLedger(path, (body) => {
    body.issued = (body.issued as Issuance[]).filter(
      (issuance) => issuance.id !== id,
    );
  });
}

function editLedger(
  path: string,
  edit: (body: Record<string, unknown>) => void,
): void {
  const body = JSON.parse(readFileSync(path, "utf8")) as Record<
    string,
    unknown
  >;
  edit(body);
  writeFileSync(path, JSON.stringify(body, null, 2));
}

/** A retired id: in the ledger, bound to no live site. */
function retiredId(paths: Scratch): string {
  const live = new Set(
    (readJson(paths.anchors).anchors as { anchor: string }[]).map(
      (anchor) => anchor.anchor,
    ),
  );
  const burned = issuedIds(paths.ledger).find((id) => !live.has(id));
  if (!burned) throw new Error("fixture has no retired id to work with");
  return burned;
}

const SLOW = { timeout: 120_000 };

describe("the production CLI on intact history", () => {
  it("runs clean and changes no identity", SLOW, () => {
    const paths = scratch();
    const before = readJson(paths.anchors).anchors as unknown[];
    const result = run("anchors", paths);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    // A no-op mint: nothing minted, reworded or retired, and the ledger did
    // not grow by a single id.
    expect(result.stdout).toMatch(/0 minted, 0 reworded, 0 retired/);
    expect(result.stdout).toMatch(/\+0 newly reserved/);

    // Identity compared as a set, not as bytes. The committed sidecar is not
    // in the canonical sort order — a hand-renumbering upstream left one
    // anchor out of position — so a mint rewrites the file's ORDER while
    // binding every id to exactly the text it was already bound to. Ordering
    // is not identity, and this asserts the part that is.
    const after = readJson(paths.anchors).anchors as unknown[];
    const key = (list: unknown[]) =>
      JSON.stringify(
        [...(list as Record<string, unknown>[])]
          .map((anchor) => [
            anchor.anchor,
            anchor.text,
            anchor.textRevision,
            anchor.occurrence,
          ])
          .sort(),
      );
    expect(key(after)).toBe(key(before));

    // And it says out loud that it is not reading the repository's own files.
    expect(result.stdout).toMatch(/anchor paths are overridden by environment/);
  });
});

describe("the production CLI refuses lost or malformed established history", () => {
  /** Every refusal must leave the sidecar exactly as it found it. */
  function expectRefusalWithoutWriting(
    paths: Scratch,
    pattern: RegExp,
    mode = "anchors",
  ): void {
    const before = readFileSync(paths.anchors, "utf8");
    const result = run(mode, paths);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(pattern);
    expect(readFileSync(paths.anchors, "utf8")).toBe(before);
  }

  it(
    "refuses a missing ledger instead of re-seeding from live anchors",
    SLOW,
    () => {
      const paths = scratch();
      unlinkSync(paths.ledger);
      expectRefusalWithoutWriting(paths, /lost-ledger/);
    },
  );

  it("refuses when exactly one retired entry was removed", SLOW, () => {
    // The surgical truncation. The ledger still parses and still validates;
    // the independently retained checkpoint is what catches it.
    const paths = scratch();
    const burned = retiredId(paths);
    dropIssued(paths.ledger, burned);
    expectRefusalWithoutWriting(paths, /history-mismatch/);
  });

  it("refuses a missing, null, or string `issued`", SLOW, () => {
    for (const issued of [undefined, null, "recapSentence-0001"]) {
      const paths = scratch();
      editLedger(paths.ledger, (body) => {
        if (issued === undefined) delete body.issued;
        else body.issued = issued;
      });
      expectRefusalWithoutWriting(paths, /no `issued` array/);
    }
  });

  it("refuses entries that are not anchor ids", SLOW, () => {
    const paths = scratch();
    editLedger(paths.ledger, (body) => {
      (body.issued as unknown[]).push("not an id");
    });
    expectRefusalWithoutWriting(paths, /an issuance record was expected/);

    // And a record whose id is not an id.
    const malformed = scratch();
    editLedger(malformed.ledger, (body) => {
      (body.issued as Issuance[]).push({
        id: "not an id",
        unknown: ["site", "text"],
      });
    });
    expectRefusalWithoutWriting(malformed, /not an anchor id/);
  });

  it("refuses a duplicated ledger entry", SLOW, () => {
    const paths = scratch();
    editLedger(paths.ledger, (body) => {
      const issued = body.issued as Issuance[];
      issued.push(issued[0]!);
    });
    expectRefusalWithoutWriting(paths, /more than once/);
  });

  it(
    "keeps refusing an empty file, truncated JSON, and an unknown schema",
    SLOW,
    () => {
      const empty = scratch();
      writeFileSync(empty.ledger, "");
      expectRefusalWithoutWriting(empty, /is empty/);

      const truncated = scratch();
      writeFileSync(truncated.ledger, '{"schema": 1, "iss');
      expectRefusalWithoutWriting(truncated, /truncated or corrupt/);

      const unknown = scratch();
      editLedger(unknown.ledger, (body) => {
        body.schema = 99;
      });
      expectRefusalWithoutWriting(unknown, /schema 99/);
    },
  );

  it("refuses a missing checkpoint behind an intact ledger", SLOW, () => {
    const paths = scratch();
    unlinkSync(paths.baseline);
    expectRefusalWithoutWriting(paths, /lost-baseline/);
  });

  it(
    "refuses a live id the ledger never absorbed, naming the explicit remedy",
    SLOW,
    () => {
      // The lagging state as it really arises: another branch's anchor lands
      // in the sidecar while ledger and checkpoint still agree with each other
      // and simply predate it. Built by adding to the sidecar rather than by
      // subtracting from the ledger, so the only finding is the lagging one.
      const paths = scratch();
      const body = JSON.parse(readFileSync(paths.anchors, "utf8")) as {
        anchors: Record<string, unknown>[];
      };
      body.anchors.push({
        anchor: "recapSentence-0091",
        sourcePath: "src/presentation/life-narration.ts",
        symbol: "recapSentence",
        text: "Another branch's sentence, not yet absorbed.",
        occurrence: 0,
        textRevision: "b".repeat(12),
      });
      writeFileSync(paths.anchors, JSON.stringify(body, null, 2));

      expectRefusalWithoutWriting(paths, /unreserved-live-id/);
      const again = run("anchors", paths);
      expect(again.stderr).toMatch(/-- ledger/);
      // And the named remedy actually resolves it.
      expect(run("ledger", paths).status).toBe(0);
      expect(run("anchors", paths).status).toBe(0);
    },
  );

  it(
    "refuses one id bound to two live sites, before writing anything",
    SLOW,
    () => {
      const paths = scratch();
      const body = JSON.parse(readFileSync(paths.anchors, "utf8")) as {
        anchors: { anchor: string; symbol: string }[];
      };
      const victim = body.anchors[0]!;
      const other = body.anchors.find(
        (anchor) =>
          anchor.symbol === victim.symbol && anchor.anchor !== victim.anchor,
      )!;
      other.anchor = victim.anchor;
      writeFileSync(paths.anchors, JSON.stringify(body, null, 2));

      const before = readFileSync(paths.anchors, "utf8");
      const result = run("anchors", paths);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(
        /duplicate-live-id|bound to more than one live site/,
      );
      // Under the defect this exited 0 and the sidecar came back one anchor
      // SHORTER: the anchors were collected into a map keyed by id, so the
      // second binding overwrote the first and vanished, reported as neither
      // retired nor changed. A later run then re-minted that site a brand-new
      // number, silently detaching it from its recorded review.
      expect(readFileSync(paths.anchors, "utf8")).toBe(before);
    },
  );
});

describe("the validation path verifies permanence, read-only", () => {
  it("fails `check` on an emptied ledger and does not repair it", SLOW, () => {
    // An emptied ledger passed `corpus:prose check` with exit 0 before this
    // repair: nothing on that path looked at allocation history at all.
    const paths = scratch();
    editLedger(paths.ledger, (body) => {
      body.issued = [];
    });
    const before = readFileSync(paths.ledger, "utf8");
    const result = run("check", paths);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/allocation history is not intact/i);
    // A validator that rewrites what it validates cannot be trusted to have
    // found anything. The ledger is left exactly as it was.
    expect(readFileSync(paths.ledger, "utf8")).toBe(before);
  });
});

describe("bootstrap and recovery are explicit and bounded", () => {
  it("refuses to bootstrap over existing history", SLOW, () => {
    const paths = scratch();
    const before = readFileSync(paths.ledger, "utf8");
    const result = run("bootstrap", paths);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/already has allocation history/);
    expect(readFileSync(paths.ledger, "utf8")).toBe(before);
  });

  it(
    "refuses to bootstrap an ESTABLISHED lineage whose history is missing",
    SLOW,
    () => {
      // The controlling 128A3 blocker. As shipped this exited 0 and seeded a
      // new lineage from the live sidecar alone — count 420 to 394, the
      // RETURN_SUMMARY high-water 23 to 22 — after which an unrelated mint was
      // handed the retired RETURN_SUMMARY-0023. The only guard was a printed
      // warning, and loss of established history became a fresh lineage through
      // an ordinary documented command.
      const paths = scratch();
      unlinkSync(paths.ledger);
      unlinkSync(paths.baseline);
      const before = readFileSync(paths.anchors, "utf8");

      const result = run("bootstrap", paths);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/HAS an established anchor lineage/);
      expect(result.stderr).toMatch(
        /not evidence that nothing was ever issued/,
      );
      // Fails closed, and names the restoration remedy rather than inventing a
      // lineage: neither history file is created, the sidecar is untouched.
      expect(existsSync(paths.ledger)).toBe(false);
      expect(existsSync(paths.baseline)).toBe(false);
      expect(readFileSync(paths.anchors, "utf8")).toBe(before);
      expect(result.stderr).toMatch(/restore/i);

      // And a mint still refuses, so nothing downstream quietly proceeds.
      expect(run("anchors", paths).status).not.toBe(0);
    },
  );

  it(
    "establishes only an EMPTY lineage, for a project that has issued nothing",
    SLOW,
    () => {
      // Positive evidence of freshness: no history files AND no live binding.
      // Bootstrap seeds nothing from live ids at all now, so even reached in
      // error it cannot free a number or lower a mark.
      const paths = scratch();
      unlinkSync(paths.ledger);
      unlinkSync(paths.baseline);
      unlinkSync(paths.anchors);

      const result = run("bootstrap", paths);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/EMPTY allocation lineage/);
      expect(result.stdout).toMatch(/Nothing was seeded from live bindings/);
      expect(issuances(paths.ledger)).toStrictEqual([]);
      expect(
        (JSON.parse(readFileSync(paths.baseline, "utf8")) as { count: number })
          .count,
      ).toBe(0);

      // A genuinely fresh project is usable: the first mint allocates this
      // lineage's first ids, from the bottom.
      const mint = run("anchors", paths);
      expect(mint.status).toBe(0);
      expect(issuedIds(paths.ledger)).toContain("recapSentence-0001");
    },
  );

  it("refuses to bootstrap over a sidecar it cannot read", SLOW, () => {
    // A sidecar that is present but corrupt is not an absent one, and must not
    // be read as "no live bindings, therefore fresh".
    const paths = scratch();
    unlinkSync(paths.ledger);
    unlinkSync(paths.baseline);
    writeFileSync(paths.anchors, '{"schema": 1, "anch');
    const result = run("bootstrap", paths);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/truncated or corrupt/);
    expect(existsSync(paths.ledger)).toBe(false);
  });

  // 128R2 supersedes the 128R1 behaviour this replaces. Re-deriving a
  // checkpoint from a ledger with nothing attesting it was reproduced doing
  // real damage: delete the checkpoint, shorten the ledger by one retired id,
  // recover, and the RETURN_SUMMARY high-water fell from 23 to 22 — after
  // which unrelated prose took the retired number.
  it(
    "refuses to re-derive a checkpoint that has nothing attesting it",
    SLOW,
    () => {
      const paths = scratch();
      const ledgerBefore = readFileSync(paths.ledger, "utf8");
      unlinkSync(paths.baseline);
      const result = run("recover", paths);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/nothing independent attesting/);
      // Fails closed and repairs nothing: no checkpoint invented, ledger intact.
      expect(existsSync(paths.baseline)).toBe(false);
      expect(readFileSync(paths.ledger, "utf8")).toBe(ledgerBefore);
    },
  );

  it(
    "refuses even when the ledger it would bless has been shortened",
    SLOW,
    () => {
      const paths = scratch();
      const burned = retiredId(paths);
      dropIssued(paths.ledger, burned);
      unlinkSync(paths.baseline);
      expect(run("recover", paths).status).not.toBe(0);
      expect(existsSync(paths.baseline)).toBe(false);
      // And the retired id stays unallocatable, because a mint refuses too.
      expect(run("anchors", paths).stderr).toMatch(/lost-baseline/);
    },
  );

  it("refuses to recover a pair that is present and disagrees", SLOW, () => {
    // This is the case where recovery would launder a truncation into a new
    // baseline. Both files exist, so neither can be treated as the true one.
    const paths = scratch();
    const burned = retiredId(paths);
    dropIssued(paths.ledger, burned);
    const before = readFileSync(paths.baseline, "utf8");
    const result = run("recover", paths);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/would launder a truncation/);
    expect(readFileSync(paths.baseline, "utf8")).toBe(before);
  });

  it(
    "re-derives a checkpoint a mint was interrupted before writing",
    SLOW,
    () => {
      // The other half-commit: the ledger landed, the checkpoint did not. History
      // only grew and no symbol went backwards, so the checkpoint can record what
      // the ledger already durably says. This is the case that would otherwise
      // wedge a workspace after a crash between the two writes.
      const paths = scratch();
      editLedger(paths.ledger, (body) => {
        (body.issued as Issuance[]).push({
          id: "recapSentence-9998",
          unknown: ["site", "text"],
        });
      });
      const refused = run("anchors", paths);
      expect(refused.status).not.toBe(0);
      expect(refused.stderr).toMatch(/history-mismatch/);

      const result = run("recover", paths);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(
        /interrupted between its two history writes/,
      );
      expect(run("anchors", paths).status).toBe(0);
    },
  );
});

/* -------------------------------------------------------------------------- */
/* 128R2                                                                      */
/* -------------------------------------------------------------------------- */

/** Every authoritative file, hashed, so "zero writes" is an assertion. */
function fingerprint(paths: Scratch): string {
  return [paths.anchors, paths.ledger, paths.baseline]
    .map((path) => (existsSync(path) ? readFileSync(path, "utf8") : "<absent>"))
    .join("\u0000");
}

describe("`-- ledger` absorbs, and never re-bases trust downward", () => {
  it("refuses a surgically shortened ledger and writes nothing", SLOW, () => {
    // The controlling 128A2 blocker. As shipped this exited 0, rewrote the
    // checkpoint DOWN to agree with the shortened ledger (count 420 to 419,
    // RETURN_SUMMARY high-water 23 to 22), and the next mint then handed
    // RETURN_SUMMARY-0023 to unrelated prose.
    const paths = scratch();
    const burned = retiredId(paths);
    dropIssued(paths.ledger, burned);
    const before = fingerprint(paths);

    const result = run("ledger", paths);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Refusing to absorb/);
    expect(result.stderr).toMatch(/history-mismatch/);
    // Zero writes: not the ledger, not the checkpoint, not the sidecar.
    expect(fingerprint(paths)).toBe(before);
  });

  it("leaves the retired id unallocatable after that attack", SLOW, () => {
    const paths = scratch();
    const burned = retiredId(paths);
    dropIssued(paths.ledger, burned);
    run("ledger", paths);
    const mint = run("anchors", paths);
    expect(mint.status).not.toBe(0);
    expect(mint.stderr).toMatch(/history-mismatch/);
    // The checkpoint still attests the larger history it always did.
    const checkpoint = JSON.parse(readFileSync(paths.baseline, "utf8")) as {
      count: number;
    };
    expect(checkpoint.count).toBeGreaterThan(issuances(paths.ledger).length);
  });

  it(
    "absorbs a genuinely new live anchor and advances both files",
    SLOW,
    () => {
      // The post-merge workflow the repair must keep working: another branch's
      // minted anchor arrives in the sidecar and is deliberately absorbed.
      const paths = scratch();
      const body = JSON.parse(readFileSync(paths.anchors, "utf8")) as {
        anchors: Record<string, unknown>[];
      };
      body.anchors.push({
        anchor: "recapSentence-0090",
        sourcePath: "src/presentation/life-narration.ts",
        symbol: "recapSentence",
        text: "A sentence another branch minted before merging.",
        occurrence: 0,
        textRevision: "a".repeat(12),
      });
      writeFileSync(paths.anchors, JSON.stringify(body, null, 2));
      const sidecarBefore = readFileSync(paths.anchors, "utf8");
      const countBefore = issuances(paths.ledger).length;

      const result = run("ledger", paths);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/absorbed recapSentence-0090/);
      expect(issuances(paths.ledger).length).toBe(countBefore + 1);
      const checkpoint = JSON.parse(readFileSync(paths.baseline, "utf8")) as {
        count: number;
        highWater: Record<string, number>;
      };
      expect(checkpoint.count).toBe(countBefore + 1);
      expect(checkpoint.highWater.recapSentence).toBe(90);
      // `-- ledger` never writes the sidecar — that is what makes it safe to run
      // while another writer owns that file.
      expect(readFileSync(paths.anchors, "utf8")).toBe(sidecarBefore);
      // And a mint afterwards is unblocked.
      expect(run("anchors", paths).status).toBe(0);
    },
  );

  it("writes nothing when there is nothing new to absorb", SLOW, () => {
    const paths = scratch();
    const before = fingerprint(paths);
    const result = run("ledger", paths);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/already synchronised, nothing written/);
    expect(fingerprint(paths)).toBe(before);
  });
});

describe("live identities are validated before anything absorbs them", () => {
  /** Reproduced 128A2 shapes, each rejected before a single write. */
  const invalidBindings: [string, (anchor: Record<string, unknown>) => void][] =
    [
      ["a malformed id", (anchor) => (anchor.anchor = "not a valid id")],
      ["a non-string id", (anchor) => (anchor.anchor = 17)],
      ["an empty id", (anchor) => (anchor.anchor = "")],
      [
        "a symbol that disagrees with its own id",
        (anchor) => (anchor.symbol = "someOtherSymbol"),
      ],
      ["a negative occurrence", (anchor) => (anchor.occurrence = -1)],
      ["a non-integer occurrence", (anchor) => (anchor.occurrence = "first")],
      ["a missing text", (anchor) => delete anchor.text],
      ["a malformed textRevision", (anchor) => (anchor.textRevision = "nope")],
    ];

  for (const [label, corrupt] of invalidBindings) {
    it(`refuses ${label} before absorbing it`, SLOW, () => {
      // As shipped, `-- ledger` absorbed an invalid id into the ledger
      // verbatim; every later command then refused to load that ledger and
      // the workspace was wedged.
      const paths = scratch();
      const body = JSON.parse(readFileSync(paths.anchors, "utf8")) as {
        anchors: Record<string, unknown>[];
      };
      corrupt(body.anchors[0]!);
      writeFileSync(paths.anchors, JSON.stringify(body, null, 2));
      const before = fingerprint(paths);

      const result = run("ledger", paths);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/invalid live binding/);
      expect(fingerprint(paths)).toBe(before);
    });
  }

  it(
    "refuses a duplicate live identity on every consuming command",
    SLOW,
    () => {
      const paths = scratch();
      const body = JSON.parse(readFileSync(paths.anchors, "utf8")) as {
        anchors: { anchor: string; symbol: string }[];
      };
      const victim = body.anchors[0]!;
      const other = body.anchors.find(
        (anchor) =>
          anchor.symbol === victim.symbol && anchor.anchor !== victim.anchor,
      )!;
      other.anchor = victim.anchor;
      writeFileSync(paths.anchors, JSON.stringify(body, null, 2));
      const before = fingerprint(paths);

      for (const mode of ["ledger", "anchors", "recover", "check"]) {
        const result = run(mode, paths);
        expect(result.status, `${mode} should refuse`).not.toBe(0);
        expect(result.stderr).toMatch(/bound to more than one live site/);
      }
      expect(fingerprint(paths)).toBe(before);
    },
  );

  it(
    "still accepts a symbol that legitimately repeats one literal",
    SLOW,
    () => {
      // The duplicate rule is about repeated IDS and repeated coordinates, never
      // about repeated text. The committed corpus contains repeated literals
      // separated by `occurrence`, and a clean run over it proves they survive.
      const paths = scratch();
      const repeated = (
        readJson(paths.anchors).anchors as { occurrence: number }[]
      ).some((anchor) => anchor.occurrence > 0);
      expect(repeated).toBe(true);
      expect(run("ledger", paths).status).toBe(0);
      expect(run("anchors", paths).status).toBe(0);
    },
  );
});

describe("path overrides are one coupled set, or none", () => {
  const DEFAULTS = {
    anchors: LIVE_ANCHORS,
    ledger: LIVE_LEDGER,
    baseline: LIVE_BASELINE,
  };

  function runWith(
    mode: string,
    env: Record<string, string>,
  ): { status: number; stdout: string; stderr: string } {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/prose-corpus/cli.ts", mode],
      { cwd: REPO, encoding: "utf8", env: { ...process.env, ...env } },
    );
    return {
      status: result.status ?? -1,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }

  /** The repository's own three files, hashed. */
  function defaultFingerprint(): string {
    return Object.values(DEFAULTS)
      .map((path) => readFileSync(join(REPO, path), "utf8"))
      .join("\u0000");
  }

  it(
    "refuses every partial combination without touching the defaults",
    SLOW,
    () => {
      const paths = scratch();
      const all = {
        PROSE_ANCHOR_FILE: paths.anchors,
        PROSE_ANCHOR_LEDGER_FILE: paths.ledger,
        PROSE_ANCHOR_BASELINE_FILE: paths.baseline,
      };
      const before = defaultFingerprint();

      for (const omitted of Object.keys(all) as (keyof typeof all)[]) {
        const partial = { ...all };
        delete partial[omitted];
        for (const mode of ["ledger", "anchors", "recover", "bootstrap"]) {
          const result = runWith(mode, partial);
          expect(result.status, `${mode} without ${omitted}`).not.toBe(0);
          expect(result.stderr).toMatch(/Partial anchor path override/);
          expect(result.stderr).toMatch(new RegExp(omitted));
        }
      }
      // Overriding only the sidecar was reproduced writing a scratch id into the
      // CANONICAL ledger and checkpoint. Nothing here may touch them.
      expect(defaultFingerprint()).toBe(before);
    },
  );

  it("refuses an override aimed back at a repository file", SLOW, () => {
    const paths = scratch();
    const result = runWith("ledger", {
      PROSE_ANCHOR_FILE: join(REPO, LIVE_ANCHORS),
      PROSE_ANCHOR_LEDGER_FILE: paths.ledger,
      PROSE_ANCHOR_BASELINE_FILE: paths.baseline,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/resolves to the repository's own/);
  });

  it(
    "runs the real CLI on a complete bundle, leaving defaults byte-identical",
    SLOW,
    () => {
      const paths = scratch();
      const before = defaultFingerprint();
      const result = run("anchors", paths);
      expect(result.status).toBe(0);
      // The whole coupled set is printed, not just whichever path differs.
      expect(result.stdout).toMatch(/sidecar {4}/);
      expect(result.stdout).toMatch(/ledger {5}/);
      expect(result.stdout).toMatch(/checkpoint /);
      expect(defaultFingerprint()).toBe(before);
    },
  );

  it(
    "refuses a missing overridden sidecar rather than reading it as empty",
    SLOW,
    () => {
      const paths = scratch();
      unlinkSync(paths.anchors);
      const before = fingerprint(paths);
      const result = run("ledger", paths);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/does not exist, but this project has/);
      expect(fingerprint(paths)).toBe(before);
    },
  );
});

/* -------------------------------------------------------------------------- */
/* 128R3                                                                      */
/* -------------------------------------------------------------------------- */

/** The three defaults, hashed, so "canonical untouched" is an assertion. */
function repoTrio(): string {
  return [LIVE_ANCHORS, LIVE_LEDGER, LIVE_BASELINE]
    .map((path) => readFileSync(join(REPO, path), "utf8"))
    .join("\u0000");
}

describe("recovery proves a superset, and is not satisfied by growth", () => {
  /**
   * The controlling 128A3 recovery blocker, built exactly as it was reproduced.
   *
   * One issued member is removed and three strictly later ids are added, so the
   * attested count RISES and every per-symbol high-water mark RISES. Under the
   * previous round this read as ordinary growth: `-- recover` exited 0, rewrote
   * the checkpoint, and printed "every id the old checkpoint attested is still
   * issued" while one of them was gone.
   *
   * The tampered file is well-formed on its face. That matters — a malformed
   * ledger would be refused by the loader and would prove nothing about the
   * direction rule.
   */
  function membershipLossDisguisedAsGrowth(paths: Scratch): string {
    const burned = retiredId(paths);
    const symbol = burned.slice(0, burned.lastIndexOf("-"));
    editLedger(paths.ledger, (body) => {
      const kept = (body.issued as Issuance[]).filter(
        (issuance) => issuance.id !== burned,
      );
      for (const index of [9001, 9002, 9003]) {
        kept.push({
          id: `${symbol}-${index}`,
          site: "a".repeat(12),
          text: "b".repeat(12),
        });
      }
      body.issued = kept.sort((left, right) =>
        left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
      );
    });
    return burned;
  }

  it(
    "refuses `-- recover` on a set that grew while dropping a member",
    SLOW,
    () => {
      const paths = scratch();
      const attested = JSON.parse(readFileSync(paths.baseline, "utf8")) as {
        count: number;
      };
      const burned = membershipLossDisguisedAsGrowth(paths);
      const after = issuances(paths.ledger);
      // The disguise, asserted rather than assumed: both measures really do rise.
      expect(after.length).toBeGreaterThan(attested.count);
      expect(after.some((issuance) => issuance.id === burned)).toBe(false);

      const before = fingerprint(paths);
      const result = run("recover", paths);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(
        /membership loss wearing growth as a disguise/,
      );
      expect(result.stderr).toMatch(new RegExp(burned));
      // Zero authority writes.
      expect(fingerprint(paths)).toBe(before);
    },
  );

  it("refuses `-- ledger` and `-- anchors` in the same state", SLOW, () => {
    const paths = scratch();
    const burned = membershipLossDisguisedAsGrowth(paths);
    const before = fingerprint(paths);
    for (const mode of ["ledger", "anchors", "check"]) {
      const result = run(mode, paths);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/history-regressed|history-mismatch/);
    }
    expect(fingerprint(paths)).toBe(before);
    // And the dropped id stays unallocatable throughout.
    expect(issuedIds(paths.ledger)).not.toContain(burned);
    expect(
      (
        JSON.parse(readFileSync(paths.anchors, "utf8")) as {
          anchors: { anchor: string }[];
        }
      ).anchors.some((anchor) => anchor.anchor === burned),
    ).toBe(false);
  });

  it("still re-derives a checkpoint for a genuine interruption", SLOW, () => {
    // The banked forward case must survive the new rule: a ledger that only
    // GREW, keeping every attested member, is still repairable.
    const paths = scratch();
    editLedger(paths.ledger, (body) => {
      (body.issued as Issuance[]).push({
        id: "recapSentence-9998",
        unknown: ["site", "text"],
      });
    });
    const result = run("recover", paths);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/checked id by id/);
    expect(run("anchors", paths).status).toBe(0);
  });
});

describe("a recorded issuance is immutable, and a live binding is checked", () => {
  it("refuses a live id whose recorded site is a different one", SLOW, () => {
    // The composition outcome the contract forbids: a previously issued id
    // becoming valid for a site it was not issued for.
    const paths = scratch();
    const live = (
      JSON.parse(readFileSync(paths.anchors, "utf8")) as {
        anchors: { anchor: string }[];
      }
    ).anchors[0]!.anchor;
    editLedger(paths.ledger, (body) => {
      for (const issuance of body.issued as Issuance[]) {
        if (issuance.id === live) issuance.site = "f".repeat(12);
      }
    });
    // Written with its own consistent checkpoint, so the digest agrees and the
    // binding rule is what has to catch this.
    const rebuilt = run("recover", paths);
    expect(rebuilt.status).not.toBe(0);

    const result = run("check", paths);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/binding-mismatch|history-mismatch/);
  });

  it("refuses a live id whose provenance was erased to unknown", SLOW, () => {
    const paths = scratch();
    const live = (
      JSON.parse(readFileSync(paths.anchors, "utf8")) as {
        anchors: { anchor: string }[];
      }
    ).anchors[0]!.anchor;
    editLedger(paths.ledger, (body) => {
      body.issued = (body.issued as Issuance[]).map((issuance) =>
        issuance.id === live
          ? { id: live, unknown: ["site", "text"] }
          : issuance,
      );
    });
    const result = run("check", paths);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/unattested-live-binding|history-mismatch/);
  });
});

describe("the one-way migration off the id-only schema", () => {
  /** The inherited pair, as it was actually committed before this repair. */
  function asV1(paths: Scratch): void {
    const ledger = JSON.parse(readFileSync(paths.ledger, "utf8")) as {
      issued: Issuance[];
    };
    const ids = ledger.issued.map((issuance) => issuance.id).sort();
    writeFileSync(
      paths.ledger,
      `${JSON.stringify({ schema: 1, note: "inherited", issued: ids }, null, 2)}\n`,
    );
    const baseline = JSON.parse(readFileSync(paths.baseline, "utf8")) as {
      highWater: Record<string, number>;
    };
    writeFileSync(
      paths.baseline,
      `${JSON.stringify(
        {
          schema: 1,
          note: "inherited",
          count: ids.length,
          digest: v1Digest(ids),
          highWater: baseline.highWater,
        },
        null,
        2,
      )}\n`,
    );
  }

  it("refuses every normal command until the migration is run", SLOW, () => {
    const paths = scratch();
    asV1(paths);
    const before = fingerprint(paths);
    for (const mode of ["anchors", "ledger", "check", "recover"]) {
      const result = run(mode, paths);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/-- migrate/);
    }
    expect(fingerprint(paths)).toBe(before);
  });

  it(
    "carries membership forward exactly, and records what it cannot know",
    SLOW,
    () => {
      const paths = scratch();
      const liveIds = new Set(
        (
          JSON.parse(readFileSync(paths.anchors, "utf8")) as {
            anchors: { anchor: string }[];
          }
        ).anchors.map((anchor) => anchor.anchor),
      );
      const idsBefore = issuedIds(paths.ledger).sort();
      const sidecarBefore = readFileSync(paths.anchors, "utf8");
      asV1(paths);

      const result = run("migrate", paths);
      expect(result.status).toBe(0);
      // Membership is unchanged — a migration is not a repair and not a reset.
      expect(issuedIds(paths.ledger).sort()).toStrictEqual(idsBefore);
      // A live binding's coordinate is genuine evidence; a retired one's is gone
      // and is recorded as gone rather than filled in.
      for (const issuance of issuances(paths.ledger)) {
        if (liveIds.has(issuance.id)) {
          expect(issuance.site).toMatch(/^[0-9a-f]{12}$/);
        } else {
          expect(issuance.unknown).toStrictEqual(["site", "text"]);
        }
      }
      expect(result.stdout).toMatch(/UNRECOVERABLE/);
      // The sidecar is not a migration target.
      expect(readFileSync(paths.anchors, "utf8")).toBe(sidecarBefore);
      // And the project works straight afterwards.
      expect(run("anchors", paths).status).toBe(0);
      expect(run("check", paths).status).toBe(0);
    },
  );

  it(
    "refuses to migrate an inherited pair that disagrees with itself",
    SLOW,
    () => {
      // Migration must not be the step that launders a truncation into a lineage.
      const paths = scratch();
      const burned = retiredId(paths);
      asV1(paths);
      editLedger(paths.ledger, (body) => {
        body.issued = (body.issued as unknown as string[]).filter(
          (id) => id !== burned,
        );
      });
      const before = fingerprint(paths);
      const result = run("migrate", paths);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/does not agree with itself/);
      expect(fingerprint(paths)).toBe(before);
    },
  );
});

describe("a path override may not reach canonical authority by alias", () => {
  /**
   * The isolation guarantee, tested against the filesystem rather than spelling.
   *
   * `resolve` is lexical. A symlink in a scratch directory pointing at the
   * repository's own ledger, and a scratch path whose PARENT is a link to
   * `scripts/prose-corpus`, both passed the "aimed back at a repository file"
   * guard and then read canonical authority — while the run printed that it
   * "does not read the repository's own files".
   */
  function aliasDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "anchor-alias-"));
    dirs.push(dir);
    return dir;
  }

  it("refuses symlinks aimed at each canonical file", SLOW, () => {
    const dir = aliasDir();
    const alias: Scratch = {
      anchors: join(dir, "a.json"),
      ledger: join(dir, "l.json"),
      baseline: join(dir, "b.json"),
    };
    symlinkSync(join(REPO, LIVE_ANCHORS), alias.anchors);
    symlinkSync(join(REPO, LIVE_LEDGER), alias.ledger);
    symlinkSync(join(REPO, LIVE_BASELINE), alias.baseline);

    const before = repoTrio();
    for (const mode of ["check", "ledger", "anchors", "recover", "bootstrap"]) {
      const result = run(mode, alias);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/resolves to the repository's own/);
      expect(result.stderr).toMatch(/symlink or aliased directory/);
    }
    expect(repoTrio()).toBe(before);
  });

  it("refuses paths reached through a symlinked parent directory", SLOW, () => {
    const dir = aliasDir();
    const linked = join(dir, "corpus");
    symlinkSync(join(REPO, "scripts/prose-corpus"), linked);
    const alias: Scratch = {
      anchors: join(linked, "computed-anchors.json"),
      ledger: join(linked, "computed-anchor-ledger.json"),
      baseline: join(linked, "computed-anchor-baseline.json"),
    };

    const before = repoTrio();
    for (const mode of ["check", "ledger", "anchors"]) {
      const result = run(mode, alias);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/resolves to the repository's own/);
    }
    expect(repoTrio()).toBe(before);
  });

  it("refuses two overrides that are aliases of one file", SLOW, () => {
    const dir = aliasDir();
    const real = join(dir, "one.json");
    copyFileSync(join(REPO, LIVE_LEDGER), real);
    const link = join(dir, "also-one.json");
    symlinkSync(real, link);
    const alias: Scratch = {
      anchors: join(dir, "anchors.json"),
      ledger: real,
      baseline: link,
    };
    copyFileSync(join(REPO, LIVE_ANCHORS), alias.anchors);

    const result = run("check", alias);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/resolve to the same file/);
  });

  it("still accepts an ordinary disposable bundle", SLOW, () => {
    // The guard must not have closed the door the overrides exist for.
    const paths = scratch();
    const before = repoTrio();
    expect(run("check", paths).status).toBe(0);
    expect(repoTrio()).toBe(before);
  });

  it(
    "accepts a bundle that merely LIVES under a symlinked directory",
    SLOW,
    () => {
      // Canonicalisation must reject aliases of canonical files, not every path
      // that happens to involve a link. A scratch bundle behind a linked parent is
      // still a scratch bundle.
      const paths = scratch();
      const dir = aliasDir();
      const linked = join(dir, "bundle");
      symlinkSync(
        paths.anchors.slice(0, paths.anchors.lastIndexOf("/")),
        linked,
      );
      const viaLink: Scratch = {
        anchors: join(linked, "computed-anchors.json"),
        ledger: join(linked, "computed-anchor-ledger.json"),
        baseline: join(linked, "computed-anchor-baseline.json"),
      };
      const result = run("check", viaLink);
      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
    },
  );
});
