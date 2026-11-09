/**
 * Reads a whole voice note of the owner's on a grading batch and turns it into
 * grades, the way he actually grades (owner, Nov 9, 8:20 a.m.: "I'm not gonna
 * be physically grading anything. It's all done in the voice notes again look
 * how I did the previous ones").
 *
 *   node --import tsx scripts/dialogue-batch/voice-note-reader.ts <batch.json> <note.md> > grades.json
 *
 * How he grades, from his voice notes (docs/coordination/voice-notes/, the
 * batch 13 review of Oct 15 above all):
 *
 *   He reads a line aloud, with no quote marks, then says what he thinks:
 *   "I'm voting for it and you can quote me. That's very, very, like
 *   confident." The words after a line, up to the next line he reads, are
 *   about that line.
 *
 *   He names where he is: "scene four", "moment 12", "number 5.2", "five
 *   point two", "the second one". A number or a place in the batch sets the
 *   moment and line he is on.
 *
 *   He grades a part by saying it again: "Make it smaller. That doesn't
 *   necessarily make sense." A piece of the line read back, followed by a
 *   judgment, grades that piece; "the first part", "the ending" name a part.
 *
 *   He rates by number now and then: "I'm rating that one a three". A three
 *   means the sentence is fine and the context is wrong (Oct 15), so it
 *   grades the line as neither good nor bad and keeps his words.
 *
 *   He states rules in passing: "Don't say gaps, though. That is dev
 *   language." Sentences that tell the writer what to say or never say are
 *   kept as rules for data/english/writing-rules.json.
 *
 * The strength of a judgment comes from `strengthOf` (spoken-grades.ts). The
 * output is a grade file for data/english/grades/: rows of `{ key, spans,
 * note }` that the grade map reads, plus the rules he stated with his words.
 *
 * A development tool. It never words anything.
 */
import { readFileSync } from "node:fs";
import { type SpokenSpan, strengthOf } from "./spoken-grades";

export interface BatchLine {
  readonly id: string;
  readonly key: string;
  readonly line: string;
}

export interface BatchMoment {
  readonly moment: number;
  readonly lines: readonly BatchLine[];
}

export interface VoiceGrade {
  readonly key: string;
  readonly id: string;
  readonly spans: readonly SpokenSpan[];
  /** His words about the line, kept as he said them. */
  readonly note: string;
  /** A number rating he gave (1 to 5), when he gave one. */
  readonly rating?: number;
}

export interface VoiceRule {
  readonly rule: string;
  readonly line?: string;
}

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
};

const ORDINALS: Readonly<Record<string, number>> = {
  first: 1,
  second: 2,
  third: 3,
  last: 3,
};

/** "twenty one", "twenty-one", "21" as a number; undefined when it is none. */
export function spokenNumber(words: string): number | undefined {
  const t = words.trim().toLowerCase().replace(/-/g, " ");
  if (/^\d+$/.test(t)) return Number(t);
  const parts = t.split(/\s+/);
  let total = 0;
  for (const part of parts) {
    const value = NUMBER_WORDS[part];
    if (value === undefined) return undefined;
    total += value;
  }
  return parts.length > 0 ? total : undefined;
}

const NUMBER = String.raw`(\d+|(?:(?:twenty|thirty|forty|fifty|sixty|seventy)[ -]?)?(?:one|two|three|four|five|six|seven|eight|nine)|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy)`;

/** Where he says he is: a line id ("5.2", "five point two") or a moment ("scene four"). */
export function placeSaid(
  sentence: string,
): { moment: number; line?: number } | undefined {
  const t = sentence.toLowerCase();
  const id = new RegExp(
    String.raw`\b${NUMBER}\s*(?:\.|point)\s*${NUMBER}\b`,
  ).exec(t);
  if (id) {
    const moment = spokenNumber(id[1]!);
    const line = spokenNumber(id[2]!);
    if (moment !== undefined && line !== undefined) return { moment, line };
  }
  const named = new RegExp(
    String.raw`\b(?:scene|moment|number|item)\s+${NUMBER}\b`,
  ).exec(t);
  if (named) {
    const moment = spokenNumber(named[1]!);
    if (moment !== undefined) {
      const ordinal =
        /\bthe (first|second|third|last) (?:one|line|reply)\b/.exec(t);
      return ordinal ? { moment, line: ORDINALS[ordinal[1]!] } : { moment };
    }
  }
  return undefined;
}

/** "the second one", "the last one": a line of the moment he is on. */
function ordinalSaid(sentence: string): number | undefined {
  const match = /\bthe (first|second|third|last) (?:one|line|reply)\b/.exec(
    sentence.toLowerCase(),
  );
  return match ? ORDINALS[match[1]!] : undefined;
}

/** A rating he gives by number: "I'm rating that one a three", "that's a two". */
export function ratingSaid(sentence: string): number | undefined {
  const match =
    /\b(?:rating (?:that|this|it)(?: one)? (?:a|an)|rate (?:that|this|it)(?: one)? (?:a|an)|that'?s a|give (?:it|that) a)\s+(one|two|three|four|five|[1-5])\b(?!\s*(?:\.\d|point))/.exec(
      sentence.toLowerCase(),
    );
  return match ? spokenNumber(match[1]!) : undefined;
}

/** A rating of 1 to 5 as a strength: three is the sentence fine in the wrong context. */
export function ratingStrength(rating: number): number {
  return Math.max(-1, Math.min(1, (rating - 3) / 2));
}

/** A sentence that tells the writer what to say: a rule stated in passing. */
export function ruleSaid(sentence: string): boolean {
  return /\b(don'?t say|never say|just say|instead of|should (?:just )?say|shouldn'?t (?:say|be)|always|never|you can say|say (?:something like|like)|that is dev language|that'?s dev language)\b/i.test(
    sentence,
  );
}

const SLOT = /\{[^}]*\}/g;

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(SLOT, " ")
    .replace(/[‘’]/g, "'")
    .split(/[^a-z0-9']+/)
    .filter((word) => word.length > 0);
}

/**
 * How much of a line a stretch of his words reads back: the share of the
 * line's words, in order, that the stretch holds. Slots ({name}) are left out,
 * since he reads the name the page shows or skips it.
 */
export function readBack(line: string, said: string): number {
  const lineWords = wordsOf(line);
  if (lineWords.length === 0) return 0;
  const saidWords = wordsOf(said);
  let at = 0;
  let found = 0;
  for (const word of lineWords) {
    const next = saidWords.indexOf(word, at);
    if (next >= 0) {
      found += 1;
      at = next + 1;
    }
  }
  return found / lineWords.length;
}

/** Where a part of the line he reads back sits in it, by its first and last words. */
export function partOf(
  line: string,
  said: string,
): [number, number] | undefined {
  const saidWords = wordsOf(said);
  if (saidWords.length < 2) return undefined;
  const lower = line.toLowerCase().replace(/[‘’]/g, "'");
  const first = lower.indexOf(saidWords[0]!);
  if (first < 0) return undefined;
  const lastWord = saidWords[saidWords.length - 1]!;
  const last = lower.indexOf(lastWord, first);
  if (last < 0) return undefined;
  const end = last + lastWord.length;
  if (end - first >= line.length - 1) return undefined;
  return [first, end];
}

function sentencesOf(note: string): string[] {
  return note
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** The share of a line a sentence must read back to count as reading the line. */
const READ_WHOLE = 0.8;
/** The share for a sentence that reads part of the line on. */
const READ_PART = 0.35;
/** Judgments after a reading that count toward it; past these he has moved on. */
const JUDGMENTS_PER_READING = 3;
/** Short sayings that are neither a reading nor a judgment ("Yeah.", "Okay, so."). */
const FILLER =
  /^(yeah|yep|okay|ok|so|um|uh|all right|right|let'?s see|hmm)\b[ ,.!?]*\w{0,8}[.!?]?$/i;

/**
 * Turns one voice note into grades on the batch's lines. Each line he reads,
 * or names by number, gets the judgments that follow it, until he moves to
 * another line.
 */
export function readVoiceNote(
  note: string,
  moments: readonly BatchMoment[],
): { grades: VoiceGrade[]; rules: VoiceRule[] } {
  const lines = moments.flatMap((moment) => moment.lines);
  const byMoment = new Map(moments.map((moment) => [moment.moment, moment]));
  const sentences = sentencesOf(note);
  const notes = new Map<
    string,
    { line: BatchLine; spans: SpokenSpan[]; words: string[]; rating?: number }
  >();
  const rules: VoiceRule[] = [];
  let moment: BatchMoment | undefined;
  let current: BatchLine | undefined;
  /** A part of the current line he just read back, waiting for his judgment. */
  let part: [number, number] | undefined;

  const entry = (line: BatchLine) => {
    let row = notes.get(line.id);
    if (!row) {
      row = { line, spans: [], words: [] };
      notes.set(line.id, row);
    }
    return row;
  };

  /** Judgments counted since the current line was read or named. */
  let judgments = 0;
  for (let index = 0; index < sentences.length; index += 1) {
    const sentence = sentences[index]!;
    const place = placeSaid(sentence);
    if (place) {
      moment = byMoment.get(place.moment) ?? moment;
      if (place.line !== undefined && moment) {
        current = moment.lines[place.line - 1] ?? current;
        judgments = 0;
      }
      part = undefined;
    } else {
      const ordinal = ordinalSaid(sentence);
      if (ordinal !== undefined && moment) {
        current = moment.lines[ordinal - 1] ?? current;
        judgments = 0;
        part = undefined;
      }
    }
    // A line read aloud: the best match among the moment's lines first, then
    // every line of the batch.
    const pool = moment ? [...moment.lines, ...lines] : lines;
    let best: BatchLine | undefined;
    let bestShare = 0;
    for (const line of pool) {
      const share = readBack(line.line, sentence);
      if (share > bestShare) {
        best = line;
        bestShare = share;
      }
    }
    // A line of two or three sentences is read as two or three of his.
    if (bestShare < READ_WHOLE)
      for (
        let span = 2;
        span <= 3 && index + span <= sentences.length;
        span += 1
      ) {
        const joined = sentences.slice(index, index + span).join(" ");
        for (const line of pool) {
          if ((line.line.match(/[.!?](\s|$)/g) ?? []).length < span) continue;
          const share = readBack(line.line, joined);
          if (share >= READ_WHOLE && share > bestShare) {
            best = line;
            bestShare = share;
            index += span - 1;
          }
        }
        if (bestShare >= READ_WHOLE) break;
      }
    const judged = strengthOf(sentence);
    const rating = ratingSaid(sentence);
    if (best && bestShare >= READ_WHOLE && wordsOf(best.line).length >= 2) {
      current = best;
      judgments = 0;
      moment = moments.find((row) => row.lines.includes(best!)) ?? moment;
      part = undefined;
      // A judgment in the same sentence as the line read ("Who's your source
      // doesn't fit here") grades it at once.
      const rest = sentence.toLowerCase().replace(/[‘’]/g, "'");
      const tail = rest.slice(
        Math.min(rest.length, best.line.replace(SLOT, "").length),
      );
      const tailStrength = tail.trim() ? strengthOf(tail) : undefined;
      if (tailStrength !== undefined) {
        const row = entry(best);
        row.spans.push({
          start: 0,
          end: best.line.length,
          strength: tailStrength,
        });
        row.words.push(sentence);
      }
      continue;
    }
    if (
      current &&
      bestShare >= READ_PART &&
      best === current &&
      judged === undefined &&
      rating === undefined
    ) {
      // He read part of the line back; his next judgment is about that part.
      part = partOf(current.line, sentence);
      continue;
    }
    if (ruleSaid(sentence))
      rules.push({ rule: sentence, ...(current ? { line: current.id } : {}) });
    if (!current) continue;
    if (rating !== undefined) {
      const row = entry(current);
      row.rating = rating;
      row.spans.push({
        start: 0,
        end: current.line.length,
        strength: ratingStrength(rating),
      });
      row.words.push(sentence);
      continue;
    }
    if (judged === undefined) {
      // A sentence that is neither a judgment, a rating, a place nor filler
      // is him reading something else: the line he was on is done.
      const named = place !== undefined || ordinalSaid(sentence) !== undefined;
      if (!named && !FILLER.test(sentence) && wordsOf(sentence).length >= 4) {
        current = undefined;
        part = undefined;
      }
      continue;
    }
    if (judgments >= JUDGMENTS_PER_READING) continue;
    judgments += 1;
    const row = entry(current);
    const named = /\b(the )?(first part|beginning|opening|start)\b/i.test(
      sentence,
    )
      ? "first"
      : /\b(the )?(ending|end|last part|second half|second part)\b/i.test(
            sentence,
          )
        ? "last"
        : undefined;
    let span: [number, number] = [0, current.line.length];
    if (part) span = part;
    else if (named) {
      const cut = current.line.search(/[.!?,;](\s|$)/);
      if (cut > 0 && cut < current.line.length - 2)
        span =
          named === "first" ? [0, cut + 1] : [cut + 1, current.line.length];
    }
    row.spans.push({ start: span[0], end: span[1], strength: judged });
    row.words.push(sentence);
    part = undefined;
  }

  const grades = [...notes.values()]
    .filter((row) => row.spans.length > 0)
    .map((row) => ({
      key: row.line.key,
      id: row.line.id,
      spans: row.spans,
      note: row.words.join(" "),
      ...(row.rating !== undefined ? { rating: row.rating } : {}),
    }));
  return { grades, rules };
}

function main(batchPath: string, notePath: string) {
  const batch = JSON.parse(readFileSync(batchPath, "utf8")) as {
    id: string;
    moments: readonly {
      moment: number;
      lines: readonly { id: string; key: string; line: string }[];
    }[];
  };
  const note = readFileSync(notePath, "utf8");
  const { grades, rules } = readVoiceNote(note, batch.moments);
  console.log(
    JSON.stringify({ batch: batch.id, from: notePath, grades, rules }, null, 2),
  );
}

if (import.meta.url === `file://${process.argv[1]}`)
  main(process.argv[2]!, process.argv[3]!);
