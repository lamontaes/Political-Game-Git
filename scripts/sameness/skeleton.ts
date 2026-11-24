/**
 * The sameness check (Story lead's plan, Nov 24: "A sameness check (two
 * speeches sharing a skeleton) is a backstop, never the gate").
 *
 * It reads finished text, so it holds for any producer: a speech, a Journal
 * page or a news story. It never decides anything and writes no line. It
 * reports which sentence frames and which whole shapes two or more texts
 * share, so a reader can look.
 *
 * A text's frames: each sentence with its content words replaced by a slot.
 * Only the closed class of words that carry grammar (articles, pronouns,
 * prepositions, auxiliaries, conjunctions) stays, so "You know what I'm
 * asking for on rail, so hold me to it" and "You know what I'm asking for on
 * wages, so hold me to it" share the frame
 * "you know what i am asking for on _ so hold me to it".
 *
 * A text's skeleton: the sequence of its sentences' moves (a short label from
 * the sentence's first words and its ending), so two speeches of the same
 * three-move shape match even when no frame repeats.
 */

const FUNCTION_WORDS = new Set(
  (
    "a an the this that these those i me my mine we us our ours you your yours he him his she her hers it its they them their theirs " +
    "am is are was were be been being do does did have has had will would shall should can could may might must " +
    "and but or nor so yet if then than as because while when where who whom whose which what how why " +
    "of in on at by for with from to into onto over under about after before between through during without within against " +
    "not no yes all any each every some more most much many few less other such own same too very just only also still even " +
    "there here now today again once up down out off hold know ask asking asked said say tell told let make made"
  ).split(" "),
);

const CONTRACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bi['’]m\b/g, "i am"],
  [/\bwe['’]re\b/g, "we are"],
  [/\byou['’]re\b/g, "you are"],
  [/\bthey['’]re\b/g, "they are"],
  [/\b(it|that|there|here|he|she|what|who)['’]s\b/g, "$1 is"],
  [/\b(i|we|you|they)['’]ve\b/g, "$1 have"],
  [/\b(i|we|you|they|he|she|it)['’]ll\b/g, "$1 will"],
  [/\b(i|we|you|they|he|she|it)['’]d\b/g, "$1 would"],
  [/\bcan['’]t\b/g, "can not"],
  [/\bwon['’]t\b/g, "will not"],
  [/\b(\w+)n['’]t\b/g, "$1 not"],
];

export function sentencesOf(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])["”')\]]*\s+(?=[A-Z"“'([])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[a-z]/i.test(sentence));
}

/** One sentence with its content words replaced by one slot per run. */
export function frameOf(sentence: string): string {
  let text = sentence.toLowerCase();
  for (const [pattern, to] of CONTRACTIONS) text = text.replace(pattern, to);
  const words = text.match(/[a-z]+/g) ?? [];
  const out: string[] = [];
  for (const word of words) {
    const keep = FUNCTION_WORDS.has(word);
    const token = keep ? word : "_";
    if (token === "_" && out[out.length - 1] === "_") continue;
    out.push(token);
  }
  return out.join(" ");
}

/** A frame carries enough grammar to count: at least four kept words. */
export function frameWeight(frame: string): number {
  return frame.split(" ").filter((word) => word !== "_").length;
}

/** The move a sentence makes, from how it opens and how it ends. */
export function moveOf(sentence: string): string {
  const frame = frameOf(sentence);
  const first = frame.split(" ")[0] ?? "";
  const ask =
    /\b(hold me to it|i am asking|asking for|i ask|i will ask|ask you)\b/.test(
      frame,
    );
  const reason = /\b(because|so that|since)\b/.test(frame);
  const question = /\?["”')\]]*$/.test(sentence.trim());
  const opener =
    first === "_"
      ? "name"
      : ["i", "we", "my", "our"].includes(first)
        ? "self"
        : ["you", "your"].includes(first)
          ? "you"
          : ["there", "here", "it", "this", "that"].includes(first)
            ? "state"
            : "other";
  return [opener, ask ? "ask" : "", reason ? "reason" : "", question ? "q" : ""]
    .filter(Boolean)
    .join("+");
}

export function skeletonOf(text: string): string[] {
  return sentencesOf(text).map(moveOf);
}

/** Length of the longest common subsequence of two move lists. */
function lcs(a: readonly string[], b: readonly string[]): number {
  const row = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = 0;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j]!;
      row[j] =
        a[i - 1] === b[j - 1] ? diagonal + 1 : Math.max(above, row[j - 1]!);
      diagonal = above;
    }
  }
  return row[b.length]!;
}

/** 0 to 1: how much of the shorter move list the two share, in order. */
export function skeletonLikeness(a: string, b: string): number {
  const x = skeletonOf(a);
  const y = skeletonOf(b);
  const shorter = Math.min(x.length, y.length);
  return shorter === 0 ? 0 : lcs(x, y) / shorter;
}

export interface SharedFrame {
  readonly frame: string;
  /** Indexes into the texts that carry it, once each. */
  readonly texts: readonly number[];
}

/**
 * Frames that two or more of the texts share. A frame counts only when it has
 * at least `minWeight` grammar words, so "it is _" never flags.
 */
export function sharedFrames(
  texts: readonly string[],
  minWeight = 4,
): SharedFrame[] {
  const seen = new Map<string, Set<number>>();
  texts.forEach((text, index) => {
    for (const sentence of sentencesOf(text)) {
      const frame = frameOf(sentence);
      if (frameWeight(frame) < minWeight) continue;
      const holders = seen.get(frame) ?? new Set<number>();
      holders.add(index);
      seen.set(frame, holders);
    }
  });
  return [...seen.entries()]
    .filter(([, holders]) => holders.size > 1)
    .map(([frame, holders]) => ({ frame, texts: [...holders].sort() }))
    .sort(
      (a, b) =>
        b.texts.length - a.texts.length || a.frame.localeCompare(b.frame),
    );
}

export interface SamenessReport {
  /** Frames at least two texts share. */
  readonly frames: readonly SharedFrame[];
  /** Pairs of texts whose move sequences match at or above the likeness bar. */
  readonly skeletons: ReadonlyArray<{
    readonly a: number;
    readonly b: number;
    readonly likeness: number;
  }>;
}

/** The report for a set of texts. The bar is a flag level, never a gate. */
export function samenessOf(
  texts: readonly string[],
  bar = 0.8,
  minWeight = 4,
): SamenessReport {
  const skeletons: Array<{ a: number; b: number; likeness: number }> = [];
  for (let a = 0; a < texts.length; a += 1) {
    for (let b = a + 1; b < texts.length; b += 1) {
      const likeness = skeletonLikeness(texts[a]!, texts[b]!);
      if (likeness >= bar) skeletons.push({ a, b, likeness });
    }
  }
  return { frames: sharedFrames(texts, minWeight), skeletons };
}
