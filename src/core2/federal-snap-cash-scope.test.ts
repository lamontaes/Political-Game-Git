// @vitest-environment node
/** Generated world; eligibility, budget and prior benefit-month fixtures are explicit. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { amendBudget, governments, lineBeforeBill } from "./modules/budgets";
import { budgetNow, modeledShare, townShare } from "./law-reach/group-b-money";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { coreAPI } from "./state";
import { putRow, rowsOf, REACH_B_MODULE_ID } from "./law-reach/group-b-store";
import {
  selectResidents,
  townFacts,
  forgetTownFacts,
  type PeopleSelector,
} from "./law-reach/group-b-people";
import reach from "./data/laws/reach-group-b.json";
import type { LawRowInput } from "./laws-starting";
import { makeIsoDate } from "./kernel/dates";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "federal-snap-cash-scope");
const question =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";
const cashKey = "benefit|budget-line:welfareAndMedicaid";
const foodKey = "benefit|snap-baseline";
interface Benefit {
  id: string;
  key: string;
  recipientId: string;
  amountMinor: number;
  obligationId: string;
}

it(`SNAP conditions do not end unrelated cash assistance: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    console.log(
      JSON.stringify({
        stage: "opening",
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
      }),
    );
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const chain = lawChain(api);
    const cashSelector = reach.budgetLines.welfareAndMedicaid
      .people as PeopleSelector;
    const workSelector = reach.policies[question].people as PeopleSelector;
    const openingFacts = townFacts(api, chain.townPlaceId);
    const openingWork = new Set(
      selectResidents(openingFacts, workSelector, chain.stateKey).map(
        (r) => r.id,
      ),
    );
    let fixturePersonId: string | undefined;
    const openingCandidates = new Set(
      selectResidents(openingFacts, cashSelector, chain.stateKey)
        .filter((r) => openingWork.has(r.id))
        .map((r) => r.id),
    );
    const namedFoodRecipient = rowsOf<Benefit>(api, "taken").some(
      (r) =>
        r.key === foodKey &&
        r.amountMinor > 0 &&
        openingCandidates.has(r.recipientId) &&
        !api.accounts().obligation(r.obligationId)?.endedAt,
    );
    if (!namedFoodRecipient) {
      // Some drawn villages have no head subject to this rule. Add an
      // explicit test-only adult household; do not skip the place or weaken
      // the assertions that a SNAP payment stops and a cash payment remains.
      fixturePersonId = "test:snap-cash-recipient";
      const model = [...world.core.people.values()].find(
        (p) => p.alive && p.placeId === chain.townPlaceId,
      )!;
      expect(model).toBeDefined();
      const householdId = "test:snap-cash-household";
      const source = {
        tag: "ESTIMATED" as const,
        citation:
          "Controlled eligible-recipient test fixture, not a generated resident",
        asOf: world.core.date,
      };
      world.core.households.set(householdId, {
        id: householdId,
        placeId: model.placeId,
        memberIds: [],
        source,
      });
      api.addPersonV1({
        id: fixturePersonId,
        givenName: "Fixture",
        familyName: "Recipient",
        birthDate: makeIsoDate("1985-01-01"),
        placeId: model.placeId,
        ...(model.countyId ? { countyId: model.countyId } : {}),
        householdId,
        tier: model.tier,
        traits: model.traits,
        liquidMinor: 0,
        livingCostDailyMinor: 0,
        source,
        familyIds: [],
        knownIds: [],
      });
      forgetTownFacts(api);
    }
    let act = 0;
    const setRequirement = (
      value: number,
      level: LawRowInput["level"] = "federal",
      jurisdiction = "US",
    ) =>
      enactLaw(api, {
        jurisdiction,
        level,
        series: question,
        value,
        // Controlled prior-law fixture, so the recorded prior benefit months
        // fall within the law's window. This is not a played legislative vote.
        effectiveDate: "2024-01-01",
        measureId: `snap-program-scope-fixture-${++act}`,
        citation:
          "7 USC 2015(o)(2): SNAP participation, not unrelated cash grants",
      });
    for (const level of lawInForce(api, question).levels)
      if (level.row) setRequirement(0, level.level, level.jurisdiction);
    setRequirement(0);
    const government = governments(api).find((g) => g.level === "state")!;
    expect(government).toBeDefined();
    const budget = budgetNow(api, government.id)!;
    expect(budget).toBeDefined();
    const base = lineBeforeBill(
      api,
      government,
      budget.fiscalYear,
      "welfareAndMedicaid",
    );
    const current = budget.spendingMinor.welfareAndMedicaid ?? 0;
    // Fund a positive cash program above the actual adopted line, including
    // worlds whose opening law has already cut that line below its base.
    const grantFacts = townFacts(api, chain.townPlaceId);
    const grantHeads = selectResidents(
      grantFacts,
      cashSelector,
      chain.stateKey,
    );
    const share = townShare(api, government);
    expect(share).toBeGreaterThan(0);
    // In a tiny place the state's share of $10 million can round below one
    // cent per recipient. Fund at least $1 a month per selected household.
    const minimumGrant = Math.ceil(
      (12 * 100 * grantHeads.reduce((n, h) => n + (h.scale ?? 1), 0)) /
        share /
        modeledShare(api, grantFacts),
    );
    const increase =
      Math.max(0, base - current) + Math.max(1_000_000_000, minimumGrant);
    console.log(
      JSON.stringify({
        stage: "cash-budget-fixture",
        government: government.id,
        base,
        current,
        increase,
        townShare: townShare(api, government),
        heads: selectResidents(
          townFacts(api, chain.townPlaceId),
          reach.budgetLines.welfareAndMedicaid.people as PeopleSelector,
          chain.stateKey,
        ).length,
      }),
    );
    expect(
      amendBudget(api, {
        governmentId: government.id,
        line: "welfareAndMedicaid",
        deltaMinor: increase,
        measureId: "cash-assistance-scope-budget-fixture",
      }),
    ).not.toBeNull();
    const benefits = (key: string) =>
      rowsOf<Benefit>(api, "taken")
        .filter(
          (r) =>
            r.key === key &&
            !api.accounts().obligation(r.obligationId)?.endedAt,
        )
        .sort((a, b) => a.id.localeCompare(b.id));
    const cash = benefits(cashKey);
    expect(cash.length).toBeGreaterThan(0);
    expect(cash.every((r) => r.amountMinor > 0)).toBe(true);
    if (fixturePersonId)
      expect(cash.some((r) => r.recipientId === fixturePersonId)).toBe(true);
    const food = benefits(foodKey);
    const amounts = (rows: readonly Benefit[]) =>
      rows
        .map((r) => [r.recipientId, r.amountMinor] as const)
        .sort((a, b) => a[0].localeCompare(b[0]));
    const total = (rows: readonly Benefit[]) =>
      rows.reduce((n, r) => n + r.amountMinor, 0);
    const facts = townFacts(api, chain.townPlaceId);
    const workIds = new Set(
      selectResidents(
        facts,
        reach.policies[question].people as PeopleSelector,
        chain.stateKey,
      ).map((r) => r.id),
    );
    const cashHeads = selectResidents(
      facts,
      reach.budgetLines.welfareAndMedicaid.people as PeopleSelector,
      chain.stateKey,
    );
    // A controlled three-month history, not fabricated payment receipts.
    for (const head of cashHeads)
      putRow(api, "taken", {
        id: `draw|${head.id}`,
        key: "draw",
        months: ["2024-10", "2024-11", "2024-12"],
      });
    const requirement = setRequirement(1);
    const federal = lawInForce(api, question).levels.find(
      (l) => l.level === "federal",
    )!;
    expect(federal.row?.id).toBe(requirement.id);
    const applies = !federal.setAside;
    if (applies && fixturePersonId)
      expect(food.some((r) => r.recipientId === fixturePersonId)).toBe(true);
    const coveredCashHeads = cashHeads.filter((h) => workIds.has(h.id));
    if (applies) expect(coveredCashHeads.length).toBeGreaterThan(0);
    // Both the immediate law event and an ordinary budget review preserve
    // the original cash obligations, including their ids and amounts.
    expect(benefits(cashKey)).toEqual(cash);
    amendBudget(api, {
      governmentId: government.id,
      line: "welfareAndMedicaid",
      deltaMinor: 0,
      measureId: "cash-assistance-scope-review-fixture",
    });
    expect(benefits(cashKey)).toEqual(cash);
    if (applies) expect(total(benefits(foodKey))).toBeLessThan(total(food));
    else expect(amounts(benefits(foodKey))).toEqual(amounts(food));
    const stoppedFood = food.filter(
      (r) => applies && workIds.has(r.recipientId),
    );
    for (const row of stoppedFood)
      expect(api.accounts().obligation(row.obligationId)?.endedAt).toBe(
        api.state.date,
      );
    setRequirement(0);
    expect(benefits(cashKey)).toEqual(cash);
    expect(amounts(benefits(foodKey))).toEqual(amounts(food));
    for (const row of stoppedFood)
      expect(
        benefits(foodKey).find((r) => r.recipientId === row.recipientId)
          ?.amountMinor,
      ).toBe(row.amountMinor);
    // Cash disbursements also must not consume SNAP's month allowance.
    setRequirement(1);
    const taken = api.moduleState(REACH_B_MODULE_ID).table("taken");
    for (const row of taken.query("byKey", ["draw"])) taken.remove(row.id);
    amendBudget(api, {
      governmentId: government.id,
      line: "welfareAndMedicaid",
      deltaMinor: 0,
      measureId: "cash-assistance-does-not-consume-snap-month-fixture",
    });
    expect(taken.query("byKey", ["draw"])).toHaveLength(0);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        federalApplies: applies,
        fixturePersonId,
        coveredCashHeads: coveredCashHeads.length,
        cashObligations: cash.map((r) => r.obligationId),
        stoppedFoodObligations: stoppedFood.map((r) => r.obligationId),
        requirement: requirement.id,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 120_000);
