import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { projectJudicialSelection } from "../../presentation/judicial-selection";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { currentPresidentOf } from "../crisis/offices";
import { createDemoWorld } from "../demo";
import { FEDERAL_TENURE_EVENT, currentFederalTenure } from "../federal-tenures";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { committeeRoster } from "../governing/committee-assignment";
import {
  nationalPartyKeys,
  seatedCongressChamber,
} from "../governing/congress-chambers";
import { createStableId } from "../ids";
import { LIFE_MIND_IDS } from "../life-mind-content";
import { createOrganization, createWorkRelationship } from "../life";
import {
  activeWorkRelationshipsAt,
  organizationProfileAt,
} from "../life-queries";
import { publicPartyAffiliation } from "../living-world/congress";
import { recordEventKnowledge } from "../records";
import { deserializeWorld, serializeWorld } from "../serialization";
import { makeIsoDate } from "../dates";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { resolveFutureDueItemsThrough } from "../future-transitions";
import { recordWorldEvent } from "../world";
import {
  addJudicialCourt,
  buildOpeningCourtCatalog,
  seatHolderAt,
  seatJudge,
  vacantSeatsAt,
} from "./courts";
import { recordFederalJudicialCandidateResponse } from "./candidate-interview";
import {
  federalJudicialSenateVoteStatus,
  JUDICIAL_CONFIRMATION_HEARING_EVENT,
  recordFederalJudicialSenateBallot,
  resolveFederalJudicialSenateVote,
} from "./federal-confirmation";
import { recordFederalJudicialHearing } from "./federal-hearing";
import { commissionConfirmedFederalJudge } from "./federal-judicial-commission";
import {
  judicialNominationRecommendation,
  recordNpcFederalJudicialSenateBallot,
} from "./nomination-reasoning";
import {
  openJudicialSelectionFromProfile,
  recordFederalJudicialNomination,
  judicialSelectionStages,
  resolveJudicialSelectionPlan,
} from "./selection";
import { judicialSeatId } from "./types";
import {
  JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
  JUDICIAL_COMMITTEE_NOTICE_EVENT,
  JUDICIAL_COMMITTEE_SESSION_TRANSITION,
  JUDICIAL_SENATE_REFERRAL_EVENT,
  judicialCommitteeConsiderationHandler,
} from "./senate-referral";
import {
  SENATE_JUDICIARY_APPOINTMENT_EVENT,
  senateJudiciaryAppointment,
} from "./committee-organization";
import { JUDICIAL_SENATE_REFERRAL_TRANSITION } from "./selection";
import {
  JUDICIAL_PUBLIC_HEARING_ATTENDANCE_EVENT,
  JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT,
  JUDICIAL_PUBLIC_HEARING_TRANSITION,
} from "./senate-hearing-process";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../types";

function pendingNomination() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "judicial-federal-nomination",
      startAge: 40,
    }),
  ).game!;
  let world = openOrdinaryLife(game.world, game.playerPersonId);
  const courtId = "fixture:hearing-district";
  const seatId = judicialSeatId(courtId, 1);
  world = addJudicialCourt(world, {
    courtId,
    jurisdictionId: null,
    name: "Fixture United States District Court",
    level: "federal-district",
    parentCourtId: null,
    sourceRecordId: "us-fed:general_trial",
    identityBasis: "sourced",
    createdAt: world.currentDate,
    rules: {
      authorizedSeats: {
        state: "known",
        value: 1,
        basis: "game-profile",
        referenceId: "fixture:size",
      },
      termYears: {
        state: "known",
        value: null,
        basis: "sourced",
        referenceId: "us-fed:general_trial",
      },
      mandatoryRetirementAge: { state: "unknown", reason: "fixture" },
      caseJurisdiction: { state: "unknown", reason: "fixture" },
      selectionRecordId: "us-fed:general_trial",
      amendmentRoute: { state: "unknown", reason: "fixture" },
    },
  });
  const presidentId = currentPresidentOf(world)!.personId;
  const nomineeId = world.personOrder.find(
    (personId) =>
      personId !== presidentId &&
      personId !== game.playerPersonId &&
      world.history.personalValues.some(
        (value) =>
          value.personId === personId &&
          value.valueId === LIFE_MIND_IDS.privacy &&
          value.orientation === "embraces",
      ),
  )!;
  world = openJudicialSelectionFromProfile(world, {
    seatId,
    kind: "new-seat",
    candidatePersonIds: [nomineeId],
  });
  const selectionRecordId = world.judiciary!.selections.at(-1)!.recordId;
  world = recordFederalJudicialCandidateResponse(world, {
    selectionRecordId,
    candidatePersonId: nomineeId,
  });
  world = recordFederalJudicialNomination(world, {
    selectionRecordId,
    presidentPersonId: presidentId,
    nomineePersonId: nomineeId,
  });
  return { world, selectionRecordId, seatId, nomineeId };
}

/** Test-only admission for ballot arithmetic; report business is tested separately. */
function withFixtureFloorAdmission(world: World, selectionRecordId: string) {
  const nomineeId = world.judiciary!.selections.find(
    (selection) => selection.recordId === selectionRecordId,
  )!.candidatePersonIds[0]!;
  const event = (
    current: World,
    type:
      | "judicial.committee-report-result"
      | "judicial.executive-calendar-admission"
      | "judicial.senate-floor-sitting",
    tags: readonly string[],
  ) =>
    recordWorldEvent(current, {
      stableKey: `fixture:${type}:${selectionRecordId}`,
      type,
      occurredAt: current.currentDate,
      recordedAt: current.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [nomineeId],
      participants: [
        {
          personId: nomineeId,
          role: "focus:subject",
          detail: "Fixture nominee",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [`selection:${selectionRecordId}`, ...tags],
      summary: `Fixture ${type} for isolated Senate ballot checks.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  let next = event(world, "judicial.committee-report-result", [
    "result:reported",
  ]);
  const reportId = next.history.events.at(-1)!.id;
  next = event(next, "judicial.executive-calendar-admission", [
    `report:${reportId}`,
  ]);
  const calendarId = next.history.events.at(-1)!.id;
  return event(next, "judicial.senate-floor-sitting", [
    `calendar:${calendarId}`,
  ]);
}

describe("judicial ballots across separate floor sittings", () => {
  let pending: ReturnType<typeof pendingNomination>;
  beforeAll(() => {
    pending = pendingNomination();
  });

  it("refuses an earlier sitting and counts only the current sitting's ballots", () => {
    const { selectionRecordId, nomineeId } = pending;
    let world = withFixtureFloorAdmission(pending.world, selectionRecordId);
    const firstSitting = world.history.events.at(-1)!;
    const calendarId = firstSitting.tags
      .find((tag) => tag.startsWith("calendar:"))!
      .slice("calendar:".length);
    const senate = seatedCongressChamber(world, "senate")!;
    const senator = senate.body.members.find((member) => member.personId)!;
    world = recordFederalJudicialSenateBallot(world, {
      selectionRecordId,
      senatorPersonId: senator.personId!,
      ballot: "absent",
      reason: "The Senator missed the first fixture sitting.",
      expectedSittingId: firstSitting.id,
    });
    world = recordWorldEvent(world, {
      stableKey: `fixture:judicial.senate-floor-sitting:${selectionRecordId}:retry`,
      type: "judicial.senate-floor-sitting",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [nomineeId, senator.personId!],
      participants: [
        {
          personId: senator.personId!,
          role: "presence:participant",
          detail: "Senator at second fixture sitting",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `selection:${selectionRecordId}`,
        `calendar:${calendarId}`,
        ...senate.body.members.flatMap((member) =>
          member.personId ? [`roster:${member.personId}`] : [],
        ),
        `attendee:${senator.personId}`,
      ],
      summary: "A second fixture Senate floor sitting began.",
      context: {
        location: null,
        socialContext: "Fixture judicial nomination floor sitting",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const secondSitting = world.history.events.at(-1)!;
    expect(
      federalJudicialSenateVoteStatus(world, selectionRecordId),
    ).toMatchObject({
      state: "unresolved",
      reason: `The Senate has unrecorded ballots, beginning with ${senator.name}.`,
    });
    expect(() =>
      recordFederalJudicialSenateBallot(world, {
        selectionRecordId,
        senatorPersonId: senator.personId!,
        ballot: "present-not-voting",
        reason: "A new sitting needs a new choice.",
        expectedSittingId: firstSitting.id,
      }),
    ).toThrow("earlier floor sitting");
    expect(() =>
      recordFederalJudicialSenateBallot(world, {
        selectionRecordId,
        senatorPersonId: senator.personId!,
        ballot: "absent",
        reason: "The Senator was actually present.",
        expectedSittingId: secondSitting.id,
      }),
    ).toThrow("match recorded sitting attendance");
    world = recordFederalJudicialSenateBallot(world, {
      selectionRecordId,
      senatorPersonId: senator.personId!,
      ballot: "present-not-voting",
      reason: "The Senator attended without taking a position.",
      expectedSittingId: secondSitting.id,
    });
    expect(world.history.events.at(-1)!.tags).toContain(
      `sitting:${secondSitting.id}`,
    );
    expect(
      world.history.events.filter(
        (event) =>
          event.type === "judicial.senate-ballot" &&
          event.tags.includes(`senator:${senator.personId}`),
      ),
    ).toHaveLength(2);
    expect(
      recordFederalJudicialSenateBallot(world, {
        selectionRecordId,
        senatorPersonId: senator.personId!,
        ballot: "present-not-voting",
        reason: "Duplicate second-sitting choice.",
        expectedSittingId: secondSitting.id,
      }),
    ).toBe(world);
    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      reopened.history.events.filter(
        (event) =>
          event.type === "judicial.senate-ballot" &&
          event.tags.includes(`senator:${senator.personId}`),
      ),
    ).toHaveLength(2);
  });
});

/** A test-only occurrence for direct hearing-writer and tenure assertions. */
function preparedHearingForAttendees(
  inputWorld: World,
  selectionRecordId: string,
  attendeeIds: readonly EntityId[],
) {
  const registry = createCampaignElectionTransitionRegistry();
  let world = inputWorld;
  for (const key of [
    JUDICIAL_SENATE_REFERRAL_TRANSITION,
    JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
    JUDICIAL_COMMITTEE_SESSION_TRANSITION,
  ]) {
    const due = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === key &&
        item.stableKey.endsWith(selectionRecordId),
    )!;
    world = resolveFutureDueItemsThrough(world, due.dueAt, registry);
  }
  const notice = world.history.events.findLast(
    (event) =>
      event.type === JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT &&
      event.tags.includes(`selection:${selectionRecordId}`),
  )!;
  const hearingDue = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === JUDICIAL_PUBLIC_HEARING_TRANSITION &&
      item.stableKey.endsWith(selectionRecordId),
  )!;
  const withoutAutomaticHearing: FutureTransitionHandlerRegistry = {
    ...registry,
    get: (key) =>
      key === JUDICIAL_PUBLIC_HEARING_TRANSITION
        ? (atDue) => ({
            world: atDue,
            status: "blocked",
            reasonKey: "fixture:direct-hearing-writer",
            context: "The fixture supplies named attendance separately.",
            outcomeEventId: null,
          })
        : registry.get(key),
  };
  world = resolveFutureDueItemsThrough(
    world,
    hearingDue.dueAt,
    withoutAutomaticHearing,
  );
  const appointment = senateJudiciaryAppointment(world)!;
  const nomineeId = world.judiciary!.selections.find(
    (selection) => selection.recordId === selectionRecordId,
  )!.candidatePersonIds[0]!;
  world = recordWorldEvent(world, {
    stableKey: `fixture:judicial-hearing-attendance:${selectionRecordId}`,
    type: JUDICIAL_PUBLIC_HEARING_ATTENDANCE_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [nomineeId, ...attendeeIds],
    participants: [
      { personId: nomineeId, role: "focus:actor", detail: "Fixture nominee" },
      ...attendeeIds.map((personId) => ({
        personId,
        role: "presence:participant" as const,
        detail: "Fixture Judiciary attendee",
      })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `selection:${selectionRecordId}`,
      `notice:${notice.id}`,
      `appointment:${appointment.eventId}`,
      "nominee:present",
      ...attendeeIds.map((id) => `attendee:${id}`),
    ],
    summary:
      "The fixture nominee and named Judiciary Senators attended the hearing.",
    context: {
      location: null,
      socialContext: "Fixture judicial hearing attendance",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return {
    world,
    noticeEventId: notice.id,
    attendanceEventId: world.history.events.at(-1)!.id,
  };
}

describe("federal judicial hearing and Senate ballot", () => {
  it("refers a saved nomination, appoints Judiciary by Senate vote, and notices consideration", () => {
    const pending = pendingNomination();
    const referralDue = pending.world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === JUDICIAL_SENATE_REFERRAL_TRANSITION &&
        item.stableKey.endsWith(pending.selectionRecordId),
    )!;
    expect(referralDue.dueAt > pending.world.currentDate).toBe(true);
    expect(
      projectJudicialSelection(pending.world, pending.seatId)?.senateStatus,
    ).toContain("referral is scheduled");
    const registry = createCampaignElectionTransitionRegistry();
    expect(registry.get(referralDue.transitionKey)).toBeTypeOf("function");
    const referred = resolveFutureDueItemsThrough(
      pending.world,
      referralDue.dueAt,
      registry,
    );
    expect(
      referred.history.futureDueItemStates.findLast(
        (state) => state.dueItemId === referralDue.id,
      )?.status,
    ).toBe("resolved");
    expect(
      referred.history.events.findLast(
        (event) => event.type === JUDICIAL_SENATE_REFERRAL_EVENT,
      ),
    ).toMatchObject({
      type: JUDICIAL_SENATE_REFERRAL_EVENT,
      occurredAt: referralDue.dueAt,
      tags: expect.arrayContaining([
        `selection:${pending.selectionRecordId}`,
        "committee:senate-judiciary",
      ]),
    });
    expect(
      projectJudicialSelection(referred, pending.seatId)?.senateStatus,
    ).toContain("committee organization review is due");
    const committeeDue = referred.history.futureDueItems.find(
      (item) =>
        item.transitionKey === JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION &&
        item.stableKey.endsWith(pending.selectionRecordId),
    )!;
    expect(registry.get(committeeDue.transitionKey)).toBeTypeOf("function");
    const committee = resolveFutureDueItemsThrough(
      referred,
      committeeDue.dueAt,
      registry,
    );
    expect(
      committee.history.futureDueItemStates.findLast(
        (state) => state.dueItemId === committeeDue.id,
      )?.status,
    ).toBe("resolved");
    expect(senateJudiciaryAppointment(committee)).not.toBeNull();
    expect(
      committee.history.events.some(
        (event) => event.type === SENATE_JUDICIARY_APPOINTMENT_EVENT,
      ),
    ).toBe(true);
    const notice = committee.history.events.findLast(
      (event) => event.type === JUDICIAL_COMMITTEE_NOTICE_EVENT,
    )!;
    expect(notice.tags).toContain(`selection:${pending.selectionRecordId}`);
    expect(
      projectJudicialSelection(committee, pending.seatId)?.senateStatus,
    ).toContain("appointed Judiciary chair gave notice");
    const sessionDue = committee.history.futureDueItems.find(
      (item) =>
        item.transitionKey === JUDICIAL_COMMITTEE_SESSION_TRANSITION &&
        item.stableKey.endsWith(pending.selectionRecordId),
    )!;
    expect(sessionDue.dueAt > committeeDue.dueAt).toBe(true);
    const elapsed = Math.round(
      (Date.parse(sessionDue.dueAt) - Date.parse(notice.occurredAt)) /
        86_400_000,
    );
    expect(elapsed).toBeGreaterThanOrEqual(3);
    const atSession = resolveFutureDueItemsThrough(
      committee,
      sessionDue.dueAt,
      registry,
    );
    expect(
      atSession.history.futureDueItemStates.findLast(
        (state) => state.dueItemId === sessionDue.id,
      ),
    ).toMatchObject({
      status: "resolved",
      reasonKey: null,
    });
    expect(
      atSession.history.events.some(
        (event) => event.type === JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT,
      ),
    ).toBe(true);
    expect(
      projectJudicialSelection(atSession, pending.seatId)?.senateStatus,
    ).toContain("public Senate Judiciary hearing is announced");
    expect(
      atSession.history.events.some(
        (event) =>
          event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT ||
          event.type === "judicial.senate-ballot",
      ),
    ).toBe(false);
    expect(seatHolderAt(atSession, pending.seatId)).toBeNull();
    const reopened = deserializeWorld(serializeWorld(atSession));
    expect(
      reopened.history.events.some(
        (event) => event.type === JUDICIAL_SENATE_REFERRAL_EVENT,
      ),
    ).toBe(true);
    expect(senateJudiciaryAppointment(reopened)?.eventId).toBe(
      senateJudiciaryAppointment(atSession)?.eventId,
    );
  }, 20_000);

  it("keeps committee consideration blocked when the controlled Senator has not voted on organization", () => {
    const pending = pendingNomination();
    const registry = createCampaignElectionTransitionRegistry();
    const referralDue = pending.world.history.futureDueItems.find(
      (item) => item.transitionKey === JUDICIAL_SENATE_REFERRAL_TRANSITION,
    )!;
    const referred = resolveFutureDueItemsThrough(
      pending.world,
      referralDue.dueAt,
      registry,
    );
    const senatorId = seatedCongressChamber(referred, "senate")!.body
      .members[0]!.personId!;
    const controlled = {
      ...referred,
      control: { kind: "person" as const, personId: senatorId },
    };
    const due = controlled.history.futureDueItems.find(
      (item) =>
        item.transitionKey === JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
    )!;
    const blocked = judicialCommitteeConsiderationHandler(controlled, due);
    expect(blocked).toMatchObject({
      status: "blocked",
      reasonKey: "judiciary:committee-convener-unrecorded",
    });
    expect(senateJudiciaryAppointment(blocked.world)).toBeNull();
    expect(
      blocked.world.history.events.some(
        (event) => event.type === JUDICIAL_COMMITTEE_NOTICE_EVENT,
      ),
    ).toBe(false);
  }, 20_000);

  // This case opens the full named judiciary and Congress. It took 3.63 s
  // alone and 18.71 s during concurrent typechecks; keep the deadline local.
  it("grounds an NPC ballot in known party and qualification evidence without voting twice", () => {
    const pending = pendingNomination();
    let world = pending.world;
    const { selectionRecordId, nomineeId } = pending;
    const presidentId = currentPresidentOf(world)!.personId;
    const presidentPartyOrganizationId = publicPartyAffiliation(
      world,
      presidentId,
    )!;
    const presidentParty = nationalPartyKeys(world).get(
      presidentPartyOrganizationId,
    );
    expect(presidentParty).toBeTruthy();
    const senators = seatedCongressChamber(world, "senate")!.body.members;
    const committee = committeeRoster(
      seatedCongressChamber(world, "senate")!.body,
      US_CONGRESS_RULE_PACK.chambers.find(
        (chamber) => chamber.chamberKey === "senate",
      )!.committees,
      "judiciary",
      "us-congress-v1:senate",
    );
    const opposite = committee.find(
      (member) => member.partyKey && member.partyKey !== presidentParty,
    )!;
    const notAttending = senators.find(
      (member) => member.personId !== opposite.personId,
    )!;
    expect(() =>
      recordNpcFederalJudicialSenateBallot(
        world,
        selectionRecordId,
        opposite.personId!,
      ),
    ).toThrow("no recorded knowledge of the nomination hearing");
    const prepared = preparedHearingForAttendees(world, selectionRecordId, [
      opposite.personId!,
    ]);
    world = recordFederalJudicialHearing(prepared.world, {
      selectionRecordId,
      attendeeSenatorPersonIds: [opposite.personId!],
      noticeEventId: prepared.noticeEventId,
      attendanceEventId: prepared.attendanceEventId,
    });
    expect(
      judicialNominationRecommendation(
        world,
        selectionRecordId,
        notAttending.personId!,
      ).state,
    ).toBe("unresolved");
    const partyOnly = judicialNominationRecommendation(
      world,
      selectionRecordId,
      opposite.personId!,
    );
    expect(partyOnly).toMatchObject({
      state: "ready",
      ballot: "nay",
      score: -2,
    });
    if (partyOnly.state !== "ready") return;
    expect(partyOnly.factors.map((factor) => factor.key)).toEqual(["party"]);
    expect(partyOnly.unknownFactors).toContain(
      "professional qualification known to this Senator",
    );

    const recordId = createStableId(
      "judicial-professional-qualification",
      `${nomineeId}:fixture:cross-party`,
    );
    world = {
      ...world,
      judiciary: {
        ...world.judiciary!,
        professionalQualifications: [
          ...world.judiciary!.professionalQualifications,
          {
            recordId,
            personId: nomineeId,
            jurisdictionId: world.people[nomineeId]!.homeJurisdictionId,
            barAdmittedAt: makeIsoDate("2015-01-01"),
            legalPracticeSince: makeIsoDate("2015-01-01"),
            qualifiedElectorSince: null,
            recordedAt: world.currentDate,
            provenance: {
              kind: "recorded-life",
              seedKey: null,
              evidenceFactIds: [],
            },
          },
        ],
      },
    };
    expect(
      judicialNominationRecommendation(
        world,
        selectionRecordId,
        opposite.personId!,
      ),
    ).toMatchObject({ state: "ready", ballot: "nay", score: -2 });
    world = recordWorldEvent(world, {
      stableKey: `fixture:judicial-candidate-file:${recordId}`,
      type: "judicial.fixture-candidate-file",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [nomineeId, opposite.personId!],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `selection:${selectionRecordId}`,
        `candidate:${nomineeId}`,
        `qualification:${recordId}`,
      ],
      summary: "The fixture candidate file records bar admission and practice.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const fileEvent = world.history.events.at(-1)!;
    world = recordEventKnowledge(world, {
      stableKey: `fixture:judicial-candidate-file:heard:${opposite.personId}`,
      personId: opposite.personId!,
      eventId: fileEvent.id,
      learnedAt: world.currentDate,
      believedSummary: fileEvent.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    world = withFixtureFloorAdmission(world, selectionRecordId);
    const qualified = judicialNominationRecommendation(
      world,
      selectionRecordId,
      opposite.personId!,
    );
    expect(qualified).toMatchObject({
      state: "ready",
      ballot: "present-not-voting",
      score: 0,
    });
    if (qualified.state !== "ready") return;
    expect(qualified.factors.map((factor) => factor.key)).toEqual([
      "party",
      "bar-admission",
      "legal-practice",
    ]);
    expect(qualified.factors[1]!.sourceIds).toContain(fileEvent.id);
    expect(() =>
      recordNpcFederalJudicialSenateBallot(
        {
          ...world,
          control: { kind: "person", personId: opposite.personId! },
        },
        selectionRecordId,
        opposite.personId!,
      ),
    ).toThrow("player's Senate ballot requires their own choice");
    world = recordNpcFederalJudicialSenateBallot(
      world,
      selectionRecordId,
      opposite.personId!,
    );
    const ballot = world.history.events.at(-1)!;
    expect(ballot.type).toBe("judicial.senate-ballot");
    expect(ballot.tags).toContain("ballot:present-not-voting");
    expect(ballot.context.motivation).toContain("Unresolved:");
    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      recordNpcFederalJudicialSenateBallot(
        reopened,
        selectionRecordId,
        opposite.personId!,
      ),
    ).toBe(reopened);
  }, 25_000);

  it("requires a newly stated public answer and each Senator's own knowledge", () => {
    const pending = pendingNomination();
    let world = pending.world;
    const { selectionRecordId, seatId, nomineeId } = pending;
    const committee = committeeRoster(
      seatedCongressChamber(world, "senate")!.body,
      US_CONGRESS_RULE_PACK.chambers.find(
        (chamber) => chamber.chamberKey === "senate",
      )!.committees,
      "judiciary",
      "us-congress-v1:senate",
    );
    const first = committee[0]!.personId!;
    const second = committee[1]!.personId!;
    const interview = world.history.events.find(
      (event) =>
        event.type === "judicial.candidate-interview" &&
        event.tags.includes(`candidate:${nomineeId}`),
    )!;
    expect(interview.visibility).toBe("private");
    expect(
      world.history.knowledge.some(
        (row) => row.personId === first && row.eventId === interview.id,
      ),
    ).toBe(false);
    expect(() =>
      recordFederalJudicialSenateBallot(world, {
        selectionRecordId,
        senatorPersonId: first,
        ballot: "yea",
        reason: "I support the nominee.",
      }),
    ).toThrow("committee report, Executive Calendar admission");

    const prepared = preparedHearingForAttendees(world, selectionRecordId, [
      first,
    ]);
    expect(() =>
      recordFederalJudicialHearing(prepared.world, {
        selectionRecordId,
        attendeeSenatorPersonIds: [first],
        noticeEventId: interview.id,
        attendanceEventId: prepared.attendanceEventId,
      }),
    ).toThrow("seven days' public notice");
    expect(() =>
      recordFederalJudicialHearing(prepared.world, {
        selectionRecordId,
        attendeeSenatorPersonIds: [second],
        noticeEventId: prepared.noticeEventId,
        attendanceEventId: prepared.attendanceEventId,
      }),
    ).toThrow("exactly its recorded Judiciary attendees");
    expect(() =>
      recordFederalJudicialHearing(
        {
          ...prepared.world,
          control: { kind: "person", personId: nomineeId },
        },
        {
          selectionRecordId,
          attendeeSenatorPersonIds: [first],
          noticeEventId: prepared.noticeEventId,
          attendanceEventId: prepared.attendanceEventId,
        },
      ),
    ).toThrow("controlled nominee must choose");
    world = recordFederalJudicialHearing(prepared.world, {
      selectionRecordId,
      attendeeSenatorPersonIds: [first],
      noticeEventId: prepared.noticeEventId,
      attendanceEventId: prepared.attendanceEventId,
    });
    const hearing = world.history.events.find(
      (event) => event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT,
    )!;
    expect(hearing.visibility).toBe("public");
    expect(
      hearing.context.choice === null ||
        hearing.context.choice === interview.context.choice,
    ).toBe(true);
    expect(
      world.history.decisionTraces.some(
        (trace) =>
          trace.context.decisionType === "judicial.hearing-answer" &&
          trace.context.actorPersonId === nomineeId,
      ),
    ).toBe(true);
    expect(
      world.history.knowledge.some(
        (row) => row.personId === first && row.eventId === hearing.id,
      ),
    ).toBe(true);
    expect(
      world.history.knowledge.some(
        (row) => row.personId === second && row.eventId === hearing.id,
      ),
    ).toBe(false);
    world = withFixtureFloorAdmission(world, selectionRecordId);
    expect(() =>
      recordFederalJudicialSenateBallot(world, {
        selectionRecordId,
        senatorPersonId: second,
        ballot: "nay",
        reason: "I oppose the nominee.",
      }),
    ).toThrow("recorded hearing basis");
    world = recordFederalJudicialSenateBallot(world, {
      selectionRecordId,
      senatorPersonId: first,
      ballot: "yea",
      reason: "I heard the nominee at the recorded hearing.",
    });
    expect(
      recordFederalJudicialSenateBallot(world, {
        selectionRecordId,
        senatorPersonId: first,
        ballot: "yea",
        reason: "I heard the nominee at the recorded hearing.",
      }),
    ).toBe(world);
    expect(
      federalJudicialSenateVoteStatus(world, selectionRecordId).state,
    ).toBe("unresolved");
    expect(() =>
      resolveFederalJudicialSenateVote(world, selectionRecordId),
    ).toThrow("unrecorded ballots");
    expect(seatHolderAt(world, seatId)).toBeNull();
    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      reopened.history.knowledge.some(
        (row) => row.personId === first && row.eventId === hearing.id,
      ),
    ).toBe(true);
    expect(() =>
      recordFederalJudicialHearing(reopened, {
        selectionRecordId,
        attendeeSenatorPersonIds: [first],
        noticeEventId: prepared.noticeEventId,
        attendanceEventId: prepared.attendanceEventId,
      }),
    ).toThrow("already has a recorded hearing");
  });

  it("rejects an all-nay roll call without a commission, seat, or judicial job", () => {
    const pending = pendingNomination();
    let world = pending.world;
    const senators = seatedCongressChamber(world, "senate")!.body.members;
    const committeeIds = committeeRoster(
      seatedCongressChamber(world, "senate")!.body,
      US_CONGRESS_RULE_PACK.chambers.find(
        (chamber) => chamber.chamberKey === "senate",
      )!.committees,
      "judiciary",
      "us-congress-v1:senate",
    ).map((member) => member.personId!);
    const prepared = preparedHearingForAttendees(
      world,
      pending.selectionRecordId,
      committeeIds,
    );
    world = recordFederalJudicialHearing(prepared.world, {
      selectionRecordId: pending.selectionRecordId,
      attendeeSenatorPersonIds: committeeIds,
      noticeEventId: prepared.noticeEventId,
      attendanceEventId: prepared.attendanceEventId,
    });
    const hearing = world.history.events.findLast(
      (event) => event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT,
    )!;
    for (const senator of senators) {
      if (committeeIds.includes(senator.personId!)) continue;
      world = recordEventKnowledge(world, {
        stableKey: `fixture:judicial-rejection-hearing:${pending.selectionRecordId}:${senator.personId}`,
        personId: senator.personId!,
        eventId: hearing.id,
        learnedAt: world.currentDate,
        believedSummary: hearing.summary,
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "public-record", reference: hearing.id },
      });
    }
    world = withFixtureFloorAdmission(world, pending.selectionRecordId);
    for (const senator of senators) {
      world = recordFederalJudicialSenateBallot(world, {
        selectionRecordId: pending.selectionRecordId,
        senatorPersonId: senator.personId!,
        ballot: "nay",
        reason: "This Senator opposed confirmation after hearing the nominee.",
      });
    }
    expect(
      federalJudicialSenateVoteStatus(world, pending.selectionRecordId),
    ).toMatchObject({ state: "ready", outcome: "rejected" });
    world = resolveFederalJudicialSenateVote(world, pending.selectionRecordId);
    const result = world.history.events.findLast(
      (event) => event.type === "judicial.senate-result",
    )!;
    expect(result.tags).toContain("outcome:rejected");
    expect(seatHolderAt(world, pending.seatId)).toBeNull();
    expect(
      world.history.events.some(
        (event) => event.type === "judicial.commission-issued",
      ),
    ).toBe(false);
    expect(
      activeWorkRelationshipsAt(world, pending.nomineeId).some(
        ({ relationship }) =>
          relationship.kind === "employment:judicial-office",
      ),
    ).toBe(false);
    const reopened = deserializeWorld(serializeWorld(world));
    expect(seatHolderAt(reopened, pending.seatId)).toBeNull();
    expect(
      activeWorkRelationshipsAt(reopened, pending.nomineeId).some(
        ({ relationship }) =>
          relationship.kind === "employment:judicial-office",
      ),
    ).toBe(false);
  }, 25_000);

  it("keeps a confirmed nominee vacant while they hold the Vice Presidency", () => {
    const pending = pendingNomination();
    let world = recordWorldEvent(pending.world, {
      stableKey: `fixture:executive-conflict-hearing:${pending.selectionRecordId}`,
      type: JUDICIAL_CONFIRMATION_HEARING_EVENT,
      occurredAt: pending.world.currentDate,
      recordedAt: pending.world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [pending.nomineeId],
      participants: [
        {
          personId: pending.nomineeId,
          role: "focus:subject",
          detail: "Fixture nominee for commission guard",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `selection:${pending.selectionRecordId}`,
        `candidate:${pending.nomineeId}`,
      ],
      summary: "Test-only public hearing basis for one Senator's yea ballot.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const hearing = world.history.events.at(-1)!;
    const senators = seatedCongressChamber(world, "senate")!.body.members;
    world = recordEventKnowledge(world, {
      stableKey: `fixture:executive-conflict-hearing-knowledge:${pending.selectionRecordId}`,
      personId: senators[0]!.personId!,
      eventId: hearing.id,
      learnedAt: world.currentDate,
      believedSummary: hearing.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: hearing.id },
    });
    world = withFixtureFloorAdmission(world, pending.selectionRecordId);
    for (const [index, senator] of senators.entries()) {
      world = recordFederalJudicialSenateBallot(world, {
        selectionRecordId: pending.selectionRecordId,
        senatorPersonId: senator.personId!,
        ballot: index === 0 ? "yea" : "present-not-voting",
        reason:
          index === 0
            ? "This Senator supports the nominee after the recorded hearing."
            : "This Senator is present without taking a position.",
      });
    }
    expect(
      federalJudicialSenateVoteStatus(world, pending.selectionRecordId),
    ).toMatchObject({ state: "ready", outcome: "confirmed" });
    world = recordWorldEvent(world, {
      stableKey: `fixture:executive-conflict-vice-presidency:${pending.nomineeId}`,
      type: FEDERAL_TENURE_EVENT,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [pending.nomineeId],
      participants: [
        {
          personId: pending.nomineeId,
          role: "focus:subject",
          detail: "Vice President of the United States",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["office:us-vice-president"],
      summary: "Test-only active Vice Presidency for the confirmed nominee.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    expect(currentFederalTenure(world, "us-vice-president")?.personId).toBe(
      pending.nomineeId,
    );
    world = resolveFederalJudicialSenateVote(world, pending.selectionRecordId);
    const result = world.history.events.findLast(
      (event) =>
        event.type === "judicial.senate-result" &&
        event.tags.includes(`selection:${pending.selectionRecordId}`),
    )!;
    expect(result.tags).toContain("outcome:confirmed");
    expect(
      judicialSelectionStages(world, pending.selectionRecordId).at(-1),
    ).toMatchObject({ outcome: "completed", outcomeEventId: result.id });
    expect(seatHolderAt(world, pending.seatId)).toBeNull();
    expect(
      world.history.events.some(
        (event) =>
          event.type === "judicial.commission-issued" &&
          event.tags.includes(`selection:${pending.selectionRecordId}`),
      ),
    ).toBe(false);
    expect(
      world.history.workRelationships.some(
        (relationship) =>
          relationship.stableKey ===
          `judicial-confirmation:${pending.selectionRecordId}:employment`,
      ),
    ).toBe(false);
    expect(() =>
      commissionConfirmedFederalJudge(world, {
        selectionRecordId: pending.selectionRecordId,
        resultEventId: result.id,
        presidentPersonId: currentPresidentOf(world)!.personId,
        mode: "automatic-npc",
      }),
    ).toThrow("office-exit route");
    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      judicialSelectionStages(reopened, pending.selectionRecordId).at(-1),
    ).toMatchObject({ outcome: "completed", outcomeEventId: result.id });
    expect(currentFederalTenure(reopened, "us-vice-president")?.personId).toBe(
      pending.nomineeId,
    );
    expect(seatHolderAt(reopened, pending.seatId)).toBeNull();
  }, 25_000);

  it("refuses a completed absent roll call without Senate quorum", () => {
    const pending = pendingNomination();
    let world = recordWorldEvent(pending.world, {
      stableKey: `fixture:quorum-hearing:${pending.selectionRecordId}`,
      type: JUDICIAL_CONFIRMATION_HEARING_EVENT,
      occurredAt: pending.world.currentDate,
      recordedAt: pending.world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [pending.nomineeId],
      participants: [
        {
          personId: pending.nomineeId,
          role: "focus:subject",
          detail: "Fixture nominee for isolated quorum arithmetic",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `selection:${pending.selectionRecordId}`,
        `candidate:${pending.nomineeId}`,
      ],
      summary:
        "Test-only public hearing basis for one Senator's quorum ballot.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const hearing = world.history.events.at(-1)!;
    const firstSenator = seatedCongressChamber(world, "senate")!.body
      .members[0]!;
    world = recordEventKnowledge(world, {
      stableKey: `fixture:quorum-hearing-knowledge:${pending.selectionRecordId}`,
      personId: firstSenator.personId!,
      eventId: hearing.id,
      learnedAt: world.currentDate,
      believedSummary: hearing.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: hearing.id },
    });
    world = withFixtureFloorAdmission(world, pending.selectionRecordId);
    const senators = seatedCongressChamber(world, "senate")!.body.members;
    for (const [index, senator] of senators.entries()) {
      world = recordFederalJudicialSenateBallot(world, {
        selectionRecordId: pending.selectionRecordId,
        senatorPersonId: senator.personId!,
        ballot: index === 0 ? "yea" : "absent",
        reason:
          index === 0
            ? "This Senator knew the test hearing record."
            : "The Senator did not attend the saved floor sitting.",
      });
    }
    const status = federalJudicialSenateVoteStatus(
      world,
      pending.selectionRecordId,
    );
    expect(status).toMatchObject({ state: "unresolved" });
    expect(status.state === "unresolved" && status.reason).toMatch(/quorum/);
    expect(() =>
      resolveFederalJudicialSenateVote(world, pending.selectionRecordId),
    ).toThrow(/quorum/);
    expect(seatHolderAt(world, pending.seatId)).toBeNull();
    expect(
      world.history.events.some(
        (event) => event.type === "judicial.senate-result",
      ),
    ).toBe(false);
    expect(
      recordFederalJudicialSenateBallot(world, {
        selectionRecordId: pending.selectionRecordId,
        senatorPersonId: senators[1]!.personId!,
        ballot: "absent",
        reason: "The Senator did not attend the saved floor sitting.",
      }),
    ).toBe(world);
  }, 25_000);

  // This fixture records each Senator's own basis and ballot; it took 6.7 s
  // in the focused run after the hearing provenance route was added.
  it("moves a confirmed sitting judge once and leaves the former seat vacant", () => {
    const pending = pendingNomination();
    let world = pending.world;
    const sourceCourtId = "fixture:former-judicial-court";
    const sourceSeatId = judicialSeatId(sourceCourtId, 1);
    world = addJudicialCourt(world, {
      courtId: sourceCourtId,
      jurisdictionId: null,
      name: "Fixture Former Court",
      level: "federal-district",
      parentCourtId: null,
      sourceRecordId: "us-fed:general_trial",
      identityBasis: "sourced",
      createdAt: world.currentDate,
      rules: {
        authorizedSeats: {
          state: "known",
          value: 1,
          basis: "game-profile",
          referenceId: "fixture:former-size",
        },
        termYears: {
          state: "known",
          value: null,
          basis: "sourced",
          referenceId: "us-fed:general_trial",
        },
        mandatoryRetirementAge: { state: "unknown", reason: "fixture" },
        caseJurisdiction: { state: "unknown", reason: "fixture" },
        selectionRecordId: "us-fed:general_trial",
        amendmentRoute: { state: "unknown", reason: "fixture" },
      },
    });
    world = seatJudge(world, {
      seatId: sourceSeatId,
      personId: pending.nomineeId,
      startedAt: world.currentDate,
      selection: {
        path: "initial-world",
        selectionRecordId: null,
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: null,
        note: "Fixture incumbent before confirmation",
      },
      termEndsAt: null,
      retentionDueAt: null,
    });
    world = createOrganization(world, {
      stableKey: "fixture:judicial-prior-work-organization",
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: "Judicial work handoff fixture." },
      initialProfile: {
        name: "Fixture Legal Practice",
        classification: "custom:judicial-prior-work",
        locationJurisdictionId: null,
      },
    });
    const priorOrganizationId = world.history.organizations.at(-1)!.id;
    world = createWorkRelationship(world, {
      stableKey: "fixture:judicial-prior-exclusive",
      personId: pending.nomineeId,
      organizationId: priorOrganizationId,
      startedAt: world.currentDate,
      kind: "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "Prior exclusive work fixture." },
      initialRole: {
        title: "Staff attorney",
        occupationClassification: "profession:lawyer",
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 40 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: null,
        },
      },
    });
    const priorExclusiveId = world.history.workRelationships.at(-1)!.id;
    world = createWorkRelationship(world, {
      stableKey: "fixture:judicial-prior-flexible",
      personId: pending.nomineeId,
      organizationId: priorOrganizationId,
      startedAt: world.currentDate,
      kind: "independent:practice",
      compensation: "paid",
      authority: "self-directed",
      dependency: "independent",
      economicRisk: "person-borne",
      provenance: { kind: "authored", note: "Prior flexible work fixture." },
      initialRole: {
        title: "Occasional legal adviser",
        occupationClassification: "profession:lawyer",
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly: { minimumHours: 4, maximumHours: 6 },
          attention: "low",
          concurrency: "mostly-concurrent",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: null,
        },
      },
    });
    const priorFlexibleId = world.history.workRelationships.at(-1)!.id;
    const before = world;
    const senators = seatedCongressChamber(world, "senate")!.body.members;
    const committeeIds = committeeRoster(
      seatedCongressChamber(world, "senate")!.body,
      US_CONGRESS_RULE_PACK.chambers.find(
        (chamber) => chamber.chamberKey === "senate",
      )!.committees,
      "judiciary",
      "us-congress-v1:senate",
    ).map((member) => member.personId!);
    const prepared = preparedHearingForAttendees(
      world,
      pending.selectionRecordId,
      committeeIds,
    );
    world = recordFederalJudicialHearing(prepared.world, {
      selectionRecordId: pending.selectionRecordId,
      attendeeSenatorPersonIds: committeeIds,
      noticeEventId: prepared.noticeEventId,
      attendanceEventId: prepared.attendanceEventId,
    });
    const publicHearing = world.history.events.findLast(
      (event) => event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT,
    )!;
    for (const senator of senators) {
      if (committeeIds.includes(senator.personId!)) continue;
      world = recordEventKnowledge(world, {
        stableKey: `fixture:judicial-hearing-transcript:${pending.selectionRecordId}:${senator.personId}`,
        personId: senator.personId!,
        eventId: publicHearing.id,
        learnedAt: world.currentDate,
        believedSummary: publicHearing.summary,
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "public-record", reference: publicHearing.id },
      });
    }
    world = withFixtureFloorAdmission(world, pending.selectionRecordId);
    for (const senator of senators) {
      world = recordFederalJudicialSenateBallot(world, {
        selectionRecordId: pending.selectionRecordId,
        senatorPersonId: senator.personId!,
        ballot: "yea",
        reason: "Fixture Senator's own recorded vote.",
      });
    }
    expect(
      federalJudicialSenateVoteStatus(world, pending.selectionRecordId),
    ).toMatchObject({
      state: "ready",
      outcome: "confirmed",
    });
    world = resolveFederalJudicialSenateVote(world, pending.selectionRecordId);
    const judicialJobs = activeWorkRelationshipsAt(
      world,
      pending.nomineeId,
    ).filter(
      ({ relationship, role }) =>
        relationship.kind === "employment:judicial-office" &&
        role.occupationClassification === "profession:federal-judge",
    );
    expect(judicialJobs).toHaveLength(1);
    const activeWorkIds = activeWorkRelationshipsAt(
      world,
      pending.nomineeId,
    ).map(({ relationship }) => relationship.id);
    expect(activeWorkIds).not.toContain(priorExclusiveId);
    expect(activeWorkIds).toContain(priorFlexibleId);
    expect(
      organizationProfileAt(
        world,
        judicialJobs[0]!.relationship.organizationId!,
      )?.classification,
    ).toBe("service:federal-court");
    const confirmedResult = world.history.events.findLast(
      (event) =>
        event.type === "judicial.senate-result" &&
        event.tags.includes(`selection:${pending.selectionRecordId}`),
    )!;
    const commission = world.history.events.findLast(
      (event) =>
        event.type === "judicial.commission-issued" &&
        event.tags.includes(`selection:${pending.selectionRecordId}`),
    )!;
    expect(commission.tags).toContain(`result:${confirmedResult.id}`);
    expect(
      world.history.publications?.some(
        (row) => row.sourceEventId === confirmedResult.id,
      ) ?? false,
    ).toBe(true);
    expect(
      world.history.publications?.some(
        (row) => row.sourceEventId === commission.id,
      ) ?? false,
    ).toBe(true);
    expect(seatHolderAt(before, sourceSeatId)?.personId).toBe(
      pending.nomineeId,
    );
    expect(seatHolderAt(world, sourceSeatId)).toBeNull();
    expect(seatHolderAt(world, pending.seatId)?.personId).toBe(
      pending.nomineeId,
    );
    expect(
      world.judiciary!.seatTenures.find((row) => row.seatId === sourceSeatId)
        ?.endReason,
    ).toBe("appointment-to-another-seat");
    const reopened = deserializeWorld(serializeWorld(world));
    expect(seatHolderAt(reopened, sourceSeatId)).toBeNull();
    expect(seatHolderAt(reopened, pending.seatId)?.personId).toBe(
      pending.nomineeId,
    );
    expect(
      activeWorkRelationshipsAt(reopened, pending.nomineeId).filter(
        ({ relationship }) =>
          relationship.kind === "employment:judicial-office",
      ),
    ).toHaveLength(1);
    expect(
      reopened.history.publications?.some(
        (row) => row.sourceEventId === commission.id,
      ) ?? false,
    ).toBe(true);
    expect(() =>
      resolveFederalJudicialSenateVote(reopened, pending.selectionRecordId),
    ).toThrow("The judicial seat is already filled");
  }, 25_000);

  it("has an admitted vacant selection path for a seat in every federal circuit", () => {
    const world = buildOpeningCourtCatalog(
      createDemoWorld("judicial-circuit-vacancy-coverage"),
    );
    const circuits = Object.values(world.judiciary!.courts).filter(
      (court) => court.level === "federal-appellate",
    );
    expect(circuits).toHaveLength(13);
    for (const court of circuits) {
      expect(court.identityBasis).toBe("sourced");
      expect(court.sourceRecordId).toBe(court.courtId);
      const vacancy = vacantSeatsAt(world, court.courtId)[0];
      expect(vacancy, court.courtId).toBeDefined();
      expect(
        resolveJudicialSelectionPlan(world, vacancy!.seatId, "vacancy"),
      ).toMatchObject({ state: "ready" });
    }
  });
});
