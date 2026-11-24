/**
 * A consumer data privacy law reaches the town's employing businesses large
 * enough for the statute's size test through the business engine's monthly
 * cost review, and no business under it. Pinned to Pierre, South Dakota,
 * whose wholesaler and three stores sell over the test and whose other
 * businesses sell under it. Until Nov 16, 2026 it drew its place at run time
 * and expected some employer bound anywhere; the statute's size test binds
 * none in most small towns, so that premise no longer holds.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";

const question =
  "us-policy-positions:technology-privacy.consumer-data-privacy-law";
const cause = `law:${question}`;

const placeKey = "4649600";
const seed = "ilt-pierre";

it("charges employing businesses over the statute's size a share of their costs while the privacy law is in force, none under it, and ends it on repeal", () => {
  setBookkeeping(false);
  try {
    const { core, placeId } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey,
    });
    const api = coreAPI(core);
    const where = `Pierre, South Dakota (place ${placeKey}, seed ${seed})`;
    const rules = () =>
      api
        .moduleState("business")
        .table("operating")
        .rows()
        .filter((r) => String(r.cause).startsWith(cause));
    const change = (value: number) => {
      for (const level of lawChain(api).levels)
        enactLaw(api, {
          jurisdiction: level.jurisdiction,
          level: level.level,
          series: question,
          value,
          effectiveDate: core.date,
          measureId: `test:data-privacy:${value}`,
          citation: "Controlled law case in a generated year.",
        });
      advanceCore(core, addDays(makeIsoDate(core.date), 35));
    };
    change(0);
    expect(rules(), `${where}: repealed first`).toHaveLength(0);
    change(1);
    const bound = rules();
    expect(bound.length, `${where}: no business bound`).toBeGreaterThan(0);
    for (const row of bound)
      expect(Number(row.share)).toBe(
        api.parameter("businessDataPrivacyShareOfCosts"),
      );
    // The statute's size test: every employing business at or over it is bound, none under it.
    const floor = api.parameter("businessDataPrivacyMinSalesMinor");
    const boundIds = new Set(bound.map((row) => String(row.organizationId)));
    const town = [...core.finance.businesses.values()].filter(
      (book) =>
        core.organizations.get(book.organizationId)?.placeId === placeId &&
        !book.closedAt &&
        (core.finance.jobsByOrganization.get(book.organizationId)?.size ?? 0) >
          0 &&
        book.annualOtherCostsMinor > 0,
    );
    const over = town.filter((book) => book.annualDemandMinor >= floor);
    const under = town.filter((book) => book.annualDemandMinor < floor);
    expect(
      over.length,
      `${where}: businesses over the size test`,
    ).toBeGreaterThan(0);
    expect(
      under.length,
      `${where}: businesses under the size test`,
    ).toBeGreaterThan(0);
    expect(
      over
        .filter((book) => !boundIds.has(book.organizationId))
        .map((b) => b.organizationId),
      `${where}: over the test and not bound`,
    ).toEqual([]);
    expect(
      under
        .filter((book) => boundIds.has(book.organizationId))
        .map((b) => b.organizationId),
      `${where}: under the test and bound`,
    ).toEqual([]);
    // Another engine reads the cost: each bound business paid it on the journal.
    const payments = api
      .moduleState("business")
      .table("compliance")
      .rows()
      .filter((r) => String(r.cause).startsWith(cause));
    expect(payments.length, `${where}: nothing paid`).toBeGreaterThan(0);
    expect(payments.some((r) => Number(r.paidMinor) > 0)).toBe(true);
    for (const r of payments)
      expect(bound.some((b) => b.id === r.ruleId)).toBe(true);
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    change(0);
    expect(rules(), `${where}: repeal ends the cost`).toHaveLength(0);
  } finally {
    setBookkeeping(true);
  }
}, 220_000); // 107 to 110 s alone and beside the other privacy tests (Nov 16, 2026); about twice that.
