/**
 * A filed player whose petition is behind is told so, once, by someone who
 * would really say it, and the answer is theirs (owner, Oct 14: "No engine
 * accepts a job, a home, a filing or any choice for the controlled person; the
 * engine offers, the player decides"). The record is written on the last turn
 * on which a canvass shift a day (`petitionShiftYield`) can still close the gap;
 * a petition the count has filled never gets one. A yes ("I'll go out and
 * knock on doors") takes the player's canvass day; a no changes nothing,
 * whether the clerk presses once more or lets it go.
 *
 * Every case finds its world by drawing places from all 56 and waiting
 * (drawn-place-tests), never by a pinned town or seed: the pins of Nov 16
 * (Sherrodsville, Ohio, scan-1 to scan-23) moved twice under the world's own
 * changes (#10032, opening siblings spaced by their own gaps, moved who the
 * clerk is; #10388, a household that follows its paper and station from day
 * one, moved who volunteers). A case draws until its premise holds (a clerk
 * who tells, a clerk who presses, a helper who tells, a petition filled by
 * play), names every place it passed over on stdout, and fails by name when
 * none of its draws holds it. GOLDEN_PATH_SEED=<seed> replays a run's draws.
 * PETITION_SHORT_PLAYED=<file> keeps the played talks and the arithmetic.
 * NOT a one-minute test: each world plays the town's days from the start
 * date to the filing window and on to the petition's due date.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
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

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places a case draws before it fails by name. */
const DRAWS = 8;
const OUT = process.env.PETITION_SHORT_PLAYED;
const write = (text: string) => {
  if (OUT) appendFileSync(OUT, `${text}\n`);
};

/** A drawn place: its key and the world seed it builds from. */
interface Drawn {
  readonly key: string;
  readonly seed: string;
  readonly where: string;
}

/**
 * Builds the drawn place, waits until its first town race opens for filing,
 * and files a resident of a household of two or more for the first race open
 * to them, as the player. Returns why not, in words, when the place has no
 * such race, no such resident, or a race that asks no petition.
 */
function build(drawn: Drawn, helped = false) {
  setBookkeeping(false);
  let world: ReturnType<typeof buildBenchWorld>;
  try {
    world = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: drawn.key,
    });
  } catch (error) {
    return `no player can live here (${(error as Error).message})`;
  }
  const { core, director } = world;
  const api = coreAPI(core);
  const local = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((c) => c.level !== "federal" && c.level !== "state")
    .filter((c) => c.electionDate > core.date)
    .sort(
      (a, b) =>
        Number(!/:council:/.test(a.officeId + a.id)) -
          Number(!/:council:/.test(b.officeId + b.id)) ||
        a.id.localeCompare(b.id),
    );
  const contest = local[0];
  if (!contest) return "no town race on the calendar";
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
  if (!entrant) return `no resident with a race open on ${core.date}`;
  (core as { playerId?: string }).playerId = entrant;
  director.watch(core, entrant);
  fileForOffice(core, entrant, contestId);
  const filing = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  ).find((f) => f.personId === entrant && f.contestId === contestId);
  if (!filing) return `the filing for ${contestId} was not taken`;
  if (!petitionOf(api, filing.id)?.needed)
    return `${contestId} asks no petition`;
  return {
    core,
    api,
    director,
    me: entrant,
    filing,
    helped,
    filedOn: core.date,
    drawn,
    where: drawn.where,
  };
}

type Case = Exclude<ReturnType<typeof build>, string>;

/** What earlier cases learned of a draw, so a later case skips one that cannot hold it. */
interface Learned {
  /** Why the place has no filed petition to play (no race, no resident, no petition). */
  unbuilt?: string;
  /** Who told the player, played with no act of the player's: the clerk, a helper, or nobody. */
  told?: "clerk" | "helper" | "none";
  /** After the player's first no, whether the clerk pressed once more. */
  presses?: boolean;
}
const learned = new Map<string, Learned>();
/** The draws a case has already shown, by `helped:key:seed`. */
const shown = new Set<string>();
const learn = (world: Case, what: Learned) => {
  const key = `${world.helped}:${world.drawn.key}:${world.drawn.seed}`;
  learned.set(key, { ...learned.get(key), ...what });
};

/**
 * Draws places until one holds the case (`holds` sets the case up and plays
 * it, returning why not, or null when it holds), names every place passed
 * over, and fails by name when none of the draws holds it. Every case walks
 * the same drawn sequence (one for a player who takes help, one for one who
 * does not), and `skip` passes over a draw an earlier case already showed
 * cannot hold this one, without building it again.
 */
function findCase(
  label: string,
  holds: (world: Case) => string | null,
  helped = false,
  skip: (known: Learned, id: string) => string | null = () => null,
): Case {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(
      seed,
      `petition-short:${helped ? "helped" : "alone"}:${draw}`,
    );
    const drawn = {
      key: place.key,
      seed: place.seed,
      where: `${place.name} (${place.key}), seed ${place.seed}`,
    };
    const id = `${helped}:${drawn.key}:${drawn.seed}`;
    const known = learned.get(id) ?? {};
    const already = known.unbuilt ?? skip(known, id);
    if (already) {
      passed.push(`${drawn.where}: ${already}`);
      continue;
    }
    const world = build(drawn, helped);
    if (typeof world === "string") {
      learned.set(`${helped}:${drawn.key}:${drawn.seed}`, { unbuilt: world });
      passed.push(`${drawn.where}: ${world}`);
      continue;
    }
    const why = holds(world);
    if (why === null) {
      shown.add(id);
      process.stdout.write(
        `${label}: ${drawn.where} (run seed ${seed}); passed over ${passed.length ? passed.join("; ") : "none"}\n`,
      );
      return world;
    }
    passed.push(`${drawn.where}: ${why}`);
  }
  throw new Error(
    `${label}: none of ${DRAWS} drawn places holds the case (run seed ${seed}): ${passed.join("; ")}`,
  );
}

/** Skips for a case played with no act of the player's: a draw known never told, or told by the other teller. */
const needsTold =
  (kind: "clerk" | "helper", press?: boolean) =>
  (known: Learned): string | null =>
    known.told === "none"
      ? "never told (an earlier case played it)"
      : known.told && known.told !== kind
        ? `told by the ${known.told} (an earlier case played it)`
        : press !== undefined &&
            known.presses !== undefined &&
            known.presses !== press
          ? `the clerk ${known.presses ? "pressed" : "let it go"} (an earlier case played it)`
          : null;

/** The same world again, from the start: the draw is the seed, so it builds the same. */
function rebuild(world: Case): Case {
  const again = build(world.drawn, world.helped);
  if (typeof again === "string")
    throw new Error(`${world.where}: did not build again: ${again}`);
  return again;
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
function told(world: Case, label: string) {
  const { core, api, director, me, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  const gather = signaturesToGather(api, filing.id);
  const day = playToTold(world);
  expect(day, `${world.where} ${label}: told as short`).toBeDefined();
  const record = core.durableLog.get(toldId(filing.id))!;
  const f = record.facts as Readonly<Record<string, string>>;
  expect(f.tellerKind, `${world.where} ${label}: told by`).toBe(
    world.helped ? "helper" : "clerk",
  );
  write(
    `## ${label}: ${world.where}, needed ${petition.needed}, a campaign gathers ${gather}, due ${petition.due}. A canvass shift adds ${petitionShiftYield()} (${campaignParameter("playerCanvassHours")} hours x ${campaignParameter("doorsPerCanvasserHour")} doors an hour x ${campaignParameter("petitionSignOpenness")} sign).\nTold on ${day} by ${f.tellerKind} ${f.tellerId}: ${f.signed} signed of ${f.gathers}, ${f.daysLeft} days left, the days after the next turn can add ${f.canAddAfterNextTurn} against a gap of ${Number(f.gathers) - Number(f.signed)}.\n`,
  );
  const entry = stagedEntry(world);
  if (!entry) {
    const book = director.ledger.people.get(me)!;
    const mine = book.schedule.filter(
      (e) => book.momentsById.get(e.momentId)?.causeId === toldId(filing.id),
    );
    throw new Error(
      `${world.where} ${label}: not staged; entries ${JSON.stringify(mine.map((e) => ({ outcome: e.outcome, coverage: e.coverage, closed: e.closed, heldBack: e.heldBack, bindings: e.bindings.map((b) => b.typeKey) })))}; moments ${book.moments.filter((m) => m.causeId === toldId(filing.id)).length}`,
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
function journalLines(world: Case) {
  return composeJournal(world.core, world.director, world.me)
    .flatMap((chapter) => chapter.lines)
    .filter((line) => line.date >= world.filedOn);
}
const journalAbout = (world: Case): string[] =>
  journalLines(world).map((line) => `${line.date}: ${line.text}`);

/**
 * Whether a Journal line tells the record: it names the record among its
 * sources, or one of its moments was caused by it (the scene it staged).
 */
function journalTells(world: Case, recordId: string): boolean {
  const book = world.director.ledger.people.get(world.me);
  return journalLines(world).some(
    (line) =>
      line.sourceRecordIds.includes(recordId) ||
      line.momentIds.some(
        (id) => book?.momentsById.get(id)?.causeId === recordId,
      ),
  );
}

/**
 * Some hours of canvass by hand, as the Campaign tab lets them: some names, not
 * all. `short` is what they must still be below: the count the office requires
 * (what the clerk measures by) or what a campaign gathers (what a helper does).
 * Returns why the drawn world cannot hold the case, or null.
 */
function startedByHand(
  world: Case,
  hours: number,
  short: "needed" | "gathers",
): string | null {
  const { api, filing } = world;
  takeCampaignDayChoice(api, filing.id, "canvass", { hours });
  const petition = petitionOf(api, filing.id)!;
  const measure =
    short === "needed" ? petition.needed : signaturesToGather(api, filing.id);
  if (petition.signed <= 0) return `${hours} hours of canvass signed nobody`;
  if (petition.signed >= measure)
    return `${hours} hours of canvass already met the ${short} count (${petition.signed} of ${measure})`;
  return null;
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

/** The premise of a case told short: the record is written, by the teller the case is about. */
function toldBy(kind: "clerk" | "helper", started = false) {
  return (world: Case): string | null => {
    const day = playToTold(world);
    const by = day
      ? (world.core.durableLog.get(toldId(world.filing.id))?.facts
          ?.tellerKind as "clerk" | "helper" | undefined)
      : undefined;
    if (!started) learn(world, { told: by ?? "none" });
    if (!day) return "never told: the petition never fell behind";
    return by === kind ? null : `told by the ${String(by)}, not the ${kind}`;
  };
}

/** The talk's answer to the player's first no: whether the teller presses once more. */
function afterTheNo(world: Case) {
  const entry = stagedEntry(world);
  if (!entry) return null;
  const result = purposeScene(world.core, world.director, world.me, entry, {
    typeKey: "petition-short",
  });
  if (result?.kind !== "composed") return null;
  const no = result.scene.talk.tree.replies.find(
    (r) => r.line.move === "deflect",
  );
  return no?.next ?? null;
}

/** A clerk tells, and after the player's no either presses once more or lets it go. */
function clerkWho(press: boolean) {
  return (world: Case): string | null => {
    const why = toldBy("clerk")(world);
    if (why) return why;
    const next = afterTheNo(world);
    if (!next) return "the talk was not staged with a no";
    const presses = next.replies.some((r) => r.line.move === "deflect");
    learn(world, { presses });
    if (presses === press) return null;
    return press
      ? "the clerk let it go after the no"
      : "the clerk pressed after the no";
  };
}

it("the clerk tells a filed player on a thin petition once; a yes takes their canvass day and they reach the ballot", () => {
  if (OUT)
    writeFileSync(
      OUT,
      `# Petition short, played (head ${process.env.PLAYED_SHA ?? "unknown"}, run seed ${seed})\n\n`,
    );
  const world = findCase(
    "clerk-tells",
    toldBy("clerk"),
    false,
    needsTold("clerk"),
  );
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
    `Said yes: doors ${before} to ${doorsOf(world)}, signed ${petitionOf(api, filing.id)!.signed} of ${signaturesToGather(api, filing.id)}.\n`,
  );
  advanceCore(core, addDays(makeIsoDate(petitionOf(api, filing.id)!.due), 1));
  write(`Journal: ${journalAbout(world).join(" | ")}\n`);
  write(`Clerk's check: ${statusOf(world)}.\n`);
  expect(statusOf(world), `${world.where}: after the player went out`).toBe(
    "on-ballot",
  );
}, 1_800_000);

it("a no changes nothing: no door is walked for the player", () => {
  // The clerk is pressed once and the player says no again; a helper the
  // player knows by name takes the first no. The Journal tells the record
  // either way, read by its id (the words are Story's).
  for (const [label, byHelper] of [
    ["Clerk, then a no", false],
    ["Helper, then a no", true],
  ] as const) {
    const world = byHelper
      ? findCase("helper-tells", toldBy("helper"), true, needsTold("helper"))
      : findCase(
          "clerk-presses",
          clerkWho(true),
          false,
          needsTold("clerk", true),
        );
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
    write(`Said no (${label}). Journal: ${journalAbout(world).join(" | ")}\n`);
    expect(
      journalTells(world, toldId(world.filing.id)),
      `${world.where} ${label}: the Journal keeps the no (tells ${toldId(world.filing.id)}): ${journalAbout(world).join(" | ")}`,
    ).toBe(true);
    expect(statusOf(world), "left alone, the petition falls short").not.toBe(
      "on-ballot",
    );
  }
}, 3_600_000);

it("a clerk who lets it go after the no says so, offers nothing more, and no door is walked", () => {
  // The other answer the clerk's own lean can give: no press, one closing
  // line, and the player has no second reply to make.
  const world = findCase(
    "clerk-lets-go",
    clerkWho(false),
    false,
    needsTold("clerk", false),
  );
  const { core, director, me } = world;
  const { entry, scene } = told(world, "Clerk who lets it go, then a no");
  const no = scene.talk.tree.replies.findIndex(
    (r) => r.line.move === "deflect",
  );
  expect(no).toBeGreaterThanOrEqual(0);
  const next = scene.talk.tree.replies[no]!.next;
  expect(next?.lines.length, "the clerk answers the no").toBeGreaterThan(0);
  expect(next?.replies, "nothing more to answer").toHaveLength(0);
  const before = doorsOf(world);
  replyInScene(core, director, me, entry, [no]);
  expect(doorsOf(world), "a no walks no door").toBe(before);
  advanceCore(
    core,
    addDays(makeIsoDate(petitionOf(world.api, world.filing.id)!.due), 1),
  );
  write(
    `Said no, the clerk let it go. Journal: ${journalAbout(world).join(" | ")}\n`,
  );
  expect(
    journalTells(world, toldId(world.filing.id)),
    `${world.where}: the Journal keeps the no (tells ${toldId(world.filing.id)}): ${journalAbout(world).join(" | ")}`,
  ).toBe(true);
  expect(statusOf(world), "left alone, the petition falls short").not.toBe(
    "on-ballot",
  );
}, 1_800_000);

it("the clerk's words once some names are on the petition, below what the office requires, and a helper's words in both cases", () => {
  const a = told(
    findCase(
      "clerk-some-names",
      (world) =>
        startedByHand(world, 0.5, "needed") ?? toldBy("clerk", true)(world),
    ),
    "Clerk, some names but fewer than the office requires",
  );
  expect(a.record.facts?.tellerKind).toBe("clerk");
  expect(a.record.facts?.started).toBe("yes");
  expect(Number(a.record.facts?.signed)).toBeLessThan(
    Number(a.record.facts?.needed),
  );
  const b = told(
    findCase("helper-tells", toldBy("helper"), true, needsTold("helper")),
    "Helper, as the day goes",
  );
  expect(b.record.facts?.tellerKind).toBe("helper");
  const c = told(
    findCase(
      "helper-some-names",
      (world) =>
        startedByHand(world, 0.5, "gathers") ?? toldBy("helper", true)(world),
      true,
    ),
    "Helper, something signed",
  );
  expect(c.record.facts?.tellerKind).toBe("helper");
  expect(c.record.facts?.started).toBe("yes");
}, 3_600_000);

it("a clerk says nothing when the names already meet what the office requires", () => {
  const world = findCase("names-meet", (w) => {
    takeCampaignDayChoice(w.api, w.filing.id, "canvass", { hours: 1 });
    const petition = petitionOf(w.api, w.filing.id)!;
    return petition.signed >= petition.needed
      ? null
      : `an hour of canvass signed ${petition.signed} of the ${petition.needed} required`;
  });
  const { core, api, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  expect(
    petition.signed,
    "an hour of canvass met the requirement",
  ).toBeGreaterThanOrEqual(petition.needed);
  expect(playToTold(world), "nothing told").toBeUndefined();
  advanceCore(core, addDays(makeIsoDate(petition.due), 1));
  write(
    `## Clerk, names meet the requirement: ${world.where}, ${petition.signed} signed, ${petition.needed} needed, a campaign gathers ${signaturesToGather(api, filing.id)}. No one tells them; the clerk's check: ${statusOf(world)}.\n`,
  );
}, 1_800_000);

/**
 * A world where the count fills the petition by play, with no act of the
 * player's, before it ever falls behind: the town's days are played until it
 * fills. A world told short first is passed over (it was behind then).
 */
function filledByPlay(world: Case): string | null {
  const { core, api, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  const gather = signaturesToGather(api, filing.id);
  while (core.date <= petition.due) {
    if (core.durableLog.has(toldId(filing.id))) {
      const by = core.durableLog.get(toldId(filing.id))?.facts?.tellerKind;
      learn(world, { told: by === "helper" ? "helper" : "clerk" });
      return `told on ${core.date} before the count filled it`;
    }
    if (petitionOf(api, filing.id)!.signed >= gather) return null;
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  return `the count reached ${petitionOf(api, filing.id)!.signed} of ${gather} by the due date`;
}

/** An on-pace case skips a draw an earlier case saw told short. */
const onPaceSkip = (known: Learned): string | null =>
  known.told && known.told !== "none"
    ? `told by the ${known.told} (an earlier case played it)`
    : null;

it("a petition the count has filled by play is never told", () => {
  const world = findCase("on-pace", filledByPlay, false, onPaceSkip);
  const { core, api, filing } = world;
  const petition = petitionOf(api, filing.id)!;
  const gather = signaturesToGather(api, filing.id);
  expect(playToTold(world), "nothing told").toBeUndefined();
  advanceCore(core, addDays(makeIsoDate(petition.due), 1));
  const after = petitionOf(api, filing.id)!;
  expect(
    after.signed,
    `${world.where}: the petition filled with no act of the player's`,
  ).toBeGreaterThanOrEqual(gather);
  expect(campaignFor(api, filing.id).volunteerIds.length).toBeGreaterThan(0);
  expect(core.durableLog.has(toldId(filing.id))).toBe(false);
  write(
    `## On pace by play: ${world.where}, a volunteer filled the petition to ${after.signed} of ${gather} with no act of the player's; no one tells them; the clerk's check: ${statusOf(world)}.\n`,
  );
}, 1_800_000);

it("dev mode brings on the offer and traces what the engine read", () => {
  // A world where the clerk tells, played to the telling, then the same world
  // built again and brought on by dev mode: dev mode reaches the same day and
  // traces what the engine read that day, from the record's own facts.
  const played = findCase(
    "dev-clerk-tells",
    toldBy("clerk"),
    false,
    needsTold("clerk"),
  );
  const record = played.core.durableLog.get(toldId(played.filing.id))!;
  const { core, director, filing } = rebuild(played);
  const dev = new DevMode(core, director, undefined, played.drawn.key);
  const result = dev.petitionShort(filing.id);
  expect(result.told, "dev mode advanced to the day the engine told them").toBe(
    record.date,
  );
  expect(result.tellerKind).toBe("clerk");
  expect(result.signed).toBe(Number(record.facts?.signed));
  expect(result.gathers).toBe(Number(record.facts?.gathers));
  expect(result.canAddAfterNextTurn).toBe(
    Number(record.facts?.canAddAfterNextTurn),
  );
  expect(core.durableLog.has(toldId(filing.id))).toBe(true);
  const labels = controls.devCampaign;
  write(
    `## Dev mode, a petition that falls behind: ${played.where}; the button "${labels.petitionBehind}" advanced to ${result.told}; the line shown: "${labels.petitionTold}". Told by the ${result.tellerKind}; ${result.signed} of ${result.gathers} signed, ${result.daysLeft} days left.\n`,
  );
  // A petition on pace by play is never told, and the control says so.
  const filled = findCase("dev-on-pace", filledByPlay, false, onPaceSkip);
  const onPace = rebuild(filled);
  const none = new DevMode(
    onPace.core,
    onPace.director,
    undefined,
    filled.drawn.key,
  ).petitionShort(onPace.filing.id);
  expect(none.told, `${filled.where}: on pace by play`).toBeNull();
  write(
    `## Dev mode, a petition that meets the requirement: ${filled.where}; the button "${labels.petitionBehind}"; the line shown: "${labels.petitionNotTold}".\n`,
  );
}, 3_600_000);

/**
 * Other worlds, so each wording of a line that the world's own pick chooses
 * between is shown: the lead, the opener, the answer and the thank are picked
 * by the record's id, so another player and filing draws another sibling.
 * Every talk is written whole, in the same layout as the cases above.
 */
it("other worlds show the other wordings of the clerk's and the helper's talk", () => {
  for (const [byHelper, count] of [
    [false, 2],
    [true, 1],
  ] as const) {
    for (let n = 0; n < count; n += 1) {
      for (const started of [false, true]) {
        const who = byHelper ? "helper" : "clerk";
        const world = findCase(
          `other-${who}-${n}-${started ? "started" : "unstarted"}`,
          (w) =>
            (started
              ? startedByHand(w, 0.5, byHelper ? "gathers" : "needed")
              : null) ?? toldBy(who, started)(w),
          byHelper,
          (known, id) =>
            shown.has(id)
              ? "shown by an earlier case"
              : started
                ? null
                : needsTold(who)(known),
        );
        told(
          world,
          `${byHelper ? "Helper" : "Clerk"}, ${started ? "something signed" : "nothing signed"}, another world`,
        );
      }
    }
  }
}, 7_200_000);
