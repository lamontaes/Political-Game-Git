import { personName } from "../../simulation/people";
import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import * as native from "../../simulation/legislation";
import { legislationEntityAvailableAt } from "./record-availability";
import { regularSessionYearForWorld } from "./session-rules";
import { regularSessionYearForWorld as nativeSessionYear } from "../../simulation/legislative-procedure-world";
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
import * as nativeVotes from "../../simulation/governing/chamber-votes";
import * as ownVotes from "./chamber-vote";
import { minorityPartyProcedureRows } from "../../simulation/minority-party-procedure";
import { currentMeasureProvisions } from "../../simulation/legislative-politics";
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
        for (const year of [2025, 2026, 2027, 2028])
          expect(
            regularSessionYearForWorld(
              legislativeProcedureForJurisdiction(at, measure.jurisdictionId),
              measure.jurisdictionId,
              year,
            ),
          ).toEqual(nativeSessionYear(at, measure.jurisdictionId, year));
        const records = [
          ...(at.history.legislativeMeasures ?? []),
          ...(at.history.legislativeActions ?? []),
          ...(at.history.legislativeVotes ?? []),
          ...(at.history.committeeReferrals ?? []),
          ...(at.history.committeeActions ?? []),
        ];
        for (const record of records)
          for (const cutoff of [record.sequence, at.history.nextSequence])
            expect(
              legislationEntityAvailableAt(
                record,
                record.id,
                at.currentDate,
                cutoff,
              ),
            ).toEqual(
              native.legislationEntityAvailableAt(
                at,
                record.id,
                at.currentDate,
                cutoff,
              ),
            );
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
      // Full default floor route: native preparation and both shared actor
      // evaluations run once, then their actual receipts enter the parent golden.
      // The child chamber kernel has its own independent native-caller goldens.
      const voteReceipts: {
        input: Parameters<typeof nativeVotes.decideChamberVote>[1];
        rows: ReturnType<typeof nativeVotes.decideChamberVote>;
      }[] = [];
      const attendance = new Map<
        string,
        ReturnType<typeof nativeVotes.decideQuorumAttendance>
      >();
      const floorCalls: {
        before: World;
        input: native.FloorVoteInput;
        after: World;
      }[] = [];
      const voteOriginal = nativeVotes.decideChamberVote;
      const attendanceOriginal = nativeVotes.decideQuorumAttendance;
      const floorOriginal = native.takeFloorVote;
      const voteCapture = vi
        .spyOn(nativeVotes, "decideChamberVote")
        .mockImplementation((at, input, options) => {
          const rows = voteOriginal(at, input, options);
          voteReceipts.push({ input, rows });
          return rows;
        });
      const attendanceCapture = vi
        .spyOn(nativeVotes, "decideQuorumAttendance")
        .mockImplementation((at, input) => {
          const rows = attendanceOriginal(at, input);
          attendance.set(input.stableKey, rows);
          return rows;
        });
      const floorCapture = vi
        .spyOn(native, "takeFloorVote")
        .mockImplementation((before, input) => {
          const after = floorOriginal(before, input);
          floorCalls.push({ before, input, after });
          return after;
        });
      let expectedStep: ReturnType<typeof nativeStep>;
      try {
        expectedStep = nativeStep(world, measure.id, (at) => at);
      } finally {
        voteCapture.mockRestore();
        attendanceCapture.mockRestore();
        floorCapture.mockRestore();
      }
      expect(expectedStep!.kind).toBe("applied");
      expect(floorCalls).toHaveLength(1);
      const call = floorCalls[0]!;
      const vote = call.after.history.legislativeVotes!.find(
        (row) => row.stableKey === `${call.input.stableKey}:vote`,
      )!;
      const full = compare(call.before);
      const driver: InstitutionDriverFacts = {
        ...full,
        personIds: new Set(call.before.personOrder),
        recordId: vote.id,
        nextSequence: vote.sequence,
        localUnit: null,
        localRules: null,
        localLawJurisdictionId: null,
        localWorkBinding: null,
        localOfficers: [],
        parties: new Map(
          call.before.personOrder.map((id) => [
            id,
            nativeVotes.publicPartyOf(call.before, id),
          ]),
        ),
        preparationDone: true,
        dueItems: call.before.history.futureDueItems,
        dueStatuses: new Map(),
        referralCommitteeKeys: new Map(
          (call.before.history.committeeReferrals ?? [])
            .filter((row) => row.measureId === measure.id)
            .map((row) => [row.chamberKey, row.committeeKey]),
        ),
        provisions: currentMeasureProvisions(call.before, measure.id),
        minorityProcedureRows: minorityPartyProcedureRows(full.pack),
        amendmentPreparationKeys: new Set(
          (call.before.history.legislativeAmendments ?? []).map(
            (row) => row.stableKey,
          ),
        ),
        // These dependencies cannot be reached by a nonlocal congressional floor
        // request. Absence is explicit; no authority/compiler receipt is invented.
        localFiscalFacts:
          undefined as unknown as InstitutionDriverFacts["localFiscalFacts"],
        amendmentFacts:
          undefined as unknown as InstitutionDriverFacts["amendmentFacts"],
        taxEnactmentFacts:
          undefined as unknown as InstitutionDriverFacts["taxEnactmentFacts"],
        councilVotes: null,
        localNonpartisan: false,
        attendance,
      };
      const prepare = applyInstitutionStep(
        { ...driver, preparationDone: false },
        measure.id,
      );
      expect(prepare.kind).toBe("prepare");
      expect(prepare.commands?.[0]).toEqual({
        command: "ensureOfficeholderPrinciples",
        input: {
          personIds: [...full.seated.values()].flatMap((row) =>
            row!.body.members.flatMap((member) =>
              member.personId ? [member.personId] : [],
            ),
          ),
        },
      });
      let receiptIndex = 0;
      const voteReplay = vi
        .spyOn(ownVotes, "decideChamberVote")
        .mockImplementation((_facts, input) => {
          const receipt = voteReceipts[receiptIndex++]!;
          expect(input).toEqual(receipt.input);
          return receipt.rows;
        });
      try {
        const plan = applyInstitutionStep(driver, measure.id);
        expect(plan.kind).toBe(expectedStep!.kind);
        if (plan.kind === "applied" && expectedStep!.kind === "applied") {
          expect(plan.step).toBe(expectedStep!.step);
          const action = call.after.history.legislativeActions!.at(-1)!;
          const event = call.after.history.events.find(
            (row) => row.id === action.eventId,
          )!;
          // The event writer canonicalizes tags; compare its persisted order on
          // both sides while retaining the kernel's native request order.
          expect(
            plan.commands?.map((command) => ({
              ...command,
              input: {
                ...(command.input as Record<string, unknown>),
                tags: [...(command.input as { tags: string[] }).tags].sort(),
              },
            })),
          ).toEqual([
            {
              command: "appendLegislativeAction",
              input: {
                measure,
                kind: action.kind,
                stableKey: action.stableKey,
                chamberKey: action.chamberKey,
                committeeKey: action.committeeKey,
                floorStageKey: action.floorStageKey,
                actorLabel: action.actorLabel,
                rationale: action.rationale,
                summary: event.summary,
                eventType: event.type,
                tags: event.tags.filter((tag) => tag !== "legislation"),
                vote,
              },
            },
          ]);
        }
        expect(receiptIndex).toBe(voteReceipts.length);
      } finally {
        voteReplay.mockRestore();
      }
    },
    30000,
  );
});
