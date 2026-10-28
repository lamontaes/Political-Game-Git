/**
 * A veto override's record names the chamber that decided it and the members
 * there who voted no or stayed out, nearest zero first; and a reply said in a
 * scene the record caused is a reason at the member's next vote on the
 * sponsor's bill (pool item laws-override-record-names-members-and-reads-
 * replies). Played in the bench world in a place drawn from all 56 on a seed
 * nobody chose (GOLDEN_PATH_SEED pins one), until an override fails in the
 * sponsor's own chamber with a movable member who is a full person.
 *
 * The reply is written as the scene's writer writes it (`replyInScene`: a
 * `scene.reply` naming the two people, the cause record and the move); the
 * scene that stages it, the sponsor asking the most movable member, is the
 * director's item scene-veto-override-whip. The sponsor then files the bill
 * again and the member's vote cites the reply by id.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  LEGISLATURE_MODULE_ID,
  draftBill,
  holdVote,
  votesOn,
  type BillRow,
  type CommitteeRecord,
} from "./modules/legislature";
import { coreAPI } from "./state";
import type { CoreEventInput } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places tried before giving up on a failed override with a movable full person. */
const DRAWS = 8;
/** Days played in each place at most, a month at a time. */
const MOST_DAYS = 365;
const STEP_DAYS = 30;

it("a veto override's record names its chamber and movable members, and a reply after it is a reason at the member's next vote", () => {
  setBookkeeping(false);
  const opening = gameStartDate();
  const tried: string[] = [];
  let checked = false;
  for (let draw = 0; draw < DRAWS && !checked; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "override-replies");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const records: CoreEventInput[] = [];
    api.subscribeEvents("override-replies-test", ["veto-override"], (_, e) => {
      records.push(e);
    });
    const bills = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
    // A failed override in the sponsor's own chamber, its sponsor and a
    // movable member full people still alive: the next try is theirs.
    const usable = () =>
      records
        .map((record) => {
          const bill = bills.get(String(record.facts?.billId)) as unknown as
            BillRow | undefined;
          const member = String(record.facts?.members ?? "")
            .split(",")
            .find((id) => id && api.state.people.get(id)?.alive);
          return { record, bill, member };
        })
        .find(
          ({ record, bill, member }) =>
            record.facts?.passed === "false" &&
            bill &&
            record.facts?.chamber === bill.bodyOfficeId &&
            api.state.people.get(bill.sponsorId)?.alive &&
            member,
        );
    let found = usable();
    for (let day = STEP_DAYS; !found && day <= MOST_DAYS; day += STEP_DAYS) {
      advanceCore(core, addDays(makeIsoDate(opening), day));
      found = usable();
    }
    if (!found) {
      tried.push(
        `${where}: ${records.length} override records, none failed in the sponsor's chamber with a movable full person`,
      );
      continue;
    }
    const { record, bill, member } = found as {
      record: CoreEventInput;
      bill: BillRow;
      member: string;
    };
    // The record names the chamber that decided and its no and abstain
    // members, nearest zero first: the vote rows say the same.
    const tallied = String(record.facts?.tallies)
      .split(",")
      .map((t) => t.split(":").slice(0, -1).join(":"));
    expect(tallied, `${where}: ${record.id}`).toContain(record.facts?.chamber);
    const rows = (
      votesOn(api, bill.id) as unknown as {
        id: string;
        memberId: string;
        vote: string;
        chamber?: string;
        override?: boolean;
        position: { total: number };
      }[]
    ).filter(
      (v) =>
        v.override &&
        v.chamber === record.facts?.chamber &&
        (v.vote === "no" || v.vote === "abstain") &&
        v.id === `vote:${bill.id}:${v.memberId}:override`,
    );
    const nearest = [...rows]
      .sort(
        (a, b) =>
          Math.abs(a.position.total) - Math.abs(b.position.total) ||
          a.memberId.localeCompare(b.memberId),
      )
      .map((v) => v.memberId);
    expect(record.facts?.members, `${where}: ${record.id}`).toBe(
      nearest.join(","),
    );
    // The reply, as the scene's writer records it: the sponsor asked and the
    // member agreed.
    const replyId = `scene-reply:override-replies-test:${record.id}`;
    api.emit({
      id: replyId,
      date: api.state.date,
      kind: "scene.reply",
      personIds: [member, bill.sponsorId],
      placeId: api.state.people.get(member)!.placeId,
      facts: {
        typeKey: "veto-override-whip",
        causeId: record.id,
        move: "agree",
      },
      source: {
        tag: "SOURCED",
        citation: "Recorded scene: the reply the player chose to say.",
        asOf: api.state.date,
      },
    });
    // The sponsor files the bill again; the member's vote cites the reply.
    const again = draftBill(api, {
      bodyOfficeId: bill.bodyOfficeId,
      sponsorId: bill.sponsorId,
      provisions: bill.provisions,
    });
    const refiled = holdVote(api, again.id);
    // The refiled bill can end before a floor roll call: its committee's
    // chair holds it unheard, or the committee votes it down. The member
    // then has no vote to read the reply, so the hold is named by its record
    // and the next place is tried; wherever the bill reaches the floor, the
    // member's vote must cite the reply.
    const floor = votesOn(api, again.id).filter(
      (v) =>
        !(v as { override?: boolean }).override &&
        (v as { chamber?: string }).chamber === bill.bodyOfficeId,
    );
    if (floor.length === 0) {
      const committee = api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("committees")
        .get(`committee:${again.id}:${bill.bodyOfficeId}`) as unknown as
        CommitteeRecord | undefined;
      expect(
        committee && !committee.reported,
        `${where}: ${again.id} ended ${refiled.status} with no floor vote and no committee that kept it`,
      ).toBe(true);
      tried.push(
        `${where}: ${again.number} (${again.id}) ${committee!.heard ? "voted down" : "held unheard"} in ${committee!.id}`,
      );
      continue;
    }
    const vote = floor.find((v) => v.memberId === member);
    expect(vote, `${where}: ${member} on ${again.id}`).toBeDefined();
    expect(vote!.position.replyIds, `${where}: ${vote!.memberId}`).toContain(
      replyId,
    );
    expect(vote!.position.reply, `${where}: ${member}`).toBeGreaterThan(0);
    const overrideVote = rows.find((v) => v.memberId === member)!;
    process.stdout.write(
      `OVERRIDE REPLIES ${where} (GOLDEN_PATH_SEED=${seed})\n  ${record.id}: chamber ${record.facts?.chamber}, members ${record.facts?.members} (tallies ${record.facts?.tallies})\n  ${member} voted ${overrideVote.vote} on the override (position ${overrideVote.position.total.toFixed(3)}); on ${again.number} (${again.id}) votes ${vote!.vote}, position ${vote!.position.total.toFixed(3)} with reply ${vote!.position.reply!.toFixed(3)} citing ${replyId}\n`,
    );
    checked = true;
  }
  expect(checked, `seed ${seed}: ${tried.join("; ")}`).toBe(true);
}, 3_600_000);
