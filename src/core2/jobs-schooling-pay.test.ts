/**
 * A person's schooling sets the pay they are hired at (pool item
 * world-schooling-to-pay): over a played year, each hire's pay is the
 * position's pay moved by the hire's own education record, so hires into
 * positions at the same pay differ by schooling. A place is drawn from all 56
 * on a seed nobody chose (SCHOOLING_PAY_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID, hirePay, type PositionRow } from "./modules/jobs";
import { lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

const seed = process.env.SCHOOLING_PAY_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("hires into one position pay differ by their own schooling, full and counted alike", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "schooling-pay");
    const where = `${place.name} (${place.key}), seed ${place.seed}, SCHOOLING_PAY_SEED=${seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const store = api.moduleState(JOBS_MODULE_ID);
    const positions = new Map(
      (
        store.table("positions").rows() as unknown as {
          id: string;
          hourlyMinor: number;
        }[]
      ).map((row) => [row.id, row.hourlyMinor]),
    );
    const hires = (
      store.table("changes").rows() as unknown as {
        jobId: string;
        personId: string;
        kind: string;
        values: {
          hourlyMinor: number;
          counted?: number;
          schoolingWeekly?: number;
        };
      }[]
    )
      .filter((row) => row.kind === "hire")
      .map((row) => {
        const positionId = row.jobId
          .slice("job:".length)
          .slice(0, -(row.personId.length + 1));
        // The schooling the hire's pay read, as the hire recorded it (a
        // counted worker filled in later may gain a record the hire never saw).
        const weekly = row.values.schoolingWeekly ?? 0;
        const level =
          weekly === api.parameter("jobsWeeklyEarningsCollege")
            ? "college"
            : weekly === api.parameter("jobsWeeklyEarningsSomeCollege")
              ? "some-college"
              : weekly === api.parameter("jobsWeeklyEarningsNoCollege")
                ? "no-college"
                : "";
        return {
          jobId: row.jobId,
          level: level ?? "",
          counted: Boolean(row.values.counted),
          paid: row.values.hourlyMinor,
          position: positions.get(positionId),
        };
      })
      .filter((row) => row.position !== undefined && row.level);
    const ordered = ["no-college", "some-college", "college"];
    const byPosition = Map.groupBy(hires, (row) => row.position!);
    let low: (typeof hires)[number] | undefined;
    let high: (typeof hires)[number] | undefined;
    for (const [, rows] of byPosition) {
      const a = rows.find((r) => r.level === "no-college");
      const b = rows.find((r) => r.level === "college");
      if (a && b) {
        low = a;
        high = b;
        break;
      }
    }
    if (!low || !high) {
      // Two hires at the same position pay who differ in schooling are needed
      // for the same-job comparison; another place is drawn.
      tried.push(`${where}: ${hires.length} hires, no same-pay pair of levels`);
      continue;
    }
    expect(
      ordered.indexOf(low.level) < ordered.indexOf(high.level),
      where,
    ).toBe(true);
    expect(
      low.paid / low.position!,
      `${where}: ${low.jobId} vs ${high.jobId}`,
    ).toBeLessThan(high.paid / high.position!);
    return;
  }
  throw new Error(
    `no drawn place had two hires at one position pay with different schooling: ${tried.join("; ")}`,
  );
}, 1_800_000);

it("schooling never takes a hire under the minimum wage an opening was posted at", () => {
  const place = drawPlace(`${seed}:floor`, "schooling-pay");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const floor = lawInForce(api, "minimum-wage").value ?? 0;
  expect(floor, `${where}: minimum wage in force`).toBeGreaterThan(0);
  const job = [...core.jobs.values()].find(
    (row) =>
      !core.organizations.get(row.organizationId)?.publicPayAuthority &&
      (row.hourlyMinor ?? 0) > 0,
  );
  expect(job, `${where}: a private job to post from`).toBeDefined();
  const opening = (hourlyMinor: number): PositionRow => ({
    id: `position:test:${hourlyMinor}`,
    organizationId: job!.organizationId,
    placeId: place.key,
    templateJobId: job!.id,
    title: job!.title,
    occupation: job!.title,
    hourlyMinor,
    openedAt: core.date,
    status: "open",
    reasonKey: "test",
  });
  // A hire whose schooling pays under the all-worker average: their pay at an
  // opening well above the floor comes out lower than posted.
  const above = opening(floor * 2);
  const hire = [...core.people.keys()].find(
    (id) => hirePay(api, above, id) < above.hourlyMinor,
  );
  expect(hire, `${where}: a hire paid under the posted rate`).toBeDefined();
  expect(hirePay(api, above, hire!)).toBeGreaterThanOrEqual(floor);
  // At an opening posted at the floor, the same hire is paid the floor.
  expect(hirePay(api, opening(floor), hire!), `${where}: ${hire}`).toBe(floor);
  process.stdout.write(
    `schooling floor: ${where}: ${hire} paid ${hirePay(api, above, hire!)} at ${above.hourlyMinor}, ${floor} at the floor\n`,
  );
}, 300_000);
