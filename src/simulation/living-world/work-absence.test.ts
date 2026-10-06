import { beforeAll, describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { compareSimulationMoments } from "../dates";
import { serializeWorld, deserializeWorld } from "../serialization";
import { activeWorkRelationshipsAt } from "../life-queries";
import {
  presentAt,
  whereaboutsAt,
  workSchedulesFor,
  type WorkPlaceId,
} from "./work-schedules";
import { recordWorkAbsence, workAbsenceAt } from "./work-absence";
import type { EntityId, World } from "../types";

const seed = "session11-recorded-absence";
const states = lifePlaceStateIdentities();
const state =
  states[
    Array.from(seed).reduce((v, c) => (v * 31 + c.charCodeAt(0)) >>> 0, 0) %
      states.length
  ]!;
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: state.jurisdictionKey,
  scope: "locality",
})[0]!;

describe(
  "recorded absence and computed workplace presence",
  { timeout: 60_000 },
  () => {
    let world: World;
    let subject: EntityId;
    let workplace: WorkPlaceId;
    beforeAll(() => {
      world = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startKind: "custom",
          startAge: 34,
          questionnaire: "skipped",
        }),
      ).game!.world;
      for (const id of world.personOrder) {
        const where = whereaboutsAt(world, id);
        if (where.kind !== "work" || !where.organizationId) continue;
        const job = activeWorkRelationshipsAt(world, id).find(
          (j) => j.relationship.id === where.workRelationshipId,
        )!;
        if (!job.role.locationJurisdictionId) continue;
        subject = id;
        workplace = {
          jurisdictionId: job.role.locationJurisdictionId,
          place: where.place,
          organizationId: where.organizationId,
        };
        break;
      }
      expect(subject).toBeDefined();
      console.info(
        JSON.stringify({
          seed,
          worldId: world.id,
          placeKey: place.key,
          state: state.usps,
          moment: world.currentMoment,
          subject,
          workplace,
          workIds: workSchedulesFor(world, subject).map(
            (s) => s.workRelationshipId,
          ),
        }),
      );
    });

    it("retains the same generated worker through the canonical absence writer and reload", () => {
      expect(presentAt(world, workplace).map((p) => p.personId)).toContain(
        subject,
      );
      const end = {
        ...world.currentMoment,
        minuteOfDay: world.currentMoment.minuteOfDay + 30,
      };
      const next = recordWorkAbsence(world, {
        stableKey: `${seed}:away`,
        personId: subject,
        startsAt: world.currentMoment,
        endsAt: end,
        reason: "Recorded absence for the reader acceptance test.",
        provenance: {
          kind: "authored",
          note: "Explicit absence writer exercise in an ordinary generated world; no automatic illness or leave decision is claimed.",
        },
      });
      expect(next.currentMoment).toEqual(world.currentMoment);
      expect(next.people).toBe(world.people);
      expect(next.history.workStatuses).toBe(world.history.workStatuses);
      expect(whereaboutsAt(next, subject).kind).toBe("absent");
      expect(presentAt(next, workplace).map((p) => p.personId)).not.toContain(
        subject,
      );
      expect(workAbsenceAt(next, subject, end)).toBeNull();
      expect(
        compareSimulationMoments(end, world.currentMoment),
      ).toBeGreaterThan(0);
      const loaded = deserializeWorld(serializeWorld(next));
      expect(whereaboutsAt(loaded, subject)).toEqual(
        whereaboutsAt(next, subject),
      );
      expect(presentAt(loaded, workplace).map((p) => p.personId)).not.toContain(
        subject,
      );
      expect(presentAt(world, { ...workplace, organizationId: null })).toEqual(
        [],
      );
      expect(
        presentAt(world, workplace).every(
          (p) => p.presenceBasis === "computed-work-schedule",
        ),
      ).toBe(true);
    });

    it("refuses invalid intervals and does not invent an absence for another person", () => {
      expect(() =>
        recordWorkAbsence(world, {
          stableKey: "invalid",
          personId: subject,
          startsAt: world.currentMoment,
          endsAt: world.currentMoment,
          reason: "Away",
          provenance: { kind: "authored", note: "Invalid interval fixture" },
        }),
      ).toThrow(/end after/);
      expect(
        workAbsenceAt(
          world,
          world.personOrder.find((id) => id !== subject)!,
          world.currentMoment,
        ),
      ).toBeNull();
    });
  },
);
