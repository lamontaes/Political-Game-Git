import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import { cancelFutureDueItem } from "../future-transitions";
import { withWorldIntegrityDeferred } from "../world";
import { lawInForce } from "../governing/law-in-force";
import { lifePlaceByKey } from "../life-places";
import {
  hudRentRowFor,
  RENT_BASIS,
  renewTownLeases,
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
const SEED = "team4-m10-native-renewal-entry-20261001";
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

describe("the actual anniversary renewal calls native price-cost dispatch", () => {
  it("selects five logged places with supported lease data", () => {
    expect(places).toHaveLength(5);
  });

  it.each(places)(
    "renews the actual lease through its ordinary entry point in %s",
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
      // Controlled fixture input: a non-whole-dollar existing lease makes the
      // ordinary renewal's whole-dollar rounding observable. This is not a
      // researched market change, inflation path or legal percentage cap.
      world = recordResourceFlowTerms(world, {
        stableKey: `fixture:existing-lease-cents:${actual.flow.id}`,
        resourceFlowId: actual.flow.id,
        effectiveAt: world.currentDate,
        status: "active",
        amount: money(prior.amount.minorUnits + 51, prior.amount.currency),
        cadenceKind: prior.cadenceKind,
        reason: "Controlled existing lease cents for anniversary entry proof.",
        provenance: actual.flow.provenance,
        supersedesTermsId: prior.id,
      });
      const existing = resourceFlowTermsAt(world, actual.flow.id)!;
      // This isolates one anniversary; it does not claim normal year or clock
      // progression. Existing due records are cancelled through their writer,
      // retained in the save, rather than silently skipped or deleted.
      world = withWorldIntegrityDeferred(() => {
        let isolated = world;
        const states = new Map(
          world.history.futureDueItemStates.map((state) => [
            state.dueItemId,
            state,
          ]),
        );
        for (const item of world.history.futureDueItems) {
          if (states.get(item.id)?.status !== "scheduled") continue;
          isolated = cancelFutureDueItem(isolated, {
            stableKey: `fixture:anniversary-only:${item.id}`,
            dueItemId: item.id,
            effectiveAt: world.currentDate,
            reasonKey: "fixture:isolated-renewal",
            context:
              "Controlled anniversary entry, not a year progression proof.",
          });
        }
        return isolated;
      });
      const day = makeIsoDate(
        `${Number(actual.flow.startsAt.slice(0, 4)) + 1}-${actual.flow.startsAt.slice(5, 7)}-01`,
      );
      world = {
        ...world,
        currentDate: day,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, day),
      };
      const beforePayments = world.history.resourceTransferOutcomes;
      const beforeFlows = world.history.resourceFlows;
      const beforeObligations = world.history.resourceObligations;
      // The test never calls or mocks the dispatcher. The production renewal
      // writes its own activity and enters the admitted native registry.
      const changed = withWorldIntegrityDeferred(() =>
        renewTownLeases(world, day),
      );
      const renewal = changed.history.resourceFlowTerms.find(
        (terms) => terms.stableKey === `${actual.flow.stableKey}:renewal:1`,
      )!;
      expect(renewal).toBeDefined();
      expect(renewal.effectiveAt).toBe(day);
      expect(renewal.supersedesTermsId).toBe(existing.id);
      expect(renewal.amount.minorUnits).toBeGreaterThan(
        existing.amount.minorUnits,
      );
      const priced = resourceFlowTermsAt(changed, actual.flow.id)!;
      expect(priced.amount).toEqual(existing.amount);
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
          existing.id,
          actual.leaseholderId,
        ]),
      );
      expect(changed.history.resourceTransferOutcomes).toBe(beforePayments);
      expect(changed.history.resourceFlows).toBe(beforeFlows);
      expect(changed.history.resourceObligations).toBe(beforeObligations);
      expect(renewTownLeases(changed, day)).toBe(changed);
      const reopened = deserializeWorld(serializeWorld(changed));
      expect(resourceFlowTermsAt(reopened, actual.flow.id)).toEqual(priced);
      expect(reopened.history.resourceFlows).toEqual(beforeFlows);
      expect(reopened.history.resourceTransferOutcomes).toEqual(beforePayments);
      expect(reopened.history.resourceObligations).toEqual(beforeObligations);
      expect(renewTownLeases(reopened, day)).toBe(reopened);
      console.log(
        `M10 native anniversary entry place=${placeKey} seed=${SEED}:${placeKey}: ${personName(changed.people[actual.leaseholderId]!)} payer=${actual.leaseholderId}, lease=${actual.flow.id}, renewal=${renewal.id}, priced=${priced.id}, prior=${existing.amount.minorUnits} ${prior.amount.currency} cents; ordinary renewal=${renewal.amount.minorUnits}, native priced=${priced.amount.minorUnits}, due=${day}; no cash or obligation created. Controlled anniversary entry, not natural-year or scheduled-route proof.`,
      );
    },
  );
});
