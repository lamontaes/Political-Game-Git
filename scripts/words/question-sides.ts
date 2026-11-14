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
 * 3. `against`: say no to the question's noun phrase, while no law answers
 *    it yes ("say no to higher tariffs"; "keep ... off the books" fit few
 *    questions, the words lead, Nov 12); `repeal`, once one does, names the
 *    law in force as the thing itself (`law`: "repeal paid family leave",
 *    "repeal the right-to-work rules"). ("stop raising tariffs" read as ceasing what was never begun.)
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
      keep?: string;
      today?: unknown;
      family?: string;
      pole?: "a" | "b";
      number?: "one" | "many";
      figures?: { measure: string; side: "for" | "against" }[];
      todayMore?: unknown;
    }
  >;
};
const counts: Record<string, number> = {};
/**
 * A question's row in the TSVs below: a budget line by its whole id
 * ("budget-line:police"), a policy question by its key after the catalog's
 * prefix, with its area (`area.key`, question-today.tsv) or without it
 * (question-reasons.tsv, question-today-more.tsv). One rule, so a budget line
 * is written by this script like every other question.
 */
const rowKey = (question: string, withArea: boolean) =>
  question.startsWith("budget-line:")
    ? question
    : withArea
      ? question.split(":")[1]!
      : question.split(":")[1]!.split(".").slice(1).join(".");
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

// 3b. The law in force, said as the thing itself ("paid family leave", "the
// higher federal minimum wage", "the law ending cash bail"), which a repeal
// names (the words lead, Nov 12: "a repeal of the law that brought in paid
// family leave" is said-as trouble). "A"/"an" becomes "the"; a phrase that
// opens on a doing word is "the law" doing it; a phrase that reads as a
// proposal, not a law, is named below from its record.
const LAW_NAMES: Record<string, string> = {
  "Medicare negotiating drug prices":
    "the law letting Medicare negotiate drug prices",
  "more defense spending": "the increase in defense spending",
  "more foreign aid": "the increase in foreign aid",
  "more local government power": "the law giving towns more power",
  "more passenger rail": "the law adding passenger rail",
  "states sharing disaster costs": "the law making states share disaster costs",
  "photo ID to vote": "the photo ID law",
  "working with federal immigration enforcement":
    "the agreement to work with federal immigration enforcement",
  "apartments in single-family neighborhoods":
    "the law allowing apartments in single-family neighborhoods",
  "higher tariffs": "the higher tariffs",
  "right-to-work rules": "the right-to-work rules",
  "stand-your-ground rules": "the stand-your-ground rules",
  "shorter mandatory minimum sentences": "the shorter mandatory minimums",
  // Nouns that end in "-ing" but are no doing word.
  "housing vouchers for every family that qualifies":
    "housing vouchers for every family that qualifies",
  "voting by mail for everyone": "voting by mail for everyone",
  "asking about criminal records on state job applications":
    "the rule against asking about criminal records on state job applications",
  "a lawyer for tenants facing eviction":
    "the right to a lawyer for tenants facing eviction",
  "a permit to carry a concealed gun":
    "the permit rule for carrying a concealed gun",
  "a balanced operating budget": "the balanced budget rule",
  "a minimum reserve balance": "the reserve requirement",
};
const lawOf = (about: string) =>
  LAW_NAMES[about] ??
  (/^an? /.test(about)
    ? about.replace(/^an? /, "the ")
    : /^[a-z]+ing\b/.test(about)
      ? `the law ${about}`
      : about);
// A budget line is no law on the books: its sides keep or change the line,
// and its "law" is the bigger line itself (scripts/words/question-budget-sides.tsv).
const budgetSides = new Map(
  readFileSync("scripts/words/question-budget-sides.tsv", "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [key, against, repeal, keep, law] = line.split("\t");
      return [
        key!,
        { against: against!, repeal: repeal!, keep: keep!, law: law! },
      ];
    }),
);
for (const [question, row] of Object.entries(data.names)) {
  const law = budgetSides.get(question)?.law ?? lawOf(row.about);
  if ((row as { law?: string }).law !== law) {
    (row as { law?: string }).law = law;
    count("3b. a question's law in force is said as the thing itself");
  }
}

// 2 and 3. Each side's spoken form.
for (const [question, row] of Object.entries(data.names)) {
  const sides = {
    for: row.to,
    against: `say no to ${row.about}`,
    repeal: `repeal ${(row as { law?: string }).law}`,
    keep: `keep ${(row as { law?: string }).law} on the books`,
    ...(budgetSides.has(question)
      ? (({ law, ...rest }) => (void law, rest))(budgetSides.get(question)!)
      : {}),
  };
  if (
    row.for !== sides.for ||
    row.against !== sides.against ||
    row.repeal !== sides.repeal ||
    row.keep !== sides.keep
  ) {
    row.for = sides.for;
    row.against = sides.against;
    row.repeal = sides.repeal;
    row.keep = sides.keep;
    count("2-3. a question's two sides are said as people say them");
  }
}
// 4. How each question stands today, by the law's state AND the side
// speaking (owner, Nov 12, via the words lead: "The context argues for the
// other side"): `today.without.for` is how a supporter describes the world
// while no law answers the question yes, `today.without.against` how an
// opponent describes the same world, and `today.with` the same once a law
// does. Each sentence is bare: the speech's own openers ("Right now,", "As
// things stand,") are the bank's, so no two context sentences open alike.
// The same row gives the question's family and which pole of it a supporter
// stands on (the belief a speaker gives is typed by these, never by theme),
// its grammatical number (`one` or `many`: "limits on pumping groundwater
// ARE"), and the measures that bear on it, each with the side it helps.
const [header, ...lines] = readFileSync(
  "scripts/words/question-today.tsv",
  "utf8",
)
  .trim()
  .split("\n");
const columns = header!.split("\t");
const today = new Map(
  lines.map((line) => {
    const cells = Object.fromEntries(
      line.split("\t").map((cell, at) => [columns[at]!, cell]),
    ) as Record<string, string>;
    return [cells.key!, cells] as const;
  }),
);
for (const [question, row] of Object.entries(data.names)) {
  const found = today.get(rowKey(question, true));
  if (!found) throw new Error(`No today form for ${question}`);
  const wanted = {
    today: {
      without: {
        for: found["without-for"]!,
        against: found["without-against"]!,
      },
      with: { for: found["with-for"]!, against: found["with-against"]! },
    },
    family: found.family!,
    pole: found.pole as "a" | "b",
    number: found.number as "one" | "many",
    figures:
      found.figures === "-"
        ? []
        : found.figures!.split(",").map((pair) => {
            const [measure, side] = pair.split(":") as [string, string];
            return { measure, side: side as "for" | "against" };
          }),
  };
  for (const [field, value] of Object.entries(wanted))
    if (
      JSON.stringify(row[field as keyof typeof row]) !== JSON.stringify(value)
    ) {
      (row as Record<string, unknown>)[field] = value;
      count(`4. a question's ${field} is set from its row`);
    }
}
// 6. Which principles can argue each side, and each side's own reason (the
// words lead, Nov 12: "Law and order" does not argue for asking about
// records on job forms). `principles.for` lists the belief-words clauses of
// the question's family and supporters' pole that are a reason for it, by
// their place among that pole's clauses in key order (1 to 4);
// `principles.against` the same for the other pole. `reasons` is the
// question's own reason on each side, said when no listed clause is in the
// speaker's voice (scripts/words/question-reasons.tsv).
const [reasonHeader, ...reasonLines] = readFileSync(
  "scripts/words/question-reasons.tsv",
  "utf8",
)
  .trim()
  .split("\n");
const reasonColumns = reasonHeader!.split("\t");
const reasonRows = new Map(
  reasonLines.map((line) => {
    const cells = Object.fromEntries(
      line.split("\t").map((cell, at) => [reasonColumns[at]!, cell]),
    ) as Record<string, string>;
    return [cells.key!, cells] as const;
  }),
);
const numbers = (cell: string | undefined) =>
  (cell ?? "")
    .split(",")
    .filter(Boolean)
    .map((value) => Number(value));
for (const [question, row] of Object.entries(data.names)) {
  const found = reasonRows.get(rowKey(question, false));
  if (!found) throw new Error(`${question} has no row in question-reasons.tsv`);
  const wanted = {
    principles: {
      for: numbers(found["for-principles"]),
      against: numbers(found["against-principles"]),
    },
    reasons: { for: found["for-reason"]!, against: found["against-reason"]! },
  };
  const now = row as { principles?: unknown; reasons?: unknown };
  if (
    JSON.stringify(now.principles) !== JSON.stringify(wanted.principles) ||
    JSON.stringify(now.reasons) !== JSON.stringify(wanted.reasons)
  ) {
    now.principles = wanted.principles;
    now.reasons = wanted.reasons;
    count("6. a question's sides name the principles that argue them");
  }
}
// 5. More wordings of how a question stands, per law state and side
// (scripts/words/question-today-more.tsv), so the same question in many
// worlds is not told in the same sentence (opening-address-versions; the
// owner: "a ton of different speech versions"). The composer picks among
// them with the bank's own variant pick.
const [moreHeader, ...moreLines] = readFileSync(
  "scripts/words/question-today-more.tsv",
  "utf8",
)
  .trim()
  .split("\n");
const moreColumns = moreHeader!.split("\t");
const more = new Map(
  moreLines.map((line) => {
    const cells = Object.fromEntries(
      line.split("\t").map((cell, at) => [moreColumns[at]!, cell]),
    ) as Record<string, string>;
    return [cells.key!, cells] as const;
  }),
);
for (const [question, row] of Object.entries(data.names)) {
  const found = more.get(rowKey(question, false));
  const wanted = found
    ? {
        without: {
          for: [found["without-for-2"]!, found["without-for-3"]!],
          against: [found["without-against-2"]!, found["without-against-3"]!],
        },
        with: {
          for: [found["with-for-2"]!, found["with-for-3"]!],
          against: [found["with-against-2"]!, found["with-against-3"]!],
        },
      }
    : undefined;
  if (JSON.stringify(row.todayMore) !== JSON.stringify(wanted)) {
    if (wanted) row.todayMore = wanted;
    else delete row.todayMore;
    count("5. a question's other wordings of how it stands are set");
  }
}
data.about = data.about.replace(
  /`today` says how the question stands now:[^.]*\./,
  "`today` says how the question stands now, as each side describes it: `without.for` and `without.against` while no law answers it yes, `with.for` and `with.against` once one does. `family` and `pole` type the belief a speaker gives (speech-outline.ts); `number` is `one` or `many`, for the verbs that agree with `about`; `figures` names the measures that bear on the question and the side each helps.",
);
data.about = data.about.includes("`for`")
  ? data.about
  : `${data.about} Each question also has a form for each side, written by scripts/words/question-sides.ts: \`for\` is what a supporter wants done and \`against\` what an opponent will keep off the books ("keep higher tariffs off the books") and \`repeal\` what they will undo; both read after "I want to" and "I will".`;

writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
for (const [rule, n] of Object.entries(counts).sort())
  console.log(`${String(n).padStart(4)}  ${rule}`);
