import { describe, expect, it } from "vitest";
import { addSimulationMinutes } from "./dates";
import { stableHash } from "./ids";
import { lifePlaceStateIdentities } from "./life-places";
import { deserializeWorld, serializeWorld } from "./serialization";
import { performScheduledActivity, scheduledActivityState } from "./time-work";
import { advanceWorld, assertWorldIntegrity } from "./world";
import { requestPublicService } from "./public-service-requests";
import {
  fundedServiceFixture,
  questionKey,
} from "../../tests/fixtures/funded-service-fixture";
import type { EntityId, Person, World } from "./types";

/**
 * Proof for the shared completeActivity dispatch (#1408): an activity the
 * person actually completes records delivered service through the ordinary
 * clock, with no dispatcher call in this file.
 */

const CRISIS =
  "us-policy-positions:health-human-services.fund-behavioral-health-crisis-response";

/** A place from all 56, named by its seed. */
function drawPlace(seed: string): string {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  return places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!
    .jurisdictionKey;
}

/** Authored fixture: the person's recorded home is in the served place. */
function homeIn(world: World, personId: EntityId, jurisdictionId: EntityId) {
  const person = world.people[personId]!;
  const move = <T extends { kind: string; endedAt?: unknown }>(fact: T): T =>
    fact.kind === "residence" && fact.endedAt === null
      ? { ...fact, jurisdictionId }
      : fact;
  const moved = {
    ...person,
    homeJurisdictionId: jurisdictionId,
    establishedFacts: person.establishedFacts.map(move),
    ...(person.detailLevel === "materialized"
      ? {
          details: {
            ...person.details,
            generatedFacts: person.details.generatedFacts.map(move),
          },
        }
      : {}),
  } as Person;
  const next = { ...world, people: { ...world.people, [personId]: moved } };
  assertWorldIntegrity(next);
  return next;
}

const deliveries = (world: World) =>
  world.history.events.filter((e) => e.type === "service.delivery-recorded");

function requested(seed: string, key: string, minutes: number) {
  const funded = fundedServiceFixture(drawPlace(seed), key);
  const world = homeIn(funded.world, funded.personId, funded.jurisdiction.id);
  const start = addSimulationMinutes(world.currentMoment, 30);
  const asked = requestPublicService(world, {
    personId: funded.personId,
    commitmentId: funded.commitmentId,
    start,
    end: addSimulationMinutes(start, minutes),
  });
  if (asked.kind !== "scheduled") throw new Error(asked.reason);
  return { ...funded, asked };
}

const CASES = [
  { seed: "live-completion-1", key: questionKey, minutes: 45, hours: 0.75 },
  { seed: "live-completion-2", key: questionKey, minutes: 60, hours: 1 },
  { seed: "live-completion-3", key: CRISIS, minutes: 90, hours: 1.5 },
] as const;

describe("a completed activity records delivered service on its own", () => {
  for (const c of CASES) {
    const place = drawPlace(c.seed);
    it(`taking part records it once, and Save/Continue keeps it once (${place}, seed ${c.seed}, ${c.key.split(".").at(-1)})`, () => {
      const f = requested(c.seed, c.key, c.minutes);
      let world = f.asked.world;
      expect(deliveries(world)).toEqual([]);

      // The person takes part; nothing else is called.
      world = performScheduledActivity(world, f.asked.activityId);
      expect(scheduledActivityState(world, f.asked.activityId).status).toBe(
        "completed",
      );
      const [receipt, ...extra] = deliveries(world);
      expect(extra).toEqual([]);
      expect(receipt!.participants).toEqual([
        expect.objectContaining({
          personId: f.personId,
          role: "focus:service-recipient",
        }),
      ]);
      expect(receipt!.summary).toContain(`${c.hours} hour`);
      expect(receipt!.lawEffectStamps?.[0]).toMatchObject({
        questionKey: c.key,
        jurisdictionId: f.jurisdiction.id,
        effectKind: "service-delivered",
      });
      expect(receipt!.lawEffectStamps?.[0]!.sourceRecordIds).toEqual(
        expect.arrayContaining([
          f.asked.activityId,
          f.asked.participationId,
          f.commitmentId,
          f.personId,
        ]),
      );
      assertWorldIntegrity(world);

      // A repeat cannot double it: the activity is no longer scheduled.
      expect(() =>
        performScheduledActivity(world, f.asked.activityId),
      ).toThrow();

      // Save, Continue, and keep living: still exactly one receipt.
      const restored = deserializeWorld(serializeWorld(world));
      expect(deliveries(restored)).toEqual(deliveries(world));
      const later = advanceWorld(restored, 2);
      expect(deliveries(later)).toHaveLength(1);
      assertWorldIntegrity(later);
    });
  }

  const noShow = "live-completion-no-show";
  it(`a booked trip that the clock passes without the person records nothing (${drawPlace(noShow)}, seed ${noShow})`, () => {
    const f = requested(noShow, questionKey, 45);
    const later = advanceWorld(f.asked.world, 2);
    expect(scheduledActivityState(later, f.asked.activityId).status).not.toBe(
      "completed",
    );
    expect(deliveries(later)).toEqual([]);
  });
});
