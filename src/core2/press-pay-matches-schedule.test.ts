/**
 * A press job's pay over the year its work schedule runs is the annual pay
 * the staff table posts: payroll pays the hourly rate for the scheduled
 * minutes, so the rate is set over those minutes, whatever hours the schedule
 * it follows runs. A random place from all 56 with local outlets.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { outletsHere, pressParameter, staffOf } from "./modules/press";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a press job pays its posted annual pay over the minutes its schedule runs", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "press-pay-schedule");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    tried.push(`${place.name} (${place.key})`);
    const core = world.core;
    const api = coreAPI(core);
    const rows = outletsHere(api)
      .filter((o) => o.tier === "local")
      .flatMap((o) => staffOf(api, o.id))
      .filter((s) => s.jobId);
    if (!rows.length) continue;
    const posted: Record<string, number> = {
      head: pressParameter("editorAnnualPayMinor"),
      reporter: pressParameter("reporterAnnualPayMinor"),
    };
    for (const row of rows) {
      const commitment = [...core.work.commitments.values()].find(
        (c) => c.jobId === row.jobId && c.endsAt === undefined,
      );
      expect(commitment, `${place.name}, ${row.id}`).toBeDefined();
      const weeksPerYear = pressParameter("daysPerYear") / 7;
      const annual =
        (commitment!.hourlyMinor *
          commitment!.expectedWeeklyMinutes *
          weeksPerYear) /
        60;
      expect(
        annual / posted[row.role]!,
        `${place.name}, seed ${seed}:${draw}, ${row.id}`,
      ).toBeCloseTo(1, 1);
    }
    return;
  }
  throw new Error(`No local outlet staff found: ${tried.join("; ")}`);
}, 3_600_000);
