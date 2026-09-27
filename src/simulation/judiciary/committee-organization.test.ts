import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { simulationMomentAtLocalTime } from "../dates";
import { seatedCongressChamber } from "../governing/congress-chambers";
import { congressSeats, seatTermWindow } from "../living-world/congress-seats";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createScheduledActivity } from "../time-work";
import { recordWorldEvent } from "../world";
import {
  organizeSenateJudiciary,
  SENATE_JUDICIARY_APPOINTMENT_EVENT,
  SENATE_JUDICIARY_ORGANIZATION_VOTE_EVENT,
  SENATE_JUDICIARY_ORGANIZATION_SITTING_EVENT,
  senateJudiciaryAppointment,
} from "./committee-organization";

function openingWorld() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "judicial-federal-nomination",
      startAge: 40,
    }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

describe("saved fictional Senate Judiciary organization", () => {
  it("requires an actual Senate vote before appointing a chair and survives reload", () => {
    const world = openingWorld();
    expect(senateJudiciaryAppointment(world)).toBeNull();
    const organized = organizeSenateJudiciary(world);
    const vote = organized.history.events.findLast(
      (event) => event.type === SENATE_JUDICIARY_ORGANIZATION_VOTE_EVENT,
    );
    expect(vote).toBeDefined();
    expect(vote?.tags).toContain("result:adopted");
    const appointment = senateJudiciaryAppointment(organized);
    expect(appointment).not.toBeNull();
    expect(appointment?.memberPersonIds).toContain(appointment?.chairPersonId);
    expect(
      organized.history.events.findLast(
        (event) => event.type === SENATE_JUDICIARY_APPOINTMENT_EVENT,
      )?.tags,
    ).toContain(`vote:${vote!.id}`);
    expect(
      organized.history.decisionTraces.filter(
        (trace) =>
          trace.context.decisionType ===
          "judiciary.senate-organization-attendance",
      ),
    ).toHaveLength(seatedCongressChamber(world, "senate")!.body.members.length);
    const sitting = organized.history.events.findLast(
      (event) => event.type === SENATE_JUDICIARY_ORGANIZATION_SITTING_EVENT,
    )!;
    expect(
      organized.history.decisionTraces.filter(
        (trace) =>
          trace.context.decisionType ===
          "judiciary.senate-committee-organization-ballot",
      ),
    ).toHaveLength(
      sitting.participants.filter(
        (participant) => participant.role === "presence:participant",
      ).length,
    );
    const reloaded = deserializeWorld(serializeWorld(organized));
    expect(senateJudiciaryAppointment(reloaded)).toEqual(appointment);
    expect(organizeSenateJudiciary(reloaded)).toBe(reloaded);
  }, 20_000);

  it("rejects a resolution when saved schedule conflicts leave no Senate quorum", () => {
    const world = openingWorld();
    expect(world.currentMoment.minuteOfDay).toBeLessThan(10 * 60);
    const sourced = recordWorldEvent(world, {
      stableKey: "fixture:senate-organization-conflict-source",
      type: "fixture.organization-conflict-source",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [world.id],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["fixture:scheduled-conflict"],
      summary: "A fixture source records overlapping obligations.",
      context: {
        location: null,
        socialContext: "Schedule conflict fixture",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const meetingTime = (minuteOfDay: number) =>
      simulationMomentAtLocalTime({
        date: sourced.currentDate,
        minuteOfDay,
        timeZone: sourced.currentMoment.timeZone,
        preferredUtcOffsetMinutes: sourced.currentMoment.utcOffsetMinutes,
      });
    const conflicted = createScheduledActivity(sourced, {
      stableKey: "fixture:senate-organization-conflict",
      title: "Conflicting obligation",
      summary: "A saved obligation prevents these Senators from attending.",
      kind: "confirmed",
      start: meetingTime(10 * 60),
      end: meetingTime(11 * 60),
      participantPersonIds: seatedCongressChamber(world, "senate")!
        .body.members.slice(0, 70)
        .map((member) => member.personId!),
      responsiblePersonId: null,
      location: {
        locationKey: "fixture:senate-conflict",
        label: "Conflicting venue",
        jurisdictionId: null,
      },
      sourceEntityIds: [sourced.history.events.at(-1)!.id],
      flexibility: { kind: "fixed" },
      access: { kind: "office" },
    });
    const considered = organizeSenateJudiciary(conflicted);
    expect(senateJudiciaryAppointment(considered)).toBeNull();
    const vote = considered.history.events.findLast(
      (event) => event.type === SENATE_JUDICIARY_ORGANIZATION_VOTE_EVENT,
    )!;
    expect(vote.tags).toContain("result:rejected");
    const sitting = considered.history.events.findLast(
      (event) => event.type === SENATE_JUDICIARY_ORGANIZATION_SITTING_EVENT,
    )!;
    expect(sitting.participants.length).toBeLessThanOrEqual(30);
    expect(
      senateJudiciaryAppointment(deserializeWorld(serializeWorld(considered))),
    ).toBeNull();
  }, 20_000);

  it("does not cast a controlled Senator's organizational ballot", () => {
    const world = openingWorld();
    const senatorId = seatedCongressChamber(world, "senate")!.body.members[0]!
      .personId!;
    const controlled = {
      ...world,
      control: { kind: "person" as const, personId: senatorId },
    };
    expect(() => organizeSenateJudiciary(controlled)).toThrow(
      "controlled Senator must cast their own",
    );
    expect(senateJudiciaryAppointment(controlled)).toBeNull();
  }, 20_000);

  it("does not treat an appointment-looking event without an adopted vote as authority", () => {
    const world = openingWorld();
    const chairId = seatedCongressChamber(world, "senate")!.body.members[0]!
      .personId!;
    const houseSeat = congressSeats().find(
      (seat) => seat.chamberKey === "us-house",
    )!;
    const term = seatTermWindow(houseSeat, world.currentDate).startsAt;
    const incomplete = recordWorldEvent(world, {
      stableKey: "fixture:incomplete-judiciary-appointment",
      type: SENATE_JUDICIARY_APPOINTMENT_EVENT,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [chairId],
      participants: [
        { personId: chairId, role: "focus:subject", detail: "Claimed chair" },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [`congress-start:${term}`, `chair:${chairId}`, `member:${chairId}`],
      summary: "An incomplete committee appointment claim was recorded.",
      context: {
        location: null,
        socialContext: "Incomplete committee record",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    expect(senateJudiciaryAppointment(incomplete)).toBeNull();
  }, 20_000);
});
