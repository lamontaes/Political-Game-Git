/**
 * A member's record keeps their vote on every question of a bill, by the
 * bill's id (pool item gov-record-vote-per-question). A bill with two
 * sections on two questions comes to a roll call in a played town and leaves
 * two record rows for each member who voted, one per question, each by its own
 * id and each with its own vote-recorded event. The campaign's promise on the
 * first question is judged by the first question's row, and a second bill
 * that carries the same number, put to the same members of the same body (a
 * new session restarts its numbers), leaves the first bill's rows where they
 * are. The Government screen shows each bill the way the floor counted it.
 *
 * The world is the bench world (every module installed) in a place drawn from
 * all 56 on a seed nobody chose; `GOLDEN_PATH_PLACE_KEY` fixes the place, and
 * `RECORD_VOTE_SEED` or `GOLDEN_PATH_SEED` the seed. The seed is in the suite's
 * name; the place and the record ids are in every failure and in the report.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { recentVotesOf } from "../bench/government-bodies";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { govReport } from "./gov-test-report";
import { CAMPAIGNS_MODULE_ID, type PromiseRow } from "./modules/campaigns";
import {
  billOf,
  draftBill,
  holdVote,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  provisionStance,
  votesOn,
  type BillRow,
  type Provision,
} from "./modules/legislature";
import { votesAreTownNews } from "./modules/officials";
import {
  RECORD_MODULE_ID,
  promisesOf,
  recordVote,
  voteRecordId,
  votesOf,
  type VoteRecordRow,
} from "./modules/record";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed =
  process.env.RECORD_VOTE_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");
const LOCAL_BODIES = ["council", "township-board", "county-board"];
/** Two sections, two questions: spending on parks and spending on police. */
const sectionsOf = (value: number): readonly Provision[] => [
  { kind: "budget-line", line: "parks", value },
  { kind: "budget-line", line: "police", value },
];
/** Worlds drawn before the test gives up on finding a town that fits. */
const DRAWS = 6;

interface Voter {
  readonly memberId: string;
  readonly vote: "yes" | "no";
}
interface Held {
  readonly officeId: string;
  /** The bill as it stood at its roll call: the two sections drafted, and any the floor added. */
  readonly bill: BillRow;
  /** The two questions the drafted sections speak to, in section order. */
  readonly drafted: readonly [string, string];
  /** Each question the bill speaks to and the way the bill points on it. */
  readonly sections: ReadonlyMap<string, number>;
  readonly voters: readonly Voter[];
  /** The floor's count: the members' yes and no votes and a tie-breaker's. */
  readonly count: { readonly yes: number; readonly no: number };
  /** Each voter's record rows on this bill the moment its roll call ended. */
  readonly rows: ReadonlyMap<string, readonly VoteRecordRow[]>;
}
interface Town {
  readonly name: string;
  readonly key: string;
  readonly worldSeed: string;
  readonly core: CoreState;
  readonly api: CoreAPI;
  readonly held: readonly Held[];
}

const recordTable = (api: CoreAPI) =>
  api.moduleState(RECORD_MODULE_ID).table("votes");
const rowsOnBill = (api: CoreAPI, memberId: string, billId: string) =>
  votesOf(api, memberId).filter((row) => row.billId === billId);
/** The rows a voter's roll call must have left: one per question of the bill, by id. */
const idsFor = (held: Held, memberId: string) =>
  [...held.sections.keys()].map((q) => voteRecordId(held.bill.id, q, memberId));

/** A body's first member drafts a two-section bill and the body votes on it. */
function hold(api: CoreAPI, officeId: string, value: number): Held | null {
  const [first] = members(api, officeId);
  if (!first) return null;
  const bill = draftBill(api, {
    bodyOfficeId: officeId,
    sponsorId: memberKey(first),
    provisions: sectionsOf(value),
  });
  if (bill.status !== "drafted" || bill.provisions.length !== 2) return null;
  const drafted = bill.provisions.map(
    (p) => provisionStance(api, p)?.question ?? "",
  );
  if (!drafted[0] || !drafted[1] || drafted[0] === drafted[1]) return null;
  holdVote(api, bill.id);
  // Committee and floor may add sections before the roll call; the roll call
  // records every section of the bill it votes. A law-amount section has no
  // question the roll call records, so it is left out here; the floor adds
  // only policy-question sections.
  const voted = billOf(api, bill.id);
  const sections = new Map<string, number>();
  for (const provision of voted.provisions) {
    const stance = provisionStance(api, provision);
    if (stance && provision.kind !== "law-amount")
      sections.set(stance.question, stance.position);
  }
  if (!sections.has(drafted[0]) || !sections.has(drafted[1])) return null;
  // The legislature's own rows on the bill: the floor roll call is
  // `vote:<bill>:<member>` and a tie-breaker's `vote:<bill>:<member>:tie`.
  // The executive's desk row has the same shape as the first, but its vote is
  // "sign" or "veto", and an override's roll call has its own suffix.
  const voters: Voter[] = [];
  let yes = 0;
  let no = 0;
  for (const v of votesOn(api, bill.id)) {
    if (v.vote !== "yes" && v.vote !== "no") continue;
    const id = (v as unknown as { id: string }).id;
    const floor = id === `vote:${bill.id}:${v.memberId}`;
    if (!floor && id !== `vote:${bill.id}:${v.memberId}:tie`) continue;
    if (floor) voters.push({ memberId: v.memberId, vote: v.vote });
    if (v.vote === "yes") yes += 1;
    else no += 1;
  }
  if (voters.length < 2) return null;
  return {
    officeId,
    bill: voted,
    drafted: [drafted[0], drafted[1]],
    sections,
    voters,
    count: { yes, no },
    rows: new Map(
      voters.map((v) => [
        v.memberId,
        rowsOnBill(api, v.memberId, bill.id).map((row) => ({ ...row })),
      ]),
    ),
  };
}

/**
 * The body's bill counter set back one, as a new session's would be: the next
 * bill drafted in the body carries the number the last one did. A local body
 * numbers its bills by year, so only a restart repeats a number for the same
 * members. This is the one thing the test sets by hand.
 */
function restartNumbers(api: CoreAPI, officeId: string): boolean {
  const counters = api.moduleState(LEGISLATURE_MODULE_ID).table("counters");
  const runs = (
    counters.rows() as unknown as { id: string; n: number }[]
  ).filter((run) => run.id.startsWith(`${officeId}:`));
  for (const run of runs) counters.put({ id: run.id, n: run.n - 1 } as never);
  return runs.length > 0;
}

/**
 * A second bill put to the body of the first, under the same number, to the
 * same members: the counter restarts, and the bill is the engine's own. Null
 * when the body cannot hold one.
 */
function holdAgain(api: CoreAPI, first: Held): Held | null {
  if (!restartNumbers(api, first.officeId)) return null;
  const again = hold(api, first.officeId, 6_000_000);
  return again && again.bill.number === first.bill.number ? again : null;
}

/** A place drawn from all 56 where a local body holds the two-section bill. */
function drawTown(): Town {
  drawn ??= findTown();
  return drawn;
}
let drawn: Town | undefined;

function findTown(): Town {
  for (let attempt = 0; attempt < DRAWS; attempt += 1) {
    const draw = drawPlace(
      attempt ? `${seed}:${attempt}` : seed,
      "record-vote-per-question",
    );
    const forced = process.env.GOLDEN_PATH_PLACE_KEY;
    const key = forced ?? draw.key;
    const world = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: key,
    });
    const api = coreAPI(world.core);
    const offices = (
      api
        .moduleState("core2-offices-v1")
        .table("offices")
        .rows() as unknown as { id: string; kind: string }[]
    )
      .filter((o) => LOCAL_BODIES.includes(o.kind))
      .sort((a, b) => a.id.localeCompare(b.id));
    const held = offices.flatMap((o) => {
      const one = hold(api, o.id, 5_000_000);
      return one ? [one] : [];
    });
    if (held.length)
      return {
        name: forced ? key : draw.name,
        key,
        worldSeed: draw.seed,
        core: world.core,
        api,
        held,
      };
  }
  throw new Error(
    `no drawn place held a two-section bill in ${DRAWS} draws (seed ${seed})`,
  );
}

describe(
  `a member's record keeps their vote on every question of a bill (draw seed ${seed})`,
  { timeout: 900_000 },
  () => {
    it("a two-section bill leaves a record row per voting member per question, each with its own event, read by promises and the Government screen", () => {
      const town = drawTown();
      const { api, core } = town;
      const one = town.held[0]!;
      const where = `${town.name} (${town.key}), world seed ${town.worldSeed}, draw seed ${seed}`;
      const [q1, q2] = one.drafted;
      const ids: string[] = [];
      let events = 0;

      for (const voter of one.voters) {
        const rows = rowsOnBill(api, voter.memberId, one.bill.id);
        const at = `${where}: ${voter.memberId} on ${one.bill.id}`;
        // A row for each question, each by its own id; never more rows than
        // the bill has sections.
        expect(
          rows.map((r) => r.id),
          at,
        ).toEqual(expect.arrayContaining(idsFor(one, voter.memberId)));
        expect(rows.length, at).toBeGreaterThanOrEqual(2);
        expect(rows.length, at).toBeLessThanOrEqual(one.bill.provisions.length);
        for (const row of rows) {
          expect(row.billId, row.id).toBe(one.bill.id);
          // The number is for display; the bill's id is the key.
          expect(row.measureId, row.id).toBe(one.bill.number);
          expect(row.id, row.id).toBe(
            voteRecordId(one.bill.id, row.stance.question, voter.memberId),
          );
          // The member's side of the section: yes carries it, no goes against.
          const section = one.sections.get(row.stance.question)!;
          expect(Math.sign(row.stance.position), row.id).toBe(
            Math.sign(voter.vote === "yes" ? section : -section),
          );
          // Each row's vote-recorded event exists by id: a member who is a
          // full person and sits for the town has one for every question.
          const event = `vote-recorded:${row.id}`;
          const told =
            api.state.people.has(voter.memberId) &&
            votesAreTownNews(api, voter.memberId);
          expect(core.eventIds.has(event), `${where}: ${event}`).toBe(told);
          if (told) events += 1;
          ids.push(row.id);
        }
      }
      // At least one voter is a person whose vote the town hears of, so the
      // events above are not an empty check, and none of a member's events
      // was dropped as already told: one for every row.
      expect(events, where).toBeGreaterThanOrEqual(2);
      expect(
        [...core.eventIds].filter((id) =>
          id.startsWith(`vote-recorded:vote:${one.bill.id}:`),
        ).length,
        where,
      ).toBe(events);

      // A promise on the first question is judged by the first question's
      // row, and one on the second by the second's, for the same member. The
      // promise rows are fixtures; the vote rows they are judged by are the
      // roll call's.
      const maker = one.voters.find((v) => api.state.people.has(v.memberId))!;
      const promises = api.moduleState(CAMPAIGNS_MODULE_ID).table("promises");
      for (const [index, question] of [q1, q2].entries()) {
        const promise: PromiseRow = {
          id: `promise:${maker.memberId}:${api.state.date}:speech:town-hall:${question}`,
          candidateId: maker.memberId,
          contestId: "contest:record-vote-per-question",
          date: api.state.date,
          stance: { question, position: 1 },
          venue: "town-hall",
          audience: 1,
        };
        promises.put(promise as never);
        const row = recordTable(api).get(
          voteRecordId(one.bill.id, question, maker.memberId),
        ) as unknown as VoteRecordRow;
        const status = promisesOf(api, maker.memberId).find(
          (p) => p.promise.id === promise.id,
        )!;
        expect(
          status.voteId,
          `${where}: promise on question ${index + 1}`,
        ).toBe(row.id);
        expect(status.status, `${where}: ${promise.id}`).toBe(
          row.stance.position > 0 ? "kept" : "broken",
        );
      }

      // A new session restarts a body's numbers, and the same members vote a
      // second bill under the first one's number, on the same questions. The
      // first body that can hold one is the pair; the promises above were
      // judged before it, while the first bill held the latest vote.
      let pair: Held | null = null;
      let again: Held | null = null;
      for (const held of town.held) {
        again = holdAgain(api, held);
        if (again) {
          pair = held;
          break;
        }
      }
      expect(
        again,
        `${where}: no body held a second bill under the first's number`,
      ).toBeTruthy();
      const second = again!;
      const first = pair!;

      // The Government screen shows each of the town's bills the way the floor
      // counted it: the floor's yes and no, passed when the body carried it.
      // The members' record rows hold each member's side of each section, so
      // a screen that tallied them would show the sections' direction, not the
      // vote.
      const roster = [...town.held, second];
      for (const held of roster) {
        const shown = recentVotesOf(api, held.officeId).find(
          (v) => v.billId === held.bill.id,
        );
        const at = `${where}: ${held.bill.id} (${held.bill.status}, floor ${held.count.yes}-${held.count.no})`;
        expect(shown, `${at}: on the body's recent votes`).toBeTruthy();
        expect(shown!.number, at).toBe(held.bill.number);
        expect(shown!.passed, at).toBe(held.bill.status !== "failed");
        expect(shown!.yes, at).toBe(held.count.yes);
        expect(shown!.no, at).toBe(held.count.no);
      }

      // A second bill with the same number, put to the same body, leaves the
      // first bill's rows exactly as its roll call wrote them.
      expect(second.officeId, where).toBe(first.officeId);
      expect(second.bill.number, where).toBe(first.bill.number);
      expect(second.bill.id, where).not.toBe(first.bill.id);
      const shared = second.voters.filter((v) =>
        first.voters.some((o) => o.memberId === v.memberId),
      );
      expect(shared.length, `${where}: members who voted both bills`).toBe(
        second.voters.length,
      );
      expect(shared.length, where).toBeGreaterThanOrEqual(2);
      for (const voter of first.voters)
        expect(
          rowsOnBill(api, voter.memberId, first.bill.id),
          `${where}: ${voter.memberId} on ${first.bill.id} after ${second.bill.id}`,
        ).toEqual(first.rows.get(voter.memberId));
      for (const voter of second.voters) {
        const rows = rowsOnBill(api, voter.memberId, second.bill.id);
        expect(
          rows.map((r) => r.id),
          `${where}: ${voter.memberId} on ${second.bill.id}`,
        ).toEqual(expect.arrayContaining(idsFor(second, voter.memberId)));
        // The member now holds both bills' rows on the same question, under
        // one number.
        const question = first.drafted[0];
        expect(
          votesOf(api, voter.memberId).filter(
            (r) =>
              r.measureId === first.bill.number &&
              r.stance.question === question,
          ).length,
          `${where}: ${voter.memberId} on ${question} under ${first.bill.number}`,
        ).toBe(2);
      }

      govReport(
        "record-vote-per-question",
        JSON.stringify({
          place: town.name,
          placeKey: town.key,
          worldSeed: town.worldSeed,
          drawSeed: seed,
          bill: one.bill.id,
          number: one.bill.number,
          sections: [...one.sections.keys()],
          voters: one.voters.length,
          floor: one.count,
          recordIds: ids,
          events,
          secondBillSameNumber: {
            firstBill: first.bill.id,
            bill: second.bill.id,
            number: second.bill.number,
            office: second.officeId,
            voters: second.voters.length,
            recordIds: second.voters.flatMap((v) => idsFor(second, v.memberId)),
          },
        }),
      );
    });

    it("a later bill that reuses a number leaves the member's earlier rows in place", () => {
      // The edge a town's bodies cannot reach without a restart of their
      // numbers: the same member voting on a second bill that carries the
      // first one's number (Congress numbers H.R. 25 again in each Congress).
      // The writer is the record's own, called with a bill the engine never
      // made, so this is the edge and not a played route.
      const town = drawTown();
      const { api, core } = town;
      const one = town.held[0]!;
      const where = `${town.name} (${town.key}), world seed ${town.worldSeed}, draw seed ${seed}`;
      // A voter whose votes the town hears of, so the event check runs.
      const voter = one.voters.find(
        (v) =>
          api.state.people.has(v.memberId) && votesAreTownNews(api, v.memberId),
      );
      expect(voter, `${where}: a voter the town hears of`).toBeTruthy();
      const [q1] = one.drafted;
      const before = recordTable(api).get(
        voteRecordId(one.bill.id, q1, voter!.memberId),
      ) as unknown as VoteRecordRow;
      expect(before, where).toBeTruthy();
      const later = recordVote(api, {
        personId: voter!.memberId,
        body: one.officeId,
        billId: `bill:next-session:${one.bill.number}`,
        measureId: one.bill.number,
        stance: { question: q1, position: -before.stance.position },
        passed: null,
      });
      expect(later.id, where).not.toBe(before.id);
      expect(recordTable(api).get(before.id), where).toEqual(before);
      expect(
        votesOf(api, voter!.memberId).filter(
          (r) => r.measureId === one.bill.number && r.stance.question === q1,
        ).length,
        where,
      ).toBeGreaterThanOrEqual(2);
      // And that vote is told too, not dropped as already told.
      expect(core.eventIds.has(`vote-recorded:${later.id}`), where).toBe(true);
      govReport(
        "record-vote-per-question",
        JSON.stringify({
          place: town.name,
          placeKey: town.key,
          worldSeed: town.worldSeed,
          drawSeed: seed,
          sameMemberSameNumber: [before.id, later.id],
        }),
      );
    });
  },
);
