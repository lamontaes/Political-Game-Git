// @vitest-environment node
/**
 * A rent burden past 22 percent of income raises what a landlord asks of a
 * household without a home, as a slope from 22 and never a flip there
 * (rent-burden-to-homelessness, ESTIMATED 0.033 a point from GAO-20-433, its
 * spread 0.025 to 0.041). The housing engine reads it at the moment a
 * household without a home asks to rent again (reviewHomeless, through the
 * web's factor on housing.homelessness). Drawn places, seed printed.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { webLevel, webReach } from "./outcome-web-reach";
import { WEB_LINKS } from "./outcome-web-model";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const seed = process.env.RENT_BURDEN_SEED ?? randomBytes(8).toString("hex");
const KEY = "rent-burden-to-homelessness";

it("the link is sized, bracketed and read by the housing engine", () => {
  const link = WEB_LINKS.find((row) => row.key === KEY)!;
  expect(link.size).toBe(0.033);
  expect(link.range).toEqual([0.025, 0.041]);
  expect(link.shape.kind).toBe("threshold");
  expect(readFileSync("src/core2/housing-homeless.ts", "utf8")).toMatch(
    /webFactorFor\(api, row\.placeId, "housing\.homelessness"\)/,
  );
});

it(
  "a burden past 22 percent raises the rehousing factor by 0.033 a point, none below, by web month record",
  { timeout: 1_800_000 },
  () => {
    const seen: string[] = [];
    for (let draw = 0; draw < 4; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "rent-burden");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      // A year and a month: the link's twelve-month lag has run.
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      const town = lawChain(api).townPlaceId;
      const reach = webReach(api, town, "housing.homelessness");
      const burden = webLevel(api, town, "housing.rent-to-income-pct");
      const part = reach.parts.find((one) => one.link === KEY);
      process.stdout.write(
        `RENT-BURDEN ${where}: burden ${burden?.level.toFixed(1)} percent, factor ${reach.factor.toFixed(3)}, link effect ${part ? part.effect.toFixed(4) : "none"}, web month ${reach.recordId}\n`,
      );
      if (!burden || !reach.recordId) {
        seen.push(`${where}: no web month`);
        continue;
      }
      const expected = Math.max(0, burden.level - 22) * 0.033;
      if (expected > 0) {
        expect(part, `${where}: the link runs past 22 percent`).toBeTruthy();
        expect(part!.effect, where).toBeCloseTo(expected, 3);
        expect(reach.factor, where).toBeGreaterThan(1);
      } else {
        expect(part?.effect ?? 0, `${where}: nothing below 22 percent`).toBe(0);
      }
      return;
    }
    throw new Error(`no web month in any draw: ${seen.join("; ")}; ${seed}`);
  },
);
