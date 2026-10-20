import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { storyOfReadEvent } from "../core2/modules/news";
import { printedStoryOf } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import { bringItUp, changesKnownTo } from "./bring-it-up";
import { storyTopicName } from "./question-names";

// A neighbor says aloud that a law took effect (golden path step 10): in a
// played world in a drawn place, a reader of the story the press printed when
// a law's amount took effect brings it up, naming the outlet and the subject.
const seed = process.env.GOLDEN_PATH_SEED ?? "bring-it-up-law";

describe("bring it up: a law taking effect", () => {
  it("tells the neighbor of the printed law story, saying no hand-written line", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let draw = 0; draw < 6; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "bring-it-up-law");
      const world = buildBenchWorld(place.seed, "2026-10-12", {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      for (let day = 0; day < 150; day += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const api = coreAPI(core);
      tried.push(`${place.name} (${place.key}) seed ${place.seed}`);
      // A story about a law taking effect, on a subject the English data names.
      const lawStory = (id: string) =>
        changesKnownTo(core, id).filter((change) => {
          const story =
            change.kind === "news.read"
              ? printedStoryOf(api, storyOfReadEvent(change.eventId)!)
              : undefined;
          return (
            story?.wireId.startsWith("law-took-effect:") &&
            storyTopicName(story.topic) !== null
          );
        });
      const reader = [...core.people.values()].find(
        (row) =>
          row.alive && row.knownIds.size > 0 && lawStory(row.id).length > 0,
      );
      if (!reader) continue;
      const [change] = lawStory(reader.id);
      const story = printedStoryOf(api, storyOfReadEvent(change!.eventId)!)!;
      const said = bringItUp(core, reader.id, [...reader.knownIds][0]!);
      // The reader still knows the law's story and tells the neighbor. The
      // sentence it would say is hand-written and held (owner, Oct 6, EN-1 to
      // EN-3; pool item words-bring-it-up-law-line), so nothing is said
      // aloud, never an empty or hand-written line, until the engine writes
      // it.
      expect(said).not.toBeNull();
      expect(said!.change.eventId).toBe(change!.eventId);
      expect(story.topic).toBeDefined();
      expect(said!.toldEventId).toBeTruthy();
      expect(said!.lines).toEqual([]);
      return;
    }
    throw new Error(
      `No reader of a named law's story in 6 places: ${tried.join("; ")}`,
    );
  }, 3_600_000);
});
