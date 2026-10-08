import { describe, expect, it } from "vitest";

import { introduceMeasure } from "../legislation";
import { legislativeBlueprint } from "../legislation-scenarios";
import { stateJurisdictionForKey } from "../life-places";
import { lifePlaceStateIdentities } from "../life-places";
import { policyOutcomeLinks } from "../policy-semantics";
import { evaluatePoliticalBeliefFormation } from "../political-belief-formation";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { searchLifePlaces } from "../index";
import type { World } from "../types";
import { schedulePoliticalReflectionForExposure } from "./political-reflection-schedule";
import { politicalReflectionTransitionHandler } from "./political-reflection";
import { politicalOutcomeFactors } from "./political-reflection-outcomes";

const stableQuestion =
  "us-policy-positions:housing-land-use.rent-stabilization";
const questionBlueprint = legislativeBlueprint("nebraska");
const outcomeLink = policyOutcomeLinks(stableQuestion).find(
  (link) => link.key === "rent-control-to-rental-supply",
)!;
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: "US-NE",
  scope: "locality",
})[0]!;
const opening = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "political-reflection-place-outcome-proof",
    placeKey: place.key,
    startAge: 40,
    questionnaire: "skipped",
  }),
).game!;

function exposedWorld() {
  const world = opening.world;
  const personId = world.personOrder.find(
    (id) => id !== opening.playerPersonId,
  )!;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === stableQuestion,
  )!;
  const withExposure = introduceMeasure(world, {
    stableKey: `place-outcome-reflection:${personId}`,
    jurisdictionId: questionBlueprint.context.jurisdiction.id,
    rulePackId: questionBlueprint.pack.packId,
    designation: "LB 999",
    shortTitle: "Question Encounter",
    summary: "A recorded encounter with a policy question.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: personId,
    propositionIds: [proposition.id],
  });
  return {
    world: withExposure,
    personId,
    propositionId: proposition.id,
    exposureId: withExposure.history.propositionExposures.at(-1)!.id,
  };
}

function worldAtState(
  base: ReturnType<typeof exposedWorld>,
  stateKey: string,
  causeFactor: number,
) {
  const jurisdiction = stateJurisdictionForKey(stateKey);
  if (!jurisdiction) throw new Error(`Missing state identity: ${stateKey}`);
  const person = base.world.people[base.personId]!;
  const moveCurrentResidence = <T extends { readonly kind: string }>(
    fact: T,
  ) =>
    fact.kind === "residence" && "endedAt" in fact && fact.endedAt === null
      ? { ...fact, jurisdictionId: jurisdiction.id }
      : fact;
  const currentDate = base.world.currentDate;
  const outcome = {
    measure: outcomeLink.to,
    placeKey: stateKey,
    jurisdictionId: jurisdiction.id,
    month: currentDate,
    base: 100,
    structural: 100,
    multiplier: causeFactor,
    value: 100 * causeFactor,
    causes: [{ key: outcomeLink.key, factor: causeFactor }],
  };
  const world: World = {
    ...base.world,
    people: {
      ...base.world.people,
      [base.personId]: {
        ...person,
        homeJurisdictionId: jurisdiction.id,
        establishedFacts: person.establishedFacts.map(moveCurrentResidence),
        ...(person.detailLevel === "materialized"
          ? {
              details: {
                ...person.details,
                generatedFacts:
                  person.details.generatedFacts.map(moveCurrentResidence),
              },
            }
          : {}),
      },
    },
    placeOutcomes: {
      months: [{ month: currentDate, records: [outcome] }],
    },
  };
  return world;
}

describe("place outcomes in political reflection", () => {
  it("changes the reflected view and cites the moved outcome across all 56 identities", () => {
    expect(outcomeLink.status).toBe("built");
    const base = exposedWorld();
    for (const state of lifePlaceStateIdentities()) {
      const alignedWorld = worldAtState(
        base,
        state.jurisdictionKey,
        Math.exp(-2),
      );
      const opposedWorld = worldAtState(
        base,
        state.jurisdictionKey,
        Math.exp(2),
      );
      const aligned = evaluatePoliticalBeliefFormation(alignedWorld, {
        stableKey: `place-outcome-aligned:${state.jurisdictionKey}`,
        personId: base.personId,
        propositionId: base.propositionId,
        factors: politicalOutcomeFactors(
          alignedWorld,
          base.personId,
          base.propositionId,
          base.exposureId,
        ),
        beliefDimensionsByOutcome: {
          support: {
            conviction: "moderate",
            salience: "moderate",
            flexibility: "open",
          },
          opposition: {
            conviction: "moderate",
            salience: "moderate",
            flexibility: "open",
          },
        },
        randomness: "none",
      });
      const opposed = evaluatePoliticalBeliefFormation(opposedWorld, {
        stableKey: `place-outcome-opposed:${state.jurisdictionKey}`,
        personId: base.personId,
        propositionId: base.propositionId,
        factors: politicalOutcomeFactors(
          opposedWorld,
          base.personId,
          base.propositionId,
          base.exposureId,
        ),
        beliefDimensionsByOutcome: {
          support: {
            conviction: "moderate",
            salience: "moderate",
            flexibility: "open",
          },
          opposition: {
            conviction: "moderate",
            salience: "moderate",
            flexibility: "open",
          },
        },
        randomness: "none",
      });
      expect(aligned.outcome, state.jurisdictionKey).toBe("support");
      expect(opposed.outcome, state.jurisdictionKey).toBe("opposition");
      const consideration = aligned.evaluation.context.considerations.find(
        (row) => row.sourceType === "information:place-outcome",
      );
      expect(consideration, state.jurisdictionKey).toBeDefined();
      expect(consideration?.weightScale).toBeCloseTo(Math.tanh(2));
      expect(consideration?.sourceRefs).toContainEqual({
        kind: "place-outcome",
        outcomeRecordId: `place-outcome:${stateJurisdictionForKey(state.jurisdictionKey)!.id}:${outcomeLink.to}:${base.world.currentDate}`,
      });
    }
    const state = lifePlaceStateIdentities()[0]!;
    const world = worldAtState(base, state.jurisdictionKey, Math.exp(-2));
    const scheduled = schedulePoliticalReflectionForExposure(
      world,
      base.exposureId,
    );
    const due = scheduled.history.futureDueItems.find((item) =>
      item.stableKey.endsWith(base.exposureId),
    );
    if (!due)
      throw new Error(`No reflection scheduled for ${state.jurisdictionKey}`);
    const reflected = politicalReflectionTransitionHandler(
      scheduled,
      due,
    ).world;
    expect(
      reflected.history.privateBeliefs.find(
        (row) =>
          row.personId === base.personId &&
          row.propositionId === base.propositionId,
      )?.position,
    ).toBe("support");
  });
});
