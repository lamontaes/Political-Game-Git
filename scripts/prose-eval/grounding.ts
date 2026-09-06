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

export type GroundingRule =
  | "date-invention"
  | "time-invention"
  | "delivery-invention"
  | "scope-widening"
  | "player-gender"
  | "surface-drift";

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

const GENDERED_PRONOUNS = [
  "he",
  "him",
  "his",
  "she",
  "her",
  "hers",
  "himself",
  "herself",
];

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
 * are review metadata; grounding is judged on what the player would read.
 */
export function extractProse(output: string): string {
  const lines = output.split(/\r?\n/);
  const kept: string[] = [];
  let inProse = false;
  for (const line of lines) {
    const lower = line.trim().toLowerCase();
    if (/^result\s*:/.test(lower)) continue;
    if (/^(omitted|missing|reason)\s*:/.test(lower)) {
      inProse = false;
      continue;
    }
    if (/^prose\s*:/.test(lower)) {
      inProse = true;
      kept.push(line.replace(/^\s*prose\s*:/i, ""));
      continue;
    }
    if (!inProse) {
      // Content before any `prose:` marker is treated as prose so that a bare
      // output (no result envelope) is still checked rather than skipped.
      if (
        kept.length === 0 &&
        line.trim() !== "" &&
        !/^-\s/.test(line.trim())
      ) {
        kept.push(line);
      }
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

function packetSection(packet: string, field: string): string {
  const match = new RegExp(`^${field}\\s*:(.*)$`, "im").exec(packet);
  return match ? match[1] : "";
}

function hasWord(haystack: string, word: string): boolean {
  if (/[^a-z0-9']/.test(word)) return haystack.includes(word);
  return new RegExp(`\\b${word.replace(/'/g, "'")}\\b`).test(haystack);
}

function isArtifactSurface(packet: string): boolean {
  const surface = normalize(
    packetSection(packet, "SURFACE") +
      " " +
      packetSection(packet, "OUTPUT REQUEST"),
  );
  return ARTIFACT_SURFACE_TERMS.some((term) => surface.includes(term));
}

function isNoteSurface(packet: string): boolean {
  const surface = normalize(packetSection(packet, "SURFACE"));
  return NOTE_SURFACE_TERMS.some((term) => surface.includes(term));
}

const CLOCK_PATTERN =
  /\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:a\.m\.|p\.m\.|am|pm)\b|\bo'clock\b/;

export function checkGrounding(
  packet: string,
  output: string,
): GroundingReport {
  const packetText = normalize(packet);
  const prose = normalize(extractProse(output));
  const findings: GroundingFinding[] = [];

  // 1. Dates and days ------------------------------------------------------
  for (const label of [...WEEKDAYS, ...MONTHS, ...RELATIVE_DAY_LABELS]) {
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

  // 2. Clock times. Conservative: only when the packet supplies no time at all.
  if (CLOCK_PATTERN.test(prose) && !CLOCK_PATTERN.test(packetText)) {
    const match = CLOCK_PATTERN.exec(prose);
    findings.push({
      rule: "time-invention",
      claim: match ? match[0] : "clock time",
      detail:
        "output states a clock time; the packet establishes no time of day. " +
        "(When the packet does supply times, hour-level precision is left to " +
        "the grounding reviewer rather than checked here.)",
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

  // 5. Player gender -------------------------------------------------------
  if (!isArtifactSurface(packet)) {
    const packetHasGender = GENDERED_PRONOUNS.some((p) =>
      hasWord(packetText, p),
    );
    if (!packetHasGender) {
      const used = GENDERED_PRONOUNS.filter((p) => hasWord(prose, p));
      if (used.length > 0) {
        findings.push({
          rule: "player-gender",
          claim: used.join(", "),
          detail:
            "character-facing prose uses third-person gendered pronouns; the " +
            "packet supplies no gender and second person is the required form",
        });
      }
    }
  }

  // 6. Surface authority ---------------------------------------------------
  // A task note is a written record, not a played scene. Staged dialogue is
  // caught whether or not it is quoted — dropping the quotation marks is the
  // harder version of the same drift.
  if (isNoteSurface(packet) && !isArtifactSurface(packet)) {
    const packetHasQuote = /"/.test(packetText);
    const quoted = /"[^"]{12,}"/.test(prose);
    const attributed = ATTRIBUTION_VERBS.some((verb) => hasWord(prose, verb));
    if ((quoted || attributed) && !packetHasQuote) {
      findings.push({
        rule: "surface-drift",
        claim: quoted ? "staged direct dialogue" : "unquoted staged dialogue",
        detail:
          "the packet's SURFACE is a note/task record, but the output stages " +
          "spoken dialogue the packet does not supply",
      });
    }
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
