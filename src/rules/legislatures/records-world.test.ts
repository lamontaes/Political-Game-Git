import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { recordWorldEvent } from "../../simulation/world";
import { introduceMeasure } from "../../simulation/legislation";
import { recordLegislativeCommitment } from "../../simulation/legislative-politics";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../../simulation/national-election-geography";
import { US_CONGRESS_RULE_PACK } from "../../simulation/congress-rule-pack";
import { bargainingMannerFromRecord as nativeManner } from "../../simulation/legislature-manner";
import { bargainingMannerFromRecord } from "./bargaining-manner";
import { recordEventKnowledge } from "../../simulation/records";
import { recordLifeCommitment } from "../../simulation/life";
import { heardViewsHeldBy as nativeHeard } from "../../simulation/heard-official-views";
import {
  assessUndertaking,
  undertakingForLifeCommitment,
} from "../../simulation/undertakings";
import {
  createScheduledActivity,
  cancelScheduledActivity,
  scheduledActivityState,
} from "../../simulation/time-work";
import { addSimulationMinutes, addDays } from "../../simulation/dates";
import { unpackRollCalls } from "../../simulation/roll-call-packing";
import {
  municipalOrganizationFor,
  municipalSeats as nativeSeats,
  municipalStanding,
} from "../../simulation/municipal-public-work";
import { municipalGovernments } from "../../simulation/municipal-government";
import { heardViewsHeldBy } from "./heard-views";
import { assessLifeUndertaking, type UndertakingFacts } from "./undertakings";
import { unpackVote } from "./roll-call-decoding";
import {
  municipalSeats,
  municipalIntroductionRoles,
} from "./municipal-membership";
import type { World, LegislativeVoteRecord } from "../../simulation/types";
function outcome(call: () => unknown) {
  try {
    return { value: call() };
  } catch (error) {
    return { name: (error as Error).name, message: (error as Error).message };
  }
}
function facts(world: World): UndertakingFacts {
  return {
    onDate: world.currentDate,
    currentMoment: world.currentMoment,
    deaths: world.history.personDeaths,
    activities: world.history.scheduledActivities,
    activityStates: new Map(
      world.history.scheduledActivities.map((row) => [
        row.id,
        scheduledActivityState(world, row.id),
      ]),
    ),
    events: world.history.events,
    favors: world.history.favors ?? [],
    votes: world.history.legislativeVotes ?? [],
    amendments: world.history.legislativeAmendments ?? [],
    provisions: world.history.legislativeProvisions ?? [],
  };
}
describe("legislatures: native record readers in generated worlds", () => {
  it.each(Object.keys(STATES))(
    "matches heard views, undertaking assessments, membership and roll-call decoding in %s",
    (place) => {
      let world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-leg-records:${place}`,
        offices: ["congress"],
      }).world;
      const [listener, holder, official] = world.personOrder;
      if (!listener || !holder || !official) throw Error("Missing people");
      world = recordWorldEvent(world, {
        stableKey: `rules2:${place}:statement`,
        type: "life.conversation",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [listener, holder],
        participants: [
          { personId: holder, role: "agency:actor", detail: null },
          { personId: listener, role: "presence:participant", detail: null },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: [],
        summary: "Authored statement edge.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const event = world.history.events.at(-1)!;
      world = introduceMeasure(ensureNationalElectionJurisdiction(world), {
        stableKey: `rules2:${place}:commitment-measure`,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        rulePackId: US_CONGRESS_RULE_PACK.packId,
        designation: "H.R. 901",
        shortTitle: "Authored commitment control",
        summary: "Record-reader edge.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        sponsorPersonId: holder,
        originChamberKey: "house",
        propositionIds: [],
      });
      const commitmentMeasure = world.history.legislativeMeasures!.at(-1)!;
      for (const [index, firmness] of [
        "explicit",
        "provisional",
        "explicit",
        "qualified",
      ].entries()) {
        world = recordWorldEvent(world, {
          stableKey: `rules2:${place}:commitment-occasion:${index}`,
          type: "life.conversation",
          occurredAt: world.currentDate,
          recordedAt: world.currentDate,
          jurisdictionId: null,
          involvedEntityIds: [holder, listener],
          participants: [
            { personId: holder, role: "agency:actor", detail: null },
          ],
          personFactConstraints: [],
          visibility: "private",
          tags: [],
          summary: "Authored commitment occasion.",
          context: {
            location: null,
            socialContext: null,
            pressure: null,
            choice: null,
            motivation: null,
            immediateReaction: null,
          },
        });
        world = recordLegislativeCommitment(world, {
          stableKey: `rules2:${place}:legislative-promise:${index}`,
          holderPersonId: holder,
          subject: {
            question: {
              measureId: commitmentMeasure.id,
              purpose: "floor-stage",
              forumKey: "house",
              floorStageKey: "passage",
              amendmentStableKey: null,
              provisionKey: null,
            },
            questionLabel: "Authored passage control",
          },
          stance: "support",
          firmness: firmness as "explicit" | "provisional" | "qualified",
          audience: "private",
          eventId: world.history.events.at(-1)!.id,
          heardByPersonIds: [listener],
          statement: "Authored commitment.",
        });
        expect(
          bargainingMannerFromRecord(
            world.history.legislativeCommitments ?? [],
            holder,
          ),
        ).toEqual(nativeManner(world, holder));
      }
      for (const [index, position] of [
        "support",
        "oppose",
        "abstain",
      ].entries())
        world = recordEventKnowledge(world, {
          stableKey: `rules2:${place}:heard:${index}`,
          personId: listener,
          eventId: event.id,
          learnedAt: world.currentDate,
          believedSummary: `told-view:${holder}:${official}:${position}`,
          accuracy: "accurate",
          confidence: "medium",
          source: { kind: "told-by", sourcePersonId: holder, claimId: null },
        });
      for (const cutoff of [
        world.history.nextSequence,
        world.history.nextSequence - 1,
      ]) {
        const at = {
          ...world,
          history: { ...world.history, nextSequence: cutoff },
        };
        expect(
          heardViewsHeldBy(
            {
              people: at.people,
              events: at.history.events,
              knowledge: at.history.knowledge,
              nextSequence: at.history.nextSequence,
              onDate: at.currentDate,
            },
            listener,
            holder,
          ),
        ).toEqual(nativeHeard(at, listener, holder));
      }
      world = recordLifeCommitment(world, {
        stableKey: `rules2:${place}:promise`,
        personId: holder,
        startsAt: world.currentDate,
        endsAt: null,
        kind: "civic:undertaking-test",
        label: "the meeting",
        timeDemand: {
          expectedWeekly: { minimumHours: 0, maximumHours: 1 },
          attention: "low",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "interruptible",
          locationJurisdictionId: null,
        },
        provenance: { kind: "simulated-event", eventId: event.id },
        undertaking: {
          owedToPersonIds: [listener],
          act: {
            kind: "attend",
            activityStableKey: `rules2:${place}:meeting`,
            description: "the posted meeting",
          },
          firmness: "explicit",
          audience: "private",
          heardByPersonIds: [listener],
          statement: "Said they would attend.",
          claimId: null,
          mattered: "slight",
          dueBy: null,
        },
      });
      const record = world.history.lifeCommitments.at(-1)!,
        undertaking = undertakingForLifeCommitment(world, record.id)!;
      const compare = (at: World) =>
        expect(assessLifeUndertaking(facts(at), record, undertaking)).toEqual(
          assessUndertaking(at, undertaking),
        );
      compare(world);
      world = createScheduledActivity(world, {
        stableKey: `rules2:${place}:meeting`,
        title: "Posted meeting",
        summary: "Authored meeting edge.",
        kind: "confirmed",
        start: addSimulationMinutes(world.currentMoment, 60),
        end: addSimulationMinutes(world.currentMoment, 120),
        participantPersonIds: [holder],
        responsiblePersonId: holder,
        location: {
          locationKey: "fixture:room",
          label: "Community room",
          jurisdictionId: null,
        },
        sourceEntityIds: [holder],
        flexibility: { kind: "fixed" },
        access: { kind: "private", personIds: [holder] },
      });
      compare(world);
      const activity = world.history.scheduledActivities.at(-1)!;
      compare({
        ...world,
        currentMoment: addSimulationMinutes(world.currentMoment, 180),
      });
      compare(cancelScheduledActivity(world, activity.id));
      compare({
        ...world,
        history: {
          ...world.history,
          personDeaths: [
            ...world.history.personDeaths,
            {
              personId: holder,
              diedAt: addDays(world.currentDate, 10),
            } as World["history"]["personDeaths"][number],
          ],
        },
      });
      const government = municipalGovernments().find(
        (row) => row.state === place,
      );
      if (government) {
        const raw = {
          onDate: world.currentDate,
          nextSequence: world.history.nextSequence,
          organization: municipalOrganizationFor(world, government.key),
          participations: world.history.organizationParticipations,
          states: world.history.organizationParticipationStates,
        };
        expect(municipalSeats(raw, government.key)).toEqual(
          nativeSeats(world, government.key),
        );
        for (const personId of world.personOrder.slice(0, 4))
          expect(municipalIntroductionRoles(raw, personId)).toEqual(
            municipalStanding(world, {
              governmentKey: government.key,
              personId,
              residentPlaceGeoid: null,
            }).roles,
          );
      }
      // Labeled serialization edges reach unpackVote through the unchanged public decoder.
      const packing = {
        rosters: [["seat:one", holder, "seat:two", listener]],
        reasons: ["Recorded reason"],
      };
      for (const slot of [
        { roster: 0, dispositions: "yn", reasons: [0, -1] },
        null,
        { roster: 1, dispositions: "yn", reasons: [0, -1] },
        { roster: 0, dispositions: "xn", reasons: [0, -1] },
        { roster: 0, dispositions: "yn", reasons: [9, -1] },
        { roster: 0, dispositions: "y", reasons: [0] },
      ]) {
        const edge = {
          ...world,
          history: {
            ...world.history,
            legislativeVotes: [
              { dispositions: slot } as unknown as LegislativeVoteRecord,
            ],
          },
        };
        const native = outcome(
          () =>
            unpackRollCalls(edge, packing).history.legislativeVotes![0]!
              .dispositions,
        );
        expect(outcome(() => unpackVote(slot, packing))).toEqual(native);
      }
    },
    30000,
  );
});
