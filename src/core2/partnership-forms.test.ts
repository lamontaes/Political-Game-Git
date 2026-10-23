import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { coreAPI, registerModule } from "./state";
import { gameStartDate } from "./game-start";
import { closenessBetween } from "./closeness";
import { lawChain } from "./modules/laws";
import {
  partneredOf,
  reviewPartnerships,
  PARTNERSHIPS_MODULE_ID,
  partnershipsModule,
} from "./modules/partnerships";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { drawPlace } from "../../tests/golden-path/place";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  `partnership-forms:${Date.now()}:${Math.random().toString(16).slice(2)}`;

// Two single adults who are close and can afford a home become one household.
// Real towns form few couples a year, so the test makes a woman and a man close
// friends first (a generated world's own ties are the review's input) and runs the review.
it(`close single adults become partners and share a home (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "partnership-forms");
    tried.push(place.name);
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // Installed here until the played world's people list carries it (pool
    // item words-install-partnerships-module); a no-op once it does.
    if (!core.modules.has(PARTNERSHIPS_MODULE_ID))
      registerModule(core, partnershipsModule);
    const api = coreAPI(core);
    const day = (days: number) =>
      advanceCore(
        core,
        new Date(Date.parse(`${core.date}T00:00:00Z`) + days * 86_400_000)
          .toISOString()
          .slice(0, 10),
      );
    day(2);
    const town = lawChain(api).townPlaceId;
    const partnered = new Set(
      [...core.familyLinks.values()]
        .filter((row) => row.kind === "partner")
        .flatMap((row) => row.personIds),
    );
    const age = (born: string) =>
      Number(core.date.slice(0, 4)) -
      Number(born.slice(0, 4)) -
      (core.date.slice(5) < born.slice(5) ? 1 : 0);
    const singles = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.placeId === town &&
          !partnered.has(p.id) &&
          age(p.birthDate) >= 22 &&
          age(p.birthDate) <= 40 &&
          p.jobId !== undefined,
      )
      .sort((x, y) => x.id.localeCompare(y.id));
    // Pairs of a woman and a man, the closest in age first, made close friends.
    const pairs = singles
      .filter((p) => p.looks?.gender === "female")
      .flatMap((woman) =>
        singles
          .filter(
            (man) =>
              man.looks?.gender === "male" && !man.familyIds.has(woman.id),
          )
          .map((man) => ({
            woman,
            man,
            gap: Math.abs(age(man.birthDate) - age(woman.birthDate)),
          })),
      )
      .sort((x, y) => x.gap - y.gap)
      .slice(0, 6);
    const used = new Set<string>();
    for (const { woman, man } of pairs) {
      if (used.has(woman.id) || used.has(man.id)) continue;
      used.add(woman.id);
      used.add(man.id);
      for (
        let n = 0;
        n < 100 && closenessBetween(core, woman.id, man.id) < 0.9;
        n += 1
      )
        api.relationship(woman.id, man.id, "contact", 20);
    }
    reviewPartnerships(api);
    const row = partneredOf(api)[0];
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
    // The births engine reviews the couple from the next day.
    day(1);
    expect(
      api.moduleState(RENEWAL_MODULE_ID).table("couples").get(row.linkId),
      `${row.id}: the couple's births row`,
    ).toBeTruthy();
    return;
  }
  throw new Error(`no pair partnered in ${tried.join(", ")} (seed ${seed})`);
}, 1_800_000);
