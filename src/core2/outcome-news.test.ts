/**
 * The town hears what the outcome web moved. A month's record names the
 * measures engines read that moved since the month before; the press prints
 * it by its size; residents hear it on their own days and hold it as a
 * known fact that cites the web record; the electorate's town reading counts
 * a measure only once a story with it has reached someone in town. Played in
 * the bench world, in a place drawn from all 56 on a seed nobody chose, with
 * a twin world where nothing moved.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { NEWS_MODULE_ID, storyDelivered } from "./modules/news";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { PRESS_MODULE_ID } from "./modules/press";
import { OUTCOME_MONTH_KIND, NEWS_MEASURES, webFactKey } from "./outcome-news";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.OUTCOME_NEWS_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "outcome-news");
const RENT = "housing.rent";

function play(shiftRent: boolean) {
  const opening = gameStartDate();
  const world = buildBenchWorld(seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const town = core.people.get(core.playerId!)!.placeId;
  let shifted: WebMonth | null = null;
  let day = makeIsoDate(opening);
  // A story is forgotten after a month, so stop while this one is fresh:
  // the shifted month, the month record on the next 3rd, then 25 days.
  const stop = () =>
    shiftRent
      ? shifted && day >= addDays(makeIsoDate(shifted.date), 58)
      : day >= addDays(makeIsoDate(opening), 100);
  while (!stop()) {
    day = addDays(day, 1);
    advanceCore(core, day);
    // The web's own rows are written on the 3rd: shift the first one after
    // the opening, so the next month reads rent back at its level.
    const row = (months.rows() as unknown as WebMonth[]).find(
      (r) => r.placeId === town && r.date === day && r.date > opening,
    );
    if (shiftRent && !shifted && row && row.values[RENT] !== undefined) {
      months.put({
        ...row,
        values: { ...row.values, [RENT]: row.values[RENT]! * 0.9 },
      } as never);
      shifted = row;
    }
  }
  return { core, api, town, shifted };
}

describe(`the town hears the outcome web's month (${place.name}, seed ${seed})`, () => {
  it("lists only measures an engine reads", () => {
    for (const [measure, spec] of Object.entries(NEWS_MEASURES)) {
      expect(spec.topic.length, measure).toBeGreaterThan(0);
      if (spec.readBy === null) {
        expect(spec.stopgapId, measure).toBeTruthy();
        continue;
      }
      const text = readFileSync(spec.readBy, "utf8");
      expect(text, measure).toContain(`"${measure}"`);
    }
  });

  it("records a month's moves, prints them, spreads them across days and holds them as known facts", () => {
    const { core, api, town, shifted } = play(true);
    expect(shifted, "a web row was shifted").toBeTruthy();
    const next = `${shifted!.month.slice(0, 5)}${String(Number(shifted!.month.slice(5)) + 1).padStart(2, "0")}`;
    const eventId = `${OUTCOME_MONTH_KIND}:${town}:${next}`;
    const event = core.durableLog.get(eventId);
    expect(event, `month record ${eventId}`).toBeTruthy();
    expect(event!.publicRecord).toBe(true);
    const f = event!.facts!;
    const webId = `web:${town}:${next}`;
    expect(f[webFactKey(RENT)]).toBeTruthy();
    expect(f[`${webFactKey(RENT)}:record`]).toBe(webId);
    expect(f[`${webFactKey(RENT)}:was`]).toBe(
      String(shifted!.values[RENT]! * 0.9),
    );
    expect(Number(f.magnitude)).toBeGreaterThan(0);

    // The press printed it.
    const printed = api
      .moduleState(PRESS_MODULE_ID)
      .table("stories")
      .query("byWire", [eventId]) as unknown as { id: string }[];
    expect(printed.length, "outlets that printed the month").toBeGreaterThan(0);
    const storyId = printed[0]!.id;

    // Named residents heard it, on different days, and hold the fact.
    const heard = (
      api.moduleState(NEWS_MODULE_ID).table("heard").rows() as unknown as {
        personId: string;
        storyId: string;
        date: string;
      }[]
    ).filter((row) => printed.some((p) => p.id === row.storyId));
    const people = new Set(heard.map((row) => row.personId));
    const days = new Set(heard.map((row) => row.date));
    expect(people.size).toBeGreaterThanOrEqual(2);
    expect(days.size).toBeGreaterThanOrEqual(2);
    const known = [...people].map((id) =>
      core.knowledgeByPerson.get(id)?.get(`${webFactKey(RENT)}:record`),
    );
    for (const fact of known) {
      expect(fact?.value).toBe(webId);
      // Read in print, or passed on by someone who had (the source is then
      // the relationship they were told through).
      expect(["public", "told"]).toContain(fact?.access);
      if (fact?.access === "public")
        expect(printed.some((p) => p.id === fact.sourceId)).toBe(true);
    }
    expect(
      known.some((fact) => fact?.access === "public"),
      "someone read it in print",
    ).toBe(true);
    expect(storyDelivered(api, town, RENT)?.storyId).toBeTruthy();
    console.log(
      `outcome news: ${place.name}, seed ${seed}: ${eventId} -> ${storyId}; ${people.size} residents on ${days.size} days (${[...days].sort().join(", ")})`,
    );
  }, 900_000);

  it("says nothing of rent when nothing moved", () => {
    const { core, api, town } = play(false);
    const ids = [...(core.logByKind.get(OUTCOME_MONTH_KIND) ?? [])];
    for (const id of ids)
      expect(
        core.durableLog.get(id)?.facts?.[webFactKey(RENT)],
        id,
      ).toBeUndefined();
    expect(storyDelivered(api, town, RENT)).toBeNull();
  }, 900_000);
});
