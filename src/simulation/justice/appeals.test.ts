import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { personName } from "../people";
import { recordWorldEvent } from "../world";
import { addJudicialCourt, seatJudge } from "../judiciary/courts";
import { judicialSeatId, type JudicialCourtRules } from "../judiciary/types";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { appealJudgment, evaluateAppealChoice } from "./appeals";

const rules: JudicialCourtRules = {
  authorizedSeats: { state: "known", value: 1, basis: "game-profile", referenceId: "appeal-test" },
  termYears: { state: "unknown", reason: "test" },
  mandatoryRetirementAge: { state: "unknown", reason: "test" },
  caseJurisdiction: { state: "unknown", reason: "test" },
  selectionRecordId: null,
  amendmentRoute: { state: "unknown", reason: "test" },
};

function courtWorld(termMonths: number) {
  const seed = "b13-p4-appeals-random-place-proof";
  const place = drawRandomPlace(seed, (candidate) => candidate.stateJurisdictionKey === "US-ID");
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: place.key,
    seed,
  });
  let world = game.world;
  const jurisdictionId = world.jurisdictionOrder[0]!;
  const trialCourtId = "appeal-test:trial";
  const appellateCourtId = "appeal-test:appellate";
  world = addJudicialCourt(world, {
    courtId: appellateCourtId,
    jurisdictionId,
    name: "Appeal test appellate court",
    level: "local-intermediate",
    parentCourtId: null,
    sourceRecordId: null,
    identityBasis: "game-profile",
    createdAt: world.currentDate,
    rules,
  });
  world = addJudicialCourt(world, {
    courtId: trialCourtId,
    jurisdictionId,
    name: "Appeal test trial court",
    level: "local-general-trial",
    parentCourtId: appellateCourtId,
    sourceRecordId: null,
    identityBasis: "game-profile",
    createdAt: world.currentDate,
    rules,
  });
  world = seatJudge(world, {
    seatId: judicialSeatId(appellateCourtId, 1),
    personId: world.personOrder[2]!,
    startedAt: world.currentDate,
    selection: {
      path: "initial-world",
      selectionRecordId: null,
      decisionRecordId: null,
      selectingPersonId: null,
      contestId: null,
      note: "Appeal test fixture.",
    },
    termEndsAt: null,
    retentionDueAt: null,
  });
  const appellantId = game.playerPersonId;
  const trialJudgeId = world.personOrder.find((personId) => personId !== appellantId)!;
  const basis = recordWorldEvent(world, {
    stableKey: "appeal-test:burglary-basis",
    type: "crime.burglary-recorded",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [appellantId],
    participants: [{ personId: appellantId, role: "focus:defendant", detail: null }],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "A recorded burglary basis.",
    context: { location: null, socialContext: null, pressure: null, choice: null, motivation: null, immediateReaction: null },
  });
  const basisId = basis.history.events.at(-1)!.id;
  const referral = recordWorldEvent(basis, {
    stableKey: "appeal-test:burglary-referral",
    type: "justice.prosecution-referred",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [appellantId],
    participants: [{ personId: appellantId, role: "focus:subject", detail: null }],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "justice.offense:crime:burglary",
      "justice.evidence:circumstantial",
      "justice.standing-findings:0",
      "justice.sentencing-applicability:version:1",
      "justice.sentencing-applicability:grade:value:burglary",
      `justice.sentencing-applicability:grade:source:${basisId}`,
      "justice.sentencing-applicability:dwelling:value:true",
      `justice.sentencing-applicability:dwelling:source:${basisId}`,
    ],
    summary: "The prosecutor referred a burglary case.",
    context: { location: null, socialContext: "Criminal case", pressure: null, choice: null, motivation: null, immediateReaction: null },
  });
  const referralId = referral.history.events.at(-1)!.id;
  world = recordWorldEvent(referral, {
    stableKey: "appeal-test:sentence",
    type: "justice.sentenced",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [appellantId, trialJudgeId],
    participants: [
      { personId: appellantId, role: "focus:defendant", detail: null },
      { personId: trialJudgeId, role: "agency:decided", detail: "Judge" },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["justice.sentence:jail", `justice.referral:${referralId}`, `justice.sentence-months:${termMonths}`],
    summary: "The court sentenced the defendant to jail.",
    context: {
      location: null,
      socialContext: "Criminal case",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world, place, seed, judgmentEventId: world.history.events.at(-1)!.id, appellantId, trialJudgeId };
}

function runBoundsAppeal(termMonths: number) {
  const fixture = courtWorld(termMonths);
  const result = appealJudgment(fixture.world, {
    stableKey: `appeal-test:${termMonths}`,
    judgmentEventId: fixture.judgmentEventId,
    appellantPersonId: fixture.appellantId,
    trialJudgePersonId: fixture.trialJudgeId,
    caseKind: "criminal",
  });
  return { ...fixture, result };
}

describe("appeals", () => {
  it("uses the shared decision engine with the appellant's means, evidence, outcome and legal edge", () => {
    const fixture = courtWorld(130);
    const decision = evaluateAppealChoice(fixture.world, {
      stableKey: "appeal-fixture:case-1",
      judgmentEventId: fixture.judgmentEventId,
      appellantPersonId: fixture.appellantId,
      trialJudgePersonId: fixture.trialJudgeId,
      caseKind: "criminal",
    });

    expect(decision.context.randomness).toBe("none");
    expect(decision.context.actorPersonId).toBe(fixture.appellantId);
    expect(decision.context.considerations.map((row) => row.stableKey)).toEqual(
      expect.arrayContaining([
        "appeal-fixture:case-1:outcome",
        "appeal-fixture:case-1:evidence",
      ]),
    );
    expect(decision.context.considerations.map((row) => row.stableKey)).not.toContain(
      "appeal-fixture:case-1:edge-of-law",
    );
    const hasRecordedMeans = fixture.world.history.resourcePositions.some(
      (position) => position.owner.kind === "person" && position.owner.personId === fixture.appellantId,
    );
    expect(decision.context.considerations.some((row) => row.stableKey.endsWith(":means"))).toBe(hasRecordedMeans);
  });

  it("reads an actual upper-bound sentence as at the legal edge", () => {
    const fixture = courtWorld(120);
    const decision = evaluateAppealChoice(fixture.world, {
      stableKey: "appeal-fixture:case-at-edge",
      judgmentEventId: fixture.judgmentEventId,
      appellantPersonId: fixture.appellantId,
      trialJudgePersonId: fixture.trialJudgeId,
      caseKind: "criminal",
    });

    expect(decision.context.considerations.map((row) => row.stableKey)).toContain(
      "appeal-fixture:case-at-edge:edge-of-law",
    );
  });

  it("does not allow an acquittal to be appealed", () => {
    let world = createDemoWorld("appeal-acquittal-contract", { peopleCount: 3 });
    const judgeId = world.personOrder[0]!;
    const appellantId = world.personOrder[1]!;
    world = recordWorldEvent(world, {
      stableKey: "appeal-fixture:acquittal",
      type: "justice.case-ended",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0]!,
      involvedEntityIds: [judgeId, appellantId],
      participants: [
        { personId: appellantId, role: "focus:defendant", detail: null },
        { personId: judgeId, role: "agency:decided", detail: "Judge" },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["justice.outcome:acquitted"],
      summary: "The jury acquitted the defendant.",
      context: {
        location: null,
        socialContext: "Criminal case",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });

    const judgmentEventId = world.history.events.at(-1)!.id;
    const result = appealJudgment(world, {
      stableKey: "appeal-fixture:acquittal",
      judgmentEventId,
      appellantPersonId: appellantId,
      trialJudgePersonId: judgeId,
      caseKind: "criminal",
    });

    expect(result.status).toBe("unsupported");
    expect(result.appealEventId).toBeNull();
    expect(result.world).toBe(world);
  });

  it("fails closed for an eviction row without saved appeal bounds", () => {
    let world = createDemoWorld("appeal-eviction-contract", { peopleCount: 3 });
    const judgeId = world.personOrder[0]!;
    const tenantId = world.personOrder[1]!;
    world = recordWorldEvent(world, {
      stableKey: "appeal-fixture:eviction",
      type: "housing.evicted",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0]!,
      involvedEntityIds: [judgeId, tenantId],
      participants: [
        { personId: tenantId, role: "focus:tenant", detail: null },
        { personId: judgeId, role: "focus:judge", detail: null },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "The tenant was evicted after a recorded hearing.",
      context: {
        location: null,
        socialContext: "Civil case",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });

    const result = appealJudgment(world, {
      stableKey: "appeal-fixture:eviction",
      judgmentEventId: world.history.events.at(-1)!.id,
      appellantPersonId: tenantId,
      trialJudgePersonId: judgeId,
      caseKind: "civil",
    });

    expect(result.status).toBe("unsupported");
    expect(result.world).toBe(world);
    expect(result.legalBounds).toBeNull();
  });

  it("reverses an out-of-bounds sentence", () => {
    const proof = runBoundsAppeal(130);
    expect(proof.result.status).toBe("decided");
    expect(proof.result.votes).toEqual([{ judgeId: expect.any(String), result: "reverse" }]);
    expect(proof.result.result).toBe("reverse");
    expect(proof.result.legalBounds?.sourceRecordIds.length).toBeGreaterThan(0);
    console.info("b13-p4 appeal proof", JSON.stringify({ seed: proof.seed, place: proof.place.key, playerId: proof.appellantId, playerName: personName(proof.world.people[proof.appellantId]!), judgmentEventId: proof.judgmentEventId, appellateJudgeId: proof.result.votes[0]!.judgeId, result: proof.result.result, ...proof.result.legalBounds }));
  });

  it("affirms a sentence inside the law's bounds", () => {
    const proof = runBoundsAppeal(60);
    expect(proof.result.status).toBe("decided");
    expect(proof.result.votes).toEqual([{ judgeId: expect.any(String), result: "affirm" }]);
    expect(proof.result.result).toBe("affirm");
    expect(proof.result.legalBounds?.sourceRecordIds.length).toBeGreaterThan(0);
    console.info("b13-p4 appeal proof", JSON.stringify({ seed: proof.seed, place: proof.place.key, playerId: proof.appellantId, playerName: personName(proof.world.people[proof.appellantId]!), judgmentEventId: proof.judgmentEventId, appellateJudgeId: proof.result.votes[0]!.judgeId, result: proof.result.result, ...proof.result.legalBounds }));
  });
});
