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
  it: "the pronoun for the point's question as an object (it, or them for a name that is several)",
  "it-subject":
    "the pronoun for the point's question as a subject (it, or they for a name that is several)",
  belief:
    "what the speaker believes, a clause worded from the belief-words pieces by the question's family and the speaker's pole of it",
  "first-side":
    "the speech's first point as the speaker's side says it (question-names `for` or `against`), for the close",
  side: "the question as the speaker's side says it (question-names.json `for` or `against`)",
  "speaker-object": "the Speaker where the sentence needs the object case",
  "speaker-possessive": "the Speaker where the sentence needs the possessive",
};
for (const [slot, about] of Object.entries(SLOTS))
  if (bank.slots[slot] !== about) bank.slots[slot] = about;
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
    "I am for {about}, and I ask the council to {side} this year.",
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
    "I am against {about}, and I will ask the council to vote it down.",
  ],
  [
    ["town-address"],
    "plain",
    "against",
    "I'm against {about}, and I'll ask the council to vote it down.",
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
  keysNow.add(key);
  textsNow.add(add.text.toLowerCase());
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
  ["plain", "Right now, {today-clause}"],
  ["polished", "Today, {today-clause}"],
  ["plain", "Here's where things stand: {today-clause}"],
  ["polished", "Consider where we are: {today-clause}"],
  ["plain", "These days, {today-clause}"],
];
for (const [voice, text] of TODAY)
  ADD.push({
    role: "today",
    subjects: ALL,
    voice,
    text,
    needs: [text.includes("{today}") ? "today" : "today-clause"],
  });
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
  ["belief", "plain", "Here's what I believe: {belief}.", "belief-stands"],
  ["belief", "plain", "I've always thought {belief}.", "belief-stands"],
  ["why", "polished", "I say so because I believe {belief}.", "belief-after"],
  [
    "why",
    "polished",
    "My reason is simple: I believe {belief}.",
    "belief-after",
  ],
  ["why", "plain", "Why? Because I believe {belief}.", "belief-after"],
  ["why", "plain", "I'll tell you why: {belief}.", "belief-after"],
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
const QUESTIONS: [string, string][] = [
  ["polished", "Where do I stand on {about}?"],
  ["polished", "What should this government do about {about}?"],
  ["plain", "So where am I on {about}?"],
  ["plain", "What about {about}?"],
];
for (const [voice, text] of QUESTIONS)
  ADD.push({
    role: "question",
    subjects: ALL,
    voice,
    text,
    needs: ["about", "asks-question"],
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
    "That is one more reason I am for {it}.",
  ],
  ["plain", "for", "law-not-in-force", "That's a big part of why I want {it}."],
  ["polished", "for", "law-in-force", "That is one more reason to keep {it}."],
  ["plain", "for", "law-in-force", "That's why I'm standing by {it}."],
  [
    "polished",
    "against",
    "law-not-in-force",
    "{it-subject} would only add to that burden.",
  ],
  [
    "plain",
    "against",
    "law-not-in-force",
    "{it-subject} would only make that worse.",
  ],
  [
    "polished",
    "against",
    "law-in-force",
    "That is one more reason to repeal {it}.",
  ],
  [
    "plain",
    "against",
    "law-in-force",
    "That's one more reason to get rid of {it}.",
  ],
];
// The tie follows the ask, so the question is named once in a point and
// the tie says "it" or "them" (`{it}`, `{it-subject}`: the pronoun for the
// name's number, filled by the planner).
for (const [voice, side, law, text] of TIES)
  ADD.push({
    role: "tie",
    subjects: ALL,
    voice,
    text,
    needs: [`stance-${side}`, law, "figure-ties"],
  });
// 20. A law in force is defended or repealed by what the speaker will do,
// never stated as a fact a belief could lead into ("Because I think ..., a
// price on carbon is the law here"). `{it}` agrees with the name's number.
const LAWS: [string[], string, string, string][] = [
  [
    FEDERAL,
    "polished",
    "for",
    "I will stand by {about}, and I will veto any bill that would undo {it}.",
  ],
  [
    FEDERAL,
    "plain",
    "for",
    "I'll keep {about} on the books, and I'll fight anybody who tries to undo {it}.",
  ],
  [
    FEDERAL,
    "polished",
    "against",
    "I will sign the repeal of {about} the day Congress sends it to me.",
  ],
  [
    FEDERAL,
    "plain",
    "against",
    "I'll sign the repeal of {about} the day Congress sends it.",
  ],
  [
    ["state-of-the-state"],
    "polished",
    "for",
    "I will keep {about} on the books, and I will veto any bill that would undo {it}.",
  ],
  [
    ["state-of-the-state"],
    "plain",
    "for",
    "I'll stand by {about}, and I'll veto any bill that tries to undo {it}.",
  ],
  [
    ["state-of-the-state"],
    "polished",
    "against",
    "I will sign the repeal of {about} when the legislature sends it.",
  ],
  [
    ["state-of-the-state"],
    "plain",
    "against",
    "I'll sign the repeal of {about} the day the legislature sends it.",
  ],
  [
    ["town-address"],
    "polished",
    "for",
    "I will defend {about} before the council.",
  ],
  [
    ["town-address"],
    "plain",
    "for",
    "I'm going to keep {about} just the way {it-is}.",
  ],
  [
    ["town-address"],
    "polished",
    "against",
    "I will ask the council to end {about}.",
  ],
  [
    ["town-address"],
    "plain",
    "against",
    "I'll ask the council to end {about}.",
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
  [
    ["state-of-the-state"],
    "polished",
    "If we {first-side}, this state will be the stronger for it. Thank you.",
  ],
  [
    ["state-of-the-state"],
    "plain",
    "Let's {first-side}, and this state's better off for it. Thank you.",
  ],
  [
    ["town-address"],
    "polished",
    "If we {first-side}, our town will be the better for it. Thank you.",
  ],
  [
    ["town-address"],
    "plain",
    "Let's {first-side}, and our town's better off for it. Thank you.",
  ],
];
for (const [subjects, voice, text] of CLOSES)
  ADD.push({ role: "close", subjects, voice, text, needs: ["first-side"] });
const GREETINGS: [string, string][] = [
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
  const key = `opening-speech.${add.role}.${Array.isArray(add.voice) ? "both" : add.voice}-${add.subjects[0]}-${slug(add.text)}-${slug(add.needs.join(" "))}`;
  if (keysNow.has(key) || textsNow.has(add.text.toLowerCase())) {
    const found = bank.parts.find(
      (part) => part.text.toLowerCase() === add.text.toLowerCase(),
    );
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

writeFileSync(FILE, `${JSON.stringify(bank, null, 2)}\n`);
for (const [rule, n] of Object.entries(counts).sort())
  console.log(`${String(n).padStart(4)}  ${rule}`);
