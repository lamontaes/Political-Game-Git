/**
 * The one session calendar (`data/research/laws/state-session-calendars.json`):
 * every place has a row for 2025, 2026 and 2027, and a legislature convenes
 * and adjourns on the table's dates in whichever of those years is drawn.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import table from "../../data/research/laws/state-session-calendars.json" with { type: "json" };
import oddYearBodies from "../../data/research/laws/regular-session-years.json" with { type: "json" };
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { openLegislature } from "./modules/legislature";
import { openLawReach } from "./law-reach/host";
import {
  openWorldLegislating,
  sessionAgendaDates,
  sessionsOf,
  WORLD_LEGISLATING_MODULE_ID,
} from "./modules/world-legislating";
import { sessionWindows, sessionYear } from "./state-session-calendar";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`session-calendar:${Date.now()}`).digest("hex");
const YEARS = [2025, 2026, 2027];
const places = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("state session calendar table", () => {
  it("has rows for all 56 places and all three years, each sourced and tagged", () => {
    expect(places).toHaveLength(56);
    const rows = (
      table as unknown as {
        places: Record<string, { years: Record<string, unknown> }>;
        sources: Record<string, unknown>;
      }
    ).places;
    expect(Object.keys(rows).sort()).toEqual(places);
    for (const place of places)
      for (const year of YEARS) {
        const row = sessionYear(place, year);
        expect(row, `${place} ${year}`).not.toBeNull();
        expect(["SOURCED", "ESTIMATED"]).toContain(row!.tag);
        if (row!.meets) {
          expect(row!.windows.length, `${place} ${year}`).toBeGreaterThan(0);
          for (const w of row!.windows) {
            expect(w.conveneAt, `${place} ${year}`).toMatch(ISO);
            expect(
              ISO.test(w.adjournAt) || w.adjournAt === "full-year",
              `${place} ${year} ${w.adjournAt}`,
            ).toBe(true);
            if (ISO.test(w.adjournAt))
              expect(w.adjournAt >= w.conveneAt, `${place} ${year}`).toBe(true);
          }
        } else {
          // An explicit "does not meet" row: no windows, and the reason.
          expect(row!.windows, `${place} ${year}`).toEqual([]);
          const raw = rows[place]!.years[String(year)] as {
            comments?: string[];
          };
          expect(raw.comments?.length, `${place} ${year}`).toBeGreaterThan(0);
        }
      }
    // Every body regular-session-years.json lists as odd-year skips 2026.
    const odd = Object.keys(
      (oddYearBodies as unknown as { rows: Record<string, unknown> }).rows,
    );
    expect(odd.length).toBeGreaterThan(0);
    for (const place of odd) {
      expect(sessionYear(place, 2025)!.meets, place).toBe(true);
      expect(sessionYear(place, 2026)!.meets, place).toBe(false);
      expect(sessionYear(place, 2027)!.meets, place).toBe(true);
    }
  });

  it("a legislature adjourns on the table's date in a drawn place and year", () => {
    const tried: string[] = [];
    let ran = false;
    for (let attempt = 0; attempt < 8 && !ran; attempt += 1) {
      const state = pick(places, `state:${attempt}`);
      const year = pick(YEARS, `year:${attempt}`);
      const windows = sessionWindows(state, year);
      tried.push(`${state} ${year}`);
      if (!windows.length) continue;
      const dates = sessionAgendaDates(state, year);
      expect(dates, `${state} ${year}`).toHaveLength(windows.length);
      const localities = [
        ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      if (!localities.length) continue;
      const placeKey = pick(localities, `place:${attempt}`).key;
      // Open the world the day before the year's first floor day (or on the
      // game's opening day, January 20, 2025, if that is later).
      const first = [...windows].sort((a, b) =>
        a.conveneAt.localeCompare(b.conveneAt),
      )[0]!;
      const day = new Date(Date.parse(`${dates[0]}T00:00:00Z`) - 86_400_000)
        .toISOString()
        .slice(0, 10);
      const start = day < "2025-01-20" ? "2025-01-20" : day;
      if (dates[0]! <= start) continue;
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey,
          startedAt: start,
          minimumPeople: 40,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openRecord(core);
      openLegislature(core);
      openLawReach(core);
      openWorldLegislating(core);
      const calendar = coreAPI(core).moduleCalendar(
        WORLD_LEGISLATING_MODULE_ID,
      );
      // The legislature convenes on the table's date (the window opens) and
      // its adjournment is on the calendar for the table's date.
      expect(first.conveneAt).toBe(
        sessionWindows(state, year).find(
          (w) => w.conveneAt === first.conveneAt,
        )!.conveneAt,
      );
      const end = dates.find((d) => d > start)!;
      expect(
        calendar.get(`session-end:${state}:${end}`)?.date,
        `seed ${seed}, ${state} ${year} place ${placeKey}`,
      ).toBe(end);
      advanceCore(core, end);
      const held = sessionsOf(coreAPI(core)).filter(
        (s) => s.stateKey === state,
      );
      expect(
        held.some((s) => s.date === end),
        `seed ${seed}, ${state} ${year}: no session held on ${end}`,
      ).toBe(true);
      ran = true;
    }
    expect(ran, `no meeting legislature drawn in ${tried.join(", ")}`).toBe(
      true,
    );
  }, 120_000);

  it("a body that skips a year schedules its next floor day in the year it meets", () => {
    const place = pick(
      Object.keys(
        (oddYearBodies as unknown as { rows: Record<string, unknown> }).rows,
      ),
      "odd",
    );
    expect(sessionAgendaDates(place, 2025)).toHaveLength(1);
    expect(sessionAgendaDates(place, 2026)).toEqual([]);
    expect(sessionAgendaDates(place, 2027)).toHaveLength(1);
  });
});
