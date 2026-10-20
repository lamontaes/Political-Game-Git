/**
 * Full couples read the outcome web's birth-rate factor as a term in their
 * plan-a-child choice, as the counted women's births are scaled by it (pool
 * item web-calibrate-choice-terms; owner, Oct 14: one model, two tiers). The
 * choice picks the higher score, so the weight is fitted (renewalWebWeight)
 * until a factor of 0.9 takes about 0.9 of the planning share. Couples from
 * eight places drawn from all 56 are pooled (WEB_FULL_SEED pins the run).
 */
import { randomBytes } from "node:crypto";
import { expect, it, vi } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { chooseBirthPlan } from "./births-plan";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type * as OutcomeWeb from "./modules/outcome-web";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { coreAPI } from "./state";

const held = vi.hoisted(() => ({ factor: 1 }));
vi.mock("./modules/outcome-web", async (original) => ({
  ...(await original<OutcomeWeb>()),
  outcomeWebFactor: () => held.factor,
}));

const seed = process.env.WEB_FULL_SEED || randomBytes(8).toString("hex");

interface CoupleRow {
  status: string;
  motherId: string;
  otherParentId: string;
  id: string;
  startedAt: string;
  childIds: string[];
}

it("a factor of 0.9 takes full couples' planning share to about 0.9 of itself", () => {
  const worlds: string[] = [];
  const couples: { api: ReturnType<typeof coreAPI>; rows: CoupleRow[] }[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "web-births-full");
    worlds.push(`${place.name} (${place.key}) world seed ${place.seed}`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 3));
    const api = coreAPI(core);
    couples.push({
      api,
      rows: (
        api
          .moduleState(RENEWAL_MODULE_ID)
          .table("couples")
          .rows() as unknown as CoupleRow[]
      ).filter((row) => row.status === "active"),
    });
  }
  // The share of couples whose choice is to plan a child at a held factor.
  const planning = (factor: number) => {
    held.factor = factor;
    let total = 0;
    let planned = 0;
    for (const { api, rows } of couples)
      for (const row of rows) {
        total += 1;
        if (
          chooseBirthPlan(api, row.motherId, row).selected ===
          "renewal-plan-child"
        )
          planned += 1;
      }
    return planned / total;
  };
  const base = planning(1);
  const lower = planning(0.9);
  const where = `${worlds.join("; ")}; run seed ${seed}`;
  expect(base, where).toBeGreaterThan(0);
  const ratio = `ratio ${lower / base} of ${base}: ${where}`;
  expect(lower / base, ratio).toBeGreaterThan(0.75);
  expect(lower / base, ratio).toBeLessThan(1);
  // And a higher factor raises it.
  expect(planning(1.1), where).toBeGreaterThan(base);
}, 3_600_000);
