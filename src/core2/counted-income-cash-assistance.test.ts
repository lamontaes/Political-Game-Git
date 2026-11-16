/**
 * A counted household's income counts the cash assistance the welfare line pays
 * it, once (pool item world-counted-income-reads-cash-assistance). Danville,
 * Pennsylvania (4218136, seed ilt-danville): a counted household given a
 * welfare-line payment shows that year's amount more income to the one reader
 * (`householdIncome`), the poverty measure and the voucher ranking, each by
 * household id. Pinned place and seed, never drawn.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { tenants } from "./housing-occupancy";
import { putRow } from "./law-reach/group-b-store";
import { householdIncome, residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import { householdPoverty } from "./world-poverty";

it("Danville: a counted household's income rises once by its welfare payment", () => {
  const { core } = buildBenchWorld("ilt-danville", gameStartDate(), {
    twoLevel: true,
    placeKey: "4218136",
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const months = api.parameter("macroMonthsPerYear");
  const counted = tenants(api).find((t) => t.tier === "counted");
  expect(counted, "Danville has a counted renter household").toBeDefined();
  const house = [...rt.store.liveHouseholds()].find(
    (h) => h.id === counted!.id,
  )!;
  const yearly = 24_000_00;
  const incomeBefore = householdIncome(rt, house);
  const povertyBefore = householdPoverty(core).find(
    (p) => p.householdId === house.id,
  )!;
  putRow(api, "taken", {
    id: "assist|budget-line:welfareAndMedicaid",
    key: "assist|budget-line:welfareAndMedicaid",
    monthlyByHousehold: { [house.id]: yearly / months },
  });
  expect(householdIncome(rt, house) - incomeBefore).toBeCloseTo(yearly, 0);
  const povertyAfter = householdPoverty(core).find(
    (p) => p.householdId === house.id,
  )!;
  expect(povertyAfter.incomeMinor - povertyBefore.incomeMinor).toBeCloseTo(
    yearly,
    0,
  );
  const after = tenants(api).find((t) => t.id === house.id)!;
  expect(after.incomeMinor - counted!.incomeMinor).toBeCloseTo(
    yearly / months,
    0,
  );
}, 120_000);
