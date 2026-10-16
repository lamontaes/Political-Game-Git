/** One year through the bench player, with record defects checked in a drawn world. */
import { buildBenchWorld } from "../../src/bench/world";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { BenchPlayer } from "../../src/bench/player";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  OFFICES_MODULE_ID,
  type TermRow,
} from "../../src/core2/modules/offices";
import {
  outletsHere,
  officeholderSpeaker,
  requestInterview,
  candidateAnswers,
  answerInterview,
  storiesPrinted,
  PRESS_MODULE_ID,
} from "../../src/core2/modules/press";
import {
  LEGISLATURE_MODULE_ID,
  billTitle,
  type BillRow,
} from "../../src/core2/modules/legislature";
import {
  VOTING_MODULE_ID,
  type ResultRow,
} from "../../src/core2/modules/voting";
import { NEWS_MODULE_ID } from "../../src/core2/modules/news";
import { CANDIDACY_MODULE_ID } from "../../src/core2/modules/candidacy";
import { drawPlace } from "../core2-year/place";
import { playThrough } from "../office-day-federal/drive";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "office-federal");
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core } = world;
const api = coreAPI(core);
const president = (
  api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("bySeatStatus", [
      "seat:US:president",
      "serving",
    ]) as unknown as TermRow[]
)[0]!.personId!;
const player = new BenchPlayer(core, world.director);
player.select(president);
const start = core.date;
const national = outletsHere(api).filter((o) => o.tier === "national");
const interviews = national.map((outlet) => {
  const row = requestInterview(api, {
    outletId: outlet.id,
    personId: president,
  });
  assert.notEqual(row.reason, "not-newsworthy");
  return row.status === "invited"
    ? answerInterview(
        api,
        row.id,
        candidateAnswers(
          api,
          row.questions,
          officeholderSpeaker(api, president)!,
        ),
      )
    : row;
});
const began = Date.now();
playThrough(player, api, addDays(makeIsoDate(start), 14));
const earlyStories = national
  .flatMap((o) => storiesPrinted(api, o.id))
  .filter((s) => s.subjectIds.includes(president));
const earlyIds = new Set(earlyStories.map((s) => s.id));
const reached = api
  .moduleState(NEWS_MODULE_ID)
  .table("heard")
  .rows()
  .filter((r) => earlyIds.has(String(r.storyId)));
console.log(
  JSON.stringify({
    phase: "first-fortnight",
    seed,
    place,
    president,
    interviews,
    stories: earlyStories.slice(0, 5),
    reached: reached.slice(0, 5),
  }),
);
playThrough(player, api, addDays(makeIsoDate(start), 365));
const bills = api
  .moduleState(LEGISLATURE_MODULE_ID)
  .table("bills")
  .rows() as unknown as BillRow[];
assert(
  bills.every(
    (b) => b.provisions.length && billTitle(b).subjects.length && b.title,
  ),
  "every introduced bill has provisions and a recorded title",
);
const results = api
  .moduleState(VOTING_MODULE_ID)
  .table("results")
  .rows() as unknown as ResultRow[];
const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
for (const result of results) {
  if (!result.winnerId) continue;
  const aliased = terms.get(
    result.winnerId.replace(/^official:/, ""),
  ) as unknown as TermRow | undefined;
  if (aliased?.personId)
    assert(
      core.people.has(result.winnerId),
      `winner still a term alias: ${result.id}`,
    );
}
const stories = national
  .flatMap((o) => storiesPrinted(api, o.id))
  .filter((s) => s.subjectIds.includes(president));
assert(
  earlyStories.length || stories.length,
  "national outlets covered the president",
);
console.log(
  JSON.stringify({
    phase: "year",
    seed,
    place,
    start,
    end: core.date,
    seconds: (Date.now() - began) / 1000,
    president,
    billCount: bills.length,
    bills: bills
      .filter((b) => b.status === "enacted")
      .slice(0, 4)
      .map((b) => ({
        id: b.id,
        title: b.title,
        status: b.status,
        provisions: b.provisions,
      })),
    results: results.slice(0, 5).map((r) => ({
      id: r.id,
      winnerId: r.winnerId,
      winnerCandidateId: r.winnerCandidateId,
      personExists: r.winnerId ? core.people.has(r.winnerId) : false,
    })),
    candidacy: api
      .moduleState(CANDIDACY_MODULE_ID)
      .table("decisions")
      .rows()
      .filter(
        (r) =>
          Number(
            (r.reasons as Record<string, number> | undefined)
              ?.officeOpportunity,
          ) < 0,
      )
      .slice(0, 5),
    nationalStoryCount: stories.length,
    stories: stories.slice(0, 5),
    wireCount: api.moduleState(PRESS_MODULE_ID).table("wire").size,
  }),
);
