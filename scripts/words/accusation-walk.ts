/**
 * Plays the accusation scene in a drawn place and prints every talk whole (Story lead, Nov 17;
 * development tooling like bribe-walk.ts, shipped play never imports it).
 *
 *   node --import tsx scripts/words/accusation-walk.ts --seed <word> [--label a] [--seen-out file]
 *
 * The place is drawn from all 56 by seed and label. The player is seated on the town's body with a
 * bill before it, and two cases are staged:
 *
 * (a) a player who took a bribe: dev mode's own bribe (`DevMode.forceBribe`, which runs the
 *     corruption engine's `considerBribe`) is offered to the player, the player's accept is written
 *     through the scene's own reply writer (`replyInScene`, ending took-it), and the corruption
 *     engine takes it. Colleagues are then told of it by the corruption engine's own record of a
 *     telling (`crime.told`, written here by hand and labeled), which the justice engine reads and
 *     answers with its own `justice.accused` complaint naming the player; a colleague made a close
 *     friend first reaches the friend's arc, the others the hearsay arc or the taken one.
 * (b) a player who offered a bribe that was refused: dev mode's bribe the other way, the official
 *     reports it (the justice engine's own witness complaint), and further colleagues are told.
 *     The crime was not taken, so a denial of a payment is true.
 *
 * The base arc (a complaint with no complaint record) and the printed story's scene are read from
 * copies of the cause record (a development probe, labeled). Every tree is printed with every
 * reply pressed, the facts the lines lean on and the piece keys said; it ends listing which of
 * the new lines were seen said and which were not.
 */
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { BenchPlayer } from "../../src/bench/player";
import { DevMode } from "../../src/bench/dev-mode";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { billCatalog, provisionFor } from "../../src/core2/bill-catalog";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { closenessBetween } from "../../src/core2/closeness";
import {
  draftBill,
  memberKey,
  members,
} from "../../src/core2/modules/legislature";
import { townSeats } from "../../src/core2/modules/offices";
import { BRIBE_OFFERED, crimeRecord } from "../../src/core2/modules/corruption";
import { lawChain } from "../../src/core2/modules/laws";
import { leakToReporter, outletsHere } from "../../src/core2/modules/press";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene, replyInScene } from "../../src/director/purpose-scene";
import { playedNode, type TreeNode } from "../../src/director/scene-talk";
import bank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { drawPlace } from "../core2-year/place";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const seenOut = option("seen-out", "");
const COPIES = Number(option("copies", "4"));

setBookkeeping(false);
const place = drawPlace(seed, `accusation-walk:${label}`);
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where}`);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core, director } = world;
const api = coreAPI(core);
const dev = new DevMode(
  core,
  director,
  new BenchPlayer(core, director),
  world.placeId,
);
const day = (n: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), n));

const KEYS = [
  "wanted",
  "bill",
  "contract",
  "complaint-of",
  "took-it",
  "source",
  "knows-truth",
  "in-chamber",
  "outlet",
  "read-complaint",
  "read-close",
  "read-told",
  "read-witnessed",
  "read-bribe-taken",
];
const said = new Set<string>();
let composed = 0;
const printTree = (node: TreeNode, ind: string) => {
  for (const l of node.lines)
    console.log(`${ind}${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`);
  for (const r of node.replies) {
    console.log(
      `${ind}> YOU press [${r.line.move}]: ${r.line.text}   <${r.line.parts.join(" + ")}>`,
    );
    const next = r.next;
    if (!next) continue;
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
const entryOf = (playerId: PersonId, causeId: string) => {
  const book = director.ledger.people.get(playerId);
  return book?.schedule.find(
    (row) => book.momentsById.get(row.momentId)?.causeId === causeId,
  );
};
/** The scene a cause record gives the player, composed by the one scene builder and printed. */
const compose = (
  playerId: PersonId,
  causeId: string,
  typeKey: string,
  head: string,
) => {
  const entry = entryOf(playerId, causeId);
  if (!entry) {
    console.log(`\n## ${head}: no scheduled moment for ${causeId}`);
    return null;
  }
  const result = purposeScene(core, director, playerId, entry, { typeKey });
  if (result?.kind !== "composed") {
    console.log(`\n## ${head}: ${JSON.stringify(result)}`);
    return null;
  }
  composed += 1;
  const { scene } = result;
  console.log(
    `\n## ${head}: ${causeId}; purpose ${scene.purpose}; scores ${JSON.stringify(scene.variant?.scores.map((s) => `${s.variant}:${s.score.toFixed(2)}`))}`,
  );
  for (const f of scene.facts.filter((row) => KEYS.includes(row.key)))
    console.log(
      `   fact ${f.key} = ${f.text}  [${f.recordIds.length} records, first ${f.recordIds[0]?.slice(0, 48)}]`,
    );
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
  return scene;
};
let copies = 0;
/**
 * The same cause read again as a probe copy (a development probe, never play): a new record id and
 * moment, so the wording draws, which are made per moment, differ; `change` may alter the copy's
 * facts (the base arc is a complaint with no complaint record).
 */
const probes = (
  playerId: PersonId,
  causeId: string,
  head: string,
  change?: (facts: Record<string, string>) => Record<string, string>,
) => {
  const book = director.ledger.people.get(playerId)!;
  const entry = entryOf(playerId, causeId);
  const event = core.durableLog.get(causeId);
  if (!entry || !event) return;
  const moment = book.momentsById.get(entry.momentId)!;
  for (let n = 0; n < COPIES; n += 1) {
    copies += 1;
    const id = `${causeId}~copy${copies}`;
    core.durableLog.set(id, {
      ...event,
      id,
      ...(change ? { facts: change({ ...(event.facts ?? {}) }) } : {}),
    });
    const momentId = `${moment.id}~copy${copies}`;
    book.momentsById.set(momentId, { ...moment, id: momentId, causeId: id });
    const copy = {
      ...entry,
      momentId,
      bindings: JSON.parse(JSON.stringify(entry.bindings)),
    };
    book.schedule.push(copy);
    compose(playerId, id, "accusation", `${head}, a probe copy (${n + 1})`);
    book.schedule.splice(book.schedule.indexOf(copy), 1);
    book.momentsById.delete(momentId);
    core.durableLog.delete(id);
  }
};
/** The player's answer, said through the game's own reply writer along the tree's path to an ending. */
const answer = (
  playerId: PersonId,
  causeId: string,
  typeKey: string,
  ending: string,
): string | null => {
  const entry = entryOf(playerId, causeId);
  if (!entry) return null;
  const result = purposeScene(core, director, playerId, entry, { typeKey });
  if (result?.kind !== "composed") return null;
  const find = (node: TreeNode, path: number[]): number[] | null => {
    for (const [at, reply] of node.replies.entries()) {
      const next = reply.next ? playedNode(reply.next) : null;
      if (next?.end?.ending?.id === ending) return [...path, at];
      const deeper = next ? find(next, [...path, at]) : null;
      if (deeper) return deeper;
    }
    return null;
  };
  const path = find(result.scene.talk.tree, []);
  if (!path) return null;
  return replyInScene(core, director, playerId, entry, path, { typeKey });
};

const town = lawChain(api).townPlaceId;
const bodyId = townSeats(api)
  .filter((seat) =>
    ["council", "county-board", "legislature-lower"].includes(
      String((seat.office as { kind?: string }).kind),
    ),
  )
  .map((seat) => seat.office.id)
  .find(
    (id, at, all) =>
      all.indexOf(id) === at &&
      members(api, id).filter((t) => core.people.has(memberKey(t) as PersonId))
        .length > 3,
  );
if (!bodyId) {
  console.log("SKIP: no body with members to sit on");
  process.exit(0);
}
const sitting = members(api, bodyId)
  .map((t) => memberKey(t) as PersonId)
  .filter((id) => core.people.get(id)?.alive);
const playerId = sitting[1]!;
core.playerId = playerId;
director.watch(core, playerId);
const level = (
  townSeats(api).find((seat) => seat.office.id === bodyId)!.office as {
    level?: string;
  }
).level as "city" | "county" | "state";
const policies = billCatalog(api, level)
  .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
  .filter((row) => row.kind === "policy-question" && row.authority.allowed)
  .slice(0, 12);
let billAt = 0;
const nextBill = () => {
  const policy = policies[billAt++ % policies.length]!;
  return draftBill(api, {
    bodyOfficeId: bodyId,
    sponsorId: memberKey(members(api, bodyId)[0]!),
    provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
  }).id;
};
console.log(
  `# the town is ${town}; player ${playerId} sits on ${bodyId} (${level}) with ${sitting.length} members`,
);
const colleagues = sitting.filter((id) => id !== playerId);
const outsiders = [...core.people.values()]
  .filter(
    (p) =>
      p.alive &&
      p.tier !== "husk" &&
      p.placeId === town &&
      !sitting.includes(p.id as PersonId) &&
      p.liquidMinor > 0,
  )
  .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
const accusationsOf = (crimeId: string) =>
  [...(core.logByKind.get("justice.accused") ?? [])].filter(
    (id) =>
      id.includes(`:${crimeId}:`) &&
      core.durableLog.get(id)?.personIds[0] === playerId,
  );
const tellOf = (crimeId: string, tellerId: string, listenerId: string) =>
  // HAND-STAGED: the corruption engine's own record of a telling (corruption.ts, `crime.told`),
  // which the justice engine reads and answers with its own complaint.
  api.emit({
    id: `${crimeId}:told:${tellerId}:${listenerId}:${core.date}`,
    date: core.date,
    kind: "crime.told",
    personIds: [listenerId as PersonId],
    witnessIds: [tellerId as PersonId],
    placeId: town,
    facts: { [`crime:${crimeId}`]: "bribe-taken" },
    source: {
      tag: "SOURCED",
      citation: "A party to a recorded bribe told someone.",
      asOf: core.date,
    },
  });
const playAccusations = (crimeId: string, head: string) => {
  for (const id of accusationsOf(crimeId)) {
    const scene = compose(playerId, id, "accusation", `${head}: ${id}`);
    if (scene) probes(playerId, id, head);
  }
};
const befriend = (id: string) => {
  for (let n = 0; n < 12 && closenessBetween(core, playerId, id) < 0.7; n += 1)
    api.relationship(playerId, id as PersonId, "contact", 40);
};

let takenCrime: { id: string; offererId: string } | null = null;
// ---- (a) the player took a bribe.
{
  const offerer = outsiders[0]!;
  const billId = nextBill();
  console.log(
    `\n# PART A: ${offerer.id} offers the player money for a vote on ${billId}; the player takes it`,
  );
  const { record } = dev.forceBribe({
    offererId: offerer.id,
    officialId: playerId,
    subjectId: billId,
    stakeMinor: 30_000_000,
    answer: "takes",
  });
  const causeId = `${BRIBE_OFFERED}:${record.id}`;
  day(1);
  const reply = answer(playerId, causeId, "bribe-offer", "took-it");
  console.log(`   > the player's answer through the reply writer: ${reply}`);
  day(2);
  const crime = crimeRecord(api, record.id)!;
  console.log(
    `   crime ${crime.id}: offered ${crime.offered}, taken ${crime.taken}, pending ${crime.pending ?? false}`,
  );
  // Colleagues are told: the closest friend first, the rest as they come.
  const told = colleagues.filter((id) => id !== offerer.id).slice(0, 6);
  if (told[0]) befriend(told[0]);
  for (const id of told) tellOf(crime.id, offerer.id, id);
  day(1);
  const ids = accusationsOf(crime.id);
  console.log(`# ${ids.length} complaints named the player: ${ids.join(", ")}`);
  takenCrime = { id: crime.id, offererId: offerer.id };
  playAccusations(crime.id, "(a) took it");
}

// ---- (b) the player offered a bribe that was refused.
{
  day(95);
  const official = colleagues[0]!;
  core.people.get(playerId)!.liquidMinor = 5_000_000;
  const billId = nextBill();
  console.log(
    `\n# PART B: the player offers ${official} money for a vote on ${billId}; refused (HAND-STAGED cash on the player)`,
  );
  try {
    const { record } = dev.forceBribe({
      offererId: playerId,
      officialId: official,
      subjectId: billId,
      stakeMinor: 2_000_000,
      answer: "refuses",
    });
    day(3);
    for (const id of colleagues.slice(1, 4)) tellOf(record.id, official, id);
    day(1);
    console.log(
      `   crime ${record.id}: taken ${crimeRecord(api, record.id)?.taken}; complaints ${accusationsOf(record.id).length}`,
    );
    playAccusations(record.id, "(b) offered, refused");
    // The base arc: the same untaken crime with no complaint record (a development probe).
    const first = accusationsOf(record.id).at(-1);
    if (first)
      probes(playerId, first, "(b) base arc, no complaint", (facts) => {
        delete facts.complaintId;
        return facts;
      });
  } catch (error) {
    console.log(`   (no offer: ${(error as Error).message})`);
  }
}

// ---- the printed story: a story the paper ran on the taken bribe, when the press printed one.
// The one who paid leaks it to a reporter (the press engine's own writer); the paper prints it.
if (takenCrime) {
  const outlet = outletsHere(api).find((row) => row.reporterIds.length);
  try {
    if (outlet)
      leakToReporter(api, {
        leakerId: takenCrime.offererId,
        reporterId: outlet.reporterIds[0]!,
        crimeId: takenCrime.id,
      });
  } catch (error) {
    console.log(`   (no leak: ${(error as Error).message})`);
  }
}
day(40);
{
  const book = director.ledger.people.get(playerId)!;
  const played = new Set<string>();
  for (const entry of book.schedule) {
    if (!entry.bindings.some((b) => b.typeKey === "accusation")) continue;
    const moment = book.momentsById.get(entry.momentId);
    const cause = moment ? core.durableLog.get(moment.causeId) : undefined;
    if (cause?.kind !== "news.read" || played.has(cause.id)) continue;
    played.add(cause.id);
    const scene = compose(
      playerId,
      cause.id,
      "accusation",
      "the printed story",
    );
    if (scene) probes(playerId, cause.id, "the printed story");
  }
  const reads = [...(core.logByKind.get("news.read") ?? [])].filter(
    (id) => core.durableLog.get(id)?.facts?.crimeId === takenCrime?.id,
  );
  console.log(
    `# ${played.size} printed-story moments for the player; ${reads.length} news.read records name the crime`,
  );
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
    p.uses.some((u) => String(u.purpose).startsWith("conflict-accuse")),
);
const seen = mine.filter((p) => said.has(p.key));
if (seenOut) writeFileSync(seenOut, JSON.stringify([...said].sort()));
console.log(`\n# NEW LINES SEEN SAID ${seen.length} of ${mine.length}`);
for (const p of mine.filter((p) => !said.has(p.key)))
  console.log(`   unseen: ${p.text}  <${p.key}>`);
console.log(`# DONE ${where}`);
