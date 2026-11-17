/**
 * Plays an ask to carry a bill, and a sponsor's check on a promised vote or a failed override, in a
 * drawn place and prints every talk whole (Story lead, Nov 17; development tooling like
 * ask-vote-walk.ts, shipped play never imports it).
 *
 *   node --import tsx scripts/words/carry-confirm-walk.ts --seed <word> [--label a] [--part carry|introduced|override|trade] [--days 240] [--body state|town]
 *
 * The place is drawn from all 56 by seed and label. The player sits on the state's lower house
 * where it has two full-person members or more, else the state's other chamber, else the town's
 * largest body (`--body town`). Through the legislature's own writers:
 *  - carry: `askToCarry` from people the player knows (and, where the body has an executive who is
 *    not the player, from the executive, who cannot introduce); each ask is answered with
 *    `answerCarryAsk` and the same person asks again, so the earlier ask is on the record; the
 *    player drafts a bill of their own first (`--own yes`), so the bargain reads;
 *  - introduced: a colleague files a bill and the circumstance `bill-introduced-carry` asks the
 *    player to carry it with them (`office.introduced`);
 *  - override: a colleague's bill passes, the governor vetoes it, and the override falls short
 *    (`--short` votes); the sponsor comes to the player (`vote-confirmed` from `veto-override`);
 *  - trade: colleagues' bills are drafted and the days played until a committee trade comes due
 *    on the floor (`recordPromises`); the member traded with, whom the director watches, gets the
 *    sponsor's `vote-confirmed` talk (`vote-promise`).
 * Each tree is printed with every reply pressed, the facts it leans on and the piece keys said;
 * at the end every line of the Nov 17 rewrite is listed as said or not.
 */
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { seatAct, seatView } from "../../src/bench/legislature";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  stateFloorHolds,
  voteOnStateFloor,
} from "../../src/core2/office-day-state";
import {
  answerCarryAsk,
  askToCarry,
  billOf,
  draftBill,
  castMemberVote,
  executiveOf,
  holdOverride,
  memberKey,
  overridePending,
  members,
} from "../../src/core2/modules/legislature";
import { townSeats } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import { drawPlace } from "../core2-year/place";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const part = option("part", "carry");
const days = Number(option("days", "240"));
const KEYS = [
  "bill",
  "about",
  "stand-for",
  "stand-against",
  "no-stand",
  "carry-ask",
  "asker-same-party",
  "asker-other-party",
  "carried-for-them-before",
  "declined-them-before",
  "earlier-ask",
  "your-bill-waits",
  "your-promise",
  "traded",
  "override",
  "vetoed-by",
  "margin-one",
  "amendment-pending",
  "vote-tonight",
  "count-by",
  "vote-on",
  "vote-next-month",
  "knows-truth",
];

setBookkeeping(false);
const place = drawPlace(seed, `carry-confirm-walk:${label}`);
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where}`);
const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(core);
const full = (officeId: string) =>
  members(api, officeId)
    .map(memberKey)
    .filter((id) => core.people.get(id)?.alive)
    .sort();
const bodies = [
  ...new Map(
    townSeats(api)
      .filter((row) => full(row.office.id).length > 1)
      .map((row) => [row.office.id, row.office] as const),
  ).values(),
];
const town = bodies
  .filter(
    (o) =>
      ["city", "county", "township"].includes(o.level) && full(o.id).length > 2,
  )
  .sort((a, b) => full(b.id).length - full(a.id).length)[0];
const body =
  option("body", "state") === "town"
    ? town
    : (bodies.find((o) => o.level === "state" && o.id.endsWith("-lower")) ??
      bodies.find((o) => o.level === "state") ??
      town);
if (!body) {
  console.log(`SKIP: no body with two full-person members`);
  process.exit(0);
}
const seated = full(body.id);
const defaultMe = (seated.find((id) => id.startsWith("person_")) ??
  seated[0]!) as PersonId;
// `--as <end of a member's id>` plays another member of the body: one the committee trades traded with.
const asEnd = option("as", "");
const me = (
  asEnd ? (seated.find((id) => id.endsWith(asEnd)) ?? defaultMe) : defaultMe
) as PersonId;
core.playerId = me;
for (const id of seated) {
  core.focusPersonIds.add(id as PersonId);
  director.watch(core, id as PersonId);
}
// The circumstances (an override's whip, a hallway ask) reach only a person the player controls.
const player = new BenchPlayer(core, director);
if (part !== "carry") player.select(me);
const mode = new DevMode(core, director, player, place.key);
console.log(
  `# PLAYER ${me} on ${body.id} (${seated.length} full-person members)`,
);
const executiveId = executiveOf(api, body.id).term
  ? memberKey(executiveOf(api, body.id).term!)
  : undefined;
console.log(`# EXECUTIVE ${executiveId ?? "none"}`);
const questions = seatView(core, me).questions;
const colleagues = seated.filter((id) => id !== defaultMe);

const said = new Set<string>();
const note = (parts: readonly string[]) => {
  for (const key of parts) said.add(key);
};
const printTree = (node: TreeNode, ind: string) => {
  for (const l of node.lines) {
    note(l.parts);
    console.log(
      `${ind}${l.speaker} [${l.move}]: ${l.text}   <${l.parts.join(" + ")}>`,
    );
  }
  for (const b of node.branches ?? []) {
    console.log(`${ind}{${b.label}}`);
    printTree(b.node, ind + "  ");
  }
  for (const r of node.replies) {
    note(r.line.parts);
    console.log(
      `${ind}> PRESS [${r.line.move}] ${r.line.speaker}: ${r.line.text}   <${r.line.parts.join(" + ")}>`,
    );
    if (r.next) printTree(r.next, ind + "    ");
  }
  if (node.end) {
    if (node.end.close) note(node.end.close.parts);
    console.log(
      `${ind}[END ${node.end.ending?.id ?? node.end.outcome}]${node.end.close ? ` close: ${node.end.close.text} <${node.end.close.parts.join(" + ")}>` : ""}`,
    );
  }
};
const show = (result: ReturnType<typeof purposeScene>, head: string) => {
  if (result?.kind !== "composed") {
    console.log(`\n## ${head}: not composed (${JSON.stringify(result)})`);
    return false;
  }
  const { scene } = result;
  console.log(
    `\n## ${head}: ${scene.purpose}; facts: ${scene.facts.map((f) => f.key).join(", ")}`,
  );
  for (const f of scene.facts.filter((row) => KEYS.includes(row.key)))
    console.log(`   fact ${f.key} = ${f.text}  [${f.recordIds.join(" ")}]`);
  for (const n of scene.talk.narration) {
    note(n.parts);
    console.log(`Narrator: ${n.text}   <${n.parts.join(" + ")}>`);
  }
  note(scene.talk.state.parts);
  console.log(
    `${scene.talk.state.speaker} [${scene.talk.state.move}]: ${scene.talk.state.text}   <${scene.talk.state.parts.join(" + ")}>`,
  );
  printTree(scene.talk.tree, "  ");
  return true;
};
const stuckShown = new Set<string>();
const shownTrades = new Set<string>();
/** One day on, as the play screen takes it: the player stays the controlled character the circumstances read. */
const day = (n = 1) => {
  if (part === "carry") {
    advanceCore(core, addDays(makeIsoDate(core.date), n));
    return;
  }
  const target = addDays(makeIsoDate(core.date), n);
  for (let guard = 0; guard < 400 && core.date < target; guard += 1) {
    const packet = player.packet;
    if (player.pollingPlace) player.leavePolls();
    else if (packet?.kind === "stop") {
      // The day before a floor roll holds the player for their own vote: they vote yes on it.
      for (const billId of stateFloorHolds(api))
        voteOnStateFloor(api, me, billId, "yes");
      player.resume({ kind: "stop", pauseId: packet.pauseId });
    } else if (packet?.kind === "choice")
      player.resume({ kind: "own-choice", pauseId: packet.pauseId });
    else player.advance("day");
    if (guard === 399 && !stuckShown.has(core.date))
      console.log(
        `# stuck on ${stuckShown.add(core.date) && core.date}: ${JSON.stringify(player.packet)?.slice(180, 700)}`,
      );
  }
};
/** The scene of `typeKey` the director staged from the record whose id contains `causeIncludes`. */
const staged = (typeKey: string, causeIncludes: string) => {
  const book = director.ledger.people.get(me);
  return book?.schedule.find(
    (row) =>
      row.momentId.includes(causeIncludes) &&
      row.bindings.some((b) => b.typeKey === typeKey),
  );
};
const play = (typeKey: string, causeIncludes: string, head: string) => {
  const entry = staged(typeKey, causeIncludes);
  if (!entry) {
    console.log(`\n## ${head}: no ${typeKey} staged from ${causeIncludes}`);
    return false;
  }
  return show(purposeScene(core, director, me, entry, { typeKey }), head);
};
const sectionFor = (index: number) => ({
  kind: "policy-question" as const,
  question: questions[index % questions.length]!,
  value: 1,
});

if (part === "carry") {
  const alive = (ids: Iterable<string>) =>
    [...ids].filter((id) => id !== me && core.people.get(id)?.alive).sort();
  const person = core.people.get(me)!;
  const knows = [...alive(person.familyIds), ...alive(person.knownIds)];
  const askers = [...new Set([...knows, ...colleagues])].slice(0, 40);
  console.log(`# ASKERS ${askers.length} people the player knows or sits with`);
  // The player's own bill first where asked, so the bargain reads.
  if (option("own", "yes") === "yes" && questions.length > 1)
    try {
      const own = seatAct(core, me, {
        kind: "draft",
        officeId: body.id,
        question: questions[questions.length - 1]!,
        value: 1,
      });
      console.log(`# OWN BILL ${own.number}`);
    } catch {
      console.log(`# OWN BILL none`);
    }
  let index = 0;
  const ask = (asker: string, head: string, answer?: boolean) => {
    const row = askToCarry(api, {
      askerId: asker,
      memberId: me,
      bodyOfficeId: body.id,
      provisions: [sectionFor(index)],
    });
    index += 1;
    day();
    const shown = play("bill-carry", row.id, `${head} ${row.id}`);
    if (answer !== undefined) answerCarryAsk(api, row.id, answer);
    return shown;
  };
  // One asker of each kind the records give: a different party, the same party, the executive.
  const tried = new Set<string>();
  for (const asker of askers) {
    if (tried.size >= Number(option("most", "3"))) break;
    const before = said.size;
    ask(asker, `carry (ask ${tried.size + 1}, declined after)`, false);
    tried.add(asker);
    void before;
    // A second ask by the same person: the earlier one is on the record.
    day(3);
    ask(asker, `carry (second ask by the same person, carried after)`, true);
    // A third: the last closed ask was carried.
    if (tried.size === 1) {
      day(3);
      ask(asker, `carry (third ask by the same person, after a carried one)`);
    }
  }
  if (executiveId && executiveId !== me)
    ask(executiveId, "carry by the executive");
} else if (part === "introduced") {
  // A member of the player's body files a bill and asks the player to carry it with them
  // (the circumstance `bill-introduced-carry`, from the `office.introduced` record).
  const sponsor =
    colleagues[Number(option("sponsor", "0")) % colleagues.length]!;
  const bill = draftBill(api, {
    bodyOfficeId: body.id,
    sponsorId: sponsor,
    provisions: [sectionFor(Number(option("question", "0")))],
  });
  console.log(`# FILED ${bill.id} by ${sponsor}`);
  for (let at = 0; at < 10; at += 1) {
    day();
    if (
      play(
        "bill-carry",
        `office.introduced:${bill.id}`,
        `bill-carry (introduced) ${bill.id} on ${core.date}`,
      )
    )
      break;
  }
} else if (part === "override") {
  // A colleague's bill passes, is vetoed, and the override falls short by `--short` votes.
  const short = Number(option("short", "1"));
  const sponsor =
    colleagues[Number(option("sponsor", "0")) % colleagues.length]!;
  const bill = draftBill(api, {
    bodyOfficeId: body.id,
    sponsorId: sponsor,
    provisions: [sectionFor(0)],
  });
  const roster = members(api, body.id).map(memberKey);
  const n = roster.length;
  // Two thirds of the chamber carry an override; one yes under it fails it by one.
  const need = Math.ceil((n * 2) / 3);
  // The bill passes the floor and the executive vetoes it; the veto waits for the player's vote.
  const out = mode.decideAt(bill.id, Math.ceil(n / 3) + 2, {
    sign: false,
    votes: { [me]: "no" },
    chairHears: true,
  });
  console.log(
    `# BILL ${bill.id}: veto ${out.veto}, ending ${JSON.stringify(out.ending)}, override waiting ${overridePending(api, bill.id)}`,
  );
  // A week and a day pass (the floor's own scenes come and go, and the week between circumstance scenes), then the members vote the override:
  // the first `need - short` others yes, the rest and the player no, and the body takes it up.
  day(8);
  const others = roster.filter((id) => id !== me).sort();
  others.forEach((id, index) =>
    castMemberVote(api, bill.id, id, index < need - short ? "yes" : "no", true),
  );
  castMemberVote(api, bill.id, me, "no", true);
  holdOverride(api, bill.id);
  const record = core.durableLog.get(`veto-override:${bill.id}`);
  console.log(`# OVERRIDE RECORD ${JSON.stringify(record?.facts)}`);
  for (let at = 0; at < 4; at += 1) {
    day();
    const book = director.ledger.people.get(me);
    const row = book?.schedule.find((r) =>
      r.momentId.includes(`veto-override:${bill.id}`),
    );
    console.log(
      `# ${core.date}: schedule ${book?.schedule.length}, row ${row ? JSON.stringify({ outcome: row.outcome, held: row.heldBack, types: row.bindings.map((b) => b.typeKey) }) : "none"}`,
    );
    if (
      play(
        "vote-confirmed",
        `veto-override:${bill.id}`,
        `vote-confirmed (override) ${bill.id}`,
      )
    )
      break;
  }
} else if (part === "trade") {
  // Colleagues' bills are drafted on every question the body can pass and the days played until a
  // committee trade comes due on the floor (`recordPromises`, the legislature's own writer). The
  // trade is with a member the director watches; their talk with the sponsor is composed as that
  // member's own `vote-confirmed` scene.
  const trades: string[] = [];
  api.subscribeEvents("carry-confirm-walk", ["vote-promise"], (_, e) => {
    trades.push(e.id);
  });
  questions
    .slice(0, Number(option("bills", "20")))
    .forEach((question, index) => {
      draftBill(api, {
        bodyOfficeId: body.id,
        sponsorId: colleagues[index % colleagues.length]!,
        provisions: [{ kind: "policy-question", question, value: 1 }],
      });
    });
  let shown = 0;
  const wanted = Number(option("most", "1"));
  for (let at = 1; at <= days && shown < wanted; at += 1) {
    day();
    for (const id of trades) {
      const record = core.durableLog.get(id);
      const member = String(record?.facts?.memberId) as PersonId;
      const book = director.ledger.people.get(member);
      const entry = book?.schedule.find(
        (row) =>
          row.momentId.includes(id) &&
          row.bindings.some((b) => b.typeKey === "vote-confirmed"),
      );
      if (!entry || shownTrades.has(id)) continue;
      shownTrades.add(id);
      shown += 1;
      show(
        purposeScene(core, director, member, entry, {
          typeKey: "vote-confirmed",
        }),
        `vote-confirmed (trade) ${id} on ${core.date}, asked member ${member}`,
      );
    }
  }
  console.log(`# ${trades.length} vote-promise records by ${core.date}`);
}
console.log(`\n# DONE ${where}: last day ${core.date}`);
const mine = (
  sceneTalk as unknown as {
    parts: { key: string; text: string; author?: string; date?: string }[];
  }
).parts.filter(
  (row) =>
    row.author === "Story lead's builder, Sonnet" && row.date === "2026-11-17",
);
for (const row of mine)
  console.log(
    `${said.has(row.key) ? "SAID " : "UNSEEN"} ${row.key} | ${row.text}`,
  );
void billOf;
void days;
