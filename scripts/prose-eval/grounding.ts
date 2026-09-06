// Deterministic grounding gate for civic-prose output.
//
// The reserve blind round showed that a generic "self-check" instruction does
// not stop the writer inventing dates, delivery channels, group behaviour, or
// player gender. This module turns the failure classes the owner actually
// found into mechanical checks that run with no model call, so a regression
// fails in CI rather than in an owner review.
//
// Scope and honesty about that scope:
//   - These checks are a floor, not a proof of grounding. They catch the
//     enumerated classes; semantic claim-vs-packet checking is the job of the
//     civic-prose-grounding-reviewer agent.
//   - Every check is conservative: it fires only when the packet supplies no
//     support at all for the class in question. Where a packet supplies
//     partial support (e.g. it gives some clock time), the check defers to the
//     reviewer rather than guessing at precision.
//   - Nothing here rewrites prose. The gate reports; it never edits.

import { parseResultClass } from "./lib";

export type GroundingRule =
  | "date-invention"
  | "time-invention"
  | "delivery-invention"
  | "scope-widening"
  | "player-gender"
  | "surface-drift"
  | "envelope-drift";

export interface GroundingFinding {
  rule: GroundingRule;
  claim: string;
  detail: string;
}

export interface GroundingReport {
  pass: boolean;
  findings: GroundingFinding[];
}

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

// Relative day labels assert a position in time just as firmly as a weekday.
const RELATIVE_DAY_LABELS = [
  "today",
  "tonight",
  "tomorrow",
  "yesterday",
  "overnight",
  "this morning",
  "this afternoon",
  "this evening",
  "last night",
  "next week",
  "last week",
  "next month",
  "last month",
  "next year",
  "last year",
];

// How an interaction physically reaches the character. The reserve round's
// three C failures were all in this class.
const DELIVERY_TERMS = [
  "calls",
  "called",
  "call",
  "phone",
  "phones",
  "telephone",
  "rings",
  "rang",
  "buzzes",
  "buzzed",
  "voicemail",
  "email",
  "e-mail",
  "emails",
  "emailed",
  "inbox",
  "text message",
  "texts",
  "texted",
  "message arrives",
  "message comes",
  "letter arrives",
  "envelope",
  "stops by",
  "stopped by",
  "drops by",
  "dropped by",
  "walks in",
  "walked in",
  "walks into",
  "comes in",
  "came in",
  "enters",
  "entered",
  "doorway",
  "in the door",
  "at your door",
  "knocks",
  "knocked",
  "hands you",
  "handed you",
  "hands over",
  "slides",
  "desk",
  "office door",
  "leans in",
  "sits down across",
];

// Plural / collective no-action constructions. One actor's silence is not a
// group's silence.
const NO_ACTION_PREDICATES = [
  "did not respond",
  "didn't respond",
  "did not return",
  "didn't return",
  "were not returned",
  "was not returned",
  "did not reply",
  "didn't reply",
  "declined to comment",
  "decline to comment",
  "could not be reached",
  "couldn't be reached",
  "did not comment",
  "didn't comment",
  "gave no comment",
  "offered no comment",
  "no comment",
];

const PLURAL_SUBJECTS = [
  "members",
  "others",
  "the others",
  "those who",
  "several",
  "many",
  "opponents",
  "supporters",
  "lawmakers",
  "legislators",
  "representatives",
  "senators",
  "colleagues",
  "the rest",
  "no one",
  "none of",
  "nobody",
  "they",
];

// Third-person gendered pronouns, split by gender. The split matters: an NPC
// established in one gender never licenses player pronouns of the other, and a
// named NPC is no license for the player at all (the player is second person).
const MALE_PRONOUNS = ["he", "him", "his", "himself"];
const FEMALE_PRONOUNS = ["she", "her", "hers", "herself"];

// Surfaces that keep a native non-second-person register.
const ARTIFACT_SURFACE_TERMS = [
  "in-world artifact",
  "news",
  "article",
  "letter",
  "correspondence",
  "notice",
  "legal",
  "memo",
  "dossier",
  "brief",
];

// Surfaces whose form is a written note/record rather than a played scene.
const NOTE_SURFACE_TERMS = ["task note", "task card", "note", "memo"];

// Speech attribution. Present with or without quotation marks when prose
// stages a spoken exchange.
const ATTRIBUTION_VERBS = [
  "says",
  "said",
  "tells you",
  "told you",
  "asks you",
  "asked you",
  "adds",
  "replies",
  "answers",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ");
}

/**
 * Player-facing prose only. `result:`, `omitted:`, `missing:` and `reason:`
 * are review metadata; grounding is judged on what the player would read. The
 * full prose payload is returned — every prose line, not just the first — so
 * this is a thin view over the structural envelope parse.
 */
export function extractProse(output: string): string {
  return parseEnvelope(output).prose;
}

function packetSection(packet: string, field: string): string {
  const match = new RegExp(`^${field}\\s*:(.*)$`, "im").exec(packet);
  return match ? match[1] : "";
}

function hasWord(haystack: string, word: string): boolean {
  if (/[^a-z0-9']/.test(word)) return haystack.includes(word);
  return new RegExp(`\\b${word.replace(/'/g, "'")}\\b`).test(haystack);
}

// The artifact register is a property the SURFACE declares (surfaces 9a–9e in
// the register list), not something a stray word in the OUTPUT REQUEST turns
// on. "brief" in particular is an ordinary request word ("write a brief note",
// "brief the player"); reading it as an artifact surface silently switched off
// the identity and staging checks. Match SURFACE terms on word boundaries so
// "brief" the artifact is caught but "briefing"/"debrief" are not.
function isArtifactSurface(packet: string): boolean {
  const surface = normalize(packetSection(packet, "SURFACE"));
  return ARTIFACT_SURFACE_TERMS.some((term) => hasWord(surface, term));
}

function isNoteSurface(packet: string): boolean {
  const surface = normalize(packetSection(packet, "SURFACE"));
  return NOTE_SURFACE_TERMS.some((term) => surface.includes(term));
}

// A stated clock time: 2:00, 2 p.m., two o'clock.
const CLOCK_PATTERN =
  /\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:a\.m\.|p\.m\.|am|pm)\b|\bo'clock\b/;

// Named times of day. These assert a moment as firmly as a clock reading.
const TIME_OF_DAY_WORDS = /\b(?:noon|midday|midnight)\b/;

// Approximate / colloquial times: "around 11", "just after 9", "close to noon".
// The negative lookahead keeps a count or duration ("around 5 members", "about
// 45 days") from being read as a clock time.
const APPROX_TIME =
  /\b(?:around|about|round about|shortly after|shortly before|just after|just before|a little after|a little before|close to|half past|quarter past|quarter to|sometime after|sometime before)\s+(?:\d{1,2}(?::\d{2})?\s*(?:a\.m\.|p\.m\.|am|pm|o'clock)?|noon|midday|midnight)\b(?!\s*(?:members?|people|persons?|residents?|voters?|votes?|others?|percent|dollars?|days?|weeks?|months?|years?|minutes?|min|mins|hours?|hrs?|seconds?|secs?|miles?|feet|acres?|blocks?|of\b|to\b|and\b))/;

// The moment the output puts on the clock, if any — checked identically in
// packet and prose so a packet-supplied time defers precision to the reviewer.
function assertedTime(text: string): string | null {
  for (const pattern of [CLOCK_PATTERN, TIME_OF_DAY_WORDS, APPROX_TIME]) {
    const match = pattern.exec(text);
    if (match) return match[0].trim();
  }
  return null;
}

// A month word (`may`, `march`, `august` …) is a common English word as often
// as a calendar month. It asserts a date only in a dated context: beside a day
// number or year, or introduced by a temporal preposition. The lead-in set is
// deliberately restricted to prepositions that never precede the modal verb
// "may" ("in May", "by May", "since May") so that "the vote may pass" is not
// misread as the month of May.
function assertsMonthDate(text: string, month: string): boolean {
  const dayAfter = new RegExp(`\\b${month}\\s+\\d{1,2}(?:st|nd|rd|th)?\\b`);
  const yearAfter = new RegExp(`\\b${month}\\s+\\d{4}\\b`);
  const dayBefore = new RegExp(
    `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?${month}\\b`,
  );
  const leadIn = new RegExp(
    `\\b(?:in|by|since|until|till|through|throughout|during|early|late|mid|mid-)\\s+${month}\\b`,
  );
  return (
    dayAfter.test(text) ||
    yearAfter.test(text) ||
    dayBefore.test(text) ||
    leadIn.test(text)
  );
}

// Structurally parse the candidate result envelope. `prose` is the full
// player-facing payload — every prose line, not just the first — so a claim
// smuggled onto a later line is still checked. `problems` records a malformed
// or unknown result class, a missing required field, or bare/unexpected
// material sitting outside the allowed shape, so an envelope that only *looks*
// valid on its first line cannot pass.
interface ParsedEnvelope {
  prose: string;
  problems: string[];
}

function parseEnvelope(output: string): ParsedEnvelope {
  const lines = output.split(/\r?\n/);
  const hasResult = lines.some((line) => /^\s*result\s*:/i.test(line));

  if (!hasResult) {
    // No result wrapper. Everything a player would read is prose; strip only a
    // stray leading `prose:`/metadata marker, and check the rest in full.
    const prose = lines
      .filter((line) => !/^\s*(omitted|missing|reason)\s*:/i.test(line))
      .map((line) => line.replace(/^\s*prose\s*:/i, ""))
      .join("\n");
    return { prose, problems: [] };
  }

  const proseParts: string[] = [];
  const junk: string[] = [];
  let section: "pre" | "prose" | "omitted" | "missing" | "reason" = "pre";
  for (const line of lines) {
    const marker = /^\s*(result|prose|omitted|missing|reason)\s*:(.*)$/i.exec(
      line,
    );
    if (marker) {
      const field = marker[1].toLowerCase();
      if (field === "result") {
        section = "pre";
        continue;
      }
      if (field === "prose") {
        section = "prose";
        proseParts.push(marker[2]);
        continue;
      }
      section = field as "omitted" | "missing" | "reason";
      continue;
    }
    if (section === "prose") {
      proseParts.push(line);
      continue;
    }
    // A non-empty, non-marker line before any `prose:` (or between `result:` and
    // the first field) is chatter the contract does not allow. The omitted /
    // missing / reason payloads are review metadata and are intentionally not
    // treated as prose or as junk.
    if (section === "pre" && line.trim() !== "") junk.push(line);
  }

  const problems = [...parseResultClass(output).problems];
  if (junk.length > 0) {
    problems.push(
      `unexpected content outside the result envelope: ` +
        junk.map((line) => `"${line.trim()}"`).join(", "),
    );
  }
  // Junk is checked for grounding too — chatter can still assert facts.
  return { prose: [...proseParts, ...junk].join("\n"), problems };
}

export function checkGrounding(
  packet: string,
  output: string,
): GroundingReport {
  const packetText = normalize(packet);
  const envelope = parseEnvelope(output);
  const prose = normalize(envelope.prose);
  const findings: GroundingFinding[] = [];

  // 1. Dates and days ------------------------------------------------------
  // Weekdays and relative-day labels are unambiguous temporal words; flag any
  // the packet does not supply.
  for (const label of [...WEEKDAYS, ...RELATIVE_DAY_LABELS]) {
    if (hasWord(prose, label) && !hasWord(packetText, label)) {
      findings.push({
        rule: "date-invention",
        claim: label,
        detail:
          `output places the moment on "${label}"; the packet establishes no such ` +
          `day, date, or relative-day fact`,
      });
    }
  }
  // Months are checked contextually so the modal "may" and the verb "march"
  // are not misread as the calendar months of the same spelling.
  for (const month of MONTHS) {
    if (assertsMonthDate(prose, month) && !hasWord(packetText, month)) {
      findings.push({
        rule: "date-invention",
        claim: month,
        detail:
          `output dates the moment in "${month}"; the packet establishes no such ` +
          `month or date`,
      });
    }
  }

  // 2. Times of day. Conservative: only when the packet supplies no time at
  // all. Approximate and colloquial times ("around 11") count as assertions.
  const proseTime = assertedTime(prose);
  if (proseTime && !assertedTime(packetText)) {
    findings.push({
      rule: "time-invention",
      claim: proseTime,
      detail:
        `output states a time of day ("${proseTime}"); the packet establishes ` +
        "no time. (When the packet does supply a time, hour-level precision is " +
        "left to the grounding reviewer rather than checked here.)",
    });
  }

  // 3. Delivery and staging ------------------------------------------------
  for (const term of DELIVERY_TERMS) {
    if (hasWord(prose, term) && !hasWord(packetText, term)) {
      findings.push({
        rule: "delivery-invention",
        claim: term,
        detail:
          `output stages the interaction with "${term}"; the packet does not ` +
          `establish that channel, arrival, or location`,
      });
    }
  }

  // 4. Scope widening ------------------------------------------------------
  for (const predicate of NO_ACTION_PREDICATES) {
    if (!prose.includes(predicate)) continue;
    const index = prose.indexOf(predicate);
    const before = prose.slice(Math.max(0, index - 80), index);
    const subject = PLURAL_SUBJECTS.find((word) => hasWord(before, word));
    if (!subject) continue;
    if (
      NO_ACTION_PREDICATES.some(
        (p) =>
          packetText.includes(p) &&
          PLURAL_SUBJECTS.some((s) => hasWord(packetText, s)),
      )
    ) {
      continue;
    }
    findings.push({
      rule: "scope-widening",
      claim: `${subject} ... ${predicate}`,
      detail:
        `output attributes "${predicate}" to "${subject}"; the packet establishes ` +
        `this only for a single named actor, if at all`,
    });
  }

  // 5. Player identity -----------------------------------------------------
  // The player is second person; a gendered pronoun in character-facing prose
  // needs a same-gender actor the packet actually establishes. Checking each
  // gender on its own is what stops an NPC's "he" from licensing the player's
  // "she": a pronoun the packet supplies in one gender is no support for the
  // other, and a merely named NPC is no support for the player at all.
  if (!isArtifactSurface(packet)) {
    const packetMale = MALE_PRONOUNS.some((p) => hasWord(packetText, p));
    const packetFemale = FEMALE_PRONOUNS.some((p) => hasWord(packetText, p));
    const unsupported: string[] = [];
    if (!packetMale) {
      unsupported.push(...MALE_PRONOUNS.filter((p) => hasWord(prose, p)));
    }
    if (!packetFemale) {
      unsupported.push(...FEMALE_PRONOUNS.filter((p) => hasWord(prose, p)));
    }
    if (unsupported.length > 0) {
      findings.push({
        rule: "player-gender",
        claim: unsupported.join(", "),
        detail:
          "character-facing prose uses third-person gendered pronouns the packet " +
          "does not establish for a same-gender actor; second person is the " +
          "required player form, and an NPC of one gender never licenses the other",
      });
    }
  }

  // 6. Surface authority ---------------------------------------------------
  // A task note is a written record, not a played scene. Staged dialogue is
  // caught whether or not it is quoted. A quotation mark elsewhere in the
  // packet is no licence to stage a scene here: the only quoted speech a note
  // may carry is a line the packet supplies verbatim, and even a supplied quote
  // may not be dressed with attribution ("Nasser tells you, leaning in").
  if (isNoteSurface(packet) && !isArtifactSurface(packet)) {
    const quotedSpans = [...prose.matchAll(/"([^"]{12,})"/g)].map((m) => m[1]);
    const stagedQuote = quotedSpans.some((span) => !packetText.includes(span));
    const attributed = ATTRIBUTION_VERBS.some((verb) => hasWord(prose, verb));
    if (stagedQuote || attributed) {
      findings.push({
        rule: "surface-drift",
        claim: attributed ? "staged dialogue" : "staged direct quotation",
        detail:
          "the packet's SURFACE is a note/task record, but the output stages " +
          "spoken dialogue the packet does not supply (a stray quotation mark " +
          "elsewhere in the packet does not license staging a scene here)",
      });
    }
  }

  // 7. Result envelope -----------------------------------------------------
  // A malformed or unknown result class, a missing required field, or chatter
  // outside the allowed shape is itself a rejection: an envelope that only
  // looks valid on its first line does not pass on that alone.
  if (envelope.problems.length > 0) {
    findings.push({
      rule: "envelope-drift",
      claim: "result envelope",
      detail: envelope.problems.join("; "),
    });
  }

  return { pass: findings.length === 0, findings };
}

export function formatGroundingReport(report: GroundingReport): string {
  if (report.pass) return "GROUNDING: PASS";
  const lines = ["GROUNDING: UNSUPPORTED CLAIMS"];
  for (const finding of report.findings) {
    lines.push(`  [${finding.rule}] ${finding.claim} — ${finding.detail}`);
  }
  return lines.join("\n");
}

// --- Model-reviewer verdicts -------------------------------------------------
//
// The grounding reviewer is a separate agent, so its reply is untrusted text.
// Parsing is fail-closed: anything that is not an unambiguous PASS is treated
// as not-passing, so a reviewer that drifts out of its output contract can
// never be mistaken for a clean verdict.

export interface ReviewerVerdict {
  pass: boolean;
  malformed: boolean;
  claims: string[];
}

export function parseReviewerVerdict(reply: string): ReviewerVerdict {
  const text = reply.replace(/```/g, "").trim();
  const hasPass = /^\s*GROUNDING:\s*PASS\s*$/im.test(text);
  const hasUnsupported = /^\s*GROUNDING:\s*UNSUPPORTED\s*$/im.test(text);

  if (hasPass && !hasUnsupported) {
    // A bare PASS only counts when the reviewer said nothing else of substance.
    const residue = text.replace(/^\s*GROUNDING:\s*PASS\s*$/im, "").trim();
    if (residue === "") return { pass: true, malformed: false, claims: [] };
    return { pass: false, malformed: true, claims: [] };
  }

  if (hasUnsupported) {
    const claims = [...text.matchAll(/^\s*-\s*claim:\s*(.+)$/gim)].map((m) =>
      m[1].trim(),
    );
    return { pass: false, malformed: claims.length === 0, claims };
  }

  return { pass: false, malformed: true, claims: [] };
}
