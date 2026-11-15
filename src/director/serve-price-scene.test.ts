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
 * running mates were read once and the one priced named here. From the ask
 * on, the scene, the reply, the seat, the bill, the roll call and the tie are
 * the engines' own; the player's vote is cast the way the vote button casts
 * it (castMemberVote), and the roll call is held the day the bill is drafted
 * through the route dev mode's hold-vote uses (STAGED: the bill's own floor
 * date is eleven months on).
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
  castMemberVote,
  holdVote,
  memberKey,
  members,
  votesOn,
} from "../core2/modules/legislature";
import {
  askToServe,
  offeredRunningMates,
  promiseWorth,
  serveAsk,
  ticketStanding,
  type ServeAskRow,
} from "../core2/modules/serve-asks";
import { corePlaceByKey } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { promiseSubject } from "./promise-talk";
import { promisesBetween } from "./promises";
import { purposeScene, replyInScene } from "./purpose-scene";

const PLACE = "territory:GU:santa-rita";
const LEGISLATURE = "office:US-GU:legislature-unicameral";

/**
 * Each seed's priced person, what the player answers, and, after a promise,
 * how the player then votes on a bill that moves the question: against the
 * side promised (broken) or with it (kept). `value` is the bill's section on
 * the question (1 toward yes, -1 away): at seed 9e8d7c6b5a493827 a bill toward
 * yes dies in the territory's committee, so nobody votes on it and the word
 * stays open; the bill drafted there moves it away, and the player votes no.
 */
const CASES = [
  {
    seed: "fedcba9876543210",
    asked: "Sandra Orr",
    take: "promise",
    vote: "against",
    value: 1,
  },
  {
    seed: "9e8d7c6b5a493827",
    asked: "Danielle Moseley",
    take: "promise",
    vote: "with",
    value: -1,
  },
  { seed: "1b2c3d4e5f607182", asked: "Alex Knight", take: "refuse" } as const,
] as const;

for (const c of CASES)
  it(
    `a priced no names its price; the player ${c.take === "promise" ? `promises and votes ${c.vote} it` : "refuses"} (${PLACE}, seed ${c.seed})`,
    { timeout: 300_000 },
    () => {
      setBookkeeping(false);
      try {
        const { core, director } = buildBenchWorld(c.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: PLACE,
        });
        const api = coreAPI(core);
        const where = `${corePlaceByKey(PLACE)?.displayName ?? PLACE} (${PLACE}), seed ${c.seed}`;
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
        const question = standing.grounds.question!;
        const side = standing.grounds.theirStance < 0 ? -1 : 1;
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
            promisesBetween(director.ledger, player, asked!.id as PersonId),
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
          promisesBetween(director.ledger, player, asked!.id as PersonId).find(
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
        out.push(
          `  -> ${reply.facts?.ending}; seated; ${factId} ${find().kind} held by ${player} on ${question}, side ${side}`,
        );

        // The player drafts a bill on the question from their seat and votes
        // on it at its roll call, with or against the side promised.
        const bill = seatAct(core, player, {
          kind: "draft",
          officeId: LEGISLATURE,
          question,
          value: c.value,
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
        castMemberVote(api, billId, player, vote);
        const before = closenessBetween(core, player, asked!.id as PersonId);
        // The body holds its vote today, as dev mode's hold-vote does (the
        // territory's floor leader has it on the calendar eleven months on).
        const held = holdVote(api, billId, { anyDay: true });
        const cast = votesOn(api, billId).find((v) => v.memberId === player);
        expect(
          cast,
          `${where}: the player voted at the roll call (${held.status}, ${votesOn(api, billId).length} votes)`,
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
        if (c.vote === "with") expect(after, where).toBeGreaterThan(before);
        else expect(after, where).toBeLessThan(before);
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
        out.push(
          `  ${billId} moves ${question} ${toward > 0 ? "toward" : "away from"} yes; the player voted ${vote} on ${ended.endedAt} (${ended.endedBy}): ${ended.outcome}; closeness ${before.toFixed(5)} to ${after.toFixed(5)}`,
        );
        process.stdout.write(out.join("\n") + "\n");
      } finally {
        setBookkeeping(true);
      }
    },
  );
