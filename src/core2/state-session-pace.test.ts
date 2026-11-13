// @vitest-environment node
/**
 * Pool item laws-session-moves-too-many-questions. A legislator carries the
 * changes they care about most, as far as their own conviction reaches
 * (`carriedRanks`), and the floor, not the leader's hearing answer, is the one
 * road to a vote. Proved in a drawn place over a played year: a state's
 * adjourned sessions, a town or county body's ordinary members, and the
 * player's own ordinance all still reach a vote, and every filing a session did
 * not take up has a record that left it off.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain, lawInForce } from "./modules/laws";
import {
  billOf,
  bodyOf,
  draftBill,
  LEGISLATURE_MODULE_ID,
  members,
  scheduleVote,
  type BillRow,
  type CommitteeRecord,
} from "./modules/legislature";
import { townSeats } from "./modules/offices";
import {
  carriedRanks,
  legislativeSessionsOf,
  WORLD_LEGISLATING_MODULE_ID,
} from "./modules/world-legislating";
import { OFFICE_DAY_STATE_MODULE_ID } from "./office-day-state";
import { coreAPI, fillInPerson } from "./state";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const RESEARCHED_PACE =
  "State Policy Innovation and Diffusion database (Boehmke et al. 2020): more than 700 policies, 24 states each on average, 1691 to 2017, at most about six adoptions a state a year";

it("a member carries their strongest changes first and reaches further the more strongly they feel", () => {
  const cost = 0.3;
  // A strong feeler carries three of four; a mild one only their first.
  expect([...carriedRanks([2, 0.5, 0.4, 0.1], cost)].sort()).toEqual([0, 1]);
  expect([...carriedRanks([1.5, 0.9, 0.7, 0.1], cost)].sort()).toEqual([
    0, 1, 2,
  ]);
  expect([...carriedRanks([0.2, 0.19, 0.18], cost)]).toEqual([0]);
  // A change they oppose is never carried, and the listing order of the
  // changes does not change which ones they carry.
  expect(carriedRanks([-1, 0, -0.2], cost).size).toBe(0);
  const forward = carriedRanks([0.1, 1.5, 0.9, 0.7], cost);
  expect([...forward].sort()).toEqual([1, 2, 3]);
  // Reaching further down costs more: no shared cutoff, the same cost per bill
  // for everyone, a different count by conviction.
  expect(carriedRanks([1.5, 0.9, 0.7], cost).size).toBeGreaterThan(
    carriedRanks([0.4, 0.3, 0.2], cost).size,
  );
});

it(
  `state sessions go through the floor, local bodies and the player's ordinance still reach a vote (seed ${seed})`,
  { timeout: 1_800_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const tried: string[] = [];
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const place = drawPlace(seed, `state-session-pace:${attempt}`);
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        const { core, director } = buildBenchWorld(
          place.seed,
          gameStartDate(),
          { twoLevel: true, placeKey: place.key },
        );
        const api = coreAPI(core);
        const seat = townSeats(api).find(
          (row) =>
            row.holder?.personId &&
            ["city", "county"].includes(row.office.level) &&
            members(api, row.office.id).length > 1 &&
            bodyOf(api, row.office.id),
        );
        const policy = billCatalog(api, "city")
          .flatMap((subject) =>
            subject.topics.flatMap((topic) => topic.policies),
          )
          .find(
            (row) =>
              row.id === "law:sales-tax" &&
              row.authority.allowed &&
              row.operations.includes("lower"),
          );
        if (!seat || !policy) {
          tried.push(`${where}: no town body seat or sales tax not its to set`);
          continue;
        }
        // The player sits on the body and sponsors their own ordinance.
        const me = seat.holder!.personId! as PersonId;
        fillInPerson(core, me);
        new BenchPlayer(core, director).select(me);
        const base =
          lawInForce(api, policy.series!, makeIsoDate(core.date)).value ?? 0;
        const own = draftBill(api, {
          bodyOfficeId: seat.office.id,
          sponsorId: me,
          provisions: [
            provisionFor({
              policyId: policy.id,
              operation: "lower",
              amount: Math.round((base - 0.5) * 1000) / 1000,
            }),
          ],
        });
        scheduleVote(api, own.id);
        advanceCore(core, addDays(makeIsoDate(core.date), 400));

        // The player's own ordinance reached its vote.
        expect(
          billOf(api, own.id)?.status,
          `${where}: the player's ordinance ${own.id} never reached a vote`,
        ).not.toBe("drafted");

        // An ordinary member's ordinance on the same body reached a vote too.
        const localSessions = (
          api
            .moduleState(WORLD_LEGISLATING_MODULE_ID)
            .table("sessions")
            .rows() as unknown as {
            bodyOfficeId: string | null;
            bills?: { number: number; sponsor: string; fate: string }[];
          }[]
        ).filter((s) => s.bodyOfficeId === seat.office.id);
        const membersVoted = localSessions.flatMap((s) =>
          (s.bills ?? []).filter((b) => b.fate === "voted" && b.sponsor !== me),
        );
        expect(
          membersVoted.length,
          `${where}: no ordinary member's ordinance on ${seat.office.id} reached a vote`,
        ).toBeGreaterThan(0);

        // The state's adjourned sessions: the floor is the one road.
        const stateKey = lawChain(api).stateKey;
        const legislature = api.moduleState(LEGISLATURE_MODULE_ID);
        const bills = new Map(
          (legislature.table("bills").rows() as unknown as BillRow[]).map(
            (b) => [b.id, b],
          ),
        );
        const committees = legislature
          .table("committees")
          .rows() as unknown as CommitteeRecord[];
        const leaderRequests = new Map(
          (
            api
              .moduleState(OFFICE_DAY_STATE_MODULE_ID)
              .table("leaderRequests")
              .rows() as unknown as {
              id: string;
              billId: string;
              granted: boolean;
            }[]
          ).map((r) => [r.billId, r]),
        );
        const held: string[] = [];
        let sessionsRead = 0;
        for (const session of legislativeSessionsOf(api).filter(
          (s) => s.jurisdiction === stateKey && s.adjournAt <= core.date,
        )) {
          sessionsRead += 1;
          const onFloor = new Set(session.bills.map((b) => b.number));
          const voted = session.bills.filter((b) => b.fate === "voted");
          let refused = 0;
          let committeeHeld = 0;
          let heard = 0;
          for (const filing of session.filings) {
            const bill = filing.billId ? bills.get(filing.billId) : undefined;
            if (!bill) continue;
            if (committees.some((c) => c.billId === bill.id && c.heard))
              heard += 1;
            const entry = session.bills.find((b) => b.number === bill.number);
            // A bill that was voted went through the session's floor weeks,
            // never around them by the leader's answer.
            if (bill.status !== "drafted" && bill.status !== "failed")
              expect(
                onFloor.has(bill.number),
                `${where}: ${bill.id} (${bill.status}) was voted outside ${session.id}'s floor`,
              ).toBe(true);
            if (entry?.fate === "voted" || entry?.fate === "moot") continue;
            const request = leaderRequests.get(bill.id);
            const hold = committees.find(
              (c) => c.billId === bill.id && !c.heard,
            );
            if (request && !request.granted) {
              refused += 1;
              if (held.length < 4)
                held.push(
                  `${bill.id} left off by the leader's agenda record ${request.id}`,
                );
            } else if (hold) {
              committeeHeld += 1;
              if (held.length < 4)
                held.push(
                  `${bill.id} held by committee record ${hold.id} (chair ${hold.chairId})`,
                );
            } else {
              expect
                .soft(
                  entry?.fate === "not-reached",
                  `${where}: ${session.id} filing ${bill.id} (${bill.status}) has no record that left it off the floor`,
                )
                .toBe(true);
            }
          }
          const enacted = session.bills.filter((b) =>
            ["enacted", "signed", "overridden"].includes(b.status),
          );
          process.stdout.write(
            `STATE-SESSION ${where} | ${session.id}: filed=${session.filings.length}, heardInCommittee=${heard}, votedOnFloor=${voted.length} (${new Set(voted.map((b) => b.question)).size} questions), enacted=${enacted.length} (${new Set(enacted.map((b) => b.question)).size} questions), leaderRefused=${refused}, committeeHeld=${committeeHeld} | researched pace beside it, not a target: ${RESEARCHED_PACE}\n`,
          );
        }
        process.stdout.write(
          `LOCAL ${where}: player ordinance ${own.id} ${billOf(api, own.id)?.status}; ${membersVoted.length} members' ordinances voted on ${seat.office.id}\n${held.map((h) => `HELD ${h}`).join("\n")}\n`,
        );
        expect(
          sessionsRead,
          `${where}: no adjourned state session`,
        ).toBeGreaterThan(0);
        return;
      }
      throw new Error(
        `no drawn place had a town body seat: ${tried.join("; ")}`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
