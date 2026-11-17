/**
 * Plays a neighbor's invitation to a cause in drawn places and prints every talk whole (Story lead,
 * Nov 17; development tooling like donor-walk.ts, shipped play never imports it).
 *
 *   node --import tsx scripts/words/join-cause-walk.ts --seed <word> [--label a] [--member] [--attend kept|broken] [--seen-out file]
 *
 * The place is drawn from all 56 by seed and label. The player is the bench's own resident; with
 * --member the player sits on the town's largest body and the walk looks for a day when another
 * town body meets the same evening (`sitting-that-night`). Days are played on the player's clock until
 * a town body has a meeting posted ahead (`nextMeetingFacts`, the read a friend's ask shares). The
 * cause is then shared to the player as the drives engine's `share-drive` writes it (HAND-STAGED: the
 * `cause.shared` record, one per recipe: a question the player is for, one they are against, a budget
 * line and an illness; the sharers are the player's own ties). The director stages the scene from it
 * and `purposeScene` composes it. Each tree is printed with every reply pressed, the facts it leans
 * on and the piece keys said. With --attend, the first path ending `joined` is said through the
 * game's own reply (`replyInScene`), the promise it keeps is read by record id, and the days play to
 * the meeting: `kept` leaves the player's mark on it, `broken` takes the mark back. At the end every
 * line of the Nov 17 rewrite is listed as said or not.
 */
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { pairKey } from "../../src/core2/kernel/ids";
import { attendMeeting, meetingOf } from "../../src/core2/modules/office-day";
import { townLean } from "../../src/core2/modules/campaigns";
import { viewOn } from "../../src/core2/modules/views";
import { personLean } from "../../src/core2/campaign-views";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { townSeats } from "../../src/core2/modules/offices";
import { applyCoreEvent, coreAPI } from "../../src/core2/state";
import { causeInviteFacts } from "../../src/director/cause-invite-facts";
import type { PersonId } from "../../src/core2/types";
import { nextMeetingFacts } from "../../src/director/meeting-facts";
import { promisesBetween } from "../../src/director/promises";
import { purposeScene, replyInScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import { allQuestions } from "../../src/english/policy-names";
import { drawPlace } from "../core2-year/place";
import { play } from "../../tests/support/real-borrower";
import { pathTo } from "../../tests/support/promise-play";
import { writeFileSync } from "node:fs";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const flag = (name: string) => process.argv.includes(`--${name}`);
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const attend = option("attend", "");
const seenOut = option("seen-out", "");
const KEYS = [
  "cause",
  "cause-public",
  "meeting",
  "body",
  "meeting-when",
  "item",
  "stand-with",
  "stand-apart",
  "sitting-that-night",
  "title",
  "asked-before",
  "same-day",
  "heard-you",
];

setBookkeeping(false);
const place = drawPlace(seed, `join-cause-walk:${label}`);
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where}`);
const { core, director, playerId } = buildBenchWorld(
  place.seed,
  gameStartDate(),
  { twoLevel: true, placeKey: place.key },
);
const api = coreAPI(core);
const member = flag("member") || flag("office");
const anyOffice = flag("office");
let me = playerId as PersonId;
if (member) {
  // A sitting member of one town body, another town body meeting the same evening: the first full
  // person who holds a seat on a body (a day when the game is not yet on the player's clock, so
  // the calendar's own dates read).
  const holders = [
    ...new Set(
      townSeats(api)
        .filter(
          (row) =>
            ["city", "county", "township"].includes(row.office.level) &&
            row.holder?.personId?.startsWith("person_"),
        )
        .map((row) => row.holder!.personId as PersonId),
    ),
  ].sort();
  const found = holders.find((id) => {
    core.playerId = id;
    const facts = causeInviteFacts(core, "probe", {}, personLean);
    return anyOffice
      ? Boolean(facts.meeting)
      : Boolean(facts["sitting-that-night"]);
  });
  if (!found) {
    console.log(
      `SKIP: no sitting member (of ${holders.length}) has another body meeting the same evening`,
    );
    process.exit(0);
  }
  me = found;
  core.playerId = me;
  const seats = townSeats(api).filter((row) => row.holder?.personId === me);
  console.log(
    `# MEMBER ${me} sits on ${seats.map((row) => `${row.office.title} (${row.office.id})`).join(", ")}`,
  );
}
director.watch(core, me);
core.focusPersonIds.add(me);
const book = director.ledger.people.get(me)!;
const step = () =>
  member
    ? advanceCore(core, addDays(makeIsoDate(core.date), 1))
    : play(core, me, 2);

// The days to a posted meeting (a friend's ask waits for the same).
for (
  let day = 0;
  !member && day < 45 && !nextMeetingFacts(core).meeting;
  day += 2
)
  step();
const ahead = nextMeetingFacts(core);
console.log(
  `# MEETING ${ahead.meeting ? `${ahead.body?.text} ${ahead["meeting-when"]?.text ?? "(no day said)"} ${ahead.meeting.sourceRecordIds[0]}` : "none posted ahead in 45 days"}`,
);
if (!ahead.meeting) {
  console.log("SKIP: nothing for a neighbor to ask");
  process.exit(0);
}

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

// The player's own ties, strongest first: the sharers.
const ties: PersonId[] = [...(core.relationshipsByPerson.get(me) ?? [])]
  .map((id) => core.relationships.get(id)!)
  .map((row) => (row.actorId === me ? row.otherId : row.actorId))
  .filter((id) => {
    const p = core.people.get(id as PersonId);
    return (
      p?.alive &&
      p.id.startsWith("person_") &&
      p.householdId !== core.people.get(me)!.householdId
    );
  })
  .sort() as PersonId[];
const lean = personLean(core.people, core.people.get(me)!, townLean(api));
const view = (q: string) => viewOn(api, me, q, lean);
const questions = allQuestions().sort((a, b) => view(b) - view(a));
const recipes = [
  { name: "question I am for", topic: questions[0]!, change: "enact" },
  {
    name: "question I am against",
    topic: questions[questions.length - 1]!,
    change: "enact",
  },
  {
    name: "budget line",
    topic: "budget-line:naturalResources",
    change: "enact",
  },
  { name: "illness", topic: "health:stroke", change: "enact" },
  {
    name: "budget line the bank has no words for",
    topic: "budget-line:education",
    change: "enact",
  },
  {
    name: "the first sharer asks again",
    topic: questions[1]!,
    change: "enact",
    first: true,
  },
];
console.log(
  `# TIES ${ties.length}; views ${recipes.map((r) => `${r.topic}=${view(r.topic).toFixed(2)}`).join(", ")}`,
);
if (anyOffice && !ties.length)
  // A seated official's circle is thin in a new world: any other full resident shares the cause.
  ties.push(
    ...([...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id.startsWith("person_") &&
          p.id !== me &&
          p.householdId !== core.people.get(me)!.householdId,
      )
      .map((p) => p.id)
      .sort()
      .slice(0, 6) as PersonId[]),
  );
if (!ties.length) {
  console.log("SKIP: the player has no tie outside the household");
  process.exit(0);
}

let attended = false;
recipes.forEach(
  (
    recipe: { name: string; topic: string; change: string; first?: boolean },
    at,
  ) => {
    const sharer = ties[recipe.first ? 0 : at % ties.length]! as PersonId;
    const recordId = `cause.shared:${core.date}:${sharer}:${me}:cause:${recipe.topic}`;
    applyCoreEvent(core, {
      id: recordId,
      date: core.date,
      kind: "cause.shared",
      personIds: [sharer],
      witnessIds: [me],
      placeId: core.people.get(sharer)!.placeId,
      topic: recipe.topic,
      desiredChange: recipe.change,
      stressImpulse: 0.5,
      moodImpulse: -0.5,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Hand-staged shared cause for the join-cause walk.",
      },
    });
    let entry;
    for (let day = 0; day < 7 && !entry; day += 1) {
      step();
      entry = book.schedule.find(
        (row) =>
          row.bindings.some((b) => b.typeKey === "cause-invite") &&
          book.momentsById.get(row.momentId)?.causeId === recordId,
      );
    }
    console.log(`\n## ${recipe.name}: ${recordId} (sharer ${sharer})`);
    if (!entry) {
      console.log("   no cause-invite staged in 14 days of play");
      return;
    }
    const result = purposeScene(core, director, me, entry, {
      typeKey: "cause-invite",
    });
    if (result?.kind !== "composed") {
      console.log(`   not composed ${JSON.stringify(result)}`);
      return;
    }
    const { scene } = result;
    console.log(`   facts: ${scene.facts.map((f) => f.key).join(", ")}`);
    for (const f of scene.facts.filter((row) => KEYS.includes(row.key)))
      console.log(`   fact ${f.key} = ${f.text}  [${f.recordIds.join(" ")}]`);
    for (const o of [scene.talk.open, ...scene.talk.intro]) {
      if (!o) continue;
      note(o.parts);
      console.log(
        `${o.speaker} [${o.move}]: ${o.text}   <${o.parts.join(" + ")}>`,
      );
    }
    for (const n of scene.talk.narration) {
      note(n.parts);
      console.log(`Narrator: ${n.text}   <${n.parts.join(" + ")}>`);
    }
    note(scene.talk.state.parts);
    console.log(
      `${scene.talk.state.speaker} [${scene.talk.state.move}]: ${scene.talk.state.text}   <${scene.talk.state.parts.join(" + ")}>`,
    );
    printTree(scene.talk.tree, "  ");
    console.log(`   gaps: ${JSON.stringify(scene.talk.gaps)}`);
    if (attend && !attended) {
      const path = pathTo(scene.talk.tree, "joined");
      if (!path) return;
      const replyId = replyInScene(core, director, me, entry, path, {
        typeKey: "cause-invite",
      });
      if (!replyId) return;
      attended = true;
      const meetingId = ahead.meeting!.sourceRecordIds[0]!;
      const reply = core.durableLog.get(replyId);
      console.log(
        `\n### JOINED: reply ${replyId}; promise ${JSON.stringify(Object.fromEntries(Object.entries(reply?.facts ?? {}).filter(([k]) => k.startsWith("promise"))))}, promise-meetingId ${reply?.facts?.["promise-meetingId"]} (expected ${meetingId})`,
      );
      const factId = `promise:${replyId}`;
      const find = () =>
        promisesBetween(director.ledger, me, sharer).find(
          (row) => row.id === factId,
        );
      console.log(`    promise ${factId}: ${find()?.outcome}`);
      for (let step = 0; step < 30 && !meetingOf(api, meetingId); step += 1)
        play(core, me, 2);
      const row = meetingOf(api, meetingId);
      console.log(
        `    meeting ${meetingId}: posted ${!!row}, audience ${row?.audience}, with ${JSON.stringify(row?.with)}`,
      );
      if (row && attend === "broken")
        attendMeeting(api, row.officeId, row.date, false);
      const days =
        Math.round(
          (Date.parse(meetingId.slice(-10)) - Date.parse(core.date)) /
            86_400_000,
        ) + 2;
      play(core, me, days);
      const held = core.durableLog.get(`meeting-held:${meetingId}`);
      console.log(
        `    held ${held?.id}; persons ${JSON.stringify(held?.personIds)}; promise ${factId}: ${find()?.outcome} by ${find()?.endedBy} on ${find()?.endedAt}`,
      );
    }
  },
);

const mine = (
  sceneTalk as unknown as {
    parts: {
      key: string;
      text: string;
      author?: string;
      date?: string;
      uses: { purpose?: string }[];
    }[];
  }
).parts.filter(
  (part) =>
    part.author === "Story lead (Fable), drafted by Sonnet" &&
    part.date === "2026-11-17" &&
    part.uses.some((u) => u.purpose === "join-cause"),
);
const out: string[] = [];
for (const part of mine)
  out.push(
    `${said.has(part.key) ? "SAID " : "UNSEEN"} ${part.key} | ${part.text}`,
  );
console.log(`\n# DONE ${where}; last day ${core.date}`);
console.log(out.join("\n"));
if (seenOut) writeFileSync(seenOut, [...said].sort().join("\n") + "\n");
void pairKey;
