/**
 * Pool item gov-outside-revenue-fees. A government's charges and fees are paid
 * by named payers: the town's households out of the living cost they pay on
 * the 1st (budgets-service-charges.ts), and the people elsewhere who use the
 * government's services, who pay the rest of the line each month less what
 * the town's households paid. The outside lump carries none of it. Played for
 * a year in the bench world, in a place drawn from all 56; set
 * GOLDEN_PATH_SEED to reproduce the draw.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  serviceChargeShares,
  serviceChargesPaidBy,
} from "./budgets-service-charges";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { BUDGETS_MODULE_ID, budgetsOf, governments } from "./modules/budgets";
import { coreAPI } from "./state";
import type { CoreState, PersonId } from "./types";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const YEAR_DAYS = 365;

interface Payment {
  id: string;
  governmentId: string;
  line: string;
  payerId: string;
  date: string;
  amountMinor: number;
  installmentMinor: number;
  townPaidMinor: number;
}

it(`a government's charges are paid by the town's households and its other service users, by record (base ${base})`, () => {
  const tried: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const place = drawPlace(
      createHash("sha256").update(`${base}:${i}`).digest("hex"),
      "budgets-charges-payers",
    );
    const where = `${place.name} (${place.key}), seed ${place.seed}, base ${base}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const charged = serviceChargeShares(api).filter((row) => row.share > 0);
    // A place whose budgets carry no charges (a territory's) has none to pay.
    if (!charged.length) {
      tried.push(`${where}: no charges`);
      continue;
    }
    // A full household's own living-cost payment, kept in the journal's
    // detail so its line to the government can be read by record.
    const households = (core as CoreState).households;
    const payerOf = (id: string) =>
      households
        .get(id)
        ?.memberIds.find(
          (member) => (core.people.get(member)?.livingCostDailyMinor ?? 0) > 0,
        );
    const home = [...households.values()]
      .filter((row) => payerOf(row.id))
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!home) {
      tried.push(`${where}: no full household pays a living cost`);
      continue;
    }
    const payer = payerOf(home.id)! as PersonId;
    (core as CoreState).focusPersonIds.add(payer);
    advanceCore(core, addDays(makeIsoDate(core.date), YEAR_DAYS));

    const budgets = api.moduleState(BUDGETS_MODULE_ID);
    const payments = (
      budgets.table("taxPayments").rows() as unknown as Payment[]
    )
      .filter((row) => row.line === "chargesAndFees")
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    expect(
      payments.length,
      `${where}: charges from service users`,
    ).toBeGreaterThan(0);
    for (const row of payments) {
      // The charges line of the budget in force that day, a twelfth a month,
      // paid between the town's households and the government's other users.
      const inForce = budgetsOf(api, row.governmentId)
        .filter((b) => b.startsOn <= row.date)
        .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0]!;
      const twelfth = Math.round(
        (inForce.revenueMinor.chargesAndFees ?? 0) / 12,
      );
      expect(
        row.id.startsWith("treasury-charges:chargesAndFees:service-users:"),
        row.id,
      ).toBe(true);
      expect(row.installmentMinor, `${where}: ${row.id}`).toBe(twelfth);
      expect(row.amountMinor + row.townPaidMinor, `${where}: ${row.id}`).toBe(
        twelfth,
      );
    }
    // What the town's households paid each government over the year is what
    // came off its users' installments, up to what is still carried.
    for (const row of charged) {
      const paidInTown = serviceChargesPaidBy(api, row.governmentId).reduce(
        (n, month) => n + month.paidMinor,
        0,
      );
      const credited = payments
        .filter((p) => p.governmentId === row.governmentId)
        .reduce((n, p) => n + p.townPaidMinor, 0);
      const carried =
        (
          budgets
            .table("townRevenue")
            .get(`${row.governmentId}:chargesAndFees`) as
            { minor: number } | undefined
        )?.minor ?? 0;
      expect(
        paidInTown,
        `${where}: ${row.governmentId} paid in town`,
      ).toBeGreaterThan(0);
      expect(credited + carried, `${where}: ${row.governmentId}`).toBe(
        paidInTown,
      );
    }
    // The lump from outside carries no charges: none of its rows names them,
    // and every month's charges are accounted for above.
    const lumpIds = (
      budgets.table("outsideRevenue").rows() as unknown as { id: string }[]
    ).map((row) => row.id);
    expect(
      lumpIds.every((id) => id.startsWith("outside-revenue:")),
      where,
    ).toBe(true);
    // A named household's fee: its living-cost payment moves money from its
    // own cash to the government's account, on the journal.
    const govOrgs = new Set(
      governments(api).map((g) => g.organizationId as string),
    );
    const receipts = [
      ...((core as CoreState).cashJournal.detailedByOwner.get(payer) ?? []),
    ]
      .map((id) => (core as CoreState).cashJournal.detailedReceipts.get(id)!)
      .filter(
        (receipt) =>
          receipt &&
          receipt.sourceRef.id.includes(
            `residents:outside-living:${home.id}`,
          ) &&
          [...receipt.owners.values()].some(
            (owner) =>
              govOrgs.has(owner.ownerId) &&
              owner.afterMinor > owner.beforeMinor,
          ),
      );
    expect(
      receipts.length,
      `${where}: ${home.id}'s living cost paid a government's charges (payer ${payer}, place ${home.placeId}, kept receipts ${[
        ...((core as CoreState).cashJournal.detailedByOwner.get(payer) ?? []),
      ]
        .slice(0, 6)
        .map(
          (id) =>
            `${id} [${[...((core as CoreState).cashJournal.detailedReceipts.get(id)?.owners.keys() ?? [])].join(" ")}]`,
        )
        .join("; ")}; governments ${[...govOrgs].join(" ")})`,
    ).toBeGreaterThan(0);
    const receipt = receipts[0]!;
    const own = receipt.owners.get(payer)!;
    const to = [...receipt.owners.values()].find(
      (owner) =>
        govOrgs.has(owner.ownerId) && owner.afterMinor > owner.beforeMinor,
    )!;
    expect(own.afterMinor, receipt.id).toBeLessThan(own.beforeMinor);
    process.stdout.write(
      `CHARGES ${where}: ${payments.length} service-user installments (e.g. ${payments[0]!.id}: ${payments[0]!.amountMinor} plus ${payments[0]!.townPaidMinor} paid in town); ${home.id}'s ${payer} paid ${to.afterMinor - to.beforeMinor} to ${to.ownerId} in ${receipt.id} (${receipt.sourceRef.kind} ${receipt.sourceRef.id}; cash ${own.beforeMinor} to ${own.afterMinor})\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place had charges and a paying full household: ${tried.join("; ")}`,
  );
}, 1_800_000);
