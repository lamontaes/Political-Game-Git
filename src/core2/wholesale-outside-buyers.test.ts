/**
 * A wholesaler sells to buyers beyond its town when the town's own firms do
 * not buy what its books say it sells, through the same trade area as every
 * other kind (pool item industry-1-wholesale-sells-beyond-its-town). Pinned to
 * Thief River Falls, Minnesota (place 2764570, world seed "ind-2764570"),
 * whose county's wholesaler is most of the town's private jobs.
 *
 * Old premise (outside-market.json, the Oct 12 research row set, a builder's
 * line, no ruling): "Wholesale is omitted: its sales to local firms are
 * already recorded routes." Where the town's firms buy less than its books,
 * nothing else bought, and at Thief River Falls the wholesaler (1,848 workers)
 * closed on Jun 1, 2025 with no law passed (industry-law trace, Nov 15).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";

const PLACE = "2764570";
const SEED = "ind-2764570";

it("keeps Thief River Falls' wholesaler selling to its books and open with its staff through month six", () => {
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const town = core.people.get(core.playerId)!.placeId;
  const where = `Thief River Falls MN (${PLACE}), world ${core.seed}, opened ${core.date}`;
  const rt = residentsRuntime(core)!;
  const [wholesalerId, book] = [...core.finance.businesses]
    .filter(
      ([id, row]) =>
        row.kindId === "wholesale" &&
        core.organizations.get(id)?.placeId === town,
    )
    .sort(([, a], [, b]) => b.annualDemandMinor - a.annualDemandMinor)[0]!;
  const staffOf = () =>
    [...core.jobs.values()].filter(
      (job) => !job.endsAt && job.organizationId === wholesalerId,
    ).length +
    [...rt.jobs.values()].filter(
      (job) =>
        job.organizationId === wholesalerId && !core.people.has(job.personId),
    ).length;
  const opening = staffOf();
  expect(opening, where).toBeGreaterThan(500);
  // Its buyers a year: the town's firms and households, and its outside buyers.
  let town$ = 0;
  let outside = 0;
  for (const flow of rt.flows.values()) {
    if (flow.payeeId !== wholesalerId || !flow.salesReceipt) continue;
    const perYear =
      flow.cadence.kind === "days"
        ? (flow.amountMinor * 365) / flow.cadence.every
        : (flow.amountMinor * 12) / flow.cadence.every;
    if (flow.kind === "outside-sales") outside += perYear;
    else town$ += perYear;
  }
  for (const contract of core.finance.contracts.values())
    if (contract.payeeId === wholesalerId && contract.salesReceipt)
      town$ += (contract.amountMinor * 12) / contract.periodMonths;
  const books = book.annualDemandMinor;
  process.stdout.write(
    `wholesale outside buyers: ${where}; ${core.organizations.get(wholesalerId)!.name}: books ${Math.round(books / 100)} a year, town buyers ${Math.round(town$ / 100)}, outside buyers ${Math.round(outside / 100)}; staff ${opening} at the opening\n`,
  );
  expect(outside, where).toBeGreaterThan(0);
  expect(town$ + outside, where).toBeGreaterThanOrEqual(books * 0.999);
  advanceCore(core, "2025-07-20");
  const july = staffOf();
  process.stdout.write(
    `wholesale outside buyers: staff ${july} on ${core.date}, closed ${core.finance.businesses.get(wholesalerId)!.closedAt ?? "no"}\n`,
  );
  expect(
    core.finance.businesses.get(wholesalerId)!.closedAt,
    where,
  ).toBeUndefined();
  expect(july, where).toBeGreaterThanOrEqual(opening * 0.9);
}, 600_000);
