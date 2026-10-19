/**
 * A public-funds-for-private-schooling law is read where the state treasury
 * pays: its share of the tuition the town's households pay the private school
 * (law-reach group B, `payVouchers`). Played world, a place with a private
 * school and tuition payers; the place and seed are named in every failure
 * message. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { createHash, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { rowsOf } from "./law-reach/group-b-store";
import { voucherShare } from "./law-reach/group-b-money";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { realLocalities } from "./places";
import { coreAPI } from "./state";
import tuition from "./data/opening-private-tuition.json";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const question =
  "us-policy-positions:education.public-funds-for-private-schooling";

/** Every locality, in a seeded order. */
function drawn(): string[] {
  const rank = (key: string) =>
    createHash("sha256").update(`${seed}|voucher|${key}`).digest("hex");
  return [...realLocalities()]
    .sort((a, b) => rank(a.key).localeCompare(rank(b.key)))
    .map((place) => place.key);
}

it("pays the state's share of town private tuition while the law stands, and stops on repeal", () => {
  setBookkeeping(false);
  try {
    let tried = 0;
    for (const placeKey of drawn()) {
      if (tried++ >= 12) break;
      const { core } = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey,
      });
      const api = coreAPI(core);
      const where = `${core.placeMetadata.placeName} [${placeKey}], seed ${seed}`;
      const town = lawChain(api).townPlaceId;
      const monthlyTuition = () => {
        let total = 0;
        for (const contract of core.finance.contracts.values())
          if (
            contract.kind === tuition.contractKind &&
            !contract.endedAt &&
            core.people.get(contract.payerIds[0] ?? "")?.placeId === town
          )
            total += contract.amountMinor;
        for (const flow of residentsRuntime(core)?.flows.values() ?? [])
          if (
            flow.kind === "purchase" &&
            flow.financeKind === tuition.contractKind &&
            flow.placeId === town &&
            !flow.endedAt
          )
            total += flow.amountMinor;
        return total;
      };
      if (monthlyTuition() <= 0) continue;
      const setLaw = (value: number) => {
        for (const level of lawChain(api).levels)
          enactLaw(api, {
            jurisdiction: level.jurisdiction,
            level: level.level,
            series: question,
            value,
            effectiveDate: core.date,
            measureId: `fixture:voucher:${value}:${core.date}`,
            citation: "Controlled law case after the native generated start.",
          });
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      };
      const taken = () =>
        rowsOf<{
          key: string;
          governmentId: string;
          recipientId: string;
          obligationId: string;
          amountMinor: number;
          line?: string;
        }>(api, "taken").filter((row) => row.key === `voucher|${question}`);
      // Without the law, no voucher is owed.
      setLaw(0);
      expect(taken(), where).toEqual([]);
      const tuitionBefore = monthlyTuition();
      setLaw(1);
      // Tuition falls as counted children leave their school, and the vouchers
      // follow it at the law's monthly review, so a voucher may stand at the
      // tuition of up to a month ago: the bound is the highest tuition in the
      // review window, not the day's.
      const tuitionByDay: number[] = [];
      for (let day = 0; day < 45; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        tuitionByDay.push(monthlyTuition());
      }
      const opened = taken();
      expect(opened.length, where).toBeGreaterThan(0);
      // The state treasury pays its share of tuition, no more than the tuition.
      const state = opened[0]!.governmentId;
      const monthly = opened.reduce((n, row) => n + row.amountMinor, 0);
      expect(monthly, where).toBeGreaterThan(0);
      expect(monthly, where).toBeLessThanOrEqual(
        Math.floor(Math.max(...tuitionByDay.slice(-35)) * voucherShare(api)) +
          opened.length,
      );
      expect(monthly, where).toBeLessThanOrEqual(tuitionBefore * 2);
      let paid = 0;
      for (const row of opened) {
        expect(row.governmentId, where).toBe(state);
        expect(row.line, where).toBe("schools");
        const obligation = api.accounts().obligation(row.obligationId)!;
        expect(obligation.endedAt, where).toBeUndefined();
        expect(obligation.paidMinor, where).toBeGreaterThan(0);
        paid += obligation.paidMinor;
      }
      expect(paid, where).toBeGreaterThan(0);
      if (process.env.VOUCHER_PROOF)
        writeFileSync(
          process.env.VOUCHER_PROOF,
          JSON.stringify({
            where,
            tuitionMonthlyMinor: tuitionBefore,
            share: voucherShare(api),
            voucherMonthlyMinor: monthly,
            paidMinor: paid,
            payments: opened.map((row) => ({
              obligation: row.obligationId,
              to: row.recipientId,
              monthlyMinor: row.amountMinor,
              paidMinor: api.accounts().obligation(row.obligationId)!.paidMinor,
            })),
          }),
        );
      // Repeal ends it: every payment stops and none is paid after.
      setLaw(0);
      advanceCore(core, addDays(makeIsoDate(core.date), 35));
      const ended = new Map(
        opened.map((row) => [
          row.obligationId,
          api.accounts().obligation(row.obligationId)!,
        ]),
      );
      for (const [id, obligation] of ended)
        expect(obligation.endedAt, `${where} ${id}`).toBeDefined();
      advanceCore(core, addDays(makeIsoDate(core.date), 35));
      for (const [id, before] of ended)
        expect(api.accounts().obligation(id)!.paidMinor, `${where} ${id}`).toBe(
          before.paidMinor,
        );
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      return;
    }
    throw new Error(
      `no place with a private school and tuition payers in ${tried} draws (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
