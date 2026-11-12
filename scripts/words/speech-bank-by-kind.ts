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

// 4. The context pieces.
const SLOTS: Record<string, string> = {
  "context-years":
    "how many whole years a context sentence covers: the macro engine's months, or the years since the speaker took office for an area of the term read",
  "context-amount":
    "a measure's average over the context's years, to one decimal, from the macro engine's months",
  "context-law-years":
    "how many whole years the law in force on an ask has stood, from the laws engine's row",
  "vice-president-addressed":
    "the Vice President spoken to, said with title and name every time",
};
for (const [slot, about] of Object.entries(SLOTS))
  if (!bank.slots[slot]) bank.slots[slot] = about;
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
    "Over the last {context-years} years, about {context-amount} percent of those who want work have been unable to find it.",
    ["context-unemployment", "context-years", "context-amount"],
  ],
  [
    "unemployment",
    FEDERAL,
    "plain",
    "For {context-years} years, about {context-amount} out of every hundred people looking for work haven't been able to find it.",
    ["context-unemployment", "context-years", "context-amount"],
  ],
  [
    "mortgage",
    FEDERAL,
    "polished",
    "For {context-years} years, a home loan has cost about {context-amount} percent a year, and a first home has slipped out of reach for too many.",
    ["context-mortgage", "context-years", "context-amount"],
  ],
  [
    "mortgage",
    FEDERAL,
    "plain",
    "For {context-years} years, a mortgage has run about {context-amount} percent, and a lot of young families have given up on buying.",
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
  [
    "law",
    ALL,
    "polished",
    "For {context-law-years} years, the law has said no to {about}, and I believe that has gone on long enough.",
    ["context-law-years", "about", "stance-for", "law-not-in-force"],
  ],
  [
    "law",
    ALL,
    "plain",
    "For {context-law-years} years, the law's said no to {about}, and I think that's long enough.",
    ["context-law-years", "about", "stance-for", "law-not-in-force"],
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
const keys = new Set(bank.parts.map((part) => part.key));
for (const [topic, subjects, voice, text, needs] of CONTEXT) {
  const key = `opening-speech.context.${voice}-${topic}-${slug(text)}`;
  if (keys.has(key)) continue;
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
    author: "Claude (Words builder W-C, speech outline)",
    date: "2026-11-12",
  });
  keys.add(key);
  count("4. a context piece is added");
}

writeFileSync(FILE, `${JSON.stringify(bank, null, 2)}\n`);
for (const [rule, n] of Object.entries(counts).sort())
  console.log(`${String(n).padStart(4)}  ${rule}`);
