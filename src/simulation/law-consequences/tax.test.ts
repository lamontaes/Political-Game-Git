import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { withOpenedBudgets } from "../public-budgets";
import { readMonthFlows, settleGovernmentMonth } from "../public-budgets/month";
import {
  PUBLIC_BUDGETS_VERSION,
  BUDGET_SOURCES,
} from "../public-budgets/store";
import { typedTaxQuestionRow } from "./typed-tax-question-data";
import { describe, expect, it } from "vitest";
import { TEST_TAX_TERMS } from "../../../tests/fixtures/tax-policy-fixture";
import { createLegislativeScenario } from "../legislation-scenarios";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordExecutiveAction,
} from "../legislation";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { publishLegislativeTransition } from "../../presentation/publish-legislative-transition";
import {
  advanceWorld,
  createWorld,
  assertWorldIntegrity,
  recordWorldEvent,
} from "../world";
import { daysBetween, makeIsoDate } from "../dates";
import { createResourcePosition, money } from "../resources";
import { resourcePositionAt } from "../resource-queries";
import { personName } from "../people";
import { serializeWorld, deserializeWorld } from "../serialization";
import { applyLawConsequences } from "../enacted-law-effects";
import { lawInForce } from "../governing/law-in-force";
import { createProductionPolicyCatalog } from "../production-catalog";
import {
  attachTaxProposal,
  adoptEnactedTaxPolicy,
  taxPowerEvidenceFor,
  recordTaxBase,
  assessTaxBase,
  createTaxTransitionHandlerRegistry,
  taxCollectionTransition,
} from "../tax-policy";
import type {
  LawConsequenceRow,
  LawConsequenceContext,
} from "../law-consequence-types";
import type { World } from "../types";
import {
  TAX_REGISTRATION,
  TAX_SELECTOR,
  TAX_ACTION,
  TAX_PREDICATE,
  TAX_AMOUNT,
  resolveTaxConsequences,
  applyTaxConsequence,
} from "./tax";

// The real question identifies this authored multi-provision bill. Its levy uses
// the existing explicitly fictional test terms, not an inferred cannabis rate.
const QUESTION =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";
const ROW: LawConsequenceRow = {
  id: "test:tax:typed-enacted-levy",
  kind: "tax",
  when: "assessment",
  who: {
    selector: TAX_SELECTOR,
    predicates: [{ capability: TAX_PREDICATE, parameters: {} }],
  },
  what: TAX_ACTION,
  amount: { op: "record", key: TAX_AMOUNT, unit: "minor" },
  conditions: [],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["existing:tax-policy-fixture", "sourced:alaska-tax-power"],
    population:
      "One actual saved scenario payer with an authored test occurrence.",
    scope:
      "Controlled typed-proposal integration, not real tax calibration or catalog admission.",
    why: "An operative enacted typed levy applies its own rate and allowance to the saved occurrence; the common due writer can collect only actual available cash.",
    uncertainty:
      "No catalog numeric-term mapper, starting-law mapper or naturally earned tax base is supplied.",
  },
};

type CachedTaxFixture = {
  world: World;
  personId: World["personOrder"][number];
  measureId: World["personOrder"][number];
  propositionId: World["personOrder"][number];
};
const fixtureCache = new Map<string, CachedTaxFixture>();
function fixture(
  opening = 10000,
  amount = 2100,
  effective = true,
  questionKey = QUESTION,
) {
  let cache = fixtureCache.get(questionKey);
  if (!cache) {
    const scenario = createLegislativeScenario("alaska");
    let world = createWorld({
      seed: scenario.world.seed,
      currentDate: makeIsoDate("2027-01-20"),
      jurisdictions: scenario.world.jurisdictionOrder.map(
        (id) => scenario.world.jurisdictions[id]!,
      ),
      people: scenario.world.personOrder.map(
        (id) => scenario.world.people[id]!,
      ),
      policyCatalog: createProductionPolicyCatalog(),
    });
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (entry) => entry.stableKey === questionKey,
    )!;
    expect(proposition).toBeDefined();
    world = introduceMeasure(world, {
      stableKey: "tax-kind:law",
      jurisdictionId: scenario.world.jurisdictionOrder[0]!,
      rulePackId: scenario.pack.packId,
      designation: "HB Tax Kind Test (authored)",
      shortTitle: "Authored multi-provision tax test",
      summary:
        "A controlled law bundle and an explicit fictional excise levy; no actual cannabis tax rate is claimed.",
      origin: "member-introduction",
      subjectClass: "revenue",
      sponsorPersonId: scenario.playerPersonId,
      propositionIds: [proposition.id],
      propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    world = attachTaxProposal(world, {
      stableKey: "tax-kind:proposal",
      measureId,
      sponsorPersonId: scenario.playerPersonId,
      power: taxPowerEvidenceFor("US-AK")!,
      terms: questionKey.startsWith("us-tax-terms:")
        ? { ...TEST_TAX_TERMS, effectiveDelayDays: 90 }
        : TEST_TAX_TERMS,
    });
    const procedure = {
      ...scenario,
      measureId,
      governorAction: "signed" as const,
      governorRationale: "Explicit authored test approval of the typed levy.",
    };
    for (
      let i = 0;
      i < 40 && measurePosition(world, measureId).phase !== "enacted";
      i++
    ) {
      if (measurePosition(world, measureId).phase === "awaiting-executive") {
        world = recordExecutiveAction(world, {
          stableKey: "tax-kind:authored-signature",
          measureId,
          action: "signed",
          rationale:
            "Explicit authored signature for this controlled typed-levy contract; not an NPC decision.",
        });
        continue;
      }
      const step = availableMeasureSteps(world, measureId).find(
        (key) => key !== "offer-amendment",
      );
      if (!step)
        throw new Error("No canonical enactment step for the authored levy.");
      world = publishLegislativeTransition(
        world,
        applyLegislativeStep(procedure, world, step).world,
      );
    }
    expect(measurePosition(world, measureId).phase).toBe("enacted");
    expect(world.history.taxPolicies).toHaveLength(1);
    cache = {
      world,
      personId: scenario.playerPersonId,
      measureId,
      propositionId: proposition.id,
    };
    fixtureCache.set(questionKey, cache);
  }
  let world = cache.world;
  const policy = world.history.taxPolicies![0]!;
  if (effective)
    world = advanceWorld(
      world,
      daysBetween(world.currentDate, policy.effectiveAt),
      createTaxTransitionHandlerRegistry(),
    );
  world = {
    ...world,
    policyCatalog: {
      ...world.policyCatalog,
      propositions: {
        ...world.policyCatalog.propositions,
        [cache.propositionId]: {
          ...world.policyCatalog.propositions[cache.propositionId]!,
          consequences: [ROW],
        },
      },
    },
  };
  world = createResourcePosition(world, {
    stableKey: "tax-kind:payer-cash",
    owner: { kind: "person", personId: cache.personId },
    openedAt: world.currentDate,
    openingBalance: money(opening, "USD"),
    provenance: {
      kind: "authored",
      note: "Explicit controlled opening cash; no wages or purchases are generated.",
    },
  });
  const proposal = world.history.taxProposals![0]!;
  world = recordWorldEvent(world, {
    stableKey: "tax-kind:occurrence",
    type: "tax.test-occurrence",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: proposal.jurisdictionId,
    involvedEntityIds: [cache.personId],
    visibility: "private",
    tags: [],
    participants: [],
    personFactConstraints: [],
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
    summary:
      "One explicitly authored taxable occurrence for canonical assessment integration.",
  });
  world = recordTaxBase(world, {
    stableKey: "tax-kind:base",
    jurisdictionId: proposal.jurisdictionId,
    payer: { kind: "person", personId: cache.personId },
    baseKey: TEST_TAX_TERMS.baseKey,
    occurredAt: world.currentDate,
    amount: money(amount, "USD"),
    sourceEventId: world.history.events.at(-1)!.id,
    assumptionNote:
      "Existing fictional excise test terms and an authored recorded base; no real earnings or legal sales are inferred.",
  });
  const context: LawConsequenceContext = {
    onDate: world.currentDate,
    activity: "assessment",
    activityId: world.history.taxBases!.at(-1)!.id,
    subjectIds: [cache.personId],
    questionKey,
    governingLawId: cache.measureId,
  };
  assertWorldIntegrity(world);
  return { ...cache, world, context };
}
function dispatch(world: World, context: LawConsequenceContext) {
  return applyLawConsequences(world, context, [TAX_REGISTRATION]);
}
function balances(world: World, personId: World["personOrder"][number]) {
  return [
    resourcePositionAt(
      world,
      { kind: "person", personId },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits,
    resourcePositionAt(
      world,
      {
        kind: "organization",
        organizationId: world.history.taxProposals![0]!.publicOrganizationId,
      },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits,
  ];
}

describe("tax kind uses saved typed levies, assessments and due collection", () => {
  it("the loaded legalization row uses the same adopted-term tax kind", () => {
    const f = fixture();
    const seed = "overflow3:a16:typed-tax-new-game";
    const place = drawRandomPlace(seed);
    const { world: opened } = smallWorld({ place: place.key, seed, people: 3 });
    assertWorldIntegrity(opened);
    const reopened = deserializeWorld(serializeWorld(opened));
    expect(reopened.seed).toBe(seed);
    console.info(
      `A16 new game: ${place.key}; ${place.stateJurisdictionKey}; seed ${seed}`,
    );
    const question = Object.values(reopened.policyCatalog.propositions).find(
      (row) => row.stableKey === QUESTION,
    )!;
    expect(question.consequences).toContainEqual(typedTaxQuestionRow(QUESTION));
    const world = {
      ...f.world,
      policyCatalog: {
        ...f.world.policyCatalog,
        propositions: {
          ...f.world.policyCatalog.propositions,
          [f.propositionId]: {
            ...f.world.policyCatalog.propositions[f.propositionId]!,
            consequences: question.consequences,
          },
        },
      },
    };
    const assessed = dispatch(world, f.context);
    expect(assessed.history.taxAssessments).toHaveLength(1);
    expect(assessed.history.taxAssessments![0]!.taxAmount.minorUnits).toBe(100);
    expect(
      assessed.history.taxAssessments![0]!.lawEffectStamps![0]!.questionKey,
    ).toBe(QUESTION);
    expect(
      dispatch(deserializeWorld(serializeWorld(assessed)), f.context).history
        .taxAssessments,
    ).toHaveLength(1);
    // The loaded cannabis row applies ONLY the saved fictional levy and base.
    // Legalization alone supplies neither a purchase nor a legal tax rate.
    const paid = advanceWorld(
      assessed,
      TEST_TAX_TERMS.collectionLagDays,
      createTaxTransitionHandlerRegistry(),
    );
    const collection = paid.history.taxCollections!.at(-1)!;
    expect(collection.transferredAmount.minorUnits).toBe(100);
    expect(balances(paid, f.personId)).toEqual([9900, 100]);
    const empty = {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      governments: [],
      adjustments: [],
      unknown: [],
    };
    const month = makeIsoDate(`${paid.currentDate.slice(0, 7)}-01`);
    const government = withOpenedBudgets(paid, empty, month).governments.find(
      (row) =>
        row.lawJurisdictionId === paid.history.taxProposals![0]!.jurisdictionId,
    )!;
    expect(government).toBeDefined();
    const store = { ...empty, governments: [government] };
    const read = readMonthFlows(paid, store);
    const recorded = read.flows.recorded!.get(government.key)!;
    expect(
      recorded.revenueMinorUnits[BUDGET_SOURCES.indexOf("selectiveSalesTaxes")],
    ).toBe(100);
    expect(recorded.sourceRecordIds).toContain(collection.resourceOutcomeId);
    const stamp = recorded.lawEffectStamps.find(
      (s) => s.questionKey === QUESTION,
    );
    expect(stamp?.effectKind).toBe("tax-collection");
    expect(stamp?.governingLawKey).toBe(f.measureId);
    expect(stamp?.appliedAt).toBe(paid.currentDate);
    expect(stamp?.sourceRecordIds).toContain(collection.assessmentId);
    expect(stamp?.sourceRecordIds).toContain(paid.history.taxBases![0]!.id);

    const settled = settleGovernmentMonth(
      paid,
      government,
      month,
      read.flows,
    ).government;
    expect(
      settled.months.at(-1)!.revenue[
        BUDGET_SOURCES.indexOf("selectiveSalesTaxes")
      ],
    ).toBe(1);
    expect(settled.months.at(-1)!.lawEffectStamps).toContainEqual(stamp);
    const saved = deserializeWorld(
      serializeWorld({
        ...paid,
        publicBudgets: {
          ...store,
          governments: [settled],
          cursor: read.cursor,
        },
      }),
    );
    const repeated = readMonthFlows(saved, saved.publicBudgets!);
    expect(repeated.flows.recorded?.size).toBe(0);
    expect(
      settleGovernmentMonth(
        saved,
        saved.publicBudgets!.governments[0]!,
        month,
        repeated.flows,
      ).government,
    ).toBe(saved.publicBudgets!.governments[0]!);
  });

  it("assesses and collects the actual excise question through its adopted typed levy", () => {
    const f = fixture(10000, 2100, true, "us-tax-terms:state.excise-tax-terms");
    expect(personName(f.world.people[f.personId]!)).toBeTruthy();
    let world = dispatch(f.world, f.context);
    expect(world.history.taxAssessments).toHaveLength(1);
    expect(world.history.taxAssessments![0]!.taxAmount.minorUnits).toBe(100);
    expect(
      world.history.taxAssessments![0]!.lawEffectStamps![0]!.governingLawKey,
    ).toBe(f.measureId);
    expect(balances(world, f.personId)).toEqual([10000, 0]);
    const saved = serializeWorld(world);
    expect(serializeWorld(dispatch(deserializeWorld(saved), f.context))).toBe(
      saved,
    );
    world = advanceWorld(
      deserializeWorld(saved),
      2,
      createTaxTransitionHandlerRegistry(),
    );
    expect(world.history.taxCollections).toHaveLength(1);
    expect(world.history.taxCollections![0]!.status).toBe("collected");
    expect(world.history.taxCollections![0]!.transferredAmount.minorUnits).toBe(
      100,
    );
    expect(balances(world, f.personId)).toEqual([9900, 100]);
    assertWorldIntegrity(world);
  });
  it("refuses a catalog levy missing its adopted numeric terms", () => {
    const f = fixture(10000, 2100, true, "us-tax-terms:state.excise-tax-terms");
    const world = {
      ...f.world,
      history: {
        ...f.world.history,
        legislativeProvisions: f.world.history.legislativeProvisions!.map(
          (row) => ({ ...row, lawTerms: [] }),
        ),
      },
    };
    expect(resolveTaxConsequences(world, ROW, f.context)).toEqual([]);
    expect(serializeWorld(dispatch(world, f.context))).toBe(
      serializeWorld(world),
    );
    expect(balances(world, f.personId)).toEqual([10000, 0]);
  });
  it("assesses the named payer once, then collects actual cash after Save/Continue", () => {
    const f = fixture();
    expect(f.world.people[f.personId]).toBeDefined();
    let world = dispatch(f.world, f.context);
    const assessment = world.history.taxAssessments![0]!;
    expect(assessment.taxAmount.minorUnits).toBe(100);
    expect(assessment.baseId).toBe(f.context.activityId);
    expect(balances(world, f.personId)).toEqual([10000, 0]);
    expect(assessment.lawEffectStamps).toEqual([
      expect.objectContaining({
        governingLawKey: f.measureId,
        questionKey: QUESTION,
        effectKind: "tax-assessment",
        jurisdictionId: world.history.taxBases![0]!.jurisdictionId,
      }),
    ]);
    expect(dispatch(world, f.context)).toBe(world);
    const restored = deserializeWorld(serializeWorld(world));
    expect(dispatch(restored, f.context)).toBe(restored);
    world = advanceWorld(restored, 1, createTaxTransitionHandlerRegistry());
    expect(balances(world, f.personId)).toEqual([10000, 0]);
    world = advanceWorld(world, 1, createTaxTransitionHandlerRegistry());
    expect(balances(world, f.personId)).toEqual([9900, 100]);
    expect(world.history.taxCollections).toHaveLength(1);
    const collection = world.history.taxCollections![0]!;
    const outcome = world.history.resourceTransferOutcomes.find(
      (row) => row.id === collection.resourceOutcomeId,
    )!;
    expect(outcome.status).toBe("completed");
    expect(outcome.transferredAmount.minorUnits).toBe(100);
    expect(collection.lawEffectStamps?.[0]?.sourceRecordIds).toContain(
      assessment.id,
    );
    expect(collection.lawEffectStamps?.[0]?.sourceRecordIds).toContain(
      outcome.id,
    );
    expect(
      world.history.lawExposures?.some(
        (row) =>
          row.personId === f.personId && row.sourceRecordId === collection.id,
      ),
    ).toBe(true);
    const due = world.history.futureDueItems.find(
      (row) => row.entityIds[0] === assessment.id,
    )!;
    expect(taxCollectionTransition(world, due).world).toBe(world);
    assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
    console.info(
      "TEAM6_TAX_PROOF",
      JSON.stringify({
        seed: world.seed,
        personName: personName(world.people[f.personId]!),
        personId: f.personId,
        jurisdictionId: assessment.lawEffectStamps![0]!.jurisdictionId,
        measureId: f.measureId,
        questionKey: QUESTION,
        operativeAt: assessment.lawEffectStamps![0]!.operativeAt,
        baseId: assessment.baseId,
        policyId: assessment.policyId,
        proposalId: world.history.taxProposals![0]!.id,
        assessmentId: assessment.id,
        dueId: due.id,
        dueAt: due.dueAt,
        collectionId: collection.id,
        transferOutcomeId: outcome.id,
        resourceFlowId: outcome.resourceFlowId,
        recipientOrganizationId:
          world.history.taxProposals![0]!.publicOrganizationId,
        assessedMinorUnits: assessment.taxAmount.minorUnits,
        collectedMinorUnits: collection.transferredAmount.minorUnits,
        beforeBalances: [10000, 0],
        afterBalances: balances(world, f.personId),
        assessmentStamp: assessment.lawEffectStamps![0],
        collectionStamp: collection.lawEffectStamps![0],
        scope:
          "Controlled authored scenario, typed test levy and recorded test base; not natural earnings, catalog admission or complete M7.",
      }),
    );
  });
  it.each([
    { opening: 50, amount: 2100, status: "blocked", balance: 50 },
    { opening: 10000, amount: 0, status: "zero", balance: 10000 },
  ])(
    "keeps $status distinct from positive collection",
    ({ opening, amount, status, balance }) => {
      const f = fixture(opening, amount);
      const world = advanceWorld(
        dispatch(f.world, f.context),
        2,
        createTaxTransitionHandlerRegistry(),
      );
      expect(world.history.taxAssessments).toHaveLength(1);
      expect(world.history.taxCollections![0]!.status).toBe(status);
      expect(
        world.history.taxCollections![0]!.transferredAmount.minorUnits,
      ).toBe(0);
      expect(balances(world, f.personId)).toEqual([balance, 0]);
    },
  );
  it("refuses absent authority, wrong questions, unrecorded activities and unrelated subjects", () => {
    const f = fixture();
    for (const change of [
      { questionKey: "absent:question" },
      { subjectIds: [] },
      { activityId: f.personId },
      { governingLawId: f.personId },
      { activity: "payment" as const },
    ])
      expect(
        resolveTaxConsequences(f.world, ROW, { ...f.context, ...change }),
      ).toEqual([]);
    const withoutPolicy = {
      ...f.world,
      history: { ...f.world.history, taxPolicies: [] },
    };
    expect(resolveTaxConsequences(withoutPolicy, ROW, f.context)).toEqual([]);
    expect(
      dispatch(f.world, { ...f.context, questionKey: "absent:question" }),
    ).toBe(f.world);
  });
  it("does not assess before the typed policy and governing law are operative", () => {
    const f = fixture(10000, 2100, false);
    expect(
      lawInForce(
        f.world,
        f.world.history.taxBases![0]!.jurisdictionId,
        f.propositionId,
      )?.measureId,
    ).not.toBe(f.measureId);
    expect(dispatch(f.world, f.context)).toBe(f.world);
  });
  it("rejects forged amounts and source IDs, and leaves existing liabilities frozen", () => {
    const f = fixture();
    const resolved = resolveTaxConsequences(f.world, ROW, f.context)[0]!;
    expect(resolved).toBeDefined();
    expect(
      applyTaxConsequence(f.world, {
        ...resolved,
        value: { type: "amount", value: 1, unit: "minor", currency: "USD" },
      }),
    ).toBe(f.world);
    expect(
      applyTaxConsequence(f.world, {
        ...resolved,
        sourceRecordIds: [f.personId],
      }),
    ).toBe(f.world);
    const assessed = assessTaxBase(
      f.world,
      f.context.activityId,
      TEST_TAX_TERMS.seriesKey,
    );
    expect(dispatch(assessed, f.context)).toBe(assessed);
    expect(
      assessed.history.taxAssessments![0]!.lawEffectStamps,
    ).toBeUndefined();
  });
  it("preserves an earlier assessment while an explicitly zero-rate successor governs future bases", () => {
    const f = fixture();
    let world = dispatch(f.world, f.context);
    const original = world.history.taxAssessments![0]!;
    const scenario = createLegislativeScenario("alaska");
    const jurisdictionId = world.history.taxBases![0]!.jurisdictionId;
    world = introduceMeasure(world, {
      stableKey: "tax-kind:prospective-zero",
      jurisdictionId,
      rulePackId: scenario.pack.packId,
      designation: "HB Zero Tax Test (authored)",
      shortTitle: "Controlled prospective zero-rate levy",
      summary:
        "Explicit fictional zero-rate successor, not a rate inferred from a no answer.",
      origin: "member-introduction",
      subjectClass: "revenue",
      sponsorPersonId: f.personId,
      propositionIds: [f.propositionId],
      propositionAnswers: [{ propositionId: f.propositionId, answer: "no" }],
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    world = attachTaxProposal(world, {
      stableKey: "tax-kind:zero-proposal",
      measureId,
      sponsorPersonId: f.personId,
      power: taxPowerEvidenceFor("US-AK")!,
      terms: { ...TEST_TAX_TERMS, rateNumerator: 0 },
    });
    const procedure = { ...scenario, measureId };
    for (
      let i = 0;
      i < 40 && measurePosition(world, measureId).phase !== "enacted";
      i++
    ) {
      if (measurePosition(world, measureId).phase === "awaiting-executive") {
        world = recordExecutiveAction(world, {
          stableKey: "tax-kind:zero-signature",
          measureId,
          action: "signed",
          rationale:
            "Explicit controlled successor signature, not an NPC decision.",
        });
        continue;
      }
      const step = availableMeasureSteps(world, measureId).find(
        (key) => key !== "offer-amendment",
      );
      if (!step) throw new Error("No canonical successor step.");
      // Use canonical adoption independently of production registry admission.
      // Handler dispatch below explicitly injects TAX_REGISTRATION.
      world = applyLegislativeStep(procedure, world, step).world;
    }
    world = adoptEnactedTaxPolicy(
      world,
      world.history.taxProposals!.at(-1)!.id,
    );
    expect(world.history.taxPolicies).toHaveLength(2);
    expect(world.history.taxAssessments![0]).toEqual(original);
    world = advanceWorld(
      world,
      daysBetween(
        world.currentDate,
        world.history.taxPolicies![1]!.effectiveAt,
      ),
      createTaxTransitionHandlerRegistry(),
    );
    expect(world.history.taxCollections![0]!.transferredAmount.minorUnits).toBe(
      100,
    );
    expect(world.history.taxAssessments![0]).toEqual(original);
    world = recordWorldEvent(world, {
      stableKey: "tax-kind:future-occurrence",
      type: "tax.test-occurrence",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [f.personId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary:
        "Explicit controlled future occurrence after the typed zero rate is operative.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    world = recordTaxBase(world, {
      stableKey: "tax-kind:future-base",
      jurisdictionId,
      payer: { kind: "person", personId: f.personId },
      baseKey: TEST_TAX_TERMS.baseKey,
      occurredAt: world.currentDate,
      amount: money(2100, "USD"),
      sourceEventId: world.history.events.at(-1)!.id,
      assumptionNote:
        "Explicit fictional future tax base, not inferred income or legal sales.",
    });
    const context = {
      ...f.context,
      governingLawId: measureId,
      onDate: world.currentDate,
      activityId: world.history.taxBases!.at(-1)!.id,
    };
    world = dispatch(world, context);
    expect(world.history.taxAssessments).toHaveLength(2);
    expect(world.history.taxAssessments![1]!.taxAmount.minorUnits).toBe(0);
    expect(
      world.history.taxAssessments![1]!.lawEffectStamps![0]!.governingLawKey,
    ).toBe(measureId);
    world = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      2,
      createTaxTransitionHandlerRegistry(),
    );
    expect(world.history.taxCollections).toHaveLength(2);
    expect(world.history.taxCollections![1]!.status).toBe("zero");
    expect(balances(world, f.personId)).toEqual([9900, 100]);
    expect(world.history.taxAssessments![0]).toEqual(original);
  });
  it("refuses unsupported expression/rate inference instead of using a catalog yes as a rate", () => {
    const f = fixture();
    expect(() =>
      resolveTaxConsequences(
        f.world,
        { ...ROW, amount: { op: "term", key: "catalog-rate", unit: "ratio" } },
        f.context,
      ),
    ).toThrow(/canonical/);
    expect(() =>
      resolveTaxConsequences(
        f.world,
        { ...ROW, conditions: [{ capability: "invented", parameters: {} }] },
        f.context,
      ),
    ).toThrow(/predicate/);
    expect(() =>
      resolveTaxConsequences(
        f.world,
        { ...ROW, onRepeal: "recompute-prospective" },
        f.context,
      ),
    ).toThrow(/preserves/);
  });
});
