/* eslint-disable @typescript-eslint/no-explicit-any -- reads recorded telling inputs */
/**
 * The news writer's gate inputs (the Story lead, Nov 24), built from the
 * six packet worlds' inaugural inputs: the address story's facts are the
 * address's own (the President, the stand, a line of the speech), and a
 * vote story's are the same worlds' law names on a town body, counted three
 * ways. Synthetic beyond the inaugural's facts, so they speak to sentence
 * frames only, which is what the gate measures; a played vote record
 * replaces them when the packet prints one.
 * Run: node --import tsx scripts/sameness/news-inputs.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const fact = (text: string) => ({ text, sourceRecordIds: ["record:gate"] });
const rows: any[] = readFileSync(
  "scripts/sameness/inputs/inaugural-six.jsonl",
  "utf8",
)
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const bodies = [
  "Meadow Town Council",
  "Chipley City Commission",
  "Bethel Select Board",
  "Whitmore Village Board",
  "Roberts City Council",
  "Fairfax County Board",
];
// Most local votes carry with no dissent; a one-vote margin is the rarer
// case (W5, Nov 24: three by-one worlds in six drew half the texts from the
// few by-one lines).
const counts = [
  ["5 to 0", "passed", "no-dissent"],
  ["4 to 1", "passed", "lone-vote"],
  ["3 to 2", "passed", "by-one"],
  ["6 to 0", "passed", "no-dissent"],
  ["1 to 4", "failed", "lone-vote"],
  ["2 to 3", "failed", "by-one"],
];
/** A law's name as the game titles it (bill-names.ts: a bare "{name} {form}", never "the"). */
const titled = (said: string | undefined) => {
  const bare = (said ?? "budget").replace(/^the\s+/i, "");
  return `${bare.replace(/\b[a-z]/g, (c) => c.toUpperCase())} Ordinance`;
};
// The vote body's facts, shaped like the played run (Story lead, Nov 24, Luverne):
// a sponsor on every vote, the one member against a bill that carried, a party
// that is the whole opposition, reasons for and against as clauses with no
// "that", a spoken effective date and the next chamber for some passed bills.
const sponsors = [
  "Brandon Sears",
  "Dana Whit",
  "Maria Lopez",
  "Tom Reyes",
  "Alice Nguyen",
  "Greg Hall",
];
const reasonsFor = [
  "young families need more places to live they can afford",
  "the old rule was costing the town money",
  "residents have waited years for it",
  "the other towns around already did it",
  "it pays for itself within two budgets",
  "the problem gets worse every year it waits",
];
const reasonsAgainst = [
  "the money was never meant for this",
  "the town cannot afford it this year",
  "nobody asked the people it affects",
  "it goes further than the problem needs",
  "the rule is already on the books",
  "it leaves the details to someone else",
];
const against = ["Dana Whit", "Tom Reyes"];
const parties = ["Republican", "Democratic"];
const nextBodies = ["North Dakota Senate", "United States Senate"];
const address: string[] = [];
const vote: string[] = [];
rows.forEach((row, at) => {
  const f = row.facts;
  const name = f.speaker?.text ?? "the President";
  const stance = f["stance-for"] ? "president-for" : "president-against";
  address.push(
    JSON.stringify({
      facts: {
        name: fact(name),
        surname: fact(name.split(" ").at(-1)),
        date: fact("January 20"),
        about: f.about,
        inaugural: fact("yes"),
        [stance]: fact("yes"),
        ...(f["belief-sentence"] ? { quote: f["belief-sentence"] } : {}),
      },
      traits: row.traits,
      momentKey: `news-address:${row.worldSeed}`,
      worldSeed: row.worldSeed,
    }),
  );
  const [count, outcome, margin] = counts[at % counts.length]!;
  vote.push(
    JSON.stringify({
      facts: {
        body: fact(bodies[at % bodies.length]!),
        law: fact(titled(f["law-name"]?.text)),
        purpose: f.about,
        count: fact(count!),
        date: fact("January 14"),
        [outcome!]: fact("yes"),
        [margin!]: fact("yes"),
        sponsor: fact(sponsors[at % sponsors.length]!),
        "reason-for": fact(reasonsFor[at % reasonsFor.length]!),
        "reason-against": fact(
          reasonsAgainst[(at + 1) % reasonsAgainst.length]!,
        ),
        ...(outcome === "passed" && margin === "lone-vote"
          ? {
              "voted-against": fact(against[at % against.length]!),
              "against-alone": fact("yes"),
            }
          : {}),
        ...(outcome === "passed" && margin === "by-one"
          ? {
              "against-bloc": fact("yes"),
              "against-party": fact(parties[at % parties.length]!),
            }
          : {}),
        ...(outcome === "passed" && at % 3 === 0
          ? {
              "next-step": fact("yes"),
              "next-body": fact(nextBodies[at % nextBodies.length]!),
            }
          : {}),
        ...(outcome === "passed" && at % 3 === 1
          ? { "takes-effect": fact("July 1, 2025") }
          : {}),
      },
      traits: row.traits,
      momentKey: `news-roll-call:${row.worldSeed}`,
      worldSeed: row.worldSeed,
    }),
  );
});
writeFileSync(
  "scripts/sameness/inputs/news-address-six.jsonl",
  `${address.join("\n")}\n`,
);
writeFileSync(
  "scripts/sameness/inputs/news-roll-call-six.jsonl",
  `${vote.join("\n")}\n`,
);
