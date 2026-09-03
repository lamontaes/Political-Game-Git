import { describe, expect, it } from "vitest";

import {
  adoptProvisionRevision,
  assertWorldIntegrity,
  assessCommitment,
  commitmentsKnownTo,
  currentMeasureProvisions,
  currentProvisionByKey,
  deserializeWorld,
  describeExchangeCharacter,
  isParticularizedProvision,
  isPersonalInducement,
  measureAmendments,
  measureCommitments,
  measureNegotiations,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import {
  createLegislativeBargainingFixture,
  playerHasReadFiscalNote,
  reviewFiscalNote,
  REQUESTED_PROVISION_KEY,
  PROGRAM_PROVISION_KEY,
  type LegislativeBargainingFixture,
} from "./legislative-bargaining-fixture";
import {
  offerNegotiatedAmendment,
  takeNegotiatedFloorVote,
} from "./legislative-bargaining-actions";
import {
  availableConversationIntents,
  commitConversationTurn,
  createConversationSessionDescriptor,
  openingConversationBeat,
  resolveConversationListeners,
  type ConversationAddressee,
  type ConversationAudibility,
  type ConversationIntent,
} from "./run-b-conversation";
import {
  isLegislativeBargainingProgress,
  type LegislativeBargainingProgress,
} from "./run-b-conversation-progress";
import {
  eligibleMotifVariantKeys,
  legislativeMotifLine,
  motifFamilies,
  type LegislativeMotifFacts,
} from "./legislative-dialogue-motifs";

/**
 * A run of the bargaining slice, driven the way the player drives it.
 *
 * Each test says what a player could actually observe, so a change that made
 * the system less honest — a promise that became binding, a provision that
 * changed without an amendment, a score that leaked into a sentence — would
 * fail here rather than in a screenshot.
 */

interface Session {
  world: World;
  progress: LegislativeBargainingProgress;
  turn: number;
  readonly fixture: LegislativeBargainingFixture;
  readonly descriptor: ReturnType<typeof createConversationSessionDescriptor>;
  readonly room: LegislativeBargainingFixture["roomContext"];
}

function openSession(
  fixture = createLegislativeBargainingFixture(),
  which: "shared" | "private" = "shared",
): Session {
  const room =
    which === "private" ? fixture.privateRoomContext : fixture.roomContext;
  return {
    world: fixture.world,
    progress: fixture.progress,
    turn: 1,
    fixture,
    descriptor: createConversationSessionDescriptor(fixture.world, room),
    room,
  };
}

function speak(
  session: Session,
  addressee: ConversationAddressee,
  intent: ConversationIntent,
  audibility: ConversationAudibility = "normal",
) {
  const result = commitConversationTurn(session.world, {
    session: session.descriptor,
    room: session.room,
    progress: session.progress,
    turnOrdinal: session.turn,
    addressee,
    audibility,
    intent,
  });
  session.world = result.world;
  if (!isLegislativeBargainingProgress(result.progress)) {
    throw new Error("The bargaining session lost its subject.");
  }
  session.progress = result.progress;
  session.turn += 1;
  return result;
}

function intentKeys(
  session: Session,
  addressee: ConversationAddressee,
  audibility: ConversationAudibility = "normal",
): readonly string[] {
  return availableConversationIntents(
    session.world,
    session.room,
    addressee,
    session.progress,
    audibility,
  ).map((option) => option.key);
}

const DEVELOPER_LEAKS = [
  /decision[- ]?trace/i,
  /optionKey/,
  /finalRank/,
  /preference:/,
  /\bscore\b/i,
  /probability/i,
  /\d+%\s*(chance|likely|support)/i,
  /vote(s)? bought/i,
  /whip count/i,
  /support meter/i,
  /\bsupport-if\b/,
  /\bpolicy-bargaining\b/,
  /\bpersonal-inducement\b/,
  /\btargeted-benefit-request\b/,
];

function expectNoDeveloperLeak(text: string) {
  for (const pattern of DEVELOPER_LEAKS) {
    expect(text, `player-facing text leaked ${pattern}`).not.toMatch(pattern);
  }
}

// 1 --------------------------------------------------------------------------
describe("what a provision reaches", () => {
  it("keeps a universal provision and a named one distinguishable", () => {
    const fixture = createLegislativeBargainingFixture();
    const filed = currentMeasureProvisions(fixture.world, fixture.measureId);
    expect(filed).toHaveLength(3);
    for (const provision of filed) {
      expect(isParticularizedProvision(provision)).toBe(false);
      expect(provision.applicationScope.segmentKey).toBeNull();
    }

    const session = openSession(fixture);
    const adopted = offerNegotiatedAmendment(
      session.world,
      fixture,
      session.progress,
      "as-asked",
    );
    const section4 = currentProvisionByKey(
      adopted.world,
      fixture.measureId,
      REQUESTED_PROVISION_KEY,
    );
    expect(section4).not.toBeNull();
    expect(isParticularizedProvision(section4!)).toBe(true);
    expect(section4!.applicationScope.segmentKey).toBe(
      "transit.ashland-boyd-local-match",
    );
    if (section4!.beneficiary.kind !== "particularized") {
      throw new Error("Section 4 should be written for a named beneficiary.");
    }
    expect(section4!.beneficiary.beneficiaryLabel).toContain("Ashland");
    // Narrow is not the same as corrupt, and nothing in the record says it is.
    expect(section4!.beneficiary.statedGround.length).toBeGreaterThan(20);
    expectNoDeveloperLeak(section4!.beneficiary.statedGround);
  });
});

// 2, 3 -----------------------------------------------------------------------
describe("only an adopted amendment changes the bill", () => {
  it("writes the negotiated section into actual measure state and history", () => {
    const session = openSession();
    speak(
      session,
      session.fixture.advocatePersonId,
      "offer-targeted-provision",
    );
    // Talk alone changed nothing about the text.
    expect(
      currentMeasureProvisions(session.world, session.fixture.measureId),
    ).toHaveLength(3);

    const before = session.world.history.nextSequence;
    const result = offerNegotiatedAmendment(
      session.world,
      session.fixture,
      session.progress,
      "as-asked",
    );
    expect(result.adopted).toBe(true);
    expect(
      currentMeasureProvisions(result.world, session.fixture.measureId),
    ).toHaveLength(4);
    expect(result.world.history.nextSequence).toBeGreaterThan(before);

    const section4 = currentProvisionByKey(
      result.world,
      session.fixture.measureId,
      REQUESTED_PROVISION_KEY,
    )!;
    const amendment = measureAmendments(
      result.world,
      session.fixture.measureId,
    ).at(-1)!;
    expect(section4.originAmendmentId).toBe(amendment.id);
    expect(amendment.status).toBe("adopted");
    expect(
      result.world.history.events.some(
        (event) => event.id === section4.eventId,
      ),
    ).toBe(true);
    assertWorldIntegrity(result.world);
  });

  it("refuses to rewrite a section without an amendment that carried", () => {
    const session = openSession();
    const measureId = session.fixture.measureId;
    const section3 = currentProvisionByKey(
      session.world,
      measureId,
      PROGRAM_PROVISION_KEY,
    )!;
    expect(() =>
      adoptProvisionRevision(session.world, {
        stableKey: "test:forged-revision",
        measureId,
        amendmentId: "legislative-amendment_deadbeefdeadbeef" as EntityId,
        supersedesProvisionId: section3.id,
        provisionKey: PROGRAM_PROVISION_KEY,
        sectionNumber: 3,
        heading: "Pilot support limit",
        text: "Rewritten in conversation, which is not a thing that happens.",
        beneficiary: {
          kind: "general-application",
          appliesToLabel: "everyone",
        },
        applicationScope: section3.applicationScope,
      }),
    ).toThrow(/does not belong to this measure/);
  });

  it("leaves the record untouched when asking about a proposal", () => {
    const session = openSession();
    const before = session.world;
    const beat = openingConversationBeat(
      session.world,
      session.room,
      session.fixture.advocatePersonId,
      session.progress,
    );
    const options = intentKeys(session, session.fixture.advocatePersonId);
    expect(beat.dialogue.length).toBeGreaterThan(20);
    expect(options).toContain("offer-targeted-provision");
    expect(session.world).toBe(before);
    expect(session.world.history.nextSequence).toBe(
      before.history.nextSequence,
    );
  });
});

// 4, 5, 9 --------------------------------------------------------------------
describe("a commitment is a claim about the future, not the future", () => {
  it("records explicit conditions and never guarantees the vote", () => {
    const session = openSession();
    speak(
      session,
      session.fixture.advocatePersonId,
      "offer-targeted-provision",
    );
    const commitments = measureCommitments(
      session.world,
      session.fixture.measureId,
    );
    const commitment = commitments.at(-1)!;
    expect(commitment.holderPersonId).toBe(session.fixture.advocatePersonId);
    expect(commitment.stance).toBe("support-if");
    expect(commitment.conditions).not.toHaveLength(0);
    for (const condition of commitment.conditions) {
      expect(condition.description.trim().length).toBeGreaterThan(10);
      expectNoDeveloperLeak(condition.description);
    }
    // Firmness is a word, not a number.
    expect(typeof commitment.firmness).toBe("string");
    expect(Number.isFinite(Number(commitment.firmness))).toBe(false);

    const open = assessCommitment(session.world, commitment.id);
    expect(open.standing).toBe("conditions-unmet");
    expectNoDeveloperLeak(open.account);
  });

  it("lets the promised vote fail to arrive when the condition never was met", () => {
    const session = openSession();
    speak(
      session,
      session.fixture.advocatePersonId,
      "offer-targeted-provision",
    );
    const commitment = measureCommitments(
      session.world,
      session.fixture.measureId,
    ).at(-1)!;

    // The player never carries the amendment. The bill goes to a vote anyway.
    const vote = takeNegotiatedFloorVote(
      session.world,
      session.fixture,
      session.progress,
    );
    const assessment = assessCommitment(vote.world, commitment.id);
    expect(assessment.standing).toBe("conditions-unmet");
    expect(assessment.account).toMatch(/never owed|not met/i);

    const advocateVote = vote.memberAccounts.find(
      (account) => account.personId === session.fixture.advocatePersonId,
    )!;
    expect(advocateVote.disposition).toBe("nay");
    expectNoDeveloperLeak(advocateVote.account);
  });

  it("reads as honored when the condition was met and the vote followed", () => {
    const session = openSession();
    speak(
      session,
      session.fixture.advocatePersonId,
      "offer-targeted-provision",
    );
    const commitment = measureCommitments(
      session.world,
      session.fixture.measureId,
    ).at(-1)!;

    const amended = offerNegotiatedAmendment(
      session.world,
      session.fixture,
      session.progress,
      "as-asked",
    );
    const vote = takeNegotiatedFloorVote(
      amended.world,
      session.fixture,
      session.progress,
    );
    expect(assessCommitment(vote.world, commitment.id).standing).toBe(
      "honored",
    );
    const advocateVote = vote.memberAccounts.find(
      (account) => account.personId === session.fixture.advocatePersonId,
    )!;
    expect(advocateVote.disposition).toBe("yea");
    // The member's own words are why, and they are readable words.
    expect(advocateVote.account).toContain("said this much on the record");
  });

  it("binds an 'unless' commitment in the direction it was actually made", () => {
    const session = openSession();
    // "I'm a no unless you write Section 4 in." The player does not.
    speak(session, session.fixture.advocatePersonId, "refuse-request");
    const commitment = measureCommitments(
      session.world,
      session.fixture.measureId,
    ).at(-1)!;
    expect(commitment.stance).toBe("oppose-unless");

    const vote = takeNegotiatedFloorVote(
      session.world,
      session.fixture,
      session.progress,
    );
    const advocate = vote.memberAccounts.find(
      (account) => account.personId === session.fixture.advocatePersonId,
    )!;
    expect(advocate.disposition).toBe("nay");
    // Keeping an "unless" promise is keeping it, not breaking it.
    const assessment = assessCommitment(vote.world, commitment.id);
    expect(assessment.standing).toBe("honored");
    expectNoDeveloperLeak(assessment.account);
  });

  it("answers an 'unless' objection once the thing asked for happens", () => {
    const session = openSession();
    speak(session, session.fixture.advocatePersonId, "refuse-request");
    const amended = offerNegotiatedAmendment(
      session.world,
      session.fixture,
      session.progress,
      "as-asked",
    );
    const vote = takeNegotiatedFloorVote(
      amended.world,
      session.fixture,
      session.progress,
    );
    const advocate = vote.memberAccounts.find(
      (account) => account.personId === session.fixture.advocatePersonId,
    )!;
    // The player changed their mind and delivered; the stated objection is gone.
    expect(advocate.disposition).toBe("yea");
    expect(advocate.account).toMatch(
      /objection they stated is answered|written for/,
    );
  });

  it("lets one member's win be another member's reason to vote no", () => {
    const session = openSession();
    const amended = offerNegotiatedAmendment(
      session.world,
      session.fixture,
      session.progress,
      "as-asked",
    );
    const vote = takeNegotiatedFloorVote(
      amended.world,
      session.fixture,
      session.progress,
    );
    const guardian = vote.memberAccounts.find(
      (account) => account.personId === session.fixture.guardianPersonId,
    )!;
    expect(guardian.disposition).toBe("nay");
    expect(guardian.account).toMatch(/more than the member said/);

    // The capped counter is the version that satisfies both, and the game
    // makes the player find that out rather than announcing it.
    const capped = offerNegotiatedAmendment(
      openSession(createLegislativeBargainingFixture()).world,
      session.fixture,
      session.progress,
      "capped",
    );
    const cappedVote = takeNegotiatedFloorVote(
      capped.world,
      session.fixture,
      session.progress,
    );
    expect(
      cappedVote.memberAccounts.map((account) => account.disposition),
    ).toEqual(["yea", "yea"]);
  });
});

// 6, 7, 8 --------------------------------------------------------------------
describe("who heard it, and what that makes true", () => {
  it("keeps a private commitment private and a shared one shared", () => {
    const shared = openSession();
    speak(shared, shared.fixture.advocatePersonId, "offer-targeted-provision");
    const sharedCommitment = measureCommitments(
      shared.world,
      shared.fixture.measureId,
    ).at(-1)!;
    expect(sharedCommitment.audience).toBe("limited");
    expect(sharedCommitment.heardByPersonIds).toContain(
      shared.fixture.guardianPersonId,
    );

    const alone = openSession(createLegislativeBargainingFixture(), "private");
    speak(
      alone,
      alone.fixture.advocatePersonId,
      "offer-targeted-provision",
      "private",
    );
    const privateCommitment = measureCommitments(
      alone.world,
      alone.fixture.measureId,
    ).at(-1)!;
    expect(privateCommitment.audience).toBe("private");
    expect(privateCommitment.heardByPersonIds).not.toContain(
      alone.fixture.guardianPersonId,
    );
  });

  it("gates knowledge on who actually heard the exchange", () => {
    const alone = openSession(createLegislativeBargainingFixture(), "private");
    expect(
      resolveConversationListeners(
        alone.room,
        alone.fixture.advocatePersonId,
        "private",
      ),
    ).toEqual([alone.fixture.advocatePersonId]);
    speak(
      alone,
      alone.fixture.advocatePersonId,
      "offer-targeted-provision",
      "private",
    );
    expect(
      commitmentsKnownTo(
        alone.world,
        alone.fixture.guardianPersonId,
        alone.fixture.measureId,
      ),
    ).toHaveLength(0);
    expect(
      commitmentsKnownTo(
        alone.world,
        alone.fixture.advocatePersonId,
        alone.fixture.measureId,
      ),
    ).toHaveLength(1);
  });

  it("records a spoken promise as a claim, not as canonical truth", () => {
    const session = openSession();
    const result = speak(
      session,
      session.fixture.advocatePersonId,
      "offer-targeted-provision",
    );
    const claim = session.world.history.claims.at(-1)!;
    expect(claim.speakerPersonId).toBe(result.semantic.responseSpeakerPersonId);
    expect(claim.relationshipToTruth).toBe("unknown");
    // Nothing about the bill itself changed because somebody said something.
    expect(
      currentProvisionByKey(
        session.world,
        session.fixture.measureId,
        REQUESTED_PROVISION_KEY,
      ),
    ).toBeNull();
  });
});

// 10 -------------------------------------------------------------------------
describe("refusing, deferring and countering for a reason", () => {
  it("answers a cold request with a condition it can actually check", () => {
    const session = openSession();
    const result = speak(
      session,
      session.fixture.guardianPersonId,
      "request-support",
    );
    const commitment = measureCommitments(
      session.world,
      session.fixture.measureId,
    ).at(-1)!;
    // Whatever this member decides, they do not hand over an unconditional yes.
    expect(commitment.firmness).not.toBe("explicit");
    if (commitment.stance === "support-if") {
      expect(
        commitment.conditions.map((condition) => condition.kind),
      ).toContain("fiscal-ceiling");
    } else {
      expect(commitment.stance).toBe("keep-options-open");
      expect(commitment.firmness).toBe("noncommittal");
    }
    expectNoDeveloperLeak(result.presentation.beat!.dialogue);
  });

  it("will not be pinned down after being told no on its own ask", () => {
    const session = openSession();
    speak(session, session.fixture.guardianPersonId, "refuse-request");
    const result = speak(
      session,
      session.fixture.guardianPersonId,
      "request-support",
    );
    expect(result.semantic.outcome).toBe("position-explained");
    const commitment = measureCommitments(
      session.world,
      session.fixture.measureId,
    ).at(-1)!;
    expect(commitment.stance).toBe("keep-options-open");
    expect(commitment.firmness).toBe("noncommittal");
    // The refusal is why, and it is a fact in the record rather than a mood.
    expect(
      measureNegotiations(session.world, session.fixture.measureId).some(
        (negotiation) => negotiation.disposition === "refused",
      ),
    ).toBe(true);
    expectNoDeveloperLeak(result.presentation.beat!.dialogue);
  });

  it("remembers a refusal and answers differently afterwards", () => {
    const session = openSession();
    speak(session, session.fixture.advocatePersonId, "refuse-request");
    const refusal = measureNegotiations(
      session.world,
      session.fixture.measureId,
    ).at(-1)!;
    expect(refusal.disposition).toBe("refused");

    const after = speak(
      session,
      session.fixture.advocatePersonId,
      "counter-with-cap",
    );
    expect(after.semantic.outcome).toBe("proposal-countered");
  });
});

// 11, 12 ---------------------------------------------------------------------
describe("bargaining and bribery are different acts", () => {
  it("accepts a targeted-benefit bargain without calling it corruption", () => {
    const session = openSession();
    speak(
      session,
      session.fixture.advocatePersonId,
      "offer-targeted-provision",
    );
    const negotiation = measureNegotiations(
      session.world,
      session.fixture.measureId,
    ).at(-1)!;
    expect(negotiation.character).toBe("targeted-benefit-request");
    expect(negotiation.disposition).toBe("accepted");
    expect(isPersonalInducement(negotiation)).toBe(false);
    expect(describeExchangeCharacter(negotiation.character)).not.toMatch(
      /corrupt|bribe|illegal|improper/i,
    );
    expect(negotiation.request).not.toMatch(/corrupt|bribe/i);
  });

  it("records an offer of personal benefit as its own thing, and refuses it", () => {
    const alone = openSession(createLegislativeBargainingFixture(), "private");
    expect(
      intentKeys(alone, alone.fixture.advocatePersonId, "private"),
    ).toContain("offer-private-inducement");
    // It is not on offer where anyone can hear it.
    expect(
      intentKeys(alone, alone.fixture.advocatePersonId, "normal"),
    ).not.toContain("offer-private-inducement");

    const result = speak(
      alone,
      alone.fixture.advocatePersonId,
      "offer-private-inducement",
      "private",
    );
    expect(result.semantic.outcome).toBe("inducement-refused");
    expect(result.semantic.relationshipConsequence).toBe("strained");
    const negotiation = measureNegotiations(
      alone.world,
      alone.fixture.measureId,
    ).at(-1)!;
    expect(negotiation.character).toBe("personal-inducement");
    expect(isPersonalInducement(negotiation)).toBe(true);
    expect(negotiation.disposition).toBe("refused");
    // No commitment came of it. It bought nothing.
    expect(
      measureCommitments(alone.world, alone.fixture.measureId),
    ).toHaveLength(0);

    // And ordinary bargaining is still possible afterwards, on worse terms.
    const after = speak(
      alone,
      alone.fixture.advocatePersonId,
      "offer-targeted-provision",
      "private",
    );
    expect(after.semantic.outcome).toBe("proposal-countered");
  });
});

// 13 -------------------------------------------------------------------------
describe("determinism", () => {
  it("replays the same session word for word", () => {
    const script = (session: Session) => {
      speak(session, session.fixture.advocatePersonId, "ask-what-they-want");
      speak(session, session.fixture.guardianPersonId, "ask-what-they-want");
      const counter = speak(
        session,
        session.fixture.advocatePersonId,
        "counter-with-cap",
      );
      const support = speak(
        session,
        session.fixture.advocatePersonId,
        "request-support",
      );
      return [
        counter.presentation.beat!.dialogue,
        support.presentation.beat!.dialogue,
        support.semantic.outcome,
      ];
    };
    expect(script(openSession())).toEqual(script(openSession()));
  });

  it("survives save and reload with the same canonical record", () => {
    const session = openSession();
    speak(
      session,
      session.fixture.advocatePersonId,
      "offer-targeted-provision",
    );
    const amended = offerNegotiatedAmendment(
      session.world,
      session.fixture,
      session.progress,
      "capped",
    );
    const restored = deserializeWorld(serializeWorld(amended.world));
    expect(
      currentMeasureProvisions(restored, session.fixture.measureId).map(
        (provision) => provision.stableKey,
      ),
    ).toEqual(
      currentMeasureProvisions(amended.world, session.fixture.measureId).map(
        (provision) => provision.stableKey,
      ),
    );
    expect(
      measureCommitments(restored, session.fixture.measureId).map(
        (commitment) => commitment.stableKey,
      ),
    ).toEqual(
      measureCommitments(amended.world, session.fixture.measureId).map(
        (commitment) => commitment.stableKey,
      ),
    );
  });
});

// 14 -------------------------------------------------------------------------
describe("the institution still works", () => {
  it("keeps measure integrity, rule packs and vote arithmetic green", () => {
    const session = openSession();
    speak(
      session,
      session.fixture.advocatePersonId,
      "offer-targeted-provision",
    );
    const amended = offerNegotiatedAmendment(
      session.world,
      session.fixture,
      session.progress,
      "as-asked",
    );
    const vote = takeNegotiatedFloorVote(
      amended.world,
      session.fixture,
      session.progress,
    );
    assertWorldIntegrity(vote.world);

    const recorded = (vote.world.history.legislativeVotes ?? []).at(-1)!;
    const counted =
      recorded.tally.yea +
      recorded.tally.nay +
      recorded.tally.presentNotVoting +
      recorded.tally.absent +
      recorded.tally.excused;
    expect(counted).toBe(recorded.dispositions.length);
    expect(recorded.provenance.method).toBe("member-decisions");
    expect(recorded.provenance.sourceEntityIds).not.toHaveLength(0);
  });
});

// 15 -------------------------------------------------------------------------
describe("nothing developer-facing reaches the player", () => {
  it("keeps every line of a whole run free of enums and scores", () => {
    const session = openSession();
    const lines: string[] = [];
    for (const [addressee, intent] of [
      [session.fixture.advocatePersonId, "ask-what-they-want"],
      [session.fixture.guardianPersonId, "ask-what-they-want"],
      [session.fixture.advocatePersonId, "counter-with-cap"],
      [session.fixture.guardianPersonId, "listen"],
      [session.fixture.advocatePersonId, "request-support"],
      [session.fixture.advocatePersonId, "remind-of-commitment"],
    ] as const) {
      const result = speak(session, addressee, intent);
      lines.push(result.presentation.beat?.dialogue ?? "");
      lines.push(result.presentation.playerIntentLabel);
      lines.push(result.presentation.hearingDescription);
    }
    for (const line of lines) expectNoDeveloperLeak(line);
    // Every beat is somebody speaking, not a status readout.
    expect(lines.filter((line) => line.includes("“")).length).toBeGreaterThan(
      4,
    );
  });

  it("gates the fiscal note on the player actually reading it", () => {
    const fixture = createLegislativeBargainingFixture();
    expect(playerHasReadFiscalNote(fixture.world, fixture)).toBe(false);
    const read = reviewFiscalNote(fixture.world, fixture);
    expect(playerHasReadFiscalNote(read, fixture)).toBe(true);
    // Reading it twice is not two facts.
    expect(reviewFiscalNote(read, fixture)).toBe(read);
    assertWorldIntegrity(read);
  });
});

// Dialogue content ------------------------------------------------------------
describe("the motif layer", () => {
  const facts: LegislativeMotifFacts = {
    speaker: "Hollis",
    listener: "Ward",
    designation: "HB 214",
    shortTitle: "Transit Access Pilot",
    sectionLabel: "Section 4",
    sectionHeading: "Local project match",
    reach: "language reaching every eligible rider",
    beneficiary: "the Ashland–Boyd County Transit Authority",
    place: "Ashland",
    amount: "$1,400,000",
    billAmount: "$9,400,000",
    analyst: "Rowe",
    chamber: "House of Representatives",
    nextStep: "third reading",
    priorStatement: "“Fix Section 4 and I'm with you.”",
  };

  it("has a usable line for every family and voice, from the bill alone", () => {
    const bare: LegislativeMotifFacts = {
      ...facts,
      beneficiary: null,
      place: null,
      amount: null,
      billAmount: null,
      priorStatement: null,
    };
    for (const family of motifFamilies()) {
      for (const voice of [
        "district-advocate",
        "fiscal-guardian",
        "implementation-realist",
        "procedural-institutionalist",
      ] as const) {
        const line = legislativeMotifLine({
          family,
          voice,
          audience: "limited",
          priorFamily: null,
          variantSeed: `${family}:${voice}`,
          facts: bare,
        });
        expect(line.length, `${family}/${voice}`).toBeGreaterThan(20);
        expectNoDeveloperLeak(line);
      }
    }
  });

  it("gives two members different words for the same move", () => {
    const shared = { audience: "limited", priorFamily: null, facts } as const;
    const advocate = legislativeMotifLine({
      ...shared,
      family: "qualified-commitment",
      voice: "district-advocate",
      variantSeed: "same-turn",
    });
    const guardian = legislativeMotifLine({
      ...shared,
      family: "qualified-commitment",
      voice: "fiscal-guardian",
      variantSeed: "same-turn",
    });
    expect(advocate).not.toBe(guardian);
    expect(advocate).toContain("Ashland");
    expect(guardian).toMatch(/\$/);
  });

  it("never offers a line whose facts are missing", () => {
    const keys = eligibleMotifVariantKeys({
      family: "offer-targeted-provision",
      voice: "fiscal-guardian",
      audience: "limited",
      priorFamily: null,
      variantSeed: "seed",
      facts: { ...facts, amount: null },
    });
    expect(keys).not.toContain("capped");
  });
});
