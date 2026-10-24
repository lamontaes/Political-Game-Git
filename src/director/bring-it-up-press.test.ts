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
import { questionTopic } from "../english/policy-names";

// A neighbor says aloud what they read in the paper (pool item
// gov-stopgap-press-desk-missing-record): in a played world, in a place drawn
// from all 56, a reader of a printed story brings it up, naming the outlet and
// the story's topic, and the person they tell brings it up in turn.
const seed = process.env.GOLDEN_PATH_SEED ?? "bring-it-up-press";
const place = drawPlace(seed, "bring-it-up-press");

describe(`bring it up: a printed story in ${place.key} (seed ${place.seed})`, () => {
  it("tells the neighbor of the printed story, says no hand-written line, and is retold as the same kind of change", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, "2026-10-12", {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    for (let day = 0; day < 150; day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const api = coreAPI(core);
    // A reader of a printed story whose topic the catalog names; the story
    // they bring up is the newest such change they know of.
    const spoken = (id: string) =>
      changesKnownTo(core, id).filter((change) => {
        const story =
          change.kind === "news.read"
            ? printedStoryOf(api, storyOfReadEvent(change.eventId)!)
            : undefined;
        return story && questionTopic(story.topic);
      });
    const reader = [...core.people.values()].find(
      (row) => row.alive && row.knownIds.size > 0 && spoken(row.id).length > 0,
    );
    expect(
      reader,
      `a reader of a printed story with a named topic in ${place.key}`,
    ).toBeTruthy();
    const listener = [...reader!.knownIds][0]!;
    const [change] = spoken(reader!.id);
    const story = printedStoryOf(api, storyOfReadEvent(change!.eventId)!)!;
    const said = bringItUp(core, reader!.id, listener);
    // The reader still knows the story and tells the neighbor. The sentences
    // that name the outlet and the topic are hand-written and held until
    // graded (pool item words-bring-it-up-law-line, batch 22), so nothing is
    // said aloud, never an empty or hand-written line, until the engine
    // writes it.
    expect(said).not.toBeNull();
    expect(said!.change.eventId).toBe(change!.eventId);
    expect(core.organizations.has(story.organizationId)).toBe(true);
    expect(questionTopic(story.topic)).toBeTruthy();
    expect(said!.toldEventId).toBeTruthy();
    expect(said!.lines).toEqual([]);
    expect(said!.change.kind).toBe("news.read");
    // The listener now holds it as heard, and says it as the same kind.
    const heard = changesKnownTo(core, listener).find(
      (row) => row.eventId === change!.eventId,
    );
    expect(heard?.kind).toBe("news.read");
  }, 900_000);
});
