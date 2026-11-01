/**
 * A member's record keeps their vote on every question of a bill, by the
 * bill's id (pool item gov-record-vote-per-question). A bill with two
 * sections on two questions comes to a roll call in a played town and leaves
 * two record rows for each member who voted, one per question, each by its own
 * id and each with its own vote-recorded event. The campaign's promise on the
 * first question is judged by the first question's row, and a second bill
 * that carries the same number (two local bodies each number their first bill
 * of the year the same way) leaves the first bill's rows where they are.
 *
 * The world is the bench world (every module installed) in a place drawn from
 * all 56 on a seed nobody chose; `GOLDEN_PATH_PLACE_KEY` fixes the place, and
 * `RECORD_VOTE_SEED` or `GOLDEN_PATH_SEED` the seed. The place, the seed and
 * the record ids are printed.
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
const SECTIONS: readonly Provision[] = [
  { kind: "budget-line", line: "parks", value: 5_000_000 },
  { kind: "budget-line", line: "police", value: 5_000_000 },
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
}
interface Town {
  readonly name: string;
  readonly key: string;
  readonly worldSeed: string;
  readonly core: CoreState;
  readonly api: CoreAPI;
  readonly held: readonly Held[];
}

/** A body's member drafts the two-section bill and the body votes on it. */
function holdOn(api: CoreAPI, officeId: string): Held | null {
  const [first] = members(api, officeId);
  if (!first) return null;
  const bill = draftBill(api, {
    bodyOfficeId: officeId,
    sponsorId: memberKey(first),
    provisions: SECTIONS,
  });
  if (bill.status !== "drafted" || bill.provisions.length !== 2) return null;
  const drafted = bill.provisions.map(
    (p) => provisionStance(api, p)?.question ?? "",
  );
  if (!drafted[0] || !drafted[1] || drafted[0] === drafted[1]) return null;
  holdVote(api, bill.id);
  // Committee and floor may add sections before the roll call; the roll call
  // records every section of the bill it votes.
  const voted = billOf(api, bill.id);
  const sections = new Map<string, number>();
  for (const provision of voted.provisions) {
    const stance = provisionStance(api, provision);
    if (stance && provision.kind !== "law-amount")
      sections.set(stance.question, stance.position);
  }
  // The roll call's own rows are `vote:<bill>:<member>`; the executive's
  // decision and an override's roll call sit beside them on the same bill.
  const voters: Voter[] = [];
  for (const v of votesOn(api, bill.id))
    if (
      (v as unknown as { id: string }).id === `vote:${bill.id}:${v.memberId}` &&
      (v.vote === "yes" || v.vote === "no")
    )
      voters.push({ memberId: v.memberId, vote: v.vote });
  return voters.length >= 2
    ? {
        officeId,
        bill: voted,
        drafted: [drafted[0], drafted[1]],
        sections,
        voters,
      }
    : null;
}

/**
 * A place drawn from all 56 where the local bodies hold the bill. A town where
 * two bodies each number their first bill the same is preferred, so one
 * number stands on two bills; a town with one body serves when the draws run
 * out.
 */
function drawTown(): Town {
  drawn ??= findTown();
  return drawn;
}
let drawn: Town | undefined;

function findTown(): Town {
  let fallback: Town | undefined;
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
      const one = holdOn(api, o.id);
      return one ? [one] : [];
    });
    if (!held.length) continue;
    const town: Town = {
      name: forced ? key : draw.name,
      key,
      worldSeed: draw.seed,
      core: world.core,
      api,
      held,
    };
    if (
      held.some((h) => h !== held[0] && h.bill.number === held[0]!.bill.number)
    )
      return town;
    fallback ??= town;
  }
  if (!fallback)
    throw new Error(
      `no drawn place held a two-section bill in ${DRAWS} draws (seed ${seed})`,
    );
  return fallback;
}

const recordTable = (api: CoreAPI) =>
  api.moduleState(RECORD_MODULE_ID).table("votes");
const rowsOnBill = (api: CoreAPI, memberId: string, billId: string) =>
  votesOf(api, memberId).filter((row) => row.billId === billId);
/** The rows a voter's roll call must have left: one per question of the bill, by id. */
const idsFor = (held: Held, memberId: string) =>
  [...held.sections.keys()].map((q) => voteRecordId(held.bill.id, q, memberId));

describe(
  "a member's record keeps their vote on every question of a bill",
  { timeout: 900_000 },
  () => {
    it("a two-section bill leaves a record row per voting member per question, each with its own event, read by promises and the Government screen", () => {
      const town = drawTown();
      const { api, core } = town;
      const one = town.held[0]!;
      const other = town.held.find(
        (h) => h !== one && h.bill.number === one.bill.number,
      );
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
      // row, and one on the second by the second's, for the same member.
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

      // The Government screen counts a voter once, not once per question.
      const shown = recentVotesOf(api, one.officeId).find(
        (v) => v.billId === one.bill.id,
      );
      expect(
        shown,
        `${where}: the bill is on the body's recent votes`,
      ).toBeTruthy();
      expect(shown!.yes + shown!.no, where).toBe(one.voters.length);

      // A second bill with the same number leaves the first bill's rows.
      let sameNumber = "no second body numbered its first bill the same";
      if (other) {
        sameNumber = `${other.bill.id} (${other.officeId})`;
        expect(other.bill.number, where).toBe(one.bill.number);
        expect(other.bill.id, where).not.toBe(one.bill.id);
        for (const held of [one, other])
          for (const voter of held.voters)
            expect(
              rowsOnBill(api, voter.memberId, held.bill.id).map((r) => r.id),
              `${where}: ${voter.memberId} on ${held.bill.id}`,
            ).toEqual(expect.arrayContaining(idsFor(held, voter.memberId)));
        // The number is shared; the rows are not.
        const sharing = (
          recordTable(api).rows() as unknown as VoteRecordRow[]
        ).filter((r) => r.measureId === one.bill.number);
        const billIds = new Set(sharing.map((r) => r.billId));
        expect(billIds.has(one.bill.id), where).toBe(true);
        expect(billIds.has(other.bill.id), where).toBe(true);
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
          recordIds: ids,
          events,
          secondBillSameNumber: sameNumber,
        }),
      );
    });

    it("a later bill that reuses a number leaves the member's earlier rows in place", () => {
      // The edge a town's bodies cannot reach in one year: the same member
      // voting on a second bill that carries the first one's number (Congress
      // numbers H.R. 25 again in each Congress). The writer is the record's own.
      const town = drawTown();
      const { api, core } = town;
      const one = town.held[0]!;
      const voter = one.voters[0]!;
      const where = `${town.name} (${town.key}), world seed ${town.worldSeed}`;
      const [q1] = one.drafted;
      const before = recordTable(api).get(
        voteRecordId(one.bill.id, q1, voter.memberId),
      ) as unknown as VoteRecordRow;
      expect(before, where).toBeTruthy();
      const later = recordVote(api, {
        personId: voter.memberId,
        body: one.officeId,
        billId: `${one.bill.id}:next-session`,
        measureId: one.bill.number,
        stance: { question: q1, position: -before.stance.position },
        passed: null,
      });
      expect(later.id, where).not.toBe(before.id);
      expect(recordTable(api).get(before.id), where).toEqual(before);
      expect(
        votesOf(api, voter.memberId).filter(
          (r) => r.measureId === one.bill.number && r.stance.question === q1,
        ).length,
        where,
      ).toBe(2);
      // And that vote is told too, not dropped as already told.
      if (
        api.state.people.has(voter.memberId) &&
        votesAreTownNews(api, voter.memberId)
      )
        expect(core.eventIds.has(`vote-recorded:${later.id}`), where).toBe(
          true,
        );
      govReport(
        "record-vote-per-question",
        JSON.stringify({
          place: town.name,
          placeKey: town.key,
          worldSeed: town.worldSeed,
          sameMemberSameNumber: [before.id, later.id],
        }),
      );
    });
  },
);
