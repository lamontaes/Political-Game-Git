/**
 * A person with a recorded income award (a pension, Social Security) can leave
 * a household others stay in: the award is paid into the household where they
 * live now, the same monthly amount, and the saved award still names the
 * household it was written for. Place and seed are named in every failure
 * message; GOLDEN_PATH_SEED reproduces a run.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { createRenewalCore } from "./births-setup";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { movesModule, reviewMove } from "./modules/moves";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

describe("an income award follows its person", () => {
  it("is paid into the new household after the person leaves a shared home", () => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const place = drawPlace(seed, `income-award-moves-${attempt}`);
      const core = createRenewalCore(
        generatedOpening(place, { twoLevel: true }),
        { modules: [movesModule] },
      );
      const api = coreAPI(core);
      const where = `${place.name}, ${place.state} (${place.key}), seed ${seed}`;
      const shared = [...core.finance.contracts.values()]
        .filter((row) => {
          const term = row.recipientIncome;
          const person = term && core.people.get(term.personId);
          return (
            term &&
            !row.endedAt &&
            person?.alive &&
            person.tier !== "husk" &&
            (core.households.get(term.householdId)?.memberIds.length ?? 0) > 1
          );
        })
        .sort((a, b) => a.id.localeCompare(b.id));
      for (const row of shared) {
        const personId = row.recipientIncome!.personId;
        const homeBefore = row.recipientIncome!.householdId;
        const amount = row.amountMinor;
        api
          .moduleState("moves")
          .table("pulls")
          .put({
            id: personId,
            value: 1e9,
            causes: { fixture: 1e9 },
            reads: {},
          });
        // The engine may hold this person for another recorded reason.
        const departure = reviewMove(api, personId);
        if (!departure) continue;
        const moved = core.finance.contracts.get(row.id)!;
        const lives = core.people.get(personId)!.householdId;
        expect(lives, where).not.toBe(homeBefore);
        expect(moved.amountMinor, where).toBe(amount);
        expect(moved.recipientIncome!.householdId, where).toBe(lives);
        expect(moved.recipientIncome!.recordedHouseholdId, where).toBe(
          homeBefore,
        );
        // The next payments settle against the new household: no check
        // fails, every dollar balances.
        advanceCore(core, addDays(makeIsoDate(core.date), 70));
        expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
          core.cashJournal.totals.grossCreditMinor,
        );
        return;
      }
    }
    throw new Error(`no retiree in a shared home could leave (seed ${seed})`);
  }, 900_000);
});
