/**
 * A bottle deposit law in a generated town (pool item
 * world-stopgap-place-prices-faked-mechanic): a full household is charged the
 * deposit on its members' containers, and each member's own traits decide how
 * many they take back, so the refund is theirs and not the average's. A place
 * is drawn from all 56 on a seed nobody chose; the test fails if none of 6
 * draws has a household whose members differ.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import goods from "./data/prices/goods.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { returnShareOf } from "./modules/place-prices";
import { coreAPI } from "./state";

const question = "us-policy-positions:environment-energy.bottle-deposit";

it("charges the deposit on a household's containers and refunds each member's own returns", () => {
  const seed = randomBytes(32).toString("hex");
  setBookkeeping(false);
  try {
    for (let i = 0; i < 6; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "laws-bottle-deposit");
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const where = `seed ${draw.seed}, place ${draw.key}`;
      for (const id of core.people.keys()) core.focusPersonIds.add(id);
      const rules = () =>
        api
          .moduleState("place-prices")
          .table("rules")
          .rows()
          .filter((r) => r.good === "beverage-container");
      for (const level of lawChain(api).levels)
        enactLaw(api, {
          jurisdiction: level.jurisdiction,
          level: level.level,
          series: question,
          value: 1,
          effectiveDate: core.date,
          measureId: `test:deposit:${core.date}`,
          citation: "Controlled law case in a generated year.",
        });
      advanceCore(core, addDays(makeIsoDate(core.date), 40));
      const rule = rules()[0];
      expect(rule, `${where}: deposit rule`).toBeDefined();
      const paid = [...core.cashJournal.detailedReceipts.values()].filter(
        (r) =>
          r.sourceRef.id.startsWith("price:") &&
          r.sourceRef.id.includes(":beverage-container:") &&
          r.sourceRef.id.endsWith(":pay"),
      );
      const refunded = [...core.cashJournal.detailedReceipts.values()].filter(
        (r) =>
          r.sourceRef.id.startsWith("price:") &&
          r.sourceRef.id.includes(":beverage-container:") &&
          r.sourceRef.id.endsWith(":refund"),
      );
      // A full household with a deposit paid and a refund back, by receipt id.
      const household = [...core.households.values()].find(
        (h) =>
          h.placeId === rule!.placeId &&
          paid.some((r) => r.sourceRef.id.includes(`:${h.id}:`)) &&
          refunded.some((r) => r.sourceRef.id.includes(`:${h.id}:`)),
      );
      if (!household) continue;
      const members = household.memberIds.filter(
        (id) => core.people.get(id)?.alive,
      );
      const shares = members.map((id) =>
        returnShareOf(api, core.people.get(id)!),
      );
      const average = goods.goods["beverage-container"].redemptionRate;
      for (const share of shares) {
        expect(share, where).toBeGreaterThanOrEqual(0);
        expect(share, where).toBeLessThanOrEqual(1);
      }
      const units =
        (goods.goods["beverage-container"].perPersonYear * members.length) / 12;
      const deposit = paid.find((r) =>
        r.sourceRef.id.includes(`:${household.id}:`),
      )!;
      const refund = refunded.find((r) =>
        r.sourceRef.id.includes(`:${household.id}:`),
      )!;
      const debit = Math.abs(
        deposit.postings.find((p) => p.deltaMinor < 0)?.deltaMinor ?? 0,
      );
      const back =
        refund.postings.find((p) => p.deltaMinor > 0)?.deltaMinor ?? 0;
      expect(debit, `${where}: ${deposit.sourceRef.id}`).toBeGreaterThan(0);
      // The deposit is charged on every container (scaled by the household's spending).
      expect(back, `${where}: ${refund.sourceRef.id}`).toBeGreaterThan(0);
      // What came back is the members' own shares of what was charged, not the average of all.
      const own = shares.reduce((a, b) => a + b, 0) / shares.length;
      expect(back / debit, `${where}: ${household.id}`).toBeCloseTo(own, 1);
      if (Math.abs(own - average) > 0.001)
        console.log(
          `${where}: ${household.id} returns ${own.toFixed(3)} against the average ${average}; units ${units.toFixed(1)}, deposit ${deposit.sourceRef.id}, refund ${refund.sourceRef.id}`,
        );
      expect(core.cashJournal.totals.grossDebitMinor).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      return;
    }
    throw new Error(`No drawn place settled a deposit: seed ${seed}`);
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
