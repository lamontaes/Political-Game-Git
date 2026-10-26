import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { createRenewalCore } from "./births-setup";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { removeCountedPerson, residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

// A counted death passes the dead's cash to the household that outlives
// them, to the kin who live there in equal shares, and the town's record
// names each heir. A random place from all 56, named with its seed on a
// failure.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "counted-estates");
const where = `${place.name}, seed ${seed}`;

describe(`counted estates in ${place.name} (seed ${seed})`, () => {
  it("splits a counted death's cash among the kin at home, every cent kept", () => {
    const core = createRenewalCore(generatedOpening(place, { twoLevel: true }));
    const rt = residentsRuntime(core)!;
    const store = rt.store;
    // A household of three or more counted members, one with cash and kin at home.
    let picked: { dead: number; kin: number[]; others: number[] } | undefined;
    for (const h of store.liveHouseholds()) {
      const members = store.countedMembers(h);
      if (members.length < 3) continue;
      for (const m of members) {
        const kin = new Set<number>();
        for (let i = 0; i < h.kin.length; i += 2) {
          if (h.kin[i] === m) kin.add(h.kin[i + 1]!);
          else if (h.kin[i + 1] === m) kin.add(h.kin[i]!);
        }
        const near = members.filter((x) => kin.has(x));
        if (near.length >= 1 && near.length < members.length - 1) {
          picked = {
            dead: m,
            kin: near,
            others: members.filter((x) => x !== m && !kin.has(x)),
          };
          break;
        }
      }
      if (picked) break;
    }
    expect(
      picked,
      `${where}: a household with kin and a non-kin member`,
    ).toBeDefined();
    const { dead, kin, others } = picked!;
    store.liquid[dead] = 10_001;
    const before = [...kin, ...others].map((x) => store.liquid[x]!);
    const heirs = removeCountedPerson(core, store.ids[dead]! as never);
    expect(heirs.map((row) => row.heirId).sort(), where).toEqual(
      kin.map((x) => store.ids[x]!).sort(),
    );
    expect(
      heirs.reduce((n, row) => n + row.amountMinor, 0),
      where,
    ).toBe(10_001);
    // A non-kin member at home inherits nothing from them.
    others.forEach((x, i) =>
      expect(store.liquid[x], where).toBe(before[kin.length + i]),
    );
    expect(store.liquid[dead], where).toBe(0);
  }, 600_000);

  it("is recorded in the month's counts for each death that left cash, naming the heir", () => {
    const core = createRenewalCore(generatedOpening(place, { twoLevel: true }));
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const rows = coreAPI(core)
      .moduleState(RENEWAL_MODULE_ID)
      .table("counts")
      .rows() as unknown as {
      deaths: string[];
      estates: { deceasedId: string; heirId: string; amountMinor: number }[];
    }[];
    const deaths = new Set(rows.flatMap((row) => row.deaths));
    const estates = rows.flatMap((row) => row.estates);
    expect(estates.length, where).toBeGreaterThan(0);
    for (const estate of estates) {
      expect(deaths.has(estate.deceasedId), where).toBe(true);
      expect(estate.amountMinor, where).toBeGreaterThan(0);
      // The heir is another person, named by record id; they may have died
      // or moved away in the months since.
      expect(estate.heirId, where).not.toBe(estate.deceasedId);
      expect(estate.heirId, where).toMatch(/^person_[0-9a-f]+$/);
    }
  }, 900_000);
});
