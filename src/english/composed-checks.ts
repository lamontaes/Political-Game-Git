/**
 * The composed checks: the fourth kind of rule test (docs/design/words-composer.md,
 * part 6). A line rule reads one bank piece; a composed rule reads a whole text
 * the player met in a played world (a speech, a talk, a scene, a Journal note
 * or page, a news toast or story) through one check named in its row:
 *
 *   "test": { "kind": "composed", "check": "<name>" | ["<name>", ...], "applies": [kinds] }
 *
 * Each check is a pure function of one text and the sample it came from (the
 * other texts of that life, for checks across a day or a week, and the people
 * the world could name) and returns the breaks it found. A check never pulls
 * a bank line: the count of breaks per rule is kept in
 * tests/guards/english/composed-baseline.json and may only fall.
 *
 * Every number and word list is in data/english/composed-checks.json.
 */
import data from "../../data/english/composed-checks.json" with { type: "json" };
import questionNames from "../../data/english/question-names.json" with { type: "json" };
import {
  linesOf,
  plainSentence,
  type ComposedKind,
  type ComposedLine,
  type ComposedSample,
  type ComposedText,
  type NamedPerson,
} from "./composed-text";

/** The most words a question may have and still be read with the sentence after it as one thought. */
export const SHORT_QUESTION_MOST_WORDS = (
  data as unknown as {
    parameters: { shortQuestionMostWords: { value: number } };
  }
).parameters.shortQuestionMostWords.value;

/** One break: which check, in which text and screen, why, and the words. */
export interface ComposedBreak {
  readonly check: string;
  readonly textId: string;
  readonly screen: number;
  readonly why: string;
  readonly quote: string;
}

export type ComposedCheck = (
  text: ComposedText,
  sample: ComposedSample,
) => ComposedBreak[];

const PARAMETERS = data.parameters;
const value = (key: keyof typeof PARAMETERS): number => PARAMETERS[key].value;
const zero = 0;
const one = 1;

const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordPattern = (text: string, flags = "g"): RegExp =>
  new RegExp(`(?<![\\w'])${escape(text)}(?![\\w'])`, flags);
const plainQuotes = (text: string): string =>
  text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
const words = (text: string): string[] =>
  plainSentence(text).split(" ").filter(Boolean);

const breakOf = (
  check: string,
  text: ComposedText,
  screen: number,
  why: string,
  quote: string,
): ComposedBreak => ({ check, textId: text.id, screen, why, quote });

/** Every screen's lines and offered replies as one string, by screen. */
const screenTexts = (text: ComposedText): string[] =>
  text.screens.map((screen) =>
    [...screen.lines.map((line) => line.text), ...screen.offered].join(" "),
  );

/** People with a full name of two words or more, longest names first. */
function namedPeople(sample: ComposedSample): NamedPerson[] {
  return sample.people
    .filter((person) => person.full.trim().includes(" "))
    .sort((a, b) => b.full.length - a.full.length || a.id.localeCompare(b.id));
}

// ---- person-said-by-role-pronoun-or-relationship ----

/** A full name said more than once on one screen (lines and offered replies together). */
export const fullNameOncePerScreen: ComposedCheck = (text, sample) => {
  const found: ComposedBreak[] = [];
  const people = namedPeople(sample);
  screenTexts(text).forEach((said, screen) => {
    for (const person of people) {
      const count = said.match(wordPattern(person.full))?.length ?? zero;
      if (count > one)
        found.push(
          breakOf(
            "full-name-once-per-screen",
            text,
            screen,
            `"${person.full}" ${count} times on one screen`,
            said,
          ),
        );
    }
  });
  return found;
};

const ROLE_BEFORE = new RegExp(
  `(?:${data.roleWords.map(escape).join("|")})\\s+$`,
  "i",
);

/**
 * A full name said with no role or relationship before it, at its first
 * mention in the text, about someone the listener was not given: not the
 * speaker or listener, not in the room, not of the player's household.
 */
export const noBareFullNameUnintroduced: ComposedCheck = (text, sample) => {
  const known = new Set([
    ...text.presentIds,
    ...sample.householdIds,
    ...(text.speakerId ? [text.speakerId] : []),
    ...(text.listenerId ? [text.listenerId] : []),
  ]);
  const found: ComposedBreak[] = [];
  const seen = new Set<string>();
  const people = namedPeople(sample).filter((person) => !known.has(person.id));
  screenTexts(text).forEach((said, screen) => {
    for (const person of people) {
      if (seen.has(person.id)) continue;
      const match = wordPattern(person.full, "").exec(said);
      if (!match) continue;
      seen.add(person.id);
      const before = said.slice(zero, match.index);
      if (!ROLE_BEFORE.test(before))
        found.push(
          breakOf(
            "no-bare-full-name-unintroduced",
            text,
            screen,
            `"${person.full}"${person.role ? ` (${person.role})` : ""} first said with no role or relationship`,
            said,
          ),
        );
    }
  });
  return found;
};

// ---- one-idea-to-a-sentence ----

const SUBORDINATE = new RegExp(
  `^(?:${data.subordinators.map(escape).join("|")})\\b`,
);
const JOINED = new RegExp(`^(?:${data.conjunctions.map(escape).join("|")})\\b`);
const SUBJECTS = new Set(data.clauseSubjects);
const VERBS = new Set(data.finiteVerbs);
const CONTRACTED_SUBJECT =
  /^(?:i|you|we|they|he|she|it|that|there)'(?:m|re|ll|ve|d|s)$/;

/** The most comma-parts a sentence may have and still be read for a splice. */
const SERIES = value("seriesMostParts");

/** Words that make what follows them part of a noun ("everyone who came"). */
const RELATIVES = new Set(["who", "which", "that", "whom", "whose"]);

/** Whether a word, with the one after it, is a subject and its verb: "I'm", "it is", "we went". */
function subjectAndVerb(word: string, next: string | undefined): boolean {
  if (CONTRACTED_SUBJECT.test(word)) return true;
  return (
    SUBJECTS.has(word) &&
    next !== undefined &&
    (VERBS.has(next) || next.endsWith("n't") || next.endsWith("ed"))
  );
}

/**
 * Whether a stretch of words reads as a full clause: a subject and its verb
 * (or a finite verb after its first word, not inside a relative clause), and
 * no subordinating opener. A list of people addressed ("everyone who came
 * out") has neither, so it is not one.
 */
function fullClause(segment: string): boolean {
  const list = words(segment);
  if (!list.length || SUBORDINATE.test(list.join(" "))) return false;
  return list.some(
    (word, at) =>
      subjectAndVerb(word, list[at + one]) ||
      (at > zero && VERBS.has(word) && !RELATIVES.has(list[at - one]!)),
  );
}

/** Whether a stretch opens on its own subject and verb: "I'll ...", "it is ...". */
function opensClause(segment: string): boolean {
  const [first, second] = words(segment);
  return (
    first !== undefined && !JOINED.test(first) && subjectAndVerb(first, second)
  );
}

/** Two full clauses joined by a comma alone. */
export const noCommaSplice: ComposedCheck = (text) => {
  const found: ComposedBreak[] = [];
  text.screens.forEach((screen, at) => {
    for (const line of screen.lines)
      for (const sentence of line.sentences) {
        const parts = plainQuotes(sentence).split(/,\s+/);
        // A run of three or more commas is a series or a list of names, not a splice.
        if (parts.length > SERIES) continue;
        for (let index = one; index < parts.length; index += one)
          if (opensClause(parts[index]!) && fullClause(parts[index - one]!)) {
            found.push(
              breakOf(
                "no-comma-splice",
                text,
                at,
                "two full clauses joined by a comma",
                sentence,
              ),
            );
            break;
          }
      }
  });
  return found;
};

// ---- line-fits-the-hour ----

const DAYPART_OVER: readonly [RegExp, number][] = [
  [new RegExp(data.futureDayparts.tonight, "i"), value("nightStartsMinute")],
  [
    new RegExp(data.futureDayparts["this morning"], "i"),
    value("morningEndsMinute"),
  ],
  [
    new RegExp(data.futureDayparts["this afternoon"], "i"),
    value("eveningStartsMinute"),
  ],
];
const END_OF_DAY = data.endOfDay.map((source) => new RegExp(source, "i"));

/** A line looking ahead to a part of the day already under way or over, or end-of-day talk in the morning. */
export const noOverDaypart: ComposedCheck = (text) => {
  const found: ComposedBreak[] = [];
  text.screens.forEach((screen, at) => {
    for (const line of screen.lines)
      for (const sentence of line.sentences) {
        const late = DAYPART_OVER.find(
          ([pattern, from]) =>
            text.minuteOfDay >= from && pattern.test(plainQuotes(sentence)),
        );
        if (late)
          found.push(
            breakOf(
              "no-over-daypart",
              text,
              at,
              `looks ahead to a part of the day already here (minute ${text.minuteOfDay})`,
              sentence,
            ),
          );
        else if (
          text.minuteOfDay < value("morningLastMinute") &&
          END_OF_DAY.some((pattern) => pattern.test(plainQuotes(sentence)))
        )
          found.push(
            breakOf(
              "no-over-daypart",
              text,
              at,
              `end-of-day talk in the morning (minute ${text.minuteOfDay})`,
              sentence,
            ),
          );
      }
  });
  return found;
};

/** A sentence with every name the world could say replaced, so two people's same words compare. */
function sentenceShape(sentence: string, sample: ComposedSample): string {
  let out = plainQuotes(sentence);
  for (const person of namedPeople(sample)) {
    out = out.replace(wordPattern(person.full), "someone");
    if (person.given.length > one)
      out = out.replace(wordPattern(person.given), "someone");
  }
  return plainSentence(out);
}

const TALK_KINDS: readonly ComposedKind[] = ["talk:home", "talk:town", "scene"];
/** Milliseconds in a day: a unit, not a tunable. */
const DAY_MS = 24 * 60 * 60 * 1000;
const dayNumber = (date: string): number =>
  Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);

/** The first line a speaker says in a talk: its first sentence. */
function openerOf(text: ComposedText): ComposedLine | undefined {
  return linesOf(text).find((line) => line.speakerId === text.speakerId);
}

/**
 * The same opener from the same speaker to the same listener on `loopDays`
 * days within one `loopWindowDays` window (read at the text that makes it so).
 */
export const noDailySubjectLoop: ComposedCheck = (text, sample) => {
  if (!TALK_KINDS.includes(text.kind) || !text.speakerId) return [];
  const opener = openerOf(text)?.sentences[zero];
  if (!opener) return [];
  const shape = sentenceShape(opener, sample);
  const today = dayNumber(text.date);
  const days = new Set<number>();
  for (const other of sample.texts) {
    if (
      !TALK_KINDS.includes(other.kind) ||
      other.speakerId !== text.speakerId ||
      other.listenerId !== text.listenerId
    )
      continue;
    const day = dayNumber(other.date);
    if (day > today || today - day >= value("loopWindowDays")) continue;
    const said = openerOf(other)?.sentences[zero];
    if (said && sentenceShape(said, sample) === shape) days.add(day);
  }
  // Only the day that reaches the count is a break, so a loop is counted once a day past it.
  const earlier = [...days].filter((day) => day < today).length;
  return days.has(today) && earlier + one >= value("loopDays")
    ? [
        breakOf(
          "no-daily-subject-loop",
          text,
          zero,
          `the same opener on ${earlier + one} days of one week`,
          opener,
        ),
      ]
    : [];
};

// ---- two-speakers-make-different-points ----

/**
 * A sentence one speaker said that another speaker of the same household
 * already said the same day (names set aside).
 */
export const noEchoBetweenSpeakers: ComposedCheck = (text, sample) => {
  if (!TALK_KINDS.includes(text.kind)) return [];
  const household = new Set(sample.householdIds);
  const at = sample.texts.indexOf(text);
  const earlier = new Map<string, string>();
  for (const other of sample.texts.slice(zero, at < zero ? zero : at))
    if (TALK_KINDS.includes(other.kind) && other.date === text.date)
      for (const line of linesOf(other))
        if (line.speakerId && household.has(line.speakerId))
          for (const sentence of line.sentences)
            earlier.set(sentenceShape(sentence, sample), line.speakerId);
  const found: ComposedBreak[] = [];
  text.screens.forEach((screen, index) => {
    for (const line of screen.lines) {
      if (!line.speakerId || !household.has(line.speakerId)) continue;
      for (const sentence of line.sentences) {
        const shape = sentenceShape(sentence, sample);
        if (shape.split(" ").length < value("echoLeastWords")) continue;
        const first = earlier.get(shape);
        if (first && first !== line.speakerId)
          found.push(
            breakOf(
              "no-echo-between-speakers",
              text,
              index,
              "a housemate said this sentence earlier the same day",
              sentence,
            ),
          );
      }
    }
  });
  return found;
};

// ---- no-non-replies ----

const ACKS = new Set(data.acknowledgments);
const CHECK_IN = data.checkInClose.map((source) => new RegExp(source, "i"));

/** Whether a line only acknowledges: a few words, each piece of it an acknowledgment. */
function onlyAcknowledges(text: string): boolean {
  const all = words(text);
  if (!all.length || all.length > value("ackMostWords")) return false;
  return plainQuotes(text)
    .split(/[.,!?]+/)
    .map(plainSentence)
    .filter(Boolean)
    .every((piece) => ACKS.has(piece));
}

/**
 * In a talk, an answer from the other person that only acknowledges what the
 * player said, or a talk that closes on a promise to talk again.
 */
export const noNonReply: ComposedCheck = (text, sample) => {
  if (!TALK_KINDS.includes(text.kind)) return [];
  const found: ComposedBreak[] = [];
  let playerSaid = false;
  let last: { line: ComposedLine; screen: number } | undefined;
  text.screens.forEach((screen, at) => {
    for (const line of screen.lines) {
      if (line.speakerId === sample.playerId) {
        playerSaid = true;
        continue;
      }
      if (!line.speakerId) continue;
      if (playerSaid && onlyAcknowledges(line.text))
        found.push(
          breakOf(
            "no-non-reply",
            text,
            at,
            "the answer only acknowledges",
            line.text,
          ),
        );
      playerSaid = false;
      last = { line, screen: at };
    }
  });
  const close = last?.line.sentences.at(-one);
  if (last && close && CHECK_IN.some((pattern) => pattern.test(close)))
    found.push(
      breakOf(
        "no-non-reply",
        text,
        last.screen,
        "the talk closes on a promise to talk again",
        close,
      ),
    );
  return found;
};

// ---- no-reply-asks-what-the-listener-cannot-know ----

const ASK_AFTER = data.askAfter;

/** A line asking after someone who is in the room. */
export const notAskedAfterWhilePresent: ComposedCheck = (text, sample) => {
  if (!TALK_KINDS.includes(text.kind)) return [];
  const present = sample.people.filter(
    (person) =>
      text.presentIds.includes(person.id) &&
      person.id !== text.speakerId &&
      person.id !== text.listenerId &&
      person.id !== sample.playerId,
  );
  const found: ComposedBreak[] = [];
  text.screens.forEach((screen, at) => {
    for (const line of screen.lines) {
      if (!line.speakerId) continue;
      for (const sentence of line.sentences)
        for (const person of present) {
          const asked = ASK_AFTER.some((source) =>
            new RegExp(
              source.replace("{name}", escape(person.given)),
              "i",
            ).test(plainQuotes(sentence)),
          );
          if (asked)
            found.push(
              breakOf(
                "not-asked-after-while-present",
                text,
                at,
                `asks after ${person.full}, who is in the room`,
                sentence,
              ),
            );
        }
    }
  });
  return found;
};

const KNOWN_FACTS = data.knownFactQuestions.map(
  (source) => new RegExp(source, "i"),
);

/** A housemate asking the player what a household already knows: their work, their home, their name. */
export const housemateDoesNotAskKnownFact: ComposedCheck = (text, sample) => {
  if (!TALK_KINDS.includes(text.kind)) return [];
  const household = new Set(sample.householdIds);
  const found: ComposedBreak[] = [];
  text.screens.forEach((screen, at) => {
    for (const line of screen.lines) {
      if (
        !line.speakerId ||
        line.speakerId === sample.playerId ||
        !household.has(line.speakerId)
      )
        continue;
      for (const sentence of line.sentences)
        if (KNOWN_FACTS.some((pattern) => pattern.test(plainQuotes(sentence))))
          found.push(
            breakOf(
              "housemate-does-not-ask-known-fact",
              text,
              at,
              "a housemate asks what the household already knows",
              sentence,
            ),
          );
    }
  });
  return found;
};

// ---- the speech checks ----

/** A place whose bare name means something else in speech, and the spelling that means the place. */
const PLACE_SAID_ONLY_AS: Readonly<Record<string, string>> =
  data.placeSaidOnlyAs.names;

const SPEECH_KINDS: readonly ComposedKind[] = [
  "speech:president",
  "speech:governor",
  "speech:mayor",
  "speech:player",
];

/**
 * A speech naming a state that is not its own jurisdiction's, or a national
 * speech naming the player's town. A state whose bare name means something
 * else in speech is matched only by the spelling the data gives for it
 * (`placeSaidOnlyAs` in data/english/composed-checks.json).
 */
export const speechNamesNoStrayPlace: ComposedCheck = (text, sample) => {
  if (!SPEECH_KINDS.includes(text.kind)) return [];
  const own = new Set(text.ownPlaces ?? []);
  const stray = [
    ...sample.stateNames.filter((name) => !own.has(name)),
    ...(text.kind === "speech:president" && sample.townName
      ? [sample.townName]
      : []),
  ];
  // Every place the text could name, its own included: a name found inside a
  // longer place's name is that longer place, whichever of the two is stray.
  const known = [...new Set([...own, ...stray])];
  const found: ComposedBreak[] = [];
  screenTexts(text).forEach((said, at) => {
    const spans = known.flatMap((name) =>
      [...said.matchAll(wordPattern(PLACE_SAID_ONLY_AS[name] ?? name))].map(
        (match) => ({
          name,
          start: match.index,
          end: match.index + match[0].length,
        }),
      ),
    );
    const named = new Set<string>();
    for (const span of spans) {
      if (own.has(span.name) || named.has(span.name)) continue;
      const inside = spans.some(
        (other) =>
          other.start <= span.start &&
          other.end >= span.end &&
          other.end - other.start > span.end - span.start,
      );
      if (inside) continue;
      named.add(span.name);
      found.push(
        breakOf(
          "speech-names-no-stray-place",
          text,
          at,
          `names ${span.name}, not this speech's own place`,
          said,
        ),
      );
    }
  });
  return found;
};

const ASK = new RegExp(data.askVerbs, "i");
const STOP = new Set(data.stopwords);
const stem = (word: string): string =>
  word.length > value("subjectWordLeastLetters") &&
  word.endsWith("s") &&
  !word.endsWith("ss")
    ? word.slice(zero, -one)
    : word;
const subjectWords = (sentence: string): string[] =>
  words(sentence)
    .filter(
      (word) =>
        !STOP.has(word) &&
        word.length >= value("subjectWordLeastLetters") &&
        !/^\d/.test(word),
    )
    .map(stem);

/** The same ask said twice in one speech (by its subject words). */
export const askSaidOnce: ComposedCheck = (text) => {
  if (!SPEECH_KINDS.includes(text.kind)) return [];
  const asks: { words: Set<string>; sentence: string; screen: number }[] = [];
  const found: ComposedBreak[] = [];
  text.screens.forEach((screen, at) => {
    for (const line of screen.lines)
      for (const sentence of line.sentences) {
        if (!ASK.test(sentence)) continue;
        const own = new Set(subjectWords(sentence));
        if (own.size < value("askLeastWords")) continue;
        const twin = asks.find((ask) => {
          const shared = [...own].filter((word) => ask.words.has(word)).length;
          return (
            shared / Math.min(own.size, ask.words.size) >= value("askOverlap")
          );
        });
        if (twin)
          found.push(
            breakOf(
              "ask-said-once",
              text,
              at,
              `asks again for what it asked: "${twin.sentence}"`,
              sentence,
            ),
          );
        asks.push({ words: own, sentence, screen: at });
      }
  });
  return found;
};

/**
 * The subject words of a sentence and how many times one speech may say
 * each: the same reader the composed check uses, so the one address writer
 * holds the rule as it composes (src/director/opening-story.ts
 * `composeBlocks`) and the check reads what it held.
 */
export const SUBJECT_WORDS = {
  of: (sentence: string): string[] => subjectWords(sentence),
  most: (): number => value("subjectBudget"),
  wordsOf: (text: string): string[] => words(text),
};

/** A subject's word said more than `subjectBudget` times in one speech (names of people set aside). */
export const subjectBudget: ComposedCheck = (text, sample) => {
  if (!SPEECH_KINDS.includes(text.kind)) return [];
  const nameWords = new Set(
    sample.people.flatMap((person) => words(person.full)),
  );
  const counts = new Map<string, number>();
  for (const line of linesOf(text))
    for (const word of subjectWords(line.text))
      if (!nameWords.has(word))
        counts.set(word, (counts.get(word) ?? zero) + one);
  return [...counts]
    .filter(([, count]) => count > value("subjectBudget"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([word, count]) =>
      breakOf(
        "subject-budget",
        text,
        zero,
        `"${word}" ${count} times in one speech`,
        word,
      ),
    );
};

// ---- point-made-once ----

/** A wording as it is found inside a sentence: lower case, plain quotes, no closing period. */
const asFound = (text: string): string =>
  plainQuotes(text)
    .toLocaleLowerCase("en-US")
    .replace(/[.!?]+$/, "")
    .trim();

/** Every group of wordings that make one claim (question-names.json `points`), by question and tag. */
const POINT_GROUPS: readonly { tag: string; texts: readonly string[] }[] =
  Object.entries(
    questionNames.names as Record<
      string,
      { points?: Readonly<Record<string, readonly string[]>> }
    >,
  ).flatMap(([question, row]) =>
    Object.entries(row.points ?? {}).map(([tag, texts]) => ({
      tag: `${question}#${tag}`,
      texts: [...new Set(texts.map(asFound))],
    })),
  );

/** One paragraph of a speech that makes one point twice: two wordings of one `points` group (the lead, Nov 12: "to people who know the work. Because I believe an officer should be judged by people who have done the job"). */
export const pointMadeOnce: ComposedCheck = (text) => {
  if (!SPEECH_KINDS.includes(text.kind)) return [];
  const found: ComposedBreak[] = [];
  screenTexts(text).forEach((screen, at) => {
    const said = asFound(screen);
    for (const group of POINT_GROUPS) {
      const twice = group.texts.filter((wording) => said.includes(wording));
      if (twice.length > one)
        found.push(
          breakOf(
            "point-made-once",
            text,
            at,
            `makes one point twice (${group.tag.split("#")[one]})`,
            twice.join(" / "),
          ),
        );
    }
  });
  return found;
};

// ---- note-stands-alone ----

const LEANING = data.leaningOpeners.map((source) => new RegExp(source, "i"));
const DOUBLED = new RegExp(data.doubledWord, "i");
const NOTE_KINDS: readonly ComposedKind[] = ["journal:note", "news:toast"];

/** A Journal note or news toast that leans on a sentence it is shown without, or doubles a word. */
export const noteStandsAlone: ComposedCheck = (text) => {
  if (!NOTE_KINDS.includes(text.kind)) return [];
  const found: ComposedBreak[] = [];
  text.screens.forEach((screen, at) => {
    const first = screen.lines[zero];
    const opener = first?.sentences[zero];
    if (opener && LEANING.some((pattern) => pattern.test(plainQuotes(opener))))
      found.push(
        breakOf(
          "note-stands-alone",
          text,
          at,
          "opens leaning on a sentence it is shown without",
          opener,
        ),
      );
    for (const line of screen.lines)
      for (const sentence of line.sentences)
        if (DOUBLED.test(plainQuotes(sentence)))
          found.push(
            breakOf("note-stands-alone", text, at, "a word doubled", sentence),
          );
  });
  return found;
};

/** Every composed check by its name: the names a rule row's `check` may hold. */
export const COMPOSED_CHECKS: Readonly<Record<string, ComposedCheck>> = {
  "full-name-once-per-screen": fullNameOncePerScreen,
  "no-bare-full-name-unintroduced": noBareFullNameUnintroduced,
  "no-comma-splice": noCommaSplice,
  "no-over-daypart": noOverDaypart,
  "no-daily-subject-loop": noDailySubjectLoop,
  "no-echo-between-speakers": noEchoBetweenSpeakers,
  "no-non-reply": noNonReply,
  "not-asked-after-while-present": notAskedAfterWhilePresent,
  "housemate-does-not-ask-known-fact": housemateDoesNotAskKnownFact,
  "speech-names-no-stray-place": speechNamesNoStrayPlace,
  "ask-said-once": askSaidOnce,
  "subject-budget": subjectBudget,
  "point-made-once": pointMadeOnce,
  "note-stands-alone": noteStandsAlone,
};

/** A composed rule's checks, as a list. */
export const checksOf = (check: string | readonly string[]): string[] =>
  typeof check === "string" ? [check] : [...check];

/** What one composed rule found over a sample. */
export interface ComposedRuleCount {
  readonly rule: string;
  readonly read: number;
  readonly breaks: readonly ComposedBreak[];
}

/** A rule row as the composed run reads it. */
export interface ComposedRuleRow {
  readonly id: string;
  readonly test: {
    readonly kind: string;
    readonly check?: string | readonly string[];
    readonly applies?: readonly string[];
  };
}

/** Runs every composed rule over every text of a sample it applies to. */
export function runComposedRules(
  rules: readonly ComposedRuleRow[],
  sample: ComposedSample,
): ComposedRuleCount[] {
  return rules
    .filter((rule) => rule.test.kind === "composed" && rule.test.check)
    .map((rule) => {
      const applies = rule.test.applies;
      const texts = sample.texts.filter(
        (text) => !applies?.length || applies.includes(text.kind),
      );
      const breaks = texts.flatMap((text) =>
        checksOf(rule.test.check!).flatMap((name) => {
          const check = COMPOSED_CHECKS[name];
          if (!check) throw new Error(`No composed check named ${name}`);
          return check(text, sample);
        }),
      );
      return { rule: rule.id, read: texts.length, breaks };
    });
}

/** One rule's row in the baseline: texts read, breaks, and breaks per 100 texts. */
export interface BaselineRow {
  readonly read: number;
  readonly breaks: number;
  readonly per100: number;
}

/**
 * Why a fresh run fails against the committed baseline, one line each: a
 * rule whose rate rose, and a rule the baseline read texts for that now
 * reads none or is missing. Reading nothing is lost coverage, never an
 * improvement: a sampler that stops making a kind of text would otherwise
 * report every rule about it at zero.
 */
export function baselineFailures(
  committed: Readonly<Record<string, BaselineRow>>,
  fresh: Readonly<Record<string, BaselineRow>>,
): string[] {
  const failures: string[] = [];
  for (const [rule, was] of Object.entries(committed)) {
    const now = fresh[rule];
    if (was.read > 0 && (now === undefined || now.read === 0))
      failures.push(
        `COVERAGE: ${rule} read no texts; the baseline read ${was.read}. A rule that reads nothing has checked nothing.`,
      );
    // A rate rises only with its count where fewer texts were read (lead,
    // Nov 12): fewer texts can neither fake a rise (the same breaks over a
    // smaller count) nor hide one (more breaks in fewer texts is a rise).
    else if (
      now !== undefined &&
      now.per100 > was.per100 &&
      (now.read >= was.read || now.breaks > was.breaks)
    )
      failures.push(
        `ROSE: ${rule} ${was.per100} -> ${now.per100} breaks per 100 texts (${was.breaks} -> ${now.breaks} breaks in ${was.read} -> ${now.read} texts)`,
      );
  }
  return failures;
}
