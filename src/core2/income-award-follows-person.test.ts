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
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { movesModule, reviewMove } from "./modules/moves";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

describe("an income award follows its person", () => {
  it("is paid into the new household after the person leaves a shared home", () => {
    const passedOver: string[] = [];
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
        // The whole household went with them: nobody stayed behind, so this
        // is not the case asked for; it is named and the next one is tried.
        if (lives === homeBefore) {
          passedOver.push(`${where}: ${personId}'s whole household moved`);
          continue;
        }
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
    throw new Error(
      `no retiree in a shared home could leave (seed ${seed}): ${passedOver.join("; ")}`,
    );
  }, 900_000);

  // A couple parts in town (partnerships' partInTown and part): the household
  // writer moves the one who goes, and their award must go with them, or the
  // next payment finds a term whose person no longer lives in its household
  // (South Ogden, Utah, seed 7a605c17-6fe1-465b-b397-caf285473399, 2025-09-01).
  it("is paid into the new household after the person changes household in town", () => {
    const passedOver: string[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      const place = drawPlace(seed, `income-award-parts-${attempt}`);
      const core = createRenewalCore(
        generatedOpening(place, { twoLevel: true }),
        { modules: [movesModule] },
      );
      const api = coreAPI(core);
      const where = `${place.name}, ${place.state} (${place.key}), seed ${seed}`;
      const adultAge = api.parameter("votingAge");
      const row = [...core.finance.contracts.values()]
        .filter((contract) => {
          const term = contract.recipientIncome;
          const person = term && core.people.get(term.personId);
          const home = term && core.households.get(term.householdId);
          return (
            term &&
            !contract.endedAt &&
            person?.alive &&
            person.tier !== "husk" &&
            home?.memberIds.some((id) => {
              const other = core.people.get(id);
              return (
                id !== person.id &&
                other?.alive &&
                ageOnDate(other.birthDate, core.date) >= adultAge
              );
            })
          );
        })
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      if (!row) {
        passedOver.push(
          `${where}: no award holder in a home with another adult`,
        );
        continue;
      }
      const personId = row.recipientIncome!.personId;
      const homeBefore = row.recipientIncome!.householdId;
      const amount = row.amountMinor;
      const newHome = `${homeBefore}:parted:${personId}:${core.date}`;
      api.changeHouseholdV1({
        personIds: [personId],
        householdId: newHome,
        source: core.households.get(homeBefore)!.source,
      });
      const moved = core.finance.contracts.get(row.id)!;
      expect(core.people.get(personId)!.householdId, where).toBe(newHome);
      expect(moved.amountMinor, where).toBe(amount);
      expect(moved.recipientIncome!.householdId, where).toBe(newHome);
      expect(moved.recipientIncome!.recordedHouseholdId, where).toBe(
        homeBefore,
      );
      // The next payments settle against the new household: no check fails,
      // every dollar balances.
      advanceCore(core, addDays(makeIsoDate(core.date), 70));
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      return;
    }
    throw new Error(
      `no drawn place had an award holder sharing a home with another adult (seed ${seed}): ${passedOver.join("; ")}`,
    );
  }, 900_000);
});
