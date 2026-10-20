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
    const personId = dying.at(-1)!;
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
    expect(sale!.decedentId, `${where}: names the estate`).toBe(personId);
    expect(
      sale!.toLenderMinor,
      `${where}: the lender was paid first`,
    ).toBeGreaterThan(0);
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
    const settled = heard.find((e) => e.facts?.decedentId === personId);
    expect(settled, `${where}: probate settled the estate`).toBeDefined();
    expect(
      Number(settled!.facts?.estateMinor),
      `${where}: the estate held the surplus ${sale!.surplusMinor}`,
    ).toBeGreaterThanOrEqual(sale!.surplusMinor);
    expect(sale!.surplusMinor + sale!.toLenderMinor, where).toBeLessThanOrEqual(
      sale!.priceMinor,
    );
    expect(state.cashJournal.totals.grossDebitMinor).toBe(
      state.cashJournal.totals.grossCreditMinor,
    );
    return;
  }
  throw new Error(
    `no drawn place had a household that owns its home (${tried.join("; ")})`,
  );
}, 1_800_000);
