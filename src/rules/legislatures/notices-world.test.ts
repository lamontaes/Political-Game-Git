import { afterAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { legislatureForState } from "../../simulation/legislature-game-profile";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { personName } from "../../simulation/people";
import * as legislation from "../../simulation/legislation";
import { seatedChamberForPack } from "../../simulation/governing/chamber-votes";
import {
  legislativeBlueprintForMeasure,
  scheduleInstitutionStep,
  pendingChamberQuestions as nativeQuestions,
} from "../../simulation/governing/legislative-clock";
import {
  legislativeProcedureForJurisdiction,
  regularSessionYearForWorld,
} from "../../simulation/legislative-procedure-world";
import {
  stateSessionEndEstimate,
  stateSessionEnds,
} from "../../simulation/governing/statute-effective-date";
import { LEGISLATIVE_SESSION_CALENDARS } from "../../simulation/legislative-session-calendar-data";
import { futureDueItemStateAt } from "../../simulation/future-transitions";
import * as timeWork from "../../simulation/time-work";
import { memberBallotOn } from "../../simulation/governing/member-ballots";
import { addDays, makeIsoDate } from "../../simulation/dates";
import {
  simulationMomentAtLocalTime,
  addSimulationMinutes,
} from "../../simulation/dates";
import {
  chamberQuestionKey,
  noticeMemberVote,
  type MemberNoticeFacts,
} from "./member-notices";
import type { World } from "../../simulation/types";

describe("legislatures: member notice through the unchanged public scheduler", () => {
  let scheduled = 0;
  afterAll(() => expect(scheduled).toBeGreaterThan(0));
  it.each(Object.keys(STATES))(
    "matches scheduled intervals, collisions and duplicate guards in %s",
    (place) => {
      let world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-leg-notice:${place}`,
        offices: ["state-legislature"],
      }).world;
      const pack = legislatureForState(`US-${place}`);
      if (!pack) {
        // No invented legislature or source admission in unsupported native data.
        expect(world.history.legislativeMeasures ?? []).toHaveLength(0);
        return;
      }
      const jurisdiction = stateJurisdictionForKey(`US-${place}`)!;
      let sessionYear = Number(world.currentDate.slice(0, 4));
      while (!regularSessionYearForWorld(world, jurisdiction.id, sessionYear))
        sessionYear++;
      const sessionDate = makeIsoDate(`${sessionYear}-01-10`);
      world = {
        ...world,
        currentDate: sessionDate,
        currentMoment: { ...world.currentMoment, date: sessionDate },
      };
      const chamber = pack.chambers[0]!;
      const body = seatedChamberForPack(
        world,
        pack.packId,
        chamber.chamberKey,
        chamber.name,
      )!.body;
      const sponsor = body.members.find(
        (row) => row.personId !== null,
      )!.personId!;
      world = { ...world, control: { kind: "person", personId: sponsor } };
      world = legislation.introduceMeasure(world, {
        stableKey: `rules2:${place}:notice-bill`,
        jurisdictionId: jurisdiction.id,
        rulePackId: pack.packId,
        designation: "HB 1",
        shortTitle: "Authored notice edge",
        summary: "An authored floor calendar edge.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        sponsorPersonId: sponsor,
        originChamberKey: chamber.chamberKey,
      });
      const measure = world.history.legislativeMeasures!.at(-1)!;
      const committee = chamber.committees[0]!;
      if (committee) {
        world = legislation.referMeasure(world, {
          stableKey: `rules2:${place}:notice-referral`,
          measureId: measure.id,
          committeeKey: committee.committeeKey,
        });
        world = legislation.recordCommitteeDisposition(world, {
          stableKey: `rules2:${place}:notice-report`,
          measureId: measure.id,
          recommendation: "favorable",
          rationale: "Authored committee edge",
          dispositions: body.members
            .slice(0, committee.appointedMembers)
            .map((row) => ({
              memberKey: row.memberKey,
              personId: row.personId,
              disposition: "yea",
            })),
          provenance: {
            method: "authored-fixture",
            note: "Authored votes",
            sourceEntityIds: [],
          },
        });
      }
      if (
        legislation
          .availableMeasureSteps(world, measure.id)
          .includes("request-calendar-placement")
      ) {
        world = legislation.placeMeasureOnCalendar(world, {
          stableKey: `rules2:${place}:notice-calendar`,
          measureId: measure.id,
        });
      }
      const facts = (
        at: World,
        voteOn: World["currentDate"],
        texts: MemberNoticeFacts["notices"],
      ): MemberNoticeFacts => {
        const cutoff = {
          asOfDate: at.currentDate,
          historySequenceExclusive: at.history.nextSequence,
        };
        return {
          onDate: at.currentDate,
          currentMoment: at.currentMoment,
          measure,
          pack,
          actions: at.history.legislativeActions ?? [],
          hasStartingProcedure:
            legislativeProcedureForJurisdiction(at, jurisdiction.id) !== null,
          starting: legislativeProcedureForJurisdiction(at, jurisdiction.id),
          isCongress: false,
          playerPersonId: sponsor,
          blueprint: legislativeBlueprintForMeasure(at, measure),
          measures: at.history.legislativeMeasures ?? [],
          seated: new Map(
            pack.chambers.map((row) => [
              row.chamberKey,
              seatedChamberForPack(at, pack.packId, row.chamberKey, row.name),
            ]),
          ),
          people: new Map(
            at.personOrder.map((id) => [
              id,
              { id, name: personName(at.people[id]!) },
            ]),
          ),
          authoredCounts: {},
          chamberVotes: new Map(),
          playerBallots: new Map(),
          defaultCalendar: LEGISLATIVE_SESSION_CALENDARS.state,
          blockedKeys: [],
          adjournments: at.history.sessionAdjournments ?? [],
          estimates: new Map([
            [
              `${pack.jurisdictionKey}:${Number(at.currentDate.slice(0, 4))}`,
              stateSessionEndEstimate(
                pack.jurisdictionKey,
                Number(at.currentDate.slice(0, 4)),
              ),
            ],
          ]),
          sessionEnds: new Map([
            [
              `${pack.jurisdictionKey}:${Number(at.currentDate.slice(0, 4))}`,
              stateSessionEnds(
                pack.jurisdictionKey,
                Number(at.currentDate.slice(0, 4)),
              ),
            ],
          ]),
          dueItems: at.history.futureDueItems,
          dueStatuses: new Map(
            at.history.futureDueItems.flatMap((row) => {
              const state = futureDueItemStateAt(at, row.id, cutoff);
              return state ? [[row.id, state] as const] : [];
            }),
          ),
          ballots: new Map(
            nativeQuestions(at, measure.id, voteOn).map((row) => [
              chamberQuestionKey(row.question),
              memberBallotOn(at, sponsor, row.question),
            ]),
          ),
          activityStableKeys: new Set(
            at.history.scheduledActivities.map((row) => row.stableKey),
          ),
          intervals: at.history.scheduledActivities.map((row) => ({
            participantPersonIds: row.participantPersonIds,
            ...timeWork.scheduledActivityState(at, row.id),
          })),
          notices: texts,
        };
      };
      for (const collision of [false, true]) {
        const voteOn = addDays(world.currentDate, 5);
        let at = world;
        if (collision) {
          const start = simulationMomentAtLocalTime({
            date: addDays(voteOn, -1),
            minuteOfDay: 16 * 60,
            timeZone: at.currentMoment.timeZone,
            preferredUtcOffsetMinutes: at.currentMoment.utcOffsetMinutes,
          });
          at = timeWork.createScheduledActivity(at, {
            stableKey: `rules2:${place}:notice-collision`,
            title: "Authored occupied hour",
            summary: "Authored scheduling edge",
            kind: "confirmed",
            start,
            end: addSimulationMinutes(start, 60),
            participantPersonIds: [sponsor],
            responsiblePersonId: sponsor,
            location: {
              jurisdictionId: jurisdiction.id,
              label: "Authored room",
              locationKey: "fixture:collision",
            },
            sourceEntityIds: [measure.id],
            flexibility: { kind: "fixed" },
            access: { kind: "private", personIds: [sponsor] },
          });
        }
        const calls: timeWork.CreateScheduledActivityInput[] = [];
        const original = timeWork.createScheduledActivity;
        const capture = vi
          .spyOn(timeWork, "createScheduledActivity")
          .mockImplementation((before, input) => {
            calls.push(input);
            return original(before, input);
          });
        let after: World;
        try {
          after = scheduleInstitutionStep(at, measure.id, voteOn);
        } finally {
          capture.mockRestore();
        }
        const due = after!.history.futureDueItems.find(
          (row) =>
            row.transitionKey === "legislature:institution-step" &&
            row.entityIds.includes(measure.id) &&
            !at.history.futureDueItems.some((prior) => prior.id === row.id),
        );
        if (!due) {
          expect(calls).toHaveLength(0);
          continue;
        }
        const actualDate = due.dueAt;
        // Only English is supplied by the native realization boundary. The input
        // date, all intervals and collision arithmetic come from the pre-writer World.
        const texts = new Map(
          nativeQuestions(at, measure.id, actualDate).flatMap((forum) => {
            const call = calls.find((row) =>
              row.stableKey.includes(chamberQuestionKey(forum.question)),
            );
            return call
              ? [
                  [
                    chamberQuestionKey(forum.question),
                    { title: call.title, summary: call.summary },
                  ] as const,
                ]
              : [];
          }),
        );
        expect(
          noticeMemberVote(
            facts(at, actualDate, texts),
            measure.id,
            actualDate,
          ),
        ).toEqual(
          calls.map((input) => ({ command: "createScheduledActivity", input })),
        );
        if (calls.length) scheduled++;
        expect(
          noticeMemberVote(
            facts(after!, actualDate, texts),
            measure.id,
            actualDate,
          ),
        ).toEqual([]);
      }
    },
    30000,
  );
});
