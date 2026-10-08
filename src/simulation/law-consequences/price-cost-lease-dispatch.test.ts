import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026/index";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { applyLawConsequences } from "../enacted-law-effects";
import { lawInForce } from "../governing/law-in-force";
import { lifePlaceByKey } from "../life-places";
import {
  hudRentRowFor,
  RENT_BASIS,
  startTownLeases,
  townLeases,
} from "../living-world/town-rent";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { personName } from "../people";
import { resourceFlowTermsAt } from "../resource-queries";
import { money, recordResourceFlowTerms } from "../resources";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { LawConsequenceRow } from "../law-consequence-types";

const QUESTION = "us-policy-positions:housing-land-use.rent-stabilization";
const SEED = "team4-m10-native-lease-dispatch-20261001";
const answers = startingLaw.questions[QUESTION].answers as Record<
  string,
  { answer: string }
>;
const available = PLACE_POPULATION_ROWS.split(";")
  .map((entry) => entry.split(":")[0]!)
  .filter((key) => {
    const place = lifePlaceByKey(key);
    const state = key.startsWith("11") ? "US-DC" : place?.stateJurisdictionKey;
    return (
      place &&
      state &&
      answers[state]?.answer === "yes" &&
      hudRentRowFor(place.context.jurisdiction.id)
    );
  });
const rng = new SeededRng(SEED);
const places: string[] = [];
while (places.length < 5 && available.length)
  places.push(...available.splice(rng.integer(0, available.length), 1));

// A fictional test clause, not a real rent cap or a production catalog admission.
// It exercises the registered writer with amounts already saved on a real lease.
const row: LawConsequenceRow = {
  id: "fixture-native-lease-price",
  kind: "price-cost",
  when: "renewal",
  who: { selector: "person-price-flows", predicates: [] },
  what: "set-resource-flow-price",
  amount: {
    op: "minimum",
    operands: [
      { op: "record", key: "current-flow-minor", unit: "minor" },
      { op: "record", key: "prior-flow-minor", unit: "minor" },
    ],
  },
  conditions: [
    { capability: "price-flow-basis", parameters: { basisKind: RENT_BASIS } },
  ],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: ["fixture:record-only-lease-clause"],
    population: "The actual named payer on a saved market lease",
    scope: "Controlled dispatcher proof, not a real legal ceiling",
    why: "The fictional clause retains the actual prior saved lease price.",
    uncertainty:
      "No numerical legal term or production consequence row is admitted.",
  },
};

describe("native price-cost dispatch on actual saved leases", () => {
  it("selects five logged places with supported lease data", () => {
    expect(places).toHaveLength(5);
  });

  it.each(places)(
    "prices the saved renewal, stamps its payer and preserves payments in %s",
    (placeKey) => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          placeKey,
          startAge: 30,
          startingLife: "ordinary-life",
          household: "lives-alone",
          questionnaire: "skipped",
          seed: `${SEED}:${placeKey}`,
        }),
      ).game!;
      let world = startTownLeases(game.world, game.world.currentDate);
      const lease = townLeases(world).find(
        (entry) => entry.regime === "market" && !entry.ended,
      );
      expect(lease).toBeDefined();
      const actual = lease!;
      const prior = resourceFlowTermsAt(world, actual.flow.id)!;
      const proposition = Object.values(world.policyCatalog.propositions).find(
        (entry) => entry.stableKey === QUESTION,
      )!;
      const law = lawInForce(world, actual.town, proposition.id)!;
      expect(law.answer).toBe("yes");
      world = {
        ...world,
        policyCatalog: {
          ...world.policyCatalog,
          propositions: {
            ...world.policyCatalog.propositions,
            [proposition.id]: { ...proposition, consequences: [row] },
          },
        },
      };
      // This is a controlled saved renewal, not a simulated anniversary or
      // researched price change. Its actual original lease remains unchanged.
      world = recordResourceFlowTerms(world, {
        stableKey: `fixture:lease-renewal:${actual.flow.id}`,
        resourceFlowId: actual.flow.id,
        effectiveAt: world.currentDate,
        status: "active",
        amount: money(prior.amount.minorUnits + 100, prior.amount.currency),
        cadenceKind: prior.cadenceKind,
        reason: "Controlled one-dollar renewal for native dispatcher proof.",
        provenance: actual.flow.provenance,
        supersedesTermsId: prior.id,
      });
      const renewal = world.history.resourceFlowTerms.at(-1)!;
      const context = {
        activity: "renewal" as const,
        activityId: renewal.id,
        onDate: world.currentDate,
        subjectIds: [actual.leaseholderId],
        questionKey: QUESTION,
      };
      const beforePayments = world.history.resourceTransferOutcomes;
      const beforeFlows = world.history.resourceFlows;
      const changed = applyLawConsequences(world, context);
      const priced = resourceFlowTermsAt(changed, actual.flow.id)!;
      expect(priced.amount).toEqual(prior.amount);
      expect(priced.supersedesTermsId).toBe(renewal.id);
      expect(priced.lawEffectStamps).toHaveLength(1);
      expect(priced.lawEffectStamps![0]).toMatchObject({
        governingLawKey: law.measureId,
        questionKey: QUESTION,
        jurisdictionId: actual.town,
        appliedAt: world.currentDate,
      });
      expect(priced.lawEffectStamps![0]!.sourceRecordIds).toEqual(
        expect.arrayContaining([
          actual.flow.id,
          renewal.id,
          prior.id,
          actual.leaseholderId,
        ]),
      );
      expect(changed.history.resourceTransferOutcomes).toBe(beforePayments);
      expect(changed.history.resourceFlows).toBe(beforeFlows);
      expect(applyLawConsequences(changed, context)).toBe(changed);
      const reopened = deserializeWorld(serializeWorld(changed));
      expect(resourceFlowTermsAt(reopened, actual.flow.id)).toEqual(priced);
      expect(applyLawConsequences(reopened, context)).toBe(reopened);
      console.log(
        `M10 native lease dispatch place=${placeKey} seed=${SEED}:${placeKey}: ${personName(changed.people[actual.leaseholderId]!)} payer=${actual.leaseholderId}, lease=${actual.flow.id}, renewal=${renewal.id}, priced=${priced.id}, prior=${prior.amount.minorUnits} ${prior.amount.currency} cents; controlled +100-cent renewal restored, no cash payment. Not a production rent cap or anniversary proof.`,
      );
    },
  );
});
