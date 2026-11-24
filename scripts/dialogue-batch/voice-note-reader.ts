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
 *   kept as rules for data/english/line-rules.json.
 *
 * The strength of a judgment comes from `strengthOf` (spoken-grades.ts). The
 * output is a grade file for data/english/grades/: rows of `{ key, spans,
 * note }` that the grade map reads, plus the rules he stated with his words.
 *
 * A development tool. It never words anything.
 */
import { readFileSync } from "node:fs";
import { readBankPieces } from "../words/run-rules";
import { type SpokenSpan, strengthOf } from "./spoken-grades";

export interface BatchLine {
  readonly id: string;
  readonly key: string;
  readonly line: string;
}

export interface BatchMoment {
  readonly moment: number;
  /** The scene's title, which he may say instead of its number ("the sick door"). */
  readonly description?: string;
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
  /** How he would say it instead, in his words ("It'd be like, can we even afford this?"). */
  readonly rewrites?: readonly string[];
}

/** A remark of his that ties to no line, with the scene he was on when he said it. */
export interface Unplaced {
  readonly remark: string;
  readonly moment?: number;
  readonly scene?: string;
  /** The line he did grade, when the grade could not be kept (its key is no bank piece). */
  readonly line?: string;
  readonly why?: string;
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
): { moment: number; line?: number; wording?: number } | undefined {
  const t = sentence.toLowerCase();
  // "scene four, wording two": a scene and one of its wordings.
  const worded = new RegExp(
    String.raw`\b(?:scene|moment|number|item)\s+${NUMBER}\b[\s,.;:-]*(?:and\s+)?wording\s+${NUMBER}\b`,
  ).exec(t);
  if (worded) {
    const moment = spokenNumber(worded[1]!);
    const wording = spokenNumber(worded[2]!);
    if (moment !== undefined && wording !== undefined)
      return { moment, wording };
  }
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
  return /\b(don'?t say|never say|just say|instead of|should (?:just )?say|shouldn'?t (?:say|be|let)|always|never|you can say|say (?:something like|like)|that is dev language|that'?s dev language|i prefer|look at real|real[- ]life examples|i don'?t like the kind of|take the lessons|mix(ing)? them up|i'?d like to get more)\b/i.test(
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
/** Words a line opens or closes on that he skips when he reads it back ("All right.", "Yes."). */
const INTERJECTIONS = new Set([
  "all",
  "right",
  "alright",
  "okay",
  "ok",
  "well",
  "yes",
  "fine",
  "sure",
  "oh",
  "so",
]);

export function readBack(line: string, said: string): number {
  const lineWords = wordsOf(line).filter((word) => !INTERJECTIONS.has(word));
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

/** A sentence where he says the line his own way: "It'd be like, ...", "something like, ...". */
export function rewriteSaid(sentence: string): boolean {
  return /\b(it'?d be like|it would be like|would be like|you'?d be like|you could say|say something like|saying something like|like saying|something like,|it'?d be more like|more like,|that would be more realistic)\b/i.test(
    sentence,
  );
}

/** Every line id he names in a sentence: "6.2 and 6.3", "5.2", "five point two". */
function idsIn(sentence: string): { moment: number; line: number }[] {
  const t = sentence.toLowerCase();
  const out: { moment: number; line: number }[] = [];
  const pattern = new RegExp(
    String.raw`(?<![\d.])${NUMBER}\s*(?:\.|point)\s*${NUMBER}\b`,
    "g",
  );
  for (const match of t.matchAll(pattern)) {
    const moment = spokenNumber(match[1]!);
    const line = spokenNumber(match[2]!);
    if (moment !== undefined && line !== undefined) out.push({ moment, line });
  }
  return out;
}

/**
 * Ids of the form scene.wording.line ("7.1.3") and scene.wordingLETTER.line
 * ("4.2y.5": y, m or n is the resident's answer), written or spoken ("seven
 * point one point three"). Returned as the batch writes them.
 */
export function fullIdsIn(sentence: string): string[] {
  const t = sentence.toLowerCase();
  const pattern = new RegExp(
    String.raw`(?<![\d.])${NUMBER}\s*(?:\.|point)\s*${NUMBER}\s?([ymn])?\s*(?:\.|point)\s*${NUMBER}\b`,
    "g",
  );
  const out: string[] = [];
  for (const match of t.matchAll(pattern)) {
    const scene = spokenNumber(match[1]!);
    const wording = spokenNumber(match[2]!);
    const line = spokenNumber(match[4]!);
    if (scene !== undefined && wording !== undefined && line !== undefined)
      out.push(`${scene}.${wording}${match[3] ?? ""}.${line}`);
  }
  return out;
}

/** The sentence with every three-part id taken out, so two-part ids are read from what is left. */
function withoutFullIds(sentence: string): string {
  return sentence.replace(
    new RegExp(
      String.raw`(?<![\d.])${NUMBER}\s*(?:\.|point)\s*${NUMBER}[ymn]?\s*(?:\.|point)\s*${NUMBER}\b`,
      "gi",
    ),
    " ",
  );
}

const FILLER_TITLE_WORDS = new Set(["a", "an", "the", "at", "of", "in", "on"]);

/**
 * A scene he names by its title, whole or in part ("the sick door" for
 * "Signature at a sick door"): the one scene whose title holds the words he
 * says in a row. Two words at least, and only when exactly one scene fits.
 */
export function titleSaid(
  sentence: string,
  moments: readonly BatchMoment[],
): BatchMoment | undefined {
  const said = wordsOf(sentence).filter((w) => !FILLER_TITLE_WORDS.has(w));
  if (said.length < 2 || said.length > 14) return undefined;
  const titles = moments
    .filter((moment) => moment.description)
    .map((moment) => ({
      moment,
      words: wordsOf(moment.description!).filter(
        (w) => !FILLER_TITLE_WORDS.has(w),
      ),
    }));
  // Longest stretch first, so "vote ask same party" beats "vote ask".
  for (let size = Math.min(6, said.length); size >= 2; size -= 1) {
    for (let from = 0; from + size <= said.length; from += 1) {
      const phrase = said.slice(from, from + size).join(" ");
      const fits = titles.filter((title) =>
        title.words.join(" ").includes(phrase),
      );
      if (fits.length === 1) return fits[0]!.moment;
    }
  }
  return undefined;
}

/** A bare ".2" said for a line of the moment he is on (or is about to name). */
function bareLinesIn(sentence: string): number[] {
  return [...sentence.matchAll(/(?:^|[\s(])\.(\d)\b/g)].map((m) =>
    Number(m[1]),
  );
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
  /** The keys of the bank's pieces. With it, a grade on any other key is listed as unplaced, never graded. */
  pieceKeys?: ReadonlySet<string>,
): { grades: VoiceGrade[]; rules: VoiceRule[]; unplaced: Unplaced[] } {
  const lines = moments.flatMap((moment) => moment.lines);
  const byMoment = new Map(moments.map((moment) => [moment.moment, moment]));
  const byId = new Map(lines.map((line) => [line.id, line]));
  /** A moment whose ids have three parts (4.2y.5) has no "second line": its ids say where a line is. */
  const threePart = (row: BatchMoment | undefined) =>
    row !== undefined &&
    row.lines.some((line) => /^\d+\.\d+[ymn]?\.\d+$/.test(line.id));
  /** The line he means by "5.2": its id, else its place in a moment whose ids are positions. */
  const lineAt = (at: number, n: number): BatchLine | undefined => {
    const row = byMoment.get(at);
    return (
      byId.get(`${at}.${n}`) ?? (threePart(row) ? undefined : row?.lines[n - 1])
    );
  };
  /** The wording of a scene he is on ("scene four, wording two"): its lines, for "the second one". */
  let wording: readonly BatchLine[] | undefined;
  const wordingOf = (row: BatchMoment, n: number): readonly BatchLine[] =>
    row.lines.filter((line) => {
      const parts = line.id.split(".");
      return (
        parts.length === 3 && parts[1]!.replace(/[ymn]$/, "") === String(n)
      );
    });
  const sentences = sentencesOf(note);
  const notes = new Map<
    string,
    {
      line: BatchLine;
      spans: SpokenSpan[];
      words: string[];
      rewrites: string[];
      rating?: number;
    }
  >();
  const rules: VoiceRule[] = [];
  /** Remarks that judge something but tie to no line: kept for the Words lead, never dropped. */
  const unplaced: Unplaced[] = [];
  const keep = (remark: string) =>
    unplaced.push({
      remark,
      ...(moment ? { moment: moment.moment } : {}),
      ...(moment?.description ? { scene: moment.description } : {}),
    });
  let moment: BatchMoment | undefined;
  let current: BatchLine | undefined;
  /** A part of the current line he just read back, waiting for his judgment. */
  let part: [number, number] | undefined;

  const entry = (line: BatchLine) => {
    // One row per bank piece: a line the same in two wordings of a scene is
    // one piece, and a piece is counted once.
    const slot = line.key || line.id;
    let row = notes.get(slot);
    if (!row) {
      row = { line, spans: [], words: [], rewrites: [] };
      notes.set(slot, row);
    }
    return row;
  };

  /** Judgments counted since the current line was read or named. */
  let judgments = 0;
  /** Sentences since he last read or named a line: he may explain before he judges. */
  let since = 0;
  /** His last judgment, for "Good. So it was 8.2." */
  let lastJudged: { strength: number; sentence: string } | undefined;
  for (let index = 0; index < sentences.length; index += 1) {
    const sentence = sentences[index]!;
    since += 1;
    // Lines he names by number in this sentence: "6.2 and 6.3", ".2 and 7.3",
    // "All 3 of those" (the moment he is on), "I like all of 12".
    const refs: BatchLine[] = [];
    for (const id of fullIdsIn(sentence)) {
      const line = byId.get(id);
      if (line) refs.push(line);
    }
    const ids = idsIn(withoutFullIds(sentence));
    for (const id of ids) {
      const line = lineAt(id.moment, id.line);
      if (line) refs.push(line);
    }
    const bare = bareLinesIn(sentence);
    if (bare.length > 0) {
      // A bare ".1" belongs to the moment of the next number he says, if he
      // says one within two sentences ("I like all of 12. .1 is good. 13.2, no."),
      // else to the moment he is on.
      const ahead = sentences
        .slice(index, index + 3)
        .flatMap((next) => idsIn(next))
        .find(() => true);
      const target = byMoment.get(ahead?.moment ?? moment?.moment ?? -1);
      for (const n of bare) {
        const line = target ? lineAt(target.moment, n) : undefined;
        if (line) refs.push(line);
      }
    }
    const allOf = /\ball (?:of )?(\d+|[a-z]+)\b(?! of those)/i.exec(sentence);
    const allThose =
      /\ball (?:\d|three|3|of) (?:of )?(?:those|them|these)\b/i.test(sentence);
    if (allThose && moment) refs.push(...moment.lines);
    else if (allOf && /\b(like|good|love|bad|weird)\b/i.test(sentence)) {
      const m = spokenNumber(allOf[1]!);
      const target = m !== undefined ? byMoment.get(m) : undefined;
      if (target) refs.push(...target.lines);
    }
    if (refs.length > 0) {
      const last = refs[refs.length - 1]!;
      moment = moments.find((row) => row.lines.includes(last)) ?? moment;
      current = last;
      judgments = 0;
      since = 0;
      part = undefined;
      const rest = withoutFullIds(sentence)
        .replace(/\b\d+\s*\.\s*\d+\b/g, " ")
        .replace(/(?:^|\s)\.\d\b/g, " ");
      let strength = /^[\s,]*no[.!]?\s*$/i.test(rest) ? -1 : strengthOf(rest);
      if (
        strength === undefined &&
        /^\s*(so )?it was\b/i.test(sentence) &&
        lastJudged
      )
        strength = lastJudged.strength;
      if (rewriteSaid(sentence)) {
        // "But it'd be like 4.2, can we even afford this?": his version of the line.
        entry(last).rewrites.push(sentence);
      } else if (strength !== undefined) {
        for (const line of refs) {
          const row = entry(line);
          row.spans.push({ start: 0, end: line.line.length, strength });
          row.words.push(sentence);
        }
        // A line named by number and judged in one breath is done: what he
        // says next is about something else.
        judgments = JUDGMENTS_PER_READING;
        lastJudged = { strength, sentence };
      }
      if (ruleSaid(sentence)) rules.push({ rule: sentence, line: last.id });
      continue;
    }
    // His own version of the line: kept beside the grade, never graded.
    if (rewriteSaid(sentence) && current) {
      entry(current).rewrites.push(sentence);
      if (ruleSaid(sentence)) rules.push({ rule: sentence, line: current.id });
      continue;
    }
    const place = placeSaid(sentence);
    const titled = place ? undefined : titleSaid(sentence, moments);
    if (place) {
      moment = byMoment.get(place.moment) ?? moment;
      wording = undefined;
      if (place.wording !== undefined && moment)
        wording = wordingOf(moment, place.wording);
      else if (place.line !== undefined && moment) {
        const at = lineAt(moment.moment, place.line);
        if (at) {
          current = at;
          judgments = 0;
        } else if (threePart(moment)) {
          // "7.1" in a scene whose ids have three parts is its first wording.
          wording = wordingOf(moment, place.line);
        }
      }
      part = undefined;
    } else {
      if (titled && wordsOf(sentence).length <= 14) {
        moment = titled;
        wording = undefined;
        part = undefined;
      }
      const ordinal = ordinalSaid(sentence);
      const numbered = /\bline\s+(\d+|[a-z]+)\b/i.exec(sentence);
      const nth = numbered && wording ? spokenNumber(numbered[1]!) : ordinal;
      if (nth !== undefined && moment) {
        const scope = wording && wording.length > 0 ? wording : moment.lines;
        current = scope[nth - 1] ?? current;
        judgments = 0;
        part = undefined;
      }
    }
    // A line read aloud: the best match among the moment's lines first, then
    // every line of the batch.
    const pool = moment ? [...moment.lines, ...lines] : lines;
    let best: BatchLine | undefined;
    let bestShare = 0;
    const near = (line: BatchLine): number => {
      if (!moment) return 0;
      const at = moments.findIndex((row) => row.lines.includes(line));
      const here = moments.indexOf(moment);
      return at === here ? 0.15 : Math.abs(at - here) === 1 ? 0.1 : 0;
    };
    // A long sentence of his holds the words of a short line by chance ("I'll
    // come back to this later" holds "Back to you."): a reading is about as
    // long as the line.
    const fits = (line: BatchLine, said: string) =>
      wordsOf(said).length <= wordsOf(line.line).length * 2 + 4;
    let bestScore = 0;
    for (const line of pool) {
      if (!fits(line, sentence)) continue;
      const share = readBack(line.line, sentence);
      const score = share + (share >= READ_PART ? near(line) : 0);
      if (score > bestScore) {
        best = line;
        bestShare = share;
        bestScore = score;
      }
    }
    // A line of two or three sentences is read as two or three of his.
    // Prefer the reading that covers more of a line: "Will you help with the
    // campaign?" alone matches a short line, but with the next sentence it
    // reads all of a longer one.
    const covered = (line: BatchLine | undefined, share: number) =>
      line ? share * wordsOf(line.line).length : 0;
    {
      const single = covered(best, bestShare);
      let take = 1;
      for (
        let span = 2;
        span <= 3 && index + span <= sentences.length;
        span += 1
      ) {
        const joined = sentences.slice(index, index + span).join(" ");
        for (const line of pool) {
          if ((line.line.match(/[.!?](\s|$)/g) ?? []).length < span) continue;
          if (!fits(line, joined)) continue;
          const share = readBack(line.line, joined);
          if (
            share >= READ_WHOLE &&
            covered(line, share) > Math.max(single, covered(best, bestShare))
          ) {
            best = line;
            bestShare = share;
            take = span;
          }
        }
      }
      index += take - 1;
    }
    const judged = strengthOf(sentence);
    if (judged !== undefined) lastJudged = { strength: judged, sentence };
    const rating = ratingSaid(sentence);
    if (best && bestShare >= READ_WHOLE && wordsOf(best.line).length >= 2) {
      current = best;
      judgments = 0;
      since = 0;
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
        judgments = 1;
      }
      continue;
    }
    // "Never say a face from the town at the door" quotes the line it is
    // about; it is a rule, not the line read back.
    if (/^\s*(?:don'?t say|never say|just say|you can say)\b/i.test(sentence)) {
      rules.push({ rule: sentence, ...(current ? { line: current.id } : {}) });
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
    if (!current) {
      if (
        strengthOf(sentence) !== undefined ||
        rating !== undefined ||
        (place === undefined &&
          titled === undefined &&
          !FILLER.test(sentence) &&
          wordsOf(sentence).length >= 4)
      )
        keep(sentence);
      continue;
    }
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
      const named =
        place !== undefined ||
        titled !== undefined ||
        ordinalSaid(sentence) !== undefined;
      const remark =
        !named && !FILLER.test(sentence) && wordsOf(sentence).length >= 4;
      if (remark && since > 2) {
        current = undefined;
        part = undefined;
      }
      // A remark tied to no line is kept for the Words lead, never dropped.
      if (remark) keep(sentence);
      continue;
    }
    if (judgments >= JUDGMENTS_PER_READING) {
      keep(sentence);
      continue;
    }
    // "Like the other ones kind of are awkward": about the other lines, not this one.
    if (
      /\b(the other ones?|the others|the rest( of them)?|all these responses)\b/i.test(
        sentence,
      ) ||
      /^(they|those|these)\b/i.test(sentence)
    ) {
      keep(sentence);
      continue;
    }
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
    // His verdict comes first; what he adds after it counts half.
    row.spans.push({
      start: span[0],
      end: span[1],
      strength: judgments === 1 ? judged : judged / 2,
    });
    row.words.push(sentence);
    part = undefined;
  }

  const all = [...notes.values()]
    .filter((row) => row.spans.length > 0 || row.rewrites.length > 0)
    .map((row) => ({
      key: row.line.key,
      id: row.line.id,
      spans: row.spans,
      note: row.words.join(" "),
      ...(row.rating !== undefined ? { rating: row.rating } : {}),
      ...(row.rewrites.length > 0 ? { rewrites: row.rewrites } : {}),
    }));
  const grades = all.filter((row) => !pieceKeys || pieceKeys.has(row.key));
  for (const row of all)
    if (pieceKeys && !pieceKeys.has(row.key)) {
      const at = moments.find((m) => m.lines.some((l) => l.id === row.id));
      unplaced.push({
        remark: row.note || (row.rewrites ?? []).join(" "),
        ...(at ? { moment: at.moment } : {}),
        ...(at?.description ? { scene: at.description } : {}),
        line: row.id,
        why: row.key
          ? `"${row.key}" is not a bank piece`
          : "the line has no bank piece",
      });
    }
  return { grades, rules, unplaced };
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
  const pieceKeys = new Set(readBankPieces().map((piece) => piece.key));
  const { grades, rules, unplaced } = readVoiceNote(
    note,
    batch.moments,
    pieceKeys,
  );
  console.log(
    JSON.stringify(
      { batch: batch.id, from: notePath, grades, rules, unplaced },
      null,
      2,
    ),
  );
}

if (import.meta.url === `file://${process.argv[1]}`)
  main(process.argv[2]!, process.argv[3]!);
