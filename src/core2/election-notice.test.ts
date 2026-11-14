/**
 * The town's clerk posts one notice of election for each election day, a set
 * number of days ahead, naming every office the town votes on that day; the
 * press wire holds it as a public record (electionNoticeLeadDays). One played
 * year at a place pinned here, from the opening day.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { PRESS_MODULE_ID } from "./modules/press";
import { coreAPI } from "./state";
import { buildBenchWorld } from "../bench/world";

const SEED = "election-notice-pinned-1";
// A month before the 2026 notice day, so the run is two months, not two years.
const OPENING = "2026-09-20";

describe("the notice of election", () => {
  it("is posted before each election day and names the ballot's offices", () => {
    setBookkeeping(false);
    const place = drawPlace(SEED, "election-notice");
    const world = buildBenchWorld(place.seed, OPENING, {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const lead = api.parameter("electionNoticeLeadDays");
    const start = core.date;
    const notices = new Map<string, { date: string; ids: string[] }>();
    for (let day = 0; day < 75; day += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const row of api
        .moduleState(PRESS_MODULE_ID)
        .table("wire")
        .rows() as unknown as {
        id: string;
        kind: string;
        date: string;
        facts: Record<string, string>;
      }[])
        if (row.kind === "election-notice" && !notices.has(row.id))
          notices.set(row.id, {
            date: row.date,
            ids: JSON.parse(row.facts.contestIds!) as string[],
          });
    }
    const contests = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
    // Every election day inside the year that is far enough ahead of the
    // opening day has exactly one notice, dated the lead before it.
    const ahead = new Set(
      contests
        .filter(
          (c) =>
            c.electionDate > addDays(makeIsoDate(start), lead) &&
            c.electionDate <= core.date,
        )
        .map((c) => c.electionDate),
    );
    expect(
      ahead.size,
      `${place.name}: an election day in the year`,
    ).toBeGreaterThan(0);
    for (const day of ahead) {
      const found = [...notices.values()].filter((n) =>
        n.ids.every(
          (id) => contests.find((c) => c.id === id)?.electionDate === day,
        ),
      );
      expect(found.length, `${place.name} ${day}`).toBe(1);
      expect(found[0]!.date).toBe(addDays(makeIsoDate(day), -lead));
      const onThatDay = contests
        .filter((c) => c.electionDate === day)
        .map((c) => c.id)
        .sort();
      expect(found[0]!.ids).toEqual(onThatDay);
    }
    console.log(
      `election-notice: ${place.name} (${place.key}), seed ${SEED}; ${notices.size} notices, lead ${lead} days`,
    );
  }, 600_000);
});
