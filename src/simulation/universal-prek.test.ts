import { beforeAll, describe, expect, it } from "vitest";
import { childServiceFixture } from "../../tests/fixtures/child-service-fixture";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addSimulationMinutes } from "./dates";
import { recordFamilyAddition } from "./people-family";
import { activeEducationEnrollmentsAt } from "./life-queries";
import { resourcePositionAt } from "./resource-queries";
import { money } from "./resources";
import { requestPublicService } from "./public-service-requests";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorld } from "./world";
import type { EntityId, World } from "./types";

const SERVICES = [
  {
    question: "us-policy-positions:education.universal-preschool",
    name: "pre-K",
    age: 4,
    minutes: 360,
    hours: 6,
    programKind: "schooling:pre-k",
  },
  {
    question: "us-policy-positions:education.equalize-school-funding",
    name: "after-school",
    age: 8,
    minutes: 90,
    hours: 1.5,
    programKind: "schooling:after-school",
  },
] as const;
for (const service of SERVICES) {
  const QUESTION = service.question;
  const SEED = `overflow4-child-services:${service.name}`;
  const place = drawRandomPlace(SEED);
  let funded: World;
  let unpaid: World;
  let parentId: EntityId;
  let childId: EntityId;
  let commitmentId: EntityId;
  let providerId: EntityId;
  let accountId: EntityId;
  let governorId: EntityId;

  beforeAll(() => {
    ({
      funded,
      unpaid,
      parentId,
      childId,
      commitmentId,
      providerId,
      accountId,
      governorId,
    } = childServiceFixture(service, SEED));
  });

  const input = (world: World) => ({
    personId: parentId,
    forPersonId: childId,
    commitmentId,
    start: addSimulationMinutes(world.currentMoment, 30),
    end: addSimulationMinutes(world.currentMoment, 30 + service.minutes),
  });

  describe(`${service.name} child service in ${place.displayName}, seed ${SEED}`, () => {
    it("pays the provider from the funded account, enrolls the child and records only attended hours", () => {
      expect(
        resourcePositionAt(
          unpaid,
          { kind: "organization", organizationId: accountId },
          money(0, "USD").currency,
        )!.liquidBalance.minorUnits,
      ).toBe(10000);
      expect(
        resourcePositionAt(
          funded,
          { kind: "organization", organizationId: accountId },
          money(0, "USD").currency,
        )!.liquidBalance.minorUnits,
      ).toBe(0);
      expect(
        resourcePositionAt(
          funded,
          { kind: "organization", organizationId: providerId },
          money(0, "USD").currency,
        )!.liquidBalance.minorUnits,
      ).toBe(10000);
      const flows = funded.history.resourceFlows.filter(
        (flow) =>
          flow.basisReference?.kind === "public-program" &&
          flow.basisReference.commitmentId === commitmentId,
      );
      expect(flows).toHaveLength(1);
      expect(flows[0]).toMatchObject({
        source: { kind: "organization", organizationId: accountId },
        recipient: { kind: "organization", organizationId: providerId },
      });
      expect(
        funded.history.resourceTransferOutcomes.filter(
          (outcome) => outcome.resourceFlowId === flows[0]!.id,
        ),
      ).toEqual([
        expect.objectContaining({
          status: "completed",
          transferredAmount: money(10000, "USD"),
        }),
      ]);
      expect(activeEducationEnrollmentsAt(funded, childId)).toHaveLength(0);
      const request = requestPublicService(funded, input(funded));
      if (request.kind !== "scheduled") throw new Error(request.reason);
      expect(activeEducationEnrollmentsAt(request.world, childId)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            enrollment: expect.objectContaining({
              id: request.enrollmentId,
              personId: childId,
              organizationId: providerId,
              programKind: service.programKind,
            }),
          }),
        ]),
      );
      const event = request.world.history.events.find(
        (row) => row.id === request.requestEventId,
      )!;
      expect(event.participants[0]!.personId).toBe(parentId);
      expect(
        request.world.history.events.filter(
          (row) => row.type === "service.delivery-recorded",
        ),
      ).toHaveLength(0);
      const restored = deserializeWorld(serializeWorld(request.world));
      const world = advanceWorld(restored, 1);
      const deliveries = world.history.events.filter(
        (row) => row.type === "service.delivery-recorded",
      );
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0]!.summary).toContain(`${service.hours} hours`);
      expect(deliveries[0]!.lawEffectStamps?.[0]).toMatchObject({
        questionKey: QUESTION,
        effectKind: "service-delivered",
      });
      const again = requestPublicService(
        deserializeWorld(serializeWorld(world)),
        input(world),
      );
      if (again.kind !== "scheduled") throw new Error(again.reason);
      expect(again.enrollmentId).toBe(request.enrollmentId);
      expect(activeEducationEnrollmentsAt(again.world, childId)).toHaveLength(
        1,
      );
    });

    it("a recorded household requests and attends through the same resident producer and ordinary clock", () => {
      const npcWorld = {
        ...funded,
        control: { kind: "person" as const, personId: governorId },
      };
      const requested = advanceWorld(npcWorld, 1);
      const requests = requested.history.events.filter(
        (event) =>
          event.type === "service.requested" &&
          event.participants.some(
            (participant) => participant.personId === parentId,
          ) &&
          event.involvedEntityIds.includes(childId),
      );
      expect(requests).toHaveLength(1);
      expect(activeEducationEnrollmentsAt(requested, childId)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            enrollment: expect.objectContaining({
              personId: childId,
              organizationId: providerId,
              programKind: service.programKind,
            }),
          }),
        ]),
      );
      expect(
        requested.history.events.filter(
          (event) => event.type === "service.delivery-recorded",
        ),
      ).toHaveLength(0);
      const attended = advanceWorld(
        deserializeWorld(serializeWorld(requested)),
        1,
      );
      const deliveries = attended.history.events.filter(
        (event) =>
          event.type === "service.delivery-recorded" &&
          event.lawEffectStamps?.some(
            (stamp) => stamp.questionKey === QUESTION,
          ),
      );
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0]!.summary).toContain(`${service.hours} hours`);
      const continued = advanceWorld(
        deserializeWorld(serializeWorld(attended)),
        1,
      );
      expect(activeEducationEnrollmentsAt(continued, childId)).toHaveLength(1);
      expect(
        continued.history.events.filter(
          (event) =>
            event.type === "service.delivery-recorded" &&
            event.lawEffectStamps?.some(
              (stamp) => stamp.questionKey === QUESTION,
            ),
        ),
      ).toHaveLength(1);
    });

    it("refuses an adult or a child without the recorded parent, without changing the world", () => {
      for (const requestInput of [
        { ...input(funded), forPersonId: parentId },
        { ...input(funded), forPersonId: undefined },
        {
          ...input(funded),
          end: addSimulationMinutes(funded.currentMoment, 31),
        },
      ]) {
        const request = requestPublicService(funded, requestInput);
        expect(request.kind).toBe("unsupported");
        expect(request.world).toBe(funded);
      }
    });

    it("uses the service row's age range for another recorded child in the same household", () => {
      const family = recordFamilyAddition(funded, {
        kind: "birth",
        stableKey: `fixture:wrong-age:${service.name}`,
        occurredAt: service.name === "pre-K" ? "2024-01-05" : "2023-01-05",
        parentPersonIds: [parentId],
        givenName: "Jordan",
      });
      const request = requestPublicService(family.world, {
        ...input(family.world),
        forPersonId: family.childPersonId,
      });
      expect(request.kind).toBe("unsupported");
      expect(request.world).toBe(family.world);
      expect(
        activeEducationEnrollmentsAt(request.world, family.childPersonId),
      ).toHaveLength(0);
    });

    it("refuses operating money that never actually reached the provider", () => {
      const world = {
        ...funded,
        history: {
          ...funded.history,
          resourceTransferOutcomes:
            funded.history.resourceTransferOutcomes.filter(
              (row) => row.transferredAmount.minorUnits === 0,
            ),
        },
      };
      const request = requestPublicService(world, input(world));
      expect(request.kind).toBe("unsupported");
      expect(request.world).toBe(world);
    });
  });
}
