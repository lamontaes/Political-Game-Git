import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

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
  const burned = (readJson(paths.ledger).issued as string[]).find(
    (id) => !live.has(id),
  );
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
    editLedger(paths.ledger, (body) => {
      body.issued = (body.issued as string[]).filter((id) => id !== burned);
    });
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
      (body.issued as string[]).push("not an id");
    });
    expectRefusalWithoutWriting(paths, /not anchor ids/);
  });

  it("refuses a duplicated ledger entry", SLOW, () => {
    const paths = scratch();
    editLedger(paths.ledger, (body) => {
      const issued = body.issued as string[];
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
    "bootstraps only when there is genuinely nothing, and says what it cannot know",
    SLOW,
    () => {
      const paths = scratch();
      unlinkSync(paths.ledger);
      unlinkSync(paths.baseline);
      const result = run("bootstrap", paths);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/records only ids that are ALIVE/);
      expect(existsSync(paths.ledger)).toBe(true);
      expect(existsSync(paths.baseline)).toBe(true);
      // And the project is usable again straight afterwards.
      expect(run("anchors", paths).status).toBe(0);
    },
  );

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
      editLedger(paths.ledger, (body) => {
        body.issued = (body.issued as string[]).filter((id) => id !== burned);
      });
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
    editLedger(paths.ledger, (body) => {
      body.issued = (body.issued as string[]).filter((id) => id !== burned);
    });
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
        (body.issued as string[]).push("recapSentence-9998");
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
    editLedger(paths.ledger, (body) => {
      body.issued = (body.issued as string[]).filter((id) => id !== burned);
    });
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
    editLedger(paths.ledger, (body) => {
      body.issued = (body.issued as string[]).filter((id) => id !== burned);
    });
    run("ledger", paths);
    const mint = run("anchors", paths);
    expect(mint.status).not.toBe(0);
    expect(mint.stderr).toMatch(/history-mismatch/);
    // The checkpoint still attests the larger history it always did.
    const checkpoint = JSON.parse(readFileSync(paths.baseline, "utf8")) as {
      count: number;
    };
    const ledger = readJson(paths.ledger).issued as string[];
    expect(checkpoint.count).toBeGreaterThan(ledger.length);
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
      const countBefore = (readJson(paths.ledger).issued as string[]).length;

      const result = run("ledger", paths);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/absorbed recapSentence-0090/);
      expect((readJson(paths.ledger).issued as string[]).length).toBe(
        countBefore + 1,
      );
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
    expect(result.stderr).toMatch(/points at the repository's own/);
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
