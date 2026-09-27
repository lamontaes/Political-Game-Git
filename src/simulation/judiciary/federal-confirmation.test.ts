import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { projectJudicialSelection } from "../../presentation/judicial-selection";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { currentPresidentOf } from "../crisis/offices";
import {
  nationalPartyKeys,
  seatedCongressChamber,
} from "../governing/congress-chambers";
import { createStableId } from "../ids";
import { LIFE_MIND_IDS } from "../life-mind-content";
import { publicPartyAffiliation } from "../living-world/congress";
import { recordEventKnowledge } from "../records";
import { deserializeWorld, serializeWorld } from "../serialization";
import { makeIsoDate } from "../dates";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { resolveFutureDueItemsThrough } from "../future-transitions";
import { recordWorldEvent } from "../world";
import { addJudicialCourt, seatHolderAt, seatJudge } from "./courts";
import { recordFederalJudicialCandidateResponse } from "./candidate-interview";
import {
  federalJudicialSenateVoteStatus,
  JUDICIAL_CONFIRMATION_HEARING_EVENT,
  recordFederalJudicialSenateBallot,
  resolveFederalJudicialSenateVote,
} from "./federal-confirmation";
import { recordFederalJudicialHearing } from "./federal-hearing";
import {
  judicialNominationRecommendation,
  recordNpcFederalJudicialSenateBallot,
} from "./nomination-reasoning";
import {
  openJudicialSelectionFromProfile,
  recordFederalJudicialNomination,
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
      status: "blocked",
      reasonKey: "judiciary:committee-attendance-unrecorded",
    });
    expect(
      projectJudicialSelection(atSession, pending.seatId)?.senateStatus,
    ).toContain("attendance and a nomination report are not recorded");
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
    const opposite = senators.find(
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
    world = recordFederalJudicialHearing(world, {
      selectionRecordId,
      attendeeSenatorPersonIds: [opposite.personId!],
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
    const senators = seatedCongressChamber(world, "senate")!.body.members;
    const first = senators[0]!.personId!;
    const second = senators[1]!.personId!;
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
    ).toThrow("recorded hearing basis");

    world = recordFederalJudicialHearing(world, {
      selectionRecordId,
      attendeeSenatorPersonIds: [first],
    });
    const hearing = world.history.events.find(
      (event) => event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT,
    )!;
    expect(hearing.visibility).toBe("public");
    expect(hearing.context.choice).toBe(interview.context.choice);
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
      reason: "The nominee's stated privacy approach supports my vote.",
    });
    expect(
      federalJudicialSenateVoteStatus(world, selectionRecordId).state,
    ).toBe("unresolved");
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
      }),
    ).toThrow("already has a recorded hearing");
  });

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
    const before = world;
    const senators = seatedCongressChamber(world, "senate")!.body.members;
    world = recordFederalJudicialHearing(world, {
      selectionRecordId: pending.selectionRecordId,
      attendeeSenatorPersonIds: senators.map((member) => member.personId!),
    });
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
    expect(() =>
      resolveFederalJudicialSenateVote(reopened, pending.selectionRecordId),
    ).toThrow("The judicial seat is already filled");
  });
});
