import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { createNewsModule, newsKey, storiesHeard } from "./modules/news";
import { viewsModule } from "./modules/views";
import { buildPopulation } from "./population";
import { applyCoreEvent, coreAPI } from "./state";

// Telling news reads an index of what each person heard lately instead of
// rescanning everything they ever heard. Over a played month on a fixed seed,
// the indexed telling and the full rescan hear and pass on the same stories.
const seed = process.env.GOLDEN_PATH_SEED ?? "news-telling-a";

function playMonth(rescan: boolean) {
  const input = buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 500,
  });
  const news = rescan
    ? createNewsModule((api, personId, since) =>
        storiesHeard(api, personId, since).map((story) => ({
          storyId: story.id,
          storyDate: story.date,
        })),
      )
    : createNewsModule();
  const core = createLifeCore(input, { modules: [viewsModule, news] });
  const start = makeIsoDate(core.date);
  const people = [...core.people.values()].filter(
    (row) => row.tier !== "husk" && row.alive,
  );
  // A public record every few days, so tellers choose among several stories.
  const storyIds: string[] = [];
  for (const [index, day] of [0, 3, 4, 9, 15, 22].entries()) {
    advanceCore(core, addDays(start, day));
    const subject = people[(index * 37) % people.length]!;
    const id = `fixture-record-${index}`;
    storyIds.push(id);
    applyCoreEvent(core, {
      id,
      date: core.date,
      kind: "election.result",
      personIds: [subject.id],
      placeId: subject.placeId,
      publicRecord: true,
      facts: { [`fixture:record-${index}`]: subject.id },
      source: { tag: "SOURCED", citation: "Fixture record.", asOf: core.date },
    });
  }
  advanceCore(core, addDays(start, 30));
  const api = coreAPI(core);
  const heard: string[] = [];
  for (const personId of [...core.people.keys()].sort())
    for (const id of storyIds) {
      const fact = api.knows(personId, newsKey(id));
      if (fact)
        heard.push(
          `${personId} ${id} ${fact.access} ${fact.learnedAt} ${fact.sourceId}`,
        );
    }
  return {
    place: input.placeMetadata?.placeName,
    heard,
    told: heard.filter((row) => row.includes(" told ")).length,
  };
}

describe(`telling news over a played month (seed ${seed})`, () => {
  it("hears and passes on the same stories as the full rescan", () => {
    const indexed = playMonth(false);
    const rescan = playMonth(true);
    expect(indexed.place).toBe(rescan.place);
    expect(indexed.told).toBeGreaterThan(0);
    expect(indexed.heard).toEqual(rescan.heard);
  }, 120_000);
});
