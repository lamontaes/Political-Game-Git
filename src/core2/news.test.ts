import { describe, expect, it } from "vitest";
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import { buildDeepPast } from "./deep-past";
import { advanceCore, createLifeCore } from "./life";
import { newsKey, newsModule, printStory, trustOf } from "./modules/news";
import { viewOf, viewsModule, stancesOf } from "./modules/views";
import { buildPopulation } from "./population";
import { applyCoreEvent, coreAPI } from "./state";
import newsParameters from "./data/news/parameters.json" with { type: "json" };

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
// Through the story's whole life: past it, the next month forgets it
// (news.ts, forgetOldNews).
advanceCore(
  core,
  addDays(makeIsoDate(start), newsParameters.newsMaxAgeDays.value),
);
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
    // The default seed's town sits in a county; a drawn place with no county
    // has no county story to carry.
    if (!countyId) {
      expect(
        process.env.GOLDEN_PATH_SEED,
        "the default seed has a county",
      ).toBeTruthy();
      return;
    }
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
});

it("keeps a received story as the source of a law stance", () => {
  const local = createLifeCore(input, { modules: [viewsModule, newsModule] });
  const localApi = coreAPI(local);
  const reader = [...local.people.values()]
    .filter((p) => p.alive && viewOf(localApi, p.id))
    .sort(
      (a, b) =>
        viewOf(localApi, b.id)!.engagement - viewOf(localApi, a.id)!.engagement,
    )[0];
  expect(reader).toBeDefined();
  const id = "fixture:law-report";
  const topic =
    "us-policy-positions:transportation-infrastructure.fare-free-transit";
  printStory(
    localApi,
    {
      id,
      kind: "press.printed",
      outletId: `outlet:${reader!.placeId}`,
      date: local.date,
      placeId: reader!.placeId,
      topic,
      desiredChange: "enact",
      facts: { lawId: "fixture:transit-law" },
    },
    [reader!.id],
  );
  expect(localApi.knows(reader!.id, newsKey(id))).toBeUndefined();
  const delivery = localApi
    .moduleState("news")
    .table("deliveries")
    .get(`${id}:${reader!.id}`);
  expect(delivery).toBeDefined();
  advanceCore(local, String(delivery!.date));
  const known = localApi.knows(reader!.id, newsKey(id));
  expect(known?.sourceId).toBe(id);
  const stance = stancesOf(localApi, reader!.id).find((s) => s.topic === topic);
  expect(
    stance?.causes.some((cause) => cause.learnedFrom === newsKey(id)),
  ).toBe(true);
});
