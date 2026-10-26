/** A consumer data privacy law reaches the town's employing businesses through the business engine's monthly cost review. */
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
  "us-policy-positions:technology-privacy.consumer-data-privacy-law";
const cause = `law:${question}`;

it("charges employing businesses a share of their costs while the privacy law is in force, and ends it on repeal", () => {
  const draw = drawPlace(randomBytes(32).toString("hex"), "laws-data-privacy");
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const where = `seed ${draw.seed}, place ${draw.key}`;
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
}, 600_000);
