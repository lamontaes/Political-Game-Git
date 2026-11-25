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

/**
 * One reader (owner, Nov 25, 2026: "THE JOURNAL, DIRECTOR, PERSON CARDS, ETC
 * ALL PULL FROM THE SAME HISTORY. STOP MAKING NEW SYSTEMS FOR NEW THINGS WHEN
 * THEY ALL USE THE SAME THING"): a screen, scene, journal line, news story or
 * speech reads what already happened through the one history reader
 * (`historyOf`, src/core2/past-history.ts), never by rebuilding a past from
 * the records itself. A rebuild is a raw past reader called by name, a scan
 * of the log (by kind, by person, or all of it), or a person's own facts or
 * remembered list read directly. Reading one record by its id
 * (`durableLog.get`) is not a past: a scene's cause is read that way.
 */
const VIEW_DIRS = ["src/bench", "src/director", "src/english"];
const RAW_PAST_READERS = [
  "preStartHistory",
  "lifeOf",
  "openWholePast",
  "schoolsAttended",
  "schoolsOf",
  "pastWorkOf",
  "pastWorkFor",
  "pastWorkHistory",
  "pastMovesFor",
  "pastMovesHistory",
  "pastPartnersFor",
  "pastHealthFor",
  "pastServiceFor",
  "pastJusticeFor",
  "schoolHistory",
  "schoolHistoryFor",
  "schoolSpans",
  "centuryOf",
  "centuryPresidency",
  "centuryLegislatures",
  "centuryRace",
  "centurySeatRace",
  "centuryCongressSeat",
  "centuryLaw",
  "centuryParties",
  "lawHistory",
  "pastTable",
  "pastElections",
  "sharedHistory",
  "heldSinceRecord",
  "bornIn",
  "residenceOn",
  "openPastTerms",
  "pastIdsOf",
  "pastRowsNaming",
  "pastRowsOf",
];
const LOG_SCANS: readonly RegExp[] = [
  /\blogByKind\b/g,
  /\blogByPerson\b/g,
  /\bdurableLog\s*\.\s*(values|keys|entries|forEach)\b|\.\.\.\s*[\w.]*durableLog\b|\bof\s+[\w.]*durableLog\b/g,
  /\.pastFacts\b/g,
  /\.remembered\b/g,
];
const IMPORTS = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["'][^"']+["']/g;

/**
 * How many times a source rebuilds a past outside the reader, comments
 * skipped: each raw past reader it imports (under any name it gives it) and each call of it, and each log scan or read of a person's own
 * facts or remembered list.
 */
export function pastRebuilds(source: string): number {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  let count = 0;
  const local = code.replace(IMPORTS, (_whole, names: string) => {
    for (const part of names.split(",")) {
      const [name, alias] = part
        .replace(/^\s*type\s+/, "")
        .split(/\s+as\s+/)
        .map((word) => word.trim());
      if (!name || !RAW_PAST_READERS.includes(name)) continue;
      count += 1;
      const called = new RegExp(`(^|[^.\\w])${alias ?? name}\\s*\\(`, "g");
      count += code.match(called)?.length ?? 0;
    }
    return " ";
  });
  return LOG_SCANS.reduce(
    (sum, pattern) => sum + (local.match(pattern)?.length ?? 0),
    count,
  );
}

describe("one history: every system reads the one history reader", () => {
  const allowed = (
    list as unknown as {
      readsOutsideTheReader: { files: Record<string, number> };
    }
  ).readsOutsideTheReader.files;
  const files = execFileSync("git", ["ls-files", ...VIEW_DIRS], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (file) =>
        /\.(ts|tsx|mjs)$/.test(file) &&
        !/\.(test|spec|browser)\.(ts|tsx|mjs)$/.test(file),
    );
  const found = new Map(
    files
      .map(
        (file) =>
          [
            file,
            pastRebuilds(readFileSync(path.join(ROOT, file), "utf8")),
          ] as const,
      )
      .filter(([, n]) => n > 0),
  );

  it("builds no new past outside the reader", () => {
    const over = [...found]
      .filter(([file, n]) => n > (allowed[file] ?? 0))
      .map(
        ([file, n]) =>
          `${file}: rebuilds a past from the records ${n} times (${allowed[file] ?? 0} allowed). Read historyOf (src/core2/past.ts) instead.`,
      );
    expect(over).toEqual([]);
  });

  it("lowers a file's count as soon as it reads the reader", () => {
    const stale = Object.entries(allowed)
      .filter(([file, n]) => (found.get(file) ?? 0) < n)
      .map(
        ([file, n]) =>
          `${file}: lower ${n} to ${found.get(file) ?? 0} in tests/guards/one-history-proxies.json (readsOutsideTheReader)`,
      );
    expect(stale).toEqual([]);
  });

  it("counts a raw past read and a log scan, and nothing else", () => {
    expect(
      pastRebuilds(
        'import { preStartHistory } from "../core2/past";\npreStartHistory(core, { personId });',
      ),
    ).toBe(2);
    expect(
      pastRebuilds(
        'import { bornIn as birthplaceOf } from "../core2/past-module";\nbirthplaceOf(core, person);',
      ),
    ).toBe(2);
    expect(pastRebuilds("const bornIn = placeLabel(born);")).toBe(0);
    expect(
      pastRebuilds("for (const id of core.logByKind.get(kind) ?? [])"),
    ).toBe(1);
    expect(pastRebuilds("[...core.durableLog.values()]")).toBe(1);
    expect(pastRebuilds("person.pastFacts ?? []")).toBe(1);
    expect(pastRebuilds("core.durableLog.get(cause)")).toBe(0);
    expect(pastRebuilds("historyOf(core, { person })")).toBe(0);
    expect(pastRebuilds("// preStartHistory in a comment")).toBe(0);
  });
});
