/**
 * Changes the speech banks by kind, never one sentence at a time (words
 * composer, unit 3; owner, Nov 12: "I don't think you should be rewriting one
 * sentence at a time ... you need to be changing the engine"). Each rule
 * below names the kind of piece it changes and prints how many it changed.
 * Run it again and it changes nothing: every rule is idempotent.
 *
 *   node --import tsx scripts/words/speech-bank-by-kind.ts
 *
 * 1. Titles leave the pieces: "Vice President {vice-president}" and "Speaker
 *    {speaker}" become the person's slot, which the said-as reader words
 *    ("Vice President Kathryn Hansen" at first mention, "the Vice President"
 *    after). A piece that opens by speaking to the Vice President takes the
 *    `vice-president-addressed` slot, said with title and name every time.
 * 2. The salutation is its own sentence: an opener of the greeting that ends
 *    in a comma ends in a period, so the first idea starts a sentence of its
 *    own ("Mr. Chief Justice, Madam Speaker, members of Congress, my fellow
 *    Americans."). A whole greeting that runs its list of people into a
 *    clause is split where the clause begins.
 * 3. An ask's lead-in does not address the body its core addresses again: the
 *    addressee leaves the lead-in ("To Congress, first thing," becomes "First
 *    thing,"), so no sentence says "To Congress, first thing, Congress, I'm
 *    asking you".
 * 4. The context pieces (role `context`), one sentence per measure from the
 *    world's records over a span, are added once from the list below.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/english/parts/opening-speech.json";
interface Use {
  move: string;
  subject: string;
  role: string;
  choice: string;
  requiresFacts?: string[];
}
interface Part {
  key: string;
  move: string;
  kind: string;
  text: string;
  uses: Use[];
  voice: string | string[];
  topic?: string | string[];
  piece?: { of: string; part: string; required?: boolean };
  [field: string]: unknown;
}
const bank = JSON.parse(readFileSync(FILE, "utf8")) as {
  slots: Record<string, string>;
  parts: Part[];
};
const counts: Record<string, number> = {};
const count = (rule: string) => (counts[rule] = (counts[rule] ?? 0) + 1);
const hasRole = (part: Part, role: string) =>
  part.uses.some((use) => use.role === role);
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// 1. Titles leave the pieces.
for (const part of bank.parts) {
  let text = part.text;
  if (/^\{vice-president\},/.test(text)) {
    text = text.replace(/^\{vice-president\},/, "{vice-president-addressed},");
    for (const use of part.uses)
      if (use.requiresFacts?.includes("vice-president"))
        use.requiresFacts = use.requiresFacts.map((key) =>
          key === "vice-president" ? "vice-president-addressed" : key,
        );
    count(
      "1. a piece that speaks to the Vice President takes the addressed slot",
    );
  }
  const titled = text
    .replace(/\bVice President \{vice-president\}/g, "{vice-president}")
    .replace(/\bSpeaker \{speaker\}/g, "{speaker}");
  if (titled !== text) {
    text = titled;
    count("1. a typed title leaves the piece for the person's slot");
  }
  part.text = text;
}

// 2. The salutation is its own sentence.
const CLAUSE =
  /, (?:and )?(I|I'm|I'll|I've|I'd|we|we're|we've|it is|it's|let me|let's|thank you|this is|tonight I|tonight, I|tonight is|tonight)\b/;
for (const part of bank.parts) {
  if (!hasRole(part, "salutation")) continue;
  if (part.piece?.part === "opener" && /,\s*$/.test(part.text)) {
    part.text = part.text.replace(/,\s*$/, ".");
    count("2. a greeting's list of people ends its own sentence");
    continue;
  }
  if (part.piece) continue;
  const found = CLAUSE.exec(part.text);
  if (!found) continue;
  const head = part.text.slice(0, found.index);
  // Only a list of people may be split off: no clause of its own before it.
  if (/[.!?]|\b(I|I'm|I'll|we|is|are|was|am)\b/.test(head)) continue;
  part.text = `${head}. ${capital(part.text.slice(found.index + ", ".length).replace(/^and /, ""))}`;
  count("2. a whole greeting's list of people is split from its first clause");
}

// 3. An ask's lead-in does not name the body the core addresses.
const ADDRESSEE = /^(?:To (?:this )?Congress|Members of Congress|Congress), /;
const seen = new Set<string>();
bank.parts = bank.parts.filter((part) => {
  if (!(hasRole(part, "ask") && part.piece?.part === "opener")) return true;
  if (ADDRESSEE.test(part.text)) {
    part.text = capital(part.text.replace(ADDRESSEE, ""));
    count("3. an ask's lead-in drops the body its core addresses");
  }
  const same = `${JSON.stringify(part.voice)}|${part.text}|${JSON.stringify(part.uses.map((use) => use.requiresFacts))}`;
  if (seen.has(same)) {
    count("3. a lead-in that became the same as another is dropped");
    return false;
  }
  seen.add(same);
  return true;
});

// 5. A lead-in that only announces the next clause goes (words skill, Nov 11:
// "A lead-in does work or it goes"), and the clause it announced starts its
// own sentence, so no comma joins two full clauses.
for (const part of bank.parts) {
  const announced = /, and I'll tell you, (\S)/;
  if (!announced.test(part.text)) continue;
  part.text = part.text.replace(
    announced,
    (_, letter: string) => `. ${letter.toUpperCase()}`,
  );
  count("5. an announcing lead-in goes and its clause starts a sentence");
}

// 6. A person's slot names the case its place in the sentence needs, so the
// said-as reader gives "her" after "with", never "she" (owner, Nov 12, on
// "with he beside me"): possessive before "'s", object after any word that
// is not a conjunction, subject at the start of a clause.
const CONJUNCTIONS = new Set([
  "and",
  "but",
  "that",
  "because",
  "when",
  "while",
  "as",
  "if",
  "so",
  "or",
  "where",
  "until",
  "since",
]);
for (const part of bank.parts) {
  const before = part.text;
  part.text = part.text
    .replace(/\{(vice-president|speaker)\}'s\b/g, "{$1-possessive}")
    .replace(
      /(^|[^{}]*?)\b([A-Za-z']+) \{(vice-president|speaker)\}/g,
      (whole, lead: string, word: string, who: string) =>
        CONJUNCTIONS.has(word.toLowerCase())
          ? whole
          : `${lead}${word} {${who}-object}`,
    );
  if (part.text !== before) {
    for (const use of part.uses)
      if (use.requiresFacts)
        use.requiresFacts = [...new Set(use.requiresFacts)];
    count("6. a person's slot names its case (object or possessive)");
  }
}

// The keys the owner graded good (data/english/part-grades.json): no rule
// below drops or merges one away.
const GRADED_GOOD = new Set(
  Object.entries(
    (
      JSON.parse(readFileSync("data/english/part-grades.json", "utf8")) as {
        parts: Record<string, { good: number }>;
      }
    ).parts,
  )
    .filter(([, row]) => row.good > 0)
    .map(([key]) => key),
);

// A piece the owner graded good that becomes the same words as another is
// merged into it, and its grade moves onto the live piece through the
// restored-liked-lines file (scripts/dialogue-batch/liked-lines-kept.test.ts).
const RESTORED = "data/english/grades/restored-liked-lines.json";
const restored = JSON.parse(readFileSync(RESTORED, "utf8")) as {
  grades: {
    i: number;
    parts: string[];
    restoredFrom?: string;
    [field: string]: unknown;
  }[];
};
function moveGrade(from: string, onto: string): void {
  if (!GRADED_GOOD.has(from)) return;
  if (restored.grades.some((row) => row.restoredFrom === from)) return;
  restored.grades.push({
    i: restored.grades.length,
    grade: "good",
    by: "owner; moved Nov 12, 2026 (speech-bank-by-kind.ts: a greeting cut to its list became the same words as another)",
    parts: [onto],
    restoredFrom: from,
  });
  writeFileSync(RESTORED, `${JSON.stringify(restored, null, 2)}\n`);
  count(
    "13. a graded-good piece merged into another keeps its grade on the live piece",
  );
}

// 7. A whole greeting is its list of people and nothing after it: the
// sentence that follows a split greeting only announces ("I'll keep this
// practical tonight."), so it goes, and a greeting that became the same as
// another of its kind is dropped.
const greetings = new Map<string, string>();
bank.parts = bank.parts.filter((part) => {
  if (!hasRole(part, "salutation") || part.piece) return true;
  const first = /^[^.!?]*[.!?]/.exec(part.text)?.[0];
  if (first && first !== part.text) {
    part.text = first;
    count("7. a whole greeting keeps only its list of people");
  }
  const same = `${JSON.stringify(part.voice)}|${String(part.addressKind)}|${part.text}|${part.uses.map((use) => use.subject).join()}`;
  if (greetings.has(same)) {
    moveGrade(part.key, greetings.get(same)!);
    count("7. a greeting that became the same as another is dropped");
    return false;
  }
  greetings.set(same, part.key);
  return true;
});

// 8. No promise to come back and report (owner, Nov 12, on "I'll be back to
// report on rising pay": "What do you mean?").
bank.parts = bank.parts.filter((part) => {
  if (!/\b(back to report|report back|be back to)\b/i.test(part.text))
    return true;
  count("8. a promise to come back and report is dropped");
  return false;
});

// 4. The context pieces.
const SLOTS: Record<string, string> = {
  "context-years":
    "how many whole years a context sentence covers: the macro engine's months, or the years since the speaker took office for an area of the term read",
  "context-amount":
    "a measure's average over the context's years, to one decimal, from the macro engine's months",
  "vice-president-addressed":
    "the Vice President spoken to, said with title and name every time",
  "vice-president-object":
    "the Vice President where the sentence needs the object case (with her)",
  "vice-president-possessive":
    "the Vice President where the sentence needs the possessive (her counsel)",
  today:
    "how the policy question stands today, by the law in force and as the speaker's side describes it (question-names.json `today`)",
  "today-clause":
    "the same sentence as `today`, in the case it takes after an opener and a comma",
  "today-second": "a second wording of `today` (question-names `todayMore`)",
  "today-third": "a third wording of `today` (question-names `todayMore`)",
  "today-clause-second": "`today-second` after an opener and a comma",
  "today-clause-third": "`today-third` after an opener and a comma",
  "today-question-second": "`today-second` inside a question to the audience",
  "today-question-third": "`today-third` inside a question to the audience",
  "today-question":
    "the same sentence as `today-clause` without its period, said inside a question to the audience",
  belief:
    "what the speaker believes, a clause worded from the belief-words pieces by the question's family and the speaker's pole of it",
  "first-side":
    "the speech's first point as the speaker's side says it (question-names `for` or `against`), for the close",
  side: "the question as the speaker's side says it (question-names.json `for` or `against`)",
  "realm-name":
    "the governor's state or the mayor's town by name, from the speaker's jurisdiction record",
  "theme-name":
    "the speech's one theme said as people say it (speech-outlines.json `themeNames`, by the question family)",
  "law-name":
    'the law in force on the question, as the thing itself (question-names.json `law`: "paid family leave", "the higher federal minimum wage")',
  "speaker-object": "the Speaker where the sentence needs the object case",
  "speaker-possessive": "the Speaker where the sentence needs the possessive",
};
for (const [slot, about] of Object.entries(SLOTS))
  if (bank.slots[slot] !== about) bank.slots[slot] = about;
// Slots no piece names any more.
for (const slot of ["it", "it-subject"]) delete bank.slots[slot];
for (const slot of ["vice-president", "speaker"])
  bank.slots[slot] =
    `${bank.slots[slot]!.replace(/; said with.*$/, "")}; said with the seat's title at first mention and by role after (said-as)`;

const FEDERAL = ["inaugural", "state-of-the-union"];
const ALL = [...FEDERAL, "state-of-the-state", "town-address"];
/** Context pieces: [topic, subjects, voice, text, facts it needs]. */
const CONTEXT: [string, string[], string, string, string[]][] = [
  [
    "inflation",
    FEDERAL,
    "polished",
    "For {context-years} years, prices have climbed by about {context-amount} percent a year, and families have paid for every bit of it.",
    ["context-inflation", "context-years", "context-amount"],
  ],
  [
    "inflation",
    FEDERAL,
    "plain",
    "For {context-years} years now, prices have gone up about {context-amount} percent a year, and folks feel it every time they shop.",
    ["context-inflation", "context-years", "context-amount"],
  ],
  [
    "unemployment",
    FEDERAL,
    "polished",
    "On average over the last {context-years} years, about {context-amount} percent of our workers have been out of a job.",
    ["context-unemployment", "context-years", "context-amount"],
  ],
  [
    "unemployment",
    FEDERAL,
    "plain",
    "About {context-amount} percent of workers have been out of a job, on average, these last {context-years} years.",
    ["context-unemployment", "context-years", "context-amount"],
  ],
  [
    "mortgage",
    FEDERAL,
    "polished",
    "On average over the last {context-years} years, a home loan has cost about {context-amount} percent, and a first home has slipped out of reach for too many.",
    ["context-mortgage", "context-years", "context-amount"],
  ],
  [
    "mortgage",
    FEDERAL,
    "plain",
    "A mortgage has run about {context-amount} percent on average these last {context-years} years, and a lot of young families have given up on buying.",
    ["context-mortgage", "context-years", "context-amount"],
  ],
  [
    "wages",
    FEDERAL,
    "polished",
    "Over the last {context-years} years, pay has grown by about {context-amount} percent a year, and families have measured every raise against the price of living.",
    ["context-wages", "context-years", "context-amount"],
  ],
  [
    "wages",
    FEDERAL,
    "plain",
    "For {context-years} years, paychecks have grown about {context-amount} percent a year, and folks check every raise against what things cost.",
    ["context-wages", "context-years", "context-amount"],
  ],
  [
    "growth",
    FEDERAL,
    "polished",
    "Over the last {context-years} years, our economy has grown by about {context-amount} percent a year.",
    ["context-growth", "context-years", "context-amount"],
  ],
  [
    "growth",
    FEDERAL,
    "plain",
    "For {context-years} years, the economy has grown about {context-amount} percent a year.",
    ["context-growth", "context-years", "context-amount"],
  ],
  [
    "rent",
    ALL,
    "polished",
    "In the {context-years} years since I took this office, rents have kept rising, and too many families spend too much of each month on them.",
    ["context-rent", "context-years", "rent-worse"],
  ],
  [
    "rent",
    ALL,
    "plain",
    "In my {context-years} years on this job, rents have kept going up, and folks are handing over too much of every paycheck.",
    ["context-rent", "context-years", "rent-worse"],
  ],
  [
    "crime",
    ALL,
    "polished",
    "In the {context-years} years since I took this office, crime has risen, and people have felt less safe in their own neighborhoods.",
    ["context-crime", "context-years", "crime-worse"],
  ],
  [
    "crime",
    ALL,
    "plain",
    "In my {context-years} years on this job, crime has gone up, and folks don't feel as safe on their own streets.",
    ["context-crime", "context-years", "crime-worse"],
  ],
  [
    "schools",
    ALL,
    "polished",
    "In the {context-years} years since I took this office, our schools have slipped, and our children have paid for it.",
    ["context-schools", "context-years", "schools-worse"],
  ],
  [
    "schools",
    ALL,
    "plain",
    "In my {context-years} years on this job, our schools have slipped, and the kids are the ones paying for it.",
    ["context-schools", "context-years", "schools-worse"],
  ],
  [
    "health",
    ALL,
    "polished",
    "In the {context-years} years since I took this office, our people's health has worsened, and care has grown harder to reach.",
    ["context-health", "context-years", "health-worse"],
  ],
  [
    "health",
    ALL,
    "plain",
    "In my {context-years} years on this job, folks' health has gotten worse, and a doctor's harder to get to.",
    ["context-health", "context-years", "health-worse"],
  ],
  [
    "roads",
    ALL,
    "polished",
    "In the {context-years} years since I took this office, our roads and bridges have worn down faster than we have mended them.",
    ["context-roads", "context-years", "roads-worse"],
  ],
  [
    "roads",
    ALL,
    "plain",
    "In my {context-years} years on this job, the roads have worn out faster than we've fixed them.",
    ["context-roads", "context-years", "roads-worse"],
  ],
  [
    "environment",
    ALL,
    "polished",
    "In the {context-years} years since I took this office, our air and water have grown dirtier, and our children breathe it.",
    ["context-environment", "context-years", "environment-worse"],
  ],
  [
    "environment",
    ALL,
    "plain",
    "In my {context-years} years on this job, the air and water have gotten dirtier, and our kids are breathing it.",
    ["context-environment", "context-years", "environment-worse"],
  ],
];
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/\{[^}]+\}/g, "")
    .replace(/[^a-z ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join("-");
// 23. A figure that is a level (the jobless rate, a mortgage rate) is said
// as the level people quote, on average over the span, never "for N years"
// as if it grew each year, and never "out of every hundred people looking
// for work" (the words lead, Nov 12).
const LEVELS: Record<string, string> = {
  "Over the last {context-years} years, about {context-amount} percent of those who want work have been unable to find it.":
    "On average over the last {context-years} years, about {context-amount} percent of our workers have been out of a job.",
  "For {context-years} years, about {context-amount} out of every hundred people looking for work haven't been able to find it.":
    "About {context-amount} percent of workers have been out of a job, on average, these last {context-years} years.",
  "That's {context-amount} out of every hundred folks waking up with no job to go to.":
    "That's about {context-amount} in every hundred workers waking up with no job to go to.",
  "For {context-years} years, a home loan has cost about {context-amount} percent a year, and a first home has slipped out of reach for too many.":
    "On average over the last {context-years} years, a home loan has cost about {context-amount} percent, and a first home has slipped out of reach for too many.",
  "For {context-years} years, a mortgage has run about {context-amount} percent, and a lot of young families have given up on buying.":
    "A mortgage has run about {context-amount} percent on average these last {context-years} years, and a lot of young families have given up on buying.",
};
for (const part of bank.parts) {
  const to = LEVELS[part.text];
  if (to) {
    part.text = to;
    count("23. a level figure is said as people say it");
  }
}

const keys = new Set(bank.parts.map((part) => part.key));
const texts = new Set(bank.parts.map((part) => part.text.toLowerCase()));
/** What the context has meant for people, the step between the context and the stand: [topic, subjects, voice, text]. */
const MEANING: [string, string[], string, string][] = [
  [
    "inflation",
    FEDERAL,
    "polished",
    "Over {context-years} years that adds up, and the same groceries, the same rent and the same tank of gas now cost a family far more than they did.",
  ],
  [
    "inflation",
    FEDERAL,
    "plain",
    "Add that up over {context-years} years, and the same cart of groceries costs a whole lot more than it used to.",
  ],
  [
    "unemployment",
    FEDERAL,
    "polished",
    "Behind that figure are {context-amount} of every hundred families who wake up wondering where the next paycheck will come from.",
  ],
  [
    "unemployment",
    FEDERAL,
    "plain",
    "That's about {context-amount} in every hundred workers waking up with no job to go to.",
  ],
  [
    "mortgage",
    FEDERAL,
    "polished",
    "At {context-amount} percent, a family pays thousands more each year for the same house, and many have stopped looking.",
  ],
  [
    "mortgage",
    FEDERAL,
    "plain",
    "At {context-amount} percent, a lot of young couples have quit looking at houses altogether.",
  ],
  [
    "wages",
    FEDERAL,
    "polished",
    "For a working family, each of those raises has had to stretch across {context-years} years of rising bills.",
  ],
  [
    "wages",
    FEDERAL,
    "plain",
    "For working folks, every raise has had to cover {context-years} years of rising bills.",
  ],
  [
    "growth",
    FEDERAL,
    "polished",
    "That growth is real, but over {context-years} years too little of it has reached the kitchen table.",
  ],
  [
    "growth",
    FEDERAL,
    "plain",
    "That's real growth, but over {context-years} years not enough of it has made it to the kitchen table.",
  ],
  [
    "rent",
    ALL,
    "polished",
    "Over {context-years} years, that has meant giving more of every paycheck to the landlord and keeping less for everything else.",
  ],
  [
    "rent",
    ALL,
    "plain",
    "That's {context-years} years of folks handing more of every check to the landlord.",
  ],
  [
    "crime",
    ALL,
    "polished",
    "Over {context-years} years, that has meant parents worrying a little more each time their children walk out the door.",
  ],
  [
    "crime",
    ALL,
    "plain",
    "That's {context-years} years of folks locking up a little tighter at night.",
  ],
  [
    "schools",
    ALL,
    "polished",
    "Over {context-years} years, that has meant classrooms asking less of our children than they deserve.",
  ],
  [
    "schools",
    ALL,
    "plain",
    "That's {context-years} years of kids getting less out of school than they should.",
  ],
  [
    "health",
    ALL,
    "polished",
    "Over {context-years} years, that has meant too many people waiting too long to see a doctor, or going without.",
  ],
  [
    "health",
    ALL,
    "plain",
    "That's {context-years} years of folks putting off the doctor because they couldn't get in.",
  ],
  [
    "roads",
    ALL,
    "polished",
    "Over {context-years} years, every pothole and closed bridge has cost a family time and money.",
  ],
  [
    "roads",
    ALL,
    "plain",
    "That's {context-years} years of potholes, detours and repair bills.",
  ],
  [
    "environment",
    ALL,
    "polished",
    "Over {context-years} years, families have paid for dirtier air and water with their health.",
  ],
  [
    "environment",
    ALL,
    "plain",
    "That's {context-years} years of folks breathing air that's worse than it should be.",
  ],
];
/** Asks that say the speaker's side in so many words, from the question's own side form: [subjects, voice, side, text]. */
const SIDED: [string[], string, "for" | "against", string][] = [
  [
    FEDERAL,
    "polished",
    "for",
    "I am for {about}, and I ask Congress to {side} and send me the bill to sign.",
  ],
  [
    FEDERAL,
    "plain",
    "for",
    "I'm for {about}, so send me a bill to {side}, and I'll sign it.",
  ],
  [
    FEDERAL,
    "polished",
    "against",
    "I am against {about}, and if Congress passes it, I will veto it.",
  ],
  [
    FEDERAL,
    "plain",
    "against",
    "I'm against {about}, and if it gets to my desk, I'll veto it.",
  ],
  [
    ["state-of-the-state"],
    "polished",
    "for",
    "I am for {about}, and I ask the legislature to {side} and send me the bill.",
  ],
  [
    ["state-of-the-state"],
    "plain",
    "for",
    "I'm for {about}, so send me a bill to {side}, and I'll sign it.",
  ],
  [
    ["state-of-the-state"],
    "polished",
    "against",
    "I am against {about}, and if the legislature passes it, I will veto it.",
  ],
  [
    ["state-of-the-state"],
    "plain",
    "against",
    "I'm against {about}, and if it reaches my desk, I'll veto it.",
  ],
  [
    ["town-address"],
    "polished",
    "for",
    "I am for {about}, and I ask {body} to {side} this year.",
  ],
  [
    ["town-address"],
    "plain",
    "for",
    "I'm for {about}, so let's {side} this year.",
  ],
  [
    ["town-address"],
    "polished",
    "against",
    "I am against {about}, and I will ask {body} to vote it down.",
  ],
  [
    ["town-address"],
    "plain",
    "against",
    "I'm against {about}, and I'll ask {body} to vote it down.",
  ],
];
for (const [subjects, voice, side, text] of SIDED) {
  const key = `opening-speech.ask.${voice}-${side}-${subjects[0]}-${slug(text)}`;
  if (keys.has(key) || texts.has(text.toLowerCase())) continue;
  bank.parts.push({
    key,
    move: "ask",
    kind: "spoken",
    text,
    uses: subjects.map((subject) => ({
      move: "ask",
      subject,
      role: "ask",
      choice: "ask",
      requiresFacts: [
        `stance-${side}`,
        "law-not-in-force",
        "about",
        ...(text.includes("{side}") ? ["side"] : []),
      ],
    })),
    voice,
    bearing: "firm",
    piece: { of: "opening-ask", part: "core", required: true },
    origin: "authored",
    author: "Claude (Words builder W-E, speech points)",
    date: "2026-11-12",
  });
  keys.add(key);
  texts.add(text.toLowerCase());
  count("4. an ask that says its side in so many words is added");
}

for (const [topic, subjects, voice, text] of MEANING) {
  const key = `opening-speech.meaning.${voice}-${topic}-${slug(text)}`;
  if (keys.has(key) || texts.has(text.toLowerCase())) continue;
  const needs = [
    `context-${topic}`,
    ...[...text.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]!),
  ];
  bank.parts.push({
    key,
    move: "meaning",
    kind: "spoken",
    text,
    uses: subjects.map((subject) => ({
      move: "meaning",
      subject,
      role: "meaning",
      choice: "meaning",
      requiresFacts: [...new Set(needs)],
    })),
    voice,
    bearing: "calm",
    topic,
    origin: "authored",
    author: "Claude (Words builder W-E, speech points)",
    date: "2026-11-12",
  });
  keysNow.add(key);
  textsNow.add(add.text.toLowerCase());
  count("4. a meaning piece (what the context has meant for people) is added");
}

for (const [topic, subjects, voice, text, needs] of CONTEXT) {
  const key = `opening-speech.context.${voice}-${topic}-${slug(text)}`;
  if (keys.has(key) || texts.has(text.toLowerCase())) continue;
  bank.parts.push({
    key,
    move: "context",
    kind: "spoken",
    text,
    uses: subjects.map((subject) => ({
      move: "context",
      subject,
      role: "context",
      choice: "context",
      requiresFacts: needs,
    })),
    voice,
    bearing: "calm",
    topic,
    origin: "authored",
    author: "Claude (Words builder W-E, speech points)",
    date: "2026-11-12",
  });
  keysNow.add(key);
  textsNow.add(add.text.toLowerCase());
  count("4. a context piece is added");
}

// 9. A point's other parts, by kind (the words lead, Nov 12: "a point is:
// today, then what it has meant for people, then what I believe, then the
// ask"). How it stands today is the question's own sentence (question-names
// `today`); the belief leads into the ask, by the theme and the speaker's
// lean; a law in force is defended or repealed; the close returns to the
// first point's subject.
const ADD: {
  role: string;
  subjects: string[];
  voice: string | string[];
  text: string;
  needs: string[];
  piece?: { of: string; part: string; required?: boolean };
}[] = [];
const BOTH = ["polished", "plain"];
// 16. How a point's question stands today is the question's own sentence
// for the speaker's side (question-names `today`), said bare or after one of
// several openers, so no two context sentences open alike (owner, Nov 8:
// "almost all of them feel the exact same"). `{today-clause}` is the same
// sentence in the case it takes after a comma.
const TODAY: [string | string[], string][] = [
  [BOTH, "{today}"],
  ["polished", "As things stand, {today-clause}"],
  ["plain", "For now, {today-clause}"],
  ["polished", "Today, {today-clause}"],
  ["plain", "In fact, {today-clause}"],
  ["polished", "As matters stand, {today-clause}"],
  ["plain", "These days, {today-clause}"],
  ["polished", "As we meet tonight, {today-clause}"],
  ["polished", "At this moment, {today-clause}"],
  ["polished", "As we stand here, {today-clause}"],
  ["plain", "As of today, {today-clause}"],
  ["plain", "As of right now, {today-clause}"],
  ["plain", "As it is now, {today-clause}"],
];
// Each opener is said with any of a question's wordings (`{today}`, and
// `{today-second}`, `{today-third}` where question-names holds more), so the
// composer's own pick spreads them.
for (const [voice, text] of TODAY)
  for (const n of ["", "-second", "-third"]) {
    const slot = text.includes("{today}") ? "today" : "today-clause";
    ADD.push({
      role: "today",
      subjects: ALL,
      voice,
      text: text.replace(`{${slot}}`, `{${slot}${n}}`),
      needs: [`${slot}${n}`],
    });
  }
// 17. What the speaker believes is typed by the question's family and the
// pole of it the speaker stands on (scripts/words/speech-beliefs.tsv), never
// by the theme and a left or right lean ("Because I've always thought folks
// should keep more of what they earn, a bill for a higher federal minimum
// wage gets a veto" said nothing about wages). The belief is a clause
// (`belief-words`) the planner words first; the frames below say it in each
// shape of a point: leading into what the speaker will do ("Because I
// believe {belief}, I'll veto ..."), standing first as its own sentence, or
// after the ask as the reason for it.
const BELIEF_ROWS = readFileSync("scripts/words/speech-beliefs.tsv", "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => line.split("\t") as [string, string, string, string]);
for (const [family, pole, voice, clause] of BELIEF_ROWS)
  ADD.push({
    role: "belief-words",
    subjects: ALL,
    voice: voice === "both" ? BOTH : voice,
    text: clause,
    needs: [`family-${family}`, `pole-${pole}`],
    // Said only inside a frame that names it as {belief}.
    piece: { of: "opening-belief", part: "reason" },
  });
const BELIEF_FRAMES: [string, string, string, string][] = [
  ["ask", "both", "Because I believe {belief},", "belief-leads"],
  ["ask", "plain", "Because I've always thought {belief},", "belief-leads"],
  ["ask", "polished", "Because I hold that {belief},", "belief-leads"],
  ["belief", "polished", "I believe {belief}.", "belief-stands"],
  ["belief", "polished", "I have always believed {belief}.", "belief-stands"],
  ["belief", "plain", "What I believe is that {belief}.", "belief-stands"],
  ["belief", "plain", "I've always thought {belief}.", "belief-stands"],
  ["why", "polished", "I say so because I believe {belief}.", "belief-after"],
  ["why", "polished", "That is because I believe {belief}.", "belief-after"],
  ["why", "plain", "Why? Because I believe {belief}.", "belief-after"],
  ["why", "plain", "I'll tell you why. I believe {belief}.", "belief-after"],
];
for (const [role, voice, text, shape] of BELIEF_FRAMES)
  ADD.push({
    role,
    subjects: ALL,
    voice: voice === "both" ? BOTH : voice,
    text,
    needs: ["belief", shape],
    piece:
      role === "ask"
        ? { of: "opening-ask", part: "opener" }
        : { of: "opening-belief", part: "core", required: true },
  });
// 18. A point may open on a question to the audience, answered by how things
// stand and the ask.
const QUESTIONS: [string, string, string, string][] = [
  [
    "polished",
    "for",
    "law-not-in-force",
    "Should we go on like this, when {today-question}?",
  ],
  ["plain", "for", "law-not-in-force", "Is it fair that {today-question}?"],
  [
    "polished",
    "against",
    "law-not-in-force",
    "Why would we change course, when {today-question}?",
  ],
  [
    "plain",
    "against",
    "law-not-in-force",
    "Why fix what works, when {today-question}?",
  ],
  [
    "polished",
    "for",
    "law-in-force",
    "Who would want to turn back, when {today-question}?",
  ],
  [
    "plain",
    "for",
    "law-in-force",
    "Why would we go back, when {today-question}?",
  ],
  [
    "polished",
    "against",
    "law-in-force",
    "Should we accept that {today-question}?",
  ],
  [
    "plain",
    "against",
    "law-in-force",
    "Does it make sense that {today-question}?",
  ],
];
// The question carries how things stand, as the speaker's side tells it,
// and names no question, so the ask after it names the question once.
for (const [voice, side, law, text] of QUESTIONS)
  for (const n of ["", "-second", "-third"])
    ADD.push({
      role: "question",
      subjects: ALL,
      voice,
      text: text.replace("{today-question}", `{today-question${n}}`),
      needs: [`today-question${n}`, `stance-${side}`, law, "asks-question"],
    });
// 19. A figure joins a point only when the question's own row says the
// measure bears on it and helps the speaker's side (question-names
// `figures`); this sentence ties the figure to the question, by side, by
// the state of the law and by the name's number.
const TIES: [string, string, string, string][] = [
  [
    "polished",
    "for",
    "law-not-in-force",
    "We cannot go another {context-years} years like that.",
  ],
  [
    "polished",
    "for",
    "law-not-in-force",
    "Another {context-years} years of that would be a failure of this government.",
  ],
  [
    "polished",
    "for",
    "law-not-in-force",
    "We were not sent here to watch that go on for {context-years} more years.",
  ],
  [
    "polished",
    "for",
    "law-not-in-force",
    "After {context-years} years of that, waiting is no longer an answer.",
  ],
  [
    "polished",
    "for",
    "law-not-in-force",
    "{context-years} years of that is long enough.",
  ],
  [
    "polished",
    "for",
    "law-not-in-force",
    "No one should have to live through {context-years} more years of that.",
  ],
  [
    "plain",
    "for",
    "law-not-in-force",
    "We can't keep that up for another {context-years} years.",
  ],
  [
    "plain",
    "for",
    "law-not-in-force",
    "{context-years} years of that is plenty.",
  ],
  [
    "plain",
    "for",
    "law-not-in-force",
    "Nobody signed up for {context-years} more years of that.",
  ],
  [
    "plain",
    "for",
    "law-not-in-force",
    "After {context-years} years of that, folks are done waiting.",
  ],
  [
    "plain",
    "for",
    "law-not-in-force",
    "We've had {context-years} years of that, and that's enough.",
  ],
  [
    "plain",
    "for",
    "law-not-in-force",
    "Folks shouldn't sit through {context-years} more years of that.",
  ],
  [
    "polished",
    "for",
    "law-in-force",
    "After {context-years} years of that, this is no time to lose ground.",
  ],
  [
    "polished",
    "for",
    "law-in-force",
    "After {context-years} years like these, we should not give back what we have won.",
  ],
  [
    "polished",
    "for",
    "law-in-force",
    "{context-years} years of that is a reason to hold firm.",
  ],
  [
    "polished",
    "for",
    "law-in-force",
    "After {context-years} years of that, retreat would be a mistake.",
  ],
  [
    "polished",
    "for",
    "law-in-force",
    "Having come through {context-years} years of that, we should keep what works.",
  ],
  [
    "polished",
    "for",
    "law-in-force",
    "After {context-years} years of that, we should not undo our own progress.",
  ],
  [
    "plain",
    "for",
    "law-in-force",
    "After {context-years} years of that, we can't afford to go backward.",
  ],
  [
    "plain",
    "for",
    "law-in-force",
    "After {context-years} years of that, this is no time to give up ground.",
  ],
  [
    "plain",
    "for",
    "law-in-force",
    "{context-years} years of that tells me we hold the line.",
  ],
  [
    "plain",
    "for",
    "law-in-force",
    "We've had {context-years} years of that, so we keep what's working.",
  ],
  [
    "plain",
    "for",
    "law-in-force",
    "After {context-years} years like that, going backward makes no sense.",
  ],
  [
    "plain",
    "for",
    "law-in-force",
    "{context-years} years of that is no time to start over.",
  ],
  [
    "polished",
    "against",
    "law-not-in-force",
    "After {context-years} years of that, families do not need one more cost.",
  ],
  [
    "polished",
    "against",
    "law-not-in-force",
    "After {context-years} years of that, the last thing families need is a new burden.",
  ],
  [
    "polished",
    "against",
    "law-not-in-force",
    "{context-years} years of that have asked enough of working people.",
  ],
  [
    "polished",
    "against",
    "law-not-in-force",
    "After {context-years} years of that, this is the wrong time for another mandate.",
  ],
  [
    "polished",
    "against",
    "law-not-in-force",
    "Families who have carried {context-years} years of that deserve relief, not a new bill.",
  ],
  [
    "polished",
    "against",
    "law-not-in-force",
    "After {context-years} years of that, no one should add to the load.",
  ],
  [
    "plain",
    "against",
    "law-not-in-force",
    "After {context-years} years of that, folks don't need one more thing to pay for.",
  ],
  [
    "plain",
    "against",
    "law-not-in-force",
    "After {context-years} years of that, nobody needs another bill to pay.",
  ],
  [
    "plain",
    "against",
    "law-not-in-force",
    "{context-years} years of that is enough on folks' plates already.",
  ],
  [
    "plain",
    "against",
    "law-not-in-force",
    "After {context-years} years of that, piling more on makes no sense.",
  ],
  [
    "plain",
    "against",
    "law-not-in-force",
    "Folks who've lived through {context-years} years of that need a break, not a new cost.",
  ],
  [
    "plain",
    "against",
    "law-not-in-force",
    "After {context-years} years of that, let's not make it harder.",
  ],
  [
    "polished",
    "against",
    "law-in-force",
    "After {context-years} years of that, it is time for a change.",
  ],
  [
    "polished",
    "against",
    "law-in-force",
    "{context-years} years of that is reason enough to change course.",
  ],
  [
    "polished",
    "against",
    "law-in-force",
    "After {context-years} years of that, the old way has had its chance.",
  ],
  [
    "polished",
    "against",
    "law-in-force",
    "{context-years} years of that should teach us something.",
  ],
  [
    "polished",
    "against",
    "law-in-force",
    "After {context-years} years of that, we owe people a different answer.",
  ],
  [
    "polished",
    "against",
    "law-in-force",
    "The record of {context-years} years of that speaks for itself.",
  ],
  [
    "plain",
    "against",
    "law-in-force",
    "After {context-years} years of that, it's time we tried something else.",
  ],
  [
    "plain",
    "against",
    "law-in-force",
    "{context-years} years of that is long enough to know it isn't working.",
  ],
  [
    "plain",
    "against",
    "law-in-force",
    "After {context-years} years of that, folks deserve a new approach.",
  ],
  [
    "plain",
    "against",
    "law-in-force",
    "We gave it {context-years} years, and that's what we got.",
  ],
  [
    "plain",
    "against",
    "law-in-force",
    "{context-years} years of that says it's time to switch.",
  ],
  [
    "plain",
    "against",
    "law-in-force",
    "After {context-years} years of that, I'd say we've seen enough.",
  ],
];
// The tie joins the figure to the speaker's side and leads into the ask
// that names the question, so the question is named once in the point and
// no pronoun stands far from its noun (the words lead, Nov 12).
for (const [voice, side, law, text] of TIES)
  ADD.push({
    role: "tie",
    subjects: ALL,
    voice,
    text,
    needs: [`stance-${side}`, law, "figure-ties", "context-years"],
  });
// 20. A law in force is defended or repealed by what the speaker will do,
// and named as the thing itself (`{law-name}`: "keep the law restricting
// abortion on the books", never "keep restricting abortion on the books"),
// never stated as a fact a belief could lead into ("Because I think ..., a
// price on carbon is the law here"). `{it}` agrees with the name's number.
const LAWS: [string[], string, string, string][] = [
  [
    FEDERAL,
    "polished",
    "for",
    "I will stand by {law-name}, and I will veto any bill that would undo {it}.",
  ],
  [
    FEDERAL,
    "plain",
    "for",
    "I'll keep {law-name} on the books, and I'll fight anybody who tries to undo {it}.",
  ],
  [
    FEDERAL,
    "polished",
    "against",
    "I will sign a repeal of {law-name} the day Congress sends it to me.",
  ],
  [
    FEDERAL,
    "plain",
    "against",
    "I'll sign a repeal of {law-name} the day Congress sends it.",
  ],
  [
    ["state-of-the-state"],
    "polished",
    "for",
    "I will keep {law-name} on the books, and I will veto any bill that would undo {it}.",
  ],
  [
    ["state-of-the-state"],
    "plain",
    "for",
    "I'll stand by {law-name}, and I'll veto any bill that tries to undo {it}.",
  ],
  [
    ["state-of-the-state"],
    "polished",
    "against",
    "I will sign a repeal of {law-name} when the legislature sends it.",
  ],
  [
    ["state-of-the-state"],
    "plain",
    "against",
    "I'll sign a repeal of {law-name} the day the legislature sends it.",
  ],
  [
    ["town-address"],
    "polished",
    "for",
    "I will defend {law-name} before {body}.",
  ],
  [
    ["town-address"],
    "plain",
    "for",
    "I'm going to keep {law-name} just the way {it-is}.",
  ],
  [
    ["town-address"],
    "polished",
    "against",
    "I will ask {body} to end {law-name}.",
  ],
  [["town-address"], "plain", "against", "I'll ask {body} to end {law-name}."],
  // More ways to say each, so no frame is said twice in one speech (the
  // words lead, Nov 12: "I will keep X on the books, and I will veto any
  // bill that would undo it" three times in two speeches).
  [
    FEDERAL,
    "polished",
    "for",
    "I will keep {law-name}, and any bill to undo {it} will meet my veto.",
  ],
  [
    FEDERAL,
    "polished",
    "for",
    "I will defend {law-name} for as long as I hold this office.",
  ],
  [FEDERAL, "plain", "for", "I'm keeping {law-name} as long as I'm here."],
  [
    FEDERAL,
    "plain",
    "for",
    "Anybody who wants to undo {law-name} will have to get past my veto.",
  ],
  [
    FEDERAL,
    "polished",
    "against",
    "I ask Congress to repeal {law-name}, and I will sign the repeal.",
  ],
  [
    FEDERAL,
    "polished",
    "against",
    "It is time to undo {law-name}, and I will work with Congress to do it.",
  ],
  [
    FEDERAL,
    "plain",
    "against",
    "I want {law-name} gone, and I'll sign the bill that does it.",
  ],
  [
    FEDERAL,
    "plain",
    "against",
    "Send me a repeal of {law-name}, and it's signed.",
  ],
  [
    ["state-of-the-state"],
    "polished",
    "for",
    "I will keep {law-name}, and any bill in this legislature to undo {it} will meet my veto.",
  ],
  [
    ["state-of-the-state"],
    "polished",
    "for",
    "I will defend {law-name} as long as I am governor.",
  ],
  [
    ["state-of-the-state"],
    "plain",
    "for",
    "I'm keeping {law-name} as long as I'm governor.",
  ],
  [
    ["state-of-the-state"],
    "plain",
    "for",
    "Anybody in this building who wants to undo {law-name} will have to get past my veto.",
  ],
  [
    ["state-of-the-state"],
    "polished",
    "against",
    "I ask the legislature to repeal {law-name}, and I will sign the repeal.",
  ],
  [
    ["state-of-the-state"],
    "polished",
    "against",
    "It is time to undo {law-name}, and I will work with the legislature to do it.",
  ],
  [
    ["state-of-the-state"],
    "plain",
    "against",
    "I want {law-name} gone, and I'll sign the legislature's bill that does it.",
  ],
  [
    ["state-of-the-state"],
    "plain",
    "against",
    "Send me a repeal of {law-name}, legislators, and I'll sign it.",
  ],
  [
    ["town-address"],
    "polished",
    "for",
    "I will defend {law-name} as long as I am {office-title}.",
  ],
  [
    ["town-address"],
    "plain",
    "for",
    "I'm keeping {law-name} as long as I'm {office-title}.",
  ],
  [
    ["town-address"],
    "polished",
    "against",
    "I will ask {body} to repeal {law-name}.",
  ],
  [
    ["town-address"],
    "plain",
    "against",
    "I want {law-name} gone, and I'll ask {body} to end {it}.",
  ],
];
for (const [subjects, voice, side, text] of LAWS)
  for (const number of text.includes("{it") ? ["one", "many"] : [null])
    ADD.push({
      role: "ask",
      subjects,
      voice,
      text: text
        .replace("{it}", number === "many" ? "them" : "it")
        .replace("{it-is}", number === "many" ? "they are" : "it is"),
      needs: [
        `stance-${side}`,
        "law-in-force",
        "about",
        ...(number ? [`about-${number}`] : []),
      ],
      piece: { of: "opening-ask", part: "core", required: true },
    });
const CLOSES: [string[], string, string][] = [
  [
    FEDERAL,
    "polished",
    "Let us {first-side}, and let history judge us by it. Thank you, and may God keep this country.",
  ],
  [
    FEDERAL,
    "polished",
    "If we {first-side}, we will have done right by this country. I thank you, and God bless.",
  ],
  [
    FEDERAL,
    "polished",
    "Let us {first-side}, and begin tomorrow. Thank you, my fellow Americans.",
  ],
  [
    FEDERAL,
    "polished",
    "If we {first-side}, this will be a better nation for our children. Good night, and God bless you.",
  ],
  [
    FEDERAL,
    "plain",
    "Let's {first-side}, and let's get going. Thanks for listening, and God bless.",
  ],
  [
    FEDERAL,
    "plain",
    "We can {first-side}, and folks will see the difference. Take care, and God bless America.",
  ],
  [
    FEDERAL,
    "plain",
    "So let's {first-side}, starting tomorrow. Good night, everybody.",
  ],
  [
    FEDERAL,
    "plain",
    "Let's {first-side}, and do it right. God bless you, and thank you.",
  ],
  [
    FEDERAL,
    "polished",
    "Let us {first-side}, and do it together. Thank you, and good night.",
  ],
  [
    FEDERAL,
    "polished",
    "If we {first-side}, we will keep faith with those who come after us. God bless you all.",
  ],
  [
    FEDERAL,
    "polished",
    "If we {first-side}, the generations after us will thank us for it. May God bless you, and may God bless the United States of America.",
  ],
  [
    FEDERAL,
    "plain",
    "We can {first-side}, and we'll all be better off. Thanks, everybody, and God bless.",
  ],
  [
    FEDERAL,
    "plain",
    "So let's {first-side} and get folks the better deal they've earned. Thank you all.",
  ],
  [
    FEDERAL,
    "polished",
    "If we {first-side}, this country will be the stronger for it. Thank you, and God bless America.",
  ],
  [
    FEDERAL,
    "polished",
    "Let us {first-side}, and leave our children a better country for it. Thank you, and God bless you.",
  ],
  [
    FEDERAL,
    "plain",
    "Let's {first-side}, and this country's better off for it. Thank you, and God bless.",
  ],
  // Each close says its own sign-off, so ten Presidents' closes do not say
  // one sign-off in three addresses (opening-address-versions, seed
  // 1eafe3be0f057547: two sign-offs in 3 of 10).
  [
    FEDERAL,
    "polished",
    "Let us {first-side}, and give our children reason to be proud of us. Thank you, and may God watch over this land.",
  ],
  [
    FEDERAL,
    "polished",
    "If we {first-side}, we will have kept our promise to the people who sent us. Thank you, and may God bless our country.",
  ],
  [
    FEDERAL,
    "polished",
    "Let us {first-side}, and let us start in the morning. I am grateful to you all, and God bless America.",
  ],
  [
    FEDERAL,
    "polished",
    "If we {first-side}, the years ahead will be kind to us. Thank you, and God bless every one of you.",
  ],
  [
    FEDERAL,
    "polished",
    "Let us {first-side}, and do the people's business well. Thank you, and may God guide us.",
  ],
  [
    FEDERAL,
    "polished",
    "If we {first-side}, we will have earned the trust placed in us. Thank you, and God bless this nation.",
  ],
  [
    FEDERAL,
    "polished",
    "Let us {first-side}, with courage and with care. Thank you, and may God keep you.",
  ],
  [
    FEDERAL,
    "polished",
    "If we {first-side}, history will remember that we did not flinch. Thank you, and God bless our republic.",
  ],
  [
    FEDERAL,
    "polished",
    "Let us {first-side}, and keep the faith we were given. Good night, and may God bless America.",
  ],
  [
    FEDERAL,
    "polished",
    "If we {first-side}, we will hand on a stronger country than we found. With gratitude, I thank you all.",
  ],
  [
    FEDERAL,
    "plain",
    "Let's {first-side}, and let's not wait around. Thanks, folks, and God bless America.",
  ],
  [
    FEDERAL,
    "plain",
    "We can {first-side}, and we'll be glad we did. Thank you, and God bless all of you.",
  ],
  [
    FEDERAL,
    "plain",
    "Let's {first-side} and get it done. Thanks a lot, everybody.",
  ],
  [
    FEDERAL,
    "plain",
    "So let's {first-side}, and show folks we listened. Thank you, and take care of each other.",
  ],
  [
    FEDERAL,
    "plain",
    "Let's {first-side}, together. Good night, and God bless this country.",
  ],
  [
    FEDERAL,
    "plain",
    "We can {first-side}, and the kids will thank us. Thanks for having me, and God bless.",
  ],
  [
    FEDERAL,
    "plain",
    "Let's {first-side}, and let's start tomorrow morning. Thanks again, everybody.",
  ],
  [
    FEDERAL,
    "plain",
    "So let's {first-side}, because folks are counting on us. Thank you, and good luck to all of us.",
  ],
  [
    FEDERAL,
    "plain",
    "Let's {first-side} and keep our word. Thanks, everybody, and God bless the USA.",
  ],
  [
    FEDERAL,
    "plain",
    "We can {first-side}, and we will. Thank you, and God keep you.",
  ],
];
// 21. A governor's or a mayor's close names the place and returns to the
// theme, and no two places close alike (the words lead, Nov 12: every close
// was "If we ..., this state will be the stronger for it"). Real State of
// the State closings name the state (Polis 2024; Whitmer 2024).
const LOCAL_CLOSES: [string, string][] = [
  [
    "polished",
    "If we {first-side}, {realm-name} will be the better for it. Thank you, and good night.",
  ],
  [
    "polished",
    "So I ask you to {first-side}, and to keep faith with {realm-name} on {theme-name}. Thank you.",
  ],
  [
    "polished",
    "Let us {first-side}, and let {realm-name} remember that we did. Thank you.",
  ],
  [
    "polished",
    "On {theme-name}, {realm-name} has waited long enough. Let us {first-side}. Thank you.",
  ],
  [
    "plain",
    "Let's {first-side}, and let's do right by {realm-name}. Thanks, everybody.",
  ],
  [
    "plain",
    "So let's {first-side}. {realm-name} is counting on us. Thank you.",
  ],
  ["plain", "Let's {first-side} and show {realm-name} we meant it. Thank you."],
  [
    "plain",
    "When it comes to {theme-name}, let's {first-side}. Thanks, everybody, and good night.",
  ],
];
for (const [voice, text] of LOCAL_CLOSES)
  ADD.push({
    role: "close",
    subjects: ["state-of-the-state", "town-address"],
    voice,
    text,
    needs: ["first-side", "realm-name"],
  });
// 22. A governor's or a mayor's opening names the place and says the theme
// (the words lead, Nov 12: "This state" eight times in three speeches and
// the state's name never; real State of the State addresses open on the
// state by name). Said in the occasion, after the greeting.
const LOCAL_OPENINGS: [string, string][] = [
  [
    "polished",
    "Tonight I want to talk with the people of {realm-name} about {theme-name}.",
  ],
  [
    "polished",
    "There is one matter I want {realm-name} to hear about tonight, and it is {theme-name}.",
  ],
  [
    "polished",
    "I have come to speak to {realm-name} about {theme-name}, because it bears on every family here.",
  ],
  ["plain", "I want to talk to you tonight, {realm-name}, about {theme-name}."],
  [
    "plain",
    "Folks in {realm-name}, I've got one thing on my mind tonight, and it's {theme-name}.",
  ],
  [
    "plain",
    "Tonight I'm here to talk about {theme-name}, because it matters to every family in {realm-name}.",
  ],
];
for (const [voice, text] of LOCAL_OPENINGS)
  ADD.push({
    role: "occasion",
    subjects: ["state-of-the-state", "town-address"],
    voice,
    text,
    needs: ["realm-name", "theme-name"],
  });
for (const [subjects, voice, text] of CLOSES)
  ADD.push({ role: "close", subjects, voice, text, needs: ["first-side"] });
const GREETINGS: [string, string][] = [
  [
    "polished",
    "Distinguished guests, members of Congress, and all my fellow Americans.",
  ],
  ["polished", "Friends, guests, and fellow citizens of this republic."],
  ["polished", "Mr. Chief Justice, honored guests, my fellow Americans."],
  [
    "polished",
    "Members of Congress, guests of this nation, and fellow citizens.",
  ],
  ["polished", "Fellow citizens, here and in every corner of this land."],
  ["polished", "To all who are gathered here, and to my fellow Americans."],
  ["plain", "Folks here today, and folks back home."],
  ["plain", "Everybody on this lawn, and everybody watching."],
  ["plain", "My friends, and my fellow Americans."],
  ["plain", "Neighbors from every state, and everybody here."],
  ["polished", "Honored guests, and my fellow Americans."],
  ["polished", "Members of Congress, and citizens of this country."],
  ["plain", "Folks here, and folks all across the country."],
  ["plain", "Everybody in this hall, and everybody listening."],
  ["plain", "Good people of this country, here and at home."],
  ["plain", "Folks in this hall, and folks watching at home."],
  [
    "polished",
    "Members of Congress, honored guests, and fellow citizens across this land.",
  ],
  ["polished", "Distinguished guests, and my fellow citizens."],
  ["plain", "Friends and neighbors, here and at home."],
  ["plain", "Everybody here, and everybody back home."],
  [
    "polished",
    "Members of Congress, distinguished guests, my fellow citizens.",
  ],
];
for (const [voice, text] of GREETINGS)
  ADD.push({
    role: "salutation",
    subjects: ["inaugural"],
    voice,
    text,
    needs: [],
    piece: { of: "opening-salutation", part: "opener" },
  });
// 16. A greeting that names the Vice President says them as the record has
// them ("Vice President Ann Lee", the shared said-as reader's addressed
// form), never by a title that guesses their sex ("Mr. Vice President"; the
// words lead, Nov 12), and it is said only where the world seats one. Real
// inaugurals open by naming who is there, so each world's greeting is its own.
const VP_GREETINGS: [string, string][] = [
  [
    "polished",
    "{vice-president-addressed}, members of Congress, my fellow citizens.",
  ],
  [
    "polished",
    "{vice-president-addressed}, distinguished guests, and my fellow Americans.",
  ],
  ["polished", "{vice-president-addressed}, honored guests, fellow citizens."],
  ["plain", "{vice-president-addressed}, folks here, and folks back home."],
  ["plain", "{vice-president-addressed}, and everybody watching at home."],
];
for (const [voice, text] of VP_GREETINGS)
  ADD.push({
    role: "salutation",
    subjects: ["inaugural"],
    voice,
    text,
    needs: ["vice-president"],
    piece: { of: "opening-salutation", part: "opener" },
  });
// 15. A piece of these kinds written by this script whose words are no
// longer in the lists above gives way to its rewording: closes, the today
// openers, belief frames and clauses (a W-C belief by theme and lean among
// them), ties, questions and the law-in-force asks.
const current = new Set(ADD.map((add) => add.text));
const SCRIPT_AUTHORS = [
  "Claude (Words builder W-C, speech outline)",
  "Claude (Words builder W-E, speech points)",
];
const SCRIPT_ROLES = [
  "close",
  "today",
  "belief-words",
  "belief",
  "why",
  "question",
  "tie",
];
// 23. A hope that points at nothing ("I hope you can see it from here", the
// words lead, Nov 12) names the place instead.
for (const part of bank.parts) {
  const text = {
    "The best of this state is still ahead of it, and I hope you can see it from here.":
      "The best of {realm-name} is still ahead of us, and I mean to prove it.",
    "The best of this state is still ahead of us, and I hope you can see it too.":
      "The best of {realm-name} is still ahead of us, and I'm going to prove it.",
    // The same hope in a local address (words builder, Nov 12).
    "The best is still ahead of us, and I hope you can see it from here.":
      "The best of {realm-name} is still ahead of us, and I mean to prove it.",
    "The best is still ahead of us, and I hope you can see it too.":
      "The best of {realm-name} is still ahead of us, and I'm going to prove it.",
  }[part.text];
  if (!text) continue;
  part.text = text;
  for (const use of part.uses)
    use.requiresFacts = [
      ...new Set([...(use.requiresFacts ?? []), "realm-name"]),
    ];
  count("23. a hope names the place");
}
// 16. A greeting of this script's whose words are no longer in its lists
// gives way to its rewording.
bank.parts = bank.parts.filter((part) => {
  if (
    part.author !== "Claude (Words builder W-E, speech points)" ||
    !hasRole(part, "salutation") ||
    part.piece?.part !== "opener" ||
    current.has(part.text)
  )
    return true;
  count("16. a greeting of this script's gives way to its rewording");
  return false;
});
bank.parts = bank.parts.filter((part) => {
  const mine =
    SCRIPT_AUTHORS.includes(part.author as string) &&
    (SCRIPT_ROLES.some((role) => hasRole(part, role)) ||
      part.uses.some((use) =>
        use.requiresFacts?.some(
          (key) =>
            key.startsWith("theme-") ||
            key === "belief" ||
            key === "law-in-force",
        ),
      ));
  if (!mine || current.has(part.text)) return true;
  count("15. a piece of this script's gives way to its rewording");
  return false;
});
const keysNow = new Set(bank.parts.map((part) => part.key));
const textsNow = new Set(bank.parts.map((part) => part.text.toLowerCase()));
for (const add of ADD) {
  // A wording's number is kept in the key, which slug drops; the slot says
  // it in words (`today-second`), the key as it always has (`-2`).
  const wording = ({ second: "2", third: "3" } as Record<string, string>)[
    add.needs.join(" ").match(/-(second|third)\b/)?.[1] ?? ""
  ];
  const key = `opening-speech.${add.role}.${Array.isArray(add.voice) ? "both" : add.voice}-${add.subjects[0]}-${slug(add.text)}-${slug(add.needs.join(" "))}${wording ? `-${wording}` : ""}`;
  if (keysNow.has(key) || textsNow.has(add.text.toLowerCase())) {
    const found = bank.parts.find(
      (part) => part.text.toLowerCase() === add.text.toLowerCase(),
    );
    // A question said in fewer kinds of address than it was is said only in
    // those; a town's question is said in a floor or campaign speech too
    // (rule 29).
    const realm = add.subjects.includes("town-address")
      ? [...add.subjects, "floor-speech", "campaign-speech"]
      : add.subjects;
    if (
      found &&
      add.role === "question" &&
      found.uses.length !== realm.length
    ) {
      found.uses = realm.map((subject) => ({
        move: add.role,
        subject,
        role: add.role,
        choice: add.role,
        requiresFacts: add.needs,
      }));
      count("17. a question is said only in the kinds of address of its realm");
    }
    if (
      found &&
      add.piece &&
      JSON.stringify(found.piece) !== JSON.stringify(add.piece)
    ) {
      found.piece = add.piece;
      count(`9. a ${add.role} piece says which sentence it is part of`);
    }
    continue;
  }
  bank.parts.push({
    key,
    move: add.role,
    kind: "spoken",
    text: add.text,
    uses: add.subjects.map((subject) => ({
      move: add.role,
      subject,
      role: add.role,
      choice: add.role,
      requiresFacts: add.needs,
    })),
    voice: add.voice,
    bearing: "firm",
    ...(add.piece ? { piece: add.piece } : {}),
    origin: "authored",
    author: "Claude (Words builder W-E, speech points)",
    date: "2026-11-12",
  });
  keysNow.add(key);
  textsNow.add(add.text.toLowerCase());
  count(
    `9. a ${add.role === "ask" && add.piece?.part === "opener" ? "belief" : add.role} piece is added`,
  );
}

// 21. Grammatical number (owner's notes via the words lead, Nov 12:
// "limits on pumping groundwater is the law", "stand-your-ground rules ...
// passes it"): an ask whose verb or pronoun agrees with {about} is said only
// for a name that is one thing (`about-one`), and a twin with the plural
// verb and pronoun is said for a name that is several (`about-many`). A
// piece whose pronoun is a bill's ("a bill for {about} ... veto it") agrees
// with the bill and is left as it is.
const AGREES =
  /\{about\}(?:\s(?:is|isn't|does|comes|has)\b|[^.]*\b(?:passes it|veto it|vote it down|stop it|sends it to me|it gets|it reaches|undo it|end it|defend it|keep it))/;
const BILL = /\b(?:bill|measure|legislation|one lands)\b/;
const plural = (text: string) =>
  text
    .replace(/\{about\} is\b/, "{about} are")
    .replace(/\{about\} isn't\b/, "{about} aren't")
    .replace(/\{about\} does\b/, "{about} do")
    .replace(/\{about\} comes\b/, "{about} come")
    .replace(/\{about\} has\b/, "{about} have")
    .replace(/\bit gets\b/, "they get")
    .replace(/\bit reaches\b/, "they reach")
    .replace(/\bit\b(?!')/g, "them");
for (const part of [...bank.parts]) {
  if (!hasRole(part, "ask") || !AGREES.test(part.text) || BILL.test(part.text))
    continue;
  if (
    part.uses.some((use) =>
      use.requiresFacts?.some((key) => key.startsWith("about-")),
    )
  )
    continue;
  for (const use of part.uses)
    use.requiresFacts = [...(use.requiresFacts ?? []), "about-one"];
  const text = plural(part.text);
  bank.parts.push({
    ...part,
    key: `${part.key}-many`,
    text,
    uses: part.uses.map((use) => ({
      ...use,
      requiresFacts: [
        ...(use.requiresFacts ?? []).filter((key) => key !== "about-one"),
        "about-many",
      ],
    })),
  });
  count(
    "21. an ask that agrees with its question's name is said in each number",
  );
}

// 24. A greeting is never one bare word ("Folks."): it names who is
// addressed, by title or by who they are.
bank.parts = bank.parts.filter((part) => {
  if (
    hasRole(part, "salutation") &&
    part.piece?.part !== "core" &&
    !GRADED_GOOD.has(part.key) &&
    /^\w+\.$/.test(part.text.trim())
  ) {
    count("24. a one-word greeting is dropped");
    return false;
  }
  return true;
});

// 25. An ask that a belief may lead into is one clause after the belief's
// comma: a core that runs a second clause after a semicolon ("I will not
// sign legislation for {about}; should such a bill reach my desk, I will
// veto it.") reads as a splice behind "Because I believe ...,". The second
// clause folds into the first.
const ONE_CLAUSE: Record<string, string> = {
  "I will not sign legislation for {about}; should such a bill reach my desk, I will veto it.":
    "I will veto any bill for {about} that reaches my desk.",
  "the Congress can {to} with a single vote in each chamber; I ask that it take that vote.":
    "I ask the Congress to take the single vote in each chamber that would {to}.",
};
for (const part of bank.parts) {
  const to = ONE_CLAUSE[part.text];
  if (to && hasRole(part, "ask")) {
    part.text = to;
    count("25. an ask that ran two clauses is said as one");
  }
}
// 26. More sign-offs and greetings for the President, so a fixed formula
// is not the same sentence in most addresses (opening-address-versions):
// the closes below and greetings that list who is addressed.
// 27. A plural twin's subject pronoun is "they", with a plural verb
// ("if limits on power plant carbon come to my desk, they go back
// unsigned", never "them goes").
const THEY: Record<string, string> = {
  goes: "go",
  comes: "come",
  is: "are",
  has: "have",
  does: "do",
  gets: "get",
  reaches: "reach",
};
for (const part of bank.parts) {
  if (!part.key.endsWith("-many")) continue;
  const text = part.text.replace(
    /\bthem (goes|comes|is|has|does|gets|reaches)\b/g,
    (_, verb: string) => `they ${THEY[verb]}`,
  );
  if (text !== part.text) {
    part.text = text;
    count("27. a plural twin's subject pronoun is they");
  }
}

// 22. Removed by kind (owner's notes, Nov 12): the occasion's "what I learned
// in my last office" says no belief ("We're not talking about any ideas that
// this person believes in"); a greeting that is not a list of who is
// addressed, ending its own sentence ("Everybody here, and everybody
// watching, before anything else.", "Thank you all for coming.") is not a
// greeting.
for (const part of bank.parts) {
  if (!hasRole(part, "salutation") || part.piece?.part === "core") continue;
  // The list ends its own sentence where a clause or an aside began.
  const cut = part.text.replace(
    /,\s+(?:before anything else|thank you|those who)\b.*$/is,
    ".",
  );
  if (cut !== part.text) {
    part.text = cut;
    count("22. a greeting is cut to its list of who is addressed");
  }
}
bank.parts = bank.parts.filter((part) => {
  if (
    hasRole(part, "occasion") &&
    part.text.includes("{prior-office}") &&
    /\blearned\b/.test(part.text)
  ) {
    count(
      "22. an occasion's lesson from the last office that states no belief is dropped",
    );
    return false;
  }
  if (
    hasRole(part, "salutation") &&
    part.piece?.part !== "core" &&
    !GRADED_GOOD.has(part.key) &&
    /\b(?:thank|good evening|I|I'm|I'll|will|we)\b/i.test(part.text)
  ) {
    count("22. a greeting that is not a list of who is addressed is dropped");
    return false;
  }
  return true;
});

// 11. An ask core that opens with an announcement ("There's one thing I
// won't move on:") says the stand itself, so a belief can lead into it.
for (const part of bank.parts) {
  if (!hasRole(part, "ask") || part.piece?.part === "opener") continue;
  const stripped = part.text.replace(
    /^There(?:'s| is) one thing I (?:won't|will not) move on: /,
    "",
  );
  if (stripped !== part.text) {
    part.text = stripped;
    count("11. an ask's announcement goes and the stand is said");
  }
}

// 12. A W-C piece that said "this town" (rule no-this-town) gives way to its
// rewording above.
bank.parts = bank.parts.filter((part) => {
  if (
    part.author === "Claude (Words builder W-C, speech outline)" &&
    /\bthis town\b/.test(part.text)
  ) {
    count('12. a piece that said "this town" gives way to its rewording');
    return false;
  }
  return true;
});

// 14. A greeting's list of people (a whole greeting cut to its list, or a
// greeting's opener) is the same whatever kind of address follows it, so it
// belongs to every kind (no addressKind); a greeting's core, which carries
// the kind's mood, keeps its kind.
for (const part of bank.parts)
  if (
    hasRole(part, "salutation") &&
    part.piece?.part !== "core" &&
    part.addressKind !== undefined
  ) {
    delete part.addressKind;
    count("14. a greeting belongs to every kind of address");
  }

// 13. Pieces that became the same words (a title removed, a greeting cut)
// are one piece: the first keeps every use of the others.
const byText = new Map<string, Part>();
bank.parts = bank.parts.filter((part) => {
  const text = part.text.toLowerCase();
  const kept = byText.get(text);
  if (!kept) {
    byText.set(text, part);
    return true;
  }
  moveGrade(part.key, kept.key);
  for (const use of part.uses)
    if (
      !kept.uses.some(
        (row) => row.subject === use.subject && row.role === use.role,
      )
    )
      kept.uses.push(use);
  const voices = new Set([
    ...(Array.isArray(kept.voice) ? kept.voice : [kept.voice]),
    ...(Array.isArray(part.voice) ? part.voice : [part.voice]),
  ]);
  kept.voice = voices.size > 1 ? [...voices].sort() : [...voices][0]!;
  count("13. a piece with the same words as another is merged into it");
  return false;
});

// 10. A close that only thanks, and an against-wording that answers nothing
// ("isn't the answer" to a question nobody asked), are not said: a close
// returns to the theme (piece 9 above), and an ask says what it is against.
bank.parts = bank.parts.filter((part) => {
  if (part.text.includes("{context-law-years}")) {
    count(
      "10. a law's-age context is dropped: the starting laws carry the world's start, not their real dates",
    );
    return false;
  }
  if (hasRole(part, "close") && !part.text.includes("{first-side}")) {
    count("10. a close that only thanks is dropped");
    return false;
  }
  if (
    hasRole(part, "ask") &&
    /^On \{about\}, I(?: am|'m) for it/.test(part.text)
  ) {
    count(
      "10. a sided ask that opened on its subject is replaced by one that names it first",
    );
    return false;
  }
  if (hasRole(part, "ask") && /\b(isn't|is not) the answer\b/.test(part.text)) {
    count("10. an against-wording that answers nothing is dropped");
    return false;
  }
  return true;
});

// 28. A local address speaks to the body and holds the office the records
// seat (words builder, Nov 12: town speeches through the one planner). The
// head of a township or a county gives it as well as a town's mayor, so a
// town-address piece never types "the council", "mayor" or "town": the body
// is the `body` slot ("the council", "the board", "the commissioners", from
// the office row), the office is `office-title` ("mayor", "county
// executive", "chair"), and the place is said as "here".
bank.slots["body"] ??=
  "the local body the speaker speaks to or sits on, as people say it, from the office row's body name";
bank.slots["office-title"] ??=
  "the local office the speaker holds or seeks, as people say it, from the office row's title or the presiding post";
const LOCAL_WORDS: readonly [RegExp, string, string | null][] = [
  [/^Council members, /, "Members of {body}, ", "body"],
  [/^Council, neighbors\.$/, "Members of {body}, neighbors.", "body"],
  [/\bthe council\b/g, "{body}", "body"],
  [
    /\bas long as I am mayor\b/,
    "as long as I am {office-title}",
    "office-title",
  ],
  [/\bas long as I'm mayor\b/, "as long as I'm {office-title}", "office-title"],
  [/\bour town government\b/, "our local government", null],
  [/\b(?:across|around) town\b/, "around here", null],
];
for (const part of bank.parts) {
  if (!part.uses.every((use) => use.subject === "town-address")) continue;
  for (const [from, to] of LOCAL_WORDS) {
    const text = part.text.replace(from, to);
    if (text === part.text) continue;
    part.text = text;
    count(
      "28. a town-address piece says the body, the office and the place from the records",
    );
  }
  // A piece that says the body or the office needs its fact.
  for (const slot of ["body", "office-title"])
    if (part.text.includes(`{${slot}}`))
      for (const use of part.uses)
        if (!(use.requiresFacts ?? []).includes(slot)) {
          use.requiresFacts = [...(use.requiresFacts ?? []), slot];
          count("28. a piece that says the body or the office needs its fact");
        }
}

// 29. A council or board member's floor speech and a local candidate's
// campaign speech go through the one planner (words builder, Nov 12: "a
// council member's speech ... through planSpeech"), with banks of their own
// subjects: a point is said with the same pieces a local address says it
// with (how it stands today, the belief, the question, the figure's tie),
// and only the greeting, the occasion, the ask and the close are their own.
// A floor speech addresses whoever presides, asks the members for their
// vote and yields (docs/research/speech-structure-2026-11-12.md, the House
// one-minute); a campaign speech asks for the vote.
const LOCAL_KINDS = ["floor-speech", "campaign-speech"];
const POINT_ROLES = [
  "today",
  "belief-words",
  "belief",
  "why",
  "question",
  "tie",
  "context",
  "meaning",
];
for (const part of bank.parts) {
  const town = part.uses.filter(
    (use) =>
      use.subject === "town-address" &&
      (POINT_ROLES.includes(use.role) ||
        (use.role === "ask" && part.piece?.part === "opener")),
  );
  for (const use of town)
    for (const subject of LOCAL_KINDS)
      if (
        !part.uses.some(
          (row) => row.subject === subject && row.role === use.role,
        )
      ) {
        part.uses.push({ ...use, subject });
        count("29. a point's piece is said in a floor or campaign speech");
      }
}
const LOCAL_AUTHOR = "Claude (Words builder, local speeches)";
const LOCAL_PIECES: {
  subject: string;
  role: string;
  voice: string | string[];
  text: string;
  needs: string[];
  piece?: { of: string; part: string; required?: boolean };
}[] = [
  // Floor: to whoever presides, by title and name; to the body.
  {
    subject: "floor-speech",
    role: "salutation",
    voice: "polished",
    text: "{presiding}, members of {body}.",
    needs: ["presiding", "body"],
  },
  {
    subject: "floor-speech",
    role: "salutation",
    voice: "plain",
    text: "{presiding}, and my colleagues.",
    needs: ["presiding"],
  },
  {
    subject: "floor-speech",
    role: "salutation",
    voice: BOTH,
    text: "Members of {body}.",
    needs: ["body"],
  },
  // Floor asks: the members' vote on the measure before them.
  ...(
    [
      [
        "polished",
        "for",
        false,
        "I rise in support of {about}, and I urge my colleagues to vote yes.",
      ],
      [
        "plain",
        "for",
        false,
        "I'm for {about}, and I'm asking you all to vote yes.",
      ],
      [
        "polished",
        "against",
        false,
        "I rise in opposition to {about}, and I urge my colleagues to vote no.",
      ],
      [
        "plain",
        "against",
        false,
        "I'm against {about}, and I'm asking you all to vote no.",
      ],
      [
        "polished",
        "for",
        true,
        "I urge my colleagues to keep {law-name} as we have it.",
      ],
      ["plain", "for", true, "I'm asking you all to leave {law-name} alone."],
      [
        "polished",
        "against",
        true,
        "I urge my colleagues to repeal {law-name}.",
      ],
      [
        "plain",
        "against",
        true,
        "I'm asking you all to vote to end {law-name}.",
      ],
    ] as const
  ).map(([voice, side, inForce, text]) => ({
    subject: "floor-speech",
    role: "ask",
    voice,
    text,
    needs: [
      `stance-${side}`,
      inForce ? "law-in-force" : "law-not-in-force",
      "about",
    ],
    piece: { of: "opening-ask", part: "core", required: true },
  })),
  {
    subject: "floor-speech",
    role: "close",
    voice: "polished",
    text: "For these reasons, let us {first-side}. I yield back the balance of my time.",
    needs: ["first-side"],
  },
  {
    subject: "floor-speech",
    role: "close",
    voice: "polished",
    text: "I ask this body to {first-side}, and I yield back.",
    needs: ["first-side"],
  },
  {
    subject: "floor-speech",
    role: "close",
    voice: "plain",
    text: "Let's {first-side}. I yield back.",
    needs: ["first-side"],
  },
  {
    subject: "floor-speech",
    role: "close",
    voice: "plain",
    text: "So let's {first-side} tonight. Thank you, and I yield back.",
    needs: ["first-side"],
  },
  // Campaign: to the people of the place, for the office.
  {
    subject: "campaign-speech",
    role: "salutation",
    voice: "polished",
    text: "My friends and neighbors in {realm-name}.",
    needs: ["realm-name"],
  },
  {
    subject: "campaign-speech",
    role: "salutation",
    voice: "plain",
    text: "Friends and neighbors from all over {realm-name}.",
    needs: ["realm-name"],
  },
  {
    subject: "campaign-speech",
    role: "salutation",
    voice: BOTH,
    text: "Everybody here from {realm-name}.",
    needs: ["realm-name"],
  },
  {
    subject: "campaign-speech",
    role: "occasion",
    voice: "polished",
    text: "I am running for {office-title}, and I want to talk tonight about {theme-name}.",
    needs: ["office-title", "theme-name"],
  },
  {
    subject: "campaign-speech",
    role: "occasion",
    voice: "plain",
    text: "I'm running for {office-title}, and tonight I want to talk about {theme-name}.",
    needs: ["office-title", "theme-name"],
  },
  {
    subject: "campaign-speech",
    role: "occasion",
    voice: "plain",
    text: "I'm running for {office-title} because {theme-name} matters to every family here.",
    needs: ["office-title", "theme-name"],
  },
  ...(
    [
      [
        "polished",
        "for",
        false,
        "I am asking for your vote so that I can {to}.",
      ],
      ["plain", "for", false, "I'm asking for your vote so I can {to}."],
      [
        "polished",
        "against",
        false,
        "I am asking for your vote so that I can stop {about}.",
      ],
      [
        "plain",
        "against",
        false,
        "I'm asking for your vote so I can stop {about}.",
      ],
      [
        "polished",
        "for",
        true,
        "I am asking for your vote so that I can protect {law-name}.",
      ],
      [
        "plain",
        "for",
        true,
        "I'm asking for your vote so I can protect {law-name}.",
      ],
      [
        "polished",
        "against",
        true,
        "I am asking for your vote so that I can repeal {law-name}.",
      ],
      [
        "plain",
        "against",
        true,
        "I'm asking for your vote so I can end {law-name}.",
      ],
    ] as const
  ).map(([voice, side, inForce, text]) => ({
    subject: "campaign-speech",
    role: "ask",
    voice,
    text,
    needs: [
      `stance-${side}`,
      inForce ? "law-in-force" : "law-not-in-force",
      text.includes("{to}") ? "to" : "about",
    ],
    piece: { of: "opening-ask", part: "core", required: true },
  })),
  {
    subject: "campaign-speech",
    role: "close",
    voice: "polished",
    text: "Together we can {first-side}. Thank you, and I hope to earn your vote.",
    needs: ["first-side"],
  },
  {
    subject: "campaign-speech",
    role: "close",
    voice: "polished",
    text: "If we {first-side}, {realm-name} will be the better for it. Thank you.",
    needs: ["first-side", "realm-name"],
  },
  {
    subject: "campaign-speech",
    role: "close",
    voice: "plain",
    text: "On election day, let's {first-side}. Thank you.",
    needs: ["first-side"],
  },
  {
    subject: "campaign-speech",
    role: "close",
    voice: "plain",
    text: "Let's {first-side}, {realm-name}. Thanks, and I'll see you at the polls.",
    needs: ["first-side", "realm-name"],
  },
];
bank.slots["presiding"] ??=
  "whoever presides over the body, by the post's title and family name (said-as, addressed)";
const localKeys = new Set(bank.parts.map((part) => part.key));
for (const add of LOCAL_PIECES) {
  const voiceKey = Array.isArray(add.voice) ? "both" : add.voice;
  const key = `opening-speech.${add.role}.${voiceKey}-${add.subject}-${slug(add.text)}-${slug(add.needs.join(" "))}`;
  if (localKeys.has(key)) continue;
  bank.parts.push({
    key,
    move: add.role,
    kind: "spoken",
    text: add.text,
    uses: [
      {
        move: add.role,
        subject: add.subject,
        role: add.role,
        choice: add.role,
        requiresFacts: add.needs,
      },
    ],
    voice: add.voice,
    bearing: "firm",
    ...(add.piece ? { piece: add.piece } : {}),
    origin: "authored",
    author: LOCAL_AUTHOR,
    date: "2026-11-12",
  });
  localKeys.add(key);
  count(
    "29. a floor or campaign speech's own greeting, occasion, ask or close is added",
  );
}

// 30. A governor's or a local head's opening tells one or two of this
// year's conditions from the records, with their direction and no figure
// (owner, Nov 12, 1:05 a.m.: "it's okay if context is given ... that just
// establishes context in a smooth way"; SG-WORDS-local-address-conditions):
// the budget's balance, then a law that took effect in the past year or a
// disaster declared for the place.
const CONDITIONS: [string, string | string[], string, string[], string[]][] = [
  [
    "budget-condition",
    "polished",
    "The {budget-year} budget takes in more than it spends, and I intend to keep it that way.",
    ["condition-budget-ahead", "condition-budget-steady", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "plain",
    "The state's books for {budget-year} show more coming in than going out, and I'd like to keep them that way.",
    ["condition-budget-ahead", "condition-budget-steady", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "polished",
    "The {budget-year} budget runs further ahead than the year before, and that money belongs to the taxpayers who sent it.",
    ["condition-budget-ahead", "condition-budget-better", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "plain",
    "We closed out {budget-year} further ahead than the year before, and that money is the taxpayers', not ours.",
    ["condition-budget-ahead", "condition-budget-better", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "polished",
    "The {budget-year} budget is still in the black, but by less than the year before, so we will spend with care.",
    ["condition-budget-ahead", "condition-budget-worse", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "plain",
    "We're still ahead in {budget-year}, just not by as much as last year, so we watch every dollar.",
    ["condition-budget-ahead", "condition-budget-worse", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "polished",
    "The {budget-year} budget spends more than it takes in, and closing that gap is part of tonight's work.",
    ["condition-budget-short", "condition-budget-steady", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "plain",
    "The state is spending more in {budget-year} than it brings in, and we've got to close that gap.",
    ["condition-budget-short", "condition-budget-steady", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "polished",
    "The {budget-year} budget still spends more than it takes in, though by less than the year before.",
    ["condition-budget-short", "condition-budget-better", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "plain",
    "We're still short in {budget-year}, but by less than last year, and we're going to finish the job.",
    ["condition-budget-short", "condition-budget-better", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "polished",
    "The {budget-year} budget falls further short than the year before, and we cannot keep borrowing against tomorrow.",
    ["condition-budget-short", "condition-budget-worse", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "plain",
    "The hole in the {budget-year} budget is deeper than last year's, and we've got to stop digging.",
    ["condition-budget-short", "condition-budget-worse", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "polished",
    "The {budget-year} budget comes out about even, which leaves room to choose and none to waste.",
    ["condition-budget-even", "condition-budget-steady", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "plain",
    "The {budget-year} budget comes out about even, so every new dollar has to come from somewhere.",
    ["condition-budget-even", "condition-budget-steady", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "polished",
    "The {budget-year} budget comes out about even, a better place than the state stood the year before.",
    ["condition-budget-even", "condition-budget-better", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "plain",
    "We came out about even in {budget-year}, and that beats where the state stood last year.",
    ["condition-budget-even", "condition-budget-better", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "polished",
    "The {budget-year} budget comes out about even, with less room than the state had the year before.",
    ["condition-budget-even", "condition-budget-worse", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "plain",
    "We're about even in {budget-year}, with less cushion than the state had last year.",
    ["condition-budget-even", "condition-budget-worse", "budget-year"],
    ["state-of-the-state"],
  ],
  [
    "budget-condition",
    "polished",
    "For {budget-year}, we are taking in more than we spend here, and I mean to keep it so.",
    ["condition-budget-ahead", "condition-budget-steady", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "plain",
    "Our {budget-year} books have more coming in than going out, and I'd like to keep it that way.",
    ["condition-budget-ahead", "condition-budget-steady", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "polished",
    "We finished {budget-year} further ahead than the year before, and every dollar of it came from our neighbors.",
    ["condition-budget-ahead", "condition-budget-better", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "plain",
    "Our {budget-year} books came out better than last year's, and that's our neighbors' money, not mine.",
    ["condition-budget-ahead", "condition-budget-better", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "polished",
    "We are still ahead for {budget-year}, though by less than the year before, so every request gets a hard look.",
    ["condition-budget-ahead", "condition-budget-worse", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "plain",
    "We're ahead for {budget-year}, but not by as much as last year, so I'm watching every dollar.",
    ["condition-budget-ahead", "condition-budget-worse", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "polished",
    "For {budget-year}, we are spending more than we take in, and I won't hand that bill to whoever sits here next.",
    ["condition-budget-short", "condition-budget-steady", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "plain",
    "We're spending more than we bring in for {budget-year}, and that has to stop on our watch.",
    ["condition-budget-short", "condition-budget-steady", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "polished",
    "We are still short for {budget-year}, but by less than the year before, and I intend to finish the job.",
    ["condition-budget-short", "condition-budget-better", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "plain",
    "We're still short for {budget-year}, but by less than last year, and we're not done.",
    ["condition-budget-short", "condition-budget-better", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "polished",
    "Our {budget-year} books fall further short than the year before, and we cannot keep paying today's bills with tomorrow's money.",
    ["condition-budget-short", "condition-budget-worse", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "plain",
    "We fell further behind in {budget-year} than last year, and we can't keep putting it on a tab.",
    ["condition-budget-short", "condition-budget-worse", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "polished",
    "Our {budget-year} books come out about even, so whatever we add, we pay for.",
    ["condition-budget-even", "condition-budget-steady", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "plain",
    "We're about breaking even for {budget-year}, so anything new has to be paid for.",
    ["condition-budget-even", "condition-budget-steady", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "polished",
    "Our {budget-year} books come out about even, which is better than where we stood the year before.",
    ["condition-budget-even", "condition-budget-better", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "plain",
    "We're about even for {budget-year}, and that's a step up from last year.",
    ["condition-budget-even", "condition-budget-better", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "polished",
    "Our {budget-year} books come out about even, with less to spare than the year before.",
    ["condition-budget-even", "condition-budget-worse", "budget-year"],
    ["town-address"],
  ],
  [
    "budget-condition",
    "plain",
    "We're about even for {budget-year}, but with less to spare than last year.",
    ["condition-budget-even", "condition-budget-worse", "budget-year"],
    ["town-address"],
  ],
  [
    "year-condition",
    "polished",
    "This past year, {condition-law} took effect, and people across the state are already living under it.",
    ["condition-law", "condition-law-reached"],
    ["state-of-the-state"],
  ],
  [
    "year-condition",
    "plain",
    "This past year, {condition-law} took effect, and it's already touching folks all over the state.",
    ["condition-law", "condition-law-reached"],
    ["state-of-the-state"],
  ],
  [
    "year-condition",
    "polished",
    "This past year, {condition-law} took effect here, and our neighbors are already living under it.",
    ["condition-law", "condition-law-reached"],
    ["town-address"],
  ],
  [
    "year-condition",
    "plain",
    "This past year, {condition-law} took effect here, and it's already touching folks we know.",
    ["condition-law", "condition-law-reached"],
    ["town-address"],
  ],
  [
    "year-condition",
    "polished",
    "We have not forgotten this past year's {condition-disaster}, or the families it hit hardest.",
    ["condition-disaster"],
    ["state-of-the-state", "town-address"],
  ],
  [
    "year-condition",
    "plain",
    "Nobody here has forgotten this past year's {condition-disaster}, or the families it hit.",
    ["condition-disaster"],
    ["state-of-the-state", "town-address"],
  ],
];
bank.slots["budget-year"] ??=
  "the fiscal year of the budget the speaker's government lives under (the budgets engine's row)";
bank.slots["condition-law"] ??=
  "a law of the speaker's jurisdiction that took effect in the past year, by its spoken name (the laws engine's row)";
bank.slots["condition-disaster"] ??=
  "a disaster declared for the place in the past year, by its kind (the disasters engine's declaration)";
bank.slots["condition-law-reached"] ??=
  "the law-reach records show the law of condition-law has reached people here (law-reach host.ts reachedBy); said only as the sentence's tie, never as a figure";
const conditionKey = ([
  role,
  voice,
  text,
  needs,
  kinds,
]: (typeof CONDITIONS)[number]) =>
  `opening-speech.${role}.${Array.isArray(voice) ? "both" : voice}-${kinds.length > 1 ? "" : `${kinds[0]}-`}${slug(text)}-${slug(needs.join(" "))}`;
const conditionKeysWanted = new Set(CONDITIONS.map(conditionKey));
bank.parts = bank.parts.filter((part) => {
  if (
    part.author !== LOCAL_AUTHOR ||
    !(hasRole(part, "budget-condition") || hasRole(part, "year-condition")) ||
    conditionKeysWanted.has(part.key)
  )
    return true;
  count("30. a condition of this rule's gives way to its rewording");
  return false;
});
const conditionKeys = new Set(bank.parts.map((part) => part.key));
for (const row of CONDITIONS) {
  const [role, voice, text, needs, kinds] = row;
  const key = conditionKey(row);
  if (conditionKeys.has(key)) {
    // A rewording whose key is cut to the same words replaces the text.
    const kept = bank.parts.find((part) => part.key === key)!;
    if (kept.text !== text) {
      kept.text = text;
      count("30. a condition of this rule's gives way to its rewording");
    }
    continue;
  }
  bank.parts.push({
    key,
    move: role,
    kind: "spoken",
    text,
    uses: kinds.map((subject) => ({
      move: role,
      subject,
      role,
      choice: role,
      requiresFacts: needs,
    })),
    voice,
    bearing: "calm",
    origin: "authored",
    author: LOCAL_AUTHOR,
    date: "2026-11-12",
  });
  conditionKeys.add(key);
  count(
    "30. a condition of the year is said in a governor's or a local head's opening",
  );
}

// 31. A governor's or a local head's fixed sentence that says "this state"
// or "here" says the place by name instead (the owner, Nov 12, through the
// CTO: "lines left", every counted line carries an insert; the words lead,
// Nov 12: "This state" eight times and the state's name never). The place's
// name is the outline's `realm-name`, from the record of the government that
// speaks.
const REALM_SAID: [RegExp, string][] = [
  [/\bthis state\b/g, "{realm-name}"],
  [/\bwhere we stand\b/g, "where {realm-name} stands"],
  [/\bthe people here\b/g, "the people of {realm-name}"],
  [/\bpeople here\b/g, "people in {realm-name}"],
  [/\bcounted us out\b/g, "counted {realm-name} out"],
];
const REALM_MOVES = new Set([
  "occasion",
  "story-open",
  "story-says",
  "story-turn",
  "pledge",
  "hope",
  "salutation",
]);
const LOCAL_SUBJECTS = new Set(["state-of-the-state", "town-address"]);
for (const part of bank.parts) {
  if (/\{[^{}\s]+\}/.test(part.text) || !REALM_MOVES.has(part.move)) continue;
  if (!part.uses.every((use) => LOCAL_SUBJECTS.has(use.subject ?? "")))
    continue;
  const text = REALM_SAID.reduce(
    (said, [pattern, name]) => said.replace(pattern, name),
    part.text,
  );
  if (text === part.text) continue;
  part.text = text;
  for (const use of part.uses)
    use.requiresFacts = [
      ...new Set([...(use.requiresFacts ?? []), "realm-name"]),
    ];
  count("31. a local speech's fixed sentence says the place by name");
}

writeFileSync(FILE, `${JSON.stringify(bank, null, 2)}\n`);
for (const [rule, n] of Object.entries(counts).sort())
  console.log(`${String(n).padStart(4)}  ${rule}`);
