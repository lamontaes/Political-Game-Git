import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  ALLOW_MARKER,
  exemptionFor,
} from "../scripts/prose-eval/american-english-scope";
import {
  americanize,
  britishSpellings,
  DAY_FIRST_DATE,
  DAY_FIRST_NUMERIC_DATE,
  METRIC_MEASUREMENT,
  monthFirstDates,
} from "../scripts/prose-eval/american-spelling";
import { proseKindOf, proseRanges } from "../scripts/prose-eval/prose-ranges";

/**
 * The project writes American English: color, center, labor, organize;
 * miles, feet, inches, pounds and ounces; month, day, year.
 *
 * The owner asked for it everywhere — player text, content, docs, and the
 * skill files that tell the next author how to write — after reading "labour"
 * in a skill file. `content-american-english.test.ts` already guards a list of
 * British *idioms* in a list of content files. This guards *spelling*, dates
 * and units across every tracked file, so a new file is covered the day it is
 * added and nothing has to remember to list it.
 */

const ROOT = path.resolve(__dirname, "..");

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

type Finding = { file: string; line: number; what: string; text: string };

function allowedLines(text: string): Set<number> {
  const allowed = new Set<number>();
  text.split("\n").forEach((line, index) => {
    if (!line.includes(ALLOW_MARKER)) return;
    allowed.add(index + 1);
    allowed.add(index + 2);
  });
  return allowed;
}

function lineAt(text: string, index: number): number {
  let line = 1;
  for (
    let at = text.indexOf("\n");
    at !== -1 && at < index;
    at = text.indexOf("\n", at + 1)
  )
    line += 1;
  return line;
}

/** Player-facing source: shipped code under src/, not its tests. */
function isPlayerSource(file: string): boolean {
  return (
    /^src\/.*\.(ts|tsx)$/.test(file) &&
    !/\.(test|spec)\.tsx?$/.test(file) &&
    !/(^|\/)(fixtures|__tests__)\//.test(file)
  );
}

function scan(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  const allowed = allowedLines(text);
  const player = isPlayerSource(file);
  for (const range of proseRanges(text, file)) {
    const prose = text.slice(range.start, range.end);
    const report = (offset: number, what: string, match: string) => {
      const line = lineAt(text, range.start + offset);
      if (allowed.has(line)) return;
      findings.push({ file, line, what, text: match });
    };
    for (const finding of britishSpellings(prose))
      report(finding.index, `say "${finding.american}"`, finding.british);
    for (const date of prose.matchAll(DAY_FIRST_DATE))
      report(date.index, "put the month first", date[0]);
    for (const date of prose.matchAll(DAY_FIRST_NUMERIC_DATE))
      report(date.index, "write month/day/year", date[0]);
    if (player && range.kind !== "comment") {
      const metric = METRIC_MEASUREMENT.exec(prose);
      if (metric)
        report(
          metric.index,
          "use miles, feet, inches, pounds or ounces",
          metric[0],
        );
    }
  }
  return findings;
}

describe("the project is written in American English", () => {
  const files = trackedFiles();
  const scanned = files.filter(
    (file) => !exemptionFor(file) && proseKindOf(file),
  );

  it("reads the files it claims to", () => {
    // A sweep that reads nothing passes. Prove it reached the surfaces the
    // owner named: player code, content, docs, and the skill files.
    expect(scanned.length).toBeGreaterThan(3000);
    for (const file of [
      "AGENTS.md",
      "CLAUDE.md",
      "PATCH_NOTES.md",
      "src/player/PlayerGame.tsx",
      "src/simulation/episode-bank.ts",
      "art/requests/asset-requests.json",
      ".agents/skills/civic-prose/SKILL.md",
      ".claude/skills/civic-prose/SKILL.md",
      "docs/decisions/DECISION-LOG.md",
    ])
      expect(scanned, file).toContain(file);
  });

  it("has no British spelling, day-first date or metric player text", () => {
    const findings: string[] = [];
    for (const file of scanned) {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      if (text.includes("\u0000")) continue;
      for (const finding of scan(file, text))
        findings.push(
          `${finding.file}:${finding.line} "${finding.text}" — ${finding.what}`,
        );
    }
    expect(findings).toEqual([]);
  }, 180_000);

  it("formats every date and number for an American reader", () => {
    // `undefined` or an empty call picks up the browser's locale, which prints
    // 22/09/2026 for a player whose computer is set to Britain. The one other
    // locale in shipped code is the optional day-first calendar setting, which a
    // player has to choose; month first is the default.
    const offenders: string[] = [];
    for (const file of files.filter(isPlayerSource)) {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      for (const call of text.matchAll(
        /(?:toLocale(?:Date|Time)?String|DateTimeFormat|NumberFormat)\(\s*([^,)]*)/g,
      )) {
        const locale = call[1]!.trim();
        if (/^"en-US(-[^"]*)?"$/.test(locale)) continue;
        if (
          file === "src/player/ux39-calendar-dates.ts" &&
          locale === 'order === "day-month" ? "en-GB" : "en-US"'
        )
          continue;
        offenders.push(`${file}: ${call[0]}`);
      }
    }
    expect(offenders).toEqual([]);
    const grid = readFileSync(
      path.join(ROOT, "src/player/UX39CalendarGrid.tsx"),
      "utf8",
    );
    expect(grid).toMatch(
      /=== "day-month"\s*\?\s*"day-month"\s*:\s*"month-day"/,
    );
  });
});

describe("the sweep bites", () => {
  // Each case puts a British form back into a real file of each kind and
  // requires the scan to find it — and leaves an identifier alone.
  const cases: { file: string; inject: (text: string) => string }[] = [
    {
      file: ".agents/skills/civic-prose/SKILL.md",
      inject: (text) => `${text}\nKeep the labour market in view.\n`,
    },
    {
      file: "src/player/PlayerGame.tsx",
      inject: (text) =>
        `${text}\nexport const probe = "Pick a colour for the sign";\n`,
    },
    {
      file: "src/player/PlayerGame.tsx",
      inject: (text) => `${text}\n// The town centre is quiet.\n`,
    },
    {
      file: "art/requests/asset-requests.json",
      inject: (text) => text.replace(/": "([^"]* [^"]*)"/, '": "$1 in grey"'),
    },
    {
      file: "docs/decisions/DECISION-LOG.md",
      inject: (text) => `${text}\nAccepted on 22 September 2026.\n`,
    },
    {
      file: "src/presentation/map-place-demography.ts",
      inject: (text) => `${text}\nexport const probe = "about 3 km away";\n`,
    },
  ];

  it.each(cases)(
    "catches a British form put back into $file",
    ({ file, inject }) => {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      expect(scan(file, text)).toEqual([]);
      expect(scan(file, inject(text)).length).toBeGreaterThan(0);
    },
  );

  it("leaves identifiers and saved tokens alone", () => {
    const code = [
      'const status = "cancelled";',
      "const sourceColour = 1;",
      'const kind = "returning-favour";',
      'import x from "./returning-favour";',
      "// see `favour-request` in scenes/neighbour_visit.ts",
    ].join("\n");
    expect(scan("src/probe.ts", code)).toEqual([]);
  });

  it("repairs what it flags, and only that", () => {
    expect(
      americanize("The Neighbourhood Centre organised a colourful programme."),
    ).toBe("The Neighborhood Center organized a colorful program.");
    expect(americanize("four tours of your glamour exercise")).toBe(
      "four tours of your glamour exercise",
    );
    expect(americanize("Centre County sits in Pennsylvania.")).toBe(
      "Centre County sits in Pennsylvania.",
    );
    expect("Filed 22/09/2026.".match(DAY_FIRST_NUMERIC_DATE)).not.toBeNull();
    expect(
      "deadlines of 21/30/30/10/45 days".match(DAY_FIRST_NUMERIC_DATE),
    ).toBeNull();
    expect(monthFirstDates("Filed 3 March 2026 and heard 15 April.")).toBe(
      "Filed March 3, 2026 and heard April 15.",
    );
  });
});
