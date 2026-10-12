import { describe, it, expect, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentOnLocalDate,
  ageOnDate,
  addDays,
} from "../../simulation/dates";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../../simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
  createMacroMonthlyStepHandler,
  MACRO_MONTHLY_STEP_KEY,
} from "../../simulation/macro-economy/producer";
import * as life from "../../simulation/life";
import * as resources from "../../simulation/resources";
import { recordWorldEvent } from "../../simulation/world";
import { setFutureDueItemTerminalState } from "../../simulation/future-transitions";
import { recordTownJobLoss } from "../../simulation/living-world/town-labor-market";
import * as nativeLabor from "../../simulation/living-world/town-labor-market";
import * as native from "../../simulation/living-world/town-finances";
import * as own from "./town-finance-books";
import { financeFacts } from "./test-support/finance-facts";
import type { World, EntityId } from "../../simulation/types";
import type { FinanceFacts, FinanceEffectRequest } from "./town-finance-books";
const provenance = {
  kind: "authored" as const,
  note: "Explicit canonical employer/pay/book edge controls, not ordinary NPC business outcomes.",
};
function execute<T>(
  world: World,
  gen: Generator<FinanceEffectRequest, T, FinanceFacts>,
  observed: FinanceEffectRequest[] = [],
) {
  let step = gen.next(),
    current = world;
  while (!step.done) {
    const request = step.value;
    observed.push(request);
    if (request.books !== undefined)
      current = { ...current, townFinances: request.books };
    switch (request.kind) {
      case "createResourcePosition":
        current = resources.createResourcePosition(current, request.input);
        break;
      case "createOrganization":
        current = life.createOrganization(current, request.input);
        break;
      case "recordOrganizationProfile":
        current = life.recordOrganizationProfile(current, request.input);
        break;
      case "recordTownJobLoss":
        current = recordTownJobLoss(current, request.input);
        break;
      case "recordWorldEvent":
        current = recordWorldEvent(current, request.input);
        break;
      case "createResourceFlow":
        current = resources.createResourceFlow(current, request.input);
        break;
      case "recordResourceTransferOutcome":
        current = resources.recordResourceTransferOutcome(
          current,
          request.input,
        );
        break;
    }
    step = gen.next(financeFacts(current));
  }
  return { world: current, result: step.value };
}
function compareBankJobFailure(
  world: World,
  town: EntityId,
  businesses: Parameters<typeof native.stepTownFinances>[2],
) {
  const seen: FinanceEffectRequest[] = [];
  const profileWriter = life.recordOrganizationProfile;
  const jobWriter = nativeLabor.recordTownJobLoss;
  const profileSpy = vi
    .spyOn(life, "recordOrganizationProfile")
    .mockImplementation((current, input) => {
      seen.push({
        kind: "recordOrganizationProfile",
        input,
        books: current.townFinances,
      });
      return profileWriter(current, input);
    });
  const jobSpy = vi
    .spyOn(nativeLabor, "recordTownJobLoss")
    .mockImplementation((current, input) => {
      seen.push({
        kind: "recordTownJobLoss",
        input,
        books: current.townFinances,
      });
      return jobWriter(current, input);
    });
  let nativeError: unknown;
  try {
    native.stepTownFinances(
      world,
      town,
      businesses,
      new Set(),
      "bank-job-reason",
    );
  } catch (error) {
    nativeError = error;
  } finally {
    profileSpy.mockRestore();
    jobSpy.mockRestore();
  }
  expect(nativeError).toBeInstanceOf(Error);
  expect((nativeError as Error).message).toBe(
    "A job loss ends a job by layoff or closing.",
  );
  const ownSeen: FinanceEffectRequest[] = [];
  let ownError: unknown;
  try {
    execute(
      world,
      own.stepTownFinances(
        financeFacts(world),
        town,
        businesses,
        new Set(),
        "bank-job-reason",
      ),
      ownSeen,
    );
  } catch (error) {
    ownError = error;
  }
  expect(ownError).toBeInstanceOf(Error);
  expect((ownError as Error).message).toBe((nativeError as Error).message);
  expect(ownSeen).toEqual(seen);
  expect(seen.at(-1)?.kind).toBe("recordTownJobLoss");
}
function compare(
  world: World,
  town: EntityId,
  businesses: Parameters<typeof native.stepTownFinances>[2],
  round: string,
) {
  const nativeQuarter = native.stepTownFinances(
    world,
    town,
    businesses,
    new Set(),
    round,
  );
  const run = execute(
    world,
    own.stepTownFinances(
      financeFacts(world),
      town,
      businesses,
      new Set(),
      round,
    ),
  );
  const actual = { ...run.world, townFinances: run.result.facts.townFinances };
  expect(run.result.closing).toEqual(nativeQuarter.closing);
  expect(actual).toEqual(nativeQuarter.world);
  const nativeClosed = native.closeBusinessesOutOfCash(
    nativeQuarter.world,
    town,
    nativeQuarter.closing,
    "rules2:finance:close:" + round,
  );
  const closed = execute(
    actual,
    own.closeBusinessesOutOfCash(
      financeFacts(actual),
      town,
      run.result.closing,
      "rules2:finance:close:" + round,
    ),
  );
  const final = { ...closed.world, townFinances: closed.result.townFinances };
  expect(final).toEqual(nativeClosed);
  return final;
}
describe("full business/bank quarterly book and ordered effects Native public parents across all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 12,
          date: "2026-01-01",
          seed: "rules2:economy:town-finance-books:" + usps,
        });
        let world = fixture.world;
        const town = fixture.jurisdictionId;
        expect(own.townDepositsPerResident(financeFacts(world), town)).toBe(
          native.townDepositsPerResident(world, town),
        );
        compare(world, town, [], "absent-macro");
        world = ensureWorldStartingConditions(world, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        });
        world = ensureMacroEconomyStarted(
          world,
          macroStartForHistory(macroStartingConditions(world)),
        );
        const adults = world.personOrder.filter(
          (id) =>
            ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
        );
        expect(adults.length).toBeGreaterThan(0);
        const businesses: {
          organizationId: EntityId;
          kind: string;
          newcomer: boolean;
        }[] = [];
        const employers: EntityId[] = [];
        for (const [index, kind] of [
          "retail",
          "retail",
          "restaurant",
          "bank",
        ].entries()) {
          world = life.createOrganization(world, {
            stableKey: `town-employment-v1:${town}:employer:${kind}:${index}`,
            formedAt: addDays(world.currentDate, -1),
            provenance,
            initialProfile: {
              name: "Saved finance " + kind + " " + index,
              classification:
                kind === "bank" ? "enterprise:bank" : "enterprise:retail",
              locationJurisdictionId: town,
            },
          });
          const organizationId = world.history.organizations.at(-1)!.id;
          employers.push(organizationId);
          if (kind !== "bank")
            businesses.push({ organizationId, kind, newcomer: index === 1 });
          const personId = adults[index % adults.length]!;
          world = life.createWorkRelationship(world, {
            stableKey: `town-employment-v1:${town}:job:${kind}:saved:${index}`,
            personId,
            organizationId,
            startedAt: world.currentDate,
            kind: "employment:staff",
            compensation: "paid",
            authority: "directed",
            dependency: "dependent",
            economicRisk: "organization-borne",
            provenance,
            initialRole: {
              title: "Saved paid clerk",
              occupationClassification: "occupation:office-clerk",
              locationJurisdictionId: town,
              timeDemand: {
                expectedWeekly: { minimumHours: 40, maximumHours: 40 },
                attention: "high",
                concurrency: "mostly-exclusive",
                scheduleRigidity: "mixed",
                interruptibility: "limited",
                locationJurisdictionId: town,
              },
            },
          });
          world = resources.createResourceFlow(world, {
            stableKey: `rules2:finance:pay:${index}`,
            source: { kind: "organization", organizationId },
            recipient: { kind: "person", personId },
            startsAt: world.currentDate,
            amount: resources.money(200000, "USD"),
            cadenceKind: "schedule:town-monthly",
            basisKind: "compensation:work",
            basisReference: { kind: "general" },
            restrictionKind: null,
            jurisdictionId: town,
            provenance,
          });
        }
        for (const [month, end] of [
          ["2026-01", "2026-01-31"],
          ["2026-02", "2026-02-28"],
          ["2026-03", "2026-03-31"],
        ] as const) {
          const due = world.history.futureDueItems.find(
            (row) =>
              row.transitionKey === MACRO_MONTHLY_STEP_KEY &&
              row.stableKey.endsWith(month),
          )!;
          const incoming = {
            ...world,
            currentDate: due.dueAt,
            currentMoment: simulationMomentOnLocalDate(
              world.currentMoment,
              due.dueAt,
            ),
          };
          const result = createMacroMonthlyStepHandler([
            {
              key: "rules2:finance:source-intake",
              origins: () => [],
              ends: () => [],
            },
          ])(incoming, due);
          world = setFutureDueItemTerminalState(result.world, {
            stableKey: `${due.stableKey}:state:${result.status}:${due.dueAt}`,
            dueItemId: due.id,
            effectiveAt: due.dueAt,
            status: result.status,
            reasonKey: result.reasonKey,
            context: result.context,
            outcomeEventId: result.outcomeEventId,
          });
          for (const flow of world.history.resourceFlows.filter((row) =>
            row.stableKey.startsWith("rules2:finance:pay:"),
          ))
            world = resources.recordResourceTransferOutcome(world, {
              stableKey: flow.stableKey + ":" + month,
              resourceFlowId: flow.id,
              periodStartsAt: makeIsoDate(month + "-01"),
              periodEndsAt: makeIsoDate(end),
              occurredAt: makeIsoDate(end),
              attemptedAmount: world.history.resourceFlowTerms.find(
                (row) => row.resourceFlowId === flow.id,
              )!.amount,
              transferredAmount: world.history.resourceFlowTerms.find(
                (row) => row.resourceFlowId === flow.id,
              )!.amount,
              status: "completed",
              reasonKind: null,
              note: "Explicit saved monthly pay control.",
              provenance,
            });
        }
        const opened = compare(world, town, businesses, "first");
        expect(Object.keys(opened.townFinances!.businesses)).toHaveLength(3);
        expect(Object.keys(opened.townFinances!.banks)).toHaveLength(1);
        compare(opened, town, businesses, "first");
        compare(opened, town, businesses, "second");
        // Read-only capital/cash/debt/book controls over actual saved bank, worker, pay and market sources; not ordinary failures or NPC spending.
        for (const stress of [0, 1, 2]) {
          const store = opened.townFinances!;
          const books = Object.fromEntries(
            Object.entries(store.businesses).map(([id, row]) => [
              id,
              {
                ...row,
                cash: stress === 0 ? row.cash : -1000000,
                debt: stress === 2 ? row.lineLimit : 0,
                lineLimit: stress === 1 ? 0 : row.lineLimit,
              },
            ]),
          );
          const banks = Object.fromEntries(
            Object.entries(store.banks).map(([id, row]) => [
              id,
              {
                ...row,
                capital: stress === 0 ? -1000000 : row.capital,
                liquid: stress === 2 ? 0 : row.liquid,
              },
            ]),
          );
          let control: World = {
            ...opened,
            townFinances: { ...store, businesses: books, banks },
          };
          if (stress === 0) {
            compareBankJobFailure(control, town, businesses);
          }
          const bankId = employers.at(-1)!;
          const work = control.history.workRelationships.find(
            (row) => row.organizationId === bankId,
          )!;
          const status = control.history.workStatuses
            .filter((row) => row.workRelationshipId === work.id)
            .at(-1)!;
          control = life.recordWorkStatus(control, {
            stableKey: "rules2:finance:bank-no-active-staff",
            workRelationshipId: work.id,
            effectiveAt: control.currentDate,
            status: "ended",
            reason: "labor:retired",
            supersedesStatusId: status.id,
            provenance,
          });
          compare(control, town, businesses, "stress:" + stress);
        }
      },
      60000,
    );
});
