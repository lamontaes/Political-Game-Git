/** The state's clean air plan law decides whether a polluted county's emitters pay, in a generated town. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { countyNonattainment } from "./business-operating-rules";
import { countyPopulationSharesForPlace } from "./reference/government-units";
import { corePlaceByKey } from "./place-lookup";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";

const question =
  "us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties";
const EMITTERS = ["manufacturing", "quarry"];

/** The county the business engine reads for a place (five-digit FIPS), if it has one. */
function countyOf(placeKey: string): string {
  const geoid = corePlaceByKey(placeKey)?.sourceGeoid ?? "";
  const county =
    geoid.length === 7
      ? ([...countyPopulationSharesForPlace(geoid)].sort(
          (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
        )[0]?.[0] ?? "")
      : geoid;
  return county.length === 5 ? county : "";
}

it("charges a polluted county's emitters while the plan law is in force and stops on repeal", () => {
  const seed = randomBytes(32).toString("hex");
  setBookkeeping(false);
  try {
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const draw = drawPlace(seed, `clean-air:${attempt}`);
      const startYear = Number(gameStartDate().slice(0, 4));
      const named = countyOf(draw.key);
      // Only build a world for a county that misses a standard.
      if (
        !named ||
        !countyNonattainment(named, startYear).some((row) => !row.revoked)
      )
        continue;
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const county = core.placeMetadata.housingCounty ?? "";
      const year = Number(core.date.slice(0, 4));
      const standards = county
        ? countyNonattainment(county, year).filter((row) => !row.revoked)
        : [];
      const emitters = [...core.finance.businesses.values()].filter(
        (book) => !book.closedAt && EMITTERS.includes(book.kindId),
      );
      if (!standards.length || !emitters.length) continue;
      const where = `seed ${draw.seed}, place ${draw.key}, county ${county}`;
      const set = (value: number) => {
        for (const level of lawChain(api).levels)
          enactLaw(api, {
            jurisdiction: level.jurisdiction,
            level: level.level,
            series: question,
            value,
            effectiveDate: core.date,
            measureId: `test:clean-air:${value}:${core.date}`,
            citation: "Controlled law case in a generated year.",
          });
        advanceCore(core, addDays(makeIsoDate(core.date), 35));
      };
      const rules = () =>
        api
          .moduleState("business")
          .table("operating")
          .rows()
          .filter((row) => String(row.id).endsWith(":clean-air"));
      const payments = () =>
        api
          .moduleState("business")
          .table("compliance")
          .rows()
          .filter((row) => row.cause === "clean-air");
      set(0);
      expect(rules(), `${where}: no plan law`).toHaveLength(0);
      expect(payments(), where).toHaveLength(0);
      set(1);
      expect(rules().length, `${where}: plan law in force`).toBeGreaterThan(0);
      expect(payments().length, where).toBeGreaterThan(0);
      expect(core.cashJournal.totals.grossDebitMinor).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      const paid = payments().length;
      set(0);
      expect(rules(), `${where}: repealed`).toHaveLength(0);
      expect(payments().length, where).toBe(paid);
      return;
    }
    throw new Error("no polluted county with an emitter in 400 draws");
  } finally {
    setBookkeeping(true);
  }
}, 1_200_000);
