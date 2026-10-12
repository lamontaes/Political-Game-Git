import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "../core2/deep-past";
import { advanceCore, createLifeCore } from "../core2/life";
import { newsKey, newsModule } from "../core2/modules/news";
import { stancesOf, viewsModule } from "../core2/modules/views";
import { buildPopulation } from "../core2/population";
import { applyCoreEvent, coreAPI } from "../core2/state";
import {
  answerInterview,
  openInterview,
  PRESS_ANSWERED,
  type InterviewSetup,
} from "./interview";

// BOARD, Oct 12: the words for campaign interviews. A reporter asks about
// the race's issues and the candidate's own record; an answer on the record
// goes into the news. The setup is shaped as GOV's interview records.
const seed = process.env.GOLDEN_PATH_SEED ?? "interview-a";
const input = buildDeepPast(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 400,
  }),
);
const core = createLifeCore(input, { modules: [viewsModule, newsModule] });
const api = coreAPI(core);
const adults = [...core.people.values()].filter(
  (row) =>
    row.tier !== "husk" &&
    row.alive &&
    ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(input.startedAt)) >= 18,
);
const player = adults[0]!;
const setup = (terms: InterviewSetup["terms"]): InterviewSetup => ({
  id: `fixture-interview-${terms}`,
  outlet: { id: `outlet:${player.placeId}`, name: "the local paper" },
  contest: { id: "fixture-contest", title: "City Council, Seat 2" },
  place: {
    id: player.placeId,
    name: input.placeMetadata?.placeName?.split(",")[0] ?? "the town",
  },
  issues: [
    {
      topic: "fixture:park",
      label: "the downtown park",
      change: "build the downtown park",
      desiredChange: "build-park",
      sourceIds: ["fixture-issue-park"],
    },
    {
      topic: "fixture:roads",
      label: "road repairs",
      change: "repave Main Street",
      desiredChange: "repave-main",
      sourceIds: ["fixture-issue-roads"],
    },
  ],
  terms,
});

describe(`a campaign interview in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("asks about each issue, offering four distinct answers that name the records", () => {
    const talk = openInterview(core, player.id, setup("on-record"));
    expect(talk.lines.length).toBeGreaterThanOrEqual(2);
    expect(talk.lines.at(-1)!.text).toMatch(/park/);
    expect(talk.choices.length).toBe(4);
    expect(new Set(talk.choices.map((c) => c.text)).size).toBe(4);
    for (const choice of talk.choices)
      expect(choice.sourceRecordIds.length).toBeGreaterThan(0);
  });

  it("asks about the candidate's own recorded stance when there is one", () => {
    // The candidate once said they want the park (a recorded stance).
    applyCoreEvent(core, {
      id: "fixture-said-park",
      date: core.date,
      kind: "speech.heard",
      personIds: [player.id],
      placeId: player.placeId,
      topic: "fixture:park",
      desiredChange: "build-park",
      source: { tag: "SOURCED", citation: "Fixture.", asOf: core.date },
    });
    expect(
      stancesOf(api, player.id).some((s) => s.topic === "fixture:park"),
    ).toBe(true);
    const talk = openInterview(core, player.id, setup("on-background"));
    expect(talk.lines.at(-1)!.text).toMatch(/^You've said you want to /);
  });

  it("puts an on-record answer into the news, and keeps an off-record one out", () => {
    const off = openInterview(core, player.id, setup("off-record"));
    answerInterview(
      core,
      off,
      off.choices.find((c) => c.answer === "support")!.key,
    );
    expect(off.answered[0]!.eventId).toBeUndefined();

    const talk = openInterview(core, player.id, setup("on-record"));
    answerInterview(
      core,
      talk,
      talk.choices.find((c) => c.answer === "oppose")!.key,
    );
    const eventId = talk.answered[0]!.eventId!;
    expect(core.eventIds.has(eventId)).toBe(true);
    expect(eventId.startsWith(PRESS_ANSWERED)).toBe(true);
    // The next question is the other issue.
    expect(talk.lines.at(-1)!.text).toMatch(/road|Main Street/);
    // A reader who follows the news hears it within a month.
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    const heard = adults
      .slice(1)
      .filter((row) => api.knows(row.id, newsKey(eventId)));
    expect(heard.length).toBeGreaterThan(0);
  });
});
