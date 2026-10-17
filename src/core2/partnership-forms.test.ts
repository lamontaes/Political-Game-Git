import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { gameStartDate } from "./game-start";
import { partneredOf } from "./modules/partnerships";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { drawPlace } from "../../tests/golden-path/place";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  `partnership-forms:${Date.now()}:${Math.random().toString(16).slice(2)}`;

// Two single adults who know each other and can afford a home become one household.
it(`single adults who are close become partners and share a home (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "partnership-forms");
    tried.push(place.name);
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const start = Date.parse(`${gameStartDate()}T00:00:00Z`);
    let row = partneredOf(api)[0];
    for (let month = 1; !row && month <= 12; month += 1) {
      advanceCore(
        core,
        new Date(start + month * 31 * 86_400_000).toISOString().slice(0, 10),
      );
      row = partneredOf(api)[0];
    }
    if (!row) continue;
    const [a, b] = row.personIds.map((id) => core.people.get(id)!) as [
      NonNullable<ReturnType<typeof core.people.get>>,
      NonNullable<ReturnType<typeof core.people.get>>,
    ];
    // They share a household, and the partner link says so.
    expect(a.householdId, row.id).toBe(row.householdId);
    expect(b.householdId).toBe(row.householdId);
    expect(core.households.get(row.householdId)!.memberIds).toEqual(
      expect.arrayContaining([a.id, b.id]),
    );
    expect(core.familyLinks.get(row.linkId)?.kind).toBe("partner");
    expect(a.looks?.gender).not.toBe(b.looks?.gender);
    // Their open leases are paid by members of the household they now share.
    for (const contract of core.finance.contracts.values()) {
      if (contract.endedAt || contract.householdId !== row.householdId)
        continue;
      for (const payer of contract.payerIds)
        expect(core.households.get(row.householdId)!.memberIds).toContain(
          payer,
        );
    }
    // Why: both weighed it, closeness among the reasons.
    for (const id of row.personIds)
      expect(Object.keys(row.reasons[id]!)).toEqual(
        expect.arrayContaining(["baseline", "closeness", "age-gap", "means"]),
      );
    // The births engine reviews the couple.
    advanceCore(
      core,
      new Date(Date.parse(`${core.date}T00:00:00Z`) + 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
    expect(
      api.moduleState(RENEWAL_MODULE_ID).table("couples").get(row.linkId),
      `${row.id}: the couple's births row`,
    ).toBeTruthy();
    return;
  }
  throw new Error(`no one partnered in ${tried.join(", ")} (seed ${seed})`);
}, 3_000_000);
