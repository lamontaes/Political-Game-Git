/**
 * A person with a recorded income award (a pension, Social Security) who
 * leaves town takes it with them: the award is paid into the household where
 * they live now, the amount unchanged, and the saved award still names the
 * household it was written for (core-moves-pinned-and-income-stopgaps).
 *
 * Places are drawn from all 56 on a seed nobody chose (MOVES_AWARD_SEED pins
 * one), each in the played world, until one has a recipient the moves engine
 * lets go. Their pull to leave is built up to where leaving wins, the way a
 * year of conditions would build it, so the decision itself is the engine's:
 * `reviewMove` scores staying and leaving. A run with no recipient who moves
 * after six places fails, naming each place and why.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { MOVES_MODULE_ID, reviewMove } from "./modules/moves";
import { coreAPI } from "./state";

const seed = process.env.MOVES_AWARD_SEED ?? randomBytes(8).toString("hex");

it("pays a mover's recorded income into the household where they live now", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(seed, `moves-award:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const awards = [...core.finance.contracts.values()].filter(
      (row) => row.recipientIncome && !row.endedAt,
    );
    // Those who left and now live in a household of their own (a whole
    // household that goes together keeps its household, so its award needs no change).
    const left: { id: string; personId: string; from: string }[] = [];
    let wholeHouseholds = 0;
    for (const award of awards) {
      const personId = award.recipientIncome!.personId;
      const from = core.people.get(personId)!.householdId;
      api
        .moduleState(MOVES_MODULE_ID)
        .table("pulls")
        .put({ id: personId, value: 1e6, causes: {}, reads: {} } as never);
      if (reviewMove(api, personId)) {
        if (core.people.get(personId)!.householdId === from)
          wholeHouseholds += 1;
        else left.push({ id: award.id, personId, from });
      }
    }
    if (!left.length) {
      tried.push(
        `${where}: ${awards.length} awards, ${wholeHouseholds} moved with their whole household, none to a new one`,
      );
      continue;
    }
    for (const row of left) {
      const term = core.finance.contracts.get(row.id)!.recipientIncome!;
      const person = core.people.get(row.personId)!;
      const label = `${where}: award ${row.id}, person ${row.personId}`;
      // The award is paid into the household where they live now...
      expect(term.householdId, label).toBe(person.householdId);
      expect(core.households.get(term.householdId)?.memberIds, label).toContain(
        row.personId,
      );
      // ...the saved award still names the household it was written for...
      expect(term.recordedHouseholdId, label).toBe(row.from);
      expect(term.householdId, label).not.toBe(row.from);
      // ...and the day it moved is on the term.
      expect(term.movedOn, label).toBe(core.date);
    }
    process.stdout.write(
      `${where}: ${left.length} of ${awards.length} award recipients moved to a household of their own, first ${left[0]!.id} (${left[0]!.personId})\n`,
    );
    return;
  }
  throw new Error(`No recipient moved in 6 draws: ${tried.join("; ")}`);
}, 1_800_000);
