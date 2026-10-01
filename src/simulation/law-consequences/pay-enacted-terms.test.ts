import { afterEach, expect, it, vi } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { addDays, daysBetween, simulationMomentOnLocalDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { stateJurisdictionForKey } from "../life-places";
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

function fixture(target: number | null = 1500) {
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
    stableKey: `fixture:final-pay:${work.id}`,
    workRelationshipId: work.id,
    startsAt: world.currentDate,
    amount: money(100, "USD"),
    cadenceKind: "schedule:town-weekly",
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

it("passes a typed $15 Ohio law through actual prospective pay, named-law stub, repeal and immutable saved payment", () => {
  const f = fixture();
  const input = resolvePayConsequences(f.world, f.row, f.context)[0]!;
  expect(input.value).toMatchObject({ value: 1500, unit: "minor/hour" });
  expect(input.law.origin).toBe("enacted");
  const raised = canonicalDispatch(f.world, f.context, registrations);
  const terms = resourceFlowTermsAt(raised, f.flow.id)!;
  expect(terms.amount.minorUnits).toBeGreaterThan(100);
  expect(terms.lawEffectStamps![0]!.governingLawKey).toBe(input.law.measureId);
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
  const payday = addDays(since, 6);
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
    periodEndsAt: payday,
    onDate: payday,
  };
  const paid = settleTownCompensations(before, [period]);
  const stub = recordedPayStubs(paid, f.work.personId)[0]!;
  expect(stub.paidGross).toEqual(terms.amount);
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
  expect(settleTownCompensations(paid, [period])).toBe(paid);
  expect(
    serializeWorld(
      settleTownCompensations(deserializeWorld(serializeWorld(before)), [
        period,
      ]),
    ),
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
}, 120_000);

it("refuses an enacted yes with no final adopted target instead of inventing a wage", () => {
  const f = fixture(null);
  expect(() => resolvePayConsequences(f.world, f.row, f.context)).toThrow(
    "Missing pay final enacted term 'target'",
  );
}, 120_000);
