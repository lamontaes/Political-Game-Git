/**
 * Plays the donor's call in a drawn place and prints every talk whole (Story lead, Nov 17; development
 * tooling like door-walk.ts, shipped play never imports it).
 *
 *   node --import tsx scripts/words/donor-walk.ts --seed <word> [--label a] [--unseated] [--state] [--gifts 3]
 *
 * The place is drawn from all 56 by seed and label. Bills are drafted before the body of a race counted
 * in the year (as donor-ask-scene.test.ts does), the player (a sitting member of that body, else a
 * resident who files) campaigns to the night before the count, and each gift that became a moment for
 * them is composed with purposeScene. The gift's own record is then composed again for each variant
 * (.large, .small, .friend, .again) by setting the size, share and earlier asks the variant reads, so
 * every tree of the family is printed with every reply pressed, the facts it leans on and the piece
 * keys said. It ends by listing which of the new lines were seen said and which were not.
 */
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { seatView } from "../../src/bench/legislature";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { billCatalog, provisionFor } from "../../src/core2/bill-catalog";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { closenessBetween } from "../../src/core2/closeness";
import {
  askForDonation,
  giftsToCampaign,
} from "../../src/core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
} from "../../src/core2/modules/elections";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
  draftBill,
  memberKey,
  members,
} from "../../src/core2/modules/legislature";
import { townSeats } from "../../src/core2/modules/offices";
import { filingClerkFor } from "../../src/core2/modules/filing-clerk";
import { lawChain } from "../../src/core2/modules/laws";
import { coreAPI, applyCoreEvent } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import { type TreeNode } from "../../src/director/scene-talk";
import variantFile from "../../src/director/data/arc-variants.json" with { type: "json" };
import bank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { drawPlace } from "../core2-year/place";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const unseated = process.argv.includes("--unseated");
// A state legislature, whose bills go to committees and two chambers, in place of the town's own board.
const state = process.argv.includes("--state");
const giftCount = Number(option("gifts", "3"));
const seenOut = option("seen-out", "");
const YEAR = 365;

setBookkeeping(false);
const place = drawPlace(seed, `donor-walk:${label}`);
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where}`);
const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(core);
const end = addDays(makeIsoDate(core.date), YEAR);
const counted = (race: ContestRow) =>
  addDays(makeIsoDate(race.electionDate), 1) <= end;
const open = () =>
  [...openContests(api)]
    .filter(counted)
    .sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    );
for (let day = 0; !open().length && day < YEAR; day += 7)
  advanceCore(core, addDays(makeIsoDate(core.date), 7));
const race = open().find(
  (row) =>
    (state ? row.level === "state" : row.level !== "state") &&
    row.level !== "federal" &&
    townSeats(api).some(
      (seat) =>
        seat.office.id === row.officeId &&
        members(api, row.officeId).length > 1,
    ),
);
if (!race) {
  console.log("SKIP: no council or board race open for filing in the year");
  process.exit(0);
}
const body = members(api, race.officeId);
const sponsor = body[0]!;
const policies = billCatalog(api, race.level as "city" | "county" | "state")
  .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
  .filter((row) => row.kind === "policy-question" && row.authority.allowed)
  .slice(0, 6);
for (const policy of policies)
  draftBill(api, {
    bodyOfficeId: race.officeId,
    sponsorId: memberKey(sponsor),
    provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
  });
const clerkId = filingClerkFor(api, race.id)?.personId;
const town = lawChain(api).townPlaceId;
let candidateId: PersonId | undefined;
let filingId = "";
// A sitting member of the body files for it again; else a resident of the town files.
if (!unseated)
  for (const term of body) {
    const person = core.people.get(memberKey(term) as PersonId);
    if (!person?.alive || !seatView(core, person.id).bodies.length) continue;
    director.watch(core, person.id);
    const filed = fileCandidacy(api, {
      personId: person.id,
      contestId: race.id,
      platform: [],
    });
    if (["petitioning", "on-ballot"].includes(filed.status ?? "")) {
      candidateId = person.id;
      filingId = filed.filing.id;
      break;
    }
  }
if (!candidateId)
  for (const p of [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.id !== clerkId &&
        p.placeId === town &&
        ageOnDate(p.birthDate, core.date) >= 18 &&
        !members(api, race.officeId).some((t) => memberKey(t) === p.id),
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 12)) {
    director.watch(core, p.id);
    const filed = fileCandidacy(api, {
      personId: p.id,
      contestId: race.id,
      platform: [],
    });
    if (["petitioning", "on-ballot"].includes(filed.status ?? "")) {
      candidateId = p.id as PersonId;
      filingId = filed.filing.id;
      break;
    }
  }
if (!candidateId) {
  console.log("SKIP: nobody could file");
  process.exit(0);
}
core.playerId = candidateId;
const seated = body.some((t) => memberKey(t) === candidateId);
console.log(
  `# PLAYER ${candidateId}, ${seated ? "a sitting member of the body" : "a resident who files"}; race ${race.id} on ${race.electionDate}`,
);
// The campaign asks the town for money, as the campaign engine's own ask does, on two days
// forty days apart, so the bills have been heard in between; the gifts that come are the
// donors' own (their warmth and their cash decide who gives).
const residents = [...core.people.values()]
  .filter(
    (p) =>
      p.alive &&
      p.id !== candidateId &&
      p.placeId === town &&
      ageOnDate(p.birthDate, core.date) >= 18,
  )
  .sort((a, b) => a.id.localeCompare(b.id));
const askAll = () => {
  let gave = 0;
  for (const p of residents)
    if (askForDonation(api, filingId, p.id) > 0) gave += 1;
  console.log(
    `# ${gave} of ${residents.length} residents gave on ${core.date}`,
  );
};
const book = director.ledger.people.get(candidateId)!;
const gifts = () =>
  [...core.durableLog.values()].filter(
    (row) =>
      row.kind === "campaign-gift" &&
      row.facts?.candidateId === candidateId &&
      book.moments.some((moment) => moment.causeId === row.id),
  );
const printTree = (node: TreeNode, ind: string) => {
  for (const l of node.lines)
    console.log(`${ind}${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`);
  for (const r of node.replies) {
    console.log(
      `${ind}> YOU press [${r.line.move}]: ${r.line.text}   <${r.line.parts.join(" + ")}>`,
    );
    const next = r.next;
    if (!next) continue;
    // A lie is answered by what the asker holds: each branch is printed, the one that plays first.
    if (next.branches?.length) {
      for (const l of next.lines)
        console.log(
          `${ind}    ${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`,
        );
      for (const branch of next.branches) {
        console.log(`${ind}    (${branch.label})`);
        printTree(branch.node, `${ind}      `);
      }
    } else printTree(next, ind + "    ");
  }
  if (node.end)
    console.log(
      `${ind}[END ${node.end.ending?.id}]${node.end.close ? ` close: ${node.end.close.text} <${node.end.close.parts.join(" + ")}>` : ""}`,
    );
};
const said = new Set<string>();
const collect = (node: TreeNode) => {
  for (const l of node.lines) l.parts.forEach((k) => said.add(k));
  if (node.end?.close) node.end.close.parts.forEach((k) => said.add(k));
  for (const r of node.replies) {
    r.line.parts.forEach((k) => said.add(k));
    if (!r.next) continue;
    for (const l of r.next.lines) l.parts.forEach((k) => said.add(k));
    if (r.next.branches?.length)
      for (const branch of r.next.branches) collect(branch.node);
    else collect(r.next);
  }
};
const KEYS = [
  "donor-bill",
  "about",
  "employer",
  "side-for",
  "side-against",
  "gift-first",
  "gift-biggest",
  "gift-smallest",
  "gift-weight",
  "stand-with",
  "stand-apart",
  "your-side",
  "bill-filed",
  "bill-held",
  "bill-heard",
  "bill-one-house",
  "bill-on-desk",
  "bill-stage",
  "votes-on-it",
  "knows-truth",
  "source",
  "kin",
  "acquainted",
  "stranger",
  "tie-friend",
  "tie-rival",
  "asked-before",
];
let composed = 0;
const compose = (momentId: string, head: string) => {
  const entry = book.schedule.find((row) => row.momentId === momentId);
  if (!entry) return;
  const result = purposeScene(core, director, candidateId!, entry, {
    typeKey: "donor-ask",
  });
  if (result?.kind !== "composed") {
    console.log(`\n## ${head}: ${JSON.stringify(result)}`);
    return;
  }
  composed += 1;
  const { scene } = result;
  console.log(
    `\n## ${head}: purpose ${scene.purpose}; scores ${JSON.stringify(scene.variant?.scores.map((s) => `${s.variant}:${s.score.toFixed(2)}`))}`,
  );
  for (const f of scene.facts.filter((row) => KEYS.includes(row.key)))
    console.log(`   fact ${f.key} = ${f.text}  [${f.recordIds.join(" ")}]`);
  for (const n of scene.talk.narration) console.log(`Narrator: ${n.text}`);
  if (scene.talk.open)
    console.log(`${scene.talk.open.speaker}: ${scene.talk.open.text}`);
  console.log(
    `${scene.talk.state.speaker}: ${scene.talk.state.text}   <${scene.talk.state.parts.join(" + ")}>`,
  );
  printTree(scene.talk.tree, "  ");
  collect(scene.talk.tree);
  scene.talk.narration.forEach((n) => n.parts.forEach((k) => said.add(k)));
  scene.talk.state.parts.forEach((k) => said.add(k));
  scene.talk.open?.parts.forEach((k) => said.add(k));
  if (scene.talk.gaps.length)
    console.log(`   GAPS: ${scene.talk.gaps.join("; ")}`);
};
/**
 * The same gift read another way: a copy of the gift's record and its moment (a development probe,
 * never play) with the size or the donor changed, so the variants and the donors the gifts table holds
 * are each composed by the one scene builder from a record of the same shape.
 */
let copies = 0;
const copyOf = (
  gift: ReturnType<typeof gifts>[number],
  change: {
    facts?: Record<string, string>;
    donorId?: string;
    date?: string;
  },
) => {
  const entry = book.schedule.find(
    (row) => book.momentsById.get(row.momentId)?.causeId === gift.id,
  )!;
  const moment = book.momentsById.get(entry.momentId)!;
  copies += 1;
  const id = `${gift.id}~copy${copies}`;
  const donorId = change.donorId ?? String(gift.facts!.donorId);
  core.durableLog.set(id, {
    ...gift,
    id,
    personIds: [candidateId!, donorId as PersonId],
    ...(change.date ? { date: change.date } : {}),
    facts: { ...gift.facts!, ...change.facts, donorId },
  } as typeof gift);
  const momentId = `${moment.id}~copy${copies}`;
  book.momentsById.set(momentId, { ...moment, id: momentId, causeId: id });
  const bindings = JSON.parse(
    JSON.stringify(entry.bindings),
  ) as typeof entry.bindings;
  for (const binding of bindings)
    for (const role of binding.roles)
      if (role.role === "donor") role.personIds = [donorId as PersonId];
  book.schedule.push({ ...entry, momentId, bindings });
  return momentId;
};
const seenDonors = new Set<string>();
const sweep = (limit: number) => {
  for (const gift of gifts()) {
    if (seenDonors.size >= limit) break;
    const donorId = String(gift.facts!.donorId);
    if (seenDonors.has(donorId)) continue;
    seenDonors.add(donorId);
    compose(
      book.moments.find((m) => m.causeId === gift.id)!.id,
      `as it came: ${gift.id}`,
    );
  }
};
askAll();
advanceCore(core, addDays(makeIsoDate(core.date), 1));
sweep(giftCount);
const base = gifts()[0];
if (base) {
  const amountOf = (n: number, outside: number) => ({
    amountMinor: String(n),
    totalMinor: String(n),
    share: String(n / outside),
  });
  compose(
    copyOf(base, { facts: amountOf(900000000, 1000000000) }),
    "the same gift read as a large one",
  );
  compose(
    copyOf(base, { facts: amountOf(2500, 1000000) }),
    "the same gift read as a small one",
  );
  // The closest tie the player has in the town gives: the friend's ask.
  const closest = residents
    .map((p) => ({ p, level: closenessBetween(core, candidateId!, p.id) }))
    .sort((a, b) => b.level - a.level || a.p.id.localeCompare(b.p.id))[0];
  if (closest)
    compose(
      copyOf(base, {
        donorId: closest.p.id,
        facts: amountOf(300000, 1000000),
      }),
      `the closest tie in town gives (closeness ${closest.level.toFixed(2)})`,
    );
  // Donors the campaign's gifts table holds, each composed as that donor's gift.
  const rows = giftsToCampaign(api, filingId)
    .filter(
      (row) =>
        !row.donorId.startsWith("outside:") && row.donorId !== candidateId,
    )
    .sort((a, b) => b.totalMinor - a.totalMinor);
  const outside = rows.reduce((sum, row) => sum + row.totalMinor, 0);
  const pick = [
    ...rows.slice(0, 2),
    ...rows.slice(-2),
    ...rows.slice(Math.floor(rows.length / 2), Math.floor(rows.length / 2) + 2),
  ];
  for (const row of pick)
    compose(
      copyOf(base, {
        donorId: row.donorId,
        facts: amountOf(row.totalMinor, outside),
      }),
      `donor ${row.donorId}'s gift`,
    );
  // The candidate put the first donor off twice before: the same donor asks again.
  const again = String(base.facts!.donorId);
  for (const n of [1, 2])
    applyCoreEvent(core, {
      id: `walk-put-off-${n}`,
      date: core.date,
      kind: "scene.reply",
      personIds: [candidateId, again as PersonId],
      placeId: core.people.get(candidateId)!.placeId,
      facts: { typeKey: "donor-ask", ending: "put-off", causeId: `old-${n}` },
      source: {
        tag: "SOURCED",
        citation: "Recorded scene: the reply the player chose to say.",
        asOf: core.date,
      },
    });
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  compose(
    copyOf(base, { facts: amountOf(300000, 1000000), date: core.date }),
    "the same donor asks again (two earlier asks put off)",
  );
}
// The plain arc (the one with a lie in it) plays where no variant's reads and the asker's temper
// outweigh it, so the donors whose own temper pulls least toward every variant are asked in the middle
// of the range.
const pulls = Object.values(
  (
    variantFile as unknown as {
      families: Record<
        string,
        { variants: Record<string, { pull?: string[] }> }
      >;
    }
  ).families["donor-ask"]!.variants,
).flatMap((row) => (row.pull ? [row.pull] : []));
const mostPulled = (id: PersonId) =>
  Math.max(
    ...pulls.map(
      (facets) =>
        facets.reduce(
          (sum, key) => sum + (core.people.get(id)!.traits[key] ?? 0),
          0,
        ) / facets.length,
    ),
  );
const plainGifts = () => {
  const gift = gifts()[0];
  if (!gift) return;
  const donors = residents
    .filter(
      (p) =>
        p.livingCostDailyMinor > 0 &&
        closenessBetween(core, candidateId!, p.id) < 0.3,
    )
    .sort(
      (a, b) =>
        mostPulled(a.id as PersonId) - mostPulled(b.id as PersonId) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 6);
  for (const p of donors)
    compose(
      copyOf(gift, {
        donorId: p.id,
        facts: { amountMinor: "300000", totalMinor: "300000", share: "0.2" },
      }),
      `a donor whose temper pulls least, asked in the middle of the range (${p.id})`,
    );
};
// Donors by how they stand with the player and what they hold: the people the player has ties
// with, a retiree with no job, and a gift that names no bill, each composed as that donor's gift.
const kinds = () => {
  const gift = gifts()[0];
  if (!gift) return;
  const mid = { amountMinor: "300000", totalMinor: "300000", share: "0.2" };
  const tied = new Set<string>();
  for (const id of core.relationshipsByPerson.get(candidateId!) ?? []) {
    const row = core.relationships.get(id);
    if (!row) continue;
    const other = row.actorId === candidateId ? row.otherId : row.actorId;
    if (core.people.get(other as PersonId)?.alive) tied.add(other);
  }
  for (const other of [...tied].sort().slice(0, 6))
    compose(
      copyOf(gift, { donorId: other, facts: mid }),
      `a donor the player has a tie with (${other})`,
    );
  for (const p of residents.filter((p) => !p.jobId).slice(0, 2))
    compose(
      copyOf(gift, { donorId: p.id, facts: mid }),
      `a donor with no job (${p.id})`,
    );
  for (const p of residents.slice(0, 2))
    compose(
      copyOf(gift, {
        donorId: p.id,
        facts: { ...mid, billId: "", number: "" },
      }),
      `a gift that names no bill (${p.id})`,
    );
};
// Earlier scenes with two other donors: one the player helped, one the player turned away.
const earlier = () => {
  const gift = gifts()[0];
  if (!gift) return;
  const [helped, refused] = residents
    .filter((p) => p.id !== String(gift.facts!.donorId))
    .slice(10, 12);
  if (!helped || !refused) return;
  for (const [who, move] of [
    [helped, "agree"],
    [refused, "decline"],
  ] as const)
    applyCoreEvent(core, {
      id: `walk-earlier-${who.id}`,
      date: core.date,
      kind: "scene.reply",
      personIds: [candidateId!, who.id as PersonId],
      placeId: core.people.get(candidateId!)!.placeId,
      facts: { typeKey: "donor-ask", move, causeId: `old-${who.id}` },
      source: {
        tag: "SOURCED",
        citation: "Recorded scene: the reply the player chose to say.",
        asOf: core.date,
      },
    });
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const mid = { amountMinor: "300000", totalMinor: "300000", share: "0.2" };
  for (const who of [helped, refused])
    compose(
      copyOf(gift, { donorId: who.id, facts: mid, date: core.date }),
      `a donor the player ${who === helped ? "helped" : "turned away"} before (${who.id})`,
    );
};
// The donors at the two ends of the gifts table, each read as the variant their gift gives, and
// the closest ties and several donors put off before, so the ask of every variant is composed from
// more than one donor.
const variants = () => {
  const gift = gifts()[0];
  if (!gift) return;
  const rows = giftsToCampaign(api, filingId)
    .filter(
      (row) =>
        !row.donorId.startsWith("outside:") && row.donorId !== candidateId,
    )
    .sort((a, b) => b.totalMinor - a.totalMinor);
  const size = (n: number, share: number) => ({
    amountMinor: String(n),
    totalMinor: String(n),
    share: String(share),
  });
  for (const row of rows.slice(0, 3))
    compose(
      copyOf(gift, { donorId: row.donorId, facts: size(900000000, 0.9) }),
      `the biggest givers, read as large (${row.donorId})`,
    );
  // The biggest giver is asked about again and again, so each of the variant's answers is said.
  for (let n = 1; n <= 10 && rows[0]; n += 1)
    compose(
      copyOf(gift, { donorId: rows[0].donorId, facts: size(900000000, 0.9) }),
      `the biggest giver, read as large again (${n})`,
    );
  for (const row of rows.slice(-3))
    compose(
      copyOf(gift, { donorId: row.donorId, facts: size(2500, 0.01) }),
      `the smallest givers, read as small (${row.donorId})`,
    );
  const close = residents
    .map((p) => ({ p, level: closenessBetween(core, candidateId!, p.id) }))
    .sort((a, b) => b.level - a.level || a.p.id.localeCompare(b.p.id))
    .slice(1, 5);
  for (const { p, level } of close)
    compose(
      copyOf(gift, { donorId: p.id, facts: size(300000, 0.2) }),
      `a close tie gives (closeness ${level.toFixed(2)}, ${p.id})`,
    );
  const back = [
    ...residents.filter((p) => p.jobId).slice(20, 22),
    ...residents.filter((p) => !p.jobId).slice(0, 2),
  ];
  for (const who of back)
    for (const n of [1, 2])
      applyCoreEvent(core, {
        id: `walk-back-${who.id}-${n}`,
        date: core.date,
        kind: "scene.reply",
        personIds: [candidateId!, who.id as PersonId],
        placeId: core.people.get(candidateId!)!.placeId,
        facts: {
          typeKey: "donor-ask",
          ending: "put-off",
          causeId: `old-${who.id}-${n}`,
        },
        source: {
          tag: "SOURCED",
          citation: "Recorded scene: the reply the player chose to say.",
          asOf: core.date,
        },
      });
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  for (const who of back)
    compose(
      copyOf(gift, {
        donorId: who.id,
        facts: size(300000, 0.2),
        date: core.date,
      }),
      `a donor put off twice asks again (${who.id})`,
    );
};
// The same donor asks about each bill before the body, wherever it has got to.
const bodyBills = () =>
  (
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as BillRow[]
  )
    .filter((row) => row.bodyOfficeId === race.officeId && row.number)
    .sort((a, b) => a.id.localeCompare(b.id));
const eachBill = (when: string) => {
  const gift = gifts()[0];
  if (!gift) return;
  for (const row of bodyBills().slice(0, 8))
    compose(
      copyOf(gift, { facts: { billId: row.id, number: row.number ?? "" } }),
      `${when}: the donor asks about ${row.number} (${row.status})`,
    );
};
plainGifts();
variants();
kinds();
earlier();
eachBill("at the start");
// Weeks on, the bills have been heard or held, and the campaign asks again.
for (let round = 0; round < 3; round += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 45));
  askAll();
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  sweep(giftCount * (round + 2));
  eachBill(`${core.date}`);
}
console.log(`\n# ${composed} talks composed`);
const mine = (
  bank as unknown as {
    parts: {
      key: string;
      text: string;
      date?: string;
      author?: string;
      uses: { purpose?: string }[];
    }[];
  }
).parts.filter(
  (p) =>
    p.date === "2026-11-17" &&
    p.author?.startsWith("Story lead (Fable), drafted by Sonnet") &&
    p.uses.some((u) => String(u.purpose).startsWith("donor-ask")),
);
const seen = mine.filter((p) => said.has(p.key));
if (seenOut) writeFileSync(seenOut, JSON.stringify([...said].sort()));
console.log(`\n# NEW LINES SEEN SAID ${seen.length} of ${mine.length}`);
for (const p of mine.filter((p) => !said.has(p.key)))
  console.log(`   unseen: ${p.text}  <${p.key}>`);
console.log(`# DONE ${where}; ${ELECTIONS_MODULE_ID}`);
