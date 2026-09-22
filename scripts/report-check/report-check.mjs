/**
 * The mechanical half of the report standard (`.agents/skills/civic-reports/`).
 *
 * Reports to the owner were written with no check at all: civic-prose covers
 * player-visible text only, so a playtest write-up that opened with a build
 * hash and a browser stall, spelled "labeled" and printed raw dates was never
 * measured against anything. This catches what a script can catch. Whether the
 * story is worth reading is the reviewer's job (`civic-report-reviewer`), not
 * this file's; passing here is a floor, never an acceptance.
 *
 * Plain ESM with no dependencies, so the session hook can run it in any
 * checkout before `npm ci` has happened. Node strips the types from the shared
 * word list on import.
 */
import { BRITISH_IDIOM } from "../prose-eval/american-english.ts";

/** Spelling families the game-copy list does not carry. Word-bounded. */
export const BRITISH_SPELLING = [
  {
    pattern:
      /\b(col|fav|hon|lab|behavi|neighb|harb|rum|hum|flav|vap|sav|endeav|parl|arm|vig|splend|tum|od|rig)our(s|ed|ing|ite|ites|able|ably|hood|hoods|ful|less|er|ers|al|ist|ists)?\b/i,
    instead: "-or (color, favor, labor, neighbor, behavior)",
  },
  {
    pattern:
      /\b(organ|recogn|real|apolog|critic|priorit|summar|emphas|minim|maxim|final|author|categor|character|normal|special|util|custom|optim|standard|visual|memor|mobil|sympath|legal|capital|penal|stabil|subsid|central|local|energ|public|random|serial|initial|material|modern|civil|harmon|legitim|monopol|neutral|patron|polar|popular|privat|rational|scrutin|synchron|trivial|vocal|symbol|global|industrial|institutional|personal|urban|victim|jeopard|agon|antagon|terror|hospital)is(e|es|ed|ing|ation|ations|er|ers)\b/i,
    instead: "-ize / -ization",
  },
  {
    pattern: /\b(anal|paral|catal)ys(e|ed|ing)\b/i,
    instead: "-yze (analyze, paralyze)",
  },
  {
    pattern:
      /\b(label|travel|cancel|model|level|signal|total|fuel|counsel|marshal|channel|tunnel|quarrel|dial|equal|funnel|pencil|shovel|marvel|rival|jewel)l(ed|ing|er|ers|ous)\b/i,
    instead: "one l (labeled, traveled, canceled, modeling)",
  },
  {
    pattern:
      /\b\w*(centre|theatre|metre|litre|fibre|calibre|sombre|spectre|meagre)(s|d)?\b/i,
    instead: "-er (center, theater, meter)",
  },
  {
    pattern: /\b(defence|offence|pretence|licence)s?\b/i,
    instead: "-se (defense, license)",
  },
  { pattern: /\bjeweller(y|s)\b/i, instead: "jewelry" },
  { pattern: /\bpractis(e|es|ed|ing)\b/i, instead: "practice / practiced" },
  {
    pattern: /\b(enrol|enrolment|enrolments|fulfil|fulfilment|instalment)\b/i,
    instead: "enroll / enrollment / fulfill / installment",
  },
  {
    pattern: /\b(judgement|acknowledgement|ageing)s?\b/i,
    instead: "judgment / acknowledgment / aging",
  },
  { pattern: /\bcatalogue(s|d)?\b/i, instead: "catalog" },
  { pattern: /\bgreys?\b/i, instead: "gray" },
  {
    pattern: /\b(learnt|spelt|dreamt|burnt)\b/i,
    instead: "learned / spelled / dreamed / burned",
  },
  { pattern: /\bfull stops?\b/i, instead: "period" },
  { pattern: /\bat the weekend\b/i, instead: "on the weekend" },
  {
    pattern: /\b(sceptic|sceptical|scepticism)\b/i,
    instead: "skeptic / skeptical",
  },
  {
    pattern: /\b(storeys|storey)\b/i,
    instead: "story / stories (of a building)",
  },
  { pattern: /\btyres?\b/i, instead: "tire(s)" },
  { pattern: /\bcheques?\b/i, instead: "check(s)" },
  { pattern: /\bmobile phones?\b/i, instead: "cellphone" },
];

/** Game-copy idioms, minus "queue": a CI or research queue is American usage. */
const IDIOM = BRITISH_IDIOM.filter(({ pattern }) => !pattern.test("queued"));

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December";
const DAY_MONTH_YEAR = new RegExp(`\\b\\d{1,2} (${MONTHS}),? \\d{4}\\b`);
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/;
const CLOCK_UTC = /\b\d{1,2}:\d{2}\s*(UTC|Z)\b|\bUTC\b|\b\d{4}Z\b/;
const HASH = /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/;
const PR_REF = /(^|[\s(])#\d{2,}\b|\/pull\/\d+/;
const FILE_PATH =
  /\b[\w.-]+\/[\w./-]*\.(ts|tsx|mjs|js|json|md|yml|yaml)\b|\b(src|scripts|tests|docs)\/\S+/;
const IDENTIFIER = /\b[a-z]+[A-Z][A-Za-z0-9]*\b/;
const HARNESS =
  /\b(Chromium|Playwright|vitest|headless|spec file|fixture|re-?ran|re-?run|rerun|the harness|test helper|unit tests?|localStorage|page errors?|the browser)\b/i;
const FIRST_PERSON_PROCESS =
  /\bI (am|was|ran|walked|checked|think|believe|did|found|measured|noticed|tried|saw|re-?ran|looked)\b/;
const FILLER =
  /\b(delve|leverage|robust|seamless(ly)?|it'?s worth noting|notably|in conclusion|in summary|needless to say)\b/i;

const STORY_HEADING =
  /\b(as lived|the story|what happened|as the player|the life|the walk|the decade|the year|the campaign)\b/i;

const MAX_LEAD_WORDS = 120;
const MAX_SENTENCE_WORDS = 45;
const MAX_CODE_SPANS_PER_PARAGRAPH = 3;

/** Blank a match while keeping its newlines, so line numbers survive. */
function blank(match) {
  return match.replace(/[^\n]/g, " ");
}

/**
 * Remove what a reader never parses as the author's own prose: code spans,
 * link targets, markup, block quotes and quotations (screen text is quoted evidence; if it
 * is British or prints a raw date, that is a game defect to report, not the
 * report's error). Quotes may wrap lines but never cross a blank line.
 */
function proseOnly(text) {
  return text
    .replace(/`[^`\n]*`/g, blank)
    .replace(/\]\([^)\n]*\)/g, (m) => "]" + blank(m.slice(1)))
    .replace(/<[^>\n]+>/g, blank)
    .replace(/^[ \t]*>.*$/gm, blank)
    .replace(/"(?:[^"\n]|\n(?!\s*\n))*"/g, blank)
    .replace(/“[^”]*”/g, blank);
}

function withoutCode(text) {
  return text.replace(/`[^`\n]*`/g, blank);
}

function words(text) {
  return text.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word));
}

/** Split into lines with fenced code blocks blanked, keeping numbering. */
function bodyLines(text) {
  let fenced = false;
  return text.split(/\r?\n/).map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return "";
    }
    return fenced ? "" : line;
  });
}

function sections(lines) {
  const found = [];
  let current = { heading: null, level: 0, start: 0, lines: [] };
  lines.forEach((line, index) => {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading && heading[1].length <= 2) {
      found.push(current);
      current = {
        heading: heading[2].trim(),
        level: heading[1].length,
        start: index,
        lines: [],
      };
      return;
    }
    current.lines.push({ number: index + 1, text: line });
  });
  found.push(current);
  return found;
}

function paragraphs(lineRecords) {
  const out = [];
  let current = null;
  for (const record of lineRecords) {
    const text = record.text;
    const breaks =
      !text.trim() ||
      /^\s*(#|\||[-*+]\s|\d+\.\s|>)/.test(text) ||
      /^\s*<!--/.test(text);
    if (breaks) {
      if (current) out.push(current);
      current = null;
      // A list item or quote opens its own paragraph; wrapped lines join it.
      if (/^\s*([-*+]\s|\d+\.\s|>)/.test(text))
        current = {
          number: record.number,
          text: text.replace(/^\s*([-*+]|\d+\.|>)\s*/, ""),
        };
      continue;
    }
    if (current) current.text += ` ${text.trim()}`;
    else current = { number: record.number, text: text.trim() };
  }
  if (current) out.push(current);
  return out;
}

/**
 * @param {string} text markdown
 * @param {{ path?: string, story?: boolean }} [options]
 * @returns {{ errors: string[], warnings: string[], story: boolean }}
 */
export function checkReport(text, options = {}) {
  const path = options.path ?? "<report>";
  const errors = [];
  const warnings = [];
  const at = (number, message) => `${path}:${number}: ${message}`;
  const lines = bodyLines(text);
  const proseLines = proseOnly(lines.join("\n")).split("\n");
  const parts = sections(lines);
  const titleIndex = lines.findIndex((line) => /^#\s+/.test(line));

  // American English, on the author's own prose only.
  lines.forEach((line, index) => {
    if (index === titleIndex) return;
    const prose = proseLines[index];
    for (const { pattern, instead } of [...IDIOM, ...BRITISH_SPELLING]) {
      const match = pattern.exec(prose);
      if (match)
        errors.push(at(index + 1, `"${match[0]}" is British; say ${instead}`));
    }
    const dmy = DAY_MONTH_YEAR.exec(prose);
    if (dmy)
      errors.push(
        at(index + 1, `"${dmy[0]}" is day-month-year; write month day, year`),
      );
    if (!/^\s*\|/.test(line)) {
      const iso = ISO_DATE.exec(prose);
      if (iso && !/^#/.test(line))
        errors.push(
          at(
            index + 1,
            `raw date "${iso[0]}" in prose; write it as a reader says it (September 22, 2026)`,
          ),
        );
    }
    const filler = FILLER.exec(prose);
    if (filler)
      warnings.push(
        at(index + 1, `"${filler[0]}" is filler; cut it or say the thing`),
      );
  });

  // The lead: what a reader gets before the first section heading.
  const leadPart = parts.find((part) => part.level === 1) ?? parts[0];
  const lead = paragraphs(leadPart?.lines ?? []);
  const leadText = lead.map((paragraph) => paragraph.text).join(" ");
  const leadProse = (leadPart?.lines ?? [])
    .map((record) => proseLines[record.number - 1])
    .join(" ");
  const leadLine = lead[0]?.number ?? (titleIndex + 1 || 1);
  if (!leadText.trim())
    errors.push(
      at(
        leadLine,
        "no lead: open with a short paragraph saying what happened and what it means before the first section",
      ),
    );
  else {
    const count = words(withoutCode(leadText)).length;
    if (count > MAX_LEAD_WORDS)
      errors.push(
        at(
          leadLine,
          `lead is ${count} words; keep it under ${MAX_LEAD_WORDS} and move method to the end`,
        ),
      );
    for (const [pattern, what] of [
      [/`[^`]+`/, "code"],
      [HASH, "a commit hash"],
      [PR_REF, "a pull request number"],
      [FILE_PATH, "a file path"],
      [CLOCK_UTC, "a clock time"],
      [HARNESS, "how the test was run"],
    ]) {
      const match = pattern.exec(what === "code" ? leadText : leadProse);
      if (match)
        errors.push(
          at(
            leadLine,
            `lead contains ${what} ("${match[0].trim()}"); the lead says what happened and why it matters, method goes at the end`,
          ),
        );
    }
  }

  // Story reports: the first section is the life as the player met it.
  const sectionParts = parts.filter((part) => part.level === 2);
  const story =
    options.story ??
    ((/(^|\/)playtest\//.test(path) && !/\/(INDEX|README)[^/]*$/i.test(path)) ||
      sectionParts.some((part) => STORY_HEADING.test(part.heading ?? "")));
  if (story) {
    const first = sectionParts[0];
    if (!first || !STORY_HEADING.test(first.heading ?? ""))
      errors.push(
        at(
          (first?.start ?? 0) + 1,
          "a playtest or life report opens with the story: make the first section the life as the player lived it",
        ),
      );
    if (sectionParts.length < 2)
      errors.push(
        at(
          (first?.start ?? 0) + 1,
          "the story needs its second half: a section with the why, what could have happened, and the numbers",
        ),
      );
    else if (
      !/\d/.test(
        sectionParts
          .slice(1)
          .flatMap((part) => part.lines.map((l) => l.text))
          .join(" "),
      )
    )
      errors.push(
        at(
          sectionParts[1].start + 1,
          "the second half carries no numbers; he asked for both halves",
        ),
      );
    if (first) {
      for (const record of first.lines) {
        const raw = record.text;
        const prose = proseLines[record.number - 1];
        for (const [pattern, what, onRaw] of [
          [/`[^`]+`/, "code", true],
          [HASH, "a commit hash", false],
          [PR_REF, "a pull request number", false],
          [FILE_PATH, "a file path", false],
          [IDENTIFIER, "a code identifier", false],
          [CLOCK_UTC, "a clock time", false],
          [HARNESS, "test machinery", false],
          [FIRST_PERSON_PROCESS, "the tester narrating", false],
        ]) {
          const match = pattern.exec(onRaw ? raw : prose);
          if (match)
            errors.push(
              at(
                record.number,
                `the story contains ${what} ("${match[0].trim()}"); tell it as the player saw it and move this to the second half`,
              ),
            );
        }
      }
    }
  }

  // Sentences a reader has to hold in their head at once.
  for (const part of parts) {
    for (const paragraph of paragraphs(part.lines)) {
      const plain = withoutCode(paragraph.text).replace(/\]\([^)]*\)/g, "]");
      for (const sentence of plain.split(
        /(?<=[.!?]["”)]?)\s+(?=["“(]?[A-Z0-9])/,
      )) {
        // Quoted screen text is evidence, not the author's sentence length.
        const count = words(proseOnly(sentence)).length;
        if (count > MAX_SENTENCE_WORDS)
          errors.push(
            at(
              paragraph.number,
              `a ${count}-word sentence ("${sentence.slice(0, 50).trim()}…"); split it`,
            ),
          );
      }
      const spans = paragraph.text.match(/`[^`]+`/g) ?? [];
      if (spans.length > MAX_CODE_SPANS_PER_PARAGRAPH)
        warnings.push(
          at(
            paragraph.number,
            `${spans.length} code references in one paragraph; say what happens in words and keep one location as evidence`,
          ),
        );
    }
  }

  return { errors, warnings, story };
}

/** Owner-facing files the hook measures. Agent handoffs and raw research are not reports. */
export function isOwnerReportPath(filePath) {
  if (!/\.md$/i.test(filePath)) return false;
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.startsWith("/mnt/project-files/"))
    return !/\/mnt\/project-files\/(handoffs|research|owner-record|uploads|chatgpt-[^/]*)\//.test(
      normalized,
    );
  return /(^|\/)docs\/(playtest|reports)\//.test(normalized);
}
