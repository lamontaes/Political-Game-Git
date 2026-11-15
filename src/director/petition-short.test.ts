/**
 * A filed player whose petition is behind is told so, once, by someone who
 * would really say it, and the answer is theirs (owner, Oct 14: "No engine
 * accepts a job, a home, a filing or any choice for the controlled person; the
 * engine offers, the player decides"). Pinned at Sherrodsville, Ohio
 * (3972242, seed "scan-25"): the first council petition needs 10 signatures
 * and a campaign gathers 15 (`signaturesToGather`), and nobody else is walking
 * the player's petition. The record is written on the last turn on which a
 * canvass shift a day (`petitionShiftYield`) can still close the gap; a
 * petition the count has filled never gets one. A yes ("I'll go out and knock
 * on doors") takes the player's canvass day; a no changes nothing.
 * NOT a one-minute test: the town's own days from the start date to the filing
 * window are the only way to a real petition (about 4 minutes each case).
 * PETITION_SHORT_PLAYED=<file> keeps the played talks and the arithmetic.
 */
import { appendFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { fileForOffice, governmentView } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { campaignParameter } from "../core2/campaign-data";
import { takeCampaignDayChoice } from "../core2/campaign-day";
import { gameStartDate } from "../core2/game-start";
import { advanceToRaceFiling } from "../core2/gov-test-clock";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  campaignFor,
  PETITION_SHORT_EVENT,
  enlistVolunteer,
  petitionShiftYield,
  signaturesToGather,
} from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  petitionOf,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeScene } from "./scene";
import type { TreeNode } from "./scene-talk";

const PLACE = "3972242";
const SEED = "scan-25";
const OUT = process.env.PETITION_SHORT_PLAYED;
const write = (text: string) => {
  if (OUT) appendFileSync(OUT, `${text}\n`);
};

function filer() {
  setBookkeeping(false);
  const world = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const contest = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((c) => /:council:/.test(c.officeId + c.id))
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  advanceToRaceFiling(core, contest);
  const candidates = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        [...(core.households.get(p.householdId)?.memberIds ?? [])].length > 1,
    )
    .map((p) => p.id)
    .sort();
  let entrant: PersonId | undefined;
  let contestId = "";
  for (const id of candidates) {
    const open = governmentView(core, id).contests.find((row) =>
      row.checks.every((check) => check.met),
    );
    if (open) {
      entrant = id;
      contestId = open.contest.id;
      break;
    }
  }
  expect(entrant, `${PLACE} ${SEED}: a person with a race open`).toBeDefined();
  (core as { playerId?: string }).playerId = entrant!;
  director.watch(core, entrant!);
  fileForOffice(core, entrant!, contestId);
  const filing = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  ).find((f) => f.personId === entrant && f.contestId === contestId)!;
  return { core, api, director, me: entrant!, filing };
}

const toldId = (filingId: string) => `${PETITION_SHORT_EVENT}:${filingId}`;

/** Lines under a node, with the reply that led to each. */
function lines(node: TreeNode | null, path: string[], out: string[]): void {
  if (!node) return;
  for (const line of node.lines)
    out.push(`${path.join(" > ")} => ${line.text}`);
  if (node.end?.close)
    out.push(`${path.join(" > ")} => ${node.end.close.text}`);
  for (const reply of node.replies) {
    out.push(`${path.join(" > ")} ? ${reply.line.text}`);
    lines(reply.next, [...path, `"${reply.line.text}"`], out);
  }
}

type Case = ReturnType<typeof filer>;

/** Plays days until the record is written, or the deadline passes. */
function playToTold(world: Case): string | undefined {
  const { core, api, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  while (core.date <= petition.due && !core.durableLog.has(toldId(filing.id)))
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  return core.durableLog.has(toldId(filing.id)) ? core.date : undefined;
}

function stagedEntry(world: Case) {
  const { director, me } = world;
  const book = director.ledger.people.get(me)!;
  return book.schedule.find((entry) => {
    const moment = book.momentsById.get(entry.momentId);
    return (
      moment &&
      entry.bindings.some((b) => b.typeKey === "petition-short") &&
      moment.causeId === toldId(world.filing.id)
    );
  });
}

/** Tells the player, writes the arithmetic and the whole talk to the played file, returns the composed scene. */
function told(world: Case, label: string) {
  const { core, api, director, me, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  const gather = signaturesToGather(petition.needed);
  const day = playToTold(world);
  expect(day, `${PLACE} ${SEED} ${label}: told as short`).toBeDefined();
  const record = core.durableLog.get(toldId(filing.id))!;
  const f = record.facts as Readonly<Record<string, string>>;
  write(
    `## ${label}: ${PLACE} ${SEED}, needed ${petition.needed}, a campaign gathers ${gather}, due ${petition.due}. A canvass shift adds ${petitionShiftYield()} (${campaignParameter("playerCanvassHours")} hours x ${campaignParameter("doorsPerCanvasserHour")} doors an hour x ${campaignParameter("petitionSignOpenness")} sign).\nTold on ${day} by ${f.tellerKind} ${f.tellerId}: ${f.signed} signed of ${f.gathers}, ${f.daysLeft} days left, the days after the next turn can add ${f.canAddAfterNextTurn} against a gap of ${Number(f.gathers) - Number(f.signed)}.\n`,
  );
  const entry = stagedEntry(world);
  if (!entry) {
    const book = director.ledger.people.get(me)!;
    const mine = book.schedule.filter(
      (e) => book.momentsById.get(e.momentId)?.causeId === toldId(filing.id),
    );
    throw new Error(
      `${label}: not staged; entries ${JSON.stringify(mine.map((e) => ({ outcome: e.outcome, coverage: e.coverage, closed: e.closed, heldBack: e.heldBack, bindings: e.bindings.map((b) => b.typeKey) })))}; moments ${book.moments.filter((m) => m.causeId === toldId(filing.id)).length}`,
    );
  }
  const result = purposeScene(core, director, me, entry!, {
    typeKey: "petition-short",
  });
  expect(result?.kind, result?.kind === "skipped" ? result.reason : "").toBe(
    "composed",
  );
  if (result?.kind !== "composed") throw new Error("not composed");
  const staged = composeScene(core, director, me, entry);
  write(
    `Lead (${staged?.setting.kind}): ${staged?.narration.map((line) => line.text).join(" ") || "(none)"}`,
  );
  const all: string[] = [];
  lines(result.scene.talk.tree, [], all);
  write(
    `Narration: ${result.scene.talk.narration.map((line) => line.text).join(" ") || "(none)"}\nOpener: ${result.scene.talk.state.text}\n\n${all.join("\n")}\n`,
  );
  return { entry: entry!, scene: result.scene, record, day: day! };
}

/** The Journal's lines about the petition, once the player has answered. */
function journalAbout(world: Case): string[] {
  return composeJournal(world.core, world.director, world.me)
    .flatMap((chapter) => chapter.lines)
    .filter((line) => line.date >= "2025-08-03")
    .map((line) => `${line.date}: ${line.text}`);
}

/** The player's one canvass hour by hand, as the Campaign tab lets them: some names, not all. */
function startedByHand(world: Case) {
  const { api, filing } = world;
  takeCampaignDayChoice(api, filing.id, "canvass", { hours: 1 });
  expect(petitionOf(api, filing.id)!.signed).toBeGreaterThan(0);
  expect(petitionOf(api, filing.id)!.signed).toBeLessThan(
    signaturesToGather(petitionOf(api, filing.id)!.needed),
  );
}

/**
 * STAGED: someone from the player's household joins the campaign by the
 * game's own enlisting (what a yes to a helper's offer does), the day before
 * the petition can no longer wait, so a helper is there to tell them. A
 * helper who joined earlier would walk the doors and fill the petition, and
 * nothing would be told.
 */
function helperJoins(world: Case) {
  const { core, api, me, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  while (core.date < addDays(makeIsoDate(petition.due), -4))
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const mate = [
    ...(core.households.get(core.people.get(me)!.householdId)?.memberIds ?? []),
  ]
    .filter((id) => id !== me)
    .sort()
    .find((id) => enlistVolunteer(api, filing.id, id));
  expect(mate, "a housemate joins the campaign").toBeDefined();
}

const doorsOf = (world: Case) =>
  campaignFor(world.api, world.filing.id).doorsKnockedCount ?? 0;
const statusOf = (world: Case) =>
  (
    world.api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .get(world.filing.id) as unknown as FilingRow
  ).status;

it("the clerk tells a filed player on a thin petition once; a yes takes their canvass day and they reach the ballot", () => {
  if (OUT)
    writeFileSync(
      OUT,
      `# Petition short, played (head ${process.env.PLAYED_SHA ?? "unknown"})\n\n`,
    );
  const world = filer();
  const { core, api, director, me, filing } = world;
  const { entry, scene, record } = told(world, "Clerk, nothing signed yet");
  expect(record.facts?.tellerKind).toBe("clerk");
  expect(record.facts?.started).toBe("no");
  const before = doorsOf(world);
  const yes = scene.talk.tree.replies.findIndex(
    (r) => r.line.move === "promise",
  );
  expect(yes, "a yes is offered").toBeGreaterThanOrEqual(0);
  expect(doorsOf(world), "nothing is walked before the answer").toBe(before);
  replyInScene(core, director, me, entry, [yes]);
  expect(doorsOf(world), "the yes took their canvass day").toBeGreaterThan(
    before,
  );
  write(
    `Said yes: doors ${before} to ${doorsOf(world)}, signed ${petitionOf(api, filing.id)!.signed} of ${signaturesToGather(petitionOf(api, filing.id)!.needed)}.\n`,
  );
  advanceCore(core, addDays(makeIsoDate(petitionOf(api, filing.id)!.due), 1));
  write(`Journal: ${journalAbout(world).join(" | ")}\n`);
  write(`Clerk's check: ${statusOf(world)}.\n`);
  expect(statusOf(world), `${PLACE} ${SEED}: after the player went out`).toBe(
    "on-ballot",
  );
}, 1_500_000);

it("a no changes nothing: no door is walked for the player", () => {
  // The clerk is pressed once and the player says no again; a helper the
  // player knows by name takes the first no. The Journal names only someone
  // the player knows, so only the helper's no is told.
  for (const [label, byHelper] of [
    ["Clerk, then a no", false],
    ["Helper, then a no", true],
  ] as const) {
    const world = filer();
    if (byHelper) helperJoins(world);
    const { core, director, me } = world;
    const { entry, scene } = told(world, label);
    const no = scene.talk.tree.replies.findIndex(
      (r) => r.line.move === "deflect",
    );
    expect(no).toBeGreaterThanOrEqual(0);
    const before = doorsOf(world);
    const next = scene.talk.tree.replies[no]!.next;
    const goes = next
      ? next.replies.findIndex((r) => r.line.move === "deflect")
      : -1;
    if (!byHelper)
      expect(goes, "a second no after the press").toBeGreaterThanOrEqual(0);
    replyInScene(core, director, me, entry, goes >= 0 ? [no, goes] : [no]);
    expect(doorsOf(world), "a no walks no door").toBe(before);
    advanceCore(
      core,
      addDays(makeIsoDate(petitionOf(world.api, world.filing.id)!.due), 1),
    );
    const journal = journalAbout(world).join(" ");
    expect(/said my petition was short\. I let it wait\./.test(journal)).toBe(
      byHelper,
    );
    write(`Said no (${label}). Journal: ${journalAbout(world).join(" | ")}\n`);
    expect(statusOf(world), "left alone, the petition falls short").not.toBe(
      "on-ballot",
    );
  }
}, 1_500_000);

it("the clerk's words once something is on the petition, and a helper's words, in both cases", () => {
  const started = filer();
  startedByHand(started);
  const a = told(started, "Clerk, something signed");
  expect(a.record.facts?.tellerKind).toBe("clerk");
  expect(a.record.facts?.started).toBe("yes");
  const helped = filer();
  helperJoins(helped);
  const b = told(helped, "Helper, as the day goes");
  expect(b.record.facts?.tellerKind).toBe("helper");
  const both = filer();
  helperJoins(both);
  startedByHand(both);
  const c = told(both, "Helper, something signed");
  expect(c.record.facts?.tellerKind).toBe("helper");
  expect(c.record.facts?.started).toBe("yes");
}, 1_500_000);

it("a petition the count has filled is never told", () => {
  const world = filer();
  const { core, api, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  const gather = signaturesToGather(petition.needed);
  // The player, by hand, as the Campaign tab lets them: a canvass a day.
  while (petitionOf(api, filing.id)!.signed < gather) {
    takeCampaignDayChoice(api, filing.id, "canvass");
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  advanceCore(core, addDays(makeIsoDate(petition.due), 1));
  expect(
    core.durableLog.has(toldId(filing.id)),
    `${PLACE} ${SEED}: a petition at ${gather} is told as short`,
  ).toBe(false);
  write(
    `## On pace: filled to ${gather} by hand; no one tells them; the clerk's check: ${statusOf(world)}.\n`,
  );
}, 1_500_000);
