import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "./demo";
import { observerPlace } from "../presentation/observer-world";
import { createOrganization, createWorkRelationship } from "./life";
import { advanceWorld } from "./world";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { organizationProfileAt } from "./life-queries";
import { createPolicyCatalog } from "./policy";
import { loadedPolicyRegistry } from "./policy-pack-registry";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "./congress-rule-pack";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
  recordEnactment,
  recordExecutiveAction,
} from "./legislation";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { addDays, daysBetween } from "./dates";
import { monthKeyOf, monthStart, nextMonthKey } from "./macro-economy/store";
import { ensureMacroEconomyStarted } from "./macro-economy/producer";
import { startValuesFromLatents } from "./macro-economy/kernel";
import { CRUNCH46_PROVISIONAL_POLICY } from "./macro-economy/policy";
import { stepTownFinances } from "./living-world/town-finances";
import { deserializeWorld, serializeWorld } from "./serialization";
import { isLawEffectStamp } from "./law-effect-stamp";
import { personName } from "./people";
import {
  dataPrivacyInitialCostOn,
  NATIONAL_DATA_PRIVACY_QUESTION,
} from "./federal-data-privacy-law";
import type { EntityId, World } from "./types";

const NOTE =
  "A28 authored legal, firm-revenue and macro fixture; not natural passage, observed gross receipts or generated eligibility.";

function enact(world: World, answer: "yes" | "no", key: string) {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === NATIONAL_DATA_PRIVACY_QUESTION,
  )!;
  world = introduceMeasure(world, {
    stableKey: key,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. A28",
    shortTitle: "Authored privacy expense fixture",
    summary: NOTE,
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  // Authored procedure fixture bodies and unanimous votes, not naturally
  // elected Congress or a claim about lawmakers' actual decisions.
  const bodies = US_CONGRESS_RULE_PACK.chambers.map((chamber) => ({
    chamberKey: chamber.chamberKey,
    chamberName: chamber.name,
    members: Array.from(
      { length: chamber.chamberKey === "house" ? 435 : 100 },
      (_, i) => ({
        memberKey: `a28:authored:${chamber.chamberKey}:${i}`,
        name: `Authored member ${i}`,
        personId: null,
        caucusLabel: "Authored unanimous fixture",
      }),
    ),
  }));
  const votePlan: Record<string, { yea: number }> = {};
  for (const chamber of US_CONGRESS_RULE_PACK.chambers) {
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers!,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: bodies.find((body) => body.chamberKey === chamber.chamberKey)!
          .members.length,
      };
  }
  const procedure = {
    pack: US_CONGRESS_RULE_PACK,
    measureId: measure.id,
    bodies,
    votePlan,
    committeeMemberCount: null,
    governorAction: "signed" as const,
    governorRationale: NOTE,
  };
  for (
    let i = 0;
    i < 45 && measurePosition(world, measure.id).phase !== "awaiting-enactment";
    i++
  ) {
    if (measurePosition(world, measure.id).phase === "awaiting-executive") {
      world = recordExecutiveAction(world, {
        stableKey: key + ":authored-signature",
        measureId: measure.id,
        action: "signed",
        rationale: NOTE,
      });
      continue;
    }
    const step = availableMeasureSteps(world, measure.id).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step)
      throw new Error("No existing federal fixture procedure step remains.");
    world = applyLegislativeStep(procedure, world, step).world;
  }
  world = recordEnactment(world, {
    stableKey: key + ":enactment",
    measureId: measure.id,
    effectiveAt: world.currentDate,
  });
  return { world, measure };
}

function fixture(index: number) {
  const seed = `team6-a28-one-time:${index}`;
  const place = observerPlace(seed);
  let world = createScenarioWorld(seed, place.context, {
    peopleCount: 3,
  });
  const town = place.context.jurisdiction.id;
  const personId = world.personOrder[0]!;
  const original = world.policyCatalog;
  const registry = loadedPolicyRegistry();
  const merge = <T extends { id: EntityId }>(
    old: readonly T[],
    added: readonly T[],
  ) => [...new Map([...old, ...added].map((row) => [row.id, row])).values()];
  world = {
    ...world,
    jurisdictions: {
      ...world.jurisdictions,
      [NATIONAL_ELECTION_JURISDICTION.id]: NATIONAL_ELECTION_JURISDICTION,
    },
    jurisdictionOrder: [
      ...world.jurisdictionOrder,
      NATIONAL_ELECTION_JURISDICTION.id,
    ],
    policyCatalog: createPolicyCatalog({
      catalogVersion: "team6-a28-fixture/v1",
      domains: merge(Object.values(original.domains), registry.domains),
      issues: merge(Object.values(original.issues), registry.issues),
      propositions: merge(
        Object.values(original.propositions),
        registry.propositions,
      ),
      subjects: merge(Object.values(original.subjects), registry.subjects),
      principles: merge(
        Object.values(original.principles),
        registry.principles,
      ),
    }),
  };
  world = createOrganization(world, {
    stableKey: "a28:authored-firm",
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: NOTE },
    initialProfile: {
      name: "Authored A28 firm",
      classification: "sector:private",
      locationJurisdictionId: town,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "a28:authored-employment",
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: NOTE },
    initialRole: {
      title: "Fixture analyst",
      occupationClassification: "profession:policy-analysis",
      locationJurisdictionId: town,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 40 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: town,
      },
    },
  });
  const passed = enact(world, "yes", "a28:authored-law");
  world = passed.world;
  const openedAt = world.currentDate;
  const latents = { cycle: 0, cost: 0, housing: 0, credit: 0 };
  world = ensureMacroEconomyStarted(world, {
    contractVersion: "crunch46-macro-start/v1",
    policyVersion: "crunch46-provisional-v1",
    regime: "near-reference",
    volatilityScale:
      CRUNCH46_PROVISIONAL_POLICY.volatilityScale["near-reference"],
    latents,
    initial: startValuesFromLatents("near-reference", latents),
    effectiveDate: world.currentDate,
  });
  const recordedAt = monthStart(nextMonthKey(monthKeyOf(world.currentDate)));
  // One actual clock month writes the macro record and resolves due items.
  // Starting macro latents and firm books are explicit financial fixture inputs.
  world = advanceWorld(
    world,
    daysBetween(world.currentDate, recordedAt),
    createCampaignElectionTransitionRegistry(),
  );
  if (!world.macroEconomy?.months.some((month) => month.scope === "national"))
    throw new Error("The actual monthly writer must run.");
  world = {
    ...world,
    townFinances: {
      version: "town-finances-v1",
      banks: {},
      markets: {},
      basePriceIndex: 100,
      businesses: {
        [organizationId]: {
          organizationId,
          openedAt,
          cash: 1_000_000,
          debt: 0,
          annualRevenue: 25_000_001,
          kind: "professional",
          capacity: 25_000_001,
          annualOtherCosts: 0,
          margin: 1,
          ownDemandLog: 0,
          openingShare: 1,
          openingMarketSales: 25_000_001,
          bankId: null,
          lineLimit: 0,
          lastQuarterNet: 0,
          lastQuarterPay: 0,
          price: 1,
          lastRound: "authored-opening",
        },
      },
    },
  };
  return {
    world,
    organizationId,
    personId,
    town,
    measure: passed.measure,
    seed,
    placeName: place.displayName,
  };
}

function review(
  world: World,
  organizationId: EntityId,
  town: EntityId,
  round: string,
) {
  return stepTownFinances(
    world,
    town,
    [{ organizationId, kind: "professional", newcomer: false }],
    new Set(),
    round,
  ).world;
}

function revenue(
  world: World,
  organizationId: EntityId,
  annualRevenue: number,
): World {
  return {
    ...world,
    townFinances: {
      ...world.townFinances!,
      businesses: {
        ...world.townFinances!.businesses,
        [organizationId]: {
          ...world.townFinances!.businesses[organizationId]!,
          annualRevenue,
        },
      },
    },
  };
}

describe.each([0, 1, 2, 3, 4])(
  "one initial privacy expense through saved business writer, place draw %i",
  (index) => {
    const base = fixture(index);
    it("uses only above-threshold saved private firms with actual paid employees", () => {
      const { world, organizationId, personId } = base;
      const cost = dataPrivacyInitialCostOn(
        world,
        world.currentDate,
        organizationId,
      )!;
      expect(cost).toMatchObject({
        applicability: "ESTIMATED",
        employeeCount: 1,
        initialDollars: 50_000,
      });
      expect(cost.sourceRecordIds).toContain(personId);
      for (const dollars of [0, 24_999_999, 25_000_000, NaN])
        expect(
          dataPrivacyInitialCostOn(
            revenue(world, organizationId, dollars),
            world.currentDate,
            organizationId,
          ),
        ).toBeNull();
      expect(
        dataPrivacyInitialCostOn(
          { ...world, townFinances: undefined },
          world.currentDate,
          organizationId,
        ),
      ).toBeNull();
      const noWork = {
        ...world,
        history: {
          ...world.history,
          workRelationships: world.history.workRelationships.filter(
            (row) => row.organizationId !== organizationId,
          ),
        },
      };
      expect(
        dataPrivacyInitialCostOn(noWork, world.currentDate, organizationId),
      ).toBeNull();
      expect(
        dataPrivacyInitialCostOn(
          world,
          addDays(cost.law.operativeAt, -1),
          organizationId,
        ),
      ).toBeNull();
      expect(
        dataPrivacyInitialCostOn(
          { ...world, seed: "another-seed" },
          world.currentDate,
          organizationId,
        ),
      ).toEqual(cost);
    });

    it("subtracts the source-band expense from actual books, preserves its stamp, and never charges it twice", () => {
      const { world, organizationId, personId, town, measure } = base;
      const charged = review(world, organizationId, town, "a28:first");
      const control = review(
        revenue(world, organizationId, 25_000_000),
        organizationId,
        town,
        "a28:first",
      );
      const books = charged.townFinances!.businesses[organizationId]!;
      const controlBooks = control.townFinances!.businesses[organizationId]!;
      expect(controlBooks.cash - books.cash).toBe(50_000);
      expect(controlBooks.lastQuarterNet - books.lastQuarterNet).toBe(50_000);
      expect(books.lastQuarterPrivacyCost).toBe(50_000);
      expect(books.privacyComplianceOccurrences).toHaveLength(1);
      expect(books.privacyComplianceOccurrences![0]).toMatchObject({
        governingLawKey: measure.id,
        applicability: "ESTIMATED",
        initialCostDollars: 50_000,
        employeeCount: 1,
        appliedAt: world.currentDate,
      });
      expect(books.lawEffectStamps).toHaveLength(1);
      expect(isLawEffectStamp(books.lawEffectStamps![0])).toBe(true);
      expect(books.lawEffectStamps![0]).toMatchObject({
        governingLawKey: measure.id,
        jurisdictionId: town,
        effectKind: "business-compliance-cost",
      });
      expect(books.lawEffectStamps![0]!.sourceRecordIds).toContain(personId);
      const bytes = serializeWorld(charged);
      const restored = deserializeWorld(bytes);
      expect(serializeWorld(restored)).toBe(bytes);
      expect(
        serializeWorld(review(restored, organizationId, town, "a28:first")),
      ).toBe(bytes);
      const next = review(restored, organizationId, town, "a28:next")
        .townFinances!.businesses[organizationId]!;
      expect(next.lastQuarterPrivacyCost).toBe(0);
      expect(next.privacyComplianceOccurrences).toEqual(
        books.privacyComplianceOccurrences,
      );
      expect(next.lawEffectStamps).toEqual(books.lawEffectStamps);
      console.log(
        "A28_SAVED_INITIAL_EXPENSE",
        base.seed,
        base.placeName,
        personName(world.people[personId]!),
        organizationProfileAt(world, organizationId)!.name,
        organizationId,
        measure.id,
        50_000,
      );
    });

    it("a prospective repeal stops new expense and preserves the completed occurrence", () => {
      const { world, organizationId, town } = base;
      const charged = review(world, organizationId, town, "a28:first");
      const after = advanceWorld(
        charged,
        1,
        createCampaignElectionTransitionRegistry(),
      );
      const repealed = enact(after, "no", "a28:authored-repeal").world;
      expect(
        dataPrivacyInitialCostOn(
          repealed,
          repealed.currentDate,
          organizationId,
        ),
      ).toBeNull();
      const reviewed = review(repealed, organizationId, town, "a28:repealed");
      expect(
        reviewed.townFinances!.businesses[organizationId]!
          .lastQuarterPrivacyCost,
      ).toBe(0);
      expect(
        reviewed.townFinances!.businesses[organizationId]!
          .privacyComplianceOccurrences,
      ).toEqual(
        charged.townFinances!.businesses[organizationId]!
          .privacyComplianceOccurrences,
      );
      const uncharged = {
        ...repealed,
        townFinances: {
          ...repealed.townFinances!,
          businesses: {
            [organizationId]: {
              ...repealed.townFinances!.businesses[organizationId]!,
              privacyComplianceOccurrences: undefined,
            },
          },
        },
      };
      expect(
        review(uncharged, organizationId, town, "a28:after-repeal")
          .townFinances!.businesses[organizationId]!.lastQuarterPrivacyCost,
      ).toBe(0);
    });
  },
);
