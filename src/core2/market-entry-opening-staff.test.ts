import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

interface Seen {
  id: string;
  /** Outside buyers' spending a month after the founding, before its first staffing review. */
  won: number;
  /** Months it was still hiring its opening staff (no staff yet, an opening posted), with its outside buyers' spending then. */
  hiring: { at: string; outsideMinor: number }[];
  /** Openings it had posted or filled by its second month. */
  posted?: number;
}

const outsideOf = (core: CoreState, id: string) =>
  [...(residentsRuntime(core)?.flows.values() ?? [])]
    .filter(
      (flow) =>
        flow.kind === "outside-sales" && flow.payeeId === id && !flow.endedAt,
    )
    .reduce((n, flow) => n + flow.amountMinor, 0);

/**
 * Plays a world month by month and follows every business founded in it: what
 * its outside buyers pay while it is still hiring its opening staff, and the
 * openings it posted.
 */
function followFoundings(seed: string, placeKey: string, days: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const jobs = api.moduleState("jobs");
  const seen = new Map<string, Seen>();
  for (let day = 0; day < days; day += 30) {
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    for (const id of core.organizations.keys()) {
      if (!id.startsWith("organization:founded:")) continue;
      if (core.finance.businesses.get(id)?.closedAt) continue;
      const outside = outsideOf(core, id);
      let row = seen.get(id);
      if (!row) seen.set(id, (row = { id, won: outside, hiring: [] }));
      if (!(row.won > 0)) continue;
      const employer = jobs.table("employers").get(id) as
        { staffing?: { staff: number } } | undefined;
      const open = jobs
        .table("positions")
        .query("byEmployerStatus", [id, "open"]).length;
      const filled = jobs
        .table("positions")
        .query("byEmployerStatus", [id, "filled"]).length;
      const age = (Date.parse(core.date) - Date.parse(id.slice(-10))) / 864e5;
      if (employer?.staffing && row.posted === undefined && age >= 45)
        row.posted = open + filled;
      if (employer?.staffing && !(employer.staffing.staff > 0) && open > 0)
        row.hiring.push({ at: core.date, outsideMinor: outside });
    }
  }
  return [...seen.values()].filter((row) => row.won > 0);
}

function expectHeld(where: string, rows: Seen[]) {
  for (const row of rows) {
    if (row.posted !== undefined)
      expect(
        row.posted,
        `${where}: ${row.id} posted no opening by its second month`,
      ).toBeGreaterThan(0);
    for (const month of row.hiring)
      expect(
        month.outsideMinor,
        `${where}: ${row.id} won outside buyers paying ${row.won} a month but they paid it ${month.outsideMinor} on ${month.at} while it was still hiring its opening staff`,
      ).toBeGreaterThan(0);
  }
}

describe("a founded business keeps the outside buyers it won while it hires its opening staff", () => {
  it("in Skagway, Alaska (0270760, seed 8f3ccb88...), every founding posts its openings and its outside buyers keep paying until its first hire", () => {
    const seed =
      "8f3ccb88950177eb7865cdf9e9309e08981110a90485863070461caa82dfce65";
    const where = `Skagway, Alaska (0270760), seed ${seed}`;
    const rows = followFoundings(seed, "0270760", 210);
    // The world founds inns, a building-services firm and factories in its first seven months.
    expect(
      rows.length,
      `${where}: no founding won outside buyers`,
    ).toBeGreaterThan(2);
    expect(
      rows.some((row) => row.hiring.length > 0),
      `${where}: no founding was seen hiring its opening staff`,
    ).toBe(true);
    expectHeld(where, rows);
    process.stdout.write(
      `founded outside buyers: ${where}: ${rows.map((row) => `${row.id} won ${row.won}, ${row.hiring.length} months hiring, ${row.posted ?? "?"} openings`).join("; ")}\n`,
    );
  }, 900_000);

  it("in Teaticket, Massachusetts (2569205, seed 7267935d...), where factories and an inn are founded in the first year, the same holds", () => {
    const seed =
      "7267935d62c897ff6a2b675177b96c7de73b8bb5cd851a0a2c431c61eacde194";
    const where = `Teaticket, Massachusetts (2569205), seed ${seed}`;
    const rows = followFoundings(seed, "2569205", 240);
    expect(
      rows.some((row) => row.hiring.length > 0),
      `${where}: no founding was seen hiring its opening staff`,
    ).toBe(true);
    expectHeld(where, rows);
    process.stdout.write(
      `founded outside buyers: ${where}: ${rows.length} foundings checked\n`,
    );
  }, 900_000);
});
