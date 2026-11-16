/**
 * A filed player whose petition is behind is told so, once, by someone who
 * would really say it, and the answer is theirs (owner, Oct 14: "No engine
 * accepts a job, a home, a filing or any choice for the controlled person; the
 * engine offers, the player decides"). Pinned at Sherrodsville, Ohio
 * (3972242, seed "scan-3"): the first council petition needs 10 signatures
 * and a campaign gathers 15 (`signaturesToGather`), and nobody else is walking
 * the player's petition. The record is written on the last turn on which a
 * canvass shift a day (`petitionShiftYield`) can still close the gap; a
 * petition the count has filled never gets one. A yes ("I'll go out and knock
 * on doors") takes the player's canvass day; a no changes nothing.
 * NOT a one-minute test: the town's own days from the start date to the filing
 * window are the only way to a real petition (about 4 minutes each case).
 * PETITION_SHORT_PLAYED=<file> keeps the played talks and the arithmetic.
 * Limits are twice the slower of the test alone and beside the other file (Nov 15,
 * alone / beside, seconds): 37 / 42, 64 / 65, 95 / 86, 33 / 31, 34 / 33, 65 / 64 and,
 * for the other worlds' talks, 389 to 450 / 456. Each case plays about 100 days of a
 * town, so the limits are long.
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
import controls from "../bench/data/controls.json" with { type: "json" };
import { DevMode } from "../bench/dev-mode";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeScene } from "./scene";
import type { TreeNode } from "./scene-talk";

const PLACE = "3972242";
const SEED = "scan-3";
/** Seeds of this town where the petition runs short and the clerk tells the player, found by hand. */
const CLERK_SEEDS = ["scan-4", "scan-9", "scan-14", "scan-24", "scan-60"];
/** Seeds where a played yes to an offer of help puts a helper on the campaign who then tells the player, found by hand. */
const HELPER_SEEDS = ["scan-5", "scan-19"];
/** A seed of this town where a household member's offer to run the campaign comes and the player's yes puts them on its staff. */
const HELPER_SEED = "scan-7";
const OUT = process.env.PETITION_SHORT_PLAYED;
const write = (text: string) => {
  if (OUT) appendFileSync(OUT, `${text}\n`);
};

function filer(seed: string = SEED, helped = false) {
  setBookkeeping(false);
  const world = buildBenchWorld(seed, gameStartDate(), {
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
  return {
    core,
    api,
    director,
    me: entrant!,
    filing,
    helped,
    filedOn: core.date,
  };
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

/**
 * Plays days until the record is written, or the deadline passes. A player
 * with `helped` says yes to the offers of help that come (the game's own
 * manager-offer and offer-help scenes), as a player who wants a helper would;
 * the others leave every offer unanswered.
 */
function playToTold(world: Case): string | undefined {
  const { core, api, director, me, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  const answered = new Set<string>();
  while (core.date <= petition.due && !core.durableLog.has(toldId(filing.id))) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    if (!world.helped) continue;
    const book = director.ledger.people.get(me)!;
    for (const entry of book.schedule)
      for (const binding of entry.bindings) {
        if (!["manager-offer", "offer-help"].includes(binding.typeKey))
          continue;
        const key = `${entry.momentId}:${binding.typeKey}`;
        if (answered.has(key)) continue;
        const result = purposeScene(core, director, me, entry, {
          typeKey: binding.typeKey,
        });
        if (result?.kind !== "composed") continue;
        const yes = result.scene.talk.tree.replies.findIndex(
          (r) => r.line.move === "agree",
        );
        if (yes < 0) continue;
        answered.add(key);
        const said = result.scene.talk.tree.replies[yes]!;
        write(
          `Played ask on ${core.date} (${binding.typeKey}): ${core.people.get(result.scene.askerId)!.givenName} offers. Opener: ${result.scene.talk.state.text}\nYou say: "${said.line.text}" => ${said.next?.lines.map((l) => l.text).join(" ") ?? ""}\n`,
        );
        replyInScene(core, director, me, entry, [yes], {
          typeKey: binding.typeKey,
        });
      }
  }
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
function told(world: Case, label: string, seed: string = SEED) {
  const { core, api, director, me, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  const gather = signaturesToGather(petition.needed);
  const day = playToTold(world);
  expect(day, `${PLACE} ${seed} ${label}: told as short`).toBeDefined();
  const record = core.durableLog.get(toldId(filing.id))!;
  const f = record.facts as Readonly<Record<string, string>>;
  expect(f.tellerKind, `${seed} ${label}: told by`).toBe(
    world.helped ? "helper" : "clerk",
  );
  write(
    `## ${label}: ${PLACE} ${seed}, needed ${petition.needed}, a campaign gathers ${gather}, due ${petition.due}. A canvass shift adds ${petitionShiftYield()} (${campaignParameter("playerCanvassHours")} hours x ${campaignParameter("doorsPerCanvasserHour")} doors an hour x ${campaignParameter("petitionSignOpenness")} sign).\nTold on ${day} by ${f.tellerKind} ${f.tellerId}: ${f.signed} signed of ${f.gathers}, ${f.daysLeft} days left, the days after the next turn can add ${f.canAddAfterNextTurn} against a gap of ${Number(f.gathers) - Number(f.signed)}.\n`,
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
    .filter((line) => line.date >= world.filedOn)
    .map((line) => `${line.date}: ${line.text}`);
}

/**
 * Some hours of canvass by hand, as the Campaign tab lets them: some names, not
 * all. `short` is what they must still be below: the count the office requires
 * (what the clerk measures by) or what a campaign gathers (what a helper does).
 */
function startedByHand(
  world: Case,
  hours: number,
  short: "needed" | "gathers",
) {
  const { api, filing } = world;
  takeCampaignDayChoice(api, filing.id, "canvass", { hours });
  const petition = petitionOf(api, filing.id)!;
  expect(petition.signed).toBeGreaterThan(0);
  expect(petition.signed).toBeLessThan(
    short === "needed" ? petition.needed : signaturesToGather(petition.needed),
  );
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
}, 90_000);

it("a no changes nothing: no door is walked for the player", () => {
  // The clerk is pressed once and the player says no again; a helper the
  // player knows by name takes the first no. The Journal names the helper, and
  // says "the clerk" for a clerk the player has no name for.
  for (const [label, byHelper] of [
    ["Clerk, then a no", false],
    ["Helper, then a no", true],
  ] as const) {
    const world = filer(byHelper ? HELPER_SEED : SEED, byHelper);
    const { core, director, me } = world;
    const { entry, scene } = told(world, label, byHelper ? HELPER_SEED : SEED);
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
    write(`Said no (${label}). Journal: ${journalAbout(world).join(" | ")}\n`);
    const journal = journalAbout(world).join(" ");
    expect(journal, "the Journal keeps the no").toMatch(
      byHelper
        ? /said my petition was short\. I let it wait\./
        : /[Tt]he clerk said my .+ petition was short\. I waited\./,
    );
    expect(statusOf(world), "left alone, the petition falls short").not.toBe(
      "on-ballot",
    );
  }
}, 130_000);

it("the clerk's words once some names are on the petition, below what the office requires, and a helper's words in both cases", () => {
  const started = filer();
  startedByHand(started, 0.5, "needed");
  const a = told(
    started,
    "Clerk, some names but fewer than the office requires",
  );
  expect(a.record.facts?.tellerKind).toBe("clerk");
  expect(a.record.facts?.started).toBe("yes");
  expect(Number(a.record.facts?.signed)).toBeLessThan(
    Number(a.record.facts?.needed),
  );
  const helped = filer(HELPER_SEED, true);
  const b = told(helped, "Helper, as the day goes", HELPER_SEED);
  expect(b.record.facts?.tellerKind).toBe("helper");
  const both = filer(HELPER_SEED, true);
  startedByHand(both, 0.5, "gathers");
  const c = told(both, "Helper, something signed", HELPER_SEED);
  expect(c.record.facts?.tellerKind).toBe("helper");
  expect(c.record.facts?.started).toBe("yes");
}, 190_000);

it("a clerk says nothing when the names already meet what the office requires", () => {
  const world = filer();
  const { core, api, filing } = world;
  takeCampaignDayChoice(api, filing.id, "canvass", { hours: 1 });
  const petition = petitionOf(api, filing.id)!;
  expect(
    petition.signed,
    "an hour of canvass met the requirement",
  ).toBeGreaterThanOrEqual(petition.needed);
  expect(playToTold(world), "nothing told").toBeUndefined();
  advanceCore(core, addDays(makeIsoDate(petition.due), 1));
  write(
    `## Clerk, names meet the requirement: ${PLACE} ${SEED}, ${petition.signed} signed, ${petition.needed} needed, a campaign gathers ${signaturesToGather(petition.needed)}. No one tells them; the clerk's check: ${statusOf(world)}.\n`,
  );
}, 70_000);

/**
 * Seed scan-25 of this town is a world where a volunteer fills the petition on their own
 * (found by a script outside the test; on the Train before the fold of #9539 nobody did, see
 * the PR body): the petition is on pace by play, with nothing written by the test.
 */
const ON_PACE_SEED = "scan-25";

it("a petition the count has filled by play is never told", () => {
  const world = filer(ON_PACE_SEED);
  const { core, api, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  const gather = signaturesToGather(petition.needed);
  expect(playToTold(world), "nothing told").toBeUndefined();
  advanceCore(core, addDays(makeIsoDate(petition.due), 1));
  const after = petitionOf(api, filing.id)!;
  expect(
    after.signed,
    `${PLACE} ${ON_PACE_SEED}: the petition filled with no act of the player's`,
  ).toBeGreaterThanOrEqual(gather);
  expect(campaignFor(api, filing.id).volunteerIds.length).toBeGreaterThan(0);
  expect(core.durableLog.has(toldId(filing.id))).toBe(false);
  write(
    `## On pace by play: ${PLACE} ${ON_PACE_SEED}, a volunteer filled the petition to ${after.signed} of ${gather} with no act of the player's; no one tells them; the clerk's check: ${statusOf(world)}.\n`,
  );
}, 70_000);

it("dev mode brings on the offer and traces what the engine read", () => {
  const { core, director, filing } = filer();
  const dev = new DevMode(core, director, undefined, PLACE);
  const result = dev.petitionShort(filing.id);
  expect(result.told, "dev mode advanced to the day the engine told them").toBe(
    "2025-08-03",
  );
  expect(result.tellerKind).toBe("clerk");
  expect(result.signed).toBe(0);
  expect(result.gathers).toBe(15);
  expect(result.canAddAfterNextTurn).toBe(0);
  expect(core.durableLog.has(toldId(filing.id))).toBe(true);
  const labels = controls.devCampaign;
  write(
    `## Dev mode, a petition that falls behind: the button "${labels.petitionBehind}" advanced to ${result.told}; the line shown: "${labels.petitionTold}". Told by the ${result.tellerKind}; ${result.signed} of ${result.gathers} signed, ${result.daysLeft} days left.\n`,
  );
  // A petition on pace by play is never told, and the control says so.
  const onPace = filer(ON_PACE_SEED);
  const none = new DevMode(
    onPace.core,
    onPace.director,
    undefined,
    PLACE,
  ).petitionShort(onPace.filing.id);
  expect(none.told).toBeNull();
  write(
    `## Dev mode, a petition that meets the requirement: the button "${labels.petitionBehind}"; the line shown: "${labels.petitionNotTold}".\n`,
  );
}, 130_000);

/**
 * Other worlds at the same place, so each wording of a line that the world's own pick chooses
 * between is shown: the lead, the opener, the answer and the thank are picked by the record's
 * id, so another player and filing in the same town draws another sibling. Every talk is
 * written whole, in the same layout as the cases above.
 */
it("other worlds show the other wordings of the clerk's and the helper's talk", () => {
  for (const [byHelper, seeds] of [
    [false, CLERK_SEEDS],
    [true, HELPER_SEEDS],
  ] as const) {
    for (const seed of seeds) {
      for (const started of [false, true]) {
        const world = filer(seed, byHelper);
        if (started) {
          try {
            startedByHand(world, 0.5, byHelper ? "gathers" : "needed");
          } catch {
            // A town where half an hour already meets the count has nothing short to tell.
            write(
              `## ${seed}: half an hour of canvass meets the count; no talk to show.\n`,
            );
            continue;
          }
        }
        told(
          world,
          `${byHelper ? "Helper" : "Clerk"}, ${started ? "something signed" : "nothing signed"}, another world`,
          seed,
        );
      }
    }
  }
}, 1_100_000);
