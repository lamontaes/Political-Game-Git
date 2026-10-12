import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../../simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
} from "../../simulation/macro-economy/producer";
import * as life from "../../simulation/life";
import * as resources from "../../simulation/resources";
import {
  readOpeningEmployerCashEstimate as nativeRead,
  ensureEmployerCashPositions as nativeEnsure,
} from "../../simulation/opening-employer-cash";
import {
  ensureEmployerCashPositions,
  readOpeningEmployerCashEstimate,
} from "./town-finance-books";
import { financeFacts } from "./test-support/finance-facts";
import { execute } from "./test-support/finance-host";
import type { World, EntityId } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Canonical payroll/comparable stock edge controls, not ordinary NPC opening cash or payments.",
};
function compare(
  world: World,
  phase: "opening" | "later",
  only?: ReadonlySet<EntityId>,
) {
  const native = nativeEnsure(world, phase, only);
  const run = execute(
    world,
    ensureEmployerCashPositions(financeFacts(world), phase, only),
  );
  const actual =
    run.result.townFinances === undefined
      ? run.world
      : { ...run.world, townFinances: run.result.townFinances };
  expect(actual).toEqual(native);
  return actual;
}
describe("full employer opening stock/public estimate/ordered opening-book parents across all 56 Native Worlds", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 12,
          date: "2026-01-05",
          seed: "rules2:economy:employer-opening-cash:" + usps,
        });
        let world = ensureWorldStartingConditions(fixture.world, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        });
        world = ensureMacroEconomyStarted(
          world,
          macroStartForHistory(macroStartingConditions(world)),
        );
        compare(world, "opening");
        compare(world, "later");
        const employers: EntityId[] = [];
        for (const [index, cadence] of (
          [
            "schedule:weekly",
            "schedule:biweekly",
            "schedule:semimonthly",
            "schedule:monthly",
            "work:completed-shift",
          ] as const
        ).entries()) {
          world = life.createOrganization(world, {
            stableKey: `town-employment-v1:${fixture.jurisdictionId}:employer:retail:${index}`,
            formedAt: world.currentDate,
            provenance,
            initialProfile: {
              name: "Saved employer " + index,
              classification: "enterprise:retail",
              locationJurisdictionId: fixture.jurisdictionId,
            },
          });
          const organizationId = world.history.organizations.at(-1)!.id;
          employers.push(organizationId);
          const personId = world.personOrder[index]!;
          world = life.createWorkRelationship(world, {
            stableKey: "rules2:employer:work:" + index,
            personId,
            organizationId,
            startedAt: world.currentDate,
            kind:
              index === 4
                ? "employment:life-paths2-shop-assistant"
                : "employment:staff",
            compensation: "paid",
            authority: "directed",
            dependency: "dependent",
            economicRisk: "organization-borne",
            provenance,
            initialRole: {
              title: "Saved clerk",
              occupationClassification: "occupation:office-clerk",
              locationJurisdictionId: fixture.jurisdictionId,
              timeDemand: {
                expectedWeekly: { minimumHours: 20, maximumHours: 40 },
                attention: "high",
                concurrency: "mostly-exclusive",
                scheduleRigidity: "mixed",
                interruptibility: "limited",
                locationJurisdictionId: fixture.jurisdictionId,
              },
            },
          });
          const work = world.history.workRelationships.at(-1)!;
          world = resources.createResourceFlow(world, {
            stableKey: "rules2:employer:pay:" + index,
            source: { kind: "organization", organizationId },
            recipient: { kind: "person", personId },
            startsAt: world.currentDate,
            amount: resources.money(index === 4 ? 10000 : 200000, "USD"),
            cadenceKind: cadence,
            basisKind: "compensation:work",
            basisReference: { kind: "work", workRelationshipId: work.id },
            restrictionKind: null,
            jurisdictionId: fixture.jurisdictionId,
            provenance,
          });
        }
        const USD = resources.makeCurrencyCode("USD");
        for (const id of employers)
          expect(
            readOpeningEmployerCashEstimate(financeFacts(world), id, USD),
          ).toEqual(nativeRead(world, id, USD));
        const only = new Set([employers[0]!]);
        const first = compare(world, "opening", only);
        expect(
          first.history.resourcePositions.some(
            (row) =>
              row.owner.kind === "organization" &&
              row.owner.organizationId === employers[0],
          ),
        ).toBe(true);
        compare(first, "opening", only);
        compare(world, "later");
        const complete = compare(world, "opening");
        expect(
          complete.history.resourcePositions.filter(
            (row) =>
              row.owner.kind === "organization" &&
              employers.includes(row.owner.organizationId),
          ),
        ).toHaveLength(employers.length);
        compare(complete, "opening");
        let donor = world;
        for (const [index, id] of employers.slice(0, 2).entries())
          donor = resources.createResourcePosition(donor, {
            stableKey: "rules2:employer:donor:" + index,
            owner: { kind: "organization", organizationId: id },
            openedAt: donor.currentDate,
            openingBalance: resources.money((index + 1) * 1000000, "USD"),
            provenance,
          });
        for (const id of employers)
          expect(
            readOpeningEmployerCashEstimate(financeFacts(donor), id, USD),
          ).toEqual(nativeRead(donor, id, USD));
        const later = compare(donor, "later");
        expect(
          later.history.resourcePositions.filter(
            (row) =>
              row.owner.kind === "organization" &&
              employers.includes(row.owner.organizationId),
          ),
        ).toHaveLength(employers.length);
        compare(later, "later");
      },
      60000,
    );
});
