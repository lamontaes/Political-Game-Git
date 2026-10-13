import { describe, expect, it } from "vitest";
import { addDays, daysBetween, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { advanceCore, createLifeCore } from "./life";
import { newsKey, newsModule, trustOf } from "./modules/news";
import { stancesOf, viewOf, viewsModule } from "./modules/views";
import { buildPopulation } from "./population";
import { applyCoreEvent, coreAPI } from "./state";

// M2-09: a public record reaches residents through outlets, at each person's
// own habits, and through the people they talk to; people who never hear it
// don't know it.
const seed = process.env.GOLDEN_PATH_SEED ?? "news-a";
const input = buildDeepPast(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 500,
  }),
);
const core = createLifeCore(input, { modules: [viewsModule, newsModule] });
const api = coreAPI(core);
const subject = [...core.people.values()].find(
  (row) => row.tier !== "husk" && row.alive,
)!;
const storyId = "fixture-election-result";
applyCoreEvent(core, {
  id: storyId,
  date: core.date,
  kind: "election.result",
  personIds: [subject.id],
  placeId: subject.placeId,
  publicRecord: true,
  facts: { "fixture:council-winner": subject.id },
  source: { tag: "SOURCED", citation: "Fixture result.", asOf: core.date },
});
const start = core.date;
// Two days in, before outlets and talk have carried it far.
advanceCore(core, addDays(makeIsoDate(start), 2));
const notYet = [...(core.peopleByPlace.get(subject.placeId) ?? [])].filter(
  (id) => id !== subject.id && !coreAPI(core).knows(id, newsKey(storyId)),
);
advanceCore(core, addDays(makeIsoDate(start), 45));
const residents = [...(core.peopleByPlace.get(subject.placeId) ?? [])].filter(
  (id) => id !== subject.id && core.people.get(id)?.alive,
);
const known = (id: string) => api.knows(id, newsKey(storyId));

describe(`news in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("reaches each resident through outlets no sooner than their habits allow, or through someone they talked to", () => {
    let outlet = 0;
    let told = 0;
    for (const id of residents) {
      const fact = known(id);
      if (!fact) continue;
      const days = daysBetween(makeIsoDate(start), makeIsoDate(fact.learnedAt));
      if (fact.access === "public") {
        outlet += 1;
        const view = viewOf(api, id)!;
        expect(days).toBe(
          Math.ceil(1 / (view.engagement * (trustOf(api, view.lean) / 0.31))),
        );
        expect(api.knows(id, `${newsKey(storyId)}:outlet`)?.value).toBe(
          `outlet:${subject.placeId}`,
        );
      } else {
        expect(fact.access).toBe("told");
        told += 1;
      }
      // Hearing it teaches what the record says.
      expect(api.knows(id, "fixture:council-winner")?.value).toBe(subject.id);
    }
    expect(outlet).toBeGreaterThan(0);
    expect(told).toBeGreaterThan(0);
  });

  it("leaves people who have not heard it not knowing it", () => {
    expect(notYet.length).toBeGreaterThan(0);
    // Checked at day two: no one unreached then knew what the record said.
    for (const id of notYet) {
      const fact = known(id);
      if (fact)
        expect(
          daysBetween(makeIsoDate(start), makeIsoDate(fact.learnedAt)),
        ).toBeGreaterThan(2);
    }
  });

  it("trusts the media by lean, as Gallup found, so conservatives hear later", () => {
    expect(trustOf(api, -1)).toBeCloseTo(0.54);
    expect(trustOf(api, 0)).toBeCloseTo(0.27);
    expect(trustOf(api, 1)).toBeCloseTo(0.12);
    expect(trustOf(api, -0.5)).toBeGreaterThan(trustOf(api, 0.5));
  });

  it("carries a county's story to the residents inside it", () => {
    const countyId = subject.countyId;
    if (!countyId) return;
    applyCoreEvent(core, {
      id: "fixture-county-story",
      date: core.date,
      kind: "county.budget-passed",
      personIds: [],
      placeId: countyId,
      publicRecord: true,
      source: {
        tag: "SOURCED",
        citation: "Fixture county record.",
        asOf: core.date,
      },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 10));
    const heard = residents.filter((id) =>
      api.knows(id, newsKey("fixture-county-story")),
    );
    expect(heard.length).toBeGreaterThan(0);
  });

  it("moves the stance of people who hear a story with a topic, less than the people it reached", () => {
    const eventId = "fixture-park-vote";
    const reached = residents.slice(0, 3);
    applyCoreEvent(core, {
      id: eventId,
      date: core.date,
      kind: "legislative-vote",
      personIds: reached,
      placeId: subject.placeId,
      publicRecord: true,
      topic: "fixture:parks",
      desiredChange: "build",
      source: { tag: "SOURCED", citation: "Fixture vote.", asOf: core.date },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 20));
    const moved = (id: string) =>
      stancesOf(api, id)
        .find((row) => row.topic === "fixture:parks")
        ?.causes.find((row) => row.eventId === eventId)?.change ?? 0;
    const direct = reached.map(moved);
    const secondhand = residents
      .filter((id) => !reached.includes(id))
      .map((id) => ({
        id,
        change: moved(id),
        heard: api.knows(id, newsKey(eventId)),
      }));
    expect(direct.every((change) => change > 0)).toBe(true);
    const heard = secondhand.filter((row) => row.heard);
    expect(heard.length).toBeGreaterThan(0);
    // Everyone who heard it moved, by less than the step for living it ...
    for (const row of heard) {
      expect(row.change).toBeGreaterThan(0);
      const view = viewOf(api, row.id)!;
      expect(row.change).toBeCloseTo(0.05 * (1 - 0.5 * view.engagement));
    }
    // ... and no one who never heard it was moved.
    for (const row of secondhand.filter((row) => !row.heard))
      expect(row.change).toBe(0);
  });

  it("drops a story past its life from memory, while what people learned stays", () => {
    // Pruned on the first of the month after its 30 days (owner's ruling 5).
    expect(
      api.moduleState("news").table("stories").get(storyId),
    ).toBeUndefined();
    expect(
      api.moduleState("news").table("heard").query("byStory", [storyId]),
    ).toEqual([]);
    expect(residents.some((id) => known(id))).toBe(true);
  });
});
