/**
 * Plays a colleague's ask for a vote, and the player's own, in a drawn place and prints every
 * talk whole (Story lead, Nov 17; development tooling like door-walk.ts, shipped play never
 * imports it).
 *
 *   node --import tsx scripts/words/ask-vote-walk.ts --seed <word> [--label a] [--days 240] [--body state|town] [--most 1]
 *
 * The place is drawn from all 56 by seed and label. The player sits on the state's lower house
 * where it has two full-person members or more, else the state's other chamber, else the town's
 * largest body (`--body town` takes the town's largest body of three or more), and drafts a bill on each question the body can pass. Days are played one at a
 * time; the evening before a floor vote the legislature's own count (`askBeforeTheRoll`) writes a
 * `vote-ahead` record for each member a short bill needs. The first that asks the player (a
 * colleague's bill) is composed as `vote-asked` for the plain arc and each variant by name
 * (arc-variant `play`, dev mode's route), and the first that has the player ask (the player's
 * bill) as `vote-sought`. Each tree is printed with every reply pressed, the facts it leans on and
 * the piece keys said; at the end, every line of the Nov 17 rewrite is listed as said or not.
 */
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { seatAct, seatView } from "../../src/bench/legislature";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  billOf,
  memberKey,
  members,
} from "../../src/core2/modules/legislature";
import { townSeats } from "../../src/core2/modules/offices";
import { votesOf } from "../../src/core2/modules/people";
import { coreAPI } from "../../src/core2/state";
import type { CoreEventInput, PersonId } from "../../src/core2/types";
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
const days = Number(option("days", "240"));
/** How many asks of each kind to play. */
const most = Number(option("most", "1"));
const VARIANTS = ["plain", "whip", "watched", "friend", "trade"];
const KEYS = [
  "bill",
  "about",
  "stand",
  "stand-against",
  "count-one",
  "count-several",
  "voted-with-before",
  "voted-against-before",
  "vote-tomorrow",
  "vote-today",
  "read-same-party",
  "read-town-for-bill",
  "read-town-against-bill",
  "their-bill",
  "earlier",
  "knows-truth",
];

setBookkeeping(false);
const place = drawPlace(seed, `ask-vote-walk:${label}`);
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
// A member who is a filled-in person, as dev mode's Play as picks one.
const me = (seated.find((id) => id.startsWith("person_")) ??
  seated[0]!) as PersonId;
core.playerId = me;
for (const id of seated) {
  core.focusPersonIds.add(id as PersonId);
  director.watch(core, id as PersonId);
}
console.log(
  `# PLAYER ${me} on ${body.id} (${seated.length} full-person members)`,
);
const drafted = seatView(core, me)
  .questions.slice(0, 6)
  .flatMap((question) => {
    try {
      return [
        seatAct(core, me, {
          kind: "draft",
          officeId: body.id,
          question,
          value: 1,
        }).number,
      ];
    } catch {
      return [];
    }
  });
console.log(`# DRAFTED ${drafted.join(", ") || "none"}`);
const asks: CoreEventInput[] = [];
api.subscribeEvents("ask-vote-walk", ["vote-ahead"], (_, e) => {
  asks.push(e);
});

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

const staged = (ask: CoreEventInput, personId: PersonId, typeKey: string) =>
  director.ledger.people
    .get(personId)
    ?.schedule.find(
      (row) =>
        row.momentId.includes(ask.id) &&
        row.bindings.some((b) => b.typeKey === typeKey),
    );
let asked = 0;
let sought = 0;
const done = new Set<string>();
for (let day = 1; day <= days && (asked < most || sought < most); day += 1) {
  advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
  for (const ask of asks) {
    if (done.has(ask.id) || String(ask.facts?.floorDate) <= core.date) continue;
    if (billOf(api, String(ask.facts?.billId))?.status !== "drafted") continue;
    const askedId = String(ask.facts?.askedId) as PersonId;
    const askerId = String(ask.facts?.askerId) as PersonId;
    // What the asked member's vote record holds on the sponsor's earlier bills (the read behind
    // voted-with-before and voted-against-before).
    const onTheirs = () =>
      votesOf(api, askedId).filter(
        (row) =>
          row.billId !== String(ask.facts?.billId) &&
          billOf(api, row.billId)?.sponsorId === askerId,
      ).length;
    if (askedId === me && asked < most) {
      const entry = staged(ask, me, "vote-asked");
      if (!entry) continue;
      done.add(ask.id);
      asked += 1;
      for (const variant of VARIANTS)
        show(
          purposeScene(core, director, me, entry, {
            typeKey: "vote-asked",
            variant,
          }),
          `vote-asked (${variant}) ${ask.id} on ${core.date}, asked list ${String(ask.facts?.asked)}; the player's record holds ${votesOf(api, askedId).length} votes, ${onTheirs()} on the sponsor's earlier bills`,
        );
    } else if (askerId === me && sought < most) {
      const entry = staged(ask, me, "vote-sought");
      if (!entry) continue;
      done.add(ask.id);
      sought += 1;
      show(
        purposeScene(core, director, me, entry, { typeKey: "vote-sought" }),
        `vote-sought ${ask.id} on ${core.date}, asked list ${String(ask.facts?.asked)}; the colleague's record holds ${votesOf(api, askedId).length} votes, ${onTheirs()} on the player's earlier bills`,
      );
    }
  }
}
const mine = (
  sceneTalk as unknown as {
    parts: { key: string; text: string; author?: string; date?: string }[];
  }
).parts.filter(
  (part) =>
    part.author === "Story lead (Fable), drafted by Opus" &&
    part.date === "2026-11-17",
);
console.log(
  `\n# DONE ${where}: vote-asked ${asked}, vote-sought ${sought}; last day ${core.date}; ${asks.length} vote-ahead records, ${asks.filter((e) => e.facts?.askedId === me).length} asking the player, ${asks.filter((e) => e.facts?.askerId === me).length} by the player`,
);
for (const part of mine)
  console.log(
    `${said.has(part.key) ? "SAID " : "UNSEEN"} ${part.key} | ${part.text}`,
  );
