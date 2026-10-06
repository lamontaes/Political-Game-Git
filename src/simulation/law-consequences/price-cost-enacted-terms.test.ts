import {
  inclusionaryHome,
  inclusionarySetAsideOpen,
  RENT_LAW_KEYS,
} from "../living-world/town-rent";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { randomInt } from "node:crypto";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import {
  allGovernmentUnits,
  governmentUnitJurisdictionId,
} from "../government-units";
import { lifePlaceByKey } from "../life-places";
import { createHousehold } from "../life";
import {
  createDwelling,
  createHousingTenure,
  createResourceObligation,
} from "../resources";
import {
  RENT_STABILIZATION_ROW,
  RENT_COVERAGE_VALUES,
} from "./rent-stabilization-row";
import { describe, expect, it } from "vitest";
import { createWorld } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import {
  createLegislativeScenario,
  bodyForChamber,
  dispositionsFromCounts,
} from "../legislation-scenarios";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
  recordExecutiveAction,
  offerFloorAmendment,
  measureAmendments,
} from "../legislation";
import {
  recordFiledProvision,
  adoptProvisionRevision,
} from "../legislative-politics";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { stateJurisdictionForKey } from "../life-places";
import { lawInForce } from "../governing/law-in-force";
import {
  createResourceFlow,
  recordResourceFlowTerms,
  money,
} from "../resources";
import { resourceFlowTermsAt } from "../resource-queries";
import { serializeWorld, deserializeWorld } from "../serialization";
import { personName } from "../people";
import {
  applyPriceCostConsequence,
  resolvePriceCostConsequences,
} from "./price-cost";
import type { LawConsequenceRow } from "../law-consequence-types";
import type { EntityId, World } from "../types";

const QUESTION = "us-policy-positions:housing-land-use.rent-stabilization";
const TERM = "cap";
const row: LawConsequenceRow = {
  id: "fixture-final-price-term",
  kind: "price-cost",
  when: "renewal",
  who: { selector: "person-price-flows", predicates: [] },
  what: "set-resource-flow-price",
  amount: {
    op: "minimum",
    operands: [
      { op: "record", key: "current-flow-minor", unit: "minor" },
      {
        op: "sum",
        operands: [
          { op: "record", key: "prior-flow-minor", unit: "minor" },
          {
            op: "product",
            left: { op: "record", key: "prior-flow-minor", unit: "minor" },
            right: { op: "term", key: TERM, unit: "ratio" },
          },
        ],
      },
    ],
  },
  conditions: [
    {
      capability: "price-flow-basis",
      parameters: { basisKind: "custom:final-term-fixture" },
    },
  ],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: ["fixture:authored-contract-term"],
    population: "Actual saved controlled-fixture payer",
    scope: "Fictional enacted term and saved contract, not a real 2026 cap",
    why: "The adopted ratio limits the increase on the actual prior contract price.",
    uncertainty:
      "Fixture rates and votes are authored, not researched estimates or production row admission.",
  },
};

function setup(
  revision: "replace" | "omit" | "wrong-unit",
  production = false,
  terms?: { questionKey: string; termKey: string },
) {
  const questionKey = terms?.questionKey ?? QUESTION;
  const termKey = terms?.termKey ?? TERM;
  const scenario = createLegislativeScenario("kentucky");
  const state = stateJurisdictionForKey("US-KY")!;
  const baseCatalog = createProductionPolicyCatalog();
  const proposition = Object.values(baseCatalog.propositions).find(
    (p) => p.stableKey === questionKey,
  )!;
  const catalog = {
    ...baseCatalog,
    propositions: {
      ...baseCatalog.propositions,
      [proposition.id]: {
        ...proposition,
        parameters: production
          ? proposition.parameters.map((parameter) =>
              parameter.key === "coverage"
                ? { ...parameter, allowedValues: RENT_COVERAGE_VALUES }
                : parameter,
            )
          : proposition.parameters,
        ...(terms
          ? {}
          : { consequences: [production ? RENT_STABILIZATION_ROW : row] }),
      },
    },
  };
  const jurisdictions = new Map(
    scenario.world.jurisdictionOrder.map((id) => [
      id,
      scenario.world.jurisdictions[id]!,
    ]),
  );
  jurisdictions.set(state.id, state);
  let world = createWorld({
    seed: scenario.world.seed,
    currentDate: scenario.world.currentDate,
    currentMoment: scenario.world.currentMoment,
    people: scenario.world.personOrder.map((id) => scenario.world.people[id]!),
    jurisdictions: [...jurisdictions.values()],
    policyCatalog: catalog,
  });
  world = introduceMeasure(world, {
    stableKey: "price-term-fixture:bill",
    jurisdictionId: state.id,
    rulePackId: scenario.pack.packId,
    designation: "HB 1",
    shortTitle: "Controlled contract increase rule",
    summary: "Fictional numeric term used to test the shared price consumer.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: scenario.playerPersonId,
    originChamberKey: "house",
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = recordFiledProvision(world, {
    stableKey: "price-term-fixture:filed",
    measureId,
    provisionKey: "contract-increase",
    sectionNumber: 1,
    heading: "Controlled price term",
    text: "The fictional contract increase cap is ten percent.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "Controlled fixture contracts",
    },
    applicationScope: { jurisdictionId: state.id, segmentKey: null },
    lawTerms: [{ questionKey, key: termKey, value: 0.1, unit: "ratio" }],
  });
  const original = world.history.legislativeProvisions!.at(-1)!;
  const context = {
    ...scenario,
    measureId,
    governorAction: "signed" as const,
    governorRationale: "Explicit favorable fixture decision.",
  };
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ] as const)
    world = applyLegislativeStep(context, world, step).world;
  const body = bodyForChamber(context, "house");
  world = offerFloorAmendment(world, {
    stableKey: "price-term-fixture:amendment",
    measureId,
    description: "Replace the fictional numeric clause.",
    offeredByPersonId: scenario.playerPersonId,
    offeredByLabel: "Controlled fixture member",
    dispositions: dispositionsFromCounts(body.members, {
      yea: body.members.length,
      nay: 0,
    }),
    electedMembers: body.members.length,
    presentMembers: body.members.length,
    provenance: {
      method: "authored-fixture",
      sourceEntityIds: [],
      note: "Controlled adopted vote, not a political outcome model.",
    },
  });
  world = adoptProvisionRevision(world, {
    stableKey: "price-term-fixture:adopted",
    measureId,
    amendmentId: measureAmendments(world, measureId).at(-1)!.id,
    supersedesProvisionId: original.id,
    provisionKey: original.provisionKey,
    sectionNumber: original.sectionNumber,
    heading: original.heading,
    text:
      revision === "omit"
        ? "The fictional numeric cap is removed."
        : "The fictional cap is replaced by the adopted typed term.",
    beneficiary: original.beneficiary,
    applicationScope: original.applicationScope,
    ...(revision === "omit"
      ? {}
      : {
          ...(production
            ? {
                lawCategories: [
                  {
                    questionKey,
                    key: "coverage",
                    values: ["market:residential:house"],
                  },
                ],
              }
            : {}),
          lawTerms: [
            {
              questionKey,
              key: termKey,
              value: 0.05,
              unit:
                revision === "wrong-unit"
                  ? ("years" as const)
                  : ("ratio" as const),
            },
          ],
        }),
  });
  const adopted = world.history.legislativeProvisions!.at(-1)!;
  world = enact(world, measureId, context);
  const personId = scenario.playerPersonId;
  world = createResourceFlow(world, {
    stableKey: "price-term-fixture:contract",
    source: { kind: "person", personId },
    recipient: {
      kind: "person",
      personId: world.personOrder.find((id) => id !== personId)!,
    },
    startsAt: world.currentDate,
    amount: money(production ? 200_001 : 200_000, "USD"),
    cadenceKind: "schedule:monthly",
    basisKind: production ? "housing:rent" : "custom:final-term-fixture",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: state.id,
    provenance: {
      kind: "authored",
      note: "Controlled saved contract, not a researched rental price.",
    },
  });
  const flow = world.history.resourceFlows.at(-1)!;
  if (production) {
    const provenance = flow.provenance;
    world = createHousehold(world, {
      stableKey: "price-term-fixture:tenant",
      formedAt: world.currentDate,
      label: "Controlled recorded tenant",
      provenance,
    });
    const householdId = world.history.households.at(-1)!.id;
    world = createDwelling(world, {
      stableKey: "price-term-fixture:home",
      establishedAt: world.currentDate,
      jurisdictionId: state.id,
      locationLabel: "Controlled recorded rental home",
      classification: "residential:house",
      provenance,
    });
    const dwellingId = world.history.dwellings.at(-1)!.id;
    world = createHousingTenure(world, {
      stableKey: "price-term-fixture:tenure",
      holder: { kind: "household", householdId },
      dwellingId,
      startedAt: world.currentDate,
      kind: "lease:rented",
      context: null,
      provenance,
    });
    world = createResourceObligation(world, {
      stableKey: "price-term-fixture:obligation",
      resourceFlowId: flow.id,
      establishedAt: world.currentDate,
      basisKind: "housing:lease-1-bedroom-market",
      principal: null,
      careResponsibilityId: null,
      housingTenureId: world.history.housingTenures.at(-1)!.id,
      provenance,
    });
  }

  world = recordResourceFlowTerms(world, {
    stableKey: "price-term-fixture:renewal",
    resourceFlowId: flow.id,
    effectiveAt: world.currentDate,
    status: "active",
    amount: money(250_000, "USD"),
    cadenceKind: "schedule:monthly",
    reason: "Controlled renewal before applying the adopted legal clause.",
    provenance: flow.provenance,
    supersedesTermsId: resourceFlowTermsAt(world, flow.id)!.id,
  });
  return {
    world,
    flow,
    personId,
    original,
    adopted,
    proposition,
    state,
    context: {
      onDate: world.currentDate,
      activity: "renewal" as const,
      activityId: world.history.resourceFlowTerms.at(-1)!.id,
      subjectIds: [personId],
    },
  };
}

function enact(
  start: World,
  measureId: EntityId,
  context: ReturnType<typeof createLegislativeScenario>,
): World {
  let world = start;
  for (let guard = 0; guard < 40; guard++) {
    if (measurePosition(world, measureId).phase === "awaiting-enactment")
      return recordEnactment(world, {
        stableKey: `${measureId}:law`,
        measureId,
        effectiveAt: world.currentDate,
      });
    if (measurePosition(world, measureId).phase === "awaiting-executive") {
      world = recordExecutiveAction(world, {
        stableKey: `${measureId}:fixture-signature`,
        measureId,
        action: "signed",
        rationale: context.governorRationale,
      });
      continue;
    }
    const step = availableMeasureSteps(world, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error("No canonical next step for controlled price-term bill");
    const result = applyLegislativeStep(context, world, step);
    if (result.world === world)
      throw new Error(`Fixture blocked at ${step}: ${result.message}`);
    world = result.world;
  }
  throw new Error("Controlled price-term bill did not reach enactment");
}

describe("price-cost reads final enacted terms through G2", () => {
  it("uses the amended ratio times the actual prior price and stamps its adopted source", () => {
    const fixture = setup("replace");
    const { world, context, flow, adopted, original, state, proposition } =
      fixture;
    const law = lawInForce(world, state.id, proposition.id)!;
    const resolved = resolvePriceCostConsequences(world, row, context)[0]!;
    expect(resolved.value).toMatchObject({
      value: 210_000,
      unit: "minor",
      currency: "USD",
    });
    expect(resolved.sourceRecordIds).toContain(adopted.id);
    expect(resolved.sourceRecordIds).not.toContain(original.id);
    const changed = applyPriceCostConsequence(world, resolved);
    const terms = resourceFlowTermsAt(changed, flow.id)!;
    expect(terms.amount.minorUnits).toBe(210_000);
    expect(terms.reason).toContain(
      "Controlled renewal before applying the adopted legal clause.",
    );
    expect(terms.reason).toContain(`The price changed under ${law.measureId}.`);
    expect(terms.lawEffectStamps![0]!.governingLawKey).toBe(law.measureId);
    expect(terms.lawEffectStamps![0]!.sourceRecordIds).toContain(adopted.id);
    expect(changed.history.resourceTransferOutcomes).toBe(
      world.history.resourceTransferOutcomes,
    );
    expect(applyPriceCostConsequence(changed, resolved)).toBe(changed);
    const reopened = deserializeWorld(serializeWorld(changed));
    expect(applyPriceCostConsequence(reopened, resolved)).toBe(reopened);
    console.log(
      `M10 final-term controlled Kentucky contract: ${personName(changed.people[fixture.personId]!)}, ${world.seed}; adopted ${adopted.id}, prior200000 × (1+0.05)=210000 USD cents, no payment. Not a real rent cap or nationwide enactment proof.`,
    );
  });
  it.each(["omit", "wrong-unit"] as const)(
    "keeps %s unsupported instead of restoring the filed number",
    (revision) => {
      const { world, context } = setup(revision);
      const before = serializeWorld(world);
      expect(() => resolvePriceCostConsequences(world, row, context)).toThrow(
        `Missing law amount capability: term:${TERM}`,
      );
      expect(serializeWorld(world)).toBe(before);
    },
  );
});

describe("production rent stabilization row", () => {
  it("caps an explicitly covered recorded lease with the adopted ratio and preserves payments", () => {
    const fixture = setup("replace", true);
    const resolved = resolvePriceCostConsequences(
      fixture.world,
      RENT_STABILIZATION_ROW,
      fixture.context,
    )[0]!;
    expect(resolved.value).toMatchObject({ value: 210_001, unit: "minor" });
    expect(resolved.sourceRecordIds).toContain(fixture.adopted.id);
    const changed = applyPriceCostConsequence(fixture.world, resolved);
    expect(
      resourceFlowTermsAt(changed, fixture.flow.id)!.amount.minorUnits,
    ).toBe(210_001);
    expect(changed.history.resourceTransferOutcomes).toBe(
      fixture.world.history.resourceTransferOutcomes,
    );
    const loaded = deserializeWorld(serializeWorld(changed));
    expect(applyPriceCostConsequence(loaded, resolved)).toBe(loaded);
  });
  it.each(["omit", "wrong-unit"] as const)(
    "leaves a %s cap pending without inventing a ceiling",
    (revision) => {
      const fixture = setup(revision, true);
      expect(
        resolvePriceCostConsequences(
          fixture.world,
          RENT_STABILIZATION_ROW,
          fixture.context,
        ),
      ).toEqual([]);
    },
  );
  it.each(["replace", "omit", "wrong-unit"] as const)(
    "uses the actual inclusionary home allocation path for a %s share",
    (revision) => {
      const fixture = setup(revision, false, {
        questionKey: RENT_LAW_KEYS.inclusionary,
        termKey: "share",
      });
      let world = passOrdinaryDays(fixture.world, 1);
      world = createDwelling(world, {
        stableKey: "recorded-share:actual-new-apartment",
        establishedAt: world.currentDate,
        jurisdictionId: fixture.state.id,
        locationLabel: "Controlled apartment for the enacted share",
        classification: "residential:apartment",
        provenance: {
          kind: "authored",
          note: "Recorded new construction for final-term allocation test.",
        },
      });
      const dwelling = world.history.dwellings.at(-1)!;
      const allocation = inclusionaryHome(
        world,
        dwelling,
        "small-apartment",
        fixture.state.id,
        0,
      );
      if (revision !== "replace") {
        expect(allocation).toBeNull();
        return;
      }
      expect(allocation?.sourceRecordIds).toContain(fixture.adopted.id);
      expect(allocation?.sourceRecordIds).not.toContain(fixture.original.id);
      expect(inclusionarySetAsideOpen(5, 100, 0.05)).toBe(false);
      expect(inclusionarySetAsideOpen(4, 100, 0.05)).toBe(true);
      expect(
        inclusionaryHome(
          world,
          dwelling,
          "small-apartment",
          fixture.state.id,
          1,
        ),
      ).toBeNull();
      const loaded = deserializeWorld(serializeWorld(world));
      expect(
        inclusionaryHome(
          loaded,
          dwelling,
          "small-apartment",
          fixture.state.id,
          0,
        )?.sourceRecordIds,
      ).toContain(fixture.adopted.id);
    },
  );
  it("opens a new game in an actual random canonical municipality", () => {
    const places = allGovernmentUnits().flatMap((unit) => {
      if (
        unit.unitType !== "municipality" ||
        !unit.functionalActive ||
        !unit.placeGeoid
      )
        return [];
      const place = lifePlaceByKey(unit.placeGeoid);
      return place?.context.jurisdiction.id ===
        governmentUnitJurisdictionId(unit)
        ? [place]
        : [];
    });
    const place = places[randomInt(places.length)]!;
    process.stdout.write(
      `A57 random opening: ${place.key} ${place.context.jurisdiction.name}; state=${place.stateJurisdictionKey}; pool=${places.length}; seed=a57-recorded-rent-cap\n`,
    );
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed: "a57-recorded-rent-cap",
      questionnaire: "skipped",
    });
    expect(game.world.people[game.playerPersonId]).toBeDefined();
    expect(
      Object.values(game.world.policyCatalog.propositions).find(
        (proposition) => proposition.stableKey === QUESTION,
      )!.consequences,
    ).toContainEqual(RENT_STABILIZATION_ROW);
  });
});
