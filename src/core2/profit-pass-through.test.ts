import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { BUDGETS_MODULE_ID } from "./modules/budgets";
import { EMPLOYER_TAXES_MODULE_ID } from "./modules/employer-taxes";
import { coreAPI } from "./state";

// An owner-run business's profit is its owner's income (pool:
// gov-town-payers-vehicle-and-owner-tax): at each quarter's end the owner pays
// the income tax law in force on the quarter's profit, from their own cash to
// the governments the law names, never more than they hold. Places are drawn
// in turn until a business a full person owns has a profit to tax.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a business a person owns passes its profit to the owner's income tax (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let life = 0; life < 6; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "profit-pass-through");
    setBookkeeping(true);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // Past two quarter ends: the first only measures, the next taxes.
    advanceCore(core, addDays(makeIsoDate(core.date), 300));
    const rows = api
      .moduleState(EMPLOYER_TAXES_MODULE_ID)
      .table("passThroughs")
      .rows() as unknown as {
      id: string;
      date: string;
      businessId: string;
      ownerId: string;
      profitMinor: number;
    }[];
    const withholding = api.moduleState(BUDGETS_MODULE_ID).table("withholding");
    const paid = rows.filter((row) => withholding.get(`withholding:${row.id}`));
    if (!paid.length) {
      tried.push(`${place.name} (${rows.length} profits, none paid)`);
      continue;
    }
    for (const row of paid) {
      const where = `${place.name}, seed ${seed}:${life}, ${row.id}`;
      expect(core.people.has(row.ownerId), where).toBe(true);
      const record = withholding.get(`withholding:${row.id}`) as unknown as {
        personId: string;
        paidMinor: number;
        postings: { accountId: string; deltaMinor: number }[];
      };
      expect(record.personId, where).toBe(row.ownerId);
      expect(record.paidMinor, where).toBe(row.profitMinor);
      // Balanced on the journal: the owner's cash pays each treasury.
      expect(
        record.postings.reduce((n, p) => n + p.deltaMinor, 0),
        where,
      ).toBe(0);
      const out = record.postings.find((p) => p.deltaMinor < 0)!;
      expect(out.accountId, where).toBe(`cash:${row.ownerId}:residual`);
    }
    return;
  }
  throw new Error(
    `no person-owned business had a taxed profit: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);

// The same for a business a counted resident owns: the owner's household group
// pays the quarter's tax from its account to the governments the law names,
// as far as the group holds the cash.
it(`a business a counted resident owns passes its profit to the owner group's income tax (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let life = 0; life < 6; life += 1) {
    const place = drawPlace(`${seed}:counted:${life}`, "profit-pass-through");
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 300));
    const rows = (
      api
        .moduleState(EMPLOYER_TAXES_MODULE_ID)
        .table("passThroughs")
        .rows() as unknown as {
        id: string;
        businessId: string;
        ownerId: string;
        profitMinor: number;
        counted?: boolean;
        taxPaidMinor?: number;
      }[]
    ).filter((row) => row.counted);
    const paid = rows.filter((row) => (row.taxPaidMinor ?? 0) > 0);
    if (!paid.length) {
      tried.push(`${place.name} (${rows.length} counted profits, none paid)`);
      continue;
    }
    for (const row of paid) {
      const where = `${place.name}, seed ${seed}:counted:${life}, ${row.id}`;
      // The tax was paid while the owner was counted; since then the owner may
      // have been filled in as a full person, and then their household is on
      // the runtime's filled-in list.
      const owner = core.people.get(row.ownerId);
      if (owner)
        expect(
          residentsRuntime(core)!.filledIn.has(owner.householdId),
          `${where}: the owner is a full person but their household was not filled in from the counts`,
        ).toBe(true);
      expect(row.taxPaidMinor!, where).toBeLessThanOrEqual(row.profitMinor);
    }
    return;
  }
  throw new Error(
    `no counted-owner business had a taxed profit: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
