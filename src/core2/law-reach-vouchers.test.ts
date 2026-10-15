/**
 * Public funds for private schooling, in the played world (every module
 * installed, a place drawn from all 56 by seed): while the law stands the
 * state treasury repays households a share of the private tuition they owe,
 * named households one by one and the counted tier as one pooled payment, and
 * a repeal ends it. No eligibility row stands beside the payment.
 */
import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./../bench/world";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";
import { governments } from "./modules/budgets";
import { residentsRuntime } from "./modules/residents";
import { REACH_B_MODULE_ID } from "./law-reach/group-b-store";
import { reachParameter } from "./law-reach/group-b-people";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "law-reach-vouchers");
const KEY = "us-policy-positions:education.public-funds-for-private-schooling";
const KIND = "household.customer.private-school";
let core: CoreState;
let api: CoreAPI;

const after = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
const table = <T>(name: string): T[] =>
  api.moduleState(REACH_B_MODULE_ID).table(name).rows() as unknown as T[];

beforeAll(() => {
  core = buildBenchWorld(place.seed, gameStartDate(), {
    placeKey: place.key,
    twoLevel: true,
  }).core;
  api = coreAPI(core);
}, 600_000);

function enact(value: number) {
  const level = lawChain(api).levels.find((l) => l.level === "state")!;
  enactLaw(api, {
    jurisdiction: level.jurisdiction,
    level: "state",
    series: KEY,
    value,
    effectiveDate: after(api.state.date, 1),
    measureId: `TEST-voucher-${value}-${api.state.date}`,
    citation: `Test act voucher ${value}`,
  });
  advanceCore(core, after(api.state.date, 2));
}

describe("public funds for private schooling", () => {
  it("repay households a share of the tuition they owe from the state treasury; a repeal ends it", () => {
    const where = `seed ${seed}, place ${place.key} (${place.name})`;
    const town = lawChain(api).townPlaceId;
    const accounts = api.accounts();
    const tuition = () => {
      let named = 0;
      for (const c of core.finance.contracts.values())
        if (
          c.kind === KIND &&
          !c.endedAt &&
          core.organizations.get(c.payeeId)?.placeId === town
        )
          named += c.amountMinor;
      let counted = 0;
      for (const f of residentsRuntime(core)?.flows.values() ?? [])
        if (f.financeKind === KIND && f.placeId === town && !f.endedAt)
          counted += f.amountMinor;
      return { named, counted };
    };
    const owed = tuition();
    if (owed.named + owed.counted <= 0) return; // a town with no private school owes no tuition
    const open = () =>
      table<{
        key: string;
        recipientId: string;
        obligationId: string;
        amountMinor: number;
        governmentId: string;
      }>("taken").filter(
        (r) =>
          r.key === `voucher|${KEY}` &&
          !accounts.obligation(r.obligationId)?.endedAt,
      );
    // A state whose law already funds private schooling pays from the first day: repeal it first.
    enact(0);
    expect(open(), where).toEqual([]);
    enact(1);
    // No eligibility row stands beside the payment.
    expect(
      table<{ key: string; endedOn: string | null }>("people").filter(
        (r) => r.key === KEY && r.endedOn === null,
      ),
      where,
    ).toEqual([]);
    const share = Math.min(
      1,
      reachParameter("voucherAmountDollars") /
        api.parameter("openingPrivateTuitionAnnualUsd"),
    );
    const now = tuition();
    const rows = open();
    const monthly = rows.reduce((n, r) => n + r.amountMinor, 0);
    expect(monthly, `${where} monthly vouchers`).toBeGreaterThan(0);
    // Each household's payment is its share of the tuition it owes; rounding down never overpays.
    expect(monthly, where).toBeLessThanOrEqual(
      Math.floor((now.named + now.counted) * share),
    );
    expect(monthly, where).toBeGreaterThan(
      Math.floor((now.named + now.counted) * share) - rows.length - 1,
    );
    const gov = governments(api).find((g) => g.id === rows[0]!.governmentId)!;
    expect(gov.level, where).toBe("state");
    // A treasury pays what it holds, and a payment it cannot make is short that month (accounts records it).
    advanceCore(core, after(api.state.date, 75));
    const everyRow = table<{
      key: string;
      obligationId: string;
      amountMinor: number;
    }>("taken").filter(
      (r) => r.key === `voucher|${KEY}` || r.key === `ended|${KEY}`,
    );
    for (const r of everyRow) {
      const o = accounts.obligation(r.obligationId)!;
      // Every payment that came due paid or was recorded short, never lost.
      if (o.lastReceipt)
        expect(
          o.lastReceipt.paidMinor + o.lastReceipt.shortMinor,
          `${where} ${r.obligationId}`,
        ).toBe(o.lastReceipt.requestedMinor);
    }
    // The households' recipients are in town, and the payments follow the tuition as it changes.
    expect(open().length, `${where} open vouchers`).toBeGreaterThan(0);
    enact(0);
    expect(open(), `${where} repeal`).toEqual([]);
    for (const r of everyRow)
      expect(accounts.obligation(r.obligationId)!.endedAt).toBeDefined();
  }, 600_000);
});
