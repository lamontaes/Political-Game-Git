/**
 * The clean air plan law is read where the duty is set (pool item
 * laws-family-clean-air): in a played year in a county out of attainment, a
 * manufacturer's monthly compliance payment on the journal cites the state's
 * plan row in force, no generic employer row stands beside it, and a repeal
 * leaves the federal duty citing the Clean Air Act instead.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countyNonattainment } from "./business-operating-rules";
import { gameStartDate } from "./game-start";
import startingLaw from "../../data/research/laws/starting-law-2026/environment-energy.json" with { type: "json" };
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { REACH_B_MODULE_ID } from "./law-reach/group-b-store";
import { corePlaceByKey } from "./place-lookup";
import { realLocalities } from "./places";
import { countyPopulationSharesForPlace } from "./reference/government-units";
import { coreAPI } from "./state";

const question =
  "us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties";
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** States whose starting law carries a clean air plan (a county out of attainment for particulates). */
const planStates = new Set(
  Object.entries(
    (
      startingLaw as unknown as {
        questions: Record<
          string,
          { answers: Record<string, { answer: string }> }
        >;
      }
    ).questions[question]!.answers,
  )
    .filter(([, row]) => row.answer === "yes")
    .map(([state]) => state),
);

/** The places in a state with a plan whose county misses an air quality standard in 2026, in a seeded order. */
function nonattainmentPlaces() {
  const rank = (key: string) =>
    createHash("sha256").update(`${seed}|clean-air|${key}`).digest("hex");
  return [...realLocalities()]
    .sort((a, b) => rank(a.key).localeCompare(rank(b.key)))
    .filter((place) => {
      if (!planStates.has(place.stateJurisdictionKey ?? "")) return false;
      const geoid = corePlaceByKey(place.key)?.sourceGeoid ?? "";
      const county =
        geoid.length === 7
          ? [...countyPopulationSharesForPlace(geoid)].sort(
              (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
            )[0]?.[0]
          : geoid;
      return (
        county?.length === 5 &&
        countyNonattainment(county, 2026).some((row) => !row.revoked)
      );
    });
}

describe("the clean air plan law, read by the business engine", () => {
  it("a manufacturer's compliance payment cites the plan row in force; a repeal falls back to the federal duty", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (const place of nonattainmentPlaces().slice(0, 6)) {
      tried.push(place.key);
      let world: ReturnType<typeof buildBenchWorld>;
      try {
        world = buildBenchWorld(seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
      } catch (error) {
        // A known gap (pool item core-needs-core-91): a very small place can't open.
        if (/holds a resident aged/.test(String(error))) continue;
        throw error;
      }
      const { core } = world;
      const api = coreAPI(core);
      const where = `seed ${seed}, ${place.displayName} [${place.key}]`;
      const table = api.moduleState("business").table("operating");
      advanceCore(core, addDays(makeIsoDate(core.date), 62));
      const duties = () =>
        table
          .rows()
          .filter((r) => r.kind === "cost" && r.cause === "clean-air") as {
          id: string;
          organizationId: string;
          source: { citation: string };
        }[];
      if (!duties().length) continue; // no emitter in this town: draw the next place
      const plan = lawInForce(api, question);
      expect(plan.governing, `${where}: no plan row in force`).toBeTruthy();
      expect(plan.value, where).toBe(1);
      for (const duty of duties())
        expect(duty.source.citation, `${where} ${duty.id}`).toContain(
          plan.governing!.id,
        );

      // The payment on the journal carries the same citation.
      const payments = api
        .moduleState("business")
        .table("compliance")
        .rows()
        .filter((r) => r.cause === "clean-air");
      expect(payments.length, where).toBeGreaterThan(0);
      // Each payment names the rule it paid, and that rule's source (the
      // source the journal posting carries) cites the plan row.
      for (const payment of payments) {
        const rule = table.get(String(payment.ruleId)) as
          { source: { citation: string } } | undefined;
        expect(rule, `${where} payment ${payment.id}`).toBeTruthy();
        expect(rule!.source.citation, `${where} ${payment.id}`).toContain(
          plan.governing!.id,
        );
      }

      // No generic employer row stands beside the engine's read.
      const reach = (["organizations", "people", "groups"] as const).flatMap(
        (name) =>
          core.modules.has(REACH_B_MODULE_ID)
            ? api
                .moduleState(REACH_B_MODULE_ID)
                .table(name)
                .rows()
                .filter((r) => r.key === question)
            : [],
      );
      expect(reach, where).toEqual([]);

      // Repeal the state's plan: the duty stays (EPA's plan applies) and now
      // cites the Clean Air Act alone.
      for (const level of lawChain(api).levels)
        enactLaw(api, {
          jurisdiction: level.jurisdiction,
          level: level.level,
          series: question,
          value: 0,
          effectiveDate: core.date,
          measureId: "fixture:clean-air:0",
          citation: "Controlled repeal after the native generated year.",
        });
      advanceCore(core, addDays(makeIsoDate(core.date), 32));
      expect(duties().length, where).toBeGreaterThan(0);
      for (const duty of duties())
        expect(duty.source.citation, `${where} ${duty.id}`).not.toContain(
          plan.governing!.id,
        );
      return;
    }
    throw new Error(
      `seed ${seed}: no town among ${tried.join(", ")} had an emitter in a county out of attainment`,
    );
  }, 900_000);
});
