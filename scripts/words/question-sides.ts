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
 * 3. `against`: "stop" and the supporter's verb phrase ("stop any bill to
 *    raise tariffs" reads as "stop raising tariffs" when said with "-ing").
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/english/question-names.json";
const data = JSON.parse(readFileSync(FILE, "utf8")) as {
  about: string;
  names: Record<
    string,
    { about: string; to: string; for?: string; against?: string }
  >;
};
const counts: Record<string, number> = {};
const count = (rule: string) => (counts[rule] = (counts[rule] ?? 0) + 1);

// 1. Names that hide what the bill does, renamed from their source record.
const RENAMED: Record<string, { about: string; to: string }> = {
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

/** A verb phrase's first verb in its -ing form ("raise tariffs" → "raising tariffs"). */
function gerund(to: string): string {
  const [verb, ...rest] = to.split(" ");
  const word = verb!;
  const ing = /ie$/.test(word)
    ? `${word.slice(0, -2)}ying`
    : /[^aeiou]e$/.test(word) && word !== "be"
      ? `${word.slice(0, -1)}ing`
      : /^(stop|cut|bar|set|put|let|get|run|plan|ban|cap|admit)$/.test(word)
        ? `${word}${word.at(-1)}ing`
        : `${word}ing`;
  return [ing, ...rest].join(" ");
}

// 2 and 3. Each side's spoken form.
for (const row of Object.values(data.names)) {
  const sides = { for: row.to, against: `stop ${gerund(row.to)}` };
  if (row.for !== sides.for || row.against !== sides.against) {
    row.for = sides.for;
    row.against = sides.against;
    count("2-3. a question's two sides are said as people say them");
  }
}
data.about = data.about.includes("`for`")
  ? data.about
  : `${data.about} Each question also has a form for each side, written by scripts/words/question-sides.ts: \`for\` is what a supporter wants done and \`against\` what an opponent will stop ("stop raising tariffs"); both read after "I want to" and "I will".`;

writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
for (const [rule, n] of Object.entries(counts).sort())
  console.log(`${String(n).padStart(4)}  ${rule}`);
