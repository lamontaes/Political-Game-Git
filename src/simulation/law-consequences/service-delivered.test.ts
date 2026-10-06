import { describe, expect, it } from "vitest";
import { applyLawConsequences } from "../enacted-law-effects";
import { addSimulationMinutes } from "../dates";
import { createOrganizationParticipation } from "../life";
import { lifePlaceStateIdentities } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  createScheduledActivity,
  performScheduledActivity,
} from "../time-work";
import {
  enact,
  fundedServiceFixture,
  provenance,
  questionKey,
} from "../../../tests/fixtures/funded-service-fixture";
import type { LawConsequenceRow } from "../law-consequence-types";
import { lawExposureSentence } from "../../presentation/law-exposure-lines";
import { noticeCivilFamilyServiceDelivery } from "./civil-family-service-noticed";
import {
  applyLawServiceConsequence,
  resolveLawServiceConsequence,
  SERVICE_ACTION,
  SERVICE_SELECTOR,
  SERVICE_HOURS,
  FUNDED_SERVICE,
  SERVICE_RECIPIENT_KIND,
  SERVICE_DELIVERED_LAW_ROWS,
  SERVICE_DELIVERED_REGISTRATION,
} from "./service-delivered";

const row: LawConsequenceRow = {
  id: "test:funded-service",
  kind: "service-delivered",
  when: "service",
  who: { selector: SERVICE_SELECTOR, predicates: [] },
  what: SERVICE_ACTION,
  amount: { op: "record", key: SERVICE_HOURS, unit: "hours" },
  conditions: [{ capability: FUNDED_SERVICE, parameters: {} }],
  lag: { days: 0, sourceIds: ["test:actual-completion"] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["test:actual-completion"],
    population: "Recorded service participants",
    scope: "Explicit completed fixture trip",
    why: "The participant completed the saved interval.",
    uncertainty: "No ridership, capacity or population prediction.",
  },
};

function fixture(
  stateKey: string,
  complete = true,
  recipient = true,
  keyOfQuestion = questionKey,
) {
  const funded = fundedServiceFixture(stateKey, keyOfQuestion);
  let world = funded.world;
  const { personId, jurisdiction, providerId, commitmentEventId } = funded;
  const sourceEntityIds = [commitmentEventId];
  if (recipient) {
    world = createOrganizationParticipation(world, {
      stableKey: "test:requested-service",
      personId,
      organizationId: providerId,
      startedAt: world.currentDate,
      kind: SERVICE_RECIPIENT_KIND,
      roleKind: "participant:service-recipient",
      context: "Explicit request to take the fixture service trip.",
      provenance,
    });
    sourceEntityIds.push(world.history.organizationParticipations.at(-1)!.id);
  }
  world = createScheduledActivity(world, {
    stableKey: "test:actual-trip",
    title: "Recorded public-service trip",
    summary:
      "An explicitly scheduled fixture trip, with a recorded recipient and operator commitment.",
    kind: "travel",
    start: world.currentMoment,
    end: addSimulationMinutes(world.currentMoment, 60),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: "test:trip",
      label: jurisdiction.name,
      jurisdictionId: jurisdiction.id,
    },
    sourceEntityIds,
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
  const activityId = world.history.scheduledActivities.at(-1)!.id;
  if (complete) world = performScheduledActivity(world, activityId);
  return {
    world,
    personId,
    activityId,
    jurisdictionId: jurisdiction.id,
    questionKey: keyOfQuestion,
  };
}

const context = (f: ReturnType<typeof fixture>) => ({
  onDate: f.world.currentDate,
  activity: "service" as const,
  activityId: f.activityId,
  subjectIds: [f.personId],
  questionKey: f.questionKey,
});

describe("service kind reuses actual completion and recipient records", () => {
  it.each(
    lifePlaceStateIdentities().flatMap((state) =>
      [
        "us-policy-positions:civil-family-community.dedicated-parks-funding",
        "us-policy-positions:civil-family-community.fund-public-libraries",
      ].map((key) => ({ state, key })),
    ),
  )(
    "saves a named person's service-law exposure and Journal line: $state.jurisdictionKey / $key",
    ({ state, key }) => {
      const pre = fixture(state.jurisdictionKey, false, true, key);
      const completed = performScheduledActivity(pre.world, pre.activityId);
      const receipt = completed.history.events.find(
        (event) =>
          event.type === "service.delivery-recorded" &&
          event.involvedEntityIds.includes(pre.activityId),
      )!;
      // The typed module lands the saved delivery through the ordinary effect
      // path. Seeing the same receipt again must not duplicate that exposure.
      const exposure = completed.history.lawExposures?.find(
        (row) => row.sourceRecordId === receipt.id,
      );
      expect(exposure).toMatchObject({
        personId: pre.personId,
        measureId: receipt.lawEffectStamps?.[0]?.governingLawKey,
        channel: "public-service",
        relation: "own",
        direction: "none",
        amount: null,
        sourceRecordId: receipt.id,
      });
      expect(lawExposureSentence(completed, pre.personId, exposure!)).toContain(
        "changed a public service you used",
      );
      expect(noticeCivilFamilyServiceDelivery(completed, receipt)).toBe(
        completed,
      );
      const restored = deserializeWorld(serializeWorld(completed));
      expect(
        noticeCivilFamilyServiceDelivery(restored, receipt).history
          .lawExposures,
      ).toEqual(restored.history.lawExposures);
    },
  );

  it.each(
    lifePlaceStateIdentities().flatMap((state) =>
      // This authored state-procedure trip fixture covers the two original
      // transit questions. Other rows do not establish a delivered producer;
      // federal questions cannot acquire state authority from this fixture.
      [
        questionKey,
        "us-policy-positions:transportation-infrastructure.fare-free-transit",
      ].map((key) => ({ state, key })),
    ),
  )(
    "preserves records and saves one named receipt: $state.jurisdictionKey / $key",
    ({ state, key }) => {
      // The real pre-completion world: the trip is saved, not yet done.
      const pre = fixture(state.jurisdictionKey, false, true, key);
      const row = SERVICE_DELIVERED_LAW_ROWS[key]![0]!;
      // Completing the trip once dispatches the service consequence itself.
      const completed = performScheduledActivity(pre.world, pre.activityId);
      const f = { ...pre, world: completed };
      const resolved = resolveLawServiceConsequence(f.world, row, context(f));
      expect(resolved, state.jurisdictionKey).toHaveLength(1);
      expect(resolved[0]!.value).toEqual({
        type: "amount",
        value: 1,
        unit: "hours",
      });
      // Every record saved before completion is unchanged.
      expect(
        completed.history.events.slice(0, pre.world.history.events.length),
      ).toEqual(pre.world.history.events);
      const receiptKey = `law-service:${f.activityId}:${f.personId}:${row.id}`;
      const receiptsIn = (world: typeof completed) =>
        world.history.events.filter(
          (event) => event.type === "service.delivery-recorded",
        );
      const [receipt, ...extra] = receiptsIn(completed);
      expect(extra).toEqual([]);
      expect(receipt!.stableKey).toBe(receiptKey);
      expect(receipt!.participants[0]!.personId).toBe(f.personId);
      expect(receipt!.involvedEntityIds).toContain(f.activityId);
      const completion = completed.history.events.find(
        (event) =>
          event.id ===
          [...completed.history.scheduledActivityStates]
            .reverse()
            .find((entry) => entry.activityId === f.activityId)!.outcomeEventId,
      )!;
      expect(receipt!.occurredAt).toBe(completion.occurredAt);
      expect(receipt!.lawEffectStamps).toHaveLength(1);
      expect(receipt!.lawEffectStamps?.[0]).toMatchObject({
        governingLawKey: resolved[0]!.law.measureId,
        questionKey: key,
        jurisdictionId: f.jurisdictionId,
        effectKind: "service-delivered",
        appliedAt: completion.occurredAt,
      });
      expect(resolved[0]!.row.id).toBe(row.id);
      // A repeat dispatch, before and after Save/Continue, adds nothing.
      expect(
        applyLawConsequences(completed, context(f), [
          SERVICE_DELIVERED_REGISTRATION,
        ]),
      ).toBe(completed);
      const restored = deserializeWorld(serializeWorld(completed));
      expect(
        applyLawConsequences(restored, context(f), [
          SERVICE_DELIVERED_REGISTRATION,
        ]),
      ).toBe(restored);
      expect(receiptsIn(restored)).toEqual([receipt]);
      const repealed = enact(restored, f.jurisdictionId, "no", key);
      expect(
        resolveLawServiceConsequence(repealed, row, {
          ...context(f),
          onDate: repealed.currentDate,
        }),
      ).toEqual([]);
      expect(
        repealed.history.events.slice(0, restored.history.events.length),
      ).toEqual(restored.history.events);
    },
  );
  it("payment and a scheduled trip do not become delivered service", () => {
    const f = fixture(lifePlaceStateIdentities()[0]!.jurisdictionKey, false);
    expect(resolveLawServiceConsequence(f.world, row, context(f))).toEqual([]);
  });
  it("an activity participant does not become a service recipient without a saved request", () => {
    const f = fixture(
      lifePlaceStateIdentities()[0]!.jurisdictionKey,
      true,
      false,
    );
    expect(resolveLawServiceConsequence(f.world, row, context(f))).toEqual([]);
  });
  it("refuses tampered amounts and malformed bindings", () => {
    const f = fixture(lifePlaceStateIdentities()[0]!.jurisdictionKey);
    const resolved = resolveLawServiceConsequence(f.world, row, context(f))[0]!;
    expect(
      applyLawServiceConsequence(f.world, {
        ...resolved,
        value: { type: "amount", value: 999, unit: "hours" },
      }),
    ).toBe(f.world);
    expect(
      resolveLawServiceConsequence(
        f.world,
        {
          ...row,
          amount: { op: "constant", value: 1, unit: "hours", sourceIds: [] },
        },
        context(f),
      ),
    ).toEqual([]);
  });
});
