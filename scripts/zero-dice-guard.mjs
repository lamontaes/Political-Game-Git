#!/usr/bin/env node
/* global console, process */
/**
 * The zero-dice guard (Rule 0: no dice, no one-place special cases).
 *
 * Scans simulation, presentation and crisis code for four shapes and fails
 * when a change adds one that the allowlist does not already carry:
 *
 *   roll            a seeded or Math.random draw compared with a threshold,
 *                   directly (`rng.next() < 0.3`) or through a variable the
 *                   draw was stored in (`const roll = rng.next(); roll < p`)
 *   fixed-share     a named chance, share, odds, probability, permille or
 *                   likelihood set to a numeric literal other than 0 or 1
 *   list-pick       a seeded or hash-keyed selection from a collection:
 *                   `rng.pick(list)`, `pickDistinct`, a weighted pick, a
 *                   shuffle, `list[rng.integer(0, list.length)]`,
 *                   `Math.floor(rng.next() * n)`, a draw stored in a
 *                   variable and used later as an index or counted down
 *                   through weights, or `list[hash % list.length]`. Every
 *                   list-pick entry carries a class (IDENTITY, PRESENTATION,
 *                   GENERATION or DECISION) and a one-line reason; see
 *                   docs/design/list-pick-inventory.md
 *   place-in-logic  a state or place literal (`"KY"`, `"Kentucky"`,
 *                   `"us-ky-lexington"`, a FIPS code, a city name) compared,
 *                   matched in a `case`, or looked up with includes/has
 *
 * The allowlist is today's inventory and may only shrink. Each entry names
 * its owning build. An entry whose line is gone fails too, so a fix removes
 * its entry in the same change. `--update` rewrites the allowlist to what the
 * code holds now, which lets a fixed line leave and an allowed line be
 * reworded, and refuses when any file would carry more lines of a kind than
 * the allowlist already allows.
 *
 * Usage:
 *   npm run zero-dice                # check
 *   npm run zero-dice -- --update    # record removals and rewordings
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ALLOWLIST_PATH = "scripts/zero-dice-allowlist.json";
export const SCANNED_ROOTS = [
  "src/simulation",
  "src/presentation",
  "src/crisis",
];
/**
 * Also read, for list-picks only: where the player's screens draw, and where
 * the new core will land. Its picks go through this guard too.
 */
export const LIST_PICK_ONLY_ROOTS = ["src/player", "src/core2"];

/** The seeded generator itself is where draws are made, not decided. */
const EXEMPT_FILES = new Set(["src/simulation/rng.ts"]);

const USPS =
  "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR GU VI AS MP".split(
    " ",
  );
const STATE_NAMES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  "District of Columbia",
  "Puerto Rico",
  "Guam",
  "Virgin Islands",
  "American Samoa",
  "Northern Mariana Islands",
];
const STATE_SLUGS = STATE_NAMES.map((name) =>
  name.toLowerCase().replaceAll(" ", "-"),
);

const ARGS = String.raw`\((?:[^()]|\([^()]*\))*\)`;
const DRAW = String.raw`(?:\.(?:next|nextUint32)\(\)|\.integer\((?!["'\x60])(?:[^()]|\([^()]*\))*\)|Math\.random\(\)|(?<![\w.])(?:draw|drawPermille|drawFrom|unitFor|openUniform|standardNormal|roll)${ARGS})`;
const COMPARE = String.raw`(?<![=<>\-!])[<>]=?(?![<>=])`;
const ROLL_DIRECT = new RegExp(
  String.raw`${DRAW}\s*(?:\*\s*[\w.]+\s*)?${COMPARE}|${COMPARE}\s*[\w.]*${DRAW}|${DRAW}\s*(?:===|!==)\s*\d`,
);
const DRAW_ANYWHERE = new RegExp(DRAW);
const DRAW_ASSIGNED = new RegExp(
  String.raw`\b(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?=(?!=)[^;]*${DRAW}`,
);

const SHARE_WORD = String.raw`(?:[Cc]hance|[Ss]hare|[Pp]robabilit(?:y|ies)|[Oo]dds|[Pp]ermille|[Ll]ikelihood)s?(?![a-z])|(?:CHANCE|SHARE|PROBABILIT(?:Y|IES)|ODDS|PERMILLE|LIKELIHOOD)S?(?![A-Z])`;
const NUMBER = String.raw`-?(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)`;
const FIXED_SHARE = new RegExp(
  String.raw`\b\w*?(?:${SHARE_WORD})\w*\??\s*(?::\s*[A-Za-z][\w<>\[\] |]*\s*)?(?<![=!<>])[:=](?!=)\s*[\[{]?\s*(${NUMBER})(?:\s*\/\s*(${NUMBER}))?(?![\w.])`,
);
/** `const LEAVE_CHANCE = {` — a table of fixed chances written below. */
const FIXED_SHARE_TABLE = new RegExp(
  String.raw`\b(?:const|let)\s+(?!(?:ZERO|ONE)_SHARE\b)[A-Z][A-Z0-9_]*(?:${SHARE_WORD})[A-Z0-9_]*\s*(?::[^=]+)?=\s*[\[{]\s*$`,
);

const quoted = (alternatives) =>
  String.raw`["'\x60](?:${alternatives.join("|")})["'\x60]`;
const PLACE_LITERAL = new RegExp(
  [
    quoted(USPS),
    quoted([...STATE_NAMES, ...STATE_SLUGS]),
    String.raw`["'\x60](?:us|US)-[A-Za-z]{2}(?:-[\w-]*)?["'\x60]`,
  ].join("|"),
);
const LOGIC =
  /===|!==|(?<![=!<>])==(?!=)|!=(?!=)|\bcase\s|\.includes\(|\.has\(|startsWith\(|endsWith\(/;
const GEO_LITERAL = String.raw`["'\x60]\d{2}(?:\d{3}(?:\d{2}|\d{5})?)?["'\x60]`;
const GEO_COMPARE = new RegExp(
  String.raw`\b\w*(?:geoid|Geoid|GEOID|fips|Fips|FIPS|stateCode|countyCode|placeCode)\w*\s*(?:===|!==|==)\s*${GEO_LITERAL}|${GEO_LITERAL}\s*(?:===|!==)\s*\w*(?:geoid|Geoid|fips|Fips)`,
);
const CITY_COMPARE =
  /\b\w*(?:city|City|town|Town|placeName|municipality|cityName)\w*\s*(?:===|!==)\s*["'`][A-Z][a-z]+/;

/**
 * Remove quoted text so a comparison inside prose is not read as code. A
 * template literal keeps its `${...}` expressions, which are code.
 */
function withoutStrings(line) {
  const parts = [];
  let start = 0;
  for (let index = 0; index < line.length; index += 1) {
    const quote = line[index];
    if (quote !== '"' && quote !== "'" && quote !== "`") continue;

    let end = index + 1;
    for (; end < line.length; end += 1) {
      if (line[end] === "\\") {
        end += 1;
      } else if (line[end] === quote) {
        break;
      }
    }
    if (end >= line.length) {
      parts.push(line.slice(start));
      return parts.join("");
    }

    parts.push(line.slice(start, index));
    if (quote === "`") {
      const literal = line.slice(index, end + 1);
      parts.push(
        `"" ${[...literal.matchAll(/\$\{([^{}]*)\}/g)]
          .map((match) => match[1])
          .join(" ")}`,
      );
    } else {
      parts.push('""');
    }
    index = end;
    start = end + 1;
  }
  parts.push(line.slice(start));
  return parts.join("");
}

function isComment(trimmed) {
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*")
  );
}

/** The four classes a list-pick can carry. See docs/design/list-pick-inventory.md. */
export const PICK_CLASSES = [
  "IDENTITY",
  "PRESENTATION",
  "GENERATION",
  "DECISION",
];
/** A generation pick is keyed by the id of the thing it describes, never by a place. */
const PLACE_KEYS = new Set(["place", "town", "city", "state", "county"]);

const PICK_CALL = new RegExp(
  String.raw`\.pick\(|(?<![\w.])(?:pickDistinct|weightedPick|pickWeighted|weightedChoice|weightedIndex|shuffle|shuffled|shuffleInPlace)\s*[(<]|\.(?:shuffle|shuffled)\(`,
);
const PICK_DEFINITION = /\bfunction\s+\w+|^\s*(?:public\s+|private\s+)?pick</;
/** A collection index drawn from a seeded stream or a draw helper. */
const DRAW_IN_BRACKETS = new RegExp(
  String.raw`\[(?:[^\[\]]|\[[^\[\]]*\])*${DRAW}(?:[^\[\]]|\[[^\[\]]*\])*\]`,
);
const DRAW_AS_ARGUMENT = new RegExp(
  String.raw`\.(?:splice|at|slice|with|toSpliced)\(\s*(?:Math\.floor\(\s*)?${DRAW}`,
);
const INTEGER_OVER_LENGTH = new RegExp(
  String.raw`\.integer\((?:[^()]|\([^()]*\))*\b(?:length|size)\b`,
);
const FLOORED_DRAW = new RegExp(String.raw`Math\.(?:floor|trunc)\(\s*${DRAW}`);
/** `rng.next() * total`: the first half of a cumulative weighted pick. */
const WEIGHTED_DRAW = new RegExp(
  String.raw`${DRAW}\s*\*\s*(?!\d)[A-Za-z_][\w.]*`,
);
/** A hash, or a fold over characters, nearby marks a `% length` as a pick. */
const HASH_WORD = /hash|digest|checksum|fnv|accumulator|charCodeAt/i;
const HASH_INDEX = /%\s*[\w.()[\]!]*\b(?:length|size)\b/;

const escapeName = (name) => name.replace(/[$]/g, String.raw`\$`);

/**
 * The statement around line `index`: any chain lines above it (a line that
 * starts with `.` belongs to the line before it) and every line below until
 * the brackets it opened close.
 */
function statementAround(codeLines, index) {
  let first = index;
  while (first > 0 && /^\s*[.?:]|^\s*\)/.test(codeLines[first] ?? "")) {
    first -= 1;
  }
  let text = "";
  let balance = 0;
  let last = first;
  for (let at = first; at < codeLines.length; at += 1) {
    const line = codeLines[at] ?? "";
    text += `${line}\n`;
    last = at;
    for (const character of line) {
      if (character === "(" || character === "[") balance += 1;
      else if (character === ")" || character === "]") balance -= 1;
    }
    if (at >= index && balance <= 0) break;
  }
  return { first, last, text };
}

/**
 * Every seeded or hash-keyed selection from a collection.
 * @returns {{ line: number; kind: "list-pick"; code: string }[]}
 */
function scanListPicks(rawLines, codeLines) {
  const findings = [];
  const seen = new Set();
  const report = (index, statement) => {
    if (seen.has(statement.first)) return false;
    seen.add(statement.first);
    findings.push({
      line: statement.first + 1,
      kind: "list-pick",
      code: normalize(
        rawLines.slice(statement.first, statement.last + 1).join(" "),
      ).slice(0, 320),
    });
    return true;
  };
  /** Draws stored in a variable, with the block depth where each was declared. */
  let held = [];
  let depth = 0;
  codeLines.forEach((code, index) => {
    if (code !== "") {
      const statement = statementAround(codeLines, index);
      const text = statement.text;
      let flagged = false;
      if (PICK_CALL.test(code) && !PICK_DEFINITION.test(code)) {
        flagged = report(index, statement);
      } else if (
        DRAW_ANYWHERE.test(code) &&
        (DRAW_IN_BRACKETS.test(text) ||
          DRAW_AS_ARGUMENT.test(text) ||
          INTEGER_OVER_LENGTH.test(text) ||
          FLOORED_DRAW.test(text) ||
          WEIGHTED_DRAW.test(text))
      ) {
        flagged = report(index, statement);
      } else if (HASH_INDEX.test(code)) {
        const from = Math.max(0, index - 8);
        const hashed = codeLines.findIndex(
          (line, at) => at >= from && at <= index && HASH_WORD.test(line),
        );
        if (hashed >= 0) {
          flagged = report(index, {
            first: Math.min(hashed, statement.first),
            last: statement.last,
            text,
          });
        }
      }
      // A draw kept in a name and used later as an index or counted down.
      const names = held.filter((entry) => !entry.reported);
      if (!flagged && names.length > 0 && !DRAW_ANYWHERE.test(code)) {
        for (const entry of names) {
          const name = escapeName(entry.name);
          const used = new RegExp(
            String.raw`\[(?:[^\[\]]|\[[^\[\]]*\])*\b${name}\b(?:[^\[\]]|\[[^\[\]]*\])*\]|\.(?:splice|at|slice|with|toSpliced)\(\s*(?:Math\.floor\(\s*)?\b${name}\b|\b${name}\s*-=|\b${name}\s*%\s*[\w.]*(?:length|size)\b`,
          );
          if (used.test(code)) {
            entry.reported = true;
            report(index, statement);
            break;
          }
        }
      }
      // A pick already reported on this line is not counted again when its
      // stored name is used. A chained draw is read with its whole statement.
      const assigned = DRAW_ANYWHERE.test(code)
        ? DRAW_ASSIGNED.exec(statement.text)
        : null;
      if (assigned !== null) {
        held.push({ name: assigned[1], depth, reported: flagged });
      }
    }
    for (const character of code) {
      if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        held = held.filter((entry) => entry.depth <= depth);
      }
    }
  });
  return findings;
}

/** Collapse whitespace so an allowlist entry survives reindentation. */
export function normalize(line) {
  return line.trim().replace(/\s+/g, " ");
}

function isScanned(file) {
  return (
    /\.(ts|tsx)$/.test(file) &&
    !/\.d\.ts$/.test(file) &&
    !/\.test\.tsx?$/.test(file) &&
    !/\/(__tests__|test-support)\//.test(file) &&
    !EXEMPT_FILES.has(file)
  );
}

function walk(root, directory, out) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(root, path, out);
    else {
      const file = relative(root, path).split(sep).join("/");
      if (isScanned(file)) out.push(file);
    }
  }
}

export function scannedFiles(root = REPO_ROOT, roots = SCANNED_ROOTS) {
  const files = [];
  for (const scanned of roots) {
    const directory = join(root, scanned);
    if (existsSync(directory)) walk(root, directory, files);
  }
  return files.sort();
}

/**
 * Every guarded line in one file's text.
 * @returns {{ line: number; kind: "roll" | "fixed-share" | "place-in-logic" | "list-pick"; code: string }[]}
 */
export function scanSource(text) {
  const findings = [];
  /** Names that hold a draw, with the block depth where each was declared. */
  let drawNames = [];
  let depth = 0;
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    const skip =
      trimmed === "" || isComment(trimmed) || trimmed.startsWith("import ");
    const code = skip ? "" : withoutStrings(line);
    let kind = null;
    if (!skip) {
      const names = drawNames.map((entry) => entry.name);
      const storedRoll =
        names.length > 0 &&
        !DRAW_ANYWHERE.test(code) &&
        new RegExp(
          String.raw`\b(?:${names.join("|")})\b\s*${COMPARE}|${COMPARE}\s*(?:${names.join("|")})\b(?!\s*\()`,
        ).test(code);
      if (ROLL_DIRECT.test(code) || storedRoll) {
        kind = "roll";
      } else if (FIXED_SHARE_TABLE.test(code)) {
        kind = "fixed-share";
      } else {
        const share = FIXED_SHARE.exec(code);
        if (share !== null) {
          const numerator = Number(share[1].replaceAll("_", ""));
          const value =
            share[2] === undefined
              ? numerator
              : numerator / Number(share[2].replaceAll("_", ""));
          if (value !== 0 && value !== 1) kind = "fixed-share";
        }
      }
      if (
        kind === null &&
        ((PLACE_LITERAL.test(line) && LOGIC.test(code)) ||
          GEO_COMPARE.test(line) ||
          CITY_COMPARE.test(line))
      ) {
        kind = "place-in-logic";
      }
      if (kind !== null) {
        findings.push({ line: index + 1, kind, code: normalize(line) });
      }
      const assigned = DRAW_ASSIGNED.exec(code);
      if (assigned !== null) drawNames.push({ name: assigned[1], depth });
    }
    for (const character of code) {
      if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        drawNames = drawNames.filter((entry) => entry.depth <= depth);
      }
    }
  });
  const rawLines = text.split(/\r?\n/);
  const codeLines = rawLines.map((line) => {
    const trimmed = line.trim();
    return trimmed === "" || isComment(trimmed) || trimmed.startsWith("import ")
      ? ""
      : withoutStrings(line);
  });
  findings.push(...scanListPicks(rawLines, codeLines));
  return findings.sort((a, b) => a.line - b.line);
}

/** @returns {{ file: string; line: number; kind: string; code: string }[]} */
export function scanRepository(root = REPO_ROOT) {
  const scan = (files, keep) =>
    files.flatMap((file) =>
      scanSource(readFileSync(join(root, file), "utf8"))
        .filter(keep)
        .map((finding) => ({ file, ...finding })),
    );
  return [
    ...scan(scannedFiles(root), () => true),
    ...scan(
      scannedFiles(root, LIST_PICK_ONLY_ROOTS),
      (finding) => finding.kind === "list-pick",
    ),
  ];
}

const keyOf = (entry) => `${entry.file}\u0000${entry.kind}\u0000${entry.code}`;

export function readAllowlist(root = REPO_ROOT) {
  return JSON.parse(readFileSync(join(root, ALLOWLIST_PATH), "utf8"));
}

/**
 * Compare a scan with the allowlist.
 * `added` are guarded lines the allowlist does not carry (or carries fewer of);
 * `stale` are allowlist entries whose lines are gone (or fewer than recorded).
 */
export function compare(findings, allowlist) {
  const allowed = new Map();
  for (const entry of allowlist.entries) allowed.set(keyOf(entry), entry);
  const found = new Map();
  for (const finding of findings) {
    const key = keyOf(finding);
    const group = found.get(key) ?? [];
    group.push(finding);
    found.set(key, group);
  }
  const added = [];
  for (const [key, group] of found) {
    const count = allowed.get(key)?.count ?? 0;
    if (group.length > count) added.push(...group.slice(count));
  }
  const stale = [];
  for (const [key, entry] of allowed) {
    const present = found.get(key)?.length ?? 0;
    if (present < entry.count) stale.push({ ...entry, present });
  }
  return { added, stale };
}

/**
 * List-pick entries that lack what the allowlist asks of them: one of the
 * four classes, a one-line reason, a generation key that is the id of the
 * thing described (never a place), and for a decision the real reason that
 * should replace it.
 * @returns {{ file: string; code: string; problem: string }[]}
 */
export function unclassified(allowlist) {
  const problems = [];
  for (const entry of allowlist.entries) {
    if (entry.kind !== "list-pick") continue;
    const flag = (problem) =>
      problems.push({ file: entry.file, code: entry.code, problem });
    if (!PICK_CLASSES.includes(entry.class)) {
      flag(`class must be one of ${PICK_CLASSES.join(", ")}`);
      continue;
    }
    if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
      flag("a one-line reason is required");
    }
    if (entry.class === "GENERATION") {
      const key = String(entry.keyedBy ?? "")
        .trim()
        .toLowerCase();
      if (key === "" || PLACE_KEYS.has(key)) {
        flag(
          "a generation pick is keyed by the id of the thing it describes, not by a place; a per-person fact keyed only by place is a DECISION",
        );
      }
    }
    if (
      entry.class === "DECISION" &&
      (typeof entry.replacement !== "string" || entry.replacement.trim() === "")
    ) {
      flag("a DECISION names the real reason that should replace it");
    }
  }
  return problems;
}

const groupOf = (entry) => `${entry.file}\u0000${entry.kind}`;

function totals(entries) {
  const byGroup = new Map();
  for (const entry of entries) {
    byGroup.set(
      groupOf(entry),
      (byGroup.get(groupOf(entry)) ?? 0) + entry.count,
    );
  }
  return byGroup;
}

/**
 * Files whose count of one kind grew from `previous` to `current` (for
 * example from main's allowlist to a branch's). Rewording an allowed line
 * keeps its file's count; adding one raises it.
 * @returns {{ file: string; kind: string; before: number; after: number }[]}
 */
export function growth(previous, current) {
  const before = totals(previous.entries);
  return [...totals(current.entries)]
    .filter(([group, after]) => after > (before.get(group) ?? 0))
    .map(([group, after]) => {
      const [file, kind] = group.split("\u0000");
      return { file, kind, before: before.get(group) ?? 0, after };
    });
}

/**
 * The allowlist rewritten to the lines present now. Each entry keeps the
 * owning build its file already had.
 */
export function update(allowlist, findings) {
  const buildOf = new Map();
  const classOf = new Map();
  for (const entry of allowlist.entries) {
    if (entry.kind === "list-pick") {
      classOf.set(keyOf(entry), entry);
    } else if (!buildOf.has(entry.file)) {
      buildOf.set(entry.file, entry.build);
    }
  }
  const grouped = new Map();
  for (const finding of findings) {
    const key = keyOf(finding);
    const entry = grouped.get(key);
    if (entry) entry.count += 1;
    else {
      const known = classOf.get(key);
      grouped.set(key, {
        file: finding.file,
        kind: finding.kind,
        build:
          finding.kind === "list-pick"
            ? null
            : (buildOf.get(finding.file) ?? null),
        count: 1,
        code: finding.code,
        ...(finding.kind === "list-pick"
          ? {
              class: known?.class ?? null,
              keyedBy: known?.keyedBy ?? null,
              reason: known?.reason ?? null,
              replacement: known?.replacement ?? null,
            }
          : {}),
      });
    }
  }
  return { ...allowlist, entries: [...grouped.values()] };
}

export function describeAdded(finding) {
  return `${finding.file}:${finding.line} ${finding.kind}: ${finding.code}`;
}

function main(argv) {
  const allowlist = readAllowlist();
  const findings = scanRepository();
  if (argv.includes("--update")) {
    const next = update(allowlist, findings);
    const grown = growth(allowlist, next);
    if (grown.length > 0) {
      for (const { file, kind, before, after } of grown) {
        console.error(`${file}: ${kind} ${before} -> ${after}`);
      }
      const { added } = compare(findings, allowlist);
      for (const finding of added)
        console.error(`new ${describeAdded(finding)}`);
      console.error(
        "zero-dice: the allowlist only shrinks. Rewrite each new line as a result of the actor's traits, law, place and relationships (see .claude/skills/no-dice).",
      );
      return 1;
    }
    writeFileSync(
      join(REPO_ROOT, ALLOWLIST_PATH),
      `${JSON.stringify(next, null, 2)}\n`,
    );
    const total = next.entries.reduce((sum, entry) => sum + entry.count, 0);
    console.log(`zero-dice: allowlist rewritten; ${total} allowed lines left.`);
    return 0;
  }
  const { added, stale } = compare(findings, allowlist);
  const unclassifiedPicks = unclassified(allowlist);
  for (const entry of unclassifiedPicks) {
    console.error(
      `unclassified ${entry.file}: ${entry.code}: ${entry.problem}`,
    );
  }
  for (const finding of added) console.error(`new ${describeAdded(finding)}`);
  for (const entry of stale) {
    console.error(
      `gone ${entry.file} ${entry.kind} (${entry.build}): ${entry.code}`,
    );
  }
  if (added.length > 0 || stale.length > 0 || unclassifiedPicks.length > 0) {
    console.error(
      `zero-dice: ${added.length} new, ${stale.length} gone, ${unclassifiedPicks.length} unclassified. A new list-pick is replaced by a decision from the actor's reasons (a pick that names or draws who someone is may be IDENTITY, PRESENTATION or GENERATION only when its entry says why; see docs/design/list-pick-inventory.md). A new line is rewritten as a result of the actor's traits, law, place and relationships (see .claude/skills/no-dice); a removed or reworded one is recorded with \`npm run zero-dice -- --update\`.`,
    );
    return 1;
  }
  const total = allowlist.entries.reduce((sum, entry) => sum + entry.count, 0);
  console.log(`zero-dice: nothing new; ${total} allowed lines left.`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = main(process.argv.slice(2));
}
