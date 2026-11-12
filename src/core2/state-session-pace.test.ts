// @vitest-environment node
/**
 * State legislative sessions in three drawn places (pool item
 * laws-session-moves-too-many-questions): plays a year in each drawn place,
 * reports each state session's count of policy questions taken up and enacted
 * next to the researched SPID pace (without asserting a range on the count),
 * and verifies that every filed bill not taken up is accounted for by a real
 * record (leader refusal, committee hold, or floor time).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
  type CommitteeRecord,
} from "./modules/legislature";
import { legislativeSessionsOf } from "./modules/world-legislating";
import { OFFICE_DAY_STATE_MODULE_ID } from "./office-day-state";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const RESEARCHED_PACE =
  "SPID (Boehmke et al. 2020): >700 tracked policies, ~24 states on average 1691-2017, at most ~6 adoptions a state a year";

it(
  `reports state session pace beside researched SPID pace and traces held-back bills in three drawn places (seed ${seed})`,
  { timeout: 1_800_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const heldExamples: string[] = [];
      for (let draw = 0; draw < 3; draw += 1) {
        const place = drawPlace(`${seed}:${draw}`, "state-session-pace");
        const where = `${place.name} (${place.key}, state ${place.stateKey ?? "?"}, seed ${place.seed})`;
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        advanceCore(core, addDays(makeIsoDate(core.date), 365));
        const api = coreAPI(core);
        const stateKey = lawChain(api).stateKey;
        const sessions = legislativeSessionsOf(api).filter(
          (s) => s.jurisdiction === stateKey && s.adjournAt <= core.date,
        );
        const bills = new Map(
          (
            api
              .moduleState(LEGISLATURE_MODULE_ID)
              .table("bills")
              .rows() as unknown as BillRow[]
          ).map((b) => [b.id, b]),
        );
        const committees = api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("committees")
          .rows() as unknown as CommitteeRecord[];
        const leaderReqs = new Map(
          (
            api
              .moduleState(OFFICE_DAY_STATE_MODULE_ID)
              .table("leaderRequests")
              .rows() as unknown as {
              id: string;
              billId: string;
              granted: boolean;
              leaderId: string;
            }[]
          ).map((r) => [r.billId, r]),
        );
        for (const session of sessions) {
          const voted = session.bills.filter((b) => b.fate === "voted");
          const enacted = session.bills.filter((b) =>
            ["enacted", "signed", "overridden"].includes(b.status),
          );
          const votedQuestions = new Set(voted.map((b) => b.question)).size;
          const enactedQuestions = new Set(enacted.map((b) => b.question)).size;
          const filingBillIds = session.filings.flatMap((f) =>
            f.billId ? [f.billId] : [],
          );
          const byNumber = new Map(
            session.bills.map((b) => [b.number, b] as const),
          );
          let leaderRefused = 0;
          let committeeHeld = 0;
          let floorNotReached = 0;
          for (const billId of filingBillIds) {
            const bill = bills.get(billId);
            if (!bill) continue;
            const entry = byNumber.get(bill.number);
            if (entry?.fate === "voted" || entry?.fate === "moot") continue;
            const req = leaderReqs.get(billId);
            const comm = committees.find(
              (c) => c.billId === billId && !c.reported,
            );
            if (req && !req.granted) {
              leaderRefused += 1;
              if (heldExamples.length < 6)
                heldExamples.push(
                  `${billId} (${bill.number}) held by leader agenda record ${req.id} (leader ${req.leaderId}, granted=false)`,
                );
            } else if (comm) {
              committeeHeld += 1;
              if (heldExamples.length < 6)
                heldExamples.push(
                  `${billId} (${bill.number}) held by committee record ${comm.id} (chair ${comm.chairId}, heard=${comm.heard}, reported=${comm.reported})`,
                );
            } else if (entry?.fate === "not-reached") {
              floorNotReached += 1;
              if (heldExamples.length < 6)
                heldExamples.push(
                  `${billId} (${bill.number}) not reached on floor under ${session.id} (perWeek=${session.perWeek})`,
                );
            }
            expect(
              (req && !req.granted) ||
                Boolean(comm) ||
                entry?.fate === "not-reached",
              `${where} ${session.id}: unvoted filing ${billId} has no holding record`,
            ).toBe(true);
          }
          process.stdout.write(
            `STATE-SESSION-PACE ${where} | ${session.id} (${session.conveneAt}..${session.adjournAt}, perWeek=${session.perWeek}): filed=${session.filings.length}, takenUp=${voted.length} (${votedQuestions} questions), enacted=${enacted.length} (${enactedQuestions} questions), leaderRefused=${leaderRefused}, committeeHeld=${committeeHeld}, floorNotReached=${floorNotReached} | Researched pace: ${RESEARCHED_PACE}\n`,
          );
        }
      }
      if (heldExamples.length)
        process.stdout.write(
          `HELD-BILL-RECORDS:\n  ${heldExamples.join("\n  ")}\n`,
        );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
