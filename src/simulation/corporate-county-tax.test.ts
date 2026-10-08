import { expect, it } from "vitest";
import { createMileageLevyWorld } from "../../tests/fixtures/mileage-levy-world";
import { declarePersonalTaxOccurrence } from "../presentation/tax-work";
import { createOrganization, createWorkRelationship } from "./life";
import { businessTaxOwnersAt } from "./business-tax-payers";
import { lifePlaceStateIdentities } from "./life-places";
import { localTaxAuthority } from "./local-tax-authority";
import { stateTaxPowerEvidenceFor } from "./state-tax-authority";
import { createProductionPolicyCatalog } from "./production-catalog";
import { createResourcePosition, money } from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { createTaxTransitionHandlerRegistry, previewTax } from "./tax-policy";
import { lawExposuresOf } from "./law-exposure";
import { serializeWorld, deserializeWorld } from "./serialization";
import { advanceWorld, assertWorldIntegrity } from "./world";
import type { TaxTerms } from "./tax-types";
import { makeIsoDate } from "./dates";
import { makeSimulationMoment } from "./dates";
import { chamberByKey } from "./legislature-rules";
import { allGovernmentUnits } from "./government-units";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "./municipal-government";
import { localTaxPowerEvidenceFor } from "./local-tax-authority";
import {
  ensureLocalGovernmentOrganization,
  localGovernmentJurisdiction,
} from "./nationwide-world/local-governments";
import { ensureCountyCouncilOpening } from "./municipal-council-opening";
import { municipalSeats } from "./municipal-public-work";
import { LOCAL_ORDINANCE_GAME_PROFILE_VERSION } from "./local-ordinance-game-profile";
import {
  placeMunicipalOrdinanceOnAgenda,
  recordCouncilReadingVote,
} from "./municipal-ordinance-procedure";
import { createLightweightPerson } from "./people";
import { createWorld, createWorldId } from "./world";
import { introduceMeasure } from "./legislation";
import { attachTaxProposal } from "./tax-policy";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";

const TERMS: TaxTerms = {
  seriesKey: "tax:fixture-corporate",
  baseKey: "tax-base:fixture-business-income",
  baseLabel: "Recorded business income (fixture)",
  instrument: "corporate-income",
  allowanceMinorUnits: 0,
  rateNumerator: 5,
  rateDenominator: 100,
  currency: money(0, "USD").currency,
  exemptBaseKeys: [],
  effectiveDelayDays: 90,
  collectionLagDays: 2,
  publicPurpose: "Controlled public receipt",
  assumptionNote:
    "Explicit controlled test income and terms, not an observed rate or net income.",
  legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
};
const PROVENANCE = {
  kind: "authored" as const,
  note: "Controlled named company/owner fixture.",
};

it("routes corporate and county income through one tax kind with nonblank authority in all 56 places", () => {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  const catalog = createProductionPolicyCatalog();
  for (const key of [
    "us-tax-terms:state.corporate-tax-terms",
    "us-tax-terms:county.income-tax-terms",
  ]) {
    const question = Object.values(catalog.propositions).find(
      (row) => row.stableKey === key,
    )!;
    expect(question.consequences?.[0]).toMatchObject({
      kind: "tax",
      what: "assess-enacted-tax-base",
    });
  }
  const countyPermissions = new Set<boolean>();
  for (const place of places) {
    expect(
      stateTaxPowerEvidenceFor(
        place.jurisdictionKey,
        "corporate-income",
        makeIsoDate("2027-01-20"),
      ),
      place.jurisdictionKey,
    ).toMatchObject({
      instrument: "corporate-income",
      jurisdictionKey: place.jurisdictionKey,
    });
    const income = localTaxAuthority({
      stateUsps: place.usps,
      level: "COUNTY",
      instrument: "wage-income",
    });
    expect(income.cell.length).toBeGreaterThan(0);
    countyPermissions.add(income.permits);
    for (const level of ["COUNTY", "MUNICIPALITY"] as const) {
      const scoped = localTaxAuthority({
        stateUsps: place.usps,
        level,
        instrument: "wage-income",
      });
      if (scoped.taxType === "HEAD_TAX" || scoped.taxType === "PAYROLL_TAX")
        expect(scoped.permits).toBe(false);
      if (scoped.taxType === "COUNTY_PIGGYBACK" && level === "MUNICIPALITY")
        expect(scoped.permits).toBe(false);
    }
    expect(previewTax(TERMS, TERMS.baseKey, money(20000, "USD"))).toMatchObject(
      { taxAmount: money(1000, "USD") },
    );
  }
  expect(countyPermissions).toEqual(new Set([true, false]));
});

it("charges a recorded company once, preserves its owner's money, and saves the named owner's company-cost exposure", () => {
  const f = createMileageLevyWorld(
    TERMS,
    "us-tax-terms:state.corporate-tax-terms",
  );
  let world = createOrganization(f.world, {
    stableKey: "fixture:tax-company",
    formedAt: f.world.currentDate,
    provenance: PROVENANCE,
    initialProfile: {
      name: "Recorded company",
      classification: "enterprise:corporation",
      locationJurisdictionId: f.world.history.taxProposals![0]!.jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  const declaration = {
    stableKey: "fixture:company-income",
    personId: f.personId,
    organizationId,
    proposalId: f.proposalId,
    baseKey: TERMS.baseKey,
    amountMinorUnits: 20000,
    assumptionNote: "Explicit fixture company income; no owner distribution.",
  };
  expect(() => declarePersonalTaxOccurrence(world, declaration)).toThrow(
    /payer-not-owned/,
  );
  world = createWorkRelationship(world, {
    stableKey: "fixture:tax-owner",
    personId: f.personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "independent:business-owner",
    compensation: "unpaid",
    authority: "directs-others",
    dependency: "independent",
    economicRisk: "person-borne",
    provenance: PROVENANCE,
    initialRole: {
      title: "Owner",
      occupationClassification: null,
      locationJurisdictionId: world.history.taxProposals![0]!.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 0, maximumHours: 0 },
        attention: "low",
        concurrency: "mostly-concurrent",
        scheduleRigidity: "flexible",
        interruptibility: "interruptible",
        locationJurisdictionId: null,
      },
    },
  });
  expect(
    businessTaxOwnersAt(world, organizationId).map((owner) => owner.personId),
  ).toEqual([f.personId]);
  world = createResourcePosition(world, {
    stableKey: "fixture:company-cash",
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: money(30000, "USD"),
    provenance: PROVENANCE,
  });
  expect(() =>
    declarePersonalTaxOccurrence(world, {
      ...declaration,
      organizationId: undefined,
    }),
  ).toThrow(/corporate-payer-required/);
  world = declarePersonalTaxOccurrence(world, declaration);
  expect(world.history.taxBases).toHaveLength(1);
  expect(world.history.taxBases![0]!.payer).toEqual({
    kind: "organization",
    organizationId,
  });
  expect(world.history.taxAssessments![0]!.taxAmount).toEqual(
    money(1000, "USD"),
  );
  const ownerCash = resourcePositionAt(
    world,
    { kind: "person", personId: f.personId },
    TERMS.currency,
  )!.liquidBalance;
  world = deserializeWorld(serializeWorld(world));
  expect(declarePersonalTaxOccurrence(world, declaration)).toEqual(world);
  world = advanceWorld(world, 2, createTaxTransitionHandlerRegistry());
  expect(world.history.taxCollections).toHaveLength(1);
  expect(
    resourcePositionAt(
      world,
      { kind: "organization", organizationId },
      TERMS.currency,
    )!.liquidBalance,
  ).toEqual(money(29000, "USD"));
  expect(
    resourcePositionAt(
      world,
      { kind: "person", personId: f.personId },
      TERMS.currency,
    )!.liquidBalance,
  ).toEqual(ownerCash);
  expect(
    lawExposuresOf(world, f.personId).some(
      (row) =>
        row.sourceRecordId === world.history.taxCollections![0]!.id &&
        row.direction === "cost" &&
        row.amount?.minorUnits === 1000,
    ),
  ).toBe(true);
  assertWorldIntegrity(world);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
});

it("a county income levy reaches the named payer through the same council and due collector", () => {
  const county = allGovernmentUnits().find((unit) => {
    if (
      !unit.functionalActive ||
      unit.unitType !== "county" ||
      !localTaxAuthority({
        stateUsps: unit.stateUsps,
        level: "COUNTY",
        instrument: "wage-income",
      }).permits
    )
      return false;
    const government = municipalGovernmentByKey(unit.id);
    const pack = government && municipalRulePackFor(government);
    return (
      pack &&
      pack.ok &&
      pack.pack.executive.presentmentRequired.kind === "known" &&
      pack.pack.executive.presentmentRequired.value === false &&
      chamberByKey(pack.pack, pack.pack.chamberOrder[0]!).floorStages.length ===
        1
    );
  })!;
  expect(county).toBeDefined();
  const jurisdiction = localGovernmentJurisdiction(county)!;
  const seed = "p2-county-income-paid";
  const date = makeIsoDate("2027-01-20");
  const person = createLightweightPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    index: 0,
    homeJurisdictionId: jurisdiction.id,
    currentDate: date,
  });
  let world = createWorld({
    seed,
    currentDate: date,
    people: [person],
    jurisdictions: [jurisdiction],
    control: { kind: "person", personId: person.id },
    policyCatalog: createProductionPolicyCatalog(),
  });
  world = ensureCountyCouncilOpening(
    ensureLocalGovernmentOrganization(world, county),
    county.id,
  );
  const sponsor = municipalSeats(world, county.id).find(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  )!;
  expect(sponsor.personId).toBeTruthy();
  const questionKey = "us-tax-terms:county.income-tax-terms";
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === questionKey,
  )!;
  const terms: TaxTerms = {
    ...TERMS,
    instrument: "wage-income",
    seriesKey: "tax:county-fixture-income",
    baseKey: "tax-base:county-fixture-income",
  };
  world = introduceMeasure(world, {
    stableKey: "fixture:county-income-measure",
    jurisdictionId: jurisdiction.id,
    rulePackId: `${county.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
    designation: "Ord. Income Fixture",
    shortTitle: "Controlled county income terms",
    summary: "Explicit controlled levy, not a statutory rate.",
    origin: "member-introduction",
    originChamberKey: "council",
    subjectClass: "revenue",
    sponsorPersonId: sponsor.personId,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = attachTaxProposal(world, {
    stableKey: "fixture:county-income-proposal",
    measureId,
    sponsorPersonId: sponsor.personId!,
    publicGovernmentIdentity: {
      kind: "local-government",
      governmentKey: county.id,
      jurisdictionId: jurisdiction.id,
    },
    power: localTaxPowerEvidenceFor({
      asOf: date,
      stateUsps: county.stateUsps,
      level: "COUNTY",
      governmentKey: county.id,
      instrument: "wage-income",
    }),
    terms,
  });
  const proposalId = world.history.taxProposals!.at(-1)!.id;
  const placed = placeMunicipalOrdinanceOnAgenda(
    { ...world, control: { kind: "person", personId: sponsor.personId! } },
    { governmentKey: county.id, measureId },
  );
  expect(placed.ok ? "ok" : placed.reason).toBe("ok");
  if (!placed.ok) throw new Error(placed.reason);
  const passed = recordCouncilReadingVote(placed.world, {
    governmentKey: county.id,
    measureId,
    dispositions: municipalSeats(placed.world, county.id)
      .filter(
        (seat) => seat.role === "member" || seat.role === "presiding-member",
      )
      .map((seat) => ({
        memberKey: `council:${seat.participationId}`,
        personId: seat.personId,
        disposition: "yea" as const,
      })),
    provenance: {
      method: "authored-fixture",
      note: "Explicit controlled named council roll.",
      sourceEntityIds: [measureId],
    },
  });
  expect(passed.ok ? "ok" : passed.reason).toBe("ok");
  if (!passed.ok) throw new Error(passed.reason);
  const policy = passed.world.history.taxPolicies!.at(-1)!;
  expect(policy).toBeDefined();
  world = {
    ...passed.world,
    control: { kind: "person", personId: person.id },
    currentDate: policy.effectiveAt,
    currentMoment: makeSimulationMoment({
      ...passed.world.currentMoment,
      date: policy.effectiveAt,
    }),
  };
  // This is a controlled effective-date frontier, not ninety simulated days.
  for (const due of world.history.futureDueItems)
    if (
      futureDueItemStateAt(world, due.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.status === "scheduled"
    )
      world = cancelFutureDueItem(world, {
        stableKey: `fixture:county-cancel:${due.id}`,
        dueItemId: due.id,
        effectiveAt: world.currentDate,
        reasonKey: "fixture:tax-period",
        context: "Controlled tax collector fixture.",
      });
  world = createResourcePosition(world, {
    stableKey: "fixture:county-payer-cash",
    owner: { kind: "person", personId: person.id },
    openedAt: world.currentDate,
    openingBalance: money(30000, "USD"),
    provenance: PROVENANCE,
  });
  world = declarePersonalTaxOccurrence(world, {
    personId: person.id,
    stableKey: "fixture:county-declaration",
    proposalId,
    baseKey: terms.baseKey,
    amountMinorUnits: 20000,
    assumptionNote:
      "Explicit declared county-income fixture; no earned paycheck is inferred.",
  });
  expect(world.history.taxAssessments![0]!.taxAmount).toEqual(
    money(1000, "USD"),
  );
  world = advanceWorld(
    deserializeWorld(serializeWorld(world)),
    2,
    createTaxTransitionHandlerRegistry(),
  );
  expect(world.history.taxCollections![0]!.transferredAmount).toEqual(
    money(1000, "USD"),
  );
  expect(
    resourcePositionAt(
      world,
      { kind: "person", personId: person.id },
      TERMS.currency,
    )!.liquidBalance,
  ).toEqual(money(29000, "USD"));
  expect(
    lawExposuresOf(world, person.id).some(
      (row) => row.measureId === measureId && row.amount?.minorUnits === 1000,
    ),
  ).toBe(true);
  assertWorldIntegrity(world);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
});
