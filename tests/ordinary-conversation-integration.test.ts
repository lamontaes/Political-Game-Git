import { acceptedMainComparableReplay } from "./support/opening-conversation-control";
import { createNewGameWorld } from "../src/presentation/new-game";
import { openOrdinaryLife } from "../src/presentation/ordinary-life";
import { describe, expect, it } from "vitest";
import {
  ordinaryConversationFingerprint,
  ordinaryConversationReplayRecords,
} from "./support/ordinary-conversation-replay";

const EXTERNAL_MAIN_CONTROL = {
  householdFrontier: 70,
  officeFrontier: 45,
  wordingSha256: {
    household:
      "3c12e38338bc3797d7a62012080be38cb1666fe991ffba802cd91654f563f9ee",
    householdCallback:
      "d8f8539db8b9e10ea37edc56e4f40e98688fb21b03c6912d863534c3cf8f04d0",
    office: "a71767cac5d461a0dee9b984b80b2539b87ece30d224f89629fb3435e4311365",
  },
} as const;

// P2R2 deliberately creates twelve more records before an ordinary household
// conversation. That moves the deterministic history frontier from 70 to 82,
// so IDs, stable keys, sequences and their references must move together even
// though the conversation wording is unchanged. Keep those two facts under
// separate controls: refreshing one opaque hash would hide which contract moved.
const EXPECTED_P2_IDENTITY = {
  household: "5b96fd286949de9fe8805c81ecc750dac7baf7de1d3bf12086c8b5d5f3684488",
  householdCallback:
    "42deda9c1e7e28fbe16e33cda97325867fd1bfad6a4fcc43e18bf1c3ef19af74",
  office: "12855dcb5da500fa40c6fab8455b0730b7a85b7627cf4258745ad4448966030f",
} as const;

const EXPECTED_COUNTS = {
  household: {
    relationship: 2,
    commitment: 1,
    aftermath: 0,
    landed: 2,
    turns: 2,
  },
  householdCallback: {
    relationship: 2,
    commitment: 1,
    aftermath: 1,
    landed: 2,
    turns: 2,
  },
  office: {
    relationship: 1,
    commitment: 0,
    aftermath: 0,
    landed: 2,
    turns: 2,
  },
} as const;

describe("PR79 optional consequence hook preserves ordinary subjects", () => {
  it("accounts explicitly for P2R2 initialization while preserving wording", () => {
    const current = ordinaryConversationReplayRecords();
    expect(current.household.initialNextSequence).toBe(112);
    expect(current.householdCallback.initialNextSequence).toBe(112);
    const replay = acceptedMainComparableReplay(current);
    const household = ordinaryConversationFingerprint(replay.household);
    const householdCallback = ordinaryConversationFingerprint(
      replay.householdCallback,
    );
    const office = ordinaryConversationFingerprint(replay.office);

    expect(
      replay.household.initialNextSequence -
        EXTERNAL_MAIN_CONTROL.householdFrontier,
    ).toBe(12);
    expect(replay.householdCallback.initialNextSequence).toBe(82);
    expect(replay.office.initialNextSequence).toBe(
      EXTERNAL_MAIN_CONTROL.officeFrontier,
    );
    expect([
      replay.household.finalNextSequence,
      replay.householdCallback.finalNextSequence,
      replay.office.finalNextSequence,
    ]).toEqual([97, 100, 65]);

    expect(household).toEqual({
      counts: EXPECTED_COUNTS.household,
      identitySha256: EXPECTED_P2_IDENTITY.household,
      wordingSha256: EXTERNAL_MAIN_CONTROL.wordingSha256.household,
    });
    expect(householdCallback).toEqual({
      counts: EXPECTED_COUNTS.householdCallback,
      identitySha256: EXPECTED_P2_IDENTITY.householdCallback,
      wordingSha256: EXTERNAL_MAIN_CONTROL.wordingSha256.householdCallback,
    });
    expect(office).toEqual({
      counts: EXPECTED_COUNTS.office,
      identitySha256: EXPECTED_P2_IDENTITY.office,
      wordingSha256: EXTERNAL_MAIN_CONTROL.wordingSha256.office,
    });
  });

  it("keeps every generated identity joined to the record it references", () => {
    const replay = ordinaryConversationReplayRecords();

    for (const household of [replay.household, replay.householdCallback]) {
      const eventIds = new Set(
        household.records.landed.map((event) => event.id),
      );
      const commitmentIds = new Set(
        household.records.commitment.map((commitment) => commitment.id),
      );

      for (const relationship of household.records.relationship) {
        expect(eventIds.has(relationship.eventId)).toBe(true);
        expect(relationship.stableKey).toContain("frontier-112");
      }
      for (const commitment of household.records.commitment) {
        expect(eventIds.has(commitment.provenance.eventId)).toBe(true);
        expect(commitment.stableKey).toContain("frontier-112");
      }
      for (const due of household.records.aftermath) {
        const referencedEvents = due.entityIds.filter((id) =>
          id.startsWith("event_"),
        );
        expect(referencedEvents.length).toBeGreaterThan(0);
        expect(referencedEvents.every((id) => eventIds.has(id))).toBe(true);
        expect(
          due.provenance.sourceEntityIds.every((id) => eventIds.has(id)),
        ).toBe(true);
        expect(due.stableKey).toContain("frontier-112");
      }
      for (const turn of household.records.turns) {
        const commitmentId = turn.semantic.commitmentId;
        if (commitmentId !== null) {
          expect(commitmentIds.has(commitmentId)).toBe(true);
        }
        expect(turn.semantic.turnKey).toContain("frontier-112");
      }
    }
  });

  it("detects corrupt identities and references without reporting wording drift", () => {
    const replay = ordinaryConversationReplayRecords().household;
    const expected = ordinaryConversationFingerprint(replay);

    const corruptId = structuredClone(replay);
    corruptId.records.landed[0]!.id = "event_corrupt_identity";
    const corruptIdFingerprint = ordinaryConversationFingerprint(corruptId);
    expect(corruptIdFingerprint.identitySha256).not.toBe(
      expected.identitySha256,
    );
    expect(corruptIdFingerprint.wordingSha256).toBe(expected.wordingSha256);

    const corruptReference = structuredClone(replay);
    corruptReference.records.relationship[0]!.eventId =
      "event_missing_reference";
    const corruptReferenceFingerprint =
      ordinaryConversationFingerprint(corruptReference);
    expect(corruptReferenceFingerprint.identitySha256).not.toBe(
      expected.identitySha256,
    );
    expect(corruptReferenceFingerprint.wordingSha256).toBe(
      expected.wordingSha256,
    );
  });

  it("detects unexpected wording without reporting identity drift", () => {
    const replay = ordinaryConversationReplayRecords().household;
    const expected = ordinaryConversationFingerprint(replay);
    const corruptWording = structuredClone(replay);
    corruptWording.records.relationship[0]!.summary += " Unexpected wording.";

    const corruptWordingFingerprint =
      ordinaryConversationFingerprint(corruptWording);
    expect(corruptWordingFingerprint.identitySha256).toBe(
      expected.identitySha256,
    );
    expect(corruptWordingFingerprint.wordingSha256).not.toBe(
      expected.wordingSha256,
    );
  });
});

it("accounts for the thirty versioned OPENING records and the actual canonical name", () => {
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "pr79-ordinary-baseline",
    givenName: null,
    familyName: null,
  });
  const world = openOrdinaryLife(game.world, game.playerPersonId);
  const groups = [
    world.history.personalityTendencies,
    world.history.personalValues,
    world.history.goalStates,
  ].map((rows) =>
    rows.filter((row) => row.stableKey.includes("opening-life-mind-v1")),
  );
  expect(groups.map((rows) => rows.length)).toEqual([10, 15, 5]);
  expect(new Set(groups.flat().map((row) => row.personId)).size).toBe(5);
  expect(world.people["person_159b46fda48b2fea"]?.givenName).toBe("Donna");
});

it("refuses unaccounted corruption before applying the explicit OPENING delta", () => {
  for (const kind of ["identity", "reference", "wording"] as const) {
    const corrupt = ordinaryConversationReplayRecords();
    if (kind === "identity")
      corrupt.household.records.landed[0]!.id = "event_corrupt_identity";
    if (kind === "reference")
      corrupt.household.records.relationship[0]!.eventId =
        "event_missing_reference";
    if (kind === "wording")
      corrupt.household.records.relationship[0]!.summary +=
        " Unexpected wording.";
    expect(() => acceptedMainComparableReplay(corrupt)).toThrow(
      "Unexpected OPENING leaf",
    );
  }
});
