/**
 * How a worker works, in play: a place drawn from all 56, built as the game
 * builds it (`buildBenchWorld`, two-level, every module), plays its first three
 * months. When a business lets a worker go, it lets go of the one it values
 * least: tenure plus how they work (`jobs.value-worker`, the worker's lean
 * toward diligence, sized from Barrick and Mount 1991). The test names a
 * layoff record where how they work, not tenure alone, decided who went.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { testPlace } from "./money-traits-kit";
import { coreAPI } from "./state";

interface Change {
  id: string;
  kind: string;
  personId: string;
  organizationId: string;
  values?: Readonly<Record<string, number>>;
}

const DAYS = 90;
const MAX_DRAWS = 3;

describe("an employer values how a worker works", () => {
  it("lets go of a worker for how they work, by record", () => {
    const tried: string[] = [];
    let found: { change: Change; label: string } | undefined;
    for (let attempt = 0; attempt < MAX_DRAWS && !found; attempt++) {
      const place = testPlace(`value-worker:${attempt}`);
      const start = gameStartDate();
      const world = buildBenchWorld(place.seed, start, {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(world.core, addDays(start, DAYS));
      const layoffs = (
        coreAPI(world.core)
          .moduleState(JOBS_MODULE_ID)
          .table("changes")
          .rows() as unknown as Change[]
      ).filter((row) => row.kind === "layoff");
      const decided = layoffs.filter((row) => row.values?.workDecided === 1);
      const label = `${place.name} (${place.key}), seed ${place.seed}`;
      tried.push(
        `${label}: ${layoffs.length} layoffs, ${decided.length} decided by how they work`,
      );
      // Every layoff keeps the reasons it was weighed by.
      for (const row of layoffs) {
        expect(row.values?.tenureScore, row.id).toBeTypeOf("number");
        expect(row.values?.workScore, row.id).toBeTypeOf("number");
        expect(row.values?.keepScore, row.id).toBeCloseTo(
          row.values!.tenureScore! + row.values!.workScore!,
          9,
        );
      }
      const change = decided[0];
      if (change) found = { change, label };
    }
    console.log(`value-worker layoffs: ${tried.join("; ")}`);
    expect(found, `places tried: ${tried.join("; ")}`).toBeDefined();
    const { change, label } = found!;
    console.log(
      `${label}: ${change.id} let ${change.personId} go from ${change.organizationId} ` +
        `(tenure ${change.values!.tenureScore!.toFixed(3)} years, how they work ` +
        `${change.values!.workScore!.toFixed(3)}); a worker with less tenure was kept`,
    );
    // Someone with less tenure was kept, so the one let go was valued lower
    // for how they work.
    expect(change.values!.workDecided).toBe(1);
  }, 900_000);
});
