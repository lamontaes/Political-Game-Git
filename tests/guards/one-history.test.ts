import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import list from "./one-history-proxies.json";

/**
 * One history (owner: "history's exactly like I said, it's going through a
 * different system. There needs to be one. Everything needs to pull from the
 * same history"). The years before the start are being moved from a generated
 * proxy (buildDeepPast, deleted Oct 28) to the engines running them. Until each kind is
 * simulated, this guard holds the line:
 *
 *  - no new reader: the files in src/director, src/bench and
 *    src/core2/modules that read a proxy kind today are counted in
 *    one-history-proxies.json, and a count only goes down;
 *  - no reader once a simulated kind exists: a proxy whose `simulatedBy` is
 *    set may not be read at all, so its readers move with the change that
 *    sets it;
 *  - the proxy list only shrinks: a kind leaves it when its writer is gone.
 *
 * A read is the kind written as a string in the reader's source.
 */

const ROOT = path.resolve(__dirname, "../..");
const READER_DIRS = ["src/director", "src/bench", "src/core2/modules"];
/** The length of the proxy list when this guard began; it may only go down. */
const PROXY_CEILING = 1;

type Proxy = { kind: string; writer: string; simulatedBy: string | null };
const proxies = list.proxies as Proxy[];
const known = list.readers as Record<string, number>;

const quoted = (kind: string): RegExp =>
  new RegExp(`["'\`]${kind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`, "g");

/** Each quoted proxy kind in a source, once per occurrence; comments skipped. */
export function proxyReads(source: string, kinds: readonly string[]): string[] {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  return kinds.flatMap((kind) =>
    (code.match(quoted(kind)) ?? []).map(() => kind),
  );
}

function readers(): Map<string, string[]> {
  const files = execFileSync("git", ["ls-files", ...READER_DIRS], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (file) =>
        /\.(ts|tsx|mjs)$/.test(file) &&
        !/\.(test|spec|browser)\.(ts|tsx|mjs)$/.test(file),
    );
  const kinds = proxies.map((proxy) => proxy.kind);
  const out = new Map<string, string[]>();
  for (const file of files) {
    const reads = proxyReads(
      readFileSync(path.join(ROOT, file), "utf8"),
      kinds,
    );
    if (reads.length) out.set(file, reads);
  }
  return out;
}

describe("one history: readers move off the generated past", () => {
  const found = readers();

  it("adds no reader of a generated kind", () => {
    const over = [...found]
      .filter(([file, reads]) => reads.length > (known[file] ?? 0))
      .map(
        ([file, reads]) =>
          `${file}: reads ${[...new Set(reads)].join(", ")} (${reads.length}, ${known[file] ?? 0} known). Read the simulated record instead.`,
      );
    expect(over).toEqual([]);
  });

  it("reads no generated kind once its simulated kind exists", () => {
    const replaced = proxies.filter((proxy) => proxy.simulatedBy);
    const stillRead = [...found].flatMap(([file, reads]) =>
      replaced
        .filter((proxy) => reads.includes(proxy.kind))
        .map(
          (proxy) => `${file}: reads ${proxy.kind}; read ${proxy.simulatedBy}`,
        ),
    );
    expect(stillRead).toEqual([]);
  });

  it("lowers a reader's count as soon as it moves", () => {
    const stale = Object.entries(known)
      .filter(([file, n]) => (found.get(file)?.length ?? 0) < n)
      .map(
        ([file, n]) =>
          `${file}: lower ${n} to ${found.get(file)?.length ?? 0} in tests/guards/one-history-proxies.json`,
      );
    expect(stale).toEqual([]);
  });

  it("only shrinks the proxy list, and every proxy still has its writer", () => {
    expect(proxies.length).toBeLessThanOrEqual(PROXY_CEILING);
    for (const proxy of proxies)
      expect(
        readFileSync(path.join(ROOT, proxy.writer), "utf8").includes(
          `"${proxy.kind}"`,
        ),
        `${proxy.kind}: ${proxy.writer} no longer writes it, so drop it from the list`,
      ).toBe(true);
  });

  it("counts a quoted kind and nothing else", () => {
    const kinds = ["work:tenure-summary"];
    expect(
      proxyReads('find((f) => f.kind === "work:tenure-summary")', kinds),
    ).toEqual(kinds);
    expect(proxyReads("// work:tenure-summary in a comment", kinds)).toEqual(
      [],
    );
    expect(proxyReads('"work:tenure-summary-v2"', kinds)).toEqual([]);
  });
});
