// @vitest-environment node
/**
 * The teacher minimum's amount is the law in force, not a research figure
 * (CTO, Nov 17, pins family 16). In a drawn place with district teachers,
 * the state makes the teacher minimum law and enacts its amount above what
 * any covered teacher is paid. The day it takes effect, every covered teacher
 * is raised to the enacted amount, and the reach rows name the amount's law
 * row. A place with no district teachers is passed over and named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { traceNode } from "../bench/dev-trace";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { jobsAt } from "./law-reach/group-b-money";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { TEACHER_FLOOR, TEACHER_FLOOR_AMOUNT } from "./public-pay-floor";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const TRIES = 4;

it(`an enacted teacher minimum raises covered teachers to its amount (replay ${replay})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  try {
    for (let attempt = 0; attempt < TRIES; attempt += 1) {
      const place = drawPlace(replay, `teacher-floor-amount:${attempt}`);
      const where = `${place.name} (${place.key}), replay ${replay} draw teacher-floor-amount:${attempt}, world seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const teachers = () =>
        jobsAt(api, ["service:school"], "profession:teacher").filter(
          (j) => (j.hourlyMinor ?? 0) > 0 && j.wageDailyMinor > 0,
        );
      const before = teachers();
      if (!before.length) {
        passed.push(`${where}: no district teachers`);
        continue;
      }
      // An amount above every covered teacher's pay, so the act raises them all.
      const top = Math.max(...before.map((j) => j.wageDailyMinor));
      const dollars = Math.ceil((top * 365) / 100 / 1000) * 1000 + 5000;
      const state = lawChain(api).stateKey;
      const effective = addDays(makeIsoDate(core.date), 2);
      const amountId = `law:${state}:state:${TEACHER_FLOOR_AMOUNT}:general:${effective}:HB 9002 (teacher pay, test)`;
      for (const [series, value] of [
        [TEACHER_FLOOR, 1],
        [TEACHER_FLOOR_AMOUNT, dollars],
      ] as const)
        enactLaw(api, {
          jurisdiction: state,
          level: "state",
          series,
          value,
          ...(series === TEACHER_FLOOR_AMOUNT ? { unit: "dollars/year" } : {}),
          effectiveDate: effective,
          measureId: "HB 9002 (teacher pay, test)",
          citation: "Test: the state's teacher minimum and its amount",
          estimate: false,
        });
      advanceCore(core, addDays(effective, 1));
      const floorDaily = (dollars * 100) / 365;
      const now = teachers();
      expect(now.length, where).toBeGreaterThan(0);
      // Every covered teacher was under the amount, so the act raised each one
      // to it: at the amount, not above it (an opening figure would miss it).
      for (const job of now) {
        expect(
          job.wageDailyMinor,
          `${where}: ${job.id}`,
        ).toBeGreaterThanOrEqual(Math.floor(floorDaily) - 1);
        expect(job.wageDailyMinor, `${where}: ${job.id}`).toBeLessThanOrEqual(
          floorDaily * 1.01,
        );
      }
      // The minimum's reach names the amount's law row.
      const reached = appliedOn(api, TEACHER_FLOOR);
      expect(reached.length, where).toBeGreaterThan(0);
      expect(
        reached.every((r) => r.lawId === amountId),
        `${where}: ${[...new Set(reached.map((r) => r.lawId))].join(", ")}`,
      ).toBe(true);
      expect(traceNode(core, undefined, amountId).answer, where).not.toBe(
        "not-a-record",
      );
      process.stdout.write(
        `TEACHER FLOOR ${where}: ${now.length} covered teachers at or above ${dollars} dollars from ${effective} (the highest was ${Math.round((top * 365) / 100)}); ${reached.length} reach rows on ${amountId}. Passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(`No place had district teachers: ${passed.join("; ")}`);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
