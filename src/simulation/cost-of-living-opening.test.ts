import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { addDays } from "./dates";
import {
  initializeLivingCostsFlow,
  livingCostsFlowFor,
  settleLivingCosts,
} from "./cost-of-living";
import { PLACE_POPULATION_ROWS } from "./nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "./territory-places";
import {
  createResourcePosition,
  money,
  recordResourceFlowTerms,
} from "./resources";
import { resourceFlowTermsAt } from "./resource-queries";
import { SeededRng } from "./rng";
import { personName } from "./people";
import { serializeWorld, deserializeWorld } from "./serialization";

const SEED = "team4-c9-opening-flow-20260930";
const largest = new Map<string, { key: string; population: number }>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, population] = pair.split(":") as [string, string];
  const state = key.slice(0, 2);
  if ((largest.get(state)?.population ?? -1) < Number(population))
    largest.set(state, { key, population: Number(population) });
}
for (const key of ["1150000", "1571550", "7276770"])
  largest.set(key.slice(0, 2), { key, population: 0 });
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!largest.has(usps)) largest.set(usps, { key, population: 0 });
const available = [...largest.values()].map(({ key }) => key);
const rng = new SeededRng(SEED);
const watched: string[] = [];
while (watched.length < 5)
  watched.push(...available.splice(rng.integer(0, available.length), 1));

describe("the pure living-cost opening initializer", () => {
  it("selects five places from all 56 jurisdictions", () => {
    expect(largest.size).toBe(56);
    expect(watched).toHaveLength(5);
  });
  it.each(watched)(
    "opens a missing old-save charge now without retroactive payments in %s",
    (placeKey) => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey,
        seed: `${SEED}:${placeKey}`,
        startAge: 30,
        startingLife: "ordinary-life",
        household: "lives-alone",
        questionnaire: "skipped",
      });
      const personId = game.playerPersonId;
      let original = game.world;
      if (
        !original.history.resourcePositions.some(
          (position) =>
            position.owner.kind === "person" &&
            position.owner.personId === personId,
        )
      )
        original = createResourcePosition(original, {
          stableKey: `fixture:opening-funds:${personId}`,
          owner: { kind: "person", personId },
          openedAt: original.currentDate,
          openingBalance: money(100_000, "USD"),
          provenance: {
            kind: "authored",
            note: "Controlled initializer fixture funds, not researched spending.",
          },
        });
      expect(livingCostsFlowFor(original, personId)).toBeNull();
      // Controlled missing-flow save fixture; this does not claim clock advancement.
      const today = addDays(original.currentDate, 40);
      const missing = {
        ...original,
        currentDate: today,
        currentMoment: { ...original.currentMoment, date: today },
      };
      const initialized = initializeLivingCostsFlow(missing, personId);
      const flow = livingCostsFlowFor(initialized, personId)!;
      expect(flow.startsAt).toBe(today);
      expect(initialized.history.resourceTransferOutcomes).toBe(
        missing.history.resourceTransferOutcomes,
      );
      expect(initialized.people).toBe(missing.people);
      expect(initializeLivingCostsFlow(initialized, personId)).toBe(
        initialized,
      );
      expect(settleLivingCosts(initialized, personId)).toBe(initialized);
      const reopened = deserializeWorld(serializeWorld(initialized));
      expect(initializeLivingCostsFlow(reopened, personId)).toBe(reopened);
      expect(settleLivingCosts(reopened, personId)).toBe(reopened);
      console.log(
        `C9 initializer ${placeKey}, seed=${SEED}:${placeKey}, ${personName(initialized.people[personId]!)}: actual flow ${flow.id} starts ${today}; no payment or backdated charge.`,
      );

      // Opening must not reprice an existing old contract; settlement owns migration.
      const terms = resourceFlowTermsAt(initialized, flow.id)!;
      const legacy = recordResourceFlowTerms(initialized, {
        stableKey: `fixture:legacy-living-terms:${personId}`,
        resourceFlowId: flow.id,
        effectiveAt: today,
        status: "active",
        amount: money(150_000, "USD"),
        cadenceKind: terms.cadenceKind,
        supersedesTermsId: terms.id,
        reason: "Controlled pre-migration saved contract fixture.",
        provenance: flow.provenance,
      });
      expect(initializeLivingCostsFlow(legacy, personId)).toBe(legacy);
      expect(resourceFlowTermsAt(legacy, flow.id)!.amount.minorUnits).toBe(
        150_000,
      );
      expect(legacy.history.resourceTransferOutcomes).toBe(
        missing.history.resourceTransferOutcomes,
      );
    },
  );
});
