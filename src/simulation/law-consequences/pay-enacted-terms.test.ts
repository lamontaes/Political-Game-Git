import { afterEach, expect, it, vi } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { addDays, daysBetween, simulationMomentOnLocalDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { stateJurisdictionForKey } from "../life-places";
import { organizationProfileAt } from "../life-queries";
import { recordOrganizationProfile } from "../life";
import {
  introduceMeasure,
  referMeasure,
  recordCommitteeDisposition,
  placeMeasureOnCalendar,
  takeFloorVote,
  transmitMeasure,
  enrollMeasure,
  presentMeasureToExecutive,
  recordExecutiveAction,
  recordEnactment,
  measurePosition,
} from "../legislation";
import { recordFiledProvision } from "../legislative-politics";
import {
  legislativeBlueprint,
  seatBodyForPack,
  committeeMembers,
  dispositionsFromCounts,
  authoredScenarioSeatCount,
} from "../legislation-scenarios";
import {
  createFutureTransitionHandlerRegistry,
  cancelFutureDueItem,
} from "../future-transitions";
import { advanceWorld, withWorldIntegrityDeferred } from "../world";
import {
  createWorkCompensation,
  createResourcePosition,
  money,
} from "../resources";
import { resourceFlowTermsAt, resourcePositionAt } from "../resource-queries";
import { recordedPayStubs } from "../resource-income";
import { personName } from "../people";
import { serializeWorld, deserializeWorld } from "../serialization";
import { STATE_MINIMUM_WAGE_QUESTION_KEY } from "../minimum-wage";
import { settleTownCompensations } from "../living-world/town-pay";
import { settleJobPay } from "../job-market";
import { TOWN_EMPLOYMENT_VERSION } from "../living-world/town-employment";
import { LAW_CONSEQUENCE_REGISTRATIONS } from "../law-consequence-registry";
import * as lawEffects from "../enacted-law-effects";
import {
  MINIMUM_WAGE_PAY_ROWS,
  PAY_REGISTRATION,
  resolvePayConsequences,
} from "./pay";
import type { World, EntityId } from "../types";

const registrations = [...LAW_CONSEQUENCE_REGISTRATIONS, PAY_REGISTRATION];
const canonicalDispatch = lawEffects.applyLawConsequences;
afterEach(() => vi.restoreAllMocks());
const provenance = {
  method: "authored-fixture" as const,
  sourceEntityIds: [] as readonly EntityId[],
  note: "Explicit favorable fixture ballots, not an elected-person decision model.",
};

function enact(
  start: World,
  ordinal: number,
  answer: "yes" | "no",
  target: number | null = 1500,
): World {
  const pack = legislativeBlueprint(
    "institution:us-oh-general-assembly-v1",
  ).pack;
  const state = stateJurisdictionForKey("US-OH")!;
  const proposition = Object.values(start.policyCatalog.propositions).find(
    (row) => row.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const prefix = `pay-term-fixture:${ordinal}`;
  let world = introduceMeasure(start, {
    stableKey: `${prefix}:measure`,
    jurisdictionId: state.id,
    rulePackId: pack.packId,
    designation: `HB ${900 + ordinal}`,
    shortTitle:
      answer === "yes"
        ? "Controlled fifteen-dollar wage floor"
        : "Controlled prospective repeal",
    summary:
      "Explicit canonical procedure and typed-term control, not a real enacted 2026 law.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: start.personOrder[0]!,
    originChamberKey: pack.chamberOrder[0]!,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = recordFiledProvision(world, {
    stableKey: `${prefix}:clause`,
    measureId,
    provisionKey: "wage-target",
    sectionNumber: 1,
    heading: "Prospective wage floor",
    text:
      answer === "yes"
        ? "The controlled wage floor is fifteen dollars an hour."
        : "The prospective increase is repealed without cutting contractual pay.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "Workers covered by the controlled statutory floor",
    },
    applicationScope: { jurisdictionId: state.id, segmentKey: null },
    ...(target === null || answer === "no"
      ? {}
      : {
          lawTerms: [
            {
              questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
              key: "target",
              value: target,
              unit: "minor/hour" as const,
            },
          ],
        }),
  });
  for (const chamberKey of pack.chamberOrder) {
    const chamber = pack.chambers.find(
      (entry) => entry.chamberKey === chamberKey,
    )!;
    const body = seatBodyForPack(
      chamberKey,
      chamber.name,
      authoredScenarioSeatCount(pack, chamberKey),
      [],
      false,
    );
    const committee = chamber.committees[0]!;
    world = referMeasure(world, {
      stableKey: `${prefix}:${chamberKey}:referral`,
      measureId,
      committeeKey: committee.committeeKey,
    });
    world = recordCommitteeDisposition(world, {
      stableKey: `${prefix}:${chamberKey}:committee`,
      measureId,
      recommendation: "favorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(body, committee.appointedMembers),
        { yea: committee.appointedMembers, nay: 0 },
      ),
      rationale: "Explicit authored fixture approval.",
      provenance,
    });
    world = placeMeasureOnCalendar(world, {
      stableKey: `${prefix}:${chamberKey}:calendar`,
      measureId,
    });
    for (const stage of chamber.floorStages) {
      const until = measurePosition(world, measureId).earliestNextFloorDate;
      if (until && until > world.currentDate)
        world = advanceWorld(
          world,
          daysBetween(world.currentDate, until),
          createFutureTransitionHandlerRegistry([]),
        );
      world = takeFloorVote(world, {
        stableKey: `${prefix}:${chamberKey}:${stage.stageKey}`,
        measureId,
        dispositions: dispositionsFromCounts(body.members, {
          yea: body.members.length,
          nay: 0,
        }),
        presentMembers: body.members.length,
        electedMembers: body.members.length,
        provenance,
      });
    }
    if (chamberKey !== pack.chamberOrder.at(-1))
      world = transmitMeasure(world, {
        stableKey: `${prefix}:transmit`,
        measureId,
      });
  }
  world = enrollMeasure(world, { stableKey: `${prefix}:enroll`, measureId });
  world = presentMeasureToExecutive(world, {
    stableKey: `${prefix}:present`,
    measureId,
  });
  world = recordExecutiveAction(world, {
    stableKey: `${prefix}:signed`,
    measureId,
    action: "signed",
    rationale: "Explicit authored fixture signature.",
  });
  return recordEnactment(world, {
    stableKey: `${prefix}:enacted`,
    measureId,
    actDesignation: `Controlled Act ${ordinal}`,
    effectiveAt: world.currentDate,
  });
}

function fixture(
  target: number | null = 1500,
  cadenceKind:
    "schedule:town-weekly" | "schedule:weekly" = "schedule:town-weekly",
) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: "3918000",
      seed: `pay-final-target:${target}`,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!;
  const proposition = Object.values(game.world.policyCatalog.propositions).find(
    (row) => row.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const row = MINIMUM_WAGE_PAY_ROWS[STATE_MINIMUM_WAGE_QUESTION_KEY]!;
  let world = {
    ...game.world,
    policyCatalog: {
      ...game.world.policyCatalog,
      propositions: {
        ...game.world.policyCatalog.propositions,
        [proposition.id]: { ...proposition, consequences: [row] },
      },
    },
  };
  world = enact(world, 1, "yes", target);
  const work = world.history.workRelationships.find(
    (entry) =>
      entry.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) &&
      entry.compensation === "paid" &&
      entry.organizationId,
  )!;
  expect(work).toBeDefined();
  world = createWorkCompensation(world, {
    stableKey:
      cadenceKind === "schedule:weekly"
        ? `job-pay:${work.id}`
        : `fixture:final-pay:${work.id}`,
    workRelationshipId: work.id,
    startsAt: world.currentDate,
    amount: money(100, "USD"),
    cadenceKind,
    restrictionKind: null,
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: "Explicit below-floor control, not a population wage.",
    },
  });
  const flow = world.history.resourceFlows.at(-1)!;
  return {
    world,
    work,
    flow,
    proposition,
    row,
    context: {
      onDate: world.currentDate,
      activity: "payroll" as const,
      activityId: flow.id,
      subjectIds: [work.personId],
    },
  };
}

it.each(["schedule:town-weekly", "schedule:weekly"] as const)(
  "passes a typed Ohio wage law through %s prospective pay, named-law stub, repeal and immutable saved payment",
  (cadenceKind) => {
    const f = fixture(1500, cadenceKind);
    const input = resolvePayConsequences(f.world, f.row, f.context)[0]!;
    expect(input.value).toMatchObject({ value: 1500, unit: "minor/hour" });
    expect(input.law.origin).toBe("enacted");
    const raised = canonicalDispatch(f.world, f.context, registrations);
    const terms = resourceFlowTermsAt(raised, f.flow.id)!;
    expect(terms.amount.minorUnits).toBeGreaterThan(100);
    expect(terms.lawEffectStamps![0]!.governingLawKey).toBe(
      input.law.measureId,
    );
    const employer = {
      kind: "organization" as const,
      organizationId: f.work.organizationId!,
    };
    let before = resourcePositionAt(raised, employer, terms.amount.currency)
      ? raised
      : createResourcePosition(raised, {
          stableKey: `fixture:final-pay-cash:${f.work.organizationId}`,
          owner: employer,
          openedAt: raised.currentDate,
          openingBalance: money(10_000_000, "USD"),
          provenance: {
            kind: "authored",
            note: "Explicit employer cash control.",
          },
        });
    const since = before.currentDate;
    const payday = addDays(since, cadenceKind === "schedule:weekly" ? 7 : 6);
    before = withWorldIntegrityDeferred(() => {
      let next = before;
      for (const due of before.history.futureDueItems) {
        const state = before.history.futureDueItemStates
          .filter((entry) => entry.dueItemId === due.id)
          .at(-1);
        if (state?.status === "scheduled" && due.dueAt < payday)
          next = cancelFutureDueItem(next, {
            stableKey: `fixture:final-pay-clock:${due.id}`,
            dueItemId: due.id,
            effectiveAt: since,
            reasonKey: "fixture:focused-payroll",
            context: "Controlled payroll context; no ordinary clock claim.",
          });
      }
      return {
        ...next,
        currentDate: payday,
        currentMoment: simulationMomentOnLocalDate(next.currentMoment, payday),
      };
    });
    vi.spyOn(lawEffects, "applyLawConsequences").mockImplementation(
      (world, context) => canonicalDispatch(world, context, registrations),
    );
    const period = {
      payFlowId: f.flow.id,
      activityId: f.flow.id,
      stableKey: `fixture:final-pay-period:${f.flow.id}`,
      periodStartsAt: since,
      periodEndsAt: addDays(since, 6),
      onDate: payday,
    };
    const settle = (world: World) =>
      cadenceKind === "schedule:weekly"
        ? settleJobPay(world, f.work.personId)
        : settleTownCompensations(world, [period]);
    const paid = settle(before);
    const played = settle({
      ...before,
      control: { kind: "person", personId: f.work.personId },
    });
    expect(played.history).toEqual(paid.history);
    const stub = recordedPayStubs(paid, f.work.personId).find(
      (entry) => entry.paycheck.resourceFlowId === f.flow.id,
    )!;
    expect(stub.paidGross).toEqual(terms.amount);
    expect(stub.assessmentStatus).toBe("recorded");
    expect(
      paid.history.statutoryTaxLiabilities!.some(
        (entry) => entry.sourceOutcomeId === stub.paycheck.id,
      ),
    ).toBe(true);
    expect(
      resourcePositionAt(before, employer, terms.amount.currency)!.liquidBalance
        .minorUnits -
        resourcePositionAt(paid, employer, terms.amount.currency)!.liquidBalance
          .minorUnits,
    ).toBe(stub.paidGross.minorUnits);
    const enactedMeasure = paid.history.legislativeMeasures!.find(
      (entry) => entry.id === input.law.measureId,
    )!;
    expect(enactedMeasure.designation.length).toBeGreaterThan(0);
    expect(
      stub.laws.some(
        (entry) =>
          entry.stamp.governingLawKey === input.law.measureId &&
          entry.designation === enactedMeasure.designation,
      ),
    ).toBe(true);
    expect(settle(paid)).toBe(paid);
    expect(
      serializeWorld(settle(deserializeWorld(serializeWorld(before)))),
    ).toBe(serializeWorld(paid));
    const repealed = enact(paid, 2, "no");
    expect(
      lawInForce(repealed, input.jurisdictionId, f.proposition.id)!.answer,
    ).toBe("no");
    expect(
      resolvePayConsequences(repealed, f.row, {
        ...f.context,
        onDate: repealed.currentDate,
      }),
    ).toEqual([]);
    expect(resourceFlowTermsAt(repealed, f.flow.id)).toEqual(
      resourceFlowTermsAt(paid, f.flow.id),
    );
    expect(repealed.history.resourceTransferOutcomes).toEqual(
      paid.history.resourceTransferOutcomes,
    );
    console.info(
      JSON.stringify({
        name: personName(paid.people[f.work.personId]!),
        seed: paid.seed,
        placeKey: "3918000",
        law: input.law.measureId,
        grossMinor: stub.paidGross.minorUnits,
      }),
    );
  },
);

it("refuses an enacted yes with no final adopted target instead of inventing a wage", () => {
  const f = fixture(null);
  expect(() => resolvePayConsequences(f.world, f.row, f.context)).toThrow(
    "Missing pay final law term 'target'",
  );
});

it("keeps the job-market flow's original weekly boundary when applying a floor", () => {
  const f = fixture(1500, "schedule:weekly");
  const onDate = addDays(f.world.currentDate, 1);
  const world = {
    ...f.world,
    currentDate: onDate,
    currentMoment: simulationMomentOnLocalDate(f.world.currentMoment, onDate),
  };
  expect(() =>
    canonicalDispatch(world, { ...f.context, onDate }, registrations),
  ).toThrow("pay.period.starts-on-effective-date");
  expect(world.history.resourceFlowTerms).toEqual(
    f.world.history.resourceFlowTerms,
  );
});

it("uses the employer's dated profile for catch-up coverage and preserves its source through Save/Continue", () => {
  const f = fixture(1500, "schedule:weekly");
  const profile = organizationProfileAt(f.world, f.work.organizationId!)!;
  const other = f.world.history.organizationProfiles.find(
    (entry) => entry.classification !== profile.classification,
  )!;
  expect(other).toBeDefined();
  const row = {
    ...f.row,
    who: {
      ...f.row.who,
      predicates: [
        {
          capability: "pay-employer-classification",
          parameters: { value: profile.classification },
        },
      ],
    },
  };
  const opening = {
    ...f.world,
    policyCatalog: {
      ...f.world.policyCatalog,
      propositions: {
        ...f.world.policyCatalog.propositions,
        [f.proposition.id]: { ...f.proposition, consequences: [row] },
      },
    },
  };
  const later = addDays(opening.currentDate, 7);
  const paused = withWorldIntegrityDeferred(() => {
    let next = opening;
    for (const due of opening.history.futureDueItems) {
      const state = opening.history.futureDueItemStates
        .filter((entry) => entry.dueItemId === due.id)
        .at(-1);
      if (state?.status === "scheduled" && due.dueAt <= later)
        next = cancelFutureDueItem(next, {
          stableKey: `fixture:pay-coverage-clock:${due.id}`,
          dueItemId: due.id,
          effectiveAt: opening.currentDate,
          reasonKey: "fixture:focused-payroll",
          context:
            "Explicit employer-profile date control, not an ordinary-calendar proof.",
        });
    }
    return next;
  });
  const shifted = advanceWorld(
    paused,
    7,
    createFutureTransitionHandlerRegistry([]),
  );
  const world = recordOrganizationProfile(shifted, {
    stableKey: "fixture:pay-coverage:later-classification",
    organizationId: f.work.organizationId!,
    effectiveAt: later,
    name: profile.name,
    classification: other.classification,
    locationJurisdictionId: profile.locationJurisdictionId,
    supersedesProfileId: profile.id,
    provenance: {
      kind: "authored",
      note: "Explicit later employer reclassification control; no inference of statutory FLSA coverage.",
    },
  });
  const nextProfile = world.history.organizationProfiles.at(-1)!;
  const resolved = resolvePayConsequences(world, row, f.context);
  expect(resolved).toHaveLength(1);
  expect(resolved[0]!.sourceRecordIds).toContain(profile.id);
  expect(resolved[0]!.sourceRecordIds).not.toContain(nextProfile.id);
  expect(
    resolvePayConsequences(world, row, { ...f.context, onDate: later }),
  ).toEqual([]);
  const reopened = deserializeWorld(serializeWorld(world));
  expect(resolvePayConsequences(reopened, row, f.context)).toEqual(resolved);
  const raised = canonicalDispatch(world, f.context, registrations);
  const terms = resourceFlowTermsAt(raised, f.flow.id)!;
  expect(terms.amount.minorUnits).toBe(60_000);
  expect(terms.lawEffectStamps![0]!.sourceRecordIds).toContain(profile.id);
  expect(canonicalDispatch(raised, f.context, registrations)).toBe(raised);
  expect(
    serializeWorld(canonicalDispatch(reopened, f.context, registrations)),
  ).toBe(serializeWorld(raised));
});
