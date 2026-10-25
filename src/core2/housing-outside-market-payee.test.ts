/**
 * A builder's own house buys its materials outside the town, and a property
 * tax with no payee of its own goes to the outside: both pay the town's own
 * outside market, never a public employer that also carries an outside flow
 * (a government's opening employer does, as its zero-stock paying authority).
 * Played in Marlborough, New Hampshire, where the first such organization in
 * the place is the state offices, and in a town drawn from all 56 places.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OUTSIDE_MARKET_KIND } from "./opening-outside-market";

interface Paid {
  readonly entry: string;
  readonly to: string;
  readonly kind?: string;
  readonly placeId?: string;
}

/** Every construction and property-tax payment to an account with an outside flow, over `days` of play. */
function outsidePayments(
  seed: string,
  purpose: string,
  days: number,
): { where: string; townId: string; paid: Paid[] } {
  const place = drawPlace(seed, purpose);
  const where = `${place.name} (${place.key}), seed ${seed}`;
  // Written straight to stdout, so a world that fails to build still names its place.
  process.stdout.write(`housing-outside-market-payee: ${where}\n`);
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  // An organization's cash account names it: `cash:<organization id>:residual`.
  const ownerOf = (accountId: string) =>
    core.organizations.get(accountId.split(":").slice(1, -1).join(":"));
  const paid: Paid[] = [];
  setJournalTrace((input) => {
    const id = input.sourceRef.id;
    if (!id.startsWith("construction:") && !id.startsWith("property-tax:"))
      return;
    for (const posting of input.postings) {
      if (posting.deltaMinor <= 0) continue;
      const org = ownerOf(posting.accountId);
      if (org?.outsideFlow !== undefined)
        paid.push({
          entry: `${input.id} ${id}`,
          to: org.id,
          kind: org.kind,
          placeId: org.placeId,
        });
    }
  });
  try {
    advanceCore(core, addDays(makeIsoDate(core.date), days));
  } finally {
    setJournalTrace(null);
  }
  return { where, townId: world.placeId, paid };
}

/** Each payment reached this town's own outside market. */
function expectTownOutsideMarket(run: ReturnType<typeof outsidePayments>) {
  for (const row of run.paid) {
    expect(
      row.kind,
      `${run.where}: ${row.entry} paid ${row.to}, not the town's outside market`,
    ).toBe(OUTSIDE_MARKET_KIND);
    expect(
      row.placeId,
      `${run.where}: ${row.entry} paid ${row.to}, another place's outside market`,
    ).toBe(run.townId);
  }
  process.stdout.write(
    `housing-outside-market-payee: ${run.where}: ${run.paid.length} payments to ${run.paid[0]!.to}, first ${run.paid[0]!.entry}\n`,
  );
}

it("construction materials pay the town's outside market in Marlborough, New Hampshire, seed 109a7b3b1d5c1715d738e7b8ca9deec614910239", () => {
  const run = outsidePayments(
    "109a7b3b1d5c1715d738e7b8ca9deec614910239",
    "budgets-public-pay",
    45,
  );
  expect(
    run.paid.length,
    `${run.where}: no construction or property-tax payment to an outside account`,
  ).toBeGreaterThan(0);
  expectTownOutsideMarket(run);
}, 900_000);

it("construction materials and outside property tax pay the town's outside market in a town drawn from all 56 places", () => {
  const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
  const tried: string[] = [];
  // Up to three towns, four months each, until one makes such a payment.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const run = outsidePayments(
      `${base}:${attempt}`,
      "housing-outside-market-payee",
      120,
    );
    tried.push(run.where);
    if (!run.paid.length) continue;
    expectTownOutsideMarket(run);
    return;
  }
  expect.fail(
    `no construction or property-tax payment to an outside account in ${tried.join("; ")}`,
  );
}, 2_700_000);
