import { recordRelationshipInteraction } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  commitConversationTurn,
  conversationRole,
  createConversationSessionDescriptor,
  type ConversationAudibility,
  type ConversationRoomContext,
  type ConversationSemanticResult,
} from "../presentation/run-b-conversation";
import { createRunBFixture } from "../presentation/run-b-fixture";
import type { ObserverHistorySpan } from "./observer-trace";

/**
 * A world with something worth tracing in it.
 *
 * This is the one module in the devtools folder that writes to a world, and it
 * writes only through accepted public simulation and conversation APIs — the
 * same calls ordinary play makes. It exists because a trace of an empty world
 * proves nothing, not because the inspector needs a private way to create
 * state. The inspector itself never appears here, and nothing here is reachable
 * from the inspector.
 *
 * The scenario is chosen so that audibility changes causality rather than
 * wording. The player asks the referral verifier for a commitment; under
 * `normal` the briefing lead is in the recorded hearing set and the simulation
 * writes them a knowledge record and a perception, and under `quiet` it does
 * not. The second turn then asks the briefing lead for a commitment, and the
 * briefing lead's decision consults their own most recent perception — which
 * exists in one run and not the other. Nothing in the inspector arranges that;
 * it falls out of the accepted conversation rules.
 */

export const CAUSAL_TRACE_FIXTURE_SEED = "causal-trace-observer";

export interface TracedConversationTurn {
  readonly turnOrdinal: number;
  readonly addresseePersonId: EntityId;
  readonly audibility: ConversationAudibility;
  readonly intent: string;
  readonly turnKey: string;
  readonly eventId: EntityId;
  readonly historySpan: ObserverHistorySpan;
  readonly semantic: ConversationSemanticResult;
}

export interface CausalTraceFixture {
  readonly world: World;
  readonly seed: string;
  readonly audibility: ConversationAudibility;
  readonly playerPersonId: EntityId;
  readonly briefingLeadPersonId: EntityId;
  readonly referralVerifierPersonId: EntityId;
  readonly room: ConversationRoomContext;
  readonly turns: readonly TracedConversationTurn[];
  /**
   * A relationship interaction recorded with `eventId: null`.
   *
   * The field is nullable in the accepted schema, and a record that uses that
   * nullability is the honest test of whether the inspector says UNKNOWN or
   * quietly attaches the nearest event.
   */
  readonly unlinkedInteractionId: EntityId;
}

function eventIdForTurn(world: World, turnKey: string): EntityId {
  const event = world.history.events.find(
    (candidate) => candidate.stableKey === `${turnKey}:event`,
  );
  if (!event) {
    throw new Error(`The conversation turn ${turnKey} recorded no event.`);
  }
  return event.id;
}

/**
 * Builds the fixture at one audibility.
 *
 * The same seed and the same audibility always produce the same world, which
 * is what makes the export determinism test meaningful rather than circular.
 */
export function createCausalTraceFixture(
  audibility: ConversationAudibility = "normal",
  seedInput: string = CAUSAL_TRACE_FIXTURE_SEED,
): CausalTraceFixture {
  const base = createRunBFixture(seedInput);
  const room = base.roomContext;
  const briefingLeadPersonId = conversationRole(room, "briefing-lead");
  const referralVerifierPersonId = conversationRole(room, "referral-verifier");

  let world = recordRelationshipInteraction(base.world, {
    stableKey: "causal-trace:unlinked-interaction",
    personIds: [room.playerPersonId, briefingLeadPersonId],
    eventId: null,
    occurredAt: base.world.currentDate,
    kind: "contact:unscheduled-corridor-exchange",
    change: "maintained",
    significance: "minor",
    summary:
      "A brief exchange recorded without a source event, so the trace has a genuinely unlinked record to report.",
    tags: ["causal-trace-fixture"],
  });
  const unlinked = world.history.relationshipInteractions.at(-1);
  if (!unlinked || unlinked.stableKey !== "causal-trace:unlinked-interaction") {
    throw new Error("The unlinked interaction was not recorded.");
  }

  const session = createConversationSessionDescriptor(world, room);
  const turns: TracedConversationTurn[] = [];

  const plan: readonly {
    readonly turnOrdinal: number;
    readonly addresseePersonId: EntityId;
    readonly audibility: ConversationAudibility;
  }[] = [
    {
      turnOrdinal: 1,
      addresseePersonId: referralVerifierPersonId,
      audibility,
    },
    {
      turnOrdinal: 2,
      addresseePersonId: briefingLeadPersonId,
      audibility: "normal",
    },
  ];

  let progress = undefined as
    Parameters<typeof commitConversationTurn>[1]["progress"] | undefined;
  for (const step of plan) {
    const fromSequence = world.history.nextSequence;
    const result = commitConversationTurn(world, {
      session,
      room,
      progress,
      turnOrdinal: step.turnOrdinal,
      addressee: step.addresseePersonId,
      audibility: step.audibility,
      intent: "request-commitment",
    });
    world = result.world;
    progress = result.progress;
    turns.push({
      turnOrdinal: step.turnOrdinal,
      addresseePersonId: step.addresseePersonId,
      audibility: step.audibility,
      intent: "request-commitment",
      turnKey: result.semantic.turnKey,
      eventId: eventIdForTurn(world, result.semantic.turnKey),
      historySpan: {
        fromSequence,
        toSequence: world.history.nextSequence,
      },
      semantic: result.semantic,
    });
  }

  return {
    world,
    seed: seedInput,
    audibility,
    playerPersonId: room.playerPersonId,
    briefingLeadPersonId,
    referralVerifierPersonId,
    room,
    turns,
    unlinkedInteractionId: unlinked.id,
  };
}
