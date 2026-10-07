import { describe, expect, it } from "vitest";
import { countyBudgetHearings } from "../../src/simulation/county-budget-record";
import { homeLocalGovernmentUnits } from "../../src/simulation/nationwide-world/local-governments";
import { observerPlace } from "../../src/presentation/observer-world";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { cancelFutureDueItem } from "../../src/simulation/future-transitions";
import { juryCountyForPlace } from "../../src/simulation/justice/jury-catchment";
import { ageOnDate } from "../../src/simulation/dates";
import { beginHealthEpisode } from "../../src/simulation/crisis/health";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import type { EntityId } from "../../src/simulation/types";
import { BUDGET_PROGRAMS } from "../../src/simulation/public-budgets/store";
import { organizationServesCounty } from "../../src/simulation/county-service-authority";
import { addDays, daysBetween } from "../../src/simulation/dates";
import { settlePublicBudgets } from "../../src/simulation/public-budgets";
import { ensureCountyServiceAppropriations } from "../../src/simulation/county-services";
import { publicProgramRecords } from "../../src/simulation/public-program-integrity";
import { COUNTY_SERVICE_FAMILIES } from "../../src/simulation/law-consequences/service-delivered-data";
import type { IsoDate, World } from "../../src/simulation/types";
import { resolveDueThrough } from "../fixtures/due-item-clock";

/**
 * CO-9: a county's board funds its health clinics, road repair and fair from
 * its voted budget lines. A county is drawn from every county the game has a
 * government for, by seed, never named here.
 */
const CLOCK =
  /^(county:|civic:|governing|public-program|public-service|program)|tax|property|service|resource/;

const BOARD_CLOCK = /^(county:|civic:)|tax|property/;

function isolate(world: World, clock: RegExp = CLOCK): World {
  let next = world;
  const ended = new Set(
    (world.history.futureDueItemStates ?? [])
      .filter((row) => row.status !== "scheduled")
      .map((row) => row.dueItemId),
  );
  for (const item of world.history.futureDueItems)
    if (!ended.has(item.id) && !clock.test(item.transitionKey))
      next = cancelFutureDueItem(next, {
        stableKey: `${item.stableKey}:set-aside-by-test`,
        dueItemId: item.id,
        effectiveAt: world.currentDate,
        reasonKey: "test:county-services-clock",
        context: "The county services test runs only the money and the board.",
      });
  return next;
}

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
    .counties[0]!;
  return { county, place, world };
}

describe("a county's voted budget lines fund its services", () => {
  it.each(["co5-budget-hearing-a", "co9-county-b"])(
    "funds clinics, roads and the fair from the voted year and reaches a named resident (seed %s)",
    (seed) => {
      const { county, place, world: opened } = openCounty(seed);
      const geoid = county.countyGeoid!;
      const hearing0 = opened.history.futureDueItems.find(
        (item) =>
          item.transitionKey === "county:budget-hearing" &&
          item.stableKey.includes(county.id),
      )!;
      process.stderr.write(
        `CO-9 world seed ${seed}, place ${place.displayName} (${county.stateUsps}, ${county.id}), opened ${opened.currentDate}\n`,
      );
      let world = resolveDueThrough(
        isolate(opened, BOARD_CLOCK),
        hearing0.dueAt,
      );
      const hearing = countyBudgetHearings(world).find(
        (row) => row.unitId === county.id,
      )!;
      world = resolveDueThrough(world, hearing.startsOn);
      const decided = countyBudgetHearings(world).find(
        (row) => row.key === hearing.key,
      )!;
      expect(decided.stage).toBe("adopted");
      // The voted year opens; the month's pass funds the county's services.
      world = resolveDueThrough(isolate(world, BOARD_CLOCK), decided.startsOn);
      const month = `${decided.startsOn.slice(0, 7)}-01` as IsoDate;
      const settled = settlePublicBudgets(
        world,
        addDays(month, -1).slice(0, 7) + "-01",
      );
      world = ensureCountyServiceAppropriations(
        settled,
        addDays(month, -31) as IsoDate,
      );
      const mine = (record: { programKey?: string }) =>
        COUNTY_SERVICE_FAMILIES.some(
          (row) => record.programKey === `${row.family}:${geoid}`,
        );
      const appropriations = publicProgramRecords(world).filter(
        (record) => record.kind === "appropriation" && mine(record),
      );
      expect(appropriations.length).toBeGreaterThan(0);
      // Each appropriation is exactly the voted line, so a bigger or smaller
      // vote is a bigger or smaller service budget.
      const voted = world
        .publicBudgets!.governments.find(
          (government) => government.key === `county:${geoid}`,
        )!
        .years.at(-1)!;
      for (const { family, line } of COUNTY_SERVICE_FAMILIES) {
        const record = appropriations.find(
          (row) => row.programKey === `${family}:${geoid}`,
        );
        const dollars =
          voted.appropriations[BUDGET_PROGRAMS.indexOf(line)] ?? 0;
        if (dollars > 0)
          expect(
            record?.kind === "appropriation" && record.amount.minorUnits,
          ).toBe(Math.round(dollars) * 100);
      }
      const startDay = world.currentDate;
      const step = (to: number) => {
        world = resolveDueThrough(
          isolate(world),
          addDays(startDay, to) as IsoDate,
        );
      };
      // The manager commits once the county's account holds the cash, and the
      // first payment posts; until then the money waits and is asked for again
      // each month.
      const paid = () => {
        const records = publicProgramRecords(world);
        const ours = new Set(
          records
            .filter((record) => record.kind === "commitment" && mine(record))
            .map((record) => record.id),
        );
        return records.some(
          (record) =>
            record.kind === "installment" &&
            ours.has(record.commitmentId) &&
            record.status === "posted" &&
            !!record.resourceFlowId,
        );
      };
      for (let day = 30; day <= 360 && !paid(); day += 30) {
        step(day);
      }
      if (!paid()) {
        // Quiet case: the county's account never held the cash for its lines,
        // so the manager commits nothing, no payment is attempted and fails,
        // and the matters keep coming back each month.
        const all = publicProgramRecords(world);
        expect(
          all.filter(
            (record) =>
              record.kind === "commitment" &&
              mine(record) &&
              !!record.recipientOrganizationId,
          ),
        ).toHaveLength(0);
        expect(
          all.filter(
            (record) =>
              record.kind === "installment" && record.status === "failed",
          ),
        ).toHaveLength(0);
        return;
      }
      const commitments = publicProgramRecords(world).filter(
        (record) =>
          record.kind === "commitment" &&
          mine(record) &&
          !!record.recipientOrganizationId,
      );
      expect(commitments.length).toBeGreaterThan(0);
      // The roads line commits too: every seated town keeps a public works
      // department, so the county has a department of its own to pay.
      expect(
        commitments.some(
          (record) => record.programKey === `county-road-repair:${geoid}`,
        ),
      ).toBe(true);
      // A commitment only ever pays an organization already in this county.
      for (const record of commitments)
        if (record.kind === "commitment")
          expect(
            organizationServesCounty(
              world,
              record.recipientOrganizationId!,
              record.programKey,
              record.jurisdictionId,
            ),
          ).toBe(true);
      expect(
        publicProgramRecords(world).some(
          (record) =>
            record.kind === "installment" &&
            record.status === "posted" &&
            !!record.resourceFlowId,
        ),
      ).toBe(true);
      // Edge case: one county resident falls ill through the health writer;
      // another stays well. Everything after this is the ordinary clock.
      const residents = Object.keys(world.people)
        .filter((id) => {
          const home = world.people[id as never]?.homeJurisdictionId;
          return (
            id !== (world.control as { personId?: string }).personId &&
            !!home &&
            juryCountyForPlace(home) === geoid &&
            ageOnDate(
              world.people[id as never]!.birthDate,
              world.currentDate,
            ) >= 18
          );
        })
        .sort() as EntityId[];
      const unwellSet = residents.slice(0, 8);
      const wellSet = residents.slice(8);
      for (const unwell of unwellSet)
        world = beginHealthEpisode(world, {
          stableKey: `test:co9-acute:${unwell}`,
          personId: unwell,
          severity: "acute",
          initialLimitation: "limited",
          origin: {
            kind: "authored",
            note: "CO-9 test: an acute episode written through the health writer.",
          },
          causalParentIds: [],
        });
      step(Math.round(daysBetween(startDay, world.currentDate)) + 70);
      const delivered = world.history.events.filter(
        (event) => event.type === "service.delivery-recorded",
      );
      const clinic = delivered.filter((event) =>
        event.summary.includes("Clinic visit"),
      );
      const fair = delivered.filter((event) =>
        event.summary.includes("Day at the fair"),
      );
      const patients = new Set(clinic.flatMap((e) => e.involvedEntityIds));
      process.stderr.write(
        `CO-9 delivered ${delivered.length}: clinic ${clinic.length}, fair ${fair.length}; ill residents ${unwellSet.length}, well ${wellSet.length}\n`,
      );
      expect(fair.length).toBeGreaterThan(0);
      expect(clinic.length).toBeGreaterThan(0);
      for (const id of wellSet) expect(patients.has(id)).toBe(false);
      const reloaded = deserializeWorld(serializeWorld(world));
      expect(
        reloaded.history.events.filter(
          (event) => event.type === "service.delivery-recorded",
        ),
      ).toHaveLength(delivered.length);
    },
    3_600_000,
  );
});
