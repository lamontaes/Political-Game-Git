// @vitest-environment node
/**
 * A state's members file new amounts for its amount laws from what the
 * bordering states set: the bill names one neighbor's own figure, and it is a
 * law-amount section the law engine enacts. Pinned: Nathrop, Colorado.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { stateAmountOn } from "./laws-starting";
import { advanceCore } from "./life";
import { LEGISLATURE_MODULE_ID, type BillRow } from "./modules/legislature";
import {
  amountChanges,
  legislativeSessionsOf,
} from "./modules/world-legislating";
import { coreAPI } from "./state";

const SEED = "612deadbcae7ad23";
const PLACE = "0853010";
const STATE = "US-CO";

it(
  `Colorado's members file an income tax bill at a bordering state's own rate (Nathrop CO, seed ${SEED})`,
  { timeout: 120_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(SEED, gameStartDate(), {
        twoLevel: true,
        placeKey: PLACE,
      });
      const api = coreAPI(core);
      // Every new amount on offer is one a neighbor already lives under.
      const changes = amountChanges(api, STATE);
      expect(changes.length).toBeGreaterThan(0);
      for (const change of changes) {
        expect(Object.values(change.neighbors)).toContain(change.value);
        expect(change.value).not.toBe(change.from);
      }
      const session = legislativeSessionsOf(api).find(
        (s) => s.jurisdiction === STATE,
      )!;
      const filing = session.filings.find(
        (f) => f.amount && f.question === "income-tax",
      );
      expect(filing?.amount?.value).toBe(4.75);
      expect(stateAmountOn("US-OK", "income-tax", "general", core.date)).toBe(
        4.75,
      );
      // Filed, it is a bill whose one section sets the rate.
      for (let day = 0; day < 60 && !filing!.billId; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const now = legislativeSessionsOf(api).find(
          (s) => s.id === session.id,
        )!;
        const billId = now.filings.find(
          (f) => f.amount && f.question === "income-tax",
        )?.billId;
        if (!billId) continue;
        const bill = api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .get(billId) as unknown as BillRow;
        expect(bill.provisions).toEqual([
          expect.objectContaining({
            kind: "law-amount",
            series: "income-tax",
            value: 4.75,
          }),
        ]);
        process.stdout.write(
          `STATE-AMOUNT Nathrop CO seed ${SEED}: ${bill.number} sets the income tax at 4.75, sponsor ${now.filings.find((f) => f.billId === billId)!.sponsor}\n`,
        );
        return;
      }
      throw new Error("The income tax filing was never introduced in 60 days.");
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
