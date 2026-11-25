// @vitest-environment node
/**
 * The federal Social Security line moves who is poor, in both tiers (outcome
 * link social-security-line-to-poverty, carried by the poverty engine). Two
 * worlds from one drawn place and seed: one where Congress's budget bill
 * raises the line a fifth, carried as a passed bill carries it, and one left
 * alone. Production budgets, awards and the poverty count run in both.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { residentsRuntime } from "./modules/residents";
import {
  claimRetirementNow,
  retirementClaims,
} from "./modules/retirement-claims";
import { coreAPI } from "./state";
import type { CoreState } from "./types";
import { householdPoverty } from "./world-poverty";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "social-security-line-poverty");
const LINE = "socialSecurity";

const world = () => {
  const w = buildBenchWorld(place.seed, gameStartDate(), {
    placeKey: place.key,
    twoLevel: true,
  });
  return { w, api: coreAPI(w.core) };
};

/** Every counted household's own Social Security, a year's worth, by household. */
const countedRetirement = (core: CoreState) => {
  const rt = residentsRuntime(core)!;
  const out = new Map<string, number>();
  for (const h of rt.store.liveHouseholds())
    if (h.retirementMinorYear > 0) out.set(h.id, h.retirementMinorYear);
  return out;
};

it(`a raise in the federal Social Security line raises retirees' income where poverty is counted: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const raised = world();
    const alone = world();
    const federal = governments(raised.api).find((g) => g.level === "federal")!;
    const budget = [...budgetsOf(raised.api, federal.id)].sort(
      (a, b) => b.fiscalYear - a.fiscalYear,
    )[0]!;
    const delta = Math.round(budget.spendingMinor[LINE]! / 5);
    expect(
      amendBudget(raised.api, {
        governmentId: federal.id,
        line: LINE,
        deltaMinor: delta,
        measureId: "H.R. 9002 (Social Security, test)",
        carry: true,
      }),
    ).not.toBeNull();
    const until = addDays(makeIsoDate(raised.api.state.date), 40);
    advanceCore(raised.w.core, until);
    advanceCore(alone.w.core, until);

    // Counted retirees: each household's own award follows the line.
    const before = countedRetirement(alone.w.core);
    const after = countedRetirement(raised.w.core);
    expect(before.size).toBeGreaterThan(0);
    let rose = 0;
    for (const [id, minor] of before) {
      const now = after.get(id);
      if (now === undefined) continue;
      expect(now).toBeGreaterThan(minor);
      expect(now / minor).toBeGreaterThan(1.15);
      rose += 1;
    }
    expect(rose).toBeGreaterThan(0);

    // The poverty engine reads those incomes: every household with an award
    // has more income under the raise, named and counted.
    const incomes = (core: CoreState) =>
      new Map(householdPoverty(core).map((h) => [h.householdId, h]));
    const povertyAlone = incomes(alone.w.core);
    const povertyRaised = incomes(raised.w.core);
    let countedHigher = 0;
    for (const id of before.keys()) {
      const a = povertyAlone.get(id);
      const r = povertyRaised.get(id);
      if (!a || !r) continue;
      expect(r.incomeMinor).toBeGreaterThan(a.incomeMinor);
      countedHigher += 1;
    }
    expect(countedHigher).toBeGreaterThan(0);

    // Social Security claimed in play counts as income for the claimant's
    // household: a full resident of claiming age, out of work and holding
    // no office, who has no award claims
    // through the game's own call, and their household's income rises by a
    // year of the award.
    const core = raised.w.core;
    const age = (birth: string) =>
      Number(core.date.slice(0, 4)) - Number(birth.slice(0, 4));
    const candidates = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.householdId &&
          !p.jobId &&
          !p.id.startsWith("official:") &&
          age(p.birthDate) >= 63 &&
          !retirementClaims(core).has(p.id),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    let claimant: (typeof candidates)[number] | undefined;
    let incomeBefore = 0;
    for (const p of candidates) {
      const before = householdPoverty(core).find(
        (h) => h.householdId === p.householdId,
      );
      if (!before) continue;
      if (!claimRetirementNow(raised.api, p.id)) continue;
      claimant = p;
      incomeBefore = before.incomeMinor;
      break;
    }
    expect(claimant).toBeDefined();
    const claim = retirementClaims(core).get(claimant!.id)!;
    const award = raised.api.accounts().obligation(claim.obligationId)!;
    const incomeAfter = householdPoverty(core).find(
      (h) => h.householdId === claimant!.householdId,
    )!.incomeMinor;
    expect(incomeAfter - incomeBefore).toBe(award.amountMinor * 12);
    // A counted resident of claiming age claims the same way: their award
    // is a monthly residents flow, and their counted household's income
    // rises by a year of it.
    const rt = residentsRuntime(core)!;
    let countedClaimant: string | undefined;
    let countedHousehold = "";
    let countedBefore = 0;
    search: for (const h of rt.store.liveHouseholds()) {
      for (const m of rt.store.countedMembers(h)) {
        const id = rt.store.ids[m]!;
        if (age(rt.store.born[m]!) < 63 || retirementClaims(core).has(id))
          continue;
        const before = householdPoverty(core).find(
          (row) => row.householdId === h.id,
        );
        if (!before || !claimRetirementNow(raised.api, id)) continue;
        if (!retirementClaims(core).get(id)?.counted) continue;
        countedClaimant = id;
        countedHousehold = h.id;
        countedBefore = before.incomeMinor;
        break search;
      }
    }
    expect(countedClaimant).toBeDefined();
    const countedClaim = retirementClaims(core).get(countedClaimant!)!;
    const flow = rt.flows.get(countedClaim.obligationId)!;
    const countedAfter = householdPoverty(core).find(
      (row) => row.householdId === countedHousehold,
    )!.incomeMinor;
    expect(countedAfter - countedBefore).toBe(
      (flow.amountByContract?.[countedClaim.obligationId] ?? flow.amountMinor) *
        12,
    );
    const claims = [...retirementClaims(core).values()].filter((c) => {
      const o = raised.api.accounts().obligation(c.obligationId);
      return o && !o.endedAt;
    }).length;
    const poor = (rows: ReturnType<typeof householdPoverty>) =>
      rows.reduce((n, h) => n + (h.poor ? h.size * h.weight : 0), 0);
    const poorAlone = poor([...povertyAlone.values()]);
    const poorRaised = poor([...povertyRaised.values()]);
    expect(poorRaised).toBeLessThanOrEqual(poorAlone);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        through: raised.w.core.date,
        countedRetireeHouseholds: before.size,
        countedHouseholdsHigher: rose,
        povertyIncomesHigher: countedHigher,
        openClaimsInPlay: claims,
        claimant: claimant!.id,
        claimMonthlyMinor: award.amountMinor,
        countedClaimant,
        poorPeopleAlone: Math.round(poorAlone),
        poorPeopleRaised: Math.round(poorRaised),
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 300_000);
