/**
 * A new game can start in a different economy (pool item
 * play-new-game-world-options): the unemployment, inflation and policy-rate
 * figures a player chooses are the opening month of the macro engine, in a
 * random place from all 56. The refused values are named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { MACRO_MODULE_ID, nationalPanel } from "./modules/macro";
import { coreAPI } from "./state";
import { checkSettings } from "./world-settings";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("opens in the economy the player chose, and refuses a nonsense one", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "world-economy-setting");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const open = (economy?: Record<string, number>) => {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
      ...(economy ? { settings: { economy } } : {}),
    });
    expect(core.modules.has(MACRO_MODULE_ID), where).toBe(true);
    // The macro engine writes its opening history on the first day.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const months = nationalPanel(coreAPI(core)).months as unknown as {
      unemploymentPct: number;
      inflationPct: number;
      policyRatePct: number;
    }[];
    return months[months.length - 1]!;
  };
  const real = open();
  const chosen = {
    unemploymentPct: real.unemploymentPct + 5,
    inflationPct: real.inflationPct + 3,
    policyRatePct: real.policyRatePct + 2,
  };
  const custom = open(chosen);
  // The macro engine starts from the chosen month and moves on by its own
  // rule, so the figures sit near the choice and well away from the real ones.
  for (const key of [
    "unemploymentPct",
    "inflationPct",
    "policyRatePct",
  ] as const) {
    expect(Math.abs(custom[key] - chosen[key]), `${where} ${key}`).toBeLessThan(
      0.5,
    );
    expect(custom[key] - real[key], `${where} ${key}`).toBeGreaterThan(
      (chosen[key] - real[key]) / 2,
    );
  }
  expect(() => checkSettings({ economy: { unemploymentPct: 60 } })).toThrow(
    /unemployment/,
  );
  expect(() => checkSettings({ economy: { inflationPct: -20 } })).toThrow(
    /inflation/,
  );
}, 900_000);
