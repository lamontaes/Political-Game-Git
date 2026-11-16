/**
 * The petition scene says paid circulators exist, and the player's yes hires
 * them (the Account lead's trace of Nov 15, section 4: four of five short
 * petitions make it only by hiring them; the Words lead's ruling of Nov 16:
 * the clerk states how petitions work and knows nothing of the campaign's
 * money, the helper advises and knows it). Two drawn places from the trace,
 * played by the game's own days from a new player's first race the player
 * can enter (`drawPlace("jpr-pin:N", "journal-player-race:0")`, the seed and
 * key pinned below):
 * - Newry, South Carolina (jpr-pin:3): the clerk tells them, a race whose
 *   voters live mostly outside the town, 2,451 signatures asked. The town
 *   alone cannot reach it, and the hire still falls short; no line promises
 *   otherwise.
 * - Kingston, Rhode Island (jpr-pin:10): a helper tells them, the governor's
 *   race.
 * The player's own money comes from the Campaign tab's own choice (raise
 * money, a day of calls); nothing is written by the test.
 * NOT a one-minute test: each world plays months of the town's days.
 * PETITION_CIRCULATORS_PLAYED=<file> keeps the played talks and the counts.
 */
import { appendFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { fileForOffice, governmentView } from "../bench/government";
import { petitionView } from "../bench/campaign";
import { DevMode } from "../bench/dev-mode";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { campaignDayOpen, takeCampaignDayChoice } from "../core2/campaign-day";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { campaignFor, PETITION_SHORT_EVENT } from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  petitionOf,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeScene } from "./scene";
import type { TreeNode } from "./scene-talk";

const OUT = process.env.PETITION_CIRCULATORS_PLAYED;
const write = (text: string) => {
  if (OUT) appendFileSync(OUT, `${text}\n`);
};

/** jpr-pin:3, Newry, South Carolina: the clerk tells. */
const NEWRY = {
  name: "Newry, South Carolina",
  key: "4549975",
  seed: "df47a5f44a60c4506fa0315ef27a1362bf160449edc69492bbf85afd6d6b98a8",
};
/** jpr-pin:10, Kingston, Rhode Island: a helper tells. */
const KINGSTON = {
  name: "Kingston, Rhode Island",
  key: "4438980",
  seed: "56b7f0e35c6d65759ee4f44daaca3d8a7903582e7f0c3b8559ddb41c57b512ee",
};

/** jpr-pin:5, Ashaway, Rhode Island: the clerk tells, the governor's race. */
const ASHAWAY = {
  name: "Ashaway, Rhode Island",
  key: "4403520",
  seed: "66b9345be35f492816f71c60a205123d92d42f41d563cf7278e4dae3fd64599a",
};

/** jpr-pin:7, McKinney, Kentucky: a helper tells, a small race. */
const MCKINNEY = {
  name: "McKinney, Kentucky",
  key: "2149134",
  seed: "de34994b1ee6e7df065c68790373fe5923230961e679ad9241d976fe85478ca8",
};

type Place = typeof NEWRY;

/** The player files for the first race they can enter, as a player does. */
function filer(place: Place) {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const me = core.playerId!;
  director.watch(core, me);
  let contestId = "";
  for (let week = 0; week < 104 && !contestId; week += 1) {
    const open = governmentView(core, me).contests.find((row) =>
      row.checks.every((check) => check.met),
    );
    if (open) contestId = open.contest.id;
    else advanceCore(core, addDays(makeIsoDate(core.date), 7));
  }
  expect(contestId, `${place.name}: a race the player can enter`).not.toBe("");
  fileForOffice(core, me, contestId);
  const filing = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  ).find((f) => f.personId === me && f.contestId === contestId)!;
  return { core, api, director, me, filing, place };
}
type World = ReturnType<typeof filer>;

const toldId = (world: World) => `${PETITION_SHORT_EVENT}:${world.filing.id}`;

/**
 * Days until the scene is told, or the deadline. A player who raises money
 * does it as the Campaign tab lets them: a day of calls (`raise-money`), each
 * day it is offered, until the scene comes.
 */
function playToTold(world: World, raising: boolean): string | undefined {
  const { core, api, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  while (core.date <= petition.due && !core.durableLog.has(toldId(world))) {
    if (
      raising &&
      campaignDayOpen(api, filing.id).find((c) => c.kind === "raise-money")
        ?.available
    )
      takeCampaignDayChoice(api, filing.id, "raise-money");
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  return core.durableLog.has(toldId(world)) ? core.date : undefined;
}

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

function stagedEntry(world: World) {
  const book = world.director.ledger.people.get(world.me)!;
  return book.schedule.find((entry) => {
    const moment = book.momentsById.get(entry.momentId);
    return (
      moment &&
      entry.bindings.some((b) => b.typeKey === "petition-short") &&
      moment.causeId === toldId(world)
    );
  });
}

/** The told scene, composed, its whole talk written to the played file. */
function told(world: World, label: string) {
  const { core, director, me } = world;
  const entry = stagedEntry(world);
  expect(entry, `${label}: staged`).toBeDefined();
  const result = purposeScene(core, director, me, entry!, {
    typeKey: "petition-short",
  });
  expect(result?.kind, result?.kind === "skipped" ? result.reason : "").toBe(
    "composed",
  );
  if (result?.kind !== "composed") throw new Error("not composed");
  const staged = composeScene(core, director, me, entry!);
  const record = core.durableLog.get(toldId(world))!;
  const all: string[] = [];
  lines(result.scene.talk.tree, [], all);
  write(
    `## ${label}: ${world.place.name}. Told on ${core.date}: ${JSON.stringify(record.facts)}\nLead (${staged?.setting.kind}): ${staged?.narration.map((l) => l.text).join(" ")}\nOpener: ${result.scene.talk.state.text}\n\n${all.join("\n")}\n`,
  );
  return { entry: entry!, scene: result.scene, all, record };
}

/** The petition's count as dev mode shows it, written to the played file. */
function counted(world: World, label: string) {
  const dev = new DevMode(
    world.core,
    world.director,
    undefined,
    world.place.key,
  );
  const count = dev.petitionCount(world.filing.id);
  const rest = { ...count, signers: count.signers.length };
  write(
    `${label}, dev mode's petition count: ${JSON.stringify(rest)}\nThe Campaign tab's petition: ${JSON.stringify(petitionView(world.api, world.filing.id))}\n`,
  );
  return count;
}

const fundOf = (world: World) =>
  campaignFor(world.api, world.filing.id).circulatorFundMinor ?? 0;

/** The index of the first reply (under a node) whose line says this. */
const replyIndex = (node: TreeNode | null, say: RegExp) =>
  node?.replies.findIndex((reply) => say.test(reply.line.text)) ?? -1;

it("Newry: the clerk, with money raised by the player's own calls, says how petitions are carried and the yes hires them; the petition is still short and no line said otherwise", () => {
  if (OUT)
    writeFileSync(
      OUT,
      `# Petition circulators, played (head ${process.env.PLAYED_SHA ?? "unknown"})\n\n`,
    );
  const world = filer(NEWRY);
  const day = playToTold(world, true);
  expect(day, `${NEWRY.name}: told as short`).toBeDefined();
  const { core, api, director, me, filing } = world;
  const record = core.durableLog.get(toldId(world))!;
  expect(record.facts?.tellerKind).toBe("clerk");
  expect(record.facts?.circulators).toBe("yes");
  expect(
    record.facts?.money,
    "the player's own calls raised money before they were told",
  ).toBe("yes");
  const before = counted(world, "Newry, told");
  expect(before.circulatorFundMinor).toBe(0);
  const { entry, scene, all } = told(world, "Newry, the clerk, money held");
  expect(
    all.some((line) => /Campaigns pay people|pay people to carry/.test(line)),
    "the clerk says how petitions are carried out of town",
  ).toBe(true);
  const ask = replyIndex(scene.talk.tree, /How bad|What does it need/);
  expect(ask, "the player can ask").toBeGreaterThanOrEqual(0);
  const answered = scene.talk.tree.replies[ask]!.next;
  const hire = replyIndex(answered, /pay people|campaign's money/);
  expect(
    hire,
    "a hire reply is offered after the answer",
  ).toBeGreaterThanOrEqual(0);
  expect(fundOf(world), "nothing is set aside before the yes").toBe(0);
  replyInScene(core, director, me, entry, [ask, hire]);
  const fund = fundOf(world);
  expect(fund, "the yes set money aside").toBeGreaterThan(0);
  write(
    `Said "${answered!.replies[hire]!.line.text}": fund set aside $${Math.round(fund / 100)}.\n`,
  );
  counted(world, "Newry, after the yes");
  advanceCore(core, addDays(makeIsoDate(petitionOf(api, filing.id)!.due), 1));
  const after = counted(world, "Newry, after the deadline");
  write(
    `Journal: ${composeJournal(core, director, me)
      .flatMap((chapter) => chapter.lines)
      .map((line) => `${line.date}: ${line.text}`)
      .filter((text) => /petition/.test(text))
      .join(" | ")}\n`,
  );
  expect(after.outsideTown, "paid circulators brought names").toBeGreaterThan(
    0,
  );
  expect(after.signed, "the whole petition").toBeGreaterThan(before.signed);
  write(
    `Newry: ${after.signed} of ${after.needed} signed after the circulators; clerk's check ${JSON.stringify(after.check)}.\n`,
  );
}, 1_200_000);

it("Newry: with no money held the clerk still says how petitions are carried and no hire reply is offered", () => {
  const world = filer(NEWRY);
  const day = playToTold(world, false);
  expect(day, `${NEWRY.name}: told as short`).toBeDefined();
  const record = world.core.durableLog.get(toldId(world))!;
  expect(record.facts?.circulators).toBe("yes");
  expect(record.facts?.money).toBeUndefined();
  const { scene, all } = told(world, "Newry, the clerk, no money");
  expect(
    all.some((line) => /Campaigns pay people|pay people to carry/.test(line)),
    "the clerk says it, knowing nothing of the campaign's money",
  ).toBe(true);
  const ask = replyIndex(scene.talk.tree, /How bad|What does it need/);
  expect(
    replyIndex(
      scene.talk.tree.replies[ask]!.next,
      /pay people|campaign's money/,
    ),
    "no hire reply when nothing is free",
  ).toBe(-1);
  counted(world, "Newry, no money, told");
}, 1_200_000);

it("Kingston: a helper tells them paid people can carry it past the town line, and the yes hires them", () => {
  const world = filer(KINGSTON);
  const day = playToTold(world, true);
  expect(day, `${KINGSTON.name}: told as short`).toBeDefined();
  const { core, api, director, me, filing } = world;
  const record = core.durableLog.get(toldId(world))!;
  expect(record.facts?.tellerKind).toBe("helper");
  expect(record.facts?.circulators).toBe("yes");
  write(`Kingston told facts: ${JSON.stringify(record.facts)}\n`);
  const { entry, scene } = told(world, "Kingston, a helper");
  const before = counted(world, "Kingston, told");
  const ask = replyIndex(scene.talk.tree, /How bad|What does it need/);
  const answered = scene.talk.tree.replies[ask]!.next;
  const hire = replyIndex(answered, /pay people|campaign's money/);
  if (record.facts?.money === "yes") {
    expect(hire).toBeGreaterThanOrEqual(0);
    replyInScene(core, director, me, entry, [ask, hire]);
    expect(fundOf(world)).toBeGreaterThan(0);
    counted(world, "Kingston, after the yes");
  } else {
    expect(hire).toBe(-1);
  }
  advanceCore(core, addDays(makeIsoDate(petitionOf(api, filing.id)!.due), 1));
  const after = counted(world, "Kingston, after the deadline");
  write(
    `Kingston: ${before.signed} signed when told, ${after.signed} of ${after.needed} after the deadline, ${after.outsideTown} from outside town.\n`,
  );
  if (record.facts?.money === "yes")
    expect(after.outsideTown, "paid circulators brought names").toBeGreaterThan(
      0,
    );
}, 1_800_000);

it("Ashaway: the governor's race, the clerk, the yes hires and the count is read after the deadline", () => {
  const world = filer(ASHAWAY);
  const day = playToTold(world, true);
  expect(day, `${ASHAWAY.name}: told as short`).toBeDefined();
  const { core, api, director, me, filing } = world;
  const record = core.durableLog.get(toldId(world))!;
  write(`Ashaway told facts: ${JSON.stringify(record.facts)}\n`);
  const { entry, scene } = told(world, "Ashaway, the clerk");
  counted(world, "Ashaway, told");
  const ask = replyIndex(scene.talk.tree, /How bad|What does it need/);
  const answered = scene.talk.tree.replies[ask]?.next ?? null;
  const hire = replyIndex(answered, /pay people|campaign's money/);
  write(`Ashaway ask ${ask} hire ${hire}\n`);
  if (hire >= 0) replyInScene(core, director, me, entry, [ask, hire]);
  counted(world, "Ashaway, after the yes");
  advanceCore(core, addDays(makeIsoDate(petitionOf(api, filing.id)!.due), 1));
  counted(world, "Ashaway, after the deadline");
}, 1_800_000);

for (const raising of [true, false]) {
  it(`McKinney: a helper tells them, ${raising ? "with money from their own calls" : "with no money"}`, () => {
    const world = filer(MCKINNEY);
    const day = playToTold(world, raising);
    expect(day, `${MCKINNEY.name}: told as short`).toBeDefined();
    const { core, director, me } = world;
    const record = core.durableLog.get(toldId(world))!;
    write(
      `McKinney (${raising ? "raising" : "not raising"}) facts: ${JSON.stringify(record.facts)}\n`,
    );
    expect(record.facts?.tellerKind).toBe("helper");
    expect(record.facts?.circulators).toBe("yes");
    const { entry, scene, all } = told(
      world,
      `McKinney, a helper, ${raising ? "money" : "no money"}`,
    );
    counted(world, "McKinney, told");
    const ask = replyIndex(scene.talk.tree, /How bad|What does it need/);
    const answered = scene.talk.tree.replies[ask]!.next;
    const hire = replyIndex(answered, /pay people|campaign's money/);
    if (record.facts?.money === "yes") {
      expect(hire).toBeGreaterThanOrEqual(0);
      replyInScene(core, director, me, entry, [ask, hire]);
      expect(fundOf(world)).toBeGreaterThan(0);
      counted(world, "McKinney, after the yes");
    } else {
      expect(hire).toBe(-1);
      expect(
        all.some((l) => /can't pay them|doesn't have the money/.test(l)),
      ).toBe(true);
    }
  }, 600_000);
}
