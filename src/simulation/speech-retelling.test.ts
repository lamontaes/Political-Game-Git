import { fixture } from "../../tests/fixtures/speech-retelling-chain";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";

import { composeWorldTimeHandlers } from "./campaigns";
import { makeIsoDate } from "./dates";
import {
  composeFutureTransitionHandlerRegistries,
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
  scheduleFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";

import { recordSpeechReception } from "./speech-reception";
import {
  ensureSpeechRetellingSchedule,
  hasSpeechLeftToRetell,
  SPEECH_RETELLING_HANDLERS,
  SPEECH_RETELLING_TRANSITION_KEY,
} from "./speech-retelling";
import type { EntityId, World } from "./types";
import { recordWorldEvent } from "./world";

function advance(world: World, date: string): World {
  return resolveFutureDueItemsThrough(
    world,
    makeIsoDate(date),
    composeFutureTransitionHandlerRegistries(
      createFutureTransitionHandlerRegistry(SPEECH_RETELLING_HANDLERS()),
      composeWorldTimeHandlers(),
    ),
  );
}

describe("A9 monthly speech retelling on the due clock", () => {
  it("leaves a world without recorded receptions unscheduled", () => {
    const world = smallWorld({
      place: "NH",
      people: 8,
      seed: "a9-no-reception",
    }).world;
    expect(ensureSpeechRetellingSchedule(world)).toBe(world);
    expect(
      world.history.futureDueItems.filter(
        (item) => item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY,
      ),
    ).toEqual([]);
  });
  it("resolves an existing due item without rescheduling when there are no receptions", () => {
    const empty = smallWorld({
      place: "NH",
      people: 8,
      date: "2026-12-15",
      seed: "a9-empty-due",
    }).world;
    const scheduled = scheduleFutureDueItem(empty, {
      stableKey: "a9:empty-retelling-due",
      dueAt: makeIsoDate("2027-01-01"),
      transitionKey: SPEECH_RETELLING_TRANSITION_KEY,
      entityIds: [empty.id],
      jurisdictionId: null,
      provenance: { kind: "simulated", sourceEntityIds: [empty.id] },
    });
    const resolved = advance(scheduled, "2027-01-01");
    expect(
      resolved.history.futureDueItems.filter(
        (item) => item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY,
      ),
    ).toHaveLength(1);
    expect(resolved.history.knowledge).toEqual(empty.history.knowledge);
    expect(resolved.history.memories).toEqual(empty.history.memories);
  });
  it("crosses three month starts in one advance, recording each link on its own due date", () => {
    const { world, speech, second, third, fourth } = fixture();
    const reached = advance(world, "2027-03-01");
    const heardAt = (id: EntityId) =>
      reached.history.knowledge.find(
        (row) => row.personId === id && row.eventId === speech.id,
      )?.learnedAt;
    expect(heardAt(second)).toBe("2027-01-01");
    expect(heardAt(third)).toBe("2027-02-01");
    expect(heardAt(fourth)).toBe("2027-03-01");
    expect(
      reached.history.futureDueItems
        .filter(
          (item) => item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY,
        )
        .map((item) => item.dueAt),
    ).toEqual(["2027-01-01", "2027-02-01", "2027-03-01"]);
    expect(hasSpeechLeftToRetell(reached)).toBe(false);
    expect(ensureSpeechRetellingSchedule(reached)).toBe(reached);
    const again = advance(reached, "2027-03-01");
    expect(again.history.knowledge).toEqual(reached.history.knowledge);
    expect(again.history.memories).toEqual(reached.history.memories);
    expect(again.history.futureDueItems).toEqual(
      reached.history.futureDueItems,
    );
  }, 30_000);
  it("stops an exhausted chain and restarts once from a new actual reception", () => {
    const { world, speech } = fixture();
    const stopped = advance(world, "2027-03-01");
    const pending = (value: World) =>
      value.history.futureDueItems.filter(
        (item) =>
          item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY &&
          futureDueItemStateAt(value, item.id, {
            asOfDate: value.currentDate,
            historySequenceExclusive: value.history.nextSequence,
          })?.status === "scheduled",
      );
    expect(pending(stopped)).toEqual([]);
    expect(ensureSpeechRetellingSchedule(stopped)).toBe(stopped);
    const speaker = speech.involvedEntityIds[0]!;
    const first = speech.involvedEntityIds[1]!;
    const spoken = recordWorldEvent(stopped, {
      stableKey: "a9:new-speech-after-exhaustion",
      type: "speech.given",
      occurredAt: stopped.currentDate,
      recordedAt: stopped.currentDate,
      jurisdictionId: speech.jurisdictionId,
      involvedEntityIds: [speaker, first],
      participants: [
        {
          personId: speaker,
          role: "focus:subject",
          detail: "Gave another speech",
        },
        {
          personId: first,
          role: "observation:witness",
          detail: "Heard another speech",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "Another authored speech after the prior chain finished.",
      context: speech.context,
    });
    const newSpeech = spoken.history.events.at(-1)!;
    const restarted = recordSpeechReception(
      spoken,
      newSpeech,
      speaker,
      [first],
      "victory",
    );
    expect(pending(restarted)).toHaveLength(1);
    expect(pending(restarted)[0]!.dueAt).toBe("2027-04-01");
    expect(ensureSpeechRetellingSchedule(restarted)).toBe(restarted);
    expect(
      recordSpeechReception(restarted, newSpeech, speaker, [first], "victory"),
    ).toBe(restarted);
  }, 30_000);
});
