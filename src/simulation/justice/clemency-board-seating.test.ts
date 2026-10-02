import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { dateAtAge, ageOnDate } from "../dates";
import { governorOfficeForJurisdiction } from "../governing/state-governing";
import { decideChamberVote } from "../governing/chamber-votes";
import type { ChamberNominationVoteInput } from "../governing/chamber-votes";
import { createOrganization, createWorkRelationship } from "../life";
import type { CreateWorkRelationshipInput } from "../life";
import { lifePlaceStateIdentities } from "../life-places";
import { recordRelationshipInteraction } from "../records";
import { pickDistinct, SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { assertWorldIntegrity } from "../world";
import {
  CLEMENCY_BOARD_NOMINATED,
  CLEMENCY_BOARD_APPOINTED,
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
          ) >= 28,
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
      const workStartedAt = dateAtAge(world.people[candidate!]!.birthDate, 20);
      world = createOrganization(world, {
        stableKey: "fixture:board-professional-workplace",
        formedAt: workStartedAt,
        provenance: {
          kind: "authored",
          note: "Explicit fixture correctional employer, not a generated government office or appointment.",
        },
        initialProfile: {
          name: "Authored correctional workplace",
          classification: "service:corrections",
          locationJurisdictionId: office!.jurisdictionId,
        },
      });
      const beforeWork = world;
      const workInput: CreateWorkRelationshipInput = {
        stableKey: "fixture:board-professional-work",
        personId: candidate!,
        organizationId: world.history.organizations.at(-1)!.id,
        startedAt: workStartedAt,
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
      };
      world = createWorkRelationship(world, workInput);
      if (profile.qualifications !== null) {
        const shorter = createWorkRelationship(beforeWork, {
          ...workInput,
          startedAt: dateAtAge(
            world.people[candidate!]!.birthDate,
            ageOnDate(world.people[candidate!]!.birthDate, world.currentDate) -
              6,
          ),
        });
        // Six recorded years cannot use the five-year alternative without
        // actual accredited bachelor evidence; neither age nor a title is it.
        expect(ensureOpeningClemencyBoardAppointments(shorter)).toBe(shorter);
        expect(
          shorter.history.events.filter(
            (event) => event.type === CLEMENCY_BOARD_NOMINATED,
          ),
        ).toHaveLength(0);
      }
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
        // Binding proof only: this supplied member is not a compiled state
        // chamber or a recorded confirmation. No member reasons means no yes.
        const voterId = prepared.personOrder.find(
          (id) => id !== candidate && id !== office!.holderPersonId,
        )!;
        const boardKey = nomination.tags
          .find((tag) => tag.startsWith("board-key:"))!
          .slice("board-key:".length);
        const ordinal = Number(
          nomination.tags
            .find((tag) => tag.startsWith("seat:"))!
            .slice("seat:".length),
        );
        const input: ChamberNominationVoteInput = {
          kind: "nomination",
          nominationKind: "clemency-board",
          stableKey: `${nomination.stableKey}:fixture-binding`,
          nominationEventId: nomination.id,
          nomineeId: candidate!,
          appointerId: office!.holderPersonId,
          jurisdictionId: office!.jurisdictionId,
          boardKey,
          seatOrdinal: ordinal,
          officeKey: `${boardKey}:seat:${ordinal}`,
          members: [
            {
              memberKey: "fixture:supplied-member",
              personId: voterId,
              name: "Supplied binding fixture member",
              partyKey: null,
              caucusLabel: "Fixture",
            },
          ],
          considerationsByMember: new Map(),
        };
        const votes = decideChamberVote(prepared, input);
        expect(votes).toEqual([
          {
            memberKey: "fixture:supplied-member",
            personId: voterId,
            disposition: "present-not-voting",
            reason: "member:no-reason",
          },
        ]);
        expect(decideChamberVote(prepared, input)).toEqual(votes);
        expect(
          decideChamberVote(deserializeWorld(serializeWorld(prepared)), input),
        ).toEqual(votes);
        // Authored test consideration, not a production weight or saved vote.
        const withReason: ChamberNominationVoteInput = {
          ...input,
          considerationsByMember: new Map([
            [
              "fixture:supplied-member",
              [
                {
                  stableKey: "fixture:explicit-member-reason",
                  optionKey: "vote-yea",
                  sourceType: "context:test",
                  direction: "supports",
                  importance: "strong",
                  confidence: "high",
                  explanation:
                    "Authored binding test only: this supplied member supports the actual nominee.",
                  sourceRefs: [],
                },
              ],
            ],
          ]),
        };
        const decided = decideChamberVote(prepared, withReason);
        expect(decided[0]!.disposition).toBe("yea");
        expect(
          decideChamberVote(
            deserializeWorld(serializeWorld(prepared)),
            withReason,
          ),
        ).toEqual(decided);
        expect(() =>
          decideChamberVote(prepared, { ...input, appointerId: voterId }),
        ).toThrow("actual dated nomination");
        expect(() =>
          decideChamberVote(prepared, { ...input, nomineeId: voterId }),
        ).toThrow("actual dated nomination");
        expect(() =>
          decideChamberVote(prepared, { ...input, seatOrdinal: ordinal + 1 }),
        ).toThrow("actual dated nomination");
        expect(() =>
          decideChamberVote(prepared, {
            ...input,
            jurisdictionId: prepared.jurisdictionOrder.find(
              (id) => id !== office!.jurisdictionId,
            )!,
          }),
        ).toThrow("actual dated nomination");
        expect(
          prepared.history.events.filter(
            (event) => event.type === "governing.supreme-court-nominated",
          ),
        ).toHaveLength(0);
      }
      // Superseding CTO08:06: actual appointees serve while confirmation is unwired.
      // This membership is not a successful chamber confirmation.
      const members = prepared.history.organizationParticipations.filter(
        (row) => row.kind === "membership:clemency-board",
      );
      expect(members).toHaveLength(nominations.length);
      for (const member of members) {
        expect(member.personId).toBe(candidate);
        expect(member.provenance.kind).toBe("simulated-event");
        if (member.provenance.kind !== "simulated-event")
          throw new Error("Actual saved appointment provenance required");
        const appointmentEventId = member.provenance.eventId;
        const appointed = prepared.history.events.find(
          (event) => event.id === appointmentEventId,
        );
        expect(appointed?.type).toBe(CLEMENCY_BOARD_APPOINTED);
        expect(appointed?.tags).toContain(
          "appointment-status:serving-pending-confirmation",
        );
        expect(appointed?.tags).toContain(`nomination:${nominations[0]!.id}`);
        expect(
          prepared.history.organizationParticipationStates.find(
            (state) => state.participationId === member.id,
          )?.status,
        ).toBe("active");
      }
      expect(ensureOpeningClemencyBoardAppointments(prepared)).toBe(prepared);
      const restored = deserializeWorld(serializeWorld(prepared));
      assertWorldIntegrity(restored);
      expect(ensureOpeningClemencyBoardAppointments(restored)).toBe(restored);
      expect(
        restored.history.events.filter(
          (event) => event.type === CLEMENCY_BOARD_NOMINATED,
        ),
      ).toEqual(nominations);
      expect(restored.history.organizationParticipations).toEqual(
        prepared.history.organizationParticipations,
      );
    },
    30_000,
  );

  it.todo(
    "builds complete board/candidate and current-world peer rule consumers, then proves original positive clemency fixtures; no static fallback or invented confirmation",
  );
});
