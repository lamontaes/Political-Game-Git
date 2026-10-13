/**
 * A batch of real English-engine output for the owner to grade (M4-02).
 * Plays generated lives in the given seeds' places through every new-core
 * surface (the journal, conversations with the lie, scenes, the filing clerk,
 * people bringing things up), captures each line with the bank and variant
 * that wrote it, and keeps one line per template so no two items are alike.
 * Developer tooling only; grading never blocks a merge.
 *
 *   npx tsx src/director/tooling/grading-batch.ts --output <file.md> <seed> ...
 */
import { writeFileSync } from "node:fs";
import { addDays, ageOnDate, makeIsoDate } from "../../simulation/dates";
import type { EngineTextOrigin } from "../../presentation/runtime-text-origin";
import { enrichCivicInputs } from "../../core2/civic-inputs";
import { buildDeepPast } from "../../core2/deep-past";
import { initialFocusPeople } from "../../core2/focus";
import { advanceCore, createLifeCore } from "../../core2/life";
import { buildPopulation } from "../../core2/population";
import { applyCoreEvent, coreAPI } from "../../core2/state";
import { bringItUp } from "../bring-it-up";
import { openConversation, say } from "../conversation";
import { openFilingVisit, pickContest } from "../filing-visit";
import { answerInterview, openInterview } from "../interview";
import { composeJournal, composeLookBack } from "../journal";
import { createDirector } from "../ledger";
import { composeScene } from "../scene";

interface Item {
  bank: string;
  variant: string;
  text: string;
  place: string;
  seed: string;
}
const items: Item[] = [];
let place = "";
let seed = "";
globalThis.__ocdRuntimeText = {
  engine(text: string, origin: EngineTextOrigin) {
    items.push({
      bank: origin.bank,
      variant: origin.variant ?? "",
      text: text.charAt(0).toUpperCase() + text.slice(1),
      place,
      seed,
    });
  },
  world() {},
};

const args = process.argv.slice(2);
const output = args[args.indexOf("--output") + 1]!;
const seeds = args.filter(
  (arg, index) => arg !== "--output" && args[index - 1] !== "--output",
);

for (const drawn of seeds) {
  seed = drawn;
  const input0 = enrichCivicInputs(
    buildDeepPast(
      buildPopulation({
        seed: drawn,
        startedAt: "2021-01-01",
        minimumPeople: 600,
      }),
    ),
  );
  place = input0.placeMetadata?.placeName ?? "";
  const age = (birth: string) =>
    ageOnDate(makeIsoDate(birth), makeIsoDate(input0.startedAt));
  const player = input0.people.find(
    (row) => row.tier !== "husk" && age(row.birthDate) >= 25 && row.jobId,
  )!;
  const input = { ...input0, playerId: player.id };
  const director = createDirector({ watch: [...initialFocusPeople(input)] });
  const core = createLifeCore(input, { modules: [director.module] });
  director.start(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 45), {
    controller: (decision, offers) => {
      if (decision.actorId !== player.id) return undefined;
      const me = core.people.get(player.id)!;
      const visit = offers
        .filter(
          (o) =>
            o.definition.effect === "contact" && !me.familyIds.has(o.targetId),
        )
        .sort((a, b) => (a.targetId < b.targetId ? -1 : 1))[0];
      return visit ? `${visit.definition.id}:${visit.targetId}` : undefined;
    },
  });
  const me = core.people.get(player.id)!;
  composeJournal(core, director, player.id);
  for (const book of director.ledger.people.values())
    for (const entry of book.schedule)
      if (entry.bindings.length)
        composeScene(core, director, book.personId, entry);
  // Conversations with the people the player knows, taking a different
  // choice each turn, and the lie once.
  let lied = false;
  for (const [n, otherId] of [...me.knownIds].entries()) {
    if (n > 12) break;
    const talk = openConversation(core, player.id, otherId);
    for (let turn = 0; turn < 3 && talk.choices.length; turn += 1) {
      if (talk.lie && !lied) {
        say(core, talk, talk.lie.key);
        lied = true;
        break;
      }
      const pick = talk.choices[(n + turn) % talk.choices.length]!;
      say(core, talk, pick.key);
    }
  }
  // The filing clerk, with GOV-shaped records: one office open, one rule unmet.
  const contest = {
    id: `contest:${drawn}`,
    title: "City Council, Seat 3",
    filingDeadline: "2021-03-05",
    sourceIds: ["fixture:calendar"],
  };
  const terms = {
    filedWith: "City Clerk",
    feeMinor: 2500,
    signatures: 50,
    feeInLieuOfSignatures: true,
    source: "fixture",
  };
  pickContest(
    core,
    openFilingVisit(core, player.id, [contest]),
    contest.id,
    terms,
    [],
  );
  pickContest(
    core,
    openFilingVisit(core, player.id, [contest]),
    contest.id,
    terms,
    [
      {
        rule: "minimum-age",
        met: false,
        required: "18",
        actual: "17",
        source: "fixture",
      },
      {
        rule: "residency",
        met: false,
        required: "the city",
        actual: "lives elsewhere",
        source: "fixture",
      },
    ],
  );
  // A campaign interview with GOV-shaped records: two issues, on the record.
  const interview = openInterview(core, player.id, {
    id: `interview:${drawn}`,
    outlet: { id: `outlet:${me.placeId}`, name: "the local paper" },
    contest: { id: contest.id, title: contest.title },
    place: { id: me.placeId, name: place.split(",")[0] ?? place },
    issues: [
      {
        topic: "fixture:park",
        label: "the downtown park",
        change: "build the downtown park",
        desiredChange: "build-park",
        sourceIds: ["fixture:issue-park"],
      },
      {
        topic: "fixture:roads",
        label: "road repairs",
        change: "repave Main Street",
        desiredChange: "repave-main",
        sourceIds: ["fixture:issue-roads"],
      },
    ],
    terms: "on-record",
  });
  for (const answer of ["support", "redirect"]) {
    const pick = interview.choices.find((row) => row.answer === answer);
    if (pick) answerInterview(core, interview, pick.key);
  }
  // A relative moving away and economy events, shaped as their engines emit them.
  const relative = [...me.familyIds].find((id) => {
    const other = core.people.get(id);
    return other?.alive && other.tier !== "husk";
  });
  for (const [kind, ids] of [
    ["person.moved-away", relative ? [relative] : []],
    ["housing.eviction", [player.id]],
    ["housing.purchase", [player.id]],
  ] as const) {
    if (!ids.length) continue;
    applyCoreEvent(core, {
      id: `${kind}:grading:${drawn}`,
      date: core.date,
      kind,
      personIds: [...ids],
      witnessIds: [player.id],
      placeId: me.placeId,
      publicRecord: kind !== "person.moved-away",
      source: { tag: "SOURCED", citation: "fixture", asOf: core.date },
    });
  }
  // Life and civic events in play, shaped as their engines emit them.
  const known = [...me.knownIds]
    .filter((id) => !me.familyIds.has(id) && core.people.get(id)?.alive)
    .sort();
  const [partner, friend, other] = known;
  const office = "City Council, Seat 2";
  const staged: [string, string[], Record<string, string>, string[]][] = [
    ["family.moved-in-together", partner ? [player.id, partner] : [], {}, []],
    ["family.married", partner ? [player.id, partner] : [], {}, []],
    ["family.divorced", partner ? [player.id, partner] : [], {}, []],
    ["health.coverage-lost", [player.id], { from: "employer" }, []],
    ["election-result", [player.id], { office, winnerId: player.id }, []],
    ["took-office", [player.id], { office }, []],
    [
      "legislative-vote",
      [player.id],
      { number: "Ordinance 2026-4", yes: "5", no: "2" },
      [],
    ],
    ["town-hall", [player.id], { hostId: player.id }, []],
    // News a friend saw: someone the player knows got married.
    [
      "family.married",
      other && friend ? [other, partner ?? player.id] : [],
      {},
      friend ? [friend] : [],
    ],
  ];
  staged.forEach(([kind, ids, facts, witnesses], index) => {
    if (!ids.length) return;
    applyCoreEvent(core, {
      id: `${kind}:grading:${drawn}:${index}`,
      date: core.date,
      kind,
      personIds: ids,
      ...(witnesses.length ? { witnessIds: witnesses } : {}),
      placeId: me.placeId,
      publicRecord: true,
      facts,
      source: { tag: "SOURCED", citation: "fixture", asOf: core.date },
    });
    // Each on its own day, so the story keeps their order.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  });
  composeJournal(core, director, player.id);
  if (friend) {
    const talk = openConversation(core, player.id, friend);
    for (let turn = 0; turn < 8 && talk.choices.length; turn += 1) {
      const quiet =
        talk.choices.find((row) => !row.raises) ?? talk.choices.at(-1)!;
      say(core, talk, quiet.key);
    }
  }
  // A closure, brought up along a chain of people.
  const org = core.jobs.get(me.jobId!)!.organizationId;
  const closure = `organization.closed:${org}:${core.date}`;
  applyCoreEvent(core, {
    id: closure,
    date: core.date,
    kind: "organization.closed",
    personIds: [player.id],
    placeId: me.placeId,
    publicRecord: true,
    facts: { [`organization:${org}:status`]: "closed" },
    source: { tag: "SOURCED", citation: "fixture", asOf: core.date },
  });
  let teller = player.id;
  for (let hop = 0; hop < 3; hop += 1) {
    const next = [...core.people.get(teller)!.knownIds].find(
      (id) =>
        !core.knowledgeByPerson.get(id)?.has(`heard:${closure}`) &&
        id !== player.id,
    );
    if (!next) break;
    bringItUp(core, teller, next);
    teller = next;
  }
  coreAPI(core).updatePerson(player.id, { alive: false });
  composeLookBack(core, director, player.id);
}

// One line per template, so no two items are alike.
const seen = new Set<string>();
const batch = items.filter((row) => {
  const key = `${row.bank}|${row.variant}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
const surface = (bank: string) => bank.split(":")[0]!.replaceAll("-", " ");
const lines = [
  "# English engine: grading batch, October 13, 2026",
  "",
  `Real engine output from generated lives in ${[...new Set(batch.map((row) => row.place))].join("; ")} (seeds ${seeds.join(", ")}). Each line is the first one a different template wrote, so no two items are alike. ${batch.length} items${batch.length < 100 ? "; the engine has no more distinct templates yet, so this batch is shorter than 100" : ""}.`,
  "",
  "Grade each line from 1 (wrong or unnatural) to 5 (exactly how a person would say or write it), and add a note where it helps. Grades feed the engine; they never block a merge.",
  "",
  "| # | Where it appears | Line | Grade | Note |",
  "|---|---|---|---|---|",
  ...batch.map(
    (row, index) =>
      `| ${index + 1} | ${surface(row.bank)} | ${row.text.replaceAll("|", "\\|")} |  |  |`,
  ),
  "",
  "<details><summary>Which template wrote each line</summary>",
  "",
  ...batch.map(
    (row, index) =>
      `${index + 1}. \`${row.bank}\` / \`${row.variant}\` (${row.place})`,
  ),
  "",
  "</details>",
  "",
];
writeFileSync(output, lines.join("\n"));
console.log(
  `${batch.length} items from ${items.length} lines written to ${output}`,
);
