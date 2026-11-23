/**
 * Plays the bribe's two scenes in a drawn place and prints every talk whole (Story lead, Nov 17;
 * development tooling like donor-walk.ts and door-walk.ts, shipped play never imports it).
 *
 *   node --import tsx scripts/words/bribe-walk.ts --seed <word> [--label a] [--seen-out file]
 *
 * The place is drawn from all 56 by seed and label. The player is seated as a member of the town's
 * lawmaking body with bills before it (the offer asks a vote: favor-vote), and then as a member of a
 * body that has a contract award before it (the offer asks the award: favor-contract). Each offer is
 * made through dev mode's own bribe (`DevMode.forceBribe`, which runs the corruption engine's
 * `considerBribe`), so the offer is the engine's pending record and `corruption.bribe-offered` event;
 * the director schedules it and `purposeScene` composes it. Variants are reached by who offers and how
 * much (a rich stranger, a poor friend, the same person again), never by writing the facts. A refusal
 * is written as the scene's own reply record (`scene.reply`, ending handed-back), which the corruption
 * engine reads to press the offerer again (`corruption.bribe-pressed`); the pressed scene is composed
 * from that record. Every tree is printed with every reply pressed, the facts the lines lean on and
 * the piece keys said; it ends listing which of the new lines were seen said and which were not.
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
  provisionStance,
} from "../../src/core2/modules/legislature";
import { viewOf, viewOn } from "../../src/core2/modules/views";
import { townSeats } from "../../src/core2/modules/offices";
import {
  BRIBE_OFFERED,
  BRIBE_PRESSED,
} from "../../src/core2/modules/corruption";
import {
  CONTRACTS_MODULE_ID,
  type ContractAwardRow,
} from "../../src/core2/modules/contracts";
import { ownerOf } from "../../src/core2/modules/business";
import { lawChain } from "../../src/core2/modules/laws";
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
// `--only a` or `--only b` plays one part; `--sweep n` is how many offerers each sweep turns away.
const only = option("only", "ab");
const sweepSize = Number(option("sweep", "60"));

setBookkeeping(false);
const place = drawPlace(seed, `bribe-walk:${label}`);
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
  "read-public",
  "favor-vote",
  "favor-contract",
  "bill",
  "contract",
  "bribe-weight",
  "bidders",
  "reported",
  "your-side",
  "stand-with",
  "stand-apart",
  "read-tie",
  "read-size",
  "read-need",
  "read-strain",
  "read-offered-before",
  "read-refused-before",
  "read-pressed-before",
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
/** The scene a cause record gives the player, composed by the one scene builder and printed. */
const compose = (
  playerId: PersonId,
  causeId: string,
  typeKey: "bribe-offer" | "bribe-pressed",
  head: string,
) => {
  const book = director.ledger.people.get(playerId);
  const entry = book?.schedule.find(
    (row) => book.momentsById.get(row.momentId)?.causeId === causeId,
  );
  if (!entry) {
    console.log(`\n## ${head}: no scheduled moment for ${causeId}`);
    return null;
  }
  const result = purposeScene(core, director, playerId, entry, { typeKey });
  if (result?.kind !== "composed") {
    console.log(
      `\n## ${head}: ${JSON.stringify(result)} (bindings ${JSON.stringify(entry.bindings.map((b) => b.typeKey))}, answered ${JSON.stringify(entry.answered ?? [])}, moment ${entry.momentId})`,
    );
    return null;
  }
  composed += 1;
  const { scene } = result;
  console.log(
    `\n## ${head}: ${causeId}; purpose ${scene.purpose}; scores ${JSON.stringify(scene.variant?.scores.map((s) => `${s.variant}:${s.score.toFixed(2)}`))}`,
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
  return scene;
};

/**
 * The same cause read again for a different moment: a copy of the cause record and its moment (a
 * development probe, never play), so the wording draws, which are made per moment, differ and the
 * lines the engine's own scene did not happen to draw are met too. The facts, the variant and the
 * tree's shape are the engine's own for the offer; only the draw changes.
 */
let copies = 0;
const COPIES = Number(option("copies", "6"));
const probes = (
  playerId: PersonId,
  causeId: string,
  typeKey: "bribe-offer" | "bribe-pressed",
  head: string,
) => {
  const book = director.ledger.people.get(playerId)!;
  const entry = book.schedule.find(
    (row) => book.momentsById.get(row.momentId)?.causeId === causeId,
  );
  const event = core.durableLog.get(causeId);
  if (!entry || !event) return;
  const moment = book.momentsById.get(entry.momentId)!;
  for (let n = 0; n < COPIES; n += 1) {
    copies += 1;
    const id = `${causeId}~copy${copies}`;
    core.durableLog.set(id, { ...event, id });
    const momentId = `${moment.id}~copy${copies}`;
    book.momentsById.set(momentId, { ...moment, id: momentId, causeId: id });
    const copy = {
      ...entry,
      momentId,
      bindings: JSON.parse(JSON.stringify(entry.bindings)),
    };
    book.schedule.push(copy);
    compose(
      playerId,
      id,
      typeKey,
      `${head}, a probe copy for another draw (${n + 1})`,
    );
    // A probe is not a scene the director staged: it leaves the schedule so the season's count
    // (and every later scene) is the engine's own.
    book.schedule.splice(book.schedule.indexOf(copy), 1);
    book.momentsById.delete(momentId);
    core.durableLog.delete(id);
  }
};

/** The offer, made as dev mode makes it; the offer's cause record id, or null when the engine refuses. */
const offer = (
  playerId: PersonId,
  offererId: string,
  subjectId: string,
  stakeMinor: number,
) => {
  try {
    const { record } = dev.forceBribe({
      offererId,
      officialId: playerId,
      subjectId,
      stakeMinor,
      answer: "refuses",
    });
    if (!record.pending)
      console.log(
        `   (no offer: the engine made no pending offer; offered ${record.offered}, taken ${record.taken})`,
      );
    return record.pending
      ? { record, causeId: `${BRIBE_OFFERED}:${record.id}` }
      : null;
  } catch (error) {
    console.log(`   (no offer: ${(error as Error).message})`);
    return null;
  }
};
/**
 * The player's answer, said through the game's own reply writer (`replyInScene`): the path through the
 * scene's tree that ends the way asked is found, and the reply is written as the scene's own record
 * (`scene.reply`), which the corruption engine reads. Null where the tree has no such ending.
 */
const answer = (
  playerId: PersonId,
  causeId: string,
  typeKey: "bribe-offer" | "bribe-pressed",
  ending: string,
): string | null => {
  const book = director.ledger.people.get(playerId);
  const entry = book?.schedule.find(
    (row) => book.momentsById.get(row.momentId)?.causeId === causeId,
  );
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
console.log(`# the town is ${town}`);

/** The first body of this kind in the town's seats that has people seated in it. */
const bodyOfKind = (kind: string) =>
  townSeats(api)
    .filter((seat) => (seat.office as { kind?: string }).kind === kind)
    .map((seat) => seat.office.id)
    .find(
      (id, at, all) =>
        all.indexOf(id) === at &&
        members(api, id).filter((t) =>
          core.people.has(memberKey(t) as PersonId),
        ).length > 2,
    );
const seatAs = (officeId: string, index: number) => {
  const sitting = members(api, officeId)
    .map((t) => memberKey(t) as PersonId)
    .filter((id) => core.people.get(id)?.alive);
  const memberId = sitting[index]!;
  core.playerId = memberId;
  director.watch(core, memberId);
  return { memberId, sitting };
};
/** The town's residents, richest first, for the offerers; the player's colleagues do not offer. */
const offerersFor = (memberId: PersonId, sitting: readonly PersonId[]) =>
  [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.tier !== "husk" &&
        p.placeId === town &&
        p.id !== memberId &&
        p.liquidMinor > 0 &&
        p.livingCostDailyMinor > 0 &&
        !sitting.includes(p.id as PersonId),
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));

/**
 * The people who offer, by how they differ: the richest, the closest ties (hours of contact beside
 * the player, the way the game's own friendships are written, until each reads as a friend), the
 * thinnest cash against their costs, and a few from the middle of the town; every offer is theirs
 * to make through dev mode's bribe, and the engine and the variant reads decide which scene it is.
 */
const offerers = (memberId: PersonId, sitting: readonly PersonId[]) => {
  const pool = offerersFor(memberId, sitting);
  const closeness = (id: string) => closenessBetween(core, memberId, id);
  const friends = [...pool]
    .sort(
      (a, b) => closeness(b.id) - closeness(a.id) || a.id.localeCompare(b.id),
    )
    .slice(0, 6);
  for (const friend of friends)
    for (let n = 0; n < 12 && closeness(friend.id) < 0.7; n += 1)
      api.relationship(memberId, friend.id as PersonId, "contact", 40);
  const thin = [...pool]
    .filter((p) => p.liquidMinor >= 100_000)
    .sort(
      (a, b) =>
        a.liquidMinor / a.livingCostDailyMinor -
          b.liquidMinor / b.livingCostDailyMinor || a.id.localeCompare(b.id),
    )
    .slice(0, 8);
  const middle = pool.slice(
    Math.floor(pool.length / 4),
    Math.floor(pool.length / 4) + 10,
  );
  const list: { id: string }[] = [];
  for (const row of [...pool.slice(0, 6), ...friends, ...thin, ...middle])
    if (!list.some((seen) => seen.id === row.id)) list.push(row);
  console.log(
    `# ${list.length} offerers: the richest ${pool[0]!.id}, friends ${friends.map((f) => `${f.id} (${closeness(f.id).toFixed(2)})`).join(", ")}, thinnest cash ${thin[0]!.id}`,
  );
  return list;
};
// Asks made before a season passes, and the season in days (director.json: seasonCap of six in 91 days).
const SEASON_ASKS = 5;
const SEASON_DAYS = 92;
const STAKES = [200_000, 30_000_000, 500_000_000, 5_000_000_000];
/** The ways a scene may end, in turn: most are handed back, some are taken, reported or put off. */
const ENDINGS = [
  "handed-back",
  "handed-back",
  "reported",
  "handed-back",
  "took-it",
  "put-off",
];
const PRESSED_ENDINGS = [
  "held-the-line",
  "said-you-would-report",
  "held-the-line",
  "brushed-off",
];
/**
 * Every offerer makes an offer on the next subject; the scene is composed and printed with every
 * reply pressed, then answered through the game's own reply writer. The pressed scene follows only
 * where the offerer weighs pressing again (the engine's own choice, never forced); it is composed
 * and answered too. The first offerer asks again after each refusal, so the second ask reads as one
 * that was asked before and the pressed scene reads the earlier pressing.
 */
const variety = (
  memberId: PersonId,
  sitting: readonly PersonId[],
  next: () => string | null,
  maxAsks: number,
  ownersOf?: (subject: string) => readonly string[],
) => {
  const list = offerers(memberId, sitting).slice(0, sweepSize);
  // The last of them is asked again and again (the second ask reads as one that was asked before),
  // between the others, whose stakes run from small to large.
  const again = list[list.length - 1]!;
  const rest = list.slice(0, -1);
  const asks = [
    again,
    ...rest.slice(0, 2),
    again,
    ...rest.slice(2, 4),
    again,
    ...rest.slice(4),
    again,
    again,
  ].slice(0, maxAsks);
  const played = new Set<string>();
  let failures = 0;
  for (const [at, who] of asks.entries()) {
    // The director stages a kind of scene only so often in a season (seasonCap in director.json,
    // six in 91 days), so a season passes after every five asks.
    if (at && at % SEASON_ASKS === 0) day(SEASON_DAYS);
    const subject = next();
    if (!subject) continue;
    const owners = ownersOf?.(subject) ?? [];
    const offererId = owners.length ? owners[at % owners.length]! : who.id;
    const made = offer(
      memberId,
      offererId,
      subject,
      STAKES[at % STAKES.length]!,
    );
    if (!made) {
      // A body that no longer sits, or no bill to buy: stop when it keeps being refused.
      failures += 1;
      if (failures >= 10) break;
      continue;
    }
    failures = 0;
    day(1);
    const scene = compose(
      memberId,
      made.causeId,
      "bribe-offer",
      `offer ${at + 1} by ${offererId}`,
    );
    if (scene) played.add(scene.purpose);
    probes(memberId, made.causeId, "bribe-offer", `offer ${at + 1}`);
    // A taken offer has the player's own record of taking it; the rest are turned away.
    const ending = ENDINGS[at % ENDINGS.length]!;
    const said =
      answer(memberId, made.causeId, "bribe-offer", ending) ??
      answer(memberId, made.causeId, "bribe-offer", "handed-back");
    console.log(`   > answered (${ending}): ${said ?? "no reply written"}`);
    day(1);
    const pressedId = `${BRIBE_PRESSED}:${made.record.id}`;
    if (!core.durableLog.has(pressedId)) continue;
    const pressed = compose(
      memberId,
      pressedId,
      "bribe-pressed",
      `offer ${at + 1} pressed after the refusal`,
    );
    if (pressed) played.add(pressed.purpose);
    probes(memberId, pressedId, "bribe-pressed", `offer ${at + 1} pressed`);
    answer(
      memberId,
      pressedId,
      "bribe-pressed",
      PRESSED_ENDINGS[at % PRESSED_ENDINGS.length]!,
    );
    day(1);
  }
  console.log(`# the sweep played: ${[...played].sort().join(", ")}`);
};

// --- Part A: a legislator, a bill before the body: the favor is a vote. A state legislature sits only
// part of the year, so a town's own council plays the vote's offers too.
const voteWalk = (officeId: string, who: string) => {
  const level = (
    townSeats(api).find((seat) => seat.office.id === officeId)!.office as {
      level?: string;
    }
  ).level as "city" | "county" | "state";
  const A = seatAs(officeId, 1);
  console.log(
    `\n# PART A (${who}): player ${A.memberId} sits on ${officeId} (${level}); the offers ask a vote`,
  );
  const policies = billCatalog(api, level)
    .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
    .filter((row) => row.kind === "policy-question" && row.authority.allowed)
    .slice(0, 24);
  // Policies the player holds a view on come first: the offer to vote on one is read against that view.
  const ownView = (policy: (typeof policies)[number]) => {
    const stance = provisionStance(
      api,
      provisionFor({ policyId: policy.id, operation: "enact" }),
    );
    const yours = viewOf(api, A.memberId);
    return stance && yours
      ? viewOn(api, A.memberId, stance.question, yours.lean) * stance.position
      : 0;
  };
  policies.sort((a, b) => Number(ownView(b) !== 0) - Number(ownView(a) !== 0));
  let billAt = 0;
  const nextBill = () => {
    // A fresh bill before the body each time, so it is still pending when the offer is made.
    const policy = policies[billAt % policies.length]!;
    billAt += 1;
    return draftBill(api, {
      bodyOfficeId: officeId,
      sponsorId: memberKey(members(api, officeId)[0]!),
      provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
    }).id;
  };
  variety(A.memberId, A.sitting, nextBill, level === "state" ? 5 : 15);
};
const legislature = bodyOfKind("legislature-lower");
const council = bodyOfKind("council") ?? bodyOfKind("county-board");
if (only.includes("a")) {
  if (legislature) voteWalk(legislature, "a state legislature");
  if (council) voteWalk(council, "the town's own body");
  if (!legislature && !council) console.log("SKIP: no body to vote in");
}

// --- Part B: a council member, a contract before the body: the favor is the award.
if (only.includes("b") && council && core.modules.has(CONTRACTS_MODULE_ID)) {
  const B = seatAs(council, 2);
  console.log(
    `\n# PART B: player ${B.memberId} sits on ${council}; the offers ask a contract`,
  );
  const awards = () =>
    [
      ...(api
        .moduleState(CONTRACTS_MODULE_ID)
        .table("awards")
        .rows() as unknown as ContractAwardRow[]),
    ].sort((a, b) => a.id.localeCompare(b.id));
  for (let step = 0; !awards().length && step < 60; step += 1) day(7);
  // Awards with one bid give no `bidders`; those with more do: both are asked about.
  const rows = awards();
  if (!rows.length) console.log("# no contract award came in a year and more");
  else {
    console.log(
      `# ${rows.length} awards (bids each: ${rows.map((r) => r.bids.length).join(", ")}): ${rows.map((r) => r.id).join(", ")}`,
    );
    const firmOwners = (subject: string) => {
      const row = rows.find((r) => r.id === subject);
      return (row?.bids ?? [])
        .map((bid) => ownerOf(api, bid.organizationId))
        .filter(
          (id): id is PersonId =>
            !!id && id !== B.memberId && !B.sitting.includes(id),
        );
    };
    let awardAt = 0;
    variety(
      B.memberId,
      B.sitting,
      () => rows[awardAt++ % rows.length]!.id,
      15,
      firmOwners,
    );
  }
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
    p.uses.some((u) => String(u.purpose).startsWith("bribe-")),
);
const seen = mine.filter((p) => said.has(p.key));
if (seenOut) writeFileSync(seenOut, JSON.stringify([...said].sort()));
console.log(`\n# NEW LINES SEEN SAID ${seen.length} of ${mine.length}`);
for (const p of mine.filter((p) => !said.has(p.key)))
  console.log(`   unseen: ${p.text}  <${p.key}>`);
console.log(`# DONE ${where}`);
