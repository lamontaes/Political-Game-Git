/**
 * The town's corporations and the federal corporate-tax line
 * (gov-town-payers-corporate-vehicle-tax, the no-double-tax part): what a
 * corporation's location pays the federal treasury on its profit comes off the
 * installment the outside corporations pay on the same line, so the line's
 * total is the budget's. Played world, a place and seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { BUDGETS_MODULE_ID, taxPaymentsOf } from "./modules/budgets";
import { profitTaxesOf } from "./modules/employer-taxes";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "town-payers-corporate-tax");
const LINE = "corporateIncomeTax";
const FEDERAL = "US";

it(`corporate profit tax paid in town comes off the outside installment in ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 730));
  const installments = taxPaymentsOf(api, "US").filter((p) => p.line === LINE);
  expect(installments.length, where).toBeGreaterThan(0);
  for (const p of installments) {
    // The outside group pays what the town's own payers did not.
    expect(p.amountMinor + (p.townPaidMinor ?? 0), `${where}: ${p.id}`).toBe(
      p.installmentMinor,
    );
  }
  // The line is the federal one: a profit tax also paid to the state's
  // treasury (the posting `:in:<government>` of each record) is not on it.
  const federalPosting = new RegExp(`:in:${FEDERAL}(:|$)`);
  const paidByTown = profitTaxesOf(api).reduce(
    (s, r) =>
      s +
      r.postings
        .filter((p) => federalPosting.test(p.id))
        .reduce((n, p) => n + p.deltaMinor, 0),
    0,
  );
  const creditedOnLine = installments.reduce(
    (s, p) => s + (p.townPaidMinor ?? 0),
    0,
  );
  const carried =
    (
      api
        .moduleState(BUDGETS_MODULE_ID)
        .table("townRevenue")
        .get(`US:${LINE}`) as { minor: number } | undefined
    )?.minor ?? 0;
  // Every dollar the town's corporations paid is credited on the line or waits
  // for the next installment; none is lost or taxed twice.
  expect(creditedOnLine + carried, where).toBe(paidByTown);
  if (process.env.TAX_PROOF)
    writeFileSync(
      process.env.TAX_PROOF,
      JSON.stringify({
        where,
        profits: profitTaxesOf(api)
          .filter((r) => r.paidMinor > 0)
          .map((r) => [r.id, r.businessId, r.profitMinor, r.paidMinor]),
        installments: installments.map((p) => [
          p.id,
          p.dueOn,
          p.installmentMinor,
          p.townPaidMinor,
          p.amountMinor,
        ]),
        carried,
      }),
    );
  // A territory's own corporate tax stands in for the federal one and is paid
  // to its own treasury (Susupe, Northern Mariana Islands, seed tp2), so only a
  // record with a posting to the federal treasury has a dollar on this line.
  const named = profitTaxesOf(api).find((r) =>
    r.postings.some((p) => federalPosting.test(p.id) && p.deltaMinor > 0),
  );
  if (named) {
    expect(creditedOnLine + carried, `${where}: ${named.id}`).toBeGreaterThan(
      0,
    );
  }
}, 1_800_000);
