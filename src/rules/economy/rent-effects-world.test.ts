import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  ageOnDate,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import * as life from "../../simulation/life";
import * as resources from "../../simulation/resources";
import * as native from "../../simulation/living-world/town-rent";
import * as own from "./rent-effects";
import { rentEffectFacts } from "./test-support/rent-effect-facts";
import { executeRent } from "./test-support/rent-effect-host";
import type { World, EntityId } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Canonical tenure/occupancy/pay/cash and due-date controls, not ordinary NPC rental or eviction outcomes.",
};
const dates = ["2026-01-05", "2026-02-01", "2026-03-01", "2027-01-05"].map(
  makeIsoDate,
);
function onDate(world: World, currentDate: World["currentDate"]): World {
  return {
    ...world,
    currentDate,
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      currentDate,
    ),
  };
}
function read(world: World, town: EntityId) {
  const facts = rentEffectFacts(world, dates);
  for (const date of dates) {
    expect(own.townRentSnapshot(facts, town, date)).toEqual(
      native.townRentSnapshot(world, town, date),
    );
    for (const id of world.personOrder)
      expect(own.canPayRentOwed(facts, id, date)).toBe(
        native.canPayRentOwed(world, id, date),
      );
  }
  return facts;
}
function start(world: World, dueOn: World["currentDate"], only?: EntityId) {
  const expected = native.startTownLeases(world, dueOn, only);
  return executeRent(
    world,
    expected,
    own.startTownLeases(rentEffectFacts(world, dates), dueOn, only),
    dates,
  ).world;
}
function pay(world: World, date: World["currentDate"]) {
  return executeRent(
    world,
    native.payTownRent(world, date),
    own.payTownRent(rentEffectFacts(world, dates), date),
    dates,
  ).world;
}
function renew(world: World, date: World["currentDate"]) {
  return executeRent(
    world,
    native.renewTownLeases(world, date),
    own.renewTownLeases(rentEffectFacts(world, dates), date),
    dates,
  ).world;
}
describe("complete rental lease/landlord/renewal/payment/arrears/move and decision public parents across all 56 Native Worlds", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 12,
          household: true,
          date: "2026-01-05",
          seed: "rules2:economy:rent-effects:" + usps,
        });
        let base = fixture.world;
        const householdId = base.history.householdMemberships[0]!.householdId;
        const members = base.history.householdMemberships
          .filter((row) => row.householdId === householdId)
          .map((row) => row.personId);
        const tenant = members.find(
          (id) => ageOnDate(base.people[id]!.birthDate, base.currentDate) >= 18,
        )!;
        expect(tenant).toBeDefined();
        read(base, fixture.jurisdictionId);
        start(base, base.currentDate);
        pay(base, base.currentDate);
        renew(base, base.currentDate);
        base = life.createOrganization(base, {
          stableKey: "rules2:rent-effects:employer",
          formedAt: base.currentDate,
          provenance,
          initialProfile: {
            name: "Saved pay-source employer",
            classification: "enterprise:retail",
            locationJurisdictionId: fixture.jurisdictionId,
          },
        });
        const organizationId = base.history.organizations.at(-1)!.id;
        base = resources.createResourceFlow(base, {
          stableKey: "rules2:rent-effects:pay",
          source: { kind: "organization", organizationId },
          recipient: { kind: "person", personId: tenant },
          startsAt: base.currentDate,
          amount: resources.money(75000, "USD"),
          cadenceKind: "schedule:weekly",
          basisKind: "compensation:work",
          basisReference: { kind: "general" },
          restrictionKind: null,
          jurisdictionId: fixture.jurisdictionId,
          provenance,
        });
        base = resources.createDwelling(base, {
          stableKey: "rules2:rent-effects:home",
          establishedAt: base.currentDate,
          jurisdictionId: fixture.jurisdictionId,
          classification: "residential:apartment",
          locationLabel: "Saved rental home",
          provenance,
        });
        const dwellingId = base.history.dwellings.at(-1)!.id;
        base = resources.createHousingTenure(base, {
          stableKey: "rules2:rent-effects:tenure",
          holder: { kind: "household", householdId },
          dwellingId,
          startedAt: base.currentDate,
          kind: "lease:rented",
          context: "Saved rental control.",
          provenance,
        });
        base = resources.startDwellingOccupancy(base, {
          stableKey: "rules2:rent-effects:occupancy",
          occupant: { kind: "household", householdId },
          dwellingId,
          startedAt: base.currentDate,
          residenceRole: "primary",
          kind: "residence:tenant",
          provenance,
        });
        for (const stock of [undefined, 0, 1000000]) {
          let world = base;
          if (stock !== undefined)
            world = resources.createResourcePosition(world, {
              stableKey: "rules2:rent-effects:tenant-cash",
              owner: { kind: "person", personId: tenant },
              openingBalance: resources.money(stock, "USD"),
              openedAt: world.currentDate,
              provenance,
            });
          world = start(world, world.currentDate, householdId);
          expect(native.townLeases(world).length).toBeGreaterThan(0);
          start(world, world.currentDate);
          read(world, fixture.jurisdictionId);
          for (const date of dates.slice(1, 3)) {
            world = onDate(world, date);
            world = pay(world, date);
            pay(world, date);
            read(world, fixture.jurisdictionId);
          }
          const lease = native.townLeases(world).find((row) => !row.ended)!;
          if (stock === 0) {
            world = resources.createResourcePosition(world, {
              stableKey: "rules2:rent-effects:provider-cash",
              owner: { kind: "organization", organizationId },
              openingBalance: resources.money(1000000, "USD"),
              openedAt: world.currentDate,
              provenance,
            });
            world = resources.createResourceFlow(world, {
              stableKey: "rules2:rent-effects:grant",
              source: { kind: "organization", organizationId },
              recipient: { kind: "person", personId: lease.leaseholderId },
              startsAt: world.currentDate,
              amount: resources.money(1000000, "USD"),
              cadenceKind: "schedule:monthly",
              basisKind: "custom:control-transfer",
              basisReference: { kind: "general" },
              restrictionKind: null,
              jurisdictionId: fixture.jurisdictionId,
              provenance,
            });
            const flow = world.history.resourceFlows.at(-1)!;
            world = resources.recordResourceTransferOutcome(world, {
              stableKey: "rules2:rent-effects:grant:paid",
              resourceFlowId: flow.id,
              periodStartsAt: world.currentDate,
              periodEndsAt: world.currentDate,
              occurredAt: world.currentDate,
              attemptedAmount: resources.money(1000000, "USD"),
              transferredAmount: resources.money(1000000, "USD"),
              status: "completed",
              reasonKind: null,
              note: "Recorded cash recovery control.",
              provenance,
            });
            read(world, fixture.jurisdictionId);
            world = executeRent(
              world,
              native.payRentOwed(world, lease.leaseholderId),
              own.payRentOwed(
                rentEffectFacts(world, dates),
                lease.leaseholderId,
              ),
              dates,
            ).world;
            read(world, fixture.jurisdictionId);
          }
          const year = onDate(world, dates[3]!);
          renew(year, year.currentDate);
          const moved = executeRent(
            world,
            native.moveOutBeforeHearing(world, lease.leaseholderId),
            own.moveOutBeforeHearing(
              rentEffectFacts(world, dates),
              lease.leaseholderId,
            ),
            dates,
          ).world;
          expect(native.townLeases(moved).every((row) => row.ended)).toBe(true);
          start(moved, moved.currentDate);
          read(moved, fixture.jurisdictionId);
        }
        // Explicit raw case inputs derived from the recorded household and varying court/answer/plan controls; no saved judgment or seated-judge claim.
        for (const monthsBehind of [0, 1, 2, 3, 6])
          for (const landlordPursues of [false, true])
            for (const tenantAnswers of [false, true])
              for (const lawyer of [null, "Raw counsel control"])
                for (const planCarried of [null, false, true])
                  for (const judgeLean of [null, -1, 0, 1] as const) {
                    const facts = {
                      judicialAuthority: undefined,
                      monthsBehind,
                      landlordPursues,
                      tenantAnswers,
                      lawyer,
                      planCarried,
                      judgeLean,
                      court: "Raw court label",
                    };
                    const actual = own.decideEvictionCase(facts),
                      expected = native.decideEvictionCase(facts);
                    expect(actual.outcome).toBe(expected.outcome);
                    expect(actual.reason(facts.court)).toBe(
                      expected.reason(facts.court),
                    );
                  }
      },
      60000,
    );
});
