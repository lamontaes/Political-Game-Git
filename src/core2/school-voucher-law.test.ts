/** Public funds for private schooling pay the families who pay private tuition, from the state treasury. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildDrawnTown } from "./tooling/drawn-town";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";
import { REACH_B_MODULE_ID } from "./law-reach/group-b-store";
import { parameter } from "./parameters";
import { residentsRuntime } from "./modules/residents";
import { reachParameter } from "./law-reach/group-b-people";

const question =
  "us-policy-positions:education.public-funds-for-private-schooling";
const TUITION = "household.customer.private-school";

it("pays tuition-paying families a voucher from the state treasury and ends it on repeal", () => {
  const seed = randomBytes(32).toString("hex");
  setBookkeeping(false);
  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { draw, core } = buildDrawnTown(seed, `voucher:${attempt}`);
      const api = coreAPI(core);
      const town = lawChain(api).townPlaceId;
      const rt = residentsRuntime(core);
      const residentsOrg = rt?.input.accounts.find(
        (row) => row.placeId === town,
      )?.accountId;
      const flows = [...(rt?.flows.values() ?? [])].filter(
        (f) =>
          f.kind === "purchase" &&
          f.financeKind === TUITION &&
          !f.endedAt &&
          f.placeId === town,
      );
      if (!flows.length || !residentsOrg) continue;
      const where = `seed ${draw.seed}, place ${draw.key}`;
      const state = lawChain(api).levels.find((l) => l.level === "state")!;
      const set = (value: number) => {
        enactLaw(api, {
          jurisdiction: state.jurisdiction,
          level: "state",
          series: question,
          value,
          effectiveDate: core.date,
          measureId: `test:voucher:${value}:${core.date}`,
          citation: "Controlled law case in a generated town.",
        });
        advanceCore(core, addDays(makeIsoDate(core.date), 40));
      };
      const vouchers = () =>
        (
          api
            .moduleState(REACH_B_MODULE_ID)
            .table("taken")
            .rows() as unknown as {
            key: string;
            recipientId: string;
            obligationId: string;
            amountMinor: number;
          }[]
        ).filter((r) => r.key === `voucher|${question}`);
      const live = () =>
        vouchers().filter(
          (r) => !api.accounts().obligation(r.obligationId)?.endedAt,
        );
      set(0);
      expect(live(), `${where}: no voucher law`).toHaveLength(0);
      set(1);
      const covered = Math.min(
        1,
        (reachParameter("voucherAmountDollars") * parameter("minorPerDollar")) /
          (parameter("openingPrivateTuitionAnnualUsd") *
            parameter("minorPerDollar")),
      );
      const paid = live();
      expect(paid.length, `${where}: nobody paid`).toBeGreaterThan(0);
      // The town's counted families pay together, and are paid together.
      const tuition = flows.reduce((n, f) => n + f.amountMinor, 0);
      const row = paid.find((r) => r.recipientId === residentsOrg);
      expect(row, `${where}: counted families get no voucher`).toBeDefined();
      // The review sets it from the month's tuition; the flow drifts a little after.
      expect(
        Math.abs(row!.amountMinor - tuition * covered) / (tuition * covered),
        where,
      ).toBeLessThan(0.02);
      const o = api.accounts().obligation(row!.obligationId)!;
      expect(o.lastReceipt, `${where}: ${row!.obligationId}`).toBeDefined();
      // The voucher is part of what the state's schools line spent in town.
      expect(row!.amountMinor).toBeLessThanOrEqual(tuition);
      expect(core.cashJournal.totals.grossDebitMinor).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      set(0);
      expect(live(), `${where}: repealed`).toHaveLength(0);
      return;
    }
    throw new Error(`no town with private tuition in 10 draws (seed ${seed})`);
  } finally {
    setBookkeeping(true);
  }
}, 1_500_000);
