import { personName } from "../../simulation/people";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import * as native from "../../simulation/legislation";
import { US_CONGRESS_RULE_PACK } from "../../simulation/congress-rule-pack";
import { seatedCongressChamber } from "../../simulation/governing/congress-chambers";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../../simulation/national-election-geography";
import { legislatureForState } from "../../simulation/legislature-game-profile";
import {
  legislativeBlueprintForMeasure,
  measureStepOwner as nativeOwner,
  measureSessionIsClosed,
  applyInstitutionStep as nativeStep,
  pendingChamberQuestions as nativePending,
} from "../../simulation/governing/legislative-clock";
import { legislativeProcedureForJurisdiction } from "../../simulation/legislative-procedure-world";
import {
  sessionLegalLimit as nativeLimit,
  sessionClosesOn as nativeCloses,
} from "../../simulation/governing/session-adjournments";
import {
  stateSessionEndEstimate,
  stateSessionEnds,
} from "../../simulation/governing/statute-effective-date";
import { LEGISLATIVE_SESSION_CALENDARS } from "../../simulation/legislative-session-calendar-data";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import sessions from "../../../data/research/laws/state-session-calendars-2026.json";
import { scheduleGoverningSeasons as nativeSeasons } from "../../simulation/governing/governing-calendar";
import { scheduleGoverningSeasons } from "./governing-calendar";
import {
  measurePosition,
  availableMeasureSteps,
  replayMeasure,
  type MeasureReplayFacts,
} from "./measure-replay";
import { takeFloorVote } from "./floor-vote-admission";
import {
  applyInstitutionStep,
  type InstitutionDriverFacts,
} from "./institution-driver";
import {
  pendingChamberQuestions,
  type MemberNoticeFacts,
} from "./member-notices";
import {
  measureStepOwner,
  measureSessionClosedOn,
  type InstitutionFacts,
} from "./institution-context";
import {
  sessionClosesOn,
  sessionLegalLimit,
  type SessionClosureFacts,
} from "./session-closure";
import { sessionStatus } from "./session-status";
import { addDays } from "../../simulation/dates";
import type { World } from "../../simulation/types";
function outcome(call: () => unknown) {
  try {
    return { value: call() };
  } catch (error) {
    return { name: (error as Error).name, message: (error as Error).message };
  }
}
function closure(
  world: World,
  place: string,
  year: number,
): SessionClosureFacts {
  return {
    adjournments: world.history.sessionAdjournments ?? [],
    estimates: new Map([
      [`US-${place}:${year}`, stateSessionEndEstimate(`US-${place}`, year)],
    ]),
    sessionEnds: new Map([
      [`US-${place}:${year}`, stateSessionEnds(`US-${place}`, year)],
    ]),
  };
}
describe("legislatures: native procedure writers and calendars in all generated places", () => {
  it.each(Object.keys(STATES))(
    "matches procedure replay, floor admission and seasonal due records in %s",
    (place) => {
      let world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-leg-procedure:${place}`,
        offices: ["congress", "state-legislature"],
      }).world;
      const jurisdiction = stateJurisdictionForKey(`US-${place}`)!;
      const pack = legislatureForState(`US-${place}`);
      if (pack)
        for (const year of [2025, 2026, 2027]) {
          const facts = closure(world, place, year);
          expect(sessionLegalLimit(pack, year, facts)).toEqual(
            nativeLimit(pack, year),
          );
          expect(sessionClosesOn(facts, pack, year)).toEqual(
            nativeCloses(world, pack, year),
          );
        }
      for (const date of [
        world.currentDate,
        addDays(world.currentDate, 40),
        addDays(world.currentDate, 400),
      ]) {
        const at = {
          ...world,
          currentDate: date,
          currentMoment: { ...world.currentMoment, date },
        };
        const start = at.history.futureDueItems.length;
        const old = nativeSeasons(
          at,
          `state-executive:${place}`,
          jurisdiction.id,
        );
        const actual = scheduleGoverningSeasons(
          {
            onDate: date,
            stateKey: `US-${place}`,
            sessions: sessions.regularSessions,
            recordedYear: Number(sessions.asOf.slice(0, 4)),
            entry: legislativeProcedureForJurisdiction(at, jurisdiction.id),
            defaultCalendar: LEGISLATIVE_SESSION_CALENDARS.state,
            municipalReading: null,
            existingDueKeys: new Set(
              at.history.futureDueItems.map((row) => row.stableKey),
            ),
          },
          `state-executive:${place}`,
          jurisdiction.id,
        );
        expect(actual).toEqual(
          old.history.futureDueItems
            .slice(start)
            .map(
              ({
                stableKey,
                dueAt,
                transitionKey,
                entityIds,
                jurisdictionId,
                provenance,
              }) => ({
                stableKey,
                dueAt,
                transitionKey,
                entityIds,
                jurisdictionId,
                provenance,
              }),
            ),
        );
      }
      const body = seatedCongressChamber(world, "house")!.body;
      const sponsor = body.members.find(
        (row) => row.personId !== null,
      )!.personId!;
      world = { ...world, control: { kind: "person", personId: sponsor } };
      world = native.introduceMeasure(
        ensureNationalElectionJurisdiction(world),
        {
          stableKey: `rules2:${place}:bill`,
          jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          rulePackId: US_CONGRESS_RULE_PACK.packId,
          designation: "H.R. 1",
          shortTitle: "Golden admission bill",
          summary: "A fixture bill for equivalence checks.",
          origin: "member-introduction",
          subjectClass: "general-policy",
          sponsorPersonId: sponsor,
          originChamberKey: "house",
        },
      );
      const measure = world.history.legislativeMeasures!.at(-1)!;
      const facts = (at: World): MeasureReplayFacts => ({
        onDate: at.currentDate,
        measure,
        pack: US_CONGRESS_RULE_PACK,
        actions: at.history.legislativeActions ?? [],
        hasStartingProcedure:
          legislativeProcedureForJurisdiction(at, measure.jurisdictionId) !==
          null,
      });
      const compare = (at: World) => {
        expect(measurePosition(facts(at), measure.id)).toEqual(
          native.measurePosition(at, measure.id),
        );
        expect(availableMeasureSteps(facts(at), measure.id)).toEqual(
          native.availableMeasureSteps(at, measure.id),
        );
        expect(replayMeasure(facts(at), measure.id)).toEqual(
          native.replayMeasure(at, measure.id),
        );
        const full: InstitutionFacts = {
          ...facts(at),
          ...closure(at, place, Number(at.currentDate.slice(0, 4))),
          starting: legislativeProcedureForJurisdiction(
            at,
            measure.jurisdictionId,
          ),
          isCongress: true,
          playerPersonId: sponsor,
          blueprint: legislativeBlueprintForMeasure(at, measure),
          measures: at.history.legislativeMeasures ?? [],
          seated: new Map(
            US_CONGRESS_RULE_PACK.chambers.map((row) => [
              row.chamberKey,
              seatedCongressChamber(at, row.chamberKey),
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
        };
        expect(measureStepOwner(full, measure.id, "house")).toEqual(
          nativeOwner(at, measure.id, "house"),
        );
        expect(
          sessionStatus(
            at.currentDate,
            measureSessionClosedOn(full, measure, US_CONGRESS_RULE_PACK),
            measure,
            US_CONGRESS_RULE_PACK,
            native.measurePosition(at, measure.id).phase,
          ),
        ).toEqual(measureSessionIsClosed(at, measure.id));
        const notices: MemberNoticeFacts = {
          ...full,
          currentMoment: at.currentMoment,
          dueItems: at.history.futureDueItems,
          dueStatuses: new Map(),
          ballots: new Map(),
          activityStableKeys: new Set(),
          intervals: [],
          notices: new Map(),
        };
        expect(pendingChamberQuestions(notices, measure.id)).toEqual(
          nativePending(at, measure.id),
        );
        return full;
      };
      compare(world);
      const committee = US_CONGRESS_RULE_PACK.chambers[0]!.committees[0]!;
      world = native.referMeasure(world, {
        stableKey: `rules2:${place}:ref`,
        measureId: measure.id,
        committeeKey: committee.committeeKey,
      });
      compare(world);
      const disposition = (members: typeof body.members, absent = false) =>
        members.map((row, index) => ({
          memberKey: row.memberKey,
          personId: row.personId,
          disposition:
            absent && index > 0 ? ("absent" as const) : ("yea" as const),
        }));
      world = native.recordCommitteeDisposition(world, {
        stableKey: `rules2:${place}:committee`,
        measureId: measure.id,
        recommendation: "favorable",
        dispositions: disposition(
          body.members.slice(0, committee.appointedMembers),
        ),
        rationale: "Fixture committee supports the bill.",
        provenance: {
          method: "authored-fixture",
          note: "Golden fixture",
          sourceEntityIds: [],
        },
      });
      compare(world);
      world = native.placeMeasureOnCalendar(world, {
        stableKey: `rules2:${place}:calendar`,
        measureId: measure.id,
      });
      compare(world);
      for (const absent of [false, true]) {
        const input: native.FloorVoteInput = {
          stableKey: `rules2:${place}:floor:${absent}`,
          measureId: measure.id,
          dispositions: disposition(body.members, absent),
          presentMembers: absent ? 1 : body.members.length,
          electedMembers: body.members.length,
          provenance: {
            method: "authored-fixture",
            note: "Golden fixture",
            sourceEntityIds: [],
          },
        };
        const old = outcome(() => native.takeFloorVote(world, input));
        if ("value" in old) {
          const after = old.value as World;
          const action = after.history.legislativeActions!.at(-1)!;
          const vote = after.history.legislativeVotes!.at(-1)!;
          const actual = takeFloorVote(
            {
              ...facts(world),
              personIds: new Set(world.personOrder),
              recordId: vote.id,
              nextSequence: vote.sequence,
            },
            input,
          );
          expect(actual.vote).toEqual(vote);
          // This golden covers the early recorded-floor branch: later-stage actor receipts
          // and local fiscal inputs are deliberately absent, rather than invented outputs.
          const admitted = {
            ...compare(world),
            personIds: new Set(world.personOrder),
            recordId: vote.id,
            nextSequence: vote.sequence,
          } as unknown as InstitutionDriverFacts;
          const supplied = {
            ...input,
            seatedMemberPersonIds: body.members.flatMap((row) =>
              row.personId ? [row.personId] : [],
            ),
          };
          const oldStep = nativeStep(world, measure.id, (at) => at, {
            recordedFloorVote: supplied,
          });
          const plan = applyInstitutionStep(admitted, measure.id, {
            recordedFloorVote: supplied,
          });
          expect(plan.kind).toBe(oldStep.kind);
          if (plan.kind === "applied" && oldStep.kind === "applied") {
            expect(plan.step).toBe(oldStep.step);
            const command = plan.commands![0]!;
            expect(command.command).toBe("appendLegislativeAction");
            if (command.command === "appendLegislativeAction")
              expect(
                (command.input as ReturnType<typeof takeFloorVote>).vote,
              ).toEqual(oldStep.world.history.legislativeVotes!.at(-1));
          }
          for (const dispositions of [
            [...supplied.dispositions, supplied.dispositions[0]!],
            supplied.dispositions.map((row) => ({
              ...row,
              personId: measure.id,
            })),
          ]) {
            const edge = { ...supplied, dispositions };
            const nativeResult = nativeStep(world, measure.id, (at) => at, {
              recordedFloorVote: edge,
            });
            const actualResult = applyInstitutionStep(admitted, measure.id, {
              recordedFloorVote: edge,
            });
            expect(actualResult).toEqual(nativeResult);
          }
          expect(actual.kind).toBe(action.kind);
          expect(actual.floorStageKey).toBe(action.floorStageKey);
          compare(after);
        } else
          expect(
            outcome(() =>
              takeFloorVote(
                {
                  ...facts(world),
                  personIds: new Set(world.personOrder),
                  recordId: measure.id,
                  nextSequence: world.history.nextSequence,
                },
                input,
              ),
            ),
          ).toEqual(old);
      }
    },
    30000,
  );
});
