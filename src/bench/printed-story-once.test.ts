/**
 * A story is printed once (owner, Nov 8: no parallel copy of any system). In a
 * played quarter of a place drawn from all 56, every story the press printed is
 * one article in the news engine's stories table, with the press's notes beside
 * it keyed by the same id: the press table holds none of the article's own
 * fields, and every way of reading it (by wire item, by outlet, by reporter,
 * by id, as a reader hears it) gives the same outlet for the same story id.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { storiesHeard, storyOf } from "../core2/modules/news";
import {
  outletsHere,
  PRESS_MODULE_ID,
  printedBy,
  printedForWire,
  printedStoryOf,
  storiesPrinted,
} from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

// The article's own fields: kept on the article, never on the press's notes.
const ARTICLE_FIELDS = [
  "outletId",
  "organizationId",
  "kind",
  "date",
  "topic",
  "framing",
  "slant",
  "desiredChange",
  "facts",
];

it("every printed story is stored once and every reader gets the same outlet", () => {
  const place = drawPlace(seed, "printed-story-once");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const end = addDays(makeIsoDate(core.date), 90);
  while (core.date < end)
    advanceCore(core, [addDays(makeIsoDate(core.date), 7), end].sort()[0]!);

  const press = api.moduleState(PRESS_MODULE_ID);
  // The press keeps no second copy of the articles.
  expect(() => press.table("stories"), where).toThrow();
  expect(() => press.table("archive"), where).toThrow();
  const notes = press.table("printed").rows() as unknown as Record<
    string,
    unknown
  >[];
  expect(notes.length, `${where}: stories printed`).toBeGreaterThan(0);
  const outlets = outletsHere(api);
  const organizationOf = new Map(outlets.map((o) => [o.id, o.organizationId]));
  const byOutlet = new Map<string, string>();
  for (const outlet of outlets)
    for (const story of storiesPrinted(api, outlet.id))
      byOutlet.set(story.id, story.outletId);

  for (const row of notes) {
    const id = String(row.id);
    for (const field of ARTICLE_FIELDS)
      expect(
        row[field],
        `${where}: ${id} notes carry ${field}`,
      ).toBeUndefined();
    const article = storyOf(api, id);
    expect(article, `${where}: ${id} has its article`).toBeDefined();
    expect(article!.kind, where).toBe("press.printed");
    const outletId = article!.outletId;
    expect([...organizationOf.values()], `${where}: ${id}`).toContain(outletId);
    // By id, by wire item, by reporter, by outlet: one outlet.
    expect(printedStoryOf(api, id)?.outletId, `${where}: by id ${id}`).toBe(
      outletId,
    );
    expect(
      printedForWire(api, String(row.wireId)).find((s) => s.id === id)
        ?.outletId,
      `${where}: by wire ${id}`,
    ).toBe(outletId);
    expect(
      printedBy(api, String(row.reporterId)).find((s) => s.id === id)?.outletId,
      `${where}: by reporter ${id}`,
    ).toBe(outletId);
    expect(byOutlet.get(id), `${where}: by outlet ${id}`).toBe(outletId);
    // The slant is the article's framing, the one number.
    expect(printedStoryOf(api, id)?.slant, where).toBe(article!.framing ?? 0);
  }

  // The news reader hears the same story under the same outlet.
  let heardPrinted = 0;
  for (const personId of [...core.people.keys()].slice(0, 400))
    for (const story of storiesHeard(api, personId, "1900-01-01"))
      if (byOutlet.has(story.id)) {
        heardPrinted += 1;
        expect(story.outletId, `${where}: heard ${story.id}`).toBe(
          byOutlet.get(story.id),
        );
      }
  expect(heardPrinted, `${where}: printed stories heard`).toBeGreaterThan(0);
}, 600_000);
