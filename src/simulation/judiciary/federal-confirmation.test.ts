import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { currentPresidentOf } from "../crisis/offices";
import { seatedCongressChamber } from "../governing/congress-chambers";
import { LIFE_MIND_IDS } from "../life-mind-content";
import { deserializeWorld, serializeWorld } from "../serialization";
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
  openJudicialSelectionFromProfile,
  recordFederalJudicialNomination,
} from "./selection";
import { judicialSeatId } from "./types";

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
