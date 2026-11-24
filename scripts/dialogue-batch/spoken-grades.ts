/**
 * Turns the owner's spoken note on a line into span grades with strengths
 * (owner, Nov 9, 12:45 a.m.: "I liked half of that, and I didn't like this
 * one part ... I'd rather say 50% or something"; 12:55 a.m.: "since I grade
 * via voice message ... there's a lot of information in how I talk").
 *
 *   node --import tsx scripts/dialogue-batch/spoken-grades.ts <batch.json> <notes.json> > grades.json
 *
 * `notes.json` is `[{ "id": "12.2", "note": "..." }]` (the CTO's grading page
 * or a transcript of a voice message); the batch is
 * docs/coordination/batches/2026-11-09-batch-2.json. The output is a grade
 * file for data/english/grades/ whose rows carry the line's `key`, its
 * `spans` and the `note`; `apply-grades.ts` counts a whole-line verdict in
 * the ledger.
 *
 * How a note is read, from how the owner grades in the voice notes
 * (docs/coordination/voice-notes/, the batch rulings in OWNER-DECISIONS.md):
 *
 *   a part quoted or repeated from the line ("'you know' is filler") is the
 *   span the words around it grade; with no part named, the note grades the
 *   whole line;
 *   the strength comes from his words: "perfect", "love", "great" 1;
 *   "good", "like", "solid" 0.75; "fine", "sure", "decent", "okay" 0.25;
 *   "awkward", "weird", "cheesy", "stiff", "filler", "no context",
 *   "robotic", "AI" -0.75; "terrible", "hate", "awful", "nobody says"
 *   -1; "kind of", "a little", "almost" halve it; a percentage ("50%") sets
 *   it outright, with the sign of the words around it.
 *
 * A development tool. It never words anything.
 */
import { readFileSync } from "node:fs";

export interface SpokenSpan {
  readonly start: number;
  readonly end: number;
  readonly strength: number;
}

const WORDS: readonly [RegExp, number][] = [
  // His words, from the voice notes (docs/coordination/voice-notes/): the
  // negatives first, since "doesn't make sense" holds "make sense" and
  // "don't really like" holds "like". "Not bad" and "second best" come first
  // of all, since each holds a word of another group.
  [/\b(second best|almost right|not bad)\b/, 0.5],
  [
    /\b(nobody (says|talks)|terrible|hate|awful|horrible|garbage|trash|shitty|makes no sense|(doesn'?t|does not|don'?t) (even )?make (any )?sense|shouldn'?t (even )?be (in )?there|take (it|that) out)\b/,
    -1,
  ],
  [
    /\b(don'?t (really )?like|didn'?t like|not (a )?(huge |big )?fan|can'?t say i'?m a (huge |big )?fan|not good|no good|bad|awkward|weird|cheesy|stiff|clunky|unnatural|fragment|filler|no context|missing (a little )?context|robotic|sounds like ai|generic|vague|wrong|creepy|jargon|dev language|dev talky|doesn'?t (really |necessarily )?(fit|make sense|work)|out of place|too much|how would (they|he|she|you|anyone) know|(don'?t|do not) have any context|not (quite |really )?sure what (that|this|it) means|(don'?t|do not) (really |quite |even )?(know|understand) what (that|this|it) means|(don'?t|do not) (really |quite )?understand (that|this|it)\b)\b|\bthat doesn'?t\s*\.{2,}/,
    -0.75,
  ],
  [
    /\b(perfect|love|loved|great|excellent|ooh|exactly|(i )?like (that|it|this) a lot|that'?s how people talk|really good|the best|is best)\b/,
    1,
  ],
  [
    /\b(good|i (really )?like|we like|liked|solid|natural|nice|makes sense|that works|fits|funny|smart)\b/,
    0.75,
  ],
  [/\b(fine|sure|decent|okay|ok|acceptable|al{1,2} ?right|fair)\b/, 0.25],
];

const SOFTENERS = /\b(kind of|kinda|a little|a bit|almost|sort of|slightly)\b/;

/** The strength a stretch of the owner's words gives, or undefined when it grades nothing. */
export function strengthOf(words: string): number | undefined {
  // "Okay, so", "Well," and the like open his sentences without grading anything.
  const opener =
    /^(okay|ok|so|well|alright|all right|yeah|um|uh|now)\b[,.]?\s*/;
  let t = words.toLowerCase().trim();
  while (opener.test(t)) t = t.replace(opener, "");
  const percent = /(-?\d{1,3})\s*(%|percent)/.exec(t);
  let strength: number | undefined;
  for (const [pattern, value] of WORDS)
    if (pattern.test(t)) {
      strength = value;
      break;
    }
  if (percent) {
    const share = Math.min(100, Math.abs(Number(percent[1]))) / 100;
    return (strength !== undefined && strength < 0 ? -1 : 1) * share;
  }
  if (strength === undefined) return undefined;
  return SOFTENERS.test(t) ? strength / 2 : strength;
}

/** Where a part he names sits in the line, ignoring case and punctuation at its edges. */
function find(line: string, part: string): [number, number] | undefined {
  const needle = part
    .trim()
    .replace(/^[^a-z0-9{]+|[^a-z0-9}]+$/gi, "")
    .toLowerCase();
  if (needle.length < 2) return undefined;
  const at = line.toLowerCase().indexOf(needle);
  return at < 0 ? undefined : [at, at + needle.length];
}

/**
 * The span grades a note gives a line. Each sentence of the note grades the
 * parts of the line it quotes, or the whole line when it quotes none.
 */
export function spokenToSpans(line: string, note: string): SpokenSpan[] {
  const out: SpokenSpan[] = [];
  for (const sentence of note.split(/(?<=[.!?;])\s+|\bbut\b/i)) {
    const strength = strengthOf(sentence);
    if (strength === undefined) continue;
    const quoted = [...sentence.matchAll(/["“'‘]([^"”’]{2,}?)["”'’]/g)].map(
      (match) => match[1]!,
    );
    const places = quoted
      .map((part) => find(line, part))
      .filter((place): place is [number, number] => place !== undefined);
    if (places.length === 0) {
      out.push({ start: 0, end: line.length, strength });
      continue;
    }
    for (const [start, end] of places) out.push({ start, end, strength });
  }
  return out;
}

interface BatchJson {
  readonly id: string;
  readonly moments: readonly {
    readonly lines: readonly { id: string; key: string; text: string }[];
  }[];
}

function main(batchPath: string, notesPath: string) {
  const batch = JSON.parse(readFileSync(batchPath, "utf8")) as BatchJson;
  const notes = JSON.parse(readFileSync(notesPath, "utf8")) as {
    id: string;
    note: string;
  }[];
  const lines = new Map(
    batch.moments
      .flatMap((moment) => moment.lines)
      .map((line) => [line.id, line]),
  );
  const grades = notes.map((row) => {
    const line = lines.get(row.id);
    if (!line)
      throw new Error(`${notesPath}: no line ${row.id} in ${batchPath}`);
    return {
      key: line.key,
      spans: spokenToSpans(line.text, row.note),
      note: row.note,
    };
  });
  console.log(JSON.stringify({ batch: batch.id, grades }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`)
  main(process.argv[2]!, process.argv[3]!);
