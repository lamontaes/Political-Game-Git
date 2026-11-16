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
 * Pinned: Santa Rita, Guam, three seeds, each with the first full member of
 * the territory's legislature as the player, filed for governor (a fixture:
 * filing's own rules are the elections engine's tests). The person each seed
 * pins is the one its record prices (`promiseWorth`): the seed's offered
 * running mates were read once and the one priced named here. A price is
 * named only on a question the ticket's office can decide (Account lead,
 * Nov 15 10:45Z): every offered person's price question is checked. From the ask
 * on, the scene, the reply, the seat, the bill, the roll call and the tie are
 * the engines' own; the player drafts from their seat (seatAct), chooses
 * their vote through their seat (chooseOwnVote) and the body calls the roll
 * on its own floor day, eleven months on, so each promise case plays those
 * days (about four minutes each).
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
import { corePlaceByKey } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { questionAbout } from "../english/question-names";
import { composeJournal } from "./journal";
import { openConversation } from "./conversation";
import { promiseAnswers, promiseSubject } from "./promise-talk";
import { promisesBetween } from "../core2/modules/promises";
import { purposeScene, replyInScene } from "./purpose-scene";

const PLACE = "territory:GU:santa-rita";
/** Days the next talk is opened on until the word is brought up. */
const TALK_DAYS = 7;
/** Days the world runs for the body's roll on the bill: a year and a month. */
const ROLL_DAYS = 400;
const LEGISLATURE = "office:US-GU:legislature-unicameral";

/**
 * Each seed's priced person, what the player answers, and, after a promise,
 * how the player then votes on a bill that moves the question toward yes:
 * against the side promised (broken) or with it (kept). The two promise cases
 * were found by a script outside the test, capped at an hour, over 25 Guam
 * seeds (the played file of #9548): at seed 9e8d7c6b5a493827, pinned here
 * before, the bill dies in committee and the word stays open, so the kept case
 * is now seed 3f1a9c2e7b6d4058.
 */
const CASES = [
  {
    seed: "fedcba9876543210",
    asked: "Sandra Orr",
    take: "promise",
    vote: "against",
  },
  {
    seed: "3f1a9c2e7b6d4058",
    asked: "Susan Guzman",
    take: "promise",
    vote: "with",
  },
  { seed: "1b2c3d4e5f607182", asked: "Alex Knight", take: "refuse" } as const,
] as const;

/**
 * A world at Santa Rita with the first full member of the territory's
 * legislature as the player, filed for governor (a fixture: filing's own
 * rules are the elections engine's tests).
 */
function filedForGovernor(seed: string) {
  const { core, director } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const where = `${corePlaceByKey(PLACE)?.displayName ?? PLACE} (${PLACE}), seed ${seed}`;
  const player = members(api, LEGISLATURE)
    .map(memberKey)
    .filter((id) => core.people.get(id as PersonId)?.alive)
    .sort()[0] as PersonId;
  expect(player, `${where}: a full member`).toBeDefined();
  core.playerId = player;
  core.focusPersonIds.add(player);
  director.watch(core, player);
  const governor = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((r) => !r.special && /:governor$/.test(r.officeId))
    .sort((a, b) => a.electionDate.localeCompare(b.electionDate))[0]!;
  const ticket = ticketOfficeContest(api, governor)!;
  const filing: FilingRow = {
    id: `filing:${governor.id}:${player}`,
    contestId: governor.id,
    personId: player,
    filedOn: core.date,
    filedWith: "the territory's election commission",
    platform: [],
    party: ballot(api, governor.id)[0]?.party ?? "Democratic",
    status: "on-ballot",
  };
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .put(filing as unknown as ModuleRow);

  return { core, director, api, where, player, ticket, filing };
}

/**
 * Every offered running mate's price question is one the ticket's office can
 * decide, so the player's own later vote or signature in it can keep or break
 * the promise (Account lead, Nov 15 10:45Z). Returns each person's read.
 */
function everyPriceDecidable(
  api: ReturnType<typeof coreAPI>,
  filing: FilingRow,
  ticket: ContestRow,
  where: string,
) {
  const decided = new Set(contestPositions(api, ticket));
  const decides = (q: string) => decided.has(q);
  return offeredRunningMates(api, filing.id)!.choices.map((choice) => {
    const read = ticketStanding(api, filing, ticket, choice.id)!;
    const priceQuestion = read.grounds.priceQuestion;
    if (priceQuestion)
      expect(
        decides(priceQuestion),
        `${where}: ${choice.name}'s price on ${priceQuestion}`,
      ).toBe(true);
    return { name: choice.name, read, decides };
  });
}

/**
 * Craig Hubbard at seed 5e6f7a8b9c0d1e2f holds a federal question most
 * strongly (Medicare negotiating drug prices), which a governor cannot
 * decide: his price falls to the strongest question he holds that the
 * territory can.
 */
it(
  `a price falls to the strongest question the office can decide (${PLACE}, seed 5e6f7a8b9c0d1e2f)`,
  // 21.9 s alone and 26.0 s beside the promise and scene tests (Nov 16, fe04fc42): about twice the slower.
  { timeout: 55_000 },
  () => {
    setBookkeeping(false);
    try {
      const { api, where, filing, ticket } =
        filedForGovernor("5e6f7a8b9c0d1e2f");
      const reads = everyPriceDecidable(api, filing, ticket, where);
      const craig = reads.find((r) => r.name === "Craig Hubbard");
      expect(craig, `${where}: Craig Hubbard offered`).toBeDefined();
      const { question, priceQuestion } = craig!.read.grounds;
      expect(craig!.decides(question), `${where}: ${question}`).toBe(false);
      expect(priceQuestion, where).toBeTruthy();
      expect(priceQuestion, where).not.toBe(question);
      expect(craig!.decides(priceQuestion!), where).toBe(true);
      process.stdout.write(
        `SERVE PRICE LEVEL ${where}: Craig Hubbard holds ${question} most strongly; price on ${priceQuestion}\n`,
      );
    } finally {
      setBookkeeping(true);
    }
  },
);

for (const c of CASES)
  it(
    `a priced no names its price; the player ${c.take === "promise" ? `promises and votes ${c.vote} it` : "refuses"} (${PLACE}, seed ${c.seed})`,
    // 23.1 to 24.9 s alone and 25.3 to 28.4 s beside (Nov 16, fe04fc42): about twice the slower.
    { timeout: 55_000 },
    () => {
      setBookkeeping(false);
      try {
        const { core, director, api, where, player, ticket, filing } =
          filedForGovernor(c.seed);
        everyPriceDecidable(api, filing, ticket, where);

        // The priced person: a no from their own record, which the player's
        // word on the one question they hold would carry.
        const asked = offeredRunningMates(api, filing.id)!.choices.find(
          (r) => r.name === c.asked,
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
        expect(moves, where).toEqual(
          expect.arrayContaining(["promise", "refuse"]),
        );
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
          return;
        }

        // A promise: seated, and the player's word on the question is kept.
        expect(reply.facts?.ending, where).toBe("promised");
        expect(runningMateOf(api, filing, ticket)?.personId, where).toBe(
          asked!.id,
        );
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
        for (
          let day = 0;
          day < ROLL_DAYS && !votesOn(api, billId).length;
          day += 1
        )
          advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const cast = votesOn(api, billId).find((v) => v.memberId === player);
        expect(
          cast,
          `${where}: the player voted at the body's roll (${billOf(api, billId).status} on ${core.date}, floor day ${floor})`,
        ).toBeDefined();
        expect(cast!.vote, where).toBe(vote);
        const ended = find();
        const after = closenessBetween(core, player, asked!.id as PersonId);
        expect(ended.outcome, where).toBe(
          c.vote === "with" ? "kept" : "broken",
        );
        expect(ended.endedBy, where).toMatch(
          new RegExp(`^bill-vote:${billId}`),
        );
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
        expect(
          talkNow.choices.map((choice) => choice.move).sort(),
          where,
        ).toEqual([...promiseAnswers(core, subject!, player)].sort());
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
      } finally {
        setBookkeeping(true);
      }
    },
  );
