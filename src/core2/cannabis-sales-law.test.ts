/** Legal cannabis sales move residents' spending to the town's retailers, in a generated town. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";

const question =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";

it("pays the town's retailers from named buyers while the sales law is in force, and stops on repeal", () => {
  const draw = drawPlace(randomBytes(32).toString("hex"), "laws-cannabis");
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const where = `seed ${draw.seed}, place ${draw.key}`;
    for (const id of core.people.keys()) core.focusPersonIds.add(id);
    const sales = () =>
      [...core.cashJournal.detailedReceipts.values()].filter(
        (r) =>
          r.sourceRef.id.includes(":cannabis:sale:") &&
          r.sourceRef.id.includes(":pay:"),
      );
    const set = (value: number) => {
      for (const level of lawChain(api).levels)
        enactLaw(api, {
          jurisdiction: level.jurisdiction,
          level: level.level,
          series: question,
          value,
          effectiveDate: core.date,
          measureId: `test:cannabis:${value}:${core.date}`,
          citation: "Controlled law case in a generated year.",
        });
      advanceCore(core, addDays(makeIsoDate(core.date), 40));
    };
    set(0);
    expect(sales(), `${where}: no sales law`).toHaveLength(0);
    set(1);
    const rule = api
      .moduleState("place-prices")
      .table("rules")
      .rows()
      .find((r) => r.good === "cannabis");
    expect(rule, `${where}: sale rule`).toBeDefined();
    const paid = sales();
    expect(paid.length, `${where}: no sale receipts`).toBeGreaterThan(0);
    for (const receipt of paid) {
      const sellerId = receipt.sourceRef.id.split(":pay:")[1]!;
      const seller = core.organizations.get(sellerId);
      const book = core.finance.businesses.get(sellerId);
      expect(seller?.placeId, `${where}: ${receipt.id}`).toBe(rule!.placeId);
      expect(book, `${where}: ${receipt.id} is a business`).toBeDefined();
      expect(
        receipt.postings.some((p) => p.deltaMinor > 0),
        `${where}: ${receipt.id}`,
      ).toBe(true);
    }
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    const before = sales().length;
    set(0);
    expect(
      api
        .moduleState("place-prices")
        .table("rules")
        .rows()
        .find((r) => r.good === "cannabis"),
      `${where}: repealed`,
    ).toBeUndefined();
    expect(sales().length, where).toBe(before);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
