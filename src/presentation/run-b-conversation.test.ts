import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
  type World,
} from "../simulation";
import { RUN_A_HIDDEN_CANONICAL_TEXT } from "./run-a-fixture";
import {
  createRunAUiState,
  resolveRunAPinSize,
  runAUiReducer,
} from "./run-a-state";
import {
  availableConversationIntents,
  commitConversationTurn,
  conversationRole,
  createConversationSessionDescriptor,
  describeRunBBriefingContext,
  describeConversationHearing,
  openingConversationBeat,
  resolveConversationListeners,
  type CommitConversationTurnInput,
  type ConversationAddressee,
  type ConversationAudibility,
  type ConversationIntent,
} from "./run-b-conversation";
import {
  canListenToRunBConversation,
  createRunBConversationProgress,
} from "./run-b-conversation-progress";
import {
  createRunBConversationState,
  runBConversationReducer,
  type RunBConversationState,
} from "./run-b-conversation-state";
import { createRunBFixture } from "./run-b-fixture";
import { validateRunBSceneLayouts } from "./run-b-layout";

function setup() {
  const fixture = createRunBFixture();
  const progress = createRunBConversationProgress();
  const session = createConversationSessionDescriptor(
    fixture.world,
    fixture.roomContext,
  );
  return { fixture, progress, session };
}

function commit(
  overrides: Partial<
    Pick<
      CommitConversationTurnInput,
      "turnOrdinal" | "addressee" | "audibility" | "intent"
    >
  > = {},
) {
  const { fixture, progress, session } = setup();
  return {
    fixture,
    session,
    result: commitConversationTurn(fixture.world, {
      session,
      room: fixture.roomContext,
      progress,
      turnOrdinal: overrides.turnOrdinal ?? 1,
      addressee: overrides.addressee ?? fixture.scenePeople[0].personId,
      audibility: overrides.audibility ?? "normal",
      intent: overrides.intent ?? "request-commitment",
    }),
  };
}

function openState(
  world: World,
  addressee: ConversationAddressee,
): RunBConversationState {
  const fixture = createRunBFixture();
  const progress = createRunBConversationProgress();
  return runBConversationReducer(createRunBConversationState(), {
    type: "open",
    session: createConversationSessionDescriptor(world, fixture.roomContext),
    progress,
    addressee,
    openingBeat: openingConversationBeat(
      world,
      fixture.roomContext,
      addressee,
      progress,
    ),
  });
}

describe("Stage 6.5 Run B conversation semantics", () => {
  it("builds a deterministic controlled-player plus two-NPC room fixture", () => {
    const first = createRunBFixture();
    const second = createRunBFixture();

    expect(first).toEqual(second);
    expect(first.scenePeople).toHaveLength(2);
    expect(
      new Set(first.scenePeople.map((person) => person.personId)).size,
    ).toBe(2);
    expect(first.roomContext.physicallyPresentPersonIds).toEqual([
      first.playerPersonId,
      first.scenePeople[0].personId,
      first.scenePeople[1].personId,
    ]);
    expect(first.roomContext.activeParticipantPersonIds).toEqual(
      first.roomContext.physicallyPresentPersonIds,
    );
    expect(first.world.control).toEqual({
      kind: "person",
      personId: first.playerPersonId,
    });
    expect(first.world.people[first.playerPersonId]).toMatchObject({
      givenName: "Cameron",
      familyName: "Foster",
    });
    expect(first.scenePeople.map((person) => person.personId)).not.toContain(
      first.playerPersonId,
    );
  });

  it("generalizes presentation-only person pinning without duplicates or stale manual size", () => {
    const fixture = createRunBFixture();
    const reedId = fixture.scenePeople[1].personId;
    let state = createRunAUiState({
      simulationDate: fixture.world.currentDate,
      simulationActionSequence: fixture.world.actionSequence,
      scenePersonId: fixture.scenePeople[0].personId,
      fixtureState: "normal",
    });

    state = runAUiReducer(state, {
      type: "pin-person",
      personId: reedId,
      pinId: "person-b",
    });
    const pinnedOnce = state;
    state = runAUiReducer(state, {
      type: "pin-person",
      personId: reedId,
      pinId: "person-b",
    });
    expect(state).toBe(pinnedOnce);
    expect(state.pinnedPersonIds).toEqual([
      fixture.scenePeople[0].personId,
      reedId,
    ]);
    expect(resolveRunAPinSize(state, "person-b")).toBe("normal");

    state = runAUiReducer(state, {
      type: "set-pin-size",
      pinId: "person-b",
      size: "expanded",
    });
    state = runAUiReducer(state, {
      type: "set-automatic-pin-size",
      pinId: "person-b",
      size: "tiny",
    });
    expect(resolveRunAPinSize(state, "person-b")).toBe("expanded");
    state = runAUiReducer(state, {
      type: "toggle-pin-controls",
      pinId: "person-b",
    });
    state = runAUiReducer(state, {
      type: "unpin-person",
      personId: reedId,
      pinId: "person-b",
    });
    expect(state.pinnedPersonIds).toEqual([fixture.scenePeople[0].personId]);
    expect(state.activePinMenuId).toBeNull();
    expect(state.manualPinSizes["person-b"]).toBeUndefined();

    state = runAUiReducer(state, {
      type: "pin-person",
      personId: reedId,
      pinId: "person-b",
    });
    expect(
      state.pinnedPersonIds.filter((personId) => personId === reedId),
    ).toHaveLength(1);
    expect(resolveRunAPinSize(state, "person-b")).toBe("normal");
    expect(fixture.world.history.nextSequence).toBe(
      createRunBFixture().world.history.nextSequence,
    );
  });

  it("keeps the two NPCs on separate valid visual-estimate scene anchors", () => {
    const fixture = createRunBFixture();
    expect(fixture.scenePeople.map((person) => person.anchorId)).toEqual([
      "primary-desk-chair",
      "left-guest-chair",
    ]);
    expect(validateRunBSceneLayouts()).toEqual([]);
  });

  it("never permits the controlled person to become an autonomous NPC decision actor", () => {
    const fixture = createRunBFixture();
    const malformedRoom = {
      ...fixture.roomContext,
      eligibleAddresseePersonIds: [fixture.playerPersonId],
    };
    expect(() =>
      createConversationSessionDescriptor(fixture.world, malformedRoom),
    ).toThrow("controlled person cannot be a conversation addressee");
  });

  it("opens a conversation without mutating World", () => {
    const { fixture } = setup();
    const before = serializeWorld(fixture.world);
    const session = createConversationSessionDescriptor(
      fixture.world,
      fixture.roomContext,
    );
    const progress = createRunBConversationProgress();
    const state = runBConversationReducer(createRunBConversationState(), {
      type: "open",
      session,
      progress,
      addressee: fixture.scenePeople[0].personId,
      openingBeat: openingConversationBeat(
        fixture.world,
        fixture.roomContext,
        fixture.scenePeople[0].personId,
        progress,
      ),
    });
    expect(state.mode).toBe("open");
    expect(serializeWorld(fixture.world)).toBe(before);
  });

  it("establishes the bounded briefing problem before intent selection", () => {
    const fixture = createRunBFixture();
    const progress = createRunBConversationProgress();
    const opening = openingConversationBeat(
      fixture.world,
      fixture.roomContext,
      fixture.scenePeople[0].personId,
      progress,
    );
    const briefing = describeRunBBriefingContext(
      fixture.world,
      fixture.roomContext,
      progress,
    );
    const visibleContext = `${briefing} ${opening.dialogue}`;
    expect(progress.subjectFacts).toMatchObject({
      constituentDescription: "three Lexington tenants",
      officeRole: "constituent-services referral",
      referralDestination: "county emergency-rent program",
      requiredDocument: "proof-of-income form",
      knownAffectedReferralCount: 2,
      unresolvedReferralOrdinal: 3,
      proposedOfficeProcedure: "pre-referral document checklist",
    });
    expect(briefing).toMatch(
      /Three Lexington tenants.*this office.*emergency-rent help/i,
    );
    expect(briefing).toMatch(
      /county could not process two referrals.*proof-of-income form/i,
    );
    expect(briefing).toMatch(/Reed is checking the third/i);
    expect(briefing).toMatch(
      /Collins should back a document checklist before future referrals/i,
    );
    expect(visibleContext).toMatch(
      /county could not process.*proof-of-income form.*Reed finds the third county referral.*back one document checklist.*future referrals/i,
    );
    expect(visibleContext).not.toMatch(/referral gap/i);
    expect(
      availableConversationIntents(
        fixture.world,
        fixture.roomContext,
        fixture.scenePeople[0].personId,
        progress,
      ).map((intent) => [intent.key, intent.label]),
    ).toContainEqual([
      "request-commitment",
      "Ask Collins to back the referral checklist",
    ]);
    expect(
      availableConversationIntents(
        fixture.world,
        fixture.roomContext,
        fixture.scenePeople[1].personId,
        progress,
      ).map((intent) => [intent.key, intent.label]),
    ).toContainEqual([
      "request-commitment",
      "Ask Reed to check the third referral",
    ]);
    const everyoneIntents = availableConversationIntents(
      fixture.world,
      fixture.roomContext,
      "everyone",
      progress,
    );
    expect(everyoneIntents.map((intent) => intent.label)).toContain(
      "Ask Reed to check and Collins to decide",
    );
    expect(everyoneIntents.map((intent) => intent.label)).toContain(
      "Limit the checklist to proof-of-income forms",
    );
    expect(
      everyoneIntents.map((intent) => intent.description).join(" "),
    ).toMatch(/third referral.*staff checklist/i);
  });

  it("switches NPC A, NPC B, and Everyone without restarting or mutating World", () => {
    const { fixture, session } = setup();
    const before = serializeWorld(fixture.world);
    let state = openState(fixture.world, fixture.scenePeople[0].personId);

    for (const addressee of [
      fixture.scenePeople[1].personId,
      "everyone" as const,
      fixture.scenePeople[0].personId,
    ]) {
      state = runBConversationReducer(state, {
        type: "switch-addressee",
        addressee,
        openingBeat: openingConversationBeat(
          fixture.world,
          fixture.roomContext,
          addressee,
          state.progress!,
        ),
      });
      expect(state.session?.sessionKey).toBe(session.sessionKey);
      expect(state.addressee).toBe(addressee);
    }
    expect(serializeWorld(fixture.world)).toBe(before);
  });

  it("preserves briefing continuity across Collins, Reed, Everyone, and back to an individual", () => {
    const { fixture, progress, session } = setup();
    const collinsId = fixture.scenePeople[0].personId;
    const reedId = fixture.scenePeople[1].personId;
    const collinsTurn = commitConversationTurn(fixture.world, {
      session,
      room: fixture.roomContext,
      progress,
      turnOrdinal: 1,
      addressee: collinsId,
      audibility: "normal",
      intent: "request-commitment",
    });
    expect(collinsTurn.progress.collinsSupport).toBe("conditional");

    const reedContinuation = openingConversationBeat(
      collinsTurn.world,
      fixture.roomContext,
      reedId,
      collinsTurn.progress,
    );
    expect(reedContinuation.dialogue).toMatch(
      /Collins needs the third referral checked.*proof-of-income form was missing/,
    );
    expect(reedContinuation.dialogue).not.toMatch(/first two.*point/i);

    const reedTurn = commitConversationTurn(collinsTurn.world, {
      session,
      room: fixture.roomContext,
      progress: collinsTurn.progress,
      turnOrdinal: 2,
      addressee: reedId,
      audibility: "normal",
      intent: "request-commitment",
    });
    expect(reedTurn.progress.reedVerification).toBe("promised");

    const everyoneContinuation = openingConversationBeat(
      reedTurn.world,
      fixture.roomContext,
      "everyone",
      reedTurn.progress,
    );
    expect(everyoneContinuation.dialogue).toMatch(
      /Reed will check.*third county referral.*proof-of-income form.*decide on the staff checklist/,
    );

    const groupTurn = commitConversationTurn(reedTurn.world, {
      session,
      room: fixture.roomContext,
      progress: reedTurn.progress,
      turnOrdinal: 3,
      addressee: "everyone",
      audibility: "normal",
      intent: "reassure",
    });
    const collinsContinuation = openingConversationBeat(
      groupTurn.world,
      fixture.roomContext,
      collinsId,
      groupTurn.progress,
    );
    expect(collinsContinuation.dialogue).toMatch(
      /Reed is checking the third county referral.*proof-of-income form.*answer on the staff checklist/,
    );
    expect(groupTurn.progress.latestProposition).toBe(
      "keep-recommendation-narrow",
    );
  });

  it("switches audibility without mutating World", () => {
    const { fixture } = setup();
    const before = serializeWorld(fixture.world);
    let state = openState(fixture.world, fixture.scenePeople[0].personId);
    for (const audibility of ["quiet", "normal"] as const) {
      state = runBConversationReducer(state, {
        type: "set-audibility",
        audibility,
      });
      expect(state.audibility).toBe(audibility);
    }
    expect(serializeWorld(fixture.world)).toBe(before);
  });

  it("opens and closes the transcript without mutating World", () => {
    const { fixture } = setup();
    const before = serializeWorld(fixture.world);
    const opened = runBConversationReducer(
      openState(fixture.world, fixture.scenePeople[0].personId),
      { type: "toggle-transcript" },
    );
    const closed = runBConversationReducer(opened, {
      type: "toggle-transcript",
    });
    expect(opened.transcriptOpen).toBe(true);
    expect(closed.transcriptOpen).toBe(false);
    expect(serializeWorld(fixture.world)).toBe(before);
  });

  it("collapses and closes conversation UI without mutating World", () => {
    const { fixture } = setup();
    const before = serializeWorld(fixture.world);
    const collapsed = runBConversationReducer(
      openState(fixture.world, fixture.scenePeople[0].personId),
      { type: "toggle-collapsed" },
    );
    const closed = runBConversationReducer(collapsed, { type: "close" });
    expect(collapsed.mode).toBe("collapsed");
    expect(closed).toEqual(createRunBConversationState());
    expect(serializeWorld(fixture.world)).toBe(before);
  });

  it("commits same-date canonical history without changing date or action sequence", () => {
    const { fixture, result } = commit();
    expect(result.world.history.nextSequence).toBeGreaterThan(
      fixture.world.history.nextSequence,
    );
    expect(result.world.currentDate).toBe(fixture.world.currentDate);
    expect(result.world.actionSequence).toBe(fixture.world.actionSequence);
    const event = result.world.history.events.at(-1)!;
    expect(event.type).toBe("conversation.office-turn");
    expect(event.occurredAt).toBe(fixture.world.currentDate);
    expect(event.recordedAt).toBe(fixture.world.currentDate);
  });

  it("orders same-day turns through history sequence and records durable decisions first", () => {
    const { result } = commit();
    const event = result.world.history.events.at(-1)!;
    const trace = result.world.history.decisionTraces.at(-1)!;
    const claim = result.world.history.claims.at(-1)!;
    expect(trace.context.actorPersonId).toBe(
      result.semantic.responseSpeakerPersonId,
    );
    expect(trace.sequence).toBeLessThan(event.sequence);
    expect(event.sequence).toBeLessThan(claim.sequence);
    expect(trace.recordedAt).toBe(event.occurredAt);
    expect(result.world.actionSequence).toBe(0);
  });

  it("uses unique stable turn keys and rejects duplicate committed submission", () => {
    const { fixture, session } = setup();
    const first = commitConversationTurn(fixture.world, {
      session,
      room: fixture.roomContext,
      turnOrdinal: 1,
      addressee: fixture.scenePeople[0].personId,
      audibility: "normal",
      intent: "request-commitment",
    });
    expect(() =>
      commitConversationTurn(first.world, {
        session,
        room: fixture.roomContext,
        turnOrdinal: 1,
        addressee: fixture.scenePeople[1].personId,
        audibility: "quiet",
        intent: "reassure",
      }),
    ).toThrow("already committed");
    const second = commitConversationTurn(first.world, {
      session,
      room: fixture.roomContext,
      turnOrdinal: 2,
      addressee: fixture.scenePeople[1].personId,
      audibility: "quiet",
      intent: "reassure",
    });
    expect(second.semantic.turnKey).not.toBe(first.semantic.turnKey);
  });

  it("replays identical World, session, intent, dialogue, and history exactly", () => {
    const first = commit().result;
    const second = commit().result;
    expect(first.semantic).toEqual(second.semantic);
    expect(first.progress).toEqual(second.progress);
    expect(first.presentation).toEqual(second.presentation);
    expect(serializeWorld(first.world)).toBe(serializeWorld(second.world));
  });

  it("resolves different listener sets for Normal and Quiet", () => {
    const { fixture } = setup();
    const addressee = fixture.scenePeople[0].personId;
    expect(
      resolveConversationListeners(fixture.roomContext, addressee, "normal"),
    ).toEqual([
      fixture.scenePeople[0].personId,
      fixture.scenePeople[1].personId,
    ]);
    expect(
      resolveConversationListeners(fixture.roomContext, addressee, "quiet"),
    ).toEqual([fixture.scenePeople[0].personId]);
    expect(
      describeConversationHearing(
        fixture.world,
        fixture.roomContext,
        addressee,
        "normal",
      ),
    ).toContain("Reed is nearby");
    expect(
      describeConversationHearing(
        fixture.world,
        fixture.roomContext,
        addressee,
        "quiet",
      ),
    ).toContain("do not expect Reed to catch the details");
  });

  it("makes Private unavailable in the occupied office and explains why", () => {
    const { fixture } = setup();
    expect(fixture.roomContext.privateAvailable).toBe(false);
    expect(() =>
      resolveConversationListeners(
        fixture.roomContext,
        fixture.scenePeople[0].personId,
        "private",
      ),
    ).toThrow("Reed remains within plausible earshot");
    expect(
      describeConversationHearing(
        fixture.world,
        fixture.roomContext,
        fixture.scenePeople[0].personId,
        "private",
      ),
    ).toContain("Private isn't possible");
  });

  it("supports a separate deterministic context where Private is genuine", () => {
    const fixture = createRunBFixture();
    const room = fixture.privateCapableRoomContext;
    const session = createConversationSessionDescriptor(fixture.world, room);
    const result = commitConversationTurn(fixture.world, {
      session,
      room,
      turnOrdinal: 1,
      addressee: fixture.scenePeople[0].personId,
      audibility: "private",
      intent: "reassure",
    });
    expect(result.semantic.actualListenerPersonIds).toEqual([
      fixture.scenePeople[0].personId,
    ]);
    expect(result.semantic.claimAudience).toBe("private");
    expect(result.world.history.events.at(-1)?.visibility).toBe("private");
  });

  it("gives normal-hearing bystanders legitimate event and claim consequences", () => {
    const { fixture, result } = commit();
    const bystanderId = fixture.scenePeople[1].personId;
    const event = result.world.history.events.at(-1)!;
    expect(event.participants).toContainEqual({
      personId: bystanderId,
      role: "observation:listener",
      detail: "Was nearby and reasonably heard the exchange",
    });
    const bystanderKnowledge = result.world.history.knowledge.filter(
      (record) =>
        record.personId === bystanderId && record.eventId === event.id,
    );
    expect(
      bystanderKnowledge.map((record) => record.source.kind).sort(),
    ).toEqual(["direct", "told-by"]);
    expect(
      result.world.history.knowledge.some(
        (record) => (record.source as { kind: string }).kind === "overheard",
      ),
    ).toBe(false);
  });

  it("keeps Quiet bystanders out of the canonical listener consequences", () => {
    const { fixture, session } = setup();
    const result = commitConversationTurn(fixture.world, {
      session,
      room: fixture.roomContext,
      turnOrdinal: 1,
      addressee: fixture.scenePeople[0].personId,
      audibility: "quiet",
      intent: "request-commitment",
    });
    const event = result.world.history.events.at(-1)!;
    const bystanderId = fixture.scenePeople[1].personId;
    expect(event.involvedEntityIds).not.toContain(bystanderId);
    expect(
      result.world.history.knowledge.some(
        (record) =>
          record.personId === bystanderId && record.eventId === event.id,
      ),
    ).toBe(false);
  });

  it("keeps a spoken claim distinct from truth and formal political state", () => {
    const { fixture, result } = commit();
    const claim = result.world.history.claims.at(-1)!;
    expect(claim.relationshipToTruth).toBe("unknown");
    expect(result.world.history.publicPositions).toEqual(
      fixture.world.history.publicPositions,
    );
    expect(result.world.history.campaignCommitments).toEqual(
      fixture.world.history.campaignCommitments,
    );
    expect(result.world.history.privateBeliefs).toEqual(
      fixture.world.history.privateBeliefs,
    );
  });

  it("records claim-linked told-by knowledge and heard-claim perception", () => {
    const { fixture, result } = commit();
    const bystanderId = fixture.scenePeople[1].personId;
    const claim = result.world.history.claims.at(-1)!;
    const reception = result.world.history.knowledge.find(
      (record) =>
        record.personId === bystanderId &&
        record.source.kind === "told-by" &&
        record.source.claimId === claim.id,
    );
    expect(reception).toBeDefined();
    expect(
      result.world.history.perceptions.find(
        (record) =>
          record.personId === bystanderId &&
          record.source.kind === "heard-claim" &&
          record.source.claimId === claim.id &&
          record.source.knowledgeId === reception?.id,
      ),
    ).toBeDefined();
  });

  it("does not leak hidden private belief through options, dialogue, or transcript", () => {
    const { fixture, result } = commit();
    const state = runBConversationReducer(
      openState(fixture.world, fixture.scenePeople[0].personId),
      {
        type: "apply-turn",
        turnOrdinal: 1,
        progress: result.progress,
        presentation: result.presentation,
      },
    );
    expect(
      JSON.stringify(
        availableConversationIntents(
          fixture.world,
          fixture.roomContext,
          "everyone",
          createRunBConversationProgress(),
        ),
      ),
    ).not.toContain(RUN_A_HIDDEN_CANONICAL_TEXT);
    expect(JSON.stringify(result.presentation)).not.toContain(
      RUN_A_HIDDEN_CANONICAL_TEXT,
    );
    expect(JSON.stringify(state)).not.toContain(RUN_A_HIDDEN_CANONICAL_TEXT);
  });

  it("keeps relationship consequences qualitative, historical, and event-linked", () => {
    for (const [intent, expected] of [
      ["reassure", "strengthened"],
      ["press", "strained"],
    ] as const) {
      const { result } = commit({ intent });
      const interaction = result.world.history.relationshipInteractions.at(-1)!;
      const event = result.world.history.events.at(-1)!;
      expect(result.semantic.relationshipConsequence).toBe(expected);
      expect(interaction.change).toBe(expected);
      expect(interaction.eventId).toBe(event.id);
      expect(
        interaction.personIds.every((personId) =>
          event.involvedEntityIds.includes(personId),
        ),
      ).toBe(true);
      expect(interaction.occurredAt).toBe(event.occurredAt);
      expect(JSON.stringify(interaction)).not.toMatch(/points|score|meter/i);
    }
  });

  it("lets NPC A, NPC B, and Everyone produce bounded semantic responses", () => {
    const fixture = createRunBFixture();
    for (const addressee of [
      fixture.scenePeople[0].personId,
      fixture.scenePeople[1].personId,
      "everyone" as const,
    ]) {
      const fresh = createRunBFixture();
      const session = createConversationSessionDescriptor(
        fresh.world,
        fresh.roomContext,
      );
      const result = commitConversationTurn(fresh.world, {
        session,
        room: fresh.roomContext,
        turnOrdinal: 1,
        addressee,
        audibility: "normal",
        intent: "request-commitment",
      });
      expect(result.presentation.beat?.dialogue).toMatch(/[“”]/);
      expect(result.semantic.durableDecisionRecorded).toBe(true);
    }
  });

  it("authors outcome-, topic-, addressee-, and prior-turn-coherent briefing dialogue", () => {
    const fixture = createRunBFixture();
    const session = createConversationSessionDescriptor(
      fixture.world,
      fixture.roomContext,
    );
    const asked = commitConversationTurn(fixture.world, {
      session,
      room: fixture.roomContext,
      turnOrdinal: 1,
      addressee: fixture.scenePeople[0].personId,
      audibility: "normal",
      intent: "request-commitment",
    });
    expect(asked.semantic.outcome).toBe("deferred");
    expect(asked.presentation.beat?.dialogue).toMatch(
      /Not yet.*Reed.*third county referral.*proof-of-income form.*staff checklist/,
    );

    const pressed = commitConversationTurn(asked.world, {
      session,
      room: fixture.roomContext,
      progress: asked.progress,
      turnOrdinal: 2,
      addressee: fixture.scenePeople[0].personId,
      audibility: "normal",
      intent: "press",
    });
    expect(pressed.semantic.outcome).toBe("boundary-held");
    expect(pressed.presentation.beat?.dialogue).toMatch(
      /condition hasn’t changed.*Reed.*third county referral.*proof-of-income form.*staff checklist/,
    );

    const groupFixture = createRunBFixture();
    const groupSession = createConversationSessionDescriptor(
      groupFixture.world,
      groupFixture.roomContext,
    );
    const group = commitConversationTurn(groupFixture.world, {
      session: groupSession,
      room: groupFixture.roomContext,
      turnOrdinal: 1,
      addressee: "everyone",
      audibility: "normal",
      intent: "request-commitment",
    });
    expect(group.presentation.beat?.dialogue).toMatch(
      /Reed.*third county referral.*proof-of-income form.*staff checklist/,
    );
    expect(group.semantic.responseSpeakerPersonId).not.toBe(
      groupFixture.playerPersonId,
    );

    const directListenFixture = createRunBFixture();
    const directSession = createConversationSessionDescriptor(
      directListenFixture.world,
      directListenFixture.roomContext,
    );
    const directListen = commitConversationTurn(directListenFixture.world, {
      session: directSession,
      room: directListenFixture.roomContext,
      turnOrdinal: 1,
      addressee: directListenFixture.scenePeople[0].personId,
      audibility: "normal",
      intent: "listen",
    });
    expect(directListen.semantic.responseSpeakerPersonId).toBe(
      directListenFixture.scenePeople[0].personId,
    );
    expect(directListen.presentation.beat?.dialogue).toMatch(
      /third county referral.*proof-of-income form.*document checklist.*Reed is checking/,
    );
  });

  it("allows consecutive Listen turns while distinct NPC contributions remain pending", () => {
    const { fixture, progress, session } = setup();
    const first = commitConversationTurn(fixture.world, {
      session,
      room: fixture.roomContext,
      progress,
      turnOrdinal: 1,
      addressee: "everyone",
      audibility: "normal",
      intent: "listen",
    });
    expect(first.semantic.responseSpeakerPersonId).toBe(
      fixture.scenePeople[0].personId,
    );
    expect(first.presentation.beat?.dialogue).toMatch(
      /third county referral.*proof-of-income form.*document checklist.*Reed is checking/,
    );
    expect(first.progress.pendingContributions).toEqual([
      "reed-offer-verification",
    ]);
    expect(canListenToRunBConversation(first.progress)).toBe(true);

    const second = commitConversationTurn(first.world, {
      session,
      room: fixture.roomContext,
      progress: first.progress,
      turnOrdinal: 2,
      addressee: "everyone",
      audibility: "normal",
      intent: "listen",
    });
    expect(second.semantic.outcome).toBe("bystander-interjected");
    expect(second.semantic.responseSpeakerPersonId).toBe(
      fixture.scenePeople[1].personId,
    );
    expect(second.presentation.beat?.dialogue).toMatch(
      /county received the third referral.*proof-of-income form.*before the briefing/,
    );
    expect(second.progress.reedVerification).toBe("promised");
    expect(second.progress.pendingContributions).toEqual([]);
    expect(canListenToRunBConversation(second.progress)).toBe(true);
    expect(second.presentation.playerActionDescription).toBe("(You listen.)");
    expect(JSON.stringify(second.presentation)).not.toContain("Say nothing");
  });

  it("settles Listen only when no contribution remains and rejects empty repetition", () => {
    const { fixture, progress, session } = setup();
    const first = commitConversationTurn(fixture.world, {
      session,
      room: fixture.roomContext,
      progress,
      turnOrdinal: 1,
      addressee: "everyone",
      audibility: "normal",
      intent: "listen",
    });
    const second = commitConversationTurn(first.world, {
      session,
      room: fixture.roomContext,
      progress: first.progress,
      turnOrdinal: 2,
      addressee: "everyone",
      audibility: "normal",
      intent: "listen",
    });
    const claimCountAfterContributions = second.world.history.claims.length;
    const settled = commitConversationTurn(second.world, {
      session,
      room: fixture.roomContext,
      progress: second.progress,
      turnOrdinal: 3,
      addressee: "everyone",
      audibility: "normal",
      intent: "listen",
    });

    expect(settled.semantic.outcome).toBe("silence-held");
    expect(settled.semantic.responseSpeakerPersonId).toBeNull();
    expect(settled.presentation.beat).toBeNull();
    expect(settled.presentation.roomNarration).toBe(
      "The room settles. No one adds anything yet.",
    );
    expect(settled.world.history.claims).toHaveLength(
      claimCountAfterContributions,
    );
    expect(settled.progress.silenceSettled).toBe(true);
    expect(canListenToRunBConversation(settled.progress)).toBe(false);
    expect(
      availableConversationIntents(
        fixture.world,
        fixture.roomContext,
        "everyone",
        settled.progress,
      ).map((intent) => intent.key),
    ).not.toContain("listen");

    const beforeRejectedListen = serializeWorld(settled.world);
    expect(() =>
      commitConversationTurn(settled.world, {
        session,
        room: fixture.roomContext,
        progress: settled.progress,
        turnOrdinal: 4,
        addressee: "everyone",
        audibility: "normal",
        intent: "listen",
      }),
    ).toThrow("intent listen is unavailable");
    expect(serializeWorld(settled.world)).toBe(beforeRejectedListen);
  });

  it("lets a later player request create a new legitimate Listen opportunity", () => {
    const { fixture, progress, session } = setup();
    const first = commitConversationTurn(fixture.world, {
      session,
      room: fixture.roomContext,
      progress,
      turnOrdinal: 1,
      addressee: "everyone",
      audibility: "normal",
      intent: "listen",
    });
    const second = commitConversationTurn(first.world, {
      session,
      room: fixture.roomContext,
      progress: first.progress,
      turnOrdinal: 2,
      addressee: "everyone",
      audibility: "normal",
      intent: "listen",
    });
    const settled = commitConversationTurn(second.world, {
      session,
      room: fixture.roomContext,
      progress: second.progress,
      turnOrdinal: 3,
      addressee: "everyone",
      audibility: "normal",
      intent: "listen",
    });
    const request = commitConversationTurn(settled.world, {
      session,
      room: fixture.roomContext,
      progress: settled.progress,
      turnOrdinal: 4,
      addressee: fixture.scenePeople[1].personId,
      audibility: "normal",
      intent: "request-commitment",
    });
    expect(request.progress.silenceSettled).toBe(false);
    expect(request.progress.pendingContributions).toEqual([
      "collins-respond-to-reed",
    ]);
    expect(canListenToRunBConversation(request.progress)).toBe(true);

    const followUp = commitConversationTurn(request.world, {
      session,
      room: fixture.roomContext,
      progress: request.progress,
      turnOrdinal: 5,
      addressee: fixture.scenePeople[1].personId,
      audibility: "normal",
      intent: "listen",
    });
    expect(followUp.semantic.responseSpeakerPersonId).toBe(
      fixture.scenePeople[0].personId,
    );
    expect(followUp.presentation.beat?.dialogue).toMatch(
      /Once Reed reports on the third referral.*final answer.*document checklist/,
    );
  });

  it("preserves an unheard Collins contribution under Quiet and resolves it once under Normal", () => {
    const { fixture, progress, session } = setup();
    const collinsId = fixture.scenePeople[0].personId;
    const reedId = fixture.scenePeople[1].personId;
    const request = commitConversationTurn(fixture.world, {
      session,
      room: fixture.roomContext,
      progress,
      turnOrdinal: 1,
      addressee: reedId,
      audibility: "quiet",
      intent: "request-commitment",
    });
    const requestEvent = request.world.history.events.at(-1)!;

    expect(request.semantic.actualListenerPersonIds).toEqual([reedId]);
    expect(request.semantic.responseSpeakerPersonId).toBe(reedId);
    expect(request.progress.pendingContributions).toEqual([
      "collins-respond-to-reed",
    ]);
    expect(requestEvent.involvedEntityIds).not.toContain(collinsId);
    expect(
      request.world.history.knowledge.some(
        (record) =>
          record.personId === collinsId && record.eventId === requestEvent.id,
      ),
    ).toBe(false);

    expect(
      resolveConversationListeners(fixture.roomContext, reedId, "quiet"),
    ).toEqual([reedId]);
    expect(
      availableConversationIntents(
        fixture.world,
        fixture.roomContext,
        reedId,
        request.progress,
        "quiet",
      ).map((intent) => intent.key),
    ).not.toContain("listen");
    const beforeRejectedQuietListen = serializeWorld(request.world);
    expect(() =>
      commitConversationTurn(request.world, {
        session,
        room: fixture.roomContext,
        progress: request.progress,
        turnOrdinal: 2,
        addressee: reedId,
        audibility: "quiet",
        intent: "listen",
      }),
    ).toThrow("intent listen is unavailable");
    expect(serializeWorld(request.world)).toBe(beforeRejectedQuietListen);
    expect(request.progress.pendingContributions).toEqual([
      "collins-respond-to-reed",
    ]);

    expect(
      resolveConversationListeners(fixture.roomContext, reedId, "normal"),
    ).toEqual([collinsId, reedId]);
    expect(
      availableConversationIntents(
        fixture.world,
        fixture.roomContext,
        reedId,
        request.progress,
        "normal",
      ).map((intent) => intent.key),
    ).toContain("listen");
    const normal = commitConversationTurn(request.world, {
      session,
      room: fixture.roomContext,
      progress: request.progress,
      turnOrdinal: 2,
      addressee: reedId,
      audibility: "normal",
      intent: "listen",
    });
    const replay = commitConversationTurn(request.world, {
      session,
      room: fixture.roomContext,
      progress: request.progress,
      turnOrdinal: 2,
      addressee: reedId,
      audibility: "normal",
      intent: "listen",
    });
    const normalEvent = normal.world.history.events.at(-1)!;

    expect(normal.semantic.actualListenerPersonIds).toEqual([
      collinsId,
      reedId,
    ]);
    expect(normal.semantic.responseSpeakerPersonId).toBe(collinsId);
    expect(normal.progress.pendingContributions).toEqual([]);
    expect(normalEvent.participants).toContainEqual({
      personId: collinsId,
      role: "focus:respondent",
      detail: "Gave the recorded response",
    });
    expect(
      normal.world.history.knowledge
        .filter(
          (record) =>
            record.personId === collinsId && record.eventId === normalEvent.id,
        )
        .map((record) => record.source.kind),
    ).toEqual(["direct"]);
    expect(
      normal.world.history.knowledge
        .filter(
          (record) =>
            record.personId === reedId && record.eventId === normalEvent.id,
        )
        .map((record) => record.source.kind)
        .sort(),
    ).toEqual(["direct", "told-by"]);
    expect(
      normal.world.history.claims.filter(
        (claim) =>
          claim.speakerPersonId === collinsId &&
          claim.statement.includes("Once Reed reports on the third referral"),
      ),
    ).toHaveLength(1);
    expect(replay.semantic).toEqual(normal.semantic);
    expect(replay.progress).toEqual(normal.progress);
    expect(serializeWorld(replay.world)).toBe(serializeWorld(normal.world));

    const settled = commitConversationTurn(normal.world, {
      session,
      room: fixture.roomContext,
      progress: normal.progress,
      turnOrdinal: 3,
      addressee: reedId,
      audibility: "normal",
      intent: "listen",
    });
    expect(settled.semantic.responseSpeakerPersonId).toBeNull();
    expect(settled.world.history.claims).toHaveLength(
      normal.world.history.claims.length,
    );
    expect(
      availableConversationIntents(
        fixture.world,
        fixture.roomContext,
        reedId,
        settled.progress,
        "normal",
      ).map((intent) => intent.key),
    ).not.toContain("listen");
  });

  it("fails malformed turns safely and leaves the input World untouched", () => {
    const { fixture, session } = setup();
    const before = serializeWorld(fixture.world);
    expect(() =>
      commitConversationTurn(fixture.world, {
        session: { ...session, sessionKey: `${session.sessionKey}:broken` },
        room: fixture.roomContext,
        turnOrdinal: 1,
        addressee: fixture.scenePeople[0].personId,
        audibility: "normal",
        intent: "request-commitment",
      }),
    ).toThrow("session key is malformed");
    expect(() =>
      commitConversationTurn(fixture.world, {
        session,
        room: fixture.roomContext,
        turnOrdinal: 0,
        addressee: fixture.scenePeople[0].personId,
        audibility: "normal",
        intent: "request-commitment",
      }),
    ).toThrow("positive safe integer");
    expect(serializeWorld(fixture.world)).toBe(before);
  });

  it("keeps all player-facing time date-only with no fabricated minute advance", () => {
    const { result } = commit();
    const visible = JSON.stringify(result.presentation);
    expect(result.world.currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.world.actionSequence).toBe(0);
    expect(visible).not.toMatch(/\+\d+\s*(minute|hour)|elapsed/i);
  });

  it("passes World integrity and exact serialization replay after conversation", () => {
    const { result } = commit();
    expect(() => assertWorldIntegrity(result.world)).not.toThrow();
    const payload = serializeWorld(result.world);
    expect(deserializeWorld(payload)).toEqual(result.world);
    expect(serializeWorld(deserializeWorld(payload))).toBe(payload);
  });

  it("rejects unsupported audibility and unavailable intent combinations", () => {
    const { fixture, session } = setup();
    expect(() =>
      commitConversationTurn(fixture.world, {
        session,
        room: fixture.roomContext,
        turnOrdinal: 1,
        addressee: "everyone",
        audibility: "private",
        intent: "press",
      }),
    ).toThrow();
  });

  it("keeps the audibility vocabulary bounded and free of acoustic simulation", () => {
    const { fixture } = setup();
    const modes: readonly ConversationAudibility[] = [
      "normal",
      "quiet",
      "private",
    ];
    const intents: readonly ConversationIntent[] = [
      "request-commitment",
      "reassure",
      "press",
      "listen",
    ];
    expect(modes).toEqual(["normal", "quiet", "private"]);
    expect(intents).toHaveLength(4);
    expect(JSON.stringify(fixture.roomContext)).not.toMatch(
      /distance|radius|cone|decibel|coordinate/i,
    );
  });
});

describe("generated-person Run B role prose", () => {
  it.each(["player-seed-alpha", "player-seed-beta", "stage-6-5-run-a"])(
    "resolves openings, options, responses, continuation and history from canonical roles: %s",
    (seed) => {
      const fixture = createRunBFixture(seed);
      const { world, roomContext: room } = fixture;
      const lead = world.people[conversationRole(room, "briefing-lead")]!;
      const verifier =
        world.people[conversationRole(room, "referral-verifier")]!;
      const progress = createRunBConversationProgress();
      const briefing = describeRunBBriefingContext(world, room, progress);
      expect(briefing).toContain(`${verifier.familyName} is checking`);
      expect(briefing).toContain(`${lead.familyName} should back`);
      // A verifier who has stepped out is still the same canonical role.
      expect(
        describeRunBBriefingContext(
          world,
          fixture.privateCapableRoomContext,
          progress,
        ),
      ).toBe(briefing);
      const outputs: unknown[] = [briefing];
      for (const addressee of [lead.id, verifier.id, "everyone"] as const) {
        const session = createConversationSessionDescriptor(world, room);
        outputs.push(openingConversationBeat(world, room, addressee, progress));
        const options = availableConversationIntents(
          world,
          room,
          addressee,
          progress,
        );
        outputs.push(options);
        for (const option of options) {
          const result = commitConversationTurn(world, {
            session,
            room,
            progress,
            turnOrdinal: 1,
            addressee,
            audibility: "normal",
            intent: option.key,
          });
          outputs.push(
            result.presentation,
            result.world.history.events.slice(world.history.events.length),
            result.world.history.claims.slice(world.history.claims.length),
          );
          outputs.push(
            openingConversationBeat(
              result.world,
              room,
              addressee,
              result.progress,
            ),
          );
        }
      }
      // Follow all pending contributions and the repeated-pressure path.
      function play() {
        let current = world;
        let currentProgress = progress;
        const session = createConversationSessionDescriptor(world, room);
        const presentation = [];
        for (const [index, intent] of (
          ["listen", "listen", "listen", "request-commitment", "press"] as const
        ).entries()) {
          const result = commitConversationTurn(current, {
            session,
            room,
            progress: currentProgress,
            turnOrdinal: index + 1,
            addressee: lead.id,
            audibility: "normal",
            intent,
          });
          current = result.world;
          if (result.progress.subject !== "shared-intake-checklist")
            throw new Error("Wrong subject");
          currentProgress = result.progress;
          presentation.push(result.presentation);
        }
        return { serialized: serializeWorld(current), presentation };
      }
      const first = play();
      expect(play()).toEqual(first);
      outputs.push(first.presentation);
      expect(JSON.stringify(outputs)).not.toMatch(
        /\b(?:Collins|Reed|Cameron|Foster)\b/,
      );
      expect(world.people[lead.id]).toBe(lead);
    },
  );
});
