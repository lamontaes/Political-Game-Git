import { applyLegislativeStep } from "../presentation/legislation-session";
import {
  fileRuleChangeProvision,
  laborLawOfficeKey,
} from "./enacted-rule-changes";
import {
  availableMeasureSteps,
  scheduleCommitteeHearing,
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
  introduceMeasure,
  measurePosition,
  recordEnactment,
  recordExecutiveAction,
} from "./legislation";
import {
  authoredScenarioSeatCount,
  legislativeBlueprint,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type AuthoredVoteCounts,
} from "./legislation-scenarios";
import { recordFiledProvision } from "./legislative-politics";
import { congressSeats } from "./living-world/congress-seats";
import { OFFICIAL_VIEW_TRANSITION_KEY } from "./law-exposure";
import { officialViewReflectionHandler } from "./living-world/official-views";
import type { EntityId, World } from "./types";
import type { LegislativeRulePack } from "./legislature-rules";
import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "./law-consequences/pay-rows";
import { expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "./dates";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { createOrganization, createWorkRelationship } from "./life";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import {
  ensurePaydaySchedule,
  PAYDAY_HANDLERS,
  payTownPaydays,
  payPeriodEndingOn,
  nextPaydayDate,
} from "./living-world/town-pay";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { createLightweightPerson } from "./people";
import { createProductionPolicyCatalog } from "./production-catalog";
import { recordedPayStubs } from "./resource-income";
import { resourceFlowTermsAt, resourcePositionAt } from "./resource-queries";
import { createResourceFlow, createResourcePosition, money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorld, createWorld, createWorldId } from "./world";

const authored = {
  kind: "authored" as const,
  note: "Explicit under-floor weekly contract and cash control; not an actual wage estimate.",
};
function townWorker(placeKey: string) {
  const place = requireLifePlace(placeKey);
  const seed = `a38-town:${placeKey}`;
  const currentDate = makeIsoDate("2026-01-16");
  const person = createLightweightPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    index: 0,
    currentDate,
    homeJurisdictionId: place.context.jurisdiction.id,
  });
  let world = createWorld({
    seed,
    currentDate,
    currentMoment: simulationMomentOnLocalDate(
      place.context.initialMoment,
      currentDate,
    ),
    people: [person],
    jurisdictions: [
      place.context.jurisdiction,
      stateJurisdictionForKey(place.stateJurisdictionKey!)!,
      NATIONAL_ELECTION_JURISDICTION,
    ],
    policyCatalog: createProductionPolicyCatalog(),
  });
  world = createOrganization(world, {
    stableKey: "fixture:weekly:employer",
    formedAt: currentDate,
    provenance: authored,
    initialProfile: {
      name: "Recorded weekly employer",
      classification: "sector:private",
      locationJurisdictionId: place.context.jurisdiction.id,
    },
  });
  const employer = world.history.organizations.at(-1)!;
  world = createWorkRelationship(world, {
    stableKey: "fixture:weekly:work",
    personId: person.id,
    organizationId: employer.id,
    startedAt: currentDate,
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: authored,
    initialRole: {
      title: "Recorded weekly worker",
      occupationClassification: "occupation:retail-salesperson",
      locationJurisdictionId: place.context.jurisdiction.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: place.context.jurisdiction.id,
      },
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  world = createResourceFlow(world, {
    stableKey: `town-pay-v2:job-pay:${work.id}`,
    source: { kind: "organization", organizationId: employer.id },
    recipient: { kind: "person", personId: person.id },
    startsAt: currentDate,
    basisKind: "compensation:wages",
    basisReference: { kind: "work", workRelationshipId: work.id },
    restrictionKind: null,
    amount: money(10000, "USD"),
    cadenceKind: "schedule:town-weekly",
    jurisdictionId: place.context.jurisdiction.id,
    provenance: authored,
  });
  const flow = world.history.resourceFlows.at(-1)!;
  for (const [owner, balance] of [
    [{ kind: "organization" as const, organizationId: employer.id }, 1000000],
    [{ kind: "person" as const, personId: person.id }, 0],
  ] as const)
    world = createResourcePosition(world, {
      stableKey: `fixture:weekly:cash:${owner.kind}`,
      owner,
      openedAt: currentDate,
      openingBalance: money(balance, "USD"),
      provenance: authored,
    });
  return { world, person, work, employer, flow };
}

/** Canonical legislative records; every favorable ballot and signature is authored. */
function enact(
  start: World,
  pack: LegislativeRulePack,
  jurisdictionId: EntityId,
  questionKey: string,
  amount: number | null,
  answer: "yes" | "no" = "yes",
  savedStateRule?: string,
) {
  const proposition = Object.values(start.policyCatalog.propositions).find(
    (p) => p.stableKey === questionKey,
  )!;
  const key = `fixture:city-pay-law:${questionKey}:${amount}${savedStateRule ? ":saved-rule" : ""}`;
  let world = introduceMeasure(start, {
    stableKey: key,
    jurisdictionId,
    rulePackId: pack.packId,
    designation: "Controlled wage act",
    shortTitle: "Explicit fictional wage terms",
    summary:
      "Authored ballots and signature for a legal-reader/payroll control.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: start.personOrder[0]!,
    originChamberKey: pack.chamberOrder[0]!,
    propositionIds: savedStateRule ? [] : [proposition.id],
    propositionAnswers: savedStateRule
      ? []
      : [{ propositionId: proposition.id, answer }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  if (savedStateRule && amount !== null)
    world = fileRuleChangeProvision(world, {
      stableKey: `${key}:term`,
      measureId,
      officeKey: laborLawOfficeKey(savedStateRule),
      field: "labor.minimumWage.hourlyCents",
      value: amount,
    });
  else if (amount !== null)
    world = recordFiledProvision(world, {
      stableKey: `${key}:term`,
      measureId,
      provisionKey: "hourly-floor",
      sectionNumber: 1,
      heading: "Fictional hourly amount",
      text: "The controlled law carries its explicit numeric amount.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "Covered workers",
      },
      applicationScope: { jurisdictionId, segmentKey: null },
      lawTerms: [
        {
          questionKey,
          key:
            questionKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY
              ? "floor"
              : "target",
          value: amount,
          unit: "minor/hour",
        },
      ],
    });
  const seats = (chamberKey: string) =>
    pack.packId === "us-congress-v1"
      ? congressSeats().filter((seat) => seat.chamberKey === `us-${chamberKey}`)
          .length
      : authoredScenarioSeatCount(pack, chamberKey);
  const bodies = pack.chambers.map((chamber) =>
    seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      seats(chamber.chamberKey),
      [],
      false,
    ),
  );
  const votePlan: Record<string, AuthoredVoteCounts> = {};
  for (const chamber of pack.chambers) {
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: seats(chamber.chamberKey),
      };
  }
  const context = {
    pack,
    bodies,
    measureId,
    votePlan,
    committeeMemberCount:
      pack.chambers[0]!.committees[0]?.appointedMembers ?? null,
    governorAction: "signed" as const,
    governorRationale: "Explicit authored fixture signature.",
  };
  for (let guard = 0; guard < 60; guard++) {
    const position = measurePosition(world, measureId);
    if (position.phase === "awaiting-enactment")
      return {
        world: recordEnactment(world, {
          stableKey: `${key}:enacted`,
          measureId,
          effectiveAt: world.currentDate,
        }),
        measureId,
      };
    const step = availableMeasureSteps(world, measureId).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step)
      throw new Error(`Fixture has no canonical next step: ${position.phase}`);
    // Keep the date writer canonical while authoring the procedure decision.
    if (step === "request-committee-hearing") {
      const hearingDate = addDays(world.currentDate, 7);
      world = scheduleCommitteeHearing(world, {
        stableKey: `${key}:actual-hearing`,
        measureId,
        hearingDate,
      });
      world = advanceWorld(
        world,
        7,
        createFutureTransitionHandlerRegistry([
          [COMMITTEE_HEARING_TRANSITION_KEY, committeeHearingTransitionHandler],
        ]),
      );
    } else if (
      step === "await-next-legislative-day" &&
      position.earliestNextFloorDate
    ) {
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, position.earliestNextFloorDate),
        createFutureTransitionHandlerRegistry([]),
      );
    } else
      world =
        step === "await-executive-decision"
          ? recordExecutiveAction(world, {
              stableKey: `${key}:signed`,
              measureId,
              action: "signed",
              rationale:
                "Explicit authored fixture signature; no natural executive choice claimed.",
            })
          : applyLegislativeStep(context, world, step).world;
  }
  throw new Error("Controlled city law did not reach enactment");
}

const registry = createFutureTransitionHandlerRegistry([
  ...PAYDAY_HANDLERS,
  [OFFICIAL_VIEW_TRANSITION_KEY, officialViewReflectionHandler],
]);
it.each([
  ["1150000", 1795],
  ["2836000", 725],
  ["5363000", 1713],
  ["2938000", 1500],
  ["3451000", 1592],
] as const)(
  "A38 town %s actual payday retains starting floor and paycheck stamp",
  (placeKey, hourlyMinor) => {
    const f = townWorker(placeKey);
    const paid = advanceWorld(ensurePaydaySchedule(f.world), 7, registry);
    const playerPaid = advanceWorld(
      ensurePaydaySchedule({
        ...f.world,
        control: { kind: "person", personId: f.person.id },
      }),
      7,
      registry,
    );
    expect(playerPaid.history).toEqual(paid.history);
    const terms = resourceFlowTermsAt(paid, f.flow.id)!;
    expect(terms.amount).toEqual(money(hourlyMinor * 40, "USD"));
    expect(terms.lawEffectStamps).toEqual(
      expect.arrayContaining([expect.objectContaining({ effectKind: "pay" })]),
    );
    const outcomes = paid.history.resourceTransferOutcomes.filter(
      (x) => x.resourceFlowId === f.flow.id,
    );
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      periodStartsAt: "2026-01-17",
      periodEndsAt: "2026-01-23",
      occurredAt: "2026-01-23",
      transferredAmount: terms.amount,
    });
    expect(outcomes[0]!.lawEffectStamps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectKind: "pay",
          governingLawKey: terms.lawEffectStamps![0]!.governingLawKey,
        }),
      ]),
    );
    const stub = recordedPayStubs(paid, f.person.id).find(
      (x) => x.paycheck.id === outcomes[0]!.id,
    )!;
    expect(stub.withheld.minorUnits).toBeGreaterThan(0);
    expect(stub.netPaid.minorUnits).toBe(
      stub.paidGross.minorUnits - stub.withheld.minorUnits,
    );
    expect(
      resourcePositionAt(paid, f.flow.source, money(0, "USD").currency)!
        .liquidBalance,
    ).toEqual(money(1000000 - hourlyMinor * 40, "USD"));
    expect(payTownPaydays(paid, f.world.currentDate, null)).toBe(paid);
    console.info(
      `${f.person.givenName} ${f.person.familyName}; seed a38-town:${placeKey}; January 23 gross ${stub.paidGross.minorUnits} minor, withheld ${stub.withheld.minorUnits}, net ${stub.netPaid.minorUnits}; player/NPC histories equal.`,
    );
    expect(
      serializeWorld(
        payTownPaydays(
          deserializeWorld(serializeWorld(paid)),
          f.world.currentDate,
          null,
        ),
      ),
    ).toBe(serializeWorld(paid));
  },
);
it("A38 enacted Nebraska floor survives the actual payday without legacy shadow terms", () => {
  const f = townWorker("3137000");
  const enacted = enact(
    f.world,
    legislativeBlueprint("nebraska").pack,
    stateJurisdictionForKey("US-NE")!.id,
    STATE_MINIMUM_WAGE_QUESTION_KEY,
    2000,
    "yes",
    "NE",
  );
  let payday = nextPaydayDate(addDays(enacted.world.currentDate, 7));
  while (!payPeriodEndingOn("weekly", payday, 0))
    payday = nextPaydayDate(payday);
  const paid = advanceWorld(
    ensurePaydaySchedule(enacted.world),
    daysBetween(enacted.world.currentDate, payday),
    registry,
  );
  const outcomes = paid.history.resourceTransferOutcomes.filter(
    (x) => x.resourceFlowId === f.flow.id,
  );
  const last = outcomes.at(-1)!;
  expect(last.transferredAmount).toEqual(money(80000, "USD"));
  const terms = resourceFlowTermsAt(paid, f.flow.id)!;
  expect(terms.amount).toEqual(money(80000, "USD"));
  expect(terms.lawEffectStamps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        effectKind: "pay",
        governingLawKey: enacted.measureId,
      }),
    ]),
  );
  expect(last.lawEffectStamps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        effectKind: "pay",
        governingLawKey: enacted.measureId,
        sourceRecordIds: expect.arrayContaining([
          f.flow.id,
          f.work.id,
          terms.id,
          last.id,
        ]),
      }),
    ]),
  );
  const stub = recordedPayStubs(paid, f.person.id).find(
    (x) => x.paycheck.id === last.id,
  )!;
  expect(stub.paidGross).toEqual(money(80000, "USD"));
  expect(stub.withheld.minorUnits).toBeGreaterThan(0);
  expect(stub.netPaid.minorUnits).toBe(
    stub.paidGross.minorUnits - stub.withheld.minorUnits,
  );
  expect(
    resourcePositionAt(paid, f.flow.source, money(0, "USD").currency)!
      .liquidBalance,
  ).toEqual(
    money(
      1000000 -
        outcomes.reduce(
          (total, row) => total + row.transferredAmount.minorUnits,
          0,
        ),
      "USD",
    ),
  );
  console.info(
    `${f.person.givenName} ${f.person.familyName}; seed a38-town:3137000; ${last.occurredAt} enacted ${enacted.measureId}; gross ${stub.paidGross.minorUnits} minor, withheld ${stub.withheld.minorUnits}, net ${stub.netPaid.minorUnits}.`,
  );
  expect(payTownPaydays(paid, enacted.world.currentDate, null)).toBe(paid);
  expect(
    serializeWorld(
      payTownPaydays(
        deserializeWorld(serializeWorld(paid)),
        enacted.world.currentDate,
        null,
      ),
    ),
  ).toBe(serializeWorld(paid));
});
