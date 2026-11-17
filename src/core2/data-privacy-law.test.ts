/**
 * A consumer data privacy law reaches the town's employing businesses large
 * enough for the statute's size test through the business engine's monthly
 * cost review, and no business under it. The statute's size test binds no
 * business in most small towns, so each drawn place's opening books are read
 * first, and a place with no employing business over the test, or none under
 * it, is passed over and named before any day is played. Drawn (CTO, Nov 17:
 * tests draw their place; from Nov 16 it was pinned to Pierre, South Dakota).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import type { CoreState } from "./types";
import { enactLaw, lawChain } from "./modules/laws";

const question =
  "us-policy-positions:technology-privacy.consumer-data-privacy-law";
const cause = `law:${question}`;

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;

/** The town's open employing businesses with costs, over and under the statute's size test. */
function bySize(core: CoreState, placeId: string, floor: number) {
  const town = [...core.finance.businesses.values()].filter(
    (book) =>
      core.organizations.get(book.organizationId)?.placeId === placeId &&
      !book.closedAt &&
      (core.finance.jobsByOrganization.get(book.organizationId)?.size ?? 0) >
        0 &&
      book.annualOtherCostsMinor > 0,
  );
  return {
    over: town.filter((book) => book.annualDemandMinor >= floor),
    under: town.filter((book) => book.annualDemandMinor < floor),
  };
}

it(`charges employing businesses over the statute's size a share of their costs while the privacy law is in force, none under it, and ends it on repeal (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const passed: string[] = [];
    let found: { core: CoreState; placeId: string; where: string } | undefined;
    for (let i = 0; i < DRAWS && !found; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "data-privacy-law");
      const where = `${draw.name} (place ${draw.key}, seed ${draw.seed})`;
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const sizes = bySize(
        world.core,
        world.placeId,
        coreAPI(world.core).parameter("businessDataPrivacyMinSalesMinor"),
      );
      if (sizes.over.length && sizes.under.length)
        found = { core: world.core, placeId: world.placeId, where };
      else
        passed.push(
          `${where}: ${sizes.over.length} over the size test, ${sizes.under.length} under`,
        );
    }
    if (!found)
      throw new Error(
        `no drawn place has businesses on both sides of the size test; passed over: ${passed.join("; ")}`,
      );
    const { core, placeId, where } = found;
    const api = coreAPI(core);
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
    const { over, under } = bySize(core, placeId, floor);
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
    console.log(
      `data privacy: ${where}: ${bound.length} bound; passed over: ${passed.join("; ") || "none"}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 900_000); // 107 to 110 s for the place played (Nov 16, 2026), plus the opening of each place passed over.
