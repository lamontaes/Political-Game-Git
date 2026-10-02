#!/usr/bin/env node
/* global console, process */
/**
 * The zero-dice guard (Rule 0: no dice, no one-place special cases).
 *
 * Scans simulation, presentation and crisis code for three shapes and fails
 * when a change adds one that the allowlist does not already carry:
 *
 *   roll            a seeded or Math.random draw, including values, choices
 *                   and arithmetic noise, plus comparisons using stored draws
 *   fixed-share     a named chance, share, odds, probability, permille or
 *                   likelihood set to a numeric literal other than 0 or 1
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
import ts from "typescript";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ALLOWLIST_PATH = "scripts/zero-dice-allowlist.json";
export const SCANNED_ROOTS = [
  "src/simulation",
  "src/presentation",
  "src/crisis",
];

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
  return line.replace(
    /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g,
    (literal) =>
      literal.startsWith("`")
        ? `"" ${[...literal.matchAll(/\$\{([^{}]*)\}/g)].map((match) => match[1]).join(" ")}`
        : '""',
  );
}

function isComment(trimmed) {
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*")
  );
}

/** Read calls across lines; constructors and forks create streams, not draws. */
function drawCallLines(text) {
  let source = ts.createSourceFile(
    "guarded.tsx",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  if (source.parseDiagnostics.length > 0) {
    source = ts.createSourceFile(
      "guarded.ts",
      text,
      ts.ScriptTarget.Latest,
      true,
    );
  }
  const host = {
    getSourceFile: (name) => (name === source.fileName ? source : undefined),
    getDefaultLibFileName: () => "",
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (name) => name === source.fileName,
    readFile: () => undefined,
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  };
  const checker = ts
    .createProgram([source.fileName], { noResolve: true, noLib: true }, host)
    .getTypeChecker();
  const constructors = new Set(["SeededRng"]);
  const wrappers = new Set([
    "draw",
    "drawPermille",
    "drawFrom",
    "unitFor",
    "openUniform",
    "standardNormal",
    "roll",
    "pickDistinct",
  ]);
  const rngSymbols = new Set();
  const drawSymbols = new Set();
  const declarations = [];
  const factories = [];
  const factorySymbols = new Set();
  const calls = [];
  const symbol = (node) => checker.getSymbolAtLocation(node);
  const member = (node) =>
    ts.isPropertyAccessExpression(node)
      ? node.name.text
      : ts.isElementAccessExpression(node) &&
          node.argumentExpression &&
          ts.isStringLiteral(node.argumentExpression)
        ? node.argumentExpression.text
        : null;
  const visit = (node) => {
    if (ts.isImportSpecifier(node)) {
      const original = (node.propertyName ?? node.name).text;
      if (original === "SeededRng") constructors.add(node.name.text);
      if (wrappers.has(original)) drawSymbols.add(symbol(node.name));
    }
    if (ts.isParameter(node) || ts.isVariableDeclaration(node))
      declarations.push(node);
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node)
    )
      factories.push(node);
    if (ts.isCallExpression(node)) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  const isRng = (node) => {
    if (!node) return false;
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isNonNullExpression(node)
    )
      return isRng(node.expression);
    if (ts.isIdentifier(node)) {
      const type = checker.typeToString(checker.getTypeAtLocation(node));
      return (
        rngSymbols.has(symbol(node)) ||
        [...constructors].some((name) => new RegExp(`\\b${name}\\b`).test(type))
      );
    }
    if (ts.isNewExpression(node))
      return (
        constructors.has(node.expression.getText(source)) ||
        member(node.expression) === "SeededRng"
      );
    if (ts.isCallExpression(node)) {
      if (member(node.expression) === "fork")
        return isRng(node.expression.expression);
      return (
        ts.isIdentifier(node.expression) &&
        (node.expression.text === "worldSetupRng" ||
          factorySymbols.has(symbol(node.expression)))
      );
    }
    return false;
  };
  const rngType = (node) =>
    node &&
    (ts.isUnionTypeNode(node)
      ? node.types.some(rngType)
      : constructors.has(node.getText(source)) ||
        node.getText(source).endsWith(".SeededRng"));
  for (let changed = true; changed;) {
    changed = false;
    for (const factory of factories) {
      const name =
        factory.name ??
        (ts.isVariableDeclaration(factory.parent)
          ? factory.parent.name
          : undefined);
      if (!name || !ts.isIdentifier(name) || factorySymbols.has(symbol(name)))
        continue;
      let returnsRng =
        rngType(factory.type) ||
        (factory.body && !ts.isBlock(factory.body) && isRng(factory.body));
      const returned = (node) => {
        if (
          node !== factory.body &&
          (ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node))
        )
          return;
        if (ts.isReturnStatement(node) && isRng(node.expression))
          returnsRng = true;
        ts.forEachChild(node, returned);
      };
      if (factory.body) returned(factory.body);
      if (returnsRng) {
        factorySymbols.add(symbol(name));
        changed = true;
      }
    }
    for (const declaration of declarations) {
      if (ts.isIdentifier(declaration.name)) {
        const typed = rngType(declaration.type);
        const key = symbol(declaration.name);
        if (
          key &&
          !rngSymbols.has(key) &&
          (typed || isRng(declaration.initializer))
        ) {
          rngSymbols.add(key);
          changed = true;
        }
      } else if (
        ts.isObjectBindingPattern(declaration.name) &&
        isRng(declaration.initializer)
      ) {
        for (const binding of declaration.name.elements) {
          const original =
            binding.propertyName?.getText(source) ??
            binding.name.getText(source);
          if (
            ts.isIdentifier(binding.name) &&
            ["next", "nextUint32", "integer", "pick", "pickDistinct"].includes(
              original,
            )
          ) {
            drawSymbols.add(symbol(binding.name));
          }
        }
      }
    }
  }
  const methods = new Set([
    "next",
    "nextUint32",
    "integer",
    "pick",
    "pickDistinct",
  ]);
  const lines = new Set();
  for (const call of calls) {
    const expression = call.expression;
    const method = member(expression);
    const receiver = expression.expression;
    const primitive = methods.has(method) && isRng(receiver);
    const random =
      method === "random" &&
      ts.isIdentifier(receiver) &&
      receiver.text === "Math";
    const wrapped =
      ts.isIdentifier(expression) &&
      (wrappers.has(expression.text) || drawSymbols.has(symbol(expression)));
    if (primitive || random || wrapped) {
      const start = ts.isPropertyAccessExpression(expression)
        ? expression.name.getStart(source)
        : expression.getStart(source);
      lines.add(source.getLineAndCharacterOfPosition(start).line + 1);
    }
  }
  return lines;
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

export function scannedFiles(root = REPO_ROOT) {
  const files = [];
  for (const scanned of SCANNED_ROOTS) {
    const directory = join(root, scanned);
    if (existsSync(directory)) walk(root, directory, files);
  }
  return files.sort();
}

/**
 * Every guarded line in one file's text.
 * @returns {{ line: number; kind: "roll" | "fixed-share" | "place-in-logic"; code: string }[]}
 */
export function scanSource(text) {
  const findings = [];
  const drawLines = drawCallLines(text);
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
      if (drawLines.has(index + 1) || ROLL_DIRECT.test(code) || storedRoll) {
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
  return findings;
}

/** @returns {{ file: string; line: number; kind: string; code: string }[]} */
export function scanRepository(root = REPO_ROOT) {
  return scannedFiles(root).flatMap((file) =>
    scanSource(readFileSync(join(root, file), "utf8")).map((finding) => ({
      file,
      ...finding,
    })),
  );
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
  for (const entry of allowlist.entries) {
    if (!buildOf.has(entry.file)) buildOf.set(entry.file, entry.build);
  }
  const grouped = new Map();
  for (const finding of findings) {
    const key = keyOf(finding);
    const entry = grouped.get(key);
    if (entry) entry.count += 1;
    else {
      grouped.set(key, {
        file: finding.file,
        kind: finding.kind,
        build: buildOf.get(finding.file) ?? null,
        count: 1,
        code: finding.code,
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
  for (const finding of added) console.error(`new ${describeAdded(finding)}`);
  for (const entry of stale) {
    console.error(
      `gone ${entry.file} ${entry.kind} (${entry.build}): ${entry.code}`,
    );
  }
  if (added.length > 0 || stale.length > 0) {
    console.error(
      `zero-dice: ${added.length} new, ${stale.length} gone. A new line is rewritten as a result of the actor's traits, law, place and relationships (see .claude/skills/no-dice); a removed or reworded one is recorded with \`npm run zero-dice -- --update\`.`,
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
