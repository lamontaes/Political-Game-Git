/**
 * What a line, or a part of a line, is made of, for the owner's grades to
 * attach to (owner, Nov 9, 12:45 a.m.: "each word or each part of a phrase or
 * each part of the tone or word choice ... I liked half of that, and I didn't
 * like this one part ... that could affect, let's say, the tone of 48 of the
 * replies and 1,000 of the lines").
 *
 * A feature is a property a reader hears: how the span opens, whether it
 * carries filler or a stock phrase, whether it names who, what, where or when,
 * whether a question names what it asks about, how formal and how direct it
 * is, how long it runs, whether it explains itself. The owner's own words for
 * these ("filler", "no context", "that's how people talk") are the names in
 * `data/english/writing-rules.json`, which ties each rule to the features it
 * checks.
 *
 * Pure: text in, feature ids out. It reads no world and words nothing. The
 * situation a line plays in (its register, the speaker's bearing, the kind of
 * scene) is not a feature here; `grade-map.ts` keeps it as the context a
 * feature is graded in.
 */

/** A reply that gives in at once, the "quick resolution" the owner hears as a machine (voice note, Oct 15). */
const CONCEDES = [
  "you're right",
  "you are right",
  "i shouldn't have",
  "i'm sorry",
  "i apologize",
  "fair enough",
  "that's fair",
  "point taken",
  "i understand",
  "understood",
  "got it",
  "deal",
  "noted",
];

/** A refusal that points nowhere ("I'm not going to talk about that"), where a natural one points to later or to the record. */
const BARE_REFUSALS = [
  "i'm not going to talk about",
  "i won't talk about",
  "no comment",
  "i don't want to speculate",
  "i'm not going to comment",
  "i won't comment",
  "i can't comment",
  "i'd rather not say",
];

/** Words from the campaign office or the code, not from talk (owner, Oct 15: "Don't say gaps, though. That is dev language."). */
const INSIDER = [
  "gaps",
  "the doors",
  "door count",
  "turnout model",
  "the universe",
  "persuadables",
  "gotv",
  "oppo",
  "comms",
  "the ask",
  "touchpoint",
  "stakeholders",
  "constituency services",
  "deliverables",
  "bandwidth",
  "messaging",
];

/** Words that pad the front of a line and carry nothing ("Well,", "Look,", "So,"). */
const FILLER_OPENERS = [
  "well",
  "look",
  "listen",
  "so",
  "okay",
  "ok",
  "now",
  "alright",
  "all right",
  "you know",
  "i mean",
  "honestly",
  "frankly",
  "anyway",
  "right",
];

/** Padding anywhere in a line. */
const FILLER = [
  "you know",
  "i mean",
  "to be honest",
  "at the end of the day",
  "the thing is",
  "kind of",
  "sort of",
  "basically",
  "literally",
  "just saying",
  "if you will",
  "as it were",
  "needless to say",
];

/** Stock phrases a politician or a script reaches for when there is nothing to say. */
const STOCK = [
  "moving forward",
  "going forward",
  "at this time",
  "at this point in time",
  "we'll see",
  "i hear you",
  "great question",
  "good question",
  "make a difference",
  "the american people",
  "hardworking",
  "hard-working",
  "let me be clear",
  "make no mistake",
  "it is what it is",
  "time will tell",
  "only time will tell",
  "we're all in this together",
  "the bottom line",
  "at the end of the day",
  "it means a lot",
  "means the world",
  "thank you for your service",
  "i appreciate that",
  "that's fair",
  "fair enough",
];

/** Words that hedge a claim. */
const HEDGES = [
  "maybe",
  "perhaps",
  "i think",
  "i guess",
  "i suppose",
  "might",
  "probably",
  "possibly",
  "somewhat",
  "kind of",
  "sort of",
  "a bit",
  "a little",
];

/** Words that belong to paper, not to talk. */
const FORMAL = [
  "therefore",
  "furthermore",
  "moreover",
  "regarding",
  "pursuant",
  "hereby",
  "shall",
  "whereas",
  "thus",
  "henceforth",
  "accordingly",
  "nevertheless",
  "notwithstanding",
  "with respect to",
  "in regard to",
];

/** A line that says the subtext or tells the listener what to feel. */
const EXPLAINS = [
  "what i'm saying is",
  "what i mean is",
  "which means",
  "in other words",
  "you feel",
  "you realize",
  "you can tell",
  "you sense",
  "it's clear that",
  "clearly,",
  "the point is",
  "i want you to know",
  "i feel like",
  "i feel that",
];

/** A thing the line points at without having named it. */
const VAGUE_OBJECTS = ["this", "that", "it", "things", "stuff", "everything"];

/** Words that only ask: a question built from these alone names nothing. */
const EMPTY_QUESTION_WORDS = new Set([
  "what",
  "who",
  "where",
  "when",
  "why",
  "how",
  "do",
  "does",
  "did",
  "is",
  "are",
  "was",
  "were",
  "can",
  "could",
  "would",
  "will",
  "should",
  "you",
  "i",
  "we",
  "they",
  "it",
  "that",
  "this",
  "about",
  "think",
  "mean",
  "want",
  "so",
  "and",
  "but",
  "the",
  "a",
  "an",
  "of",
  "to",
  "be",
  "have",
  "has",
  "going",
  "there",
  "anything",
  "something",
  "else",
  "really",
  "now",
  "then",
  "me",
  "us",
  "them",
  "your",
  "my",
]);

const DAY_WORDS =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|tonight|today|yesterday|tomorrow|january|february|march|april|may|june|july|august|september|october|november|december|election day|first thing)\b/;

const PLACE_WORDS =
  /\b(office|hall|chamber|courthouse|clerk|steps|kitchen|porch|diner|church|school|street|square|room|desk|home|house|hallway|lobby|booth|podium|stage|floor|parking lot|library|store|shop|plant|station)\b/;

/** Lower case, slots kept as `{slot}`, curly quotes made plain. */
function plain(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

function hasPhrase(text: string, phrase: string): boolean {
  return new RegExp(
    `(^|[^a-z'])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z'])`,
  ).test(text);
}

function words(text: string): string[] {
  return text
    .replace(/\{[^}]*\}/g, " slot ")
    .split(/[^a-z0-9'-]+/)
    .filter(Boolean);
}

/** The length band of a span, in words. */
export function lengthBand(count: number): string {
  if (count <= 3) return "length:tiny";
  if (count <= 8) return "length:short";
  if (count <= 16) return "length:medium";
  if (count <= 28) return "length:long";
  return "length:very-long";
}

/**
 * The features of one span of a line. `whole` says the span is the whole
 * line, which adds the features only a whole line has (how it opens, how many
 * sentences, whether it sets its own context).
 */
export function spanFeatures(text: string, whole = true): string[] {
  const t = plain(text);
  const list = words(t);
  const out = new Set<string>();
  if (list.length === 0) return [];
  out.add(lengthBand(list.length));
  const slots = t.match(/\{[^}]*\}/g) ?? [];
  const names =
    slots.some((slot) =>
      /name|first|last|who|person|speaker|member|official|title|office/.test(
        slot,
      ),
    ) || /[a-z,] [A-Z][a-z]{2,}/.test(text);
  const namesPlace =
    slots.some((slot) =>
      /place|town|city|county|state|district|office|where/.test(slot),
    ) || PLACE_WORDS.test(t);
  const namesDay =
    slots.some((slot) => /date|day|when|month|year|time/.test(slot)) ||
    DAY_WORDS.test(t);
  const namesThing =
    slots.some((slot) =>
      /bill|law|topic|issue|area|measure|amount|money|cost|count|number|job|work|business|subject|ordinance|budget/.test(
        slot,
      ),
    ) ||
    /\d/.test(t) ||
    /\$/.test(t);
  if (names) out.add("names:who");
  if (namesPlace) out.add("names:where");
  if (namesDay) out.add("names:when");
  if (namesThing) out.add("names:what");
  const specific = names || namesPlace || namesDay || namesThing;
  out.add(specific ? "context:specific" : "context:general");
  const vague = list.filter((word) => VAGUE_OBJECTS.includes(word)).length;
  if (!specific && vague > 0) out.add("context:points-at-unnamed");
  if (FILLER.some((phrase) => hasPhrase(t, phrase))) out.add("filler:inside");
  if (CONCEDES.some((phrase) => hasPhrase(t, phrase)))
    out.add("concedes-at-once");
  if (BARE_REFUSALS.some((phrase) => hasPhrase(t, phrase)))
    out.add("refuses-bare");
  if (INSIDER.some((phrase) => hasPhrase(t, phrase))) out.add("insider-words");
  // Narration that only places someone (owner, Oct 27: "Remove every instance of that").
  if (/^(you're|you are) (in|at) /.test(t) || / (is|are) with you\.?$/.test(t))
    out.add("narration:places-only");
  if (STOCK.some((phrase) => hasPhrase(t, phrase))) out.add("stock-phrase");
  if (EXPLAINS.some((phrase) => hasPhrase(t, phrase))) out.add("explains");
  if (FORMAL.some((phrase) => hasPhrase(t, phrase))) out.add("formality:paper");
  else if (/\b\w+'(s|re|ll|ve|d|m|t)\b/.test(t) || /n't\b/.test(t))
    out.add("formality:spoken");
  else out.add("formality:plain");
  const hedges = HEDGES.filter((phrase) => hasPhrase(t, phrase)).length;
  if (hedges > 0) out.add("directness:hedged");
  if (/!/.test(t)) out.add("exclaims");
  const questions = t
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.endsWith("?"));
  for (const question of questions) {
    const content = words(question).filter(
      (word) => !EMPTY_QUESTION_WORDS.has(word),
    );
    out.add(
      content.length === 0
        ? "question:names-nothing"
        : "question:names-subject",
    );
  }
  if (
    /^(no|yes|not|never|stop|don't|do|go|take|tell|give|vote|sign|leave|get)\b/.test(
      t,
    ) &&
    hedges === 0
  )
    out.add("directness:direct");
  if (/\b(we|us|our)\b/.test(t)) out.add("person:we");
  else if (/\b(i|me|my|i'm|i've|i'll|i'd)\b/.test(t)) out.add("person:i");
  if (/\byou\b|\byour\b|\{first\}/.test(t)) out.add("person:you");
  if (whole) {
    const opener = FILLER_OPENERS.find((phrase) =>
      new RegExp(`^${phrase}\\b[,.]?`).test(t),
    );
    if (opener) out.add("opens:filler-word");
    else if (
      /^(hello|hi|hey|good (morning|afternoon|evening)|evening|morning)\b/.test(
        t,
      )
    )
      out.add("opens:greeting");
    else if (/^\{[^}]*\}/.test(t) || /^[a-z]+,/.test(t)) out.add("opens:name");
    else if (/^(thank|thanks)\b/.test(t)) out.add("opens:thanks");
    else if (
      /^(what|who|where|when|why|how|do|does|did|is|are|can|could|would|will)\b/.test(
        t,
      )
    )
      out.add("opens:question");
    else if (DAY_WORDS.test(t.slice(0, 30))) out.add("opens:when");
    else out.add("opens:statement");
    const sentences = (t.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [t]).length;
    out.add(
      sentences === 1
        ? "sentences:one"
        : sentences === 2
          ? "sentences:two"
          : "sentences:many",
    );
  }
  return [...out].sort();
}

export interface Span {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly features: readonly string[];
}

/**
 * A line cut where a grade can fall on part of it: each sentence, and a
 * sentence's opening word or phrase before its first comma when it has one
 * ("Well," "Look, {first},"). Offsets index the line's own text.
 */
export function spansOf(text: string): Span[] {
  const out: Span[] = [];
  const sentence = /[^.!?]+[.!?]*(\s+|$)/g;
  for (let match = sentence.exec(text); match; match = sentence.exec(text)) {
    if (!match[0].trim()) break;
    const start = match.index;
    const body = match[0].trimEnd();
    const comma = body.indexOf(",");
    if (
      comma > 0 &&
      comma < body.length - 1 &&
      body.slice(0, comma).split(/\s+/).length <= 3
    ) {
      out.push({
        start,
        end: start + comma + 1,
        text: body.slice(0, comma + 1),
        features: spanFeatures(body.slice(0, comma + 1), false),
      });
      const rest = body.slice(comma + 1).trimStart();
      const restStart = start + body.length - rest.length;
      out.push({
        start: restStart,
        end: restStart + rest.length,
        text: rest,
        features: spanFeatures(rest, false),
      });
    } else {
      out.push({
        start,
        end: start + body.length,
        text: body,
        features: spanFeatures(body, false),
      });
    }
  }
  return out;
}
