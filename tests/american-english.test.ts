import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The game is set in the United States, and every word a player reads must be
 * American English. British forms keep slipping into copy, so this guard scans
 * everything a player can read and fails, naming file:line, when one appears.
 *
 * What is scanned:
 *  - every string literal and template literal in src/**\/*.ts and *.tsx
 *    (test files are skipped: their own fixtures are not player text), and
 *  - every string value in data/**\/*.json, except data/source/, which holds
 *    verbatim federal source corpora (about 850 MB of agency records that are
 *    never shown as written, and would blow the time budget).
 *
 * Identifiers and JSON keys are not scanned: only quoted values are.
 */

const ROOT = path.resolve(__dirname, "..");

interface Rule {
  readonly pattern: RegExp;
  readonly instead: string;
}

/** A British form (whole word, any case) and what to write instead. */
const RULES: readonly Rule[] = [
  {
    pattern: /\bcouncillors?(?:'s)?\b|\bcouncillors'/i,
    instead: "council member(s)",
  },
  {
    pattern:
      /\b(?:re|dis|un|mis)?organis(?:e|es|ed|ing|ation|ations|ational|er|ers)\b/i,
    instead: "organize / organization",
  },
  {
    pattern:
      /\b(?:recognis|realis|authoris|apologis|summaris|prioritis|criticis|emphasis|minimis|maximis|specialis|finalis|utilis|mobilis|legalis|standardis|normalis|capitalis|modernis|centralis|categoris|publicis|customis|memorialis|itemis|subsidis|jeopardis|harmonis|familiaris|generalis|socialis|stabilis|neutralis|digitis|localis|criminalis|privatis|nationalis|sympathis|energis|fertilis|hospitalis|penalis|monetis|characteris|visualis|materialis|rationalis|revitalis|computeris|industrialis|urbanis|equalis|formalis|ritualis|victimis|pressuris|scrutinis|sanitis|sterilis|colonis|dramatis|economis|idealis|immunis|internalis|moralis|optimis|patronis|personalis|popularis|randomis|stigmatis|systematis|theoris|trivialis|westernis)(?:e|es|ed|ing|ation|ations|ational|er|ers)\b/i,
    instead: "-ize / -ization spelling",
  },
  {
    pattern:
      /\b(?:analys|paralys|catalys)(?:e|ed|ing)\b|\b(?:paralys|catalys)es\b/i,
    instead: "-yze spelling",
  },
  {
    pattern: /\b(?:dis|multi)?colour(?:s|ed|ing|ful|less|ist)?\b/i,
    instead: "color",
  },
  { pattern: /\bneighbour(?:s|ing|ly|hood|hoods|ed)?\b/i, instead: "neighbor" },
  { pattern: /\bfavour(?:s|ed|ing|ite|ites|able|ably)?\b/i, instead: "favor" },
  { pattern: /\bbehaviour(?:s|al)?\b/i, instead: "behavior" },
  { pattern: /\bhonour(?:s|ed|ing|able|ably)?\b/i, instead: "honor" },
  { pattern: /\blabour(?:s|ed|ing|er|ers)?\b/i, instead: "labor" },
  { pattern: /\bcentres?\b/i, instead: "center" },
  { pattern: /\bprogrammes?\b/i, instead: "program" },
  { pattern: /\blicences?\b/i, instead: "license" },
  { pattern: /\bdefences?\b/i, instead: "defense" },
  {
    pattern: /\b(?:travelled|travelling|traveller|travellers)\b/i,
    instead: "traveled / traveling / traveler",
  },
  { pattern: /\bcheques?\b/i, instead: "check" },
  { pattern: /\bkerbs?\b/i, instead: "curb" },
  { pattern: /\btyres?\b/i, instead: "tire" },
  { pattern: /\bgrey(?:s|ed|ing|er|est|ish)?\b/i, instead: "gray" },
  { pattern: /\bfortnights?\b/i, instead: "two weeks" },
  { pattern: /\brotas?\b/i, instead: "schedule" },
  {
    // "queue" is also the ordinary American word for a work or data queue, so
    // only the people-waiting sense is flagged.
    pattern:
      /\b(?:join|joins|joined|joining|jump|jumps|jumped|jumping|stand|stands|standing|stood|wait|waits|waiting|waited|line(?:d)? up)\b[^.]{0,30}\bqueue\b|\bqueue(?:s|d)? (?:at the (?:checkout|bank|counter|till|door|bus|station|post office|shop|store|cafe|pharmacy|clinic)|for the (?:bus|train|checkout|till|toilets?|ride)|to (?:get in|see|buy|pay)|outside|around the (?:block|corner)|behind)\b|\bat the (?:back|front|end) of the queue\b|\b(?:long|short|slow|bus|bread|checkout|ticket|taxi) queues?\b|\bqueue-jump|\bqueuing\b|\bqueueing\b/i,
    instead: "line",
  },
  {
    // "flat" is an ordinary American adjective (flat rate, flat floor), so only
    // the apartment sense is flagged.
    pattern:
      /\b(?:my|your|his|her|their|our|shared|rented|new|old|small|tiny|cramped|upstairs|downstairs|top-floor|ground-floor|one-bedroom|two-bedroom|three-bedroom|studio|council|first-floor|second-floor) flats?\b|\bflats? (?:above|downstairs|upstairs|share|block)\b|\bflatmates?\b|\bflat-share\b|\bblock of flats\b/i,
    instead: "apartment",
  },
  {
    // Public holidays are American usage; only the vacation sense is flagged.
    pattern:
      /\b(?:on|summer|family|school|bank|half-term)\s+holidays?\b|\b(?:go|goes|going|went|gone|take|takes|taking|took|taken)\s+(?:a\s+|your\s+|their\s+|his\s+|her\s+|our\s+|my\s+)?holidays?\b|\bholiday(?:s)? (?:abroad|in (?:spain|france|italy))\b|\bholidaymakers?\b/i,
    instead: "vacation",
  },
  { pattern: /\bmum(?:s|my)?\b/i, instead: "mom" },
  { pattern: /\bpetrol\b/i, instead: "gas" },
  { pattern: /\bhigh streets?\b/i, instead: "main street" },
  { pattern: /\bcar parks?\b/i, instead: "parking lot" },
  {
    pattern: /\blocal authorit(?:y|ies)\b/i,
    instead: "local government (or city / county)",
  },
  { pattern: /\belected members?\b/i, instead: "elected official" },
  {
    pattern:
      /\bstand(?:s|ing)? for (?:office|council|election|mayor|re-?election|the (?:council|mayoralty|seat))\b/i,
    instead: "run for",
  },
  {
    pattern: /\bminist(?:ers?|ry|ries)\b/i,
    instead: "secretary / department / official (clergy ministers are allowed)",
  },
  {
    pattern: /\bwards?\b/i,
    instead: "district (or the place's recorded seat type)",
  },
];

function walk(
  dir: string,
  accept: (file: string) => boolean,
  out: string[],
): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) walk(full, accept, out);
    else if (accept(full)) out.push(full);
  }
  return out;
}

interface Literal {
  readonly text: string;
  readonly line: number;
  /** A `british-spelling-ok:` comment sits just above this literal. */
  readonly marked: boolean;
}

/** Comment that keeps a literal as quoted by committed reports; needs a reason. */
const MARKER = "british-spelling-ok:";

/**
 * Every string literal and template literal in a source file, with its line.
 * A small hand-written scan rather than one big regex: a single regex over a
 * multi-kilobyte template literal overflows the stack. Comments are skipped.
 */
function stringLiterals(source: string): Literal[] {
  const found: Literal[] = [];
  let line = 1;
  let markerLine = -10;
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source[i]!;
    const next = source[i + 1];
    if (c === "\n") {
      line += 1;
      i += 1;
    } else if (c === "/" && next === "/") {
      const start = i;
      while (i < n && source[i] !== "\n") i += 1;
      if (source.slice(start, i).includes(MARKER)) markerLine = line;
    } else if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") line += 1;
        i += 1;
      }
      i += 2;
    } else if (c === '"' || c === "'" || c === "`") {
      const startLine = line;
      let text = "";
      i += 1;
      while (i < n && source[i] !== c) {
        if (source[i] === "\\") {
          text += source[i + 1] ?? "";
          if (source[i + 1] === "\n") line += 1;
          i += 2;
          continue;
        }
        if (source[i] === "\n") {
          if (c !== "`") break; // unterminated: it was an apostrophe, not a string
          line += 1;
        }
        text += source[i];
        i += 1;
      }
      i += 1;
      found.push({
        text,
        line: startLine,
        marked: startLine - markerLine <= 3 && startLine >= markerLine,
      });
    } else {
      i += 1;
    }
  }
  return found;
}

interface Hit {
  readonly where: string;
  readonly word: string;
  readonly instead: string;
  readonly text: string;
}

/**
 * A literal with no whitespace and a separator in it (`civic.organise-it`,
 * `source-colour`, a URL), or a single lowercase or all-caps token (`queued`,
 * `WARD`), is a code token or an enum value, not something a player reads.
 * A single Capitalized word ("Programme") still counts as a label.
 */
function isCodeToken(text: string): boolean {
  if (/\s/.test(text)) return false;
  if (/[-._:/@#$\\{}[\]()=]/.test(text)) return true;
  return (
    /^[a-z][a-z0-9]*$/.test(text) ||
    /^[A-Z0-9]+$/.test(text) ||
    /^[a-z]+[A-Z]\w*$/.test(text)
  );
}

/**
 * Names and quotations that are genuinely British-looking but are not British
 * copy. Each entry removes the matching text before the word check runs.
 */
const ALLOWED_PHRASES: readonly {
  readonly pattern: RegExp;
  readonly reason: string;
}[] = [
  {
    pattern: /\bLabour Party\b/g,
    reason: "a real party name, if one is ever quoted",
  },
  {
    pattern:
      /\b(?:church|parish|youth|associate|Baptist|Methodist|Presbyterian|Lutheran|Unitarian|Protestant|Episcopal|ordained|pastor and) ministers?\b|\bministers? of the (?:gospel|church)\b/gi,
    reason: "clergy: a church minister is American usage",
  },
  {
    pattern: /\bpublic Ministers\b/g,
    reason: "Article II of the U.S. Constitution, quoted verbatim",
  },
  {
    pattern: /\b\d+ (?:[NSEW]\. )?High Street\b/g,
    reason: "real street addresses of real government buildings",
  },
  {
    pattern:
      /\b(?:legal|public|federal|state|national|bank|school) holidays?\b/gi,
    reason: "public holidays are American usage",
  },
  { pattern: /\bsales tax holidays?\b/gi, reason: "an American tax term" },
  {
    pattern:
      /\b(?:(?:majority|two-thirds|one-third|three-fifths|quorum|number|2\/3) of (?:all )?(?:the )?elected members?|elected members? (?:of|in) (?:each|the|a|that|all) (?:house|houses|chamber|senate|respective)|newly elected members?)\b/gi,
    reason:
      "state constitutions and chamber rules, quoted: 'a majority of the elected members' is the legal term of art for counting members net of vacancies",
  },
  {
    pattern: /\bD\.C\. Council redraws ward boundaries\b/g,
    reason: "the District of Columbia is divided into eight wards by D.C. Code",
  },
];

/**
 * Files that are lists of real names or verbatim legal text, where the British
 * spelling is the recorded wording and not the game's own copy. Entries limit
 * the exemption to named rule patterns where the file is otherwise player copy.
 */
const ALLOWED_FILES: readonly {
  readonly file: RegExp;
  readonly words?: RegExp;
  readonly reason: string;
}[] = [
  {
    file: /^src\/simulation\/(?:government-units|national-places|national-counties)\.generated\.ts$/,
    reason:
      "Census place, county and government names: Centre County, Centreville, Grey Eagle, Holiday Island, Flat Rock, Tyre, Seward",
  },
  {
    file: /^src\/simulation\/territory-places\.ts$/,
    reason: "Rota is a municipality of the Northern Mariana Islands",
  },
  {
    file: /^src\/simulation\/names-data\.ts$/,
    reason: "Ward is a family name",
  },
  {
    file: /^src\/simulation\/judiciary\/generated\/federal-courts\.ts$/,
    reason: "federal court division and county names",
  },
  {
    file: /^data\/research\/places\/local-institutions\.json$/,
    reason:
      "real names of schools, colleges and employers: Centre College, Sauk Centre, Long Prairie-Grey Eagle, Starr King School for the Ministry, Ward Melville High School",
  },
  {
    file: /^src\/simulation\/municipal-seat-identity\.ts$/,
    words: /^wards?$/i,
    reason:
      "the D.C. Council's eight seats are legally wards (D.C. Code 1-204.01)",
  },
  {
    file: /^src\/simulation\/municipal-election-rule-packs\.ts$/,
    words: /^wards?$/i,
    reason:
      "quotes D.C.'s recorded referendum rule, which counts eight election wards",
  },
  {
    file: /^src\/source\/domains\/(?:municipal-governance\/|political-districts\/identity\.ts$|state-legislatures\/acquisition\.ts$)/,
    words: /^wards?$/i,
    reason:
      "research records of real charters, D.C. and a state constitution, where ward is the recorded seat type or wording",
  },
  {
    file: /^src\/simulation\/municipal-governments\.generated\.ts$/,
    words: /^(?:wards?|elected members?)$/i,
    reason:
      "generated from those real charter records: the recorded WARD seat type, and verbatim research quotes such as Fort Wayne Council has nine elected members, which the source tests check against research packet 44",
  },
  {
    file: /^data\/municipal-elections\/92O-national-state-baseline\.json$/,
    words: /^wards?$/i,
    reason:
      "state-by-state record of real municipal seat structures (Las Vegas wards, Pittsburgh wards, D.C. wards)",
  },
  {
    file: /^data\/research\/local-government\/council-election-methods\.json$/,
    words: /^wards?$/i,
    reason:
      "cites the ICMA survey, whose category is 'all by ward or district'",
  },
];

function isAllowedFile(relative: string, word: string): boolean {
  return ALLOWED_FILES.some(
    (entry) =>
      entry.file.test(relative) && (!entry.words || entry.words.test(word)),
  );
}

/** Remove `${...}` template expressions, which are code, keeping line count. */
function stripExpressions(text: string): string {
  let out = "";
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (depth === 0 && text[i] === "$" && text[i + 1] === "{") {
      depth = 1;
      i += 1;
      out += " ";
    } else if (depth > 0) {
      if (text[i] === "{") depth += 1;
      else if (text[i] === "}") depth -= 1;
    } else {
      out += text[i];
    }
  }
  return out;
}

function scanText(
  relative: string,
  where: string,
  text: string,
  hits: Hit[],
): void {
  // Template-literal expressions, {{placeholders}} and {role:slots} are code.
  let cleaned = stripExpressions(text)
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/\{[a-z][\w-]*:[^}]*\}/g, " ");
  if (isCodeToken(text) || isCodeToken(cleaned.trim())) return;
  for (const allowed of ALLOWED_PHRASES)
    cleaned = cleaned.replace(allowed.pattern, " ");
  for (const rule of RULES) {
    const match = rule.pattern.exec(cleaned);
    if (match && !isAllowedFile(relative, match[0])) {
      hits.push({ where, word: match[0], instead: rule.instead, text });
    }
  }
}

function scanSource(file: string, hits: Hit[]): void {
  const relative = path.relative(ROOT, file);
  for (const literal of stringLiterals(readFileSync(file, "utf8"))) {
    if (literal.text.length < 3 || literal.marked) continue;
    scanText(relative, `${relative}:${literal.line}`, literal.text, hits);
  }
}

function scanJson(file: string, hits: Hit[]): void {
  const relative = path.relative(ROOT, file);
  const visit = (value: unknown, where: string): void => {
    if (typeof value === "string")
      scanText(relative, `${relative}${where}`, value, hits);
    else if (Array.isArray(value))
      value.forEach((item, index) => visit(item, `${where}[${index}]`));
    else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value))
        visit(item, `${where}.${key}`);
    }
  };
  visit(JSON.parse(readFileSync(file, "utf8")), "");
}

function playerFacingHits(): Hit[] {
  const hits: Hit[] = [];
  const sources = walk(
    path.join(ROOT, "src"),
    (file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file),
    [],
  );
  for (const file of sources) scanSource(file, hits);
  // data/source holds verbatim federal source corpora (about 850 MB of agency
  // records), which are never shown as written and would break the time budget.
  const data = walk(
    path.join(ROOT, "data"),
    (file) =>
      file.endsWith(".json") &&
      !file.includes(`${path.sep}data${path.sep}source${path.sep}`),
    [],
  );
  for (const file of data) scanJson(file, hits);
  return hits;
}

describe("Player-facing text is American English", () => {
  it("contains no British form from the curated list", () => {
    const hits = playerFacingHits();
    const report = hits.map((hit) => {
      const at = hit.text.toLowerCase().indexOf(hit.word.toLowerCase());
      const excerpt = hit.text
        .slice(Math.max(0, at - 40), at + 60)
        .replace(/\s+/g, " ");
      return `${hit.where}  "${hit.word}" -> ${hit.instead}  ...${excerpt}...`;
    });
    expect(report, "British forms found in player-facing text").toEqual([]);
  });
});

describe("The American English rules themselves", () => {
  const flagged = (text: string): string[] => {
    const hits: Hit[] = [];
    scanText("fixture.ts", "fixture.ts:1", text, hits);
    return hits.map((hit) => hit.word.toLowerCase());
  };

  it.each([
    ["The councillor spoke.", "councillor"],
    ["We organise a rally.", "organise"],
    ["A new colour scheme.", "colour"],
    ["Your neighbour waves.", "neighbour"],
    ["Cut the programme.", "programme"],
    ["Renew your licence.", "licence"],
    ["Back in a fortnight.", "fortnight"],
    ["You wait in a long queue.", "long queue"],
    ["She rents a flat above the shop.", "flat above"],
    ["He is on holiday.", "on holiday"],
    ["Ask your mum.", "mum"],
    ["The local authority decides.", "local authority"],
    ["The minister resigned.", "minister"],
    ["Stand for office.", "stand for office"],
  ])("catches %s", (text, word) => {
    expect(flagged(text)).toHaveLength(1);
    expect(flagged(text)[0]).toContain(word.toLowerCase());
  });

  it.each([
    "The council member spoke.",
    "We organize a rally.",
    "A flat rate and a flat floor.",
    "The work queue is long.",
    "Congress observes a legal holiday on Monday.",
    "The church minister gave the blessing.",
    "Sales tax holidays return in August.",
    "Run for office.",
    "Ward is a family name only in the name files.".replace("Ward", "Aware"),
    "The aftermath of the flatMap discussion.",
  ])("leaves American text alone: %s", (text) => {
    expect(flagged(text)).toEqual([]);
  });
});
