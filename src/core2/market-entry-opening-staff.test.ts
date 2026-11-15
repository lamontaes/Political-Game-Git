import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

interface Month {
  at: string;
  /** Its staff at its last staffing review. */
  staff: number;
  /** What its outside buyers pay it a month now. */
  outsideMinor: number;
}

interface Seen {
  id: string;
  /** Openings it had posted or filled by its second month. */
  posted?: number;
  months: Month[];
}

/** A founded business's outside buyers' flows, or none where it won no outside buyers. */
const outsideFlows = (core: CoreState, id: string) =>
  [...(residentsRuntime(core)?.flows.values() ?? [])].filter(
    (flow) =>
      flow.kind === "outside-sales" && flow.payeeId === id && !flow.endedAt,
  );

/**
 * Plays a world month by month and follows every business founded in it that
 * won outside buyers: its staff, what those buyers pay it, and the openings
 * it posted.
 */
function followFoundings(seed: string, placeKey: string, days: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const jobs = coreAPI(core).moduleState("jobs");
  const seen = new Map<string, Seen>();
  for (let day = 0; day < days; day += 30) {
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    for (const id of core.organizations.keys()) {
      if (!id.startsWith("organization:founded:")) continue;
      if (core.finance.businesses.get(id)?.closedAt) continue;
      const flows = outsideFlows(core, id);
      if (!flows.length) continue;
      let row = seen.get(id);
      if (!row) seen.set(id, (row = { id, months: [] }));
      const employer = jobs.table("employers").get(id) as
        { staffing?: { staff: number } } | undefined;
      const count = (status: string) =>
        jobs.table("positions").query("byEmployerStatus", [id, status]).length;
      const age = (Date.parse(core.date) - Date.parse(id.slice(-10))) / 864e5;
      if (employer?.staffing && row.posted === undefined && age >= 45)
        row.posted = count("open") + count("filled");
      row.months.push({
        at: core.date,
        staff: employer?.staffing?.staff ?? 0,
        outsideMinor: flows.reduce((n, flow) => n + flow.amountMinor, 0),
      });
    }
  }
  return [...seen.values()];
}

/**
 * Each founding posts its openings by its second month; its outside buyers pay
 * it nothing before its first hire; and a month after its first hire, still
 * staffed, they pay it.
 */
function expectPaidFromFirstHire(where: string, rows: Seen[]) {
  for (const row of rows) {
    if (row.posted !== undefined)
      expect(
        row.posted,
        `${where}: ${row.id} posted no opening by its second month`,
      ).toBeGreaterThan(0);
    const hired = row.months.findIndex((month) => month.staff > 0);
    for (const month of hired < 0 ? row.months : row.months.slice(0, hired))
      expect(
        month.outsideMinor,
        `${where}: ${row.id}'s outside buyers paid it ${month.outsideMinor} a month on ${month.at}, before it had hired anyone`,
      ).toBe(0);
    const after = hired < 0 ? undefined : row.months[hired + 1];
    if (after && after.staff > 0)
      expect(
        after.outsideMinor,
        `${where}: ${row.id} hired by ${row.months[hired]!.at} but its outside buyers paid it nothing on ${after.at}`,
      ).toBeGreaterThan(0);
  }
}

const summary = (rows: Seen[]) =>
  rows
    .map((row) => {
      const hired = row.months.find((month) => month.staff > 0);
      return `${row.id}: ${hired ? `first hire seen ${hired.at}` : "not yet hired"}, ${row.months.at(-1)!.outsideMinor} a month at the end`;
    })
    .join("; ");

describe("a founded business is paid by the outside buyers it won from its first hire", () => {
  it("in Skagway, Alaska (0270760, seed 8f3ccb88...), every founding posts its openings, is paid nothing before its first hire and is paid after it", () => {
    const seed =
      "8f3ccb88950177eb7865cdf9e9309e08981110a90485863070461caa82dfce65";
    const where = `Skagway, Alaska (0270760), seed ${seed}`;
    const rows = followFoundings(seed, "0270760", 300);
    // The world founds inns, a building-services firm and factories in its first seven months.
    expect(
      rows.length,
      `${where}: no founding won outside buyers`,
    ).toBeGreaterThan(2);
    expect(
      rows.some((row) => row.months.some((month) => month.staff > 0)),
      `${where}: no founding hired within the run`,
    ).toBe(true);
    expectPaidFromFirstHire(where, rows);
    process.stdout.write(
      `founded outside buyers: ${where}: ${summary(rows)}\n`,
    );
  }, 900_000);

  it("in Teaticket, Massachusetts (2569205, seed 7267935d...), where factories and an inn are founded in the first year, the same holds", () => {
    const seed =
      "7267935d62c897ff6a2b675177b96c7de73b8bb5cd851a0a2c431c61eacde194";
    const where = `Teaticket, Massachusetts (2569205), seed ${seed}`;
    const rows = followFoundings(seed, "2569205", 300);
    expect(
      rows.some((row) => row.months.some((month) => month.staff > 0)),
      `${where}: no founding hired within the run`,
    ).toBe(true);
    expectPaidFromFirstHire(where, rows);
    process.stdout.write(
      `founded outside buyers: ${where}: ${summary(rows)}\n`,
    );
  }, 900_000);
});
