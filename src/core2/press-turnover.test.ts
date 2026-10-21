import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { PRESS_MODULE_ID, outletsHere } from "./modules/press";
import { coreAPI } from "./state";

// A reporter who dies is replaced through the jobs engine and the hire
// appears on the masthead (pool item gov-stopgap-press-faked-mechanic, the
// staff-turnover half): in the played world, in places drawn from all 56 on a
// seed nobody chose (PRESS_TURNOVER_SEED pins one). The death is a real
// life.death event on a reporter at a local outlet, a few weeks in, after the
// outlets have joined the jobs engine; the engine's replacement then runs for
// 240 days.
const seed = process.env.PRESS_TURNOVER_SEED ?? randomBytes(8).toString("hex");
const maxPlaces = 6;

interface Staff {
  id: string;
  outletId: string;
  role: string;
  jobId: string | null;
  hiredOn: string;
  leftOn?: string;
  leftBecause?: string;
}
interface Position {
  id: string;
  organizationId: string;
  status: string;
  openedAt: string;
  replacesPersonId?: string;
  filledBy?: string;
}

describe("press staff turnover", () => {
  it("replaces a reporter who died through a jobs hire that reaches the masthead", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let i = 0; i < maxPlaces; i += 1) {
      const place = drawPlace(i ? `${seed}:${i}` : seed, "press-turnover");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, "2026-10-12", {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const api = coreAPI(core);
      for (let day = 0; day < 35; day += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const staff = () =>
        api
          .moduleState(PRESS_MODULE_ID)
          .table("staff")
          .rows() as unknown as Staff[];
      const employers = api.moduleState(JOBS_MODULE_ID).table("employers");
      const outlet = outletsHere(api).find(
        (row) =>
          row.tier !== "national" &&
          employers.get(row.organizationId) &&
          row.reporterIds.some((id) => core.people.get(id)?.jobId),
      );
      if (!outlet) {
        tried.push(`${where}: no local outlet with a reporter on the payroll`);
        continue;
      }
      const dead = core.people.get(
        outlet.reporterIds.find((id) => core.people.get(id)?.jobId)!,
      )!;
      dead.alive = false;
      api.emit({
        id: `event:life.death:${dead.id}`,
        date: core.date,
        kind: "life.death",
        personIds: [dead.id],
        placeId: dead.placeId,
        publicRecord: false,
        source: {
          tag: "SOURCED",
          citation: "A reporter's death, placed by the test.",
          asOf: core.date,
        },
      });
      for (let day = 0; day < 240; day += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const opening = (
        api
          .moduleState(JOBS_MODULE_ID)
          .table("positions")
          .rows() as unknown as Position[]
      ).find(
        (row) =>
          row.organizationId === outlet.organizationId &&
          row.replacesPersonId === dead.id,
      );
      expect(opening, `an opening for ${dead.id} in ${where}`).toBeDefined();
      expect(opening!.status, `${opening!.id} in ${where}`).toBe("filled");
      const hire = staff().find(
        (row) => row.id === opening!.filledBy && row.jobId !== null,
      );
      expect(
        hire,
        `the hire ${opening!.filledBy} for ${opening!.id} on the masthead in ${where}`,
      ).toBeTruthy();
      expect(hire!.outletId, where).toBe(outlet.id);
      const gone = staff().find((row) => row.id === dead.id);
      expect(gone?.leftBecause, `${dead.id} on the masthead in ${where}`).toBe(
        "died",
      );
      // Every opening the jobs engine filled at a press outlet in the run,
      // not only the one this death caused, puts its hire on a masthead.
      const filled = (
        api
          .moduleState(JOBS_MODULE_ID)
          .table("positions")
          .rows() as unknown as Position[]
      ).filter(
        (row) =>
          row.organizationId.startsWith("organization:press:") &&
          row.status === "filled" &&
          row.filledBy,
      );
      expect(
        filled.length,
        `filled press openings in ${where}`,
      ).toBeGreaterThan(0);
      for (const row of filled)
        expect(
          staff().find((s) => s.id === row.filledBy && s.jobId !== null),
          `the hire ${row.filledBy} for ${row.id} on the masthead in ${where}`,
        ).toBeTruthy();
      console.log(
        `press turnover: ${where}: ${opening!.id} replaces ${dead.id} (left ${gone!.leftOn}), filled by ${hire!.id}, hired ${hire!.hiredOn}`,
      );
      return;
    }
    throw new Error(
      `No drawn place had a local outlet with a reporter (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);

  it("no group of press staff leaves on one shared day without one cause naming them", () => {
    setBookkeeping(false);
    const report: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      const place = drawPlace(i ? `${seed}:${i}` : seed, "press-exits");
      const world = buildBenchWorld(place.seed, "2026-10-12", {
        twoLevel: true,
        placeKey: place.key,
      });
      const start = world.core.date;
      for (let day = 0; day < 365; day += 1)
        advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
      const staff = coreAPI(world.core)
        .moduleState(PRESS_MODULE_ID)
        .table("staff")
        .rows() as unknown as Staff[];
      const left = staff.filter((row) => row.leftOn && row.leftOn > start);
      const byDay = new Map<string, Staff[]>();
      for (const row of left)
        byDay.set(row.leftOn!, [...(byDay.get(row.leftOn!) ?? []), row]);
      // Who leaves on a shared day without one cause naming them all (an
      // outlet closing) is a shared date, not a cause.
      const shared = [...byDay.values()].filter(
        (group) =>
          group.length > 3 &&
          new Set(group.map((row) => row.leftBecause)).size > 1,
      );
      report.push(
        `${place.name} (${place.key}, seed ${place.seed}): ${staff.length} staff, ${left.length} left on ${byDay.size} days, most on one day ${Math.max(0, ...[...byDay.values()].map((g) => g.length))}`,
      );
      expect(
        shared.map((g) => `${g[0]!.leftOn}: ${g.length}`),
        report.at(-1),
      ).toEqual([]);
    }
    console.log(`press exits: ${report.join(" | ")}`);
  }, 1_800_000);
});
