import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { enterLifePath } from "../life-paths2";
import { addDays, simulationMomentOnLocalDate } from "../dates";
import { lifePlaceByKey, stateJurisdictionForKey } from "../life-places";
import { recordWorkRole } from "../life";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { withWorldIntegrityDeferred } from "../world";
import { isLawEffectStamp } from "../law-effect-stamp";
import {
  CITY_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
  LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY,
} from "../minimum-wage";
import { raiseTownPayToMinimum, TOWN_PAY_VERSION } from "./town-pay";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";

// Controlled unit fixture: legislative history is deliberately incomplete.
// It checks attribution writers, not legislative validity or a reopenable World.
const provenance = {
  kind: "authored" as const,
  note: "Controlled law/low prior-pay fixture; not an empirical wage or legislative vote.",
};
const places = ["3223500", "2743000", "5363000", "3755000", "1235000"];
function lawOn(
  world: World,
  jurisdictionId: EntityId,
  questionKey: string,
): World {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === questionKey,
  )!;
  const key = `fixture:floor:${jurisdictionId}:${questionKey}`;
  const measureId =
    `legislative-measure_${world.history.nextSequence}` as EntityId;
  const measure = {
    id: measureId,
    stableKey: key,
    sequence: world.history.nextSequence,
    jurisdictionId,
    rulePackId: "test",
    designation: "Fixture floor law",
    shortTitle: "Fixture floor law",
    summary: "Controlled operative yes law.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: null,
    introducedAt: world.currentDate,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  } as LegislativeMeasureRecord;
  const enactment = {
    id: `legislative-enactment_${world.history.nextSequence + 1}` as EntityId,
    stableKey: `${key}:enacted`,
    sequence: world.history.nextSequence + 1,
    measureId,
    resolvedAt: world.currentDate,
    effectiveAt: world.currentDate,
    outcome: "enacted",
    actDesignation: "Fixture floor law",
    outcomeEventId: "" as EntityId,
  } as LegislativeEnactmentRecord;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 2,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}

describe.each(places)("state/local floor attribution in %s", (placeKey) => {
  it.each(["state", "local"] as const)(
    "reads the %s law at its own jurisdiction, then preserves it on actual payment",
    (level) => {
      let world = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey,
        startAge: 30,
        startingLife: "ordinary-life",
        household: "lives-alone",
        questionnaire: "skipped",
        seed: `state-local-floor:${placeKey}:${level}`,
      }).world;
      world = enterLifePath(world, "shop-assistant").world;
      const work = world.history.workRelationships.at(-1)!;
      const role = world.history.workRoles.at(-1)!;
      const place = lifePlaceByKey(placeKey)!;
      const town = place.context.jurisdiction.id;
      if (!place.stateJurisdictionKey) throw new Error("Fixture needs a state");
      const state = stateJurisdictionForKey(place.stateJurisdictionKey)!;
      world = recordWorkRole(world, {
        stableKey: "fixture:located-role",
        workRelationshipId: work.id,
        effectiveAt: world.currentDate,
        title: role.title,
        occupationClassification: role.occupationClassification,
        locationJurisdictionId: town,
        timeDemand: role.timeDemand,
        provenance,
        supersedesRoleId: role.id,
      });
      world = createResourceFlow(world, {
        stableKey: `${TOWN_PAY_VERSION}:job-pay:fixture:${work.id}`,
        source: { kind: "organization", organizationId: work.organizationId! },
        recipient: { kind: "person", personId: work.personId },
        startsAt: world.currentDate,
        amount: money(100, "USD"),
        cadenceKind: "schedule:town-weekly",
        basisKind: "compensation:work",
        basisReference: { kind: "work", workRelationshipId: work.id },
        restrictionKind: null,
        jurisdictionId: town,
        provenance,
      });
      const flow = world.history.resourceFlows.at(-1)!;
      world = lawOn(world, state.id, STATE_MINIMUM_WAGE_QUESTION_KEY);
      if (level === "local") {
        world = lawOn(
          world,
          state.id,
          LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY,
        );
        world = lawOn(world, town, CITY_MINIMUM_WAGE_QUESTION_KEY);
      }
      const questionKey =
        level === "state"
          ? STATE_MINIMUM_WAGE_QUESTION_KEY
          : CITY_MINIMUM_WAGE_QUESTION_KEY;
      const jurisdictionId = level === "state" ? state.id : town;
      const measureId = world.history.legislativeMeasures!.at(-1)!.id;
      const date = addDays(world.currentDate, 8);
      world = {
        ...world,
        currentDate: date,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
      };
      const raised = withWorldIntegrityDeferred(() =>
        raiseTownPayToMinimum(world, null),
      );
      const terms = raised.history.resourceFlowTerms
        .filter((row) => row.resourceFlowId === flow.id)
        .at(-1)!;
      expect(terms.amount.minorUnits).toBeGreaterThan(100);
      expect(terms.lawEffectStamps).toHaveLength(1);
      expect(isLawEffectStamp(terms.lawEffectStamps![0])).toBe(true);
      expect(terms.lawEffectStamps![0]).toMatchObject({
        governingLawKey: measureId,
        questionKey,
        jurisdictionId,
        effectKind: "minimum-wage-compensation",
      });
      const paid = withWorldIntegrityDeferred(() =>
        recordResourceTransferOutcome(raised, {
          stableKey: "fixture:floor-paid",
          resourceFlowId: flow.id,
          periodStartsAt: date,
          periodEndsAt: date,
          occurredAt: date,
          status: "completed",
          attemptedAmount: terms.amount,
          transferredAmount: terms.amount,
          reasonKind: null,
          note: "Controlled completed payment, not a calendar/payroll decision.",
          provenance,
        }),
      );
      const outcome = paid.history.resourceTransferOutcomes.at(-1)!;
      expect(outcome.lawEffectStamps![0]).toMatchObject({
        governingLawKey: measureId,
        questionKey,
        jurisdictionId,
        effectKind: "work-compensation-payment",
      });
      expect(outcome.lawEffectStamps![0]!.sourceRecordIds).toEqual(
        expect.arrayContaining([terms.id, flow.id, outcome.id]),
      );
      // Record JSON persistence only; canonical World reopening is NOT RUN.
      expect(JSON.parse(JSON.stringify(outcome))).toEqual(outcome);
    },
    120_000,
  );
});
