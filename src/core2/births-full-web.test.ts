/**
 * Full couples read the outcome web's birth-rate factor as a term in their
 * plan-a-child choice, as the counted women's births are scaled by it (pool
 * item web-calibrate-choice-terms; owner, Oct 14: one model, two tiers). The
 * choice picks the higher score, so the weight is fitted (renewalWebWeight)
 * until the planning share moves with the factor at an elasticity near 1 (0.5 to 2). Couples from
 * sixteen places drawn from all 56 are pooled (WEB_FULL_SEED pins the run).
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
  for (let draw = 0; draw < 16; draw += 1) {
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
  // Couples whose mother is past childbearing age never plan a child whatever
  // the web says (the age term alone puts the plan far below waiting), so the
  // choice is read where it can turn: couples whose age term is not that low.
  held.factor = 1;
  const open = couples.flatMap(({ api, rows }) =>
    rows
      .filter(
        (row) =>
          (
            chooseBirthPlan(api, row.motherId, row).circumstances as {
              age: number;
            }
          ).age > -2,
      )
      .map((row) => ({ api, row })),
  );
  // How many of those couples plan a child at a held factor.
  const planning = (factor: number) => {
    held.factor = factor;
    return open.filter(
      ({ api, row }) =>
        chooseBirthPlan(api, row.motherId, row).selected ===
        "renewal-plan-child",
    ).length;
  };
  const base = planning(1);
  const where = `${worlds.join("; ")}; run seed ${seed}`;
  expect(base, where).toBeGreaterThan(0);
  // The choice picks the higher score, so the share moves in whole couples:
  // read the slope across factors 0.8 to 1.2 (a central difference) as an
  // elasticity, which the fitted weight keeps inside the 0.5 to 2 it was
  // checked against.
  const elasticity = (planning(1.2) - planning(0.8)) / base / 0.4;
  expect(
    elasticity,
    `elasticity ${elasticity} on ${open.length} couples, ${base} planning: ${where}`,
  ).toBeGreaterThan(0.5);
  expect(elasticity, where).toBeLessThan(2);
  // And a lower factor lowers it, a higher one raises it.
  expect(planning(0.9), where).toBeLessThanOrEqual(base);
  expect(planning(1.1), where).toBeGreaterThanOrEqual(base);
}, 3_600_000);
