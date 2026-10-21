import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { settleEstate } from "./estates";
import { gameStartDate } from "./game-start";
import type { HomeSale } from "./housing-sale";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI, registerModule } from "./state";
import type { CoreEventInput, CoreState } from "./types";

// A home whose owners have all died is sold when probate closes
// (world-estate-sells-the-home).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** The heir payments an `estate.settled` record names: the transfer id `estate:<decedent>:<heir>` and the amount. */
function heirPayments(
  event: CoreEventInput,
): { id: string; toId: string; amountMinor: number }[] {
  const decedentId = String(event.facts?.decedentId);
  return String(event.facts?.heirs ?? "")
    .split(" ")
    .filter(Boolean)
    .map((pair) => {
      const cut = pair.lastIndexOf("=");
      const toId = pair.slice(0, cut);
      return {
        id: `estate:${decedentId}:${toId}`,
        toId,
        amountMinor: Number(pair.slice(cut + 1)),
      };
    });
}

/** The heirs were paid: at least one payment, each positive, together no more than the estate held. */
function expectHeirsPaid(settled: CoreEventInput, where: string): string[] {
  const payments = heirPayments(settled);
  expect(payments.length, `${where}: heirs were paid`).toBeGreaterThan(0);
  for (const payment of payments)
    expect(payment.amountMinor, `${where}: ${payment.id}`).toBeGreaterThan(0);
  const total = payments.reduce((sum, row) => sum + row.amountMinor, 0);
  expect(
    total,
    `${where}: heirs' payments within the estate`,
  ).toBeLessThanOrEqual(Number(settled.facts?.estateMinor));
  return payments.map((row) => row.id);
}

it(`the last owner's death sells the home when probate closes, the lender first and the surplus to the heirs, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(seed, `estate-home:${attempt}`);
    const where = `${place.name} [${place.key}], seed ${seed}`;
    tried.push(where);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // The housing engine writes the dwellings on its first days.
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const state = core as CoreState;
    const api = coreAPI(core);
    const housing = api.moduleState("housing");
    const dwellings = housing.table("dwellings");
    // A full household that owns its home (one with a mortgage first).
    const mortgages = housing.table("mortgages").rows() as unknown as {
      householdId: string;
      balanceMinor: number;
    }[];
    const owners = [...state.households.values()].filter((home) => {
      const dwelling = dwellings.get(`dwelling:${home.id}`) as unknown as
        { tenure?: string; valueMinor?: number } | undefined;
      return (
        dwelling?.tenure === "own" &&
        (dwelling.valueMinor ?? 0) > 0 &&
        home.memberIds.some((id) => state.people.get(id)?.alive)
      );
    });
    const owner =
      owners.find((home) =>
        mortgages.some((m) => m.householdId === home.id && m.balanceMinor > 0),
      ) ?? owners[0];
    if (!owner) continue;
    const mortgaged = mortgages.some(
      (m) => m.householdId === owner.id && m.balanceMinor > 0,
    );
    const dying = owner.memberIds.filter((id) => state.people.get(id)?.alive);
    const heard: CoreEventInput[] = [];
    registerModule(core, {
      id: "test:estate-reader",
      eventKinds: ["estate.settled"],
      onEvent: (_api, event) => {
        heard.push(event);
      },
    });
    // Its members die one after another; the last one's estate holds the sale.
    for (const id of dying) {
      api.updatePerson(id, { alive: false });
      settleEstate(api, id, `event:test-death:${id}`);
    }
    // The home stays on the books until probate closes.
    expect(
      (dwellings.get(`dwelling:${owner.id}`) as unknown as { tenure: string })
        .tenure,
      `${where}: ${owner.id} owned before probate closes`,
    ).toBe("own");
    advanceCore(core, addDays(makeIsoDate(core.date), 280));
    const sale = (housing.table("sales").rows() as unknown as HomeSale[]).find(
      (row) => row.householdId === owner.id,
    );
    expect(sale, `${where}: a sale for ${owner.id}`).toBeDefined();
    expect(sale!.id).toBe(`home-sale:${owner.id}:${sale!.date}`);
    expect(sale!.reasonKey).toBe("estate.probate-closes");
    if (mortgaged)
      expect(
        sale!.toLenderMinor,
        `${where}: the lender was paid first`,
      ).toBeGreaterThan(0);
    // All its owners died the same day: the first of their estates to close
    // sells the home, and the sale names that estate.
    expect(dying, `${where}: names an owner's estate`).toContain(
      sale!.decedentId,
    );
    expect(
      (dwellings.get(`dwelling:${owner.id}`) as unknown as { tenure: string })
        .tenure,
    ).toBe("sold");
    expect(
      (
        housing.table("mortgages").rows() as unknown as {
          householdId: string;
          balanceMinor: number;
        }[]
      ).filter((m) => m.householdId === owner.id && m.balanceMinor > 0),
      `${where}: the mortgage ended`,
    ).toEqual([]);
    // The surplus went through the estate: the court's record counts it for the heirs.
    const settled = heard.find((e) => e.facts?.decedentId === sale!.decedentId);
    expect(settled, `${where}: probate settled the estate`).toBeDefined();
    expect(
      Number(settled!.facts?.estateMinor),
      `${where}: the estate held the surplus ${sale!.surplusMinor}`,
    ).toBeGreaterThanOrEqual(sale!.surplusMinor);
    const paidIds = expectHeirsPaid(settled!, where);
    expect(paidIds.length, where).toBeGreaterThan(0);
    // The sale row names probate's record and the heirs it paid.
    const named = (housing
      .table("sales")
      .get(sale!.id) as unknown as HomeSale)!;
    expect(named.settledEventId, `${where}: ${sale!.id} names probate`).toBe(
      settled!.id,
    );
    for (const heir of heirPayments(settled!))
      expect(
        named.paid?.find((row) => row.toId === heir.toId)?.amountMinor,
        `${where}: ${sale!.id} names ${heir.id}`,
      ).toBe(heir.amountMinor);
    expect(sale!.surplusMinor + sale!.toLenderMinor, where).toBeLessThanOrEqual(
      sale!.priceMinor,
    );
    expect(state.cashJournal.totals.grossDebitMinor).toBe(
      state.cashJournal.totals.grossCreditMinor,
    );
    process.stdout.write(
      `estate home sale: ${where}; ${sale!.id} for ${sale!.decedentId}, price ${sale!.priceMinor}, lender ${sale!.toLenderMinor}, surplus ${sale!.surplusMinor}; ${named.settledEventId}; paid ${JSON.stringify(named.paid)}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a household that owns its home (${tried.join("; ")})`,
  );
}, 1_800_000);
