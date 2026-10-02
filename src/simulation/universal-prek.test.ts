import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addSimulationMinutes, makeIsoDate } from "./dates";
import {
  createHousehold,
  createOrganization,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "./life";
import { recordFamilyAddition } from "./people-family";
import { activeEducationEnrollmentsAt } from "./life-queries";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import { introduceMeasure } from "./legislation";
import {
  seatBodyForPack,
  type LegislativeProcedureContext,
} from "./legislation-scenarios";
import { governorOfficeForJurisdiction } from "./governing/state-governing";
import {
  commitPublicProgram,
  recordProgramAppropriation,
} from "./governing/public-program";
import { createResourcePosition, money } from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { requestPublicService } from "./public-service-requests";
import { playerRequiredWorkIds, releasePlayerRequiredWork } from "./time-work";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorld, recordWorldEvent } from "./world";
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
  const provenance = {
    kind: "authored" as const,
    note: "Explicit small-world pre-K contract; amounts and ballots are fixture inputs.",
  };
  let funded: World;
  let unpaid: World;
  let parentId: EntityId;
  let childId: EntityId;
  let commitmentId: EntityId;
  let providerId: EntityId;
  let accountId: EntityId;
  let governorId: EntityId;

  beforeAll(() => {
    const small = smallWorld({
      place: place.key,
      date: "2026-01-05",
      laws: [QUESTION],
      offices: ["governor"],
      seed: SEED,
    });
    let world = small.world;
    parentId = small.personId;
    world = createHousehold(world, {
      stableKey: "fixture:family-home",
      formedAt: "2020-01-01",
      label: "The recorded family home",
      provenance,
    });
    const householdId = world.history.households.at(-1)!.id;
    world = recordHouseholdLocation(world, {
      stableKey: "fixture:family-location",
      householdId,
      effectiveAt: "2020-01-01",
      jurisdictionId: small.jurisdictionId,
      label: place.displayName,
      kind: "residence:community-base",
      provenance,
      supersedesLocationId: null,
    });
    world = startHouseholdMembership(world, {
      stableKey: "fixture:parent-home",
      personId: parentId,
      householdId,
      startedAt: "2020-01-01",
      residenceRole: "primary",
      kind: "resident:adult",
      provenance,
    });
    const family = recordFamilyAddition(world, {
      kind: "birth",
      stableKey: "fixture:pre-k-child",
      occurredAt: `${2026 - service.age}-01-05`,
      parentPersonIds: [parentId],
      givenName: "Avery",
    });
    world = family.world;
    childId = family.childPersonId;
    const pack = legislativePackForJurisdiction(small.stateJurisdictionId)!;
    world = introduceMeasure(world, {
      stableKey: "fixture:child-service-law",
      jurisdictionId: small.stateJurisdictionId,
      rulePackId: pack.packId,
      designation: `Fixture ${service.name} act`,
      shortTitle: `${service.name} operating support`,
      summary: "Explicit test contract.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: parentId,
      propositionIds: [small.propositionIds[QUESTION]!],
      propositionAnswers: [
        { propositionId: small.propositionIds[QUESTION]!, answer: "yes" },
      ],
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    const bodies = pack.chambers.map((chamber) => {
      if (chamber.seats.kind !== "known")
        throw new Error("Fixture requires this place's recorded chamber size.");
      return seatBodyForPack(
        chamber.chamberKey,
        chamber.name,
        chamber.seats.value,
        [],
        false,
      );
    });
    const votePlan: LegislativeProcedureContext["votePlan"] =
      Object.fromEntries(
        pack.chambers.flatMap((chamber) => [
          [
            `floor:${chamber.chamberKey}:final-passage`,
            {
              yea: bodies.find(
                (body) => body.chamberKey === chamber.chamberKey,
              )!.members.length,
              nay: 0,
            },
          ],
          ...chamber.committees.map((committee) => [
            `committee:${committee.committeeKey}`,
            { yea: committee.appointedMembers ?? 7, nay: 0 },
          ]),
        ]),
      );
    const context: LegislativeProcedureContext = {
      pack,
      measureId,
      bodies,
      committeeMemberCount:
        pack.chambers[0]!.committees[0]?.appointedMembers ?? 7,
      votePlan,
      governorAction: "signed",
      governorRationale: "Authored fixture: sign the pre-K act.",
    };
    world = enactThroughDesk(world, measureId, {
      context,
      effectiveAt: world.currentDate,
    });
    governorId = governorOfficeForJurisdiction(
      world,
      pack.jurisdictionKey,
    )!.holderPersonId!;
    world = { ...world, control: { kind: "person", personId: governorId } };
    world = recordWorldEvent(world, {
      stableKey: "fixture:governor-handoff",
      type: "fixture.control-handoff",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: small.stateJurisdictionId,
      involvedEntityIds: [
        governorId,
        ...playerRequiredWorkIds(world, governorId),
      ],
      participants: [],
      personFactConstraints: [],
      summary: "The fixture returns control to the recorded parent.",
      visibility: "public",
      tags: [],
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    world = releasePlayerRequiredWork(world, {
      personId: governorId,
      stableKeyPrefix: "fixture:governor-handoff",
      outcomeEventId: world.history.events.at(-1)!.id,
    });
    for (const [key, classification] of [
      ["fixture:government", "sector:government"],
      ["fixture:child-service-provider", "service:school"],
    ] as const) {
      world = createOrganization(world, {
        stableKey: key,
        formedAt: world.currentDate,
        provenance,
        initialProfile: {
          name: key,
          classification,
          locationJurisdictionId: small.stateJurisdictionId,
        },
      });
      if (classification === "sector:government")
        accountId = world.history.organizations.at(-1)!.id;
      else providerId = world.history.organizations.at(-1)!.id;
    }
    for (const [organizationId, amount] of [
      [accountId, 10000],
      [providerId, 0],
    ] as const)
      world = createResourcePosition(world, {
        stableKey: `fixture:cash:${organizationId}`,
        owner: { kind: "organization", organizationId },
        openedAt: world.currentDate,
        openingBalance: money(amount, "USD"),
        provenance,
      });
    const appropriation = recordProgramAppropriation(world, {
      programKey: "education:child-service",
      jurisdictionId: small.stateJurisdictionId,
      accountOrganizationId: accountId,
      amount: money(10000, "USD"),
      availableFrom: world.currentDate,
      availableThrough: makeIsoDate("2026-12-31"),
      sourceMeasureId: measureId,
      basis: { kind: "authored-fixture", note: provenance.note },
      edition: "fixture",
    });
    unpaid = appropriation.world;
    const committed = commitPublicProgram(unpaid, {
      appropriationId: appropriation.id,
      alternative: {
        key: "child-service-spots",
        title: "Fund the recorded provider",
        installments: [
          { afterDays: 1, amount: money(10000, "USD"), purpose: "operating" },
        ],
        deliveryLeadDays: null,
      },
      personId: governorId,
      office: { kind: "state-executive" },
      recipientOrganizationId: providerId,
    });
    if (!committed.ok) throw new Error(committed.reason);
    commitmentId = committed.recordId;
    funded = advanceWorld(
      { ...committed.world, control: { kind: "person", personId: parentId } },
      1,
    );
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
