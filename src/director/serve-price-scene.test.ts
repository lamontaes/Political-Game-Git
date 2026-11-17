// @vitest-environment node
/**
 * The price of a yes (brief J, pool item gov-serve-ask-price-end; Words lead
 * rulings Nov 14 16:15Z): a person the player asks to run on their ticket who
 * would say no, but holds a side on one question strongly enough that the
 * player's word on it would carry them, names that price in the scene. The
 * player promises or refuses; only their press decides. A promise seats the
 * person and is kept by the director as the player's word on the question
 * (promise kind `hold-question`), tested by the player's own votes and
 * signatures on bills that move it: a vote against the side promised breaks
 * it and strains the tie, a vote with it keeps it.
 *
 * Drawn places (CTO, Nov 17, 15:12Z and 20:31Z; skill `drawn-place-tests`):
 * the test draws places in the states whose law forms the governor's ticket
 * at filing (the only ones that offer a running mate on the first day:
 * `mayNameRunningMate`), files the first full member of the state's
 * legislature for governor (a fixture: filing's own rules are the elections
 * engine's tests), and looks through the offered running mates for one who
 * would say no but holds a side on one question strongly enough that the
 * player's word on it would carry them (`promiseWorth`). Every place passed
 * over is named, with why. It names no person: whoever the world offers.
 * A price is named only on a question the ticket's office can decide
 * (Account lead, Nov 15 10:45Z): every offered person's price question is
 * checked, and a mate whose strongest question the office cannot decide is
 * shown falling to one it can. From the ask on, the scene, the reply, the
 * seat, the bill, the roll call and the tie are the engines' own; the player
 * drafts from their seat (seatAct), chooses their vote through their seat
 * (chooseOwnVote) and the body calls the roll on its own floor day, so each
 * promise case plays those days (about four minutes each); a place whose bill
 * never reaches a roll is passed over and named, not a failure.
 */
import { expect, it } from "vitest";
import { seatAct } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween } from "../core2/closeness";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { ModuleRow } from "../core2/module-data";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  runningMateOf,
  ticketOfficeContest,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import {
  billOf,
  billStances,
  floorDateOf,
  memberKey,
  members,
  votesOn,
} from "../core2/modules/legislature";
import { chooseOwnVote } from "../bench/bill-stage";
import {
  askToServe,
  offeredRunningMates,
  promiseWorth,
  serveAsk,
  ticketStanding,
  type ServeAskRow,
} from "../core2/modules/serve-asks";
import { contestPositions } from "../core2/contest-positions";
import { drawPlace } from "../../scripts/core2-year/place";
import {
  OFFICES_MODULE_ID,
  governorTicketStage,
} from "../core2/modules/offices";
import { placeStateKey } from "../core2/place-map";
import { placeStateKeys } from "../core2/places";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { questionAbout } from "../english/question-names";
import { composeJournal } from "./journal";
import { openConversation } from "./conversation";
import { promiseAnswers, promiseSubject } from "./promise-talk";
import { promisesBetween } from "../core2/modules/promises";
import { purposeScene, replyInScene } from "./purpose-scene";
import { randomBytes } from "node:crypto";

/** Days the next talk is opened on until the word is brought up. */
const TALK_DAYS = 7;
/** Days the world runs for the body's roll on the bill: a year and a month. */
const ROLL_DAYS = 400;
/**
 * Places drawn in all, at most, while looking for priced offers; each costs a
 * world (12 to 40 s). The rate of a priced offer per at-filing place was
 * measured and is named in the test's own output (`SERVE PRICE SEARCH`).
 */
const MAX_DRAWS = 40;
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** The states whose law forms the governor's ticket at filing: the only ones that offer a running mate on the first day. */
const atFiling = new Set(
  placeStateKeys().filter(
    (key) => governorTicketStage(key, "lieutenant-governor") === "at-filing",
  ),
);

type Drawn = ReturnType<typeof drawPlace>;

/**
 * A world at a drawn place with the first full member of the state's
 * legislature as the player, filed for governor (a fixture: filing's own
 * rules are the elections engine's tests); or why the place has no such case.
 */
function filedForGovernor(place: Drawn) {
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const chamber = (
    api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
      id: string;
      kind: string;
    }[]
  ).find(
    (o) =>
      o.id.startsWith(`office:${place.state}:legislature-`) &&
      (o.kind === "legislature-lower" || o.kind === "legislature-unicameral"),
  );
  const player = chamber
    ? (members(api, chamber.id)
        .map(memberKey)
        .filter((id) => core.people.get(id as PersonId)?.alive)
        .sort()[0] as PersonId | undefined)
    : undefined;
  const governor = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((r) => !r.special && /:governor$/.test(r.officeId))
    .sort((a, b) => a.electionDate.localeCompare(b.electionDate))[0];
  const ticket = governor ? ticketOfficeContest(api, governor) : null;
  if (!player || !governor || !ticket)
    return {
      skip: `${where}: ${!player ? "no full member of the legislature" : "no governor ticket"}`,
    } as const;
  core.playerId = player;
  core.focusPersonIds.add(player);
  director.watch(core, player);
  const filing: FilingRow = {
    id: `filing:${governor.id}:${player}`,
    contestId: governor.id,
    personId: player,
    filedOn: core.date,
    filedWith: "the state's election office",
    platform: [],
    party: ballot(api, governor.id)[0]?.party ?? "Democratic",
    status: "on-ballot",
  };
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .put(filing as unknown as ModuleRow);
  return { core, director, api, where, player, ticket, filing } as const;
}

/**
 * Every offered running mate's price question is one the ticket's office can
 * decide, so the player's own later vote or signature in it can keep or break
 * the promise (Account lead, Nov 15 10:45Z); a mate whose strongest question
 * the office cannot decide falls to the strongest one it can. Returns how many
 * offered mates fell that way, and the first priced one (a no from their own
 * record that the player's word on the one question they hold would carry).
 */
function readOffers(
  api: ReturnType<typeof coreAPI>,
  filing: FilingRow,
  ticket: ContestRow,
  where: string,
) {
  const decided = new Set(contestPositions(api, ticket));
  const offered = offeredRunningMates(api, filing.id)?.choices ?? [];
  let fell = 0;
  let priced: { id: string; name: string } | null = null;
  for (const choice of offered) {
    const read = ticketStanding(api, filing, ticket, choice.id);
    if (!read) continue;
    const { question, priceQuestion } = read.grounds;
    if (priceQuestion)
      expect(
        decided.has(priceQuestion),
        `${where}: ${choice.name}'s price on ${priceQuestion}`,
      ).toBe(true);
    if (priceQuestion && !decided.has(question)) {
      expect(priceQuestion, where).not.toBe(question);
      fell += 1;
    }
    const worth = promiseWorth({
      seat: "ticket",
      standing: read,
    } as unknown as ServeAskRow);
    if (!priced && priceQuestion && read.lean <= 0 && read.lean + worth > 0)
      priced = { id: choice.id, name: choice.name };
  }
  return { offered: offered.length, fell, priced };
}

interface Found {
  readonly place: Drawn;
  readonly askedId: string;
  readonly asked: string;
}
const found: Found[] = [];
const passedOver: string[] = [];
let drawn = 0;
let offeredSeen = 0;
let fellSeen = 0;

/** Draw the next place in an at-filing state and keep it if it offers a priced no. */
function drawNext(): void {
  const place = drawPlace(seed, `serve-price:${drawn}`, (key) =>
    atFiling.has(placeStateKey(key) ?? ""),
  );
  drawn += 1;
  const filed = filedForGovernor(place);
  if ("skip" in filed) {
    passedOver.push(filed.skip);
    return;
  }
  const read = readOffers(filed.api, filed.filing, filed.ticket, filed.where);
  offeredSeen += read.offered > 0 ? 1 : 0;
  fellSeen += read.fell;
  if (read.priced)
    found.push({ place, askedId: read.priced.id, asked: read.priced.name });
  else passedOver.push(`${filed.where}: ${read.offered} offered, none priced`);
}

/** The nth place with a priced offer, drawing more places as needed. */
function foundAt(n: number): Found {
  setBookkeeping(false);
  try {
    while (found.length <= n && drawn < MAX_DRAWS) drawNext();
  } finally {
    setBookkeeping(true);
  }
  const place = found[n];
  process.stdout.write(
    `SERVE PRICE SEARCH seed ${seed}: ${drawn} at-filing places drawn, ${offeredSeen} offered a running mate, ${found.length} priced, ${fellSeen} mates fell to a decidable question; passed over: ${passedOver.join(" | ")}\n`,
  );
  if (!place)
    throw new Error(
      `No priced offer (number ${n + 1}) in ${drawn} drawn at-filing places (seed ${seed}); passed over: ${passedOver.join("; ")}`,
    );
  return place;
}

/**
 * One case at a place: the ask, the scene, and the reply; for a promise, the
 * word on record, the Journal, the bill and its roll. Returns null when the
 * case ran, or why the place was passed over (a bill that never reached the
 * player's roll).
 */
function playCase(
  f: Found,
  take: "promise" | "refuse",
  howVote?: "with" | "against",
): string | null {
  const c = { asked: f.asked, take, vote: howVote };
  setBookkeeping(false);
  try {
    const { core, director, api, where, player, ticket, filing } =
      filedForGovernor(f.place)!;

    // The priced person: a no from their own record, which the player's
    // word on the one question they hold would carry.
    const asked = offeredRunningMates(api, filing.id)!.choices.find(
      (r) => r.id === f.askedId,
    );
    expect(asked, `${where}: ${c.asked} offered`).toBeDefined();
    const standing = ticketStanding(api, filing, ticket, asked!.id)!;
    const worth = promiseWorth({
      seat: "ticket",
      standing,
    } as unknown as ServeAskRow);
    const question = standing.grounds.priceQuestion!;
    expect(question, `${where}: a price question`).toBeTruthy();
    const side = (standing.grounds.priceStance ?? 0) < 0 ? -1 : 1;
    expect(standing.lean, where).toBeLessThanOrEqual(0);
    expect(standing.lean + worth, where).toBeGreaterThan(0);
    const out = [
      `SERVE PRICE ${where}`,
      `  ${c.asked}: lean ${standing.lean.toFixed(3)}, the word on ${question} worth ${worth.toFixed(3)} (their stance ${standing.grounds.theirStance.toFixed(2)}, side ${side > 0 ? "for" : "against"})`,
    ];

    // The ask, an hour on the clock, and the scene the director stages.
    const row = askToServe(api, {
      seat: "ticket",
      filingId: filing.id,
      personId: asked!.id,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const book = director.ledger.people.get(player)!;
    const entry = book.schedule.find(
      (e) => book.momentsById.get(e.momentId)?.causeId === row.eventId,
    );
    expect(entry, `${where}: the ask staged no scene`).toBeDefined();
    const result = purposeScene(core, director, player, entry!);
    if (result?.kind !== "composed")
      throw new Error(`${where}: ${JSON.stringify(result)}`);
    const { talk } = result.scene;
    const first = talk.tree.lines[0]!;
    expect(first.move, `${where}: the price named first`).toBe("bargain");
    const moves = talk.tree.replies.map((r) => r.line.move);
    expect(moves, where).toEqual(expect.arrayContaining(["promise", "refuse"]));
    const index = moves.indexOf(c.take);
    const chosen = talk.tree.replies[index]!;
    out.push(
      ...talk.narration.map((l) => `  Narrator: ${l.text}`),
      `  ${talk.state.speaker}: ${talk.state.text}`,
      `  ${first.speaker}: ${first.text}`,
      `  ${chosen.line.speaker}: ${chosen.line.text}`,
      ...(chosen.next?.lines.map((l) => `  ${l.speaker}: ${l.text}`) ?? []),
    );
    const replyId = replyInScene(core, director, player, entry!, [index]);
    const reply = core.durableLog.get(replyId!)!;

    if (c.take === "refuse") {
      // A refusal: the no stands, and nobody is seated or owed.
      expect(reply.facts?.ending, where).toBe("turned-down");
      expect(serveAsk(api, row.id)?.answer, where).toBe("no");
      expect(runningMateOf(api, filing, ticket), where).toBeNull();
      expect(
        promisesBetween(coreAPI(core), player, asked!.id as PersonId),
        where,
      ).toEqual([]);
      out.push(`  -> ${reply.facts?.ending}; nobody seated, no promise`);
      process.stdout.write(out.join("\n") + "\n");
      return null;
    }

    // A promise: seated, and the player's word on the question is kept.
    expect(reply.facts?.ending, where).toBe("promised");
    expect(runningMateOf(api, filing, ticket)?.personId, where).toBe(asked!.id);
    const factId = `promise:${replyId}`;
    const find = () =>
      promisesBetween(coreAPI(core), player, asked!.id as PersonId).find(
        (p) => p.id === factId,
      )!;
    expect(find(), `${where}: the promise on record`).toBeDefined();
    expect(find().kind, where).toBe("hold-question");
    expect(find().holderId, `${where}: the player gave their word`).toBe(
      player,
    );
    expect(find().question, where).toBe(question);
    expect(find().side, where).toBe(side);
    expect(find().outcome, where).toBe("open");
    // The Journal tells the word as given, on its side, never as a soft
    // promise to keep a subject in mind (Words lead, Nov 15 10:58Z).
    const told = composeJournal(core, director, player)
      .flatMap((chapter) => chapter.lines)
      .filter((line) => line.momentIds.includes(replyId!));
    expect(told.length, `${where}: the Journal tells the promise`).toBe(1);
    const about = questionAbout(question)!;
    // The old premise was that no Journal line came before this one in
    // the world, so the line had no lead-in. Once an earlier line is
    // written, the Journal's own rule opens a line after a month or more
    // on the time that passed ("One month later, ..."). The promise is
    // the sentence after that lead-in (Account lead, Nov 15 16:15Z).
    const said = `I promised ${c.asked} I'd ${side > 0 ? "back" : "oppose"} ${about}.`;
    expect(told[0]!.plain ?? told[0]!.text, where).toBe(said);
    expect(told[0]!.text.endsWith(said), `${where}: ${told[0]!.text}`).toBe(
      true,
    );
    out.push(
      `  -> ${reply.facts?.ending}; seated; ${factId} ${find().kind} held by ${player} on ${question}, side ${side}`,
      `  Journal: ${told[0]!.text}`,
    );

    // The player drafts a bill on the question from their seat (the draft
    // button's seatAct) and chooses their vote on it before its floor day
    // through their seat (chooseOwnVote), with or against the side
    // promised. The body calls the roll on its own floor day (eleven
    // months on in the territory: this case plays those days, so it runs
    // about four minutes; the Account lead ruled, Nov 15 20:14Z, that a
    // vote cast for the player or a roll held early is not play).
    const bill = seatAct(core, player, {
      kind: "draft",
      officeId: LEGISLATURE,
      question,
      value: 1,
    });
    const billId = bill.id;
    const stance = billStances(api, billOf(api, billId)).find(
      (s) => s.question === question,
    );
    expect(stance, `${where}: the bill moves ${question}`).toBeDefined();
    const toward = Math.sign(stance!.position);
    expect(toward, where).not.toBe(0);
    const wanted = c.vote === "with" ? side : -side;
    const vote = wanted * toward > 0 ? "yes" : "no";
    chooseOwnVote(core, billId, vote);
    // The floor day the body sets at drafting; it may move the day as its
    // calendar fills, so the world runs until the body's roll, whenever
    // that is.
    const floor = floorDateOf(api, billId);
    expect(floor, `${where}: the body set a floor day`).toBeTruthy();
    const before = closenessBetween(core, player, asked!.id as PersonId);
    // The tie's move for the settled word, read as the promise writes it
    // (promises.ts moveTie, citing the promise; paid at once when the two
    // are together, or at their next talk). The whole year's closeness is
    // not the measure: eleven months of the two working together move
    // the tie too.
    const moved: number[] = [];
    const original = api.relationship;
    const write = original.bind(api);
    api.relationship = (...args: Parameters<typeof api.relationship>) => {
      if (args[5]?.sourceId === factId) moved.push(args[3]);
      return write(...args);
    };
    for (let day = 0; day < ROLL_DAYS && !votesOn(api, billId).length; day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const cast = votesOn(api, billId).find((v) => v.memberId === player);
    // A bill that dies in committee never has the player's roll: the place is
    // passed over and named, and the next priced place is tried.
    if (!cast)
      return `${where}: the bill never reached the player's roll (${billOf(api, billId).status} on ${core.date}, floor day ${floor})`;
    expect(cast!.vote, where).toBe(vote);
    const ended = find();
    const after = closenessBetween(core, player, asked!.id as PersonId);
    expect(ended.outcome, where).toBe(c.vote === "with" ? "kept" : "broken");
    expect(ended.endedBy, where).toMatch(new RegExp(`^bill-vote:${billId}`));
    // What the person owed can bring up: the word kept or broken, on the
    // question by its short name (promise-talk.ts).
    const subject = promiseSubject(
      core,
      director,
      asked!.id as PersonId,
      player,
    );
    expect(subject?.kind, where).toBe(
      c.vote === "with" ? "promise-kept" : "promise-broken",
    );
    expect(subject?.facts["promise-hold-question"], where).toBeDefined();
    expect(subject?.facts.issue?.text, where).toBeTruthy();
    expect(subject?.facts.about?.text, where).toBe(about);
    // The next talk: the one owed brings the word up by the proposal, and
    // the player answers from the promise talk's own answers (Words lead,
    // Nov 15 17:35Z): a broken word offers owning it, explaining and
    // denying, and never making it right, since a word on a question is
    // not renewed. A bigger subject of the day may lead, so the talk is
    // opened on each of the next days until it is said (as promises.test).
    let talkNow = openConversation(core, player, asked!.id as PersonId, {
      director,
    });
    const raisedIn = (t: typeof talkNow) =>
      t.lines.find(
        (l) => l.kind === subject!.kind && l.speakerId === asked!.id,
      );
    for (let day = 0; day < TALK_DAYS && !raisedIn(talkNow); day += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      talkNow = openConversation(core, player, asked!.id as PersonId, {
        director,
      });
    }
    const raise = raisedIn(talkNow);
    expect(
      raise?.text,
      `${where}: ${talkNow.lines.map((l) => l.text).join(" / ")}`,
    ).toContain(about);
    expect(talkNow.choices.map((choice) => choice.move).sort(), where).toEqual(
      [...promiseAnswers(core, subject!, player)].sort(),
    );
    if (c.vote !== "with")
      expect(
        talkNow.choices.map((choice) => choice.move),
        where,
      ).not.toContain("make-it-right");
    api.relationship = original;
    expect(
      moved.length,
      `${where}: the word moved the tie once (floor day ${floor}, ended ${ended.endedAt}, roll ${cast!.vote})`,
    ).toBe(1);
    if (c.vote === "with") expect(moved[0], where).toBeGreaterThan(0);
    else expect(moved[0], where).toBeLessThan(0);
    out.push(
      `  Next talk, ${core.date}: ${c.asked}: ${raise!.text}`,
      `  ${billId} moves ${question} ${toward > 0 ? "toward" : "away from"} yes; the player voted ${vote} on ${ended.endedAt} (${ended.endedBy}): ${ended.outcome}; the word's own tie move ${moved[0]} hours; closeness ${before.toFixed(5)} when the vote was chosen, ${after.toFixed(5)} after the roll`,
    );
    process.stdout.write(out.join("\n") + "\n");
    return null;
  } finally {
    setBookkeeping(true);
  }
}

it(
  "a priced no names its price and the player refuses",
  { timeout: 3_000_000 },
  () => {
    const f = foundAt(0);
    expect(playCase(f, "refuse"), f.place.name).toBeNull();
  },
);

for (const vote of ["against", "with"] as const)
  it(
    `a priced no names its price; the player promises and votes ${vote} it`,
    { timeout: 6_000_000 },
    () => {
      const skipped: string[] = [];
      for (let n = 0; ; n += 1) {
        const f = foundAt(n);
        const why = playCase(f, "promise", vote);
        if (why === null) return;
        skipped.push(why);
        process.stdout.write(`SERVE PRICE passed over: ${why}\n`);
      }
    },
  );
