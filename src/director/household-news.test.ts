import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { wordPrintedStory } from "../bench/archive-words";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { newsKey } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { subjectsBetween } from "./conversation";

// A household talk about the news says what the news was
// (scene-household-news-says-the-story): a relative who read or heard a
// printed story raises it with its headline, in the words the paper's own
// screen prints it with, and the outlet that printed it, each citing the
// story. In a place drawn from all 56, played day by day until someone in
// the player's household has heard a printed story.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "household-news");
const MAX_DAYS = 200;

it(`a relative raises a printed story by its headline and outlet, in ${place.name} (${place.key}), seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, "2025-01-20", {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId!;
  const player = core.people.get(playerId)!;
  const household = (core.households.get(player.householdId)?.memberIds ?? [])
    .filter((id) => id !== playerId && core.people.get(id)?.alive)
    .sort();
  expect(household.length, "a household to talk with").toBeGreaterThan(0);
  const raised = () => {
    for (const id of household) {
      const subject = subjectsBetween(core, id, playerId, director).find(
        (row) => row.kind === "news" && row.facts.headline,
      );
      if (subject) return { speakerId: id, subject };
    }
    return null;
  };
  let found = raised();
  for (let day = 0; !found && day < MAX_DAYS; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    found = raised();
  }
  expect(
    found,
    `no relative heard a printed story in ${MAX_DAYS} days`,
  ).toBeTruthy();
  const { speakerId, subject } = found!;
  const storyId = subject.aboutId!;
  // The speaker heard it, by the news engine's own record.
  expect(core.knowledgeByPerson.get(speakerId)?.has(newsKey(storyId))).toBe(
    true,
  );
  const story = coreAPI(core)
    .moduleState("news")
    .table("stories")
    .get(storyId) as unknown as Parameters<typeof wordPrintedStory>[1];
  const worded = wordPrintedStory(core as CoreState, story)!;
  // The headline is the paper's own, and each fact cites the story.
  expect(subject.facts.headline!.text).toBe(worded.headline);
  expect(subject.facts.headline!.sourceRecordIds).toContain(storyId);
  expect(subject.facts.storyId!.sourceRecordIds).toEqual([storyId]);
  if (subject.facts.outlet) {
    expect(subject.facts.outlet.sourceRecordIds).toContain(storyId);
    expect(subject.facts.outlet.sourceRecordIds).toContain(
      (story as { outletId?: string }).outletId,
    );
  }
  // A paper prints it, a station broadcasts it; either cites the story.
  const medium = subject.facts.paper ?? subject.facts.broadcast;
  if (medium) expect(medium.sourceRecordIds).toContain(storyId);
  process.stdout.write(
    `HOUSEHOLD NEWS ${place.name} ${seed} ${core.date}: ${speakerId} raises ${storyId}: "${subject.facts.headline!.text}"${subject.facts.outlet ? ` (${subject.facts.outlet.text}, ${subject.facts.paper ? "paper" : subject.facts.broadcast ? "broadcast" : "online"})` : ""}\n`,
  );
}, 900_000);
