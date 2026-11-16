/**
 * The President's approval, published each month as the country's poll
 * (national-opinion.ts `publishApproval`), is printed by a national outlet and
 * read by name, so someone in the player's life can bring it up (owner, Nov
 * 15: a friend calls after a big public event). Dev mode's trace of the story
 * shows who it reached, named and counted, and the read it made (owner, Nov
 * 16: what a thread traces, dev mode shows). Pinned: Wilmont, Minnesota
 * (2770582), the world seed below, played to the third month's poll, the first the national desks printed (February's, written the week after the inauguration, was not).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";
import { printedFacts } from "./printed-words";
import { wordPrintedStory } from "./archive-words";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import { NATIONAL_APPROVAL } from "../core2/modules/national-opinion";
import {
  NEWS_MODULE_ID,
  NEWS_READ,
  storyOfReadEvent,
} from "../core2/modules/news";
import { PRESS_MODULE_ID } from "../core2/modules/press";
import type { PrintedStory } from "../core2/press-desk";

const PLACE = {
  name: "Wilmont, Minnesota",
  key: "2770582",
  seed: "2cb5aaf15d55f6b06548834319221a87402931e3d1570c6e674f546d2ff2025f",
};

it(`a month's approval poll is printed nationally and read by name (${PLACE.name})`, () => {
  const where = `${PLACE.name} (${PLACE.key}), world seed ${PLACE.seed}`;
  const world = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const { core } = world;
  const dev = new DevMode(
    core,
    world.director,
    new BenchPlayer(core, world.director),
    world.placeId,
  );
  const press = coreAPI(core).moduleState(PRESS_MODULE_ID);
  const national = new Set(
    (
      press.table("outlets").rows() as unknown as {
        id: string;
        tier?: string;
      }[]
    )
      .filter((outlet) => outlet.tier === "national")
      .map((outlet) => outlet.id),
  );
  const pollId = `${NATIONAL_APPROVAL}:2025-03`;
  const printed = () =>
    (
      press.table("stories").rows() as unknown as (PrintedStory & {
        outletId: string;
        wireId: string;
      })[]
    ).filter(
      (story) => story.wireId === pollId && national.has(story.outletId),
    );
  const readOf = (storyId: string) =>
    [...(core.logByKind.get(NEWS_READ) ?? [])]
      .map(String)
      .find((id) => storyOfReadEvent(id) === storyId);
  let found: { storyId: string; readId: string } | undefined;
  const end = addDays(makeIsoDate(core.date), 75);
  while (!found && makeIsoDate(core.date) < end) {
    dev.advance(addDays(makeIsoDate(core.date), 1));
    for (const story of printed()) {
      const readId = readOf(story.id);
      if (readId) {
        found = { storyId: story.id, readId };
        break;
      }
    }
  }
  // The poll is a public record with last month's to compare: whether it
  // rose, fell or held is a plain fact; the change in points is for weighing.
  const poll = core.durableLog.get(pollId as never);
  expect(poll?.kind, `${where}: ${pollId}`).toBe(NATIONAL_APPROVAL);
  expect(["up", "down", "steady"], where).toContain(poll!.facts?.direction);
  expect(poll!.facts?.previousApprovalId, where).toBe("approval:2025-02");
  expect(printed().length, `${where}: printed nationally`).toBeGreaterThan(0);
  expect(found, `${where}: a kept read of the poll's story`).toBeDefined();
  const read = core.durableLog.get(found!.readId as never)!;
  const readers = (read.witnessIds ?? []).filter((id) => core.people.has(id));
  expect(readers.length, `${where}: named readers`).toBeGreaterThan(0);
  // What the News page words: the poll's percent and its direction, with the
  // President by name.
  const story = coreAPI(core)
    .moduleState(NEWS_MODULE_ID)
    .table("stories")
    .get(found!.storyId) as unknown as PrintedStory;
  const facts = printedFacts(core, story);
  expect(facts?.kind, where).toBe("approval");
  expect(facts?.facts.percent?.text, where).toBe(`${poll!.facts?.pct}%`);
  // The News page words it from the bank: a headline, and the percent once,
  // in the lede.
  const worded = wordPrintedStory(core, story);
  expect(worded?.headline, `${where}: worded`).toBeTruthy();
  expect(worded!.headline, where).not.toContain("%");
  // Dev mode's trace of the story: who it reached, and the read it made.
  const trace = dev.trace(found!.storyId);
  const reach = trace.children.find(
    (child) => child.via === "press.desk.reach",
  );
  expect(reach?.value, `${where}: the reach`).toMatchObject({
    reachedNamed: expect.any(Number),
    readsKept: expect.any(Number),
  });
  expect(
    trace.children.some(
      (child) => child.id === found!.readId && child.effect === true,
    ),
    `${where}: the read in the story's trace`,
  ).toBe(true);
  const first = core.people.get(readers[0]!)!;
  process.stdout.write(
    `APPROVAL POLL ${where}: "${worded!.headline}" ${pollId} ${poll!.facts?.pct}% ${poll!.facts?.direction}; ${found!.storyId}; ${found!.readId} names ${readers.length}, first ${first.givenName} ${first.familyName}; reach ${JSON.stringify(reach!.value)}\n`,
  );
}, 120_000);
