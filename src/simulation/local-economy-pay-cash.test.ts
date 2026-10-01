import { expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";
import { TOWN_EMPLOYMENT_VERSION } from "./living-world/town-employment";
import {
  BUSINESS_REVENUE_BASIS,
  BUSINESS_WAGES_BASIS,
  settleBusinessMoney,
} from "./local-economy";
import { personName } from "./people";
import { resourcePositionAt } from "./resource-queries";
import { createResourceFlow, createResourcePosition, money } from "./resources";
import { SeededRng } from "./rng";
import { serializeWorld, deserializeWorld } from "./serialization";
import { PLACE_POPULATION_ROWS } from "./nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "./territory-places";
import { withWorldIntegrityDeferred } from "./world";
import type { EntityId, World, WorkRelationship } from "./types";

const places = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, count] = pair.split(":") as [string, string];
  if ((places.get(key.slice(0, 2))?.[1] ?? -1) < Number(count))
    places.set(key.slice(0, 2), [key, Number(count)]);
}
places.set("15", ["1571550", 0]);
places.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!places.has(usps)) places.set(usps, [key, 0]);
expect(places.size).toBe(56);
const pool = [...places.values()].map(([key]) => key);
const rng = new SeededRng("pay-kind-five-places");
const sampled = Array.from(
  { length: 5 },
  () => pool.splice(rng.integer(0, pool.length - 1), 1)[0]!,
);

it.each(sampled)(
  "allocates recorded staff cash at controlled month contexts in %s, including ordered receipts, shortfalls and reload",
  (placeKey) => {
    const seed = `pay-cash:${placeKey}`;
    let world = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey,
        seed,
        startAge: 30,
        questionnaire: "skipped",
      }),
    ).game!.world;
    const staff = new Map<EntityId, WorkRelationship[]>();
    for (const work of world.history.workRelationships) {
      if (
        !work.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) ||
        !work.organizationId ||
        work.compensation !== "paid"
      )
        continue;
      const rows = staff.get(work.organizationId) ?? [];
      rows.push(work);
      staff.set(work.organizationId, rows);
    }
    const [employerId, workers] = [...staff.entries()].find(
      ([organizationId, rows]) =>
        rows.length >= 2 &&
        !resourcePositionAt(
          world,
          { kind: "organization", organizationId },
          money(0, "USD").currency,
        ),
    )!;
    expect(workers).toBeDefined();
    const employees = workers.slice(0, 2);
    const customerId = world.personOrder.find(
      (id) =>
        !employees.some((work) => work.personId === id) &&
        !resourcePositionAt(
          world,
          { kind: "person", personId: id },
          money(0, "USD").currency,
        ),
    )!;
    const employer = {
      kind: "organization" as const,
      organizationId: employerId,
    };
    const provenance = {
      kind: "authored" as const,
      note: "Explicit recorded cash/revenue/wage controls on actual named staff; not population wealth or ordinary business revenue.",
    };
    for (const work of employees)
      if (
        !resourcePositionAt(
          world,
          { kind: "person", personId: work.personId },
          money(0, "USD").currency,
        )
      )
        world = createResourcePosition(world, {
          stableKey: `fixture:pay-cash:employee:${work.personId}`,
          owner: { kind: "person", personId: work.personId },
          openedAt: world.currentDate,
          openingBalance: money(0, "USD"),
          provenance,
        });
    if (
      !resourcePositionAt(
        world,
        { kind: "person", personId: customerId },
        money(0, "USD").currency,
      )
    )
      world = createResourcePosition(world, {
        stableKey: "fixture:pay-cash:customer",
        owner: { kind: "person", personId: customerId },
        openedAt: world.currentDate,
        openingBalance: money(20_000, "USD"),
        provenance,
      });
    const baselineEmployer = resourcePositionAt(
      world,
      employer,
      money(0, "USD").currency,
    );
    expect(
      baselineEmployer,
      "the control uses an employer without fabricated opening cash",
    ).toBeUndefined();
    const startsAt = world.currentDate;
    const jurisdictionId =
      world.people[employees[0]!.personId]!.homeJurisdictionId;
    world = createResourceFlow(world, {
      stableKey: "fixture:pay-cash:revenue",
      source: { kind: "person", personId: customerId },
      recipient: employer,
      startsAt,
      amount: money(2_000, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: BUSINESS_REVENUE_BASIS,
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId,
      provenance,
    });
    const revenueId = world.history.resourceFlows.at(-1)!.id;
    const wageIds: EntityId[] = [];
    for (const work of employees) {
      world = createResourceFlow(world, {
        stableKey: `fixture:pay-cash:wages:${work.id}`,
        source: employer,
        recipient: { kind: "person", personId: work.personId },
        startsAt,
        amount: money(4_000, "USD"),
        cadenceKind: "schedule:monthly",
        basisKind: BUSINESS_WAGES_BASIS,
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId,
        provenance,
      });
      wageIds.push(world.history.resourceFlows.at(-1)!.id);
    }
    const opening = world;
    const dueOn = makeIsoDate("2026-03-01");
    expect(startsAt).toBe(makeIsoDate("2026-01-05"));
    world = createResourcePosition(world, {
      stableKey: "fixture:pay-cash:employer",
      owner: employer,
      openedAt: startsAt,
      openingBalance: money(5_000, "USD"),
      provenance,
    });
    const move = (start: World): World => {
      const paused = withWorldIntegrityDeferred(() => {
        let next = start;
        for (const due of start.history.futureDueItems) {
          const state = futureDueItemStateAt(start, due.id, {
            asOfDate: start.currentDate,
            historySequenceExclusive: start.history.nextSequence,
          });
          if (state?.status === "scheduled" && due.dueAt <= dueOn)
            next = cancelFutureDueItem(next, {
              stableKey: `fixture:pay-cash:clock:${due.id}`,
              dueItemId: due.id,
              effectiveAt: startsAt,
              reasonKey: "fixture:focused-payroll",
              context:
                "Controlled month boundaries, not ordinary-calendar acceptance.",
            });
        }
        return {
          ...next,
          currentDate: dueOn,
          currentMoment: simulationMomentOnLocalDate(next.currentMoment, dueOn),
        };
      });
      return paused;
    };
    const before = move(world);
    const paid = settleBusinessMoney(before, employerId);
    const outcomes = paid.history.resourceTransferOutcomes.filter((entry) =>
      wageIds.includes(entry.resourceFlowId),
    );
    expect(outcomes.map((entry) => entry.transferredAmount.minorUnits)).toEqual(
      [4_000, 3_000, 2_000, 0],
    );
    expect(outcomes.map((entry) => entry.status)).toEqual([
      "completed",
      "partial",
      "partial",
      "blocked",
    ]);
    expect(outcomes.map((entry) => entry.attemptedAmount.minorUnits)).toEqual([
      4_000, 4_000, 4_000, 4_000,
    ]);
    const revenue = paid.history.resourceTransferOutcomes.filter(
      (entry) => entry.resourceFlowId === revenueId,
    );
    expect(revenue.map((entry) => entry.transferredAmount.minorUnits)).toEqual([
      2_000, 2_000,
    ]);
    expect(
      resourcePositionAt(paid, employer, money(0, "USD").currency)!
        .liquidBalance.minorUnits,
    ).toBe(0);
    for (const month of [makeIsoDate("2026-02-01"), dueOn]) {
      const rows = paid.history.resourceTransferOutcomes.filter(
        (entry) =>
          entry.occurredAt === month &&
          (entry.resourceFlowId === revenueId ||
            wageIds.includes(entry.resourceFlowId)),
      );
      expect(rows[0]!.resourceFlowId).toBe(revenueId);
    }
    expect(settleBusinessMoney(paid, employerId)).toBe(paid);
    expect(
      settleBusinessMoney(
        {
          ...before,
          control: { kind: "person", personId: employees[0]!.personId },
        },
        employerId,
      ).history,
    ).toEqual(paid.history);
    expect(
      serializeWorld(
        settleBusinessMoney(
          deserializeWorld(serializeWorld(before)),
          employerId,
        ),
      ),
    ).toBe(serializeWorld(paid));
    const unknown = settleBusinessMoney(move(opening), employerId);
    const unpaid = unknown.history.resourceTransferOutcomes.filter((entry) =>
      wageIds.includes(entry.resourceFlowId),
    );
    expect(unpaid).toHaveLength(4);
    expect(
      unpaid.every(
        (entry) =>
          entry.status === "blocked" &&
          entry.transferredAmount.minorUnits === 0 &&
          entry.reasonKind === "capacity:unrecorded-employer-cash",
      ),
    ).toBe(true);
    expect(
      resourcePositionAt(unknown, employer, money(0, "USD").currency),
    ).toBeUndefined();
    console.info(
      JSON.stringify({
        seed,
        placeKey,
        employerId,
        names: employees.map((work) => personName(paid.people[work.personId]!)),
        wageMinor: outcomes.map((entry) => entry.transferredAmount.minorUnits),
        cashMinor: 0,
      }),
    );
  },
);
