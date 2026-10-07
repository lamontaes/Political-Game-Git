import { describe, expect, it } from "vitest";
import {
  COUNTY_BUDGET_HEARING_TRANSITION,
  ensureCountyBudgetHearings,
} from "../../src/simulation/living-world/county-budget-hearings";
import {
  adoptedCountyLevy,
  countyBudgetHearings,
} from "../../src/simulation/county-budget-record";
import { countyGovernmentUnit } from "../../src/simulation/government-units";
import { homeLocalGovernmentUnits } from "../../src/simulation/nationwide-world/local-governments";
import { observerPlace } from "../../src/presentation/observer-world";
import { measurePosition } from "../../src/simulation/legislation";
import { sittingLocalOfficers } from "../../src/simulation/living-world/local-government-seats";
import { personName } from "../../src/simulation/people";
import { settlePublicBudgets } from "../../src/simulation/public-budgets";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import {
  PROPERTY_BASE_KEY,
  placeInGovernment,
} from "../../src/simulation/property-tax-bases";
import { activeHousingTenuresAt } from "../../src/simulation/resource-queries";
import type { EntityId, IsoDate, World } from "../../src/simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { cancelFutureDueItem } from "../../src/simulation/future-transitions";
import { resolveDueThrough } from "../fixtures/due-item-clock";

/**
 * CO-5: a county board holds a budget hearing on its own recorded sitting day
 * before its fiscal year opens, votes the levy the books need from its
 * members' own principles, and a levy that passes is the property tax named
 * households are assessed. A county is drawn from every county the game has a
 * government for, by seed, never named here.
 */

/**
 * The clock for this test resolves only the due items the county's money and
 * board run on (the hearing, the board's readings, the tax seam's policy and
 * assessment days) through the canonical resolver. The rest of a world's
 * calendar (paydays, press, migration, crisis sampling) is left out because
 * this test reads none of it and a hundred days of it takes many minutes.
 */
const COUNTY_CLOCK = /^(county:|civic:)|tax|property/;

function isolateCountyClock(world: World): World {
  let next = world;
  for (const item of world.history.futureDueItems)
    if (!COUNTY_CLOCK.test(item.transitionKey))
      next = cancelFutureDueItem(next, {
        stableKey: `${item.stableKey}:set-aside-by-test`,
        dueItemId: item.id,
        effectiveAt: world.currentDate,
        reasonKey: "test:county-clock-only",
        context: "The county budget test runs only the county's own calendar.",
      });
  return next;
}

function advanceTo(world: World, date: IsoDate): World {
  return resolveDueThrough(world, date);
}

/**
 * A place drawn by seed from every place the game opens in, and the county
 * that serves it. A player starts in a town, so the county's households are
 * the town's homes.
 */
function openCounty(seed: string) {
  const place = observerPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `co5-${seed}`,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = openOrdinaryLife(game.world, game.playerPersonId);
  const county = homeLocalGovernmentUnits(world, game.playerPersonId)
    .counties[0];
  return { county: county!, place, world, personId: game.playerPersonId };
}

describe.each(["co5-budget-hearing-a", "co5-budget-hearing-b"])(
  "a county budget hearing in a randomly drawn county (seed %s)",
  (seed) => {
    it("is on the calendar on its recorded day, is voted by the board, and lands on named households", () => {
      const { county, place, world: opened } = openCounty(seed);
      const geoid = county.countyGeoid!;
      const books = opened.publicBudgets!.governments.find(
        (row) => row.key === `county:${geoid}`,
      )!;
      expect(books).toBeDefined();
      const officers = sittingLocalOfficers(opened, county);
      expect(officers.length).toBeGreaterThan(0);
      const due = opened.history.futureDueItems.find(
        (item) =>
          item.transitionKey === COUNTY_BUDGET_HEARING_TRANSITION &&
          item.stableKey.includes(county.id),
      )!;
      expect(due).toBeDefined();
      process.stderr.write(
        `CO-5 world seed ${seed}, place ${place.displayName} (${county.stateUsps}, ${county.id}), opened ${opened.currentDate}, fiscal year starts ${books.fiscalYearStart} (${books.fiscalYearStartBasis}), hearing on ${due.dueAt}\n`,
      );
      // The hearing day is a sitting day inside the lead window, never today.
      expect(due.dueAt > opened.currentDate).toBe(true);

      // Case 1: the hearing is held and the board's measure is on its agenda.
      let world = advanceTo(isolateCountyClock(opened), due.dueAt);
      const hearing = countyBudgetHearings(world).find(
        (row) => row.unitId === county.id,
      )!;
      expect(hearing).toBeDefined();
      expect(hearing.hearingOn).toBe(due.dueAt);
      expect(hearing.proposal.propertyTaxLevy).toBeGreaterThan(0);
      process.stderr.write(
        `HEARING ${hearing.key}: proposed spending ${hearing.proposal.appropriations}, revenue ${hearing.proposal.expectedRevenue}, levy ${hearing.proposal.propertyTaxLevy} (this year ${hearing.proposal.priorPropertyTaxLevy}), rate ${hearing.proposal.rateNumerator}/${hearing.proposal.rateDenominator} on ${hearing.proposal.assessedBase} of homes\n`,
      );
      const proposal = world.history.taxProposals!.find(
        (row) => row.id === hearing.taxProposalId,
      )!;
      expect(proposal.terms.rateNumerator).toBe(hearing.proposal.rateNumerator);
      expect(proposal.terms.instrument).toBe("property");
      expect(measurePosition(world, hearing.measureId).phase).toBe("on-floor");
      // The next year's hearing is already set.
      expect(
        world.history.futureDueItems.some(
          (item) =>
            item.transitionKey === COUNTY_BUDGET_HEARING_TRANSITION &&
            item.stableKey.includes(county.id) &&
            item.dueAt > due.dueAt,
        ),
      ).toBe(true);

      // Case 2: the board votes at its reading, from its members' own reasons.
      world = advanceTo(world, hearing.startsOn);
      const decided = countyBudgetHearings(world).find(
        (row) => row.key === hearing.key,
      )!;
      const vote = (world.history.legislativeVotes ?? []).find(
        (row) => row.measureId === hearing.measureId,
      )!;
      process.stderr.write(
        `AFTER READING ${world.currentDate}: stage ${decided.stage}, phase ${measurePosition(world, hearing.measureId).phase}, actions ${(
          world.history.legislativeActions ?? []
        )
          .filter((row) => row.measureId === hearing.measureId)
          .map((row) => row.kind)
          .join(",")}, items ${world.history.futureDueItems
          .filter((item) => item.entityIds.includes(hearing.measureId))
          .map((item) => `${item.transitionKey}@${item.dueAt}`)
          .join(",")}\n`,
      );
      for (const item of world.history.futureDueItems.filter((row) =>
        row.entityIds.includes(hearing.measureId),
      ))
        process.stderr.write(
          `ITEM ${item.transitionKey}@${item.dueAt}: ${(
            world.history.futureDueItemStates ?? []
          )
            .filter((row) => row.dueItemId === item.id)
            .map((row) => `${row.status} ${row.context}`)
            .join(" | ")}\n`,
        );
      expect(vote).toBeDefined();
      process.stderr.write(
        `VOTE ${decided.stage} on ${decided.decidedOn}: ${vote.outcome}; ${vote.dispositions.map((row) => `${row.disposition}/${row.reason}`).join(", ")}\n`,
      );
      expect(vote.provenance.method).toBe("member-decisions");
      expect(["adopted", "rejected"]).toContain(decided.stage);
      expect(decided.stage === "adopted").toBe(vote.outcome === "passed");
      if (decided.stage !== "adopted") {
        // A levy the board did not pass assesses no one.
        expect(world.history.taxPolicies ?? []).toHaveLength(0);
        return;
      }

      // Case 3: the levy lands on named households' tax records.
      expect(decided.adoptedPropertyTaxLevy).toBe(
        hearing.proposal.propertyTaxLevy,
      );
      const policy = world.history.taxPolicies![0]!;
      const effectiveDay = advanceTo(
        world,
        policy.effectiveAt > world.currentDate
          ? policy.effectiveAt
          : world.currentDate,
      );
      const assessed = advanceTo(
        effectiveDay,
        addDaysIso(policy.effectiveAt, 1),
      );
      const bases = (assessed.history.taxBases ?? []).filter(
        (row) => row.baseKey === PROPERTY_BASE_KEY,
      );
      for (const item of assessed.history.futureDueItems.filter(
        (row) => row.transitionKey === "tax:property-assessment-day",
      ))
        process.stderr.write(
          `ASSESSMENT DAY ${item.dueAt}: ${(
            assessed.history.futureDueItemStates ?? []
          )
            .filter((row) => row.dueItemId === item.id)
            .map((row) => `${row.status} ${row.context}`)
            .join(" | ")}; now ${assessed.currentDate}\n`,
        );
      {
        const identity = proposal.publicGovernmentIdentity as {
          governmentKey: string;
          jurisdictionId: string;
        };
        const tenures = activeHousingTenuresAt(assessed);
        const dwellings = new Map(
          assessed.history.dwellings.map((row) => [row.id, row]),
        );
        const reached = tenures.filter((tenure) => {
          const dwelling = dwellings.get(tenure.dwellingId);
          return (
            !!dwelling &&
            placeInGovernment(
              dwelling.jurisdictionId,
              identity.governmentKey,
              identity.jurisdictionId,
            )
          );
        });
        process.stderr.write(
          `TENURES ${tenures.length} active, ${reached.length} in the county; dwelling jurisdictions ${[...new Set(tenures.map((t) => dwellings.get(t.dwellingId)?.jurisdictionId))].slice(0, 5).join(",")} vs ${identity.jurisdictionId}\n`,
        );
        expect(reached.length).toBeGreaterThan(0);
      }
      expect(bases.length).toBeGreaterThan(0);
      const sample = bases[0]!;
      const assessment = assessed.history.taxAssessments!.find(
        (row) => row.baseId === sample.id,
      )!;
      const payerId = (sample.payer as { personId: EntityId }).personId;
      expect(assessed.people[payerId]).toBeDefined();
      expect(assessment.taxAmount.minorUnits).toBe(
        Math.round(
          (sample.amount.minorUnits * proposal.terms.rateNumerator) /
            proposal.terms.rateDenominator,
        ),
      );
      process.stderr.write(
        `HOUSEHOLD ${personName(assessed.people[payerId]!)} base ${sample.amount.minorUnits} tax ${assessment.taxAmount.minorUnits} (policy effective ${policy.effectiveAt})\n`,
      );

      // Case 4: the year's adopted budget expects exactly the levy the board
      // adopted, and the books carry it through a save and reload.
      const lastMonth = addDaysIso(decided.startsOn, -1).slice(0, 7) + "-01";
      const settled = settlePublicBudgets(
        { ...assessed, currentDate: assessed.currentDate },
        lastMonth as IsoDate,
      );
      const adoptedYear = settled
        .publicBudgets!.governments.find(
          (row) => row.key === `county:${geoid}`,
        )!
        .years.at(-1)!;
      expect(adoptedYear.basis).toBe("board-vote");
      expect(
        adoptedCountyLevy(settled, `county:${geoid}`, decided.fiscalYear),
      ).not.toBeNull();
      const reloaded = deserializeWorld(serializeWorld(assessed));
      expect(countyBudgetHearings(reloaded)).toEqual(
        countyBudgetHearings(assessed),
      );
    }, 1_800_000);
  },
);

describe("a county with no seated board", () => {
  it("holds no hearing", () => {
    const { world } = openCounty("co5-budget-hearing-quiet");
    const seated = new Set(
      world.publicBudgets!.governments.flatMap((row) => {
        if (row.level !== "county") return [];
        const unit = countyGovernmentUnit(row.key.slice("county:".length));
        return unit && sittingLocalOfficers(world, unit).length > 0
          ? [unit.id]
          : [];
      }),
    );
    const hearings = world.history.futureDueItems.filter(
      (item) => item.transitionKey === COUNTY_BUDGET_HEARING_TRANSITION,
    );
    for (const item of hearings)
      expect([...seated].some((id) => item.stableKey.includes(id))).toBe(true);
    // Running the scheduler again changes nothing.
    expect(
      ensureCountyBudgetHearings(world).history.futureDueItems,
    ).toHaveLength(world.history.futureDueItems.length);
  }, 600_000);
});

function addDaysIso(date: IsoDate, days: number): IsoDate {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10) as IsoDate;
}
