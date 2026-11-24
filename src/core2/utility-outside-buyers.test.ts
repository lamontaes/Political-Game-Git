/**
 * A utility sells to buyers outside its town's households, as every other
 * kind of business that sells beyond its town does (pool item
 * industry-0-a-utility-sells-beyond-its-town). Pinned to Center, North Dakota
 * (place 3813180, world seed "ilt-3813180"), whose county's electric
 * utility opens with 119 staff.
 *
 * Old premise (outside-market.json, the Oct 12 research row set, a builder's
 * line, no ruling): the utility kind had no outside share, so its only buyers
 * were the town's household bills, about $286,000 a year against books of
 * about $185 million, and it laid off 119 to 89 by July 15. Account lead,
 * Nov 15: an establishment's sales come from the buyers its industry really
 * has, through the same trade area as every other kind.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";

const PLACE = "3813180";
const SEED = "ilt-3813180";

it("keeps Center, North Dakota's utility selling to its books and its staff through month six", () => {
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const town = core.people.get(core.playerId)!.placeId;
  const where = `Center ND (${PLACE}), world ${core.seed}, opened ${core.date}`;
  const rt = residentsRuntime(core)!;
  const [utilityId, book] = [...core.finance.businesses].find(
    ([id, row]) =>
      row.kindId === "utility" && core.organizations.get(id)?.placeId === town,
  )!;
  expect(utilityId, where).toBeDefined();
  const staffOf = () =>
    [...core.jobs.values()].filter(
      (job) => !job.endsAt && job.organizationId === utilityId,
    ).length +
    [...rt.jobs.values()].filter(
      (job) =>
        job.organizationId === utilityId && !core.people.has(job.personId),
    ).length;
  const opening = staffOf();
  expect(opening, where).toBeGreaterThan(100);
  // Its buyers a year: the town's bills and its outside buyers, together its books.
  let bills = 0;
  let outside = 0;
  for (const flow of rt.flows.values()) {
    if (flow.payeeId !== utilityId || !flow.salesReceipt) continue;
    const perYear =
      flow.cadence.kind === "days"
        ? (flow.amountMinor * 365) / flow.cadence.every
        : (flow.amountMinor * 12) / flow.cadence.every;
    if (flow.kind === "outside-sales") outside += perYear;
    else bills += perYear;
  }
  const books = book.annualDemandMinor;
  expect(outside, where).toBeGreaterThan(0);
  expect(bills + outside, where).toBeGreaterThanOrEqual(books * 0.999);
  advanceCore(core, "2025-07-20");
  // Six months on it still employs at least what it opened with.
  const july = staffOf();
  expect(july, where).toBeGreaterThanOrEqual(opening);
  process.stdout.write(
    `utility outside buyers: ${where}; ${core.organizations.get(utilityId)!.name}: books ${Math.round(books / 100)} a year, town bills ${Math.round(bills / 100)}, outside buyers ${Math.round(outside / 100)}; staff ${opening} at the opening, ${july} on ${core.date}\n`,
  );
}, 160_000);
