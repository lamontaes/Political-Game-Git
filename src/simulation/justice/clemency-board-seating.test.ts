import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { dateAtAge, ageOnDate } from "../dates";
import { governorOfficeForJurisdiction } from "../governing/state-governing";
import { createWorkRelationship } from "../life";
import { lifePlaceStateIdentities } from "../life-places";
import { recordRelationshipInteraction } from "../records";
import { pickDistinct, SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { assertWorldIntegrity } from "../world";
import {
  CLEMENCY_BOARD_NOMINATED,
  clemencyBoardAppointmentProfiles,
  ensureOpeningClemencyBoardAppointments,
} from "./clemency-board-seating";

const sample = pickDistinct(
  new SeededRng("team9-r16-board-opening"),
  lifePlaceStateIdentities(),
  5,
);

describe("R16 recorded board nominations", () => {
  it.each(sample)(
    "does not invent appointment data or qualified people in $jurisdictionKey",
    (place) => {
      const { world } = smallWorld({
        place: place.jurisdictionKey,
        offices: ["governor"],
      });
      const prepared = ensureOpeningClemencyBoardAppointments(world);
      expect(prepared).toBe(world);
      expect(prepared.people).toBe(world.people);
      expect(prepared.history.organizationParticipations).toBe(
        world.history.organizationParticipations,
      );
    },
    30_000,
  );

  it.each(clemencyBoardAppointmentProfiles)(
    "preserves pending source/confirmation boundaries for $jurisdictionKey",
    (profile) => {
      const small = smallWorld({
        place: profile.jurisdictionKey,
        offices: ["governor"],
        people: 12,
      });
      const office = governorOfficeForJurisdiction(
        small.world,
        profile.jurisdictionKey,
      );
      expect(office).not.toBeNull();
      const candidate = small.world.personOrder.find(
        (id) =>
          id !== office!.holderPersonId &&
          ageOnDate(
            small.world.people[id]!.birthDate,
            small.world.currentDate,
          ) >= 26,
      );
      expect(candidate).toBeDefined();
      let world = recordRelationshipInteraction(small.world, {
        stableKey: "fixture:board-professional-help",
        personIds: [office!.holderPersonId, candidate!],
        eventId: null,
        occurredAt: small.world.currentDate,
        kind: "support:helped-through-a-hard-time",
        change: "strengthened",
        significance: "major",
        summary:
          "Authored fixture: the actual professional helped the actual governor.",
        tags: [`relationship.actor:${candidate}`],
      });
      world = createWorkRelationship(world, {
        stableKey: "fixture:board-professional-work",
        personId: candidate!,
        organizationId: null,
        startedAt: dateAtAge(world.people[candidate!]!.birthDate, 20),
        kind: "employment:staff",
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: {
          kind: "authored",
          note: "Explicit fixture professional work; no inferred biography or generated qualification.",
        },
        initialRole: {
          title: "Recorded professional",
          occupationClassification: "profession:corrections",
          locationJurisdictionId: office!.jurisdictionId,
          timeDemand: {
            expectedWeekly: { minimumHours: 40, maximumHours: 40 },
            attention: "high",
            concurrency: "mostly-exclusive",
            scheduleRigidity: "rigid",
            interruptibility: "non-interruptible",
            locationJurisdictionId: office!.jurisdictionId,
          },
        },
      });
      const prepared = ensureOpeningClemencyBoardAppointments(world);
      const nominations = prepared.history.events.filter(
        (event) => event.type === CLEMENCY_BOARD_NOMINATED,
      );
      if (profile.seatCount === null || profile.experienceYears === null) {
        expect(nominations).toHaveLength(0);
        expect(prepared).toBe(world);
      } else {
        expect(nominations).toHaveLength(1);
        const nomination = nominations[0]!;
        expect(nomination.participants).toContainEqual({
          personId: candidate,
          role: "agency:nominee",
          detail: profile.label,
        });
        const traceId = nomination.tags
          .find((tag) => tag.startsWith("appointment-decision:"))!
          .slice("appointment-decision:".length);
        const trace = prepared.history.decisionTraces.find(
          (row) => row.id === traceId,
        )!;
        expect(trace.context.actorPersonId).toBe(office!.holderPersonId);
        expect(trace.context.decisionType).toBe("appointment.choose-appointee");
        expect(trace.selectedOptionKey).toBe(`person:${candidate}`);
        expect(trace.sequence).toBeLessThan(nomination.sequence);
        expect(nomination.tags).toContain(
          "appointment-status:nominated-pending",
        );
      }
      // A nomination, guessed board vote or missing confirmation cannot seat anyone.
      expect(prepared.history.organizationParticipations).toBe(
        world.history.organizationParticipations,
      );
      expect(ensureOpeningClemencyBoardAppointments(prepared)).toBe(prepared);
      const restored = deserializeWorld(serializeWorld(prepared));
      assertWorldIntegrity(restored);
      expect(ensureOpeningClemencyBoardAppointments(restored)).toBe(restored);
      expect(
        restored.history.events.filter(
          (event) => event.type === CLEMENCY_BOARD_NOMINATED,
        ),
      ).toEqual(nominations);
    },
    30_000,
  );

  it.todo(
    "seats confirmed members through the shared Senate confirmation binding, then proves original positive clemency fixtures; missing adapter and sourced terms/quorum remain pending",
  );
});
