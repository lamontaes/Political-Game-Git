/**
 * A builder's own house buys its materials outside the town, and a property
 * tax with no payee of its own goes to the outside: both pay the place's
 * outside market, never a public employer that also carries an outside flow
 * (a government's opening employer does, as its zero-stock paying authority).
 * Played in Marlborough, New Hampshire, where the first such organization in
 * the place is the state offices.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OUTSIDE_MARKET_KIND } from "./opening-outside-market";

const seed =
  process.env.GOLDEN_PATH_SEED ?? "109a7b3b1d5c1715d738e7b8ca9deec614910239";
const place = drawPlace(seed, "budgets-public-pay");
process.stdout.write(
  `housing-outside-market-payee: ${place.name} (${place.key}), seed ${seed}\n`,
);

it(`construction materials and outside property tax pay the outside market in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  // An organization's cash account names it: `cash:<organization id>:residual`.
  const ownerOf = (accountId: string) =>
    core.organizations.get(accountId.split(":").slice(1, -1).join(":"));
  const paid: { entry: string; to: string; kind?: string }[] = [];
  setJournalTrace((input) => {
    const id = input.sourceRef.id;
    if (!id.startsWith("construction:") && !id.startsWith("property-tax:"))
      return;
    for (const posting of input.postings) {
      if (posting.deltaMinor <= 0) continue;
      const org = ownerOf(posting.accountId);
      if (org?.outsideFlow !== undefined)
        paid.push({ entry: `${input.id} ${id}`, to: org.id, kind: org.kind });
    }
  });
  try {
    advanceCore(core, addDays(makeIsoDate(core.date), 45));
  } finally {
    setJournalTrace(null);
  }
  expect(
    paid.length,
    `${place.name}: no construction or property-tax payment to an outside account`,
  ).toBeGreaterThan(0);
  for (const row of paid)
    expect(
      row.kind,
      `${row.entry} paid ${row.to}, not the place's outside market`,
    ).toBe(OUTSIDE_MARKET_KIND);
  process.stdout.write(
    `housing-outside-market-payee: ${paid.length} payments to the outside market, first ${paid[0]!.entry}\n`,
  );
}, 900_000);
