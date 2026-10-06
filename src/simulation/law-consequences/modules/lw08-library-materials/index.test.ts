import { describe, expect, it } from "vitest";
import { addSimulationMinutes } from "../../../dates";
import { lawExposuresFrom } from "../../../law-exposure";
import { lifePlaceStateIdentities } from "../../../life-places";
import { performScheduledActivity } from "../../../time-work";
import { advanceWorld, assertWorldIntegrity } from "../../../world";
import { requestPublicService } from "../../../public-service-requests";
import {
  enact,
  fundedServiceFixture,
} from "../../../../../tests/fixtures/funded-service-fixture";
import {
  applyLw08LibraryMaterialsConsequence,
  LW08_LIBRARY_MATERIALS_QUESTION,
  LW08_LIBRARY_MATERIALS_ROW,
  resolveLw08LibraryMaterialsConsequences,
} from "./index";
import type { EntityId, World } from "../../../types";

const LIBRARY_FUNDING_QUESTION =
  "us-policy-positions:civil-family-community.fund-public-libraries";

function fixture(complete: boolean) {
  const funded = fundedServiceFixture(
    lifePlaceStateIdentities()[0]!.jurisdictionKey,
    LIBRARY_FUNDING_QUESTION,
  );
  const proposition = Object.values(
    funded.world.policyCatalog.propositions,
  ).find((entry) => entry.stableKey === LW08_LIBRARY_MATERIALS_QUESTION)!;
  let world: World = {
    ...funded.world,
    policyCatalog: {
      ...funded.world.policyCatalog,
      propositions: {
        ...funded.world.policyCatalog.propositions,
        [proposition.id]: {
          ...proposition,
          consequences: [LW08_LIBRARY_MATERIALS_ROW],
        },
      },
    },
  };
  world = enact(
    world,
    funded.jurisdiction.id,
    "yes",
    LW08_LIBRARY_MATERIALS_QUESTION,
  );
  const start = addSimulationMinutes(world.currentMoment, 30);
  const request = requestPublicService(world, {
    personId: funded.personId,
    commitmentId: funded.commitmentId,
    start,
    end: addSimulationMinutes(start, 60),
  });
  if (request.kind !== "scheduled") throw new Error(request.reason);
  world = complete
    ? performScheduledActivity(request.world, request.activityId)
    : request.world;
  return {
    world,
    personId: funded.personId,
    measureId: world.history.legislativeMeasures!.at(-1)!.id as EntityId,
    activityId: request.activityId,
  };
}

function context(f: ReturnType<typeof fixture>) {
  return {
    onDate: f.world.currentDate,
    activity: "service" as const,
    activityId: f.activityId,
    subjectIds: [f.personId],
    questionKey: LW08_LIBRARY_MATERIALS_QUESTION,
  };
}

describe("LW-08 local control of library materials", () => {
  it("lands a neutral exposure only after the named person completes a recorded library visit", () => {
    const booked = fixture(false);
    expect(
      resolveLw08LibraryMaterialsConsequences(
        booked.world,
        LW08_LIBRARY_MATERIALS_ROW,
        context(booked),
      ),
    ).toEqual([]);

    const f = fixture(true);
    const [resolved] = resolveLw08LibraryMaterialsConsequences(
      f.world,
      LW08_LIBRARY_MATERIALS_ROW,
      context(f),
    );
    expect(resolved).toMatchObject({
      questionKey: LW08_LIBRARY_MATERIALS_QUESTION,
      subject: { kind: "person", id: f.personId },
      value: { type: "amount", value: 1, unit: "count" },
    });
    expect(resolved!.sourceRecordIds).toHaveLength(8);

    const exposed = applyLw08LibraryMaterialsConsequence(f.world, resolved!);
    const [exposure] = lawExposuresFrom(exposed, f.measureId);
    expect(exposure).toMatchObject({
      personId: f.personId,
      channel: "public-service",
      direction: "none",
      amount: null,
      cadence: null,
    });
    const source = exposed.history.events.find(
      (event) => event.id === exposure!.sourceRecordId,
    );
    expect(source).toMatchObject({
      type: "library.materials-governance-exposure",
      participants: [
        expect.objectContaining({
          personId: f.personId,
          role: "focus:library-service-user",
        }),
      ],
      lawEffectStamps: [
        expect.objectContaining({
          questionKey: LW08_LIBRARY_MATERIALS_QUESTION,
          effectKind: "public-library-service",
          sourceRecordIds: expect.arrayContaining(resolved!.sourceRecordIds),
        }),
      ],
    });
    expect(source!.summary).toContain(
      "No title read or access outcome is recorded.",
    );
    expect(applyLw08LibraryMaterialsConsequence(exposed, resolved!)).toBe(
      exposed,
    );
    assertWorldIntegrity(exposed);
    assertWorldIntegrity(advanceWorld(exposed, 4));
  });
});
