/**
 * A state's clean air plan law is read where a nonattainment county's emitters
 * are charged (routeCompliance, business.ts): the duty is federal, so the cost
 * stands with or without the plan, and cites the law row when one is in force.
 * Played world, a place whose county misses an air quality standard and that
 * has a manufacturer, miner or utility; the place and seed are named in every
 * failure message. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countyNonattainment } from "./business-operating-rules";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { REACH_B_MODULE_ID } from "./law-reach/group-b-store";
import { corePlaceByKey } from "./place-lookup";
import { realLocalities } from "./places";
import { countyPopulationSharesForPlace } from "./reference/government-units";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const question =
  "us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties";

/** The county the housing layer reads for a place (five-digit FIPS), if it has one. */
function countyOf(key: string): string | undefined {
  const geoid = corePlaceByKey(key)?.sourceGeoid ?? "";
  const county =
    geoid.length === "SSPPPPP".length
      ? [...countyPopulationSharesForPlace(geoid)].sort(
          (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
        )[0]?.[0]
      : geoid;
  return county && county.length === "SSCCC".length ? county : undefined;
}

/** Places in the seeded order whose county misses a standard in the start year. */
function dirtyPlaces(): string[] {
  const year = Number(gameStartDate().slice(0, 4));
  const rank = (key: string) =>
    createHash("sha256").update(`${seed}|clean-air|${key}`).digest("hex");
  return [...realLocalities()]
    .sort((a, b) => rank(a.key).localeCompare(rank(b.key)))
    .map((place) => place.key)
    .filter((key) => {
      const county = countyOf(key);
      return (
        county !== undefined &&
        countyNonattainment(county, year).some((row) => !row.revoked)
      );
    });
}

it("charges a nonattainment county's emitters with or without the plan, citing the law row when it is in force", () => {
  setBookkeeping(false);
  try {
    let tried = 0;
    for (const placeKey of dirtyPlaces()) {
      if (tried++ >= 10) break;
      const { core } = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey,
      });
      const api = coreAPI(core);
      const where = `${core.placeMetadata.placeName} [${placeKey}], seed ${seed}`;
      advanceCore(core, addDays(makeIsoDate(core.date), 35));
      const rules = () =>
        api
          .moduleState("business")
          .table("operating")
          .rows()
          .filter(
            (row) => row.kind === "cost" && row.cause === "clean-air",
          ) as unknown as {
          id: string;
          organizationId: string;
          source: { citation: string };
        }[];
      if (!rules().length) continue;
      const setPlan = (value: number) => {
        for (const level of lawChain(api).levels)
          enactLaw(api, {
            jurisdiction: level.jurisdiction,
            level: level.level,
            series: question,
            value,
            effectiveDate: core.date,
            measureId: `fixture:clean-air:${value}:${core.date}`,
            citation: "Controlled law case after the native generated start.",
          });
        advanceCore(core, addDays(makeIsoDate(core.date), 35));
      };
      // The federal duty stands where no clean air plan is law.
      setPlan(0);
      const federal = rules();
      expect(federal.length, where).toBeGreaterThan(0);
      const baseline = federal[0]!.source.citation;
      for (const row of federal)
        expect(row.source.citation, where).toBe(baseline);
      // Where the plan is law, each emitter's cost cites the row that governs.
      setPlan(1);
      const governing = lawInForce(api, question).governing;
      expect(governing, where).not.toBeNull();
      const cited = rules();
      // Emitters founded meanwhile are charged too; none charged before is dropped.
      for (const row of federal)
        expect(
          cited.map((c) => c.id),
          where,
        ).toContain(row.id);
      for (const row of cited) {
        expect(row.source.citation, where).toBe(
          `${governing!.id}: ${String(governing!.source)}; ${baseline}`,
        );
      }
      // The cost is the law's, read at the charge: no eligibility row stands beside it.
      if ((core as CoreState).modules.has(REACH_B_MODULE_ID))
        expect(
          api
            .moduleState(REACH_B_MODULE_ID)
            .table("organizations")
            .rows()
            .filter((row) => row.key === question),
          where,
        ).toHaveLength(0);
      // Repealing the plan returns the cost to the federal citation, not to nothing.
      setPlan(0);
      for (const row of federal)
        expect(
          rules().map((r) => r.id),
          where,
        ).toContain(row.id);
      for (const row of rules())
        expect(row.source.citation, where).toBe(baseline);
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      return;
    }
    throw new Error(
      `no nonattainment place with an emitter in ${tried} draws (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
