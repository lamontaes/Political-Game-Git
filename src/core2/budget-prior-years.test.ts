/**
 * Every government opens with its prior years' budgets in the history before
 * day one: the opening budget's lines taken back by the level's published
 * growth, each marked as an estimate with its source. Two drawn places.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { budgetsOf, governments } from "./modules/budgets";
import { preStartHistory } from "./pre-start";
import { coreAPI } from "./state";
import growth from "./data/budgets/prior-year-growth.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

for (const draw of [0, 1]) {
  it(`shows each government's prior years' budgets, estimated from the opening one (seed ${seed}:${draw})`, () => {
    const place = drawPlace(`${seed}:${draw}`, "budget-prior-years");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const adopted = preStartHistory(core, { kind: "budget.adopted" });
      for (const gov of governments(api)) {
        const rows = adopted.filter((r) => r.facts.governmentId === gov.id);
        const years = rows.map((r) => Number(r.facts.fiscalYear)).sort();
        expect(
          years.length,
          `${where}: ${gov.name} fiscal years`,
        ).toBeGreaterThanOrEqual(2);
        const opening = budgetsOf(api, gov.id)[0]!;
        const priors = rows.filter((r) => Number(r.facts.yearsBack) >= 1);
        expect(
          priors.length,
          `${where}: ${gov.name} prior years`,
        ).toBeGreaterThan(0);
        const rate =
          gov.level === "federal"
            ? growth.levels.federal.annualGrowth
            : growth.levels["state-and-local"].annualGrowth;
        for (const prior of priors) {
          const back = Number(prior.facts.yearsBack);
          expect(prior.facts.fiscalYear, where).toBe(opening.fiscalYear - back);
          expect(prior.source.tag, where).toBe("ESTIMATED");
          expect(prior.source.citation, where).toContain("http");
          for (const [line, minor] of Object.entries(opening.spendingMinor)) {
            const was = Number(prior.facts[`spending.${line}`]);
            expect(
              Math.abs(was - Math.round(minor / (1 + rate) ** back)),
              `${where}: ${gov.name} ${line} ${back} year(s) back`,
            ).toBeLessThanOrEqual(1);
          }
        }
      }
    } finally {
      setBookkeeping(true);
    }
  }, 600_000);
}
