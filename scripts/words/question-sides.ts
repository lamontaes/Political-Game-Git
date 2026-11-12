/**
 * Gives every policy question a spoken form for each side, by kind, never one
 * question at a time (owner, Nov 12, on "I'll work with anybody in Congress
 * who wants to pay for raising the debt limit": "Is he for it? Is he
 * against it?"). A question's `for` is what a supporter says they want made
 * law; its `against` is what an opponent says they will stop. Both read
 * after "I want to" and "I will". Idempotent.
 *
 *   node --import tsx scripts/words/question-sides.ts
 *
 * Rules:
 * 1. A name whose verb phrase hides what the bill does is renamed from its
 *    source record (the debt-limit question is the 2023 House vote that
 *    raised the debt limit only with spending cuts paired to it).
 * 2. `for`: make the question's noun phrase law ("make paid family leave the
 *    law") when its verb phrase is about a law of the land; otherwise the
 *    verb phrase itself, which already says what the supporter wants.
 * 3. `against`: keep the question's noun phrase off the books, while no law
 *    answers it yes ("keep higher tariffs off the books"); `repeal`, once one
 *    does ("repeal right-to-work rules"). ("stop raising tariffs" read as
 *    ceasing what was never begun.)
 * 4. `today`: how the question stands now, one plain sentence for each state
 *    of the law (`without` while no law answers it yes, `with` once one
 *    does), from scripts/words/question-today.tsv, written for every
 *    question (owner, Nov 12: context "just establishes context in a smooth
 *    way"). A speech's point opens on it.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/english/question-names.json";
const data = JSON.parse(readFileSync(FILE, "utf8")) as {
  about: string;
  names: Record<
    string,
    {
      about: string;
      to: string;
      for?: string;
      against?: string;
      repeal?: string;
      today?: { without: string; with: string };
    }
  >;
};
const counts: Record<string, number> = {};
const count = (rule: string) => (counts[rule] = (counts[rule] ?? 0) + 1);

// 1. Names that hide what the bill does, renamed from their source record.
const RENAMED: Record<string, { about: string; to: string }> = {
  // The capital by what it is, so a speech about it names no place as a
  // state (composed check speech-names-no-stray-place).
  "us-federal-positions:territories-culture.statehood-for-dc": {
    about: "statehood for the nation's capital",
    to: "make the nation's capital a state",
  },
  "us-federal-positions:budget.pay-for-a-higher-debt-limit": {
    about: "raising the debt limit only with spending cuts to match",
    to: "raise the debt limit only with spending cuts to match",
  },
};
for (const [question, names] of Object.entries(RENAMED)) {
  const row = data.names[question];
  if (row && (row.about !== names.about || row.to !== names.to)) {
    row.about = names.about;
    row.to = names.to;
    count("1. a name that hid what the bill does is renamed from its record");
  }
}

// 2 and 3. Each side's spoken form.
for (const row of Object.values(data.names)) {
  const sides = {
    for: row.to,
    against: `keep ${row.about} off the books`,
    repeal: `repeal ${row.about}`,
  };
  if (
    row.for !== sides.for ||
    row.against !== sides.against ||
    row.repeal !== sides.repeal
  ) {
    row.for = sides.for;
    row.against = sides.against;
    row.repeal = sides.repeal;
    count("2-3. a question's two sides are said as people say them");
  }
}
// 4. How each question stands today, by the law's state.
const today = new Map(
  readFileSync("scripts/words/question-today.tsv", "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      const [key, without, withLaw] = line.split("\t") as [
        string,
        string,
        string,
      ];
      return [key, { without, with: withLaw }] as const;
    }),
);
for (const [question, row] of Object.entries(data.names)) {
  const found = today.get(question.split(":")[1]!);
  if (!found) throw new Error(`No today form for ${question}`);
  if (row.today?.without !== found.without || row.today?.with !== found.with) {
    row.today = found;
    count("4. a question says how it stands today, with and without its law");
  }
}
data.about = data.about.includes("`today`")
  ? data.about
  : `${data.about} \`today\` says how the question stands now: \`without\` while no law answers it yes, \`with\` once one does.`;
data.about = data.about.includes("`for`")
  ? data.about
  : `${data.about} Each question also has a form for each side, written by scripts/words/question-sides.ts: \`for\` is what a supporter wants done and \`against\` what an opponent will keep off the books ("keep higher tariffs off the books") and \`repeal\` what they will undo; both read after "I want to" and "I will".`;

writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
for (const [rule, n] of Object.entries(counts).sort())
  console.log(`${String(n).padStart(4)}  ${rule}`);
