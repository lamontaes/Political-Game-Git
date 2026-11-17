/**
 * Plays the apology over a missed payment in drawn places and prints every talk whole (Story lead,
 * Nov 17; development tooling like join-cause-walk.ts, shipped play never imports it).
 *
 *   node --import tsx scripts/words/apology-walk.ts --seed <word> [--label a] [--short] [--probes 24] [--seen-out file]
 *
 * The place is drawn from all 56 by seed and label. The player is the bench's own resident, who
 * lives with grown housemates. HAND-STAGED: one loan row in the player's name (kind personal, the
 * town bank as lender) and the player's cash taken out through the engine's own transfer the day
 * before the credit engine bills (`credit.payment-missed` is the engine's own record, written by
 * its monthly review). From there the quarrel module writes `family.quarrel` and the director
 * stages the apology; each tree is printed with every reply pressed, the facts it leans on and the
 * pieces said. The `.close` arc is reached by warming the tie through the core's own writer. With
 * --short every member's cash is taken out (the household is short); without it the housemates
 * keep theirs. Lines the engine's own draw did not say are met through probe copies of the quarrel
 * record (a new record id, the same facts, named as probes in the printed file). The promise
 * reply is written through `replyInScene` along the tree's path; the world is then branched: the
 * payment is made in one and missed in the other, and the promise is read by record id. At the
 * end every line of the Nov 17 rewrite is listed as said or not.
 */
import { writeFileSync } from "node:fs";
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { closenessBetween } from "../../src/core2/closeness";
import { gameStartDate } from "../../src/core2/game-start";
import { daysBetweenText } from "../../src/core2/kernel/dates";
import { nextBillingDay } from "../../src/core2/modules/business";
import { FAMILY_QUARREL } from "../../src/core2/modules/partnerships";
import { applyCoreEvent, coreAPI } from "../../src/core2/state";
import { transferCash } from "../../src/core2/world-transfer";
import type { PersonId } from "../../src/core2/types";
import { promisesBetween } from "../../src/director/promises";
import { chooseVariant } from "../../src/director/arc-variant";
import { purposeScene, replyInScene } from "../../src/director/purpose-scene";
import type { ScheduleEntry } from "../../src/director/scheduling";
import type { TreeNode } from "../../src/director/scene-talk";
import { drawPlace } from "../core2-year/place";
import { pathTo } from "../../tests/support/promise-play";
import { play } from "../../tests/support/real-borrower";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const flag = (name: string) => process.argv.includes(`--${name}`);
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const probes = Number(option("probes", "10"));
const runway = option("runway", "");
const before = flag("before");
const flush = flag("flush");
const kind = option("kind", "personal");
const paid = flag("paid");
const seenOut = option("seen-out", "");
const KEYS = [
  "loan",
  "lender",
  "behind",
  "household-short",
  "due-next",
  "quarreled-before",
  "confronted",
];

setBookkeeping(false);
const place = drawPlace(seed, `apology-walk:${label}`);
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where}`);
const { core, director, playerId } = buildBenchWorld(
  place.seed,
  gameStartDate(),
  { twoLevel: true, placeKey: place.key },
);
const api = coreAPI(core);
const me = playerId as PersonId;
director.watch(core, me);
core.focusPersonIds.add(me);
const book = director.ledger.people.get(me)!;
const player = core.people.get(me)!;
const source = (what: string) => ({
  tag: "ESTIMATED" as const,
  asOf: core.date,
  citation: `Hand-staged for the apology walk: ${what}.`,
  estimatedFrom: "scripts/words/apology-walk.ts",
});

// The bank's book is written on the world's first day.
play(core, me, 2);
// HAND-STAGED: the loan row, in the player's name, from the town bank.
const bank = api
  .moduleState("credit")
  .table("banks")
  .get("credit:bank") as unknown as { organizationId: string } | undefined;
if (!bank) {
  console.log("SKIP: no town bank in this place");
  process.exit(0);
}
const members = (core.households.get(player.householdId)?.memberIds ?? [])
  .map((id) => core.people.get(id)!)
  .filter((row) => row?.alive);
const monthly =
  members.reduce((sum, row) => sum + row.livingCostDailyMinor, 0) * 30;
const loanId = `loan:${player.householdId}:${core.date}`;
api
  .moduleState("credit")
  .table("loans")
  .put({
    id: loanId,
    isLoan: true,
    open: true,
    householdId: player.householdId,
    borrowerId: me,
    lenderId: bank.organizationId,
    kind,
    principalMinor: monthly * 2,
    balanceMinor: monthly * 2,
    annualRate: 0.1,
    marketAnnualRate: 0.1,
    rateLawId: null,
    paymentMinor: Math.round(monthly / 2),
    openedAt: core.date,
    pastDueMinor: 0,
    standing: "current",
  } as never);
console.log(
  `# STAGED loan row ${loanId} (hand-staged), lender ${bank.organizationId}`,
);
// The richest organization in the town: where the cash goes and where it comes from.
const sink = [...core.organizations.values()]
  .filter(
    (org) => org.placeId === player.placeId && org.id !== bank.organizationId,
  )
  .sort((a, b) => b.liquidMinor - a.liquidMinor)[0]?.id;
if (!sink) throw new Error("no organization to spend at");
let moves = 0;
const spend = (id: PersonId) => {
  const row = core.people.get(id)!;
  transferCash(
    api,
    `walk:spend:${id}:${core.date}:${(moves += 1)}`,
    id,
    sink,
    row.liquidMinor,
    source("cash spent"),
  );
};
const fill = (id: PersonId, minor: number) =>
  transferCash(
    api,
    `walk:fill:${id}:${core.date}:${(moves += 1)}`,
    sink,
    id,
    minor,
    source("cash earned"),
  );

// The day before the credit engine bills: the player's cash is gone.
const due = nextBillingDay(api)!;
play(core, me, Math.max(1, daysBetweenText(core.date, due) - 1));
spend(me);
if (flag("short"))
  for (const row of members) if (row.id !== me) spend(row.id as PersonId);
// With --runway N the housemates keep N days of the household's living costs, no more.
if (runway)
  for (const row of members)
    if (row.id !== me) {
      const keep = row.livingCostDailyMinor * Number(runway);
      if (row.liquidMinor > keep)
        transferCash(
          api,
          `walk:spend:${row.id}:${core.date}:${(moves += 1)}`,
          row.id,
          sink,
          row.liquidMinor - keep,
          source("cash spent down to a runway"),
        );
    }
// With --flush every housemate holds three years of living costs (the wronged is not strained: the pressed arc does not win).
if (flush)
  for (const row of members)
    if (row.id !== me)
      fill(row.id as PersonId, row.livingCostDailyMinor * 365 * 3);
// With --before an earlier quarrel stands between the two (HAND-STAGED), over another missed payment.
if (before) {
  const other = members.find((row) => row.id !== me && row.alive);
  if (other)
    applyCoreEvent(core, {
      id: `${FAMILY_QUARREL}:earlier`,
      date: core.date,
      kind: FAMILY_QUARREL,
      personIds: [me, other.id as PersonId],
      placeId: player.placeId,
      publicRecord: false,
      facts: { about: "money", owes: me, missedId: "earlier-missed" },
      source: source("an earlier quarrel between the two"),
    } as never);
}
console.log(
  `# the player's cash taken out on ${core.date}; the engine bills ${due}${flag("short") ? "; the household's too" : ""}`,
);
console.log(
  `# cash by member ${members.map((m) => `${m.id}:${core.people.get(m.id)!.liquidMinor}/${m.livingCostDailyMinor}`).join(" ")}; sink ${sink} holds ${core.organizations.get(sink)!.liquidMinor}`,
);
const found: string[] = [];
api.subscribeEvents("apology-walk", [FAMILY_QUARREL], (_, event) => {
  if (event.facts?.owes === me) found.push(event.id);
});
for (let day = 0; day < 6 && core.date <= due; day += 1) play(core, me, 2);
if (!found[0]) {
  const paid = api.moduleState("credit").table("payments").rows();
  console.log(
    `# DEBUG date ${core.date}; payments ${JSON.stringify(paid.slice(-2))}; missed ${JSON.stringify([...(core.logByKind.get("credit.payment-missed") ?? [])])}; cash ${core.people.get(me)!.liquidMinor}; members ${members.map((m) => `${m.id}:${m.tier}:${m.birthDate}`).join(" ")}`,
  );
  console.log("SKIP: the missed payment made no quarrel (no grown housemate?)");
  process.exit(0);
}
const quarrel = core.durableLog.get(found[0])!;
const missed = core.durableLog.get(String(quarrel.facts?.missedId))!;
const wronged = quarrel.personIds.find((id) => id !== me)! as PersonId;
console.log(
  `# QUARREL ${quarrel.id} over ${missed.id} (loan ${missed.facts?.loanId}, kind ${missed.facts?.loanKind}); wronged ${wronged}`,
);

// With --paid the loan row shows nothing past due by the time the scene is composed (HAND-STAGED: the
// player caught up before the two sat down), so the talk has no `behind`.
if (paid)
  api
    .moduleState("credit")
    .table("loans")
    .put({
      ...(api.moduleState("credit").table("loans").get(loanId) as object),
      pastDueMinor: 0,
      standing: "current",
    } as never);
const nextEntry = (causeId: string): ScheduleEntry | undefined => {
  const find = () =>
    book.schedule.find(
      (row) =>
        row.bindings.some((b) => b.typeKey === "apology") &&
        book.momentsById.get(row.momentId)?.causeId === causeId,
    );
  for (let day = 0; day < 8 && !find(); day += 1) play(core, me, 2);
  return find();
};
const said = new Set<string>();
const note = (parts: readonly string[]) => {
  for (const key of parts) said.add(key);
};
const printTree = (node: TreeNode, ind: string, quiet: boolean) => {
  for (const l of node.lines) {
    note(l.parts);
    if (!quiet)
      console.log(
        `${ind}${l.speaker} [${l.move}]: ${l.text}   <${l.parts.join(" + ")}>`,
      );
  }
  for (const b of node.branches ?? []) printTree(b.node, ind + "  ", quiet);
  for (const r of node.replies) {
    note(r.line.parts);
    if (!quiet)
      console.log(
        `${ind}> PRESS [${r.line.move}] ${r.line.speaker}: ${r.line.text}   <${r.line.parts.join(" + ")}>`,
      );
    if (r.next) printTree(r.next, ind + "    ", quiet);
  }
  if (node.end) {
    if (node.end.close) note(node.end.close.parts);
    if (!quiet)
      console.log(
        `${ind}[END ${node.end.ending?.id ?? node.end.outcome}]${node.end.close ? ` close: ${node.end.close.text} <${node.end.close.parts.join(" + ")}>` : ""}`,
      );
  }
};
const show = (entry: ScheduleEntry, title: string, quiet = false) => {
  const result = purposeScene(core, director, me, entry, {
    typeKey: "apology",
  });
  if (result?.kind !== "composed") {
    console.log(`   ${title}: not composed ${JSON.stringify(result)}`);
    return null;
  }
  const { scene } = result;
  if (!quiet) {
    console.log(
      `\n## ${title}: variant ${scene.variant?.purpose}; scores ${scene.variant?.scores.map((s) => `${s.variant} ${s.score.toFixed(2)}`).join(", ")}; tie ${closenessBetween(core, me, scene.askerId).toFixed(2)}`,
    );
    console.log(`   facts: ${scene.facts.map((f) => f.key).join(", ")}`);
    for (const f of scene.facts.filter((row) => KEYS.includes(row.key)))
      console.log(`   fact ${f.key} = ${f.text}  [${f.recordIds.join(" ")}]`);
  }
  for (const o of [scene.talk.open, ...scene.talk.intro]) {
    if (!o) continue;
    note(o.parts);
    if (!quiet)
      console.log(
        `${o.speaker} [${o.move}]: ${o.text}   <${o.parts.join(" + ")}>`,
      );
  }
  for (const n of scene.talk.narration) {
    note(n.parts);
    if (!quiet) console.log(`Narrator: ${n.text}   <${n.parts.join(" + ")}>`);
  }
  note(scene.talk.state.parts);
  if (!quiet)
    console.log(
      `${scene.talk.state.speaker} [${scene.talk.state.move}]: ${scene.talk.state.text}   <${scene.talk.state.parts.join(" + ")}>`,
    );
  printTree(scene.talk.tree, "  ", quiet);
  if (!quiet) console.log(`   gaps: ${JSON.stringify(scene.talk.gaps)}`);
  return scene;
};

const entry = nextEntry(quarrel.id);
if (!entry) {
  console.log("SKIP: no apology staged in 15 days");
  process.exit(0);
}
show(entry, `the scene as the engine's own records give it (${quarrel.id})`);
// The other arcs. A cause plays the variant its first composition chose (arc-variant.ts keeps it),
// so each arc is met through a probe copy of the quarrel (a new record id, the same facts) made once
// the world gives the variant: the wronged's cash and the tie are moved through the core's own writers
// (HAND-STAGED) until the family's own scoring (`chooseVariant`, asked on a throwaway cause) picks it.
const api2 = coreAPI(core);
const sceneFacts = {
  about: "money",
  missedId: String(quarrel.facts?.missedId),
};
let copies = 0;
const CLOSE_FACETS = [
  "personality-v1:facet-sensitive",
  "personality-v1:facet-tender-hearted",
  "personality-v1:facet-affectionate",
];
const OTHER_FACETS = [
  "personality-v1:facet-persistent",
  "personality-v1:facet-skeptical",
  "personality-v1:facet-blunt",
  "personality-v1:facet-practical",
  "personality-v1:facet-meticulous",
];
let drySeq = 0;
const stateFor = (target: string, asker: PersonId) => {
  // HAND-STAGED traits: the wronged who is tender (the close arc) or not (the money arc).
  const traits = core.people.get(asker)!.traits as Record<string, number>;
  for (const facet of CLOSE_FACETS)
    traits[facet] = target === "owed-apology.close" ? 0.8 : -0.8;
  for (const facet of OTHER_FACETS) traits[facet] = -0.8;
  for (let k = 0; k < 16; k += 1) {
    const choice = chooseVariant(core, {
      family: "owed-apology",
      askerId: asker,
      askedId: me,
      cause: {
        id: `dry:${target}:${(drySeq += 1)}`,
        date: core.date,
        facts: sceneFacts,
      },
    });
    if (k > 0)
      console.log(
        `   state ${target} ${k}: ${choice?.scores.map((r) => `${r.variant} ${r.score.toFixed(2)}`).join(", ")}; tie ${closenessBetween(core, me, asker).toFixed(2)}`,
      );
    if (choice?.purpose === target) return choice;
    // More cash for the wronged (less strain); the tie warmed for the close arc, cooled for the money arc.
    const wrongedRow = core.people.get(asker)!;
    fill(asker, wrongedRow.livingCostDailyMinor * 365 * 4);
    api2.relationship(
      me,
      asker,
      "contact",
      target === "owed-apology.close" ? 240 : -240,
      undefined,
      { cause: "conversation", sourceId: `apology-walk:${target}:${k}` },
    );
  }
  return undefined;
};
/**
 * A probe copy of the quarrel (a new record id, the same facts) with a copy of the real moment and
 * entry on it (a new moment id), so the scene is composed from the probe's own record and draws its
 * own wordings; the staging by the director's days is not asked again (`seasonCap`).
 */
const probeCopy = (
  who: PersonId,
  target: string,
): { id: string; entry: ScheduleEntry | undefined } => {
  stateFor(target, who);
  copies += 1;
  const id = `${FAMILY_QUARREL}:${me}:${who}:${core.date}:probe-${copies}`;
  // The quarrel module's own shape (src/core2/modules/quarrel.ts).
  api2.emit({
    id,
    date: core.date,
    kind: FAMILY_QUARREL,
    personIds: [me, who],
    placeId: player.placeId,
    publicRecord: false,
    source: source(`probe copy ${copies} of the quarrel`),
    facts: { ...sceneFacts, owes: me, closeness: "1" },
  });
  const moment = structuredClone(book.momentsById.get(entry.momentId)!);
  moment.id = `${entry.momentId}:probe-${copies}`;
  moment.causeId = id;
  book.momentsById.set(moment.id, moment);
  return {
    id,
    entry: { ...structuredClone(entry), momentId: moment.id, answered: [] },
  };
};
// The money arc plays where the wronged is not tender and not strained, the close arc where they are tender: the
// housemate's traits and cash are moved for each (HAND-STAGED).
let promiseProbe:
  { id: string; entry: ScheduleEntry; who: PersonId } | undefined;
for (const earlierQuarrel of [false, true]) {
  if (earlierQuarrel) {
    // HAND-STAGED: an earlier quarrel between the two, over another missed payment, a day before the probes.
    api2.emit({
      id: `${FAMILY_QUARREL}:${me}:${wronged}:${core.date}:earlier`,
      date: core.date,
      kind: FAMILY_QUARREL,
      personIds: [me, wronged],
      placeId: player.placeId,
      publicRecord: false,
      source: source("an earlier quarrel between the two"),
      facts: {
        about: "money",
        owes: me,
        missedId: "earlier-missed",
        closeness: "1",
      },
    });
    play(core, me, 2);
  }
  for (const target of ["owed-apology.money", "owed-apology.close"]) {
    const who = wronged;
    const choice = stateFor(target, who);
    if (!choice) {
      console.log(`\n# ${target}: the world did not give this arc in 16 moves`);
      continue;
    }
    console.log(
      `\n# ${target}: asker ${who}, given by scores ${choice.scores.map((r) => `${r.variant} ${r.score.toFixed(2)}`).join(", ")} (HAND-STAGED cash and tie)`,
    );
    let shown = false;
    for (let n = 0; n < probes; n += 1) {
      const probe = probeCopy(who, target);
      if (!probe.entry) continue;
      const scene = show(probe.entry, `${target} probe ${probe.id}`, shown);
      shown = true;
      if (
        !earlierQuarrel &&
        target === "owed-apology.money" &&
        scene?.variant?.purpose === target &&
        !promiseProbe &&
        n === 0
      )
        promiseProbe = { id: probe.id, entry: probe.entry, who };
    }
  }
}

// The promise: said through the game's own reply in a money talk, then the next payments made (the
// promise kept when its window closes) and, on a second promise, missed (the promise broken by that
// missed payment record), one world and one clock.
const promiseIn = (probe: { id: string; entry: ScheduleEntry }) => {
  const result = purposeScene(core, director, me, probe.entry, {
    typeKey: "apology",
  });
  if (result?.kind !== "composed") {
    console.log(`   promise scene not composed: ${JSON.stringify(result)}`);
    return undefined;
  }
  const path = pathTo(result.scene.talk.tree, "promised-to-make-it-right");
  const replyId =
    path &&
    replyInScene(core, director, me, probe.entry, path, { typeKey: "apology" });
  const reply = replyId ? core.durableLog.get(replyId) : undefined;
  console.log(
    `\n### PROMISE on ${core.date}: reply ${replyId}; facts ${JSON.stringify(Object.fromEntries(Object.entries(reply?.facts ?? {}).filter(([k]) => k.startsWith("promise") || k === "causeId")))}`,
  );
  return replyId ? `promise:${replyId}` : undefined;
};
const settle = (factId: string, branch: "made" | "missed") => {
  const find = () =>
    promisesBetween(director.ledger, me, wronged).find(
      (row) => row.id === factId,
    );
  console.log(
    `    promise ${factId} owed to ${wronged}: ${find()?.outcome} on ${core.date}; quarrel ${find()?.sourceId}; the missed payment ${quarrel.facts?.missedId}; the loan ${missed.facts?.loanId}`,
  );
  const handled = new Set<string>();
  for (let day = 0; day < 80 && find()?.outcome === "open"; day += 1) {
    const next = nextBillingDay(coreAPI(core));
    if (next && !handled.has(next) && daysBetweenText(core.date, next) <= 2) {
      handled.add(next);
      if (branch === "made") fill(me, monthly * 2);
      else spend(me);
    }
    play(core, me, 2);
  }
  console.log(
    `    payments ${branch}: promise ${factId} ${find()?.outcome} by ${find()?.endedBy} on ${find()?.endedAt} (the day now ${core.date})`,
  );
};
if (promiseProbe) {
  const first = promiseIn(promiseProbe);
  if (first) settle(first, "made");
  stateFor("owed-apology.money", wronged);
  const second = probeCopy(wronged, "owed-apology.money");
  const again = promiseIn({ id: second.id, entry: second.entry! });
  if (again) settle(again, "missed");
}

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
    part.uses.some((u) => u.purpose?.startsWith("owed-apology.")),
);
console.log(`\n# DONE ${where}; last day ${core.date}`);
console.log(
  mine
    .map(
      (part) =>
        `${said.has(part.key) ? "SAID  " : "UNSEEN"} ${part.key} | ${part.text}`,
    )
    .join("\n"),
);
if (seenOut) writeFileSync(seenOut, [...said].sort().join("\n") + "\n");
