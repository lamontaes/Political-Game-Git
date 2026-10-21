/** Legal cannabis sales move residents' spending to the town's retailers, in a generated town. */
import { usesCannabis } from "./modules/place-prices";
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
import { purchaseTaxes } from "./modules/purchase-tax";

const question =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";

/** One drawn place; false when it has no sales tax in force (nothing for the tax to collect on). */
function attempt(draw: ReturnType<typeof drawPlace>): boolean {
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
          r.sourceRef.id.includes(":pay:") &&
          !r.sourceRef.id.startsWith("sales-tax:"),
      );
    // What the sales tax in force collected on those sales, read from the
    // journal entries as they post (the sellers are businesses, whose own
    // receipts are not kept in detail).
    const taxed: {
      id: string;
      postings: readonly { accountId: string; deltaMinor: number }[];
    }[] = [];
    const post = api.postJournal.bind(api);
    api.postJournal = (entry) => {
      if (
        entry.sourceRef.id.startsWith("sales-tax:") &&
        entry.sourceRef.id.includes(":cannabis:sale:")
      )
        taxed.push({ id: entry.sourceRef.id, postings: entry.postings });
      return post(entry);
    };
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
    // The sales tax in force collects on them through the same receipt every
    // other retail sale uses, for the treasury it names (a place with no sales
    // tax has none to collect).
    const inForce = [...purchaseTaxes(core).values()].filter(
      (tax) => tax.placeId === rule!.placeId && tax.ratePercent > 0,
    );
    const collected = taxed;
    if (inForce.length) {
      expect(collected.length, `${where}: no tax receipts`).toBeGreaterThan(0);
      for (const receipt of collected) {
        const tax = inForce.find((t) => receipt.id.startsWith(`${t.id}:`));
        expect(
          tax,
          `${where}: ${receipt.id} names a tax in force`,
        ).toBeDefined();
        expect(
          receipt.postings.some(
            (p) => p.accountId === tax!.payeeAccountId && p.deltaMinor > 0,
          ),
          `${where}: ${receipt.id} reaches the treasury`,
        ).toBe(true);
      }
    } else return false;
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
    return true;
  } finally {
    setBookkeeping(true);
  }
}

it("pays the town's retailers from named buyers while the sales law is in force, taxes the sales, and stops on repeal", () => {
  const seed = randomBytes(32).toString("hex");
  // Five states levy no sales tax; the next draw takes a place that does.
  for (let i = 0; i < 8; i += 1)
    if (attempt(drawPlace(`${seed}:${i}`, "laws-cannabis"))) return;
  throw new Error(`No drawn place had a sales tax in force: seed ${seed}`);
}, 900_000);

it("reads a named adult's use from their own seeded record, at the sourced prevalence", () => {
  const prevalence = 0.22;
  const people = Array.from({ length: 4000 }, (_, i) => `person_${i}`);
  const users = people.filter((id) => usesCannabis(id, prevalence));
  // The same person is the same answer every call.
  for (const id of people.slice(0, 50))
    expect(usesCannabis(id, prevalence)).toBe(usesCannabis(id, prevalence));
  // Seeded generation of who uses it lands on the sourced share.
  expect(users.length / people.length).toBeGreaterThan(0.19);
  expect(users.length / people.length).toBeLessThan(0.25);
  expect(usesCannabis("person_1", 0)).toBe(false);
});
