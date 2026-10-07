import { describe, expect, it, vi } from "vitest";
import * as decisionEngine from "./decisions";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  CHAPTER_OUTREACH_TRANSITION_KEY,
  chapterOutreachTransitionHandler,
} from "./living-world/party-chapters";

describe("chapter organizer without a selected answer", () => {
  it.each(["no-available-option", "selected", "undecided"] as const)(
    "keeps invitations uncreated and schedules an existing review (%s)",
    (outcomeKind) => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: "c8-chapter-undecided",
          startAge: 34,
        }),
      ).game!;
      const world = game.world;
      const item = world.history.futureDueItems.find(
        (due) => due.transitionKey === CHAPTER_OUTREACH_TRANSITION_KEY,
      )!;
      expect(item).toBeDefined();
      const evaluate = decisionEngine.evaluateDecision;
      const spy = vi
        .spyOn(decisionEngine, "evaluateDecision")
        .mockImplementation((at, context) => {
          const result = evaluate(at, context);
          return context.decisionType === "party-chapter.invite-to-meeting"
            ? {
                ...result,
                outcomeKind,
                selectedOptionKey: null,
              }
            : result;
        });
      try {
        const result = chapterOutreachTransitionHandler(world, item);
        expect(result.reasonKey).toBe("party-chapter:organizer-undecided");
        expect(result.world.history.events).toEqual(world.history.events);
        expect(result.world.history.scheduledActivities).toEqual(
          world.history.scheduledActivities,
        );
        const added = result.world.history.futureDueItems.slice(
          world.history.futureDueItems.length,
        );
        expect(added).toHaveLength(1);
        expect(added[0]!.dueAt > world.currentDate).toBe(true);
      } finally {
        spy.mockRestore();
      }
    },
  );
});
