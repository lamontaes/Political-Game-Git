import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { metricsView } from "../bench/metrics";
import { gameStartDate } from "./game-start";
import { HOME_BOUGHT, LEASE_SIGNED, TOWN_FIGURES } from "./housing-past";
import { HOUSING_MODULE_ID } from "./modules/housing";
import { OUTPUT_NUMBERS_MODULE_ID, yearRowId } from "./output-numbers";
import { PERSON_MOVED_IN, PERSON_MOVED_WITHIN } from "./past-moves";
import { preStartHistory, preStartWindowOf } from "./pre-start";
import { coreAPI } from "./state";

// Housing's past (owner, Nov 13, 2026: the past is simulated so the present
// makes sense): in a played world at a place drawn from all 56, every lease
// and owned home on day one has a tenancy record, a lease renews on its
// signing month, a full household's tenancy is its latest move, the town's
// day-one median rent is the opening's sourced figure, and Metrics shows last
// year's rent and home value on day one, read from the pass's records.
const seed =
  process.env.HOUSING_PAST_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`housing before the start (seed ${seed})`, () => {
  it("gives day one's leases, homes and Metrics a simulated past", () => {
    const passed: string[] = [];
    for (let draw = 0; draw < 6; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "housing-past");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const town = core.placeMetadata?.housingTown;
      const housing = api.moduleState(HOUSING_MODULE_ID);
      const window = preStartWindowOf(core);
      const leases = [...core.finance.contracts.values()].filter(
        (row) =>
          row.id.startsWith("lease:") &&
          !row.endedAt &&
          row.householdId &&
          core.households.get(row.householdId)?.placeId === town,
      );
      if (!town || !window || !leases.length) {
        passed.push(`${where}: no full renter in town`);
        continue;
      }
      if (passed.length) console.log(`passed over: ${passed.join("; ")}`);

      // Every full lease has its tenancy and renews on its signing month.
      const signed = new Map(
        preStartHistory(core, { kind: LEASE_SIGNED }).map((row) => [
          String(row.facts.leaseId),
          row,
        ]),
      );
      for (const lease of leases) {
        const row = signed.get(lease.id);
        expect(row, `${where}: ${lease.id} has a tenancy`).toBeTruthy();
        const renewal = housing.table("renewals").get(lease.id) as
          { renewedAt: string; rentMinor: number } | undefined;
        expect(renewal?.renewedAt.slice(5, 7), `${where}: ${lease.id}`).toBe(
          String(row!.facts.signedOn).slice(5, 7),
        );
        expect(renewal!.renewedAt <= window.through, where).toBe(true);
        expect(renewal!.rentMinor, where).toBe(lease.amountMinor);
        // A full household's tenancy is its members' latest move, where one exists.
        const household = core.households.get(lease.householdId!)!;
        const moved = household.memberIds
          .flatMap((id) => preStartHistory(core, { personId: id }))
          .filter(
            (h) => h.kind === PERSON_MOVED_IN || h.kind === PERSON_MOVED_WITHIN,
          )
          .map((h) => h.date)
          .sort()
          .at(-1);
        if (moved) expect(row!.facts.signedOn, where).toBe(moved);
        expect(household.since, where).toBe(row!.facts.signedOn);
      }

      // Every owned home has its purchase; a restated mortgage is bought that year.
      const bought = new Map(
        preStartHistory(core, { kind: HOME_BOUGHT }).map((row) => [
          String(row.facts.householdId),
          row,
        ]),
      );
      for (const row of housing.table("dwellings").rows() as unknown as {
        householdId: string;
        tenure: string;
        valueMinor?: number;
      }[]) {
        if (row.tenure !== "own" || !row.valueMinor) continue;
        const home = bought.get(row.householdId);
        expect(
          home,
          `${where}: ${row.householdId} has a purchase`,
        ).toBeTruthy();
        const loan = housing
          .table("mortgages")
          .get(`mortgage:${row.householdId}`) as
          { boughtYear: number } | undefined;
        if (loan && core.households.has(row.householdId))
          expect(loan.boughtYear, where).toBe(
            Number(String(home!.facts.boughtOn).slice(0, 4)),
          );
      }

      // The town's market level was set once so day one's median paid rent is the sourced figure.
      const stock = housing.table("stock").get(`stock:${town}`) as
        { openingRentMinor: number } | undefined;
      const lastDay = preStartHistory(core, {
        kind: TOWN_FIGURES,
        placeId: town,
      }).at(-1);
      expect(lastDay?.date, where).toBe(window.through);
      expect(
        Math.abs(
          Number(lastDay!.facts.medianRentMinor) - stock!.openingRentMinor,
        ),
        `${where}: day one's median rent against the sourced figure`,
      ).toBeLessThanOrEqual(1);

      // Metrics shows last year on day one, from the pass's December record.
      const view = metricsView(core, town).sections.find(
        (section) => section.key === "housing",
      );
      const year = Number(core.date.slice(0, 4)) - 1;
      const past = api
        .moduleState(OUTPUT_NUMBERS_MODULE_ID)
        .table("years")
        .get(yearRowId(town, year)) as
        | {
            medianRentMinor: number;
            inputs: Record<string, { historyRecordId: string }>;
          }
        | undefined;
      const rent = view?.rows.find((row) => row.key === "rent");
      expect(rent?.before, `${where}: last year's rent on day one`).toBe(
        past?.medianRentMinor,
      );
      expect(rent!.before, where).toBeGreaterThan(0);
      expect(
        view?.rows.find((row) => row.key === "homeValue")?.before,
        `${where}: last year's home value on day one`,
      ).toBeGreaterThan(0);
      const record = past!.inputs["housing.typical-rent"]!.historyRecordId;
      const december = preStartHistory(core, {
        kind: TOWN_FIGURES,
        placeId: town,
      }).find((row) => row.id === record);
      expect(december?.date, where).toBe(`${year}-12-01`);
      expect(december?.facts.medianRentMinor, where).toBe(rent!.before);
      console.log(
        `housing past: ${where}: ${leases.length} full leases; rent ${rent!.before} last year, ${rent!.now} now; record ${record}`,
      );
      return;
    }
    throw new Error(`No drawn place had a full renter: ${passed.join("; ")}`);
  }, 600_000);
});
