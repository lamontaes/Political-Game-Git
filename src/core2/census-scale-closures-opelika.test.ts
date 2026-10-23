/**
 * Pool item world-census-scale-closures-rise, pinned regression: Opelika,
 * Alabama opened at its Census size closed firms (a wholesaler and a retailer
 * short of cash on a payday while holding savings at the bank) that the same
 * town at the sample size kept open.
 */
import { expect, it } from "vitest";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { SAMPLE, compareClosures } from "./census-scale-closures-support";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { setJournalTrace } from "./journal-state";
import { coreAPI } from "./state";
import { BUSINESS_MODULE_ID } from "./modules/business";
import { countedHeadsOf } from "./residents-economy";

const OPELIKA = { key: "0157048", seed: "op1" };
// The wholesaler closed on 2025-07-02, short of cash on a payday with its
// savings in the bank. A year of this town at the sample size outgrows one
// test process's memory from August on, so the case plays to late August.
const DAYS = 220;

it("Opelika, Alabama at its Census size closes no more closure rows than at the sample size, through its wholesaler's July payday", () => {
  const reference = placeReferencePopulation(OPELIKA.key)?.value;
  expect(reference).toBeGreaterThan(SAMPLE);
  compareClosures(
    `Opelika, Alabama (${OPELIKA.key}), census ${reference}, seed ${OPELIKA.seed}`,
    OPELIKA.seed,
    OPELIKA.key,
    reference!,
    DAYS,
  );
  // Both worlds' 220 days took 548 seconds at one worker on a 4-core
  // container; about twice that.
}, 1_200_000);

// The merger's original 40-day case produced 26 book/journal mismatches at
// this fractional Census weight. Keep the actual payment as the independent
// expectation, including partial payments, rather than rounding the book.
it("Opelika op1 fractional counted-owner draws equal their actual journal payments", () => {
  const countScale = 3.5765;
  setBookkeeping(false);
  const { core } = buildBenchWorld(OPELIKA.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: OPELIKA.key,
    countScale,
  });
  const journal = new Map<string, { source: string; paidMinor: number }>();
  setJournalTrace((entry) => {
    if (
      entry.id.includes("owner-draw:") ||
      entry.sourceRef.id.includes("owner-draw:")
    )
      journal.set(entry.id, {
        source: entry.sourceRef.id,
        paidMinor: entry.postings.reduce(
          (sum, posting) => sum + Math.max(0, -posting.deltaMinor),
          0,
        ),
      });
  });
  try {
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
  } finally {
    setJournalTrace(null);
  }
  const draws = coreAPI(core)
    .moduleState(BUSINESS_MODULE_ID)
    .table("draws")
    .rows() as unknown as {
    id: string;
    organizationId: string;
    ownerId: string;
    date: string;
    drawnMinor: number;
  }[];
  const paid = draws.filter((row) => row.drawnMinor > 0);
  const fractionalOwners = paid.filter(
    (row) => !Number.isInteger(countedHeadsOf(core, row.ownerId)),
  );
  expect(
    fractionalOwners.length,
    "paid counted owners at fractional weight",
  ).toBeGreaterThan(0);
  for (const row of paid) {
    const key = `owner-draw:${row.organizationId}:${row.date}`;
    const postings = [...journal].filter(
      ([id, entry]) => id.includes(key) || entry.source.includes(key),
    );
    expect(
      postings.length,
      `${row.id}: actual payment journals`,
    ).toBeGreaterThan(0);
    const actual = postings.reduce(
      (sum, [, entry]) => sum + entry.paidMinor,
      0,
    );
    expect(
      row.drawnMinor,
      `${row.id}: ${postings.map(([id]) => id).join(", ")}`,
    ).toBe(actual);
  }
  process.stdout.write(
    `OWNER_DRAW_LEDGER ${JSON.stringify({
      seed: OPELIKA.seed,
      placeKey: OPELIKA.key,
      countScale,
      date: core.date,
      drawRows: draws.length,
      paidRows: paid.length,
      fractionalOwners: fractionalOwners.length,
      example: fractionalOwners[0],
    })}\n`,
  );
}, 300_000);
