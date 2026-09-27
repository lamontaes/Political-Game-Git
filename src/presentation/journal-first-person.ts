import { proseDate } from "./prose-dates";

/**
 * The Journal in the character's own hand: first person, past tense.
 *
 * The journal's entries are composed in the second person the rest of the
 * game narrates in ("You were born on…", "In January, you live in…"). The
 * Journal is the one surface written by the character, so it reads them back
 * as "I", and as things that happened. Only pronouns, verb agreement, tense
 * and date form change; every name, place and fact stays as recorded.
 */

/** Present-tense verbs a recorded fact uses, and how the journal tells them. */
const PAST_OF: Readonly<Record<string, string>> = {
  am: "was",
  are: "was",
  is: "was",
  were: "was",
  have: "had",
  has: "had",
  live: "lived",
  work: "worked",
  attend: "attended",
  remember: "remembered",
  know: "knew",
  support: "supported",
  oppose: "opposed",
  owe: "owed",
  hold: "held",
  serve: "served",
  run: "ran",
  do: "did",
  go: "went",
  think: "thought",
  believe: "believed",
  want: "wanted",
  need: "needed",
  study: "studied",
  share: "shared",
};

/** Words after which a bare "you" is the one doing something. */
const SUBJECT_AFTER = new Set([
  "and",
  "but",
  "when",
  "while",
  "that",
  "as",
  "before",
  "after",
  "because",
  "if",
  "where",
  "until",
  "since",
  "so",
  "then",
]);

/** Verbs, modals and adverbs that follow a subject "you". */
const FOLLOWS_SUBJECT = new Set([
  ...Object.keys(PAST_OF),
  "was",
  "had",
  "did",
  "said",
  "made",
  "began",
  "left",
  "met",
  "got",
  "took",
  "gave",
  "told",
  "heard",
  "saw",
  "spoke",
  "went",
  "came",
  "ran",
  "won",
  "lost",
  "will",
  "would",
  "could",
  "can",
  "should",
  "might",
  "must",
  "also",
  "still",
  "never",
  "first",
  "then",
  "privately",
  "publicly",
  "once",
  "already",
  "finally",
  "no",
  "not",
]);

function isSubjectYou(before: string, after: string): boolean {
  const next = after.toLowerCase();
  if (/^[a-z]+ed$/.test(next) || FOLLOWS_SUBJECT.has(next)) return true;
  const prior = before.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
  if (prior === "" || /[.!?:;]$/.test(prior)) return true;
  return SUBJECT_AFTER.has(prior.replace(/[,]$/, ""));
}

/** One journal sentence, told by the character. Quoted words keep theirs. */
export function journalInFirstPerson(text: string): string {
  return text
    .split(/(“[^”]*”|"[^"]*")/)
    .map((part, index) => (index % 2 === 1 ? part : toldPart(part)))
    .join("");
}

function toldPart(text: string): string {
  let out = text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (iso) =>
    proseDate(iso),
  );
  out = out.replace(/\b[Yy]ourself\b/g, "myself");
  out = out.replace(/\b[Yy]ours\b/g, "mine");
  out = out.replace(/\b([Yy])our\b/g, (_, y: string) =>
    y === "Y" ? "My" : "my",
  );
  out = out.replace(
    /\b[Yy]ou\b/g,
    (match: string, offset: number, whole: string) => {
      const after = /^\s+([A-Za-z']+)/.exec(whole.slice(offset + match.length));
      return isSubjectYou(whole.slice(0, offset), after?.[1] ?? "")
        ? "I"
        : "me";
    },
  );
  // Agreement and tense after "I": "I were" → "I was", "I live" → "I lived".
  out = out.replace(
    /\bI (also |still |never |privately |publicly )?([a-z]+)\b/g,
    (match, adverb: string | undefined, verb: string) => {
      const past = PAST_OF[verb];
      return past ? `I ${adverb ?? ""}${past}` : match;
    },
  );
  // A standing condition told at the time is past by the time it is written.
  out = out.replace(
    /\b(Going|Coming|Attending) is optional\./g,
    "$1 was optional.",
  );
  // "I and Dana went" is said "Dana and I went".
  out = out.replace(
    /\bI and ([A-Z][a-z]+(?: [A-Z][a-z]+)?)\b/g,
    (_, name: string) => `${name} and I`,
  );
  // A job title after "as" is a common noun in the middle of a sentence.
  out = out.replace(
    /\bas ([A-Z][a-z]+(?: [a-z]+)*) at\b/g,
    (_, title: string) => {
      const lower = title.charAt(0).toLowerCase() + title.slice(1);
      return `as ${/^[aeiou]/.test(lower) ? "an" : "a"} ${lower} at`;
    },
  );
  return out;
}

/**
 * A run of consecutive journal sentences, told by the character. Two birth
 * facts in a row become one sentence: "I was born in Lincoln, Nebraska, on
 * January 1, 1992."
 */
export function journalChronicleInFirstPerson<
  T extends { readonly text: string },
>(
  lines: readonly T[],
): readonly (T & {
  readonly firstPerson: string;
  readonly absorbed: boolean;
})[] {
  const told = lines.map((line) => ({
    ...line,
    firstPerson: journalInFirstPerson(line.text),
    absorbed: false,
  }));
  for (let index = 0; index + 1 < told.length; index += 1) {
    const on = /^I was born on (.+)\.$/.exec(told[index]!.firstPerson);
    const where = /^I was born in (.+)\.$/.exec(told[index + 1]!.firstPerson);
    if (on && where) {
      told[index] = {
        ...told[index]!,
        firstPerson: `I was born in ${where[1]}, on ${on[1]}.`,
      };
      told[index + 1] = { ...told[index + 1]!, absorbed: true };
    }
  }
  return told;
}
