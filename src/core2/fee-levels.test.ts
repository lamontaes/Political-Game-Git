/**
 * A bill sets a fee's level, and the people who use the service pay it (pool
 * item gov-fee-level-by-bill). A pinned place and seed: the same world twice,
 * one left alone and one where the government's own law raises the park fee
 * by half; the charge targets, the services' mix and what the town's
 * households paid for parks move with it, and a world with no fee law reads
 * the schedule its budget assumes.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import {
  serviceChargeShares,
  serviceChargesPaidBy,
} from "./budgets-service-charges";
import { billValueInForce } from "./laws-bill-values";
import { FEE_LEVEL_BASELINE } from "./fee-levels";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw } from "./modules/laws";
import { governments } from "./modules/budgets";
import { coreAPI } from "./state";

const SEED = "fee-level-by-bill-pinned-1";
const PARKS = "parks-and-recreation";
const SERIES = "fee-level:parks-and-recreation";

function world() {
  const draw = drawPlace(SEED, "fee-level");
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  return { core, api: coreAPI(core), draw };
}

it("a law raising the park fee raises what the park's users pay and the charges follow", () => {
  setBookkeeping(false);
  const control = world();
  const where = `${control.draw.key} [${control.draw.state}], seed ${control.draw.seed}`;
  const row = serviceChargeShares(control.api).find(
    (r) => r.share > 0 && r.services.some((s) => s.service === PARKS),
  );
  expect(row, `${where}: a government charging for parks`).toBeDefined();
  const gov = governments(control.api).find((g) => g.id === row!.governmentId)!;
  const target0 = row!.targetMonthlyMinor;
  const parks0 = row!.services.find((s) => s.service === PARKS)!.share;
  // With no bill the fee reads as the schedule the budget assumes.
  expect(
    billValueInForce(
      control.api,
      { kind: "law-amount", series: SERIES },
      gov.id,
    ).value,
    where,
  ).toBe(FEE_LEVEL_BASELINE);

  const raised = world();
  enactLaw(raised.api, {
    jurisdiction: gov.id,
    level: gov.level === "city" ? "city" : gov.level,
    series: SERIES,
    value: 150,
    effectiveDate: raised.core.date,
    measureId: "test:fee-level:parks",
    citation: "A fee bill in a pinned world.",
  });
  const days = addDays(makeIsoDate(raised.core.date), 75);
  advanceCore(raised.core, days);
  advanceCore(control.core, days);
  const after = serviceChargeShares(raised.api).find(
    (r) => r.governmentId === row!.governmentId,
  )!;
  const parks1 = after.services.find((s) => s.service === PARKS)!.share;
  expect(parks1, `${where}: parks share of the charges`).toBeGreaterThan(
    parks0,
  );
  expect(
    after.targetMonthlyMinor,
    `${where}: the charges asked`,
  ).toBeGreaterThan(target0 * 0.99);
  const paid = (w: ReturnType<typeof world>) =>
    serviceChargesPaidBy(w.api, row!.governmentId).reduce(
      (n, m) => n + (m.byService[PARKS] ?? 0),
      0,
    );
  expect(paid(raised), `${where}: park charges paid`).toBeGreaterThan(
    paid(control),
  );
}, 120_000);
