import { createHash } from "node:crypto";
import { canonicalJson, type World } from "../../src/simulation";
import { createNewGameWorld } from "../../src/presentation/new-game";
import {
  householdConversationRoom,
  openOrdinaryLife,
} from "../../src/presentation/ordinary-life";
import {
  commitConversationTurn,
  createConversationSessionDescriptor,
  type ConversationRoomContext,
} from "../../src/presentation/run-b-conversation";
import {
  createHouseholdObligationProgress,
  createRunBConversationProgress,
  type ConversationProgress,
} from "../../src/presentation/run-b-conversation-progress";
import { createRunBFixture } from "../../src/presentation/run-b-fixture";

const WORDING_FIELDS = new Set([
  "choice",
  "constituentDescription",
  "detail",
  "dialogue",
  "hearingDescription",
  "immediateReaction",
  "label",
  "motivation",
  "obligation",
  "officeRole",
  "playerActionDescription",
  "playerIntentLabel",
  "pressure",
  "proposedOfficeProcedure",
  "referralDestination",
  "requiredDocument",
  "roomNarration",
  "setting",
  "shortObligation",
  "socialContext",
  "speakerName",
  "summary",
]);

type CanonicalLeaf = readonly [path: string, value: unknown];

function splitCanonicalLeaves(
  value: unknown,
  path: readonly string[],
  identity: CanonicalLeaf[],
  wording: CanonicalLeaf[],
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      splitCanonicalLeaves(entry, [...path, String(index)], identity, wording),
    );
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      splitCanonicalLeaves(entry, [...path, key], identity, wording);
    }
    return;
  }
  const leaf: CanonicalLeaf = [path.join("."), value];
  (WORDING_FIELDS.has(path.at(-1) ?? "") ? wording : identity).push(leaf);
}

/**
 * Keep identity/provenance and player-facing wording independently sensitive.
 * The W-1 regression was hidden when both were collapsed into one digest.
 */
export function ordinaryConversationFingerprint(replay: {
  readonly records: Readonly<Record<string, readonly unknown[]>>;
}) {
  const identity: CanonicalLeaf[] = [];
  const wording: CanonicalLeaf[] = [];
  splitCanonicalLeaves(replay.records, [], identity, wording);
  const digest = (leaves: readonly CanonicalLeaf[]) =>
    createHash("sha256").update(canonicalJson(leaves)).digest("hex");
  return {
    counts: Object.fromEntries(
      Object.entries(replay.records).map(([key, records]) => [
        key,
        records.length,
      ]),
    ),
    identitySha256: digest(identity),
    wordingSha256: digest(wording),
  };
}

/** Same replay runs on the pinned pre-integration main and the reconciled head. */
export function ordinaryConversationReplayRecords() {
  function replay(
    initial: World,
    room: ConversationRoomContext,
    initialProgress: ConversationProgress,
    intents: readonly string[],
  ) {
    let world = initial;
    let progress = initialProgress;
    const session = createConversationSessionDescriptor(world, room);
    const turns = intents.map((intent, index) => {
      const result = commitConversationTurn(world, {
        session,
        room,
        progress,
        turnOrdinal: index + 1,
        addressee: room.eligibleAddresseePersonIds[0]!,
        audibility: "normal",
        intent,
      });
      world = result.world;
      progress = result.progress;
      return {
        semantic: result.semantic,
        presentation: result.presentation,
        progress,
      };
    });
    const groups = {
      relationship: world.history.relationshipInteractions.slice(
        initial.history.relationshipInteractions.length,
      ),
      commitment: world.history.lifeCommitments.slice(
        initial.history.lifeCommitments.length,
      ),
      aftermath: world.history.futureDueItems.slice(
        initial.history.futureDueItems.length,
      ),
      landed: world.history.events.slice(initial.history.events.length),
      turns,
    };
    return {
      initialNextSequence: initial.history.nextSequence,
      finalNextSequence: world.history.nextSequence,
      records: groups,
    };
  }
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
  const home = openOrdinaryLife(game.world, game.playerPersonId);
  const room = householdConversationRoom(home, game.playerPersonId)!;
  const office = createRunBFixture();
  return {
    household: replay(home, room, createHouseholdObligationProgress(), [
      "raise-obligation",
      "offer-to-cover",
    ]),
    householdCallback: replay(home, room, createHouseholdObligationProgress(), [
      "raise-obligation",
      "ask-for-time",
    ]),
    office: replay(
      office.world,
      office.roomContext,
      createRunBConversationProgress(),
      ["reassure", "request-commitment"],
    ),
  };
}
