/**
 * A section a member trades for, or moves as an amendment, changes the law
 * the same way a filed bill must: a repeal is written only where the body's
 * own rule stands (pool item core-world-files-repeals-of-rules-not-in-force).
 * Before the fix a council member against a policy traded their vote for a
 * section repealing a rule the town never had, and the ordinance told the
 * player of rules "now in force" that were not.
 *
 * Pinned (skill pinned-tests): both places held the fault on the train at
 * 32a994212b. Brown County's board (Kickapoo Site 1, Kansas) passed
 * Ordinance 2025-3 with a second section repealing highway money for
 * transit; Lino Lakes, Minnesota passed Ordinances 2025-1 and 2025-3 the
 * same way by February 4. The days played are the days to those meetings.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawRows } from "./modules/laws";
import {
  LEGISLATURE_MODULE_ID,
  billJurisdiction,
  type BillRow,
} from "./modules/legislature";
import { coreAPI } from "./state";

const PLACES = [
  {
    name: "Kickapoo Site 1, Kansas",
    placeKey: "2036735",
    seed: "0cf71112d131311a0b418c26f0033c8fe15db50f63a33e4809aba42621e331ab",
    // The county board's March 3 meeting, where the trade was made.
    days: 49,
  },
  {
    name: "Lino Lakes, Minnesota",
    placeKey: "2737322",
    seed: "046d2235-27df-4daa-a680-423d6f24d0d7",
    // The council's February 4 meeting.
    days: 21,
  },
];

describe("a traded section repeals only a rule the body made", () => {
  for (const place of PLACES) {
    it(`${place.name} (place ${place.placeKey}, seed ${place.seed.slice(0, 12)})`, () => {
      setBookkeeping(false);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.placeKey,
        warmUpDays: OPENING_WARMUP_DAYS,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), place.days));
      const bills = api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[];
      const where = `${place.name}, seed ${place.seed}, to ${core.date}`;
      let added = 0;
      const repealsOfNothing: string[] = [];
      for (const bill of bills) {
        const jurisdiction = billJurisdiction(api, bill);
        bill.provisions.forEach((section, at) => {
          if (section.kind !== "policy-question" || !section.question) return;
          if (at > 0) added += 1;
          if (!(section.value < 0)) return;
          // The body's own rule before this bill: its latest row that the
          // bill itself did not write.
          const own = [...lawRows(api, section.question, jurisdiction)]
            .filter((row) => row.terms?.enactedByBill !== bill.id)
            .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
          if (own?.value === 1) return;
          repealsOfNothing.push(
            `${bill.id} (${bill.number}) section ${at + 1} repeals ${section.question} at ${jurisdiction}, whose own rule is ${own ? own.value : "none"}`,
          );
        });
      }
      expect(
        bills.length,
        `${where}: no body filed a bill, so the case is not staged`,
      ).toBeGreaterThan(0);
      expect(repealsOfNothing, where).toEqual([]);
      // The trade itself still happens: members still win sections of
      // their own where the law needs the change.
      expect(
        added,
        `${where}: no section was added to any bill after its first`,
      ).toBeGreaterThan(0);
    }, 120_000);
  }
});
