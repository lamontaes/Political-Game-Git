import { describe, it, expect, vi } from "vitest";
import {
  smallWorld,
  smallWorldPlace,
} from "../../../tests/fixtures/small-world";
import { ensureJurisdiction } from "../../simulation/national-election-geography";
import { STATES } from "../../simulation/state-reference";
import {
  ageOnDate,
  makeIsoDate,
  addDays,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import * as native from "../../simulation/job-market";
import * as payNative from "../../simulation/living-world/town-pay";
import { fillTownJobs } from "../../simulation/living-world/town-employment";
import {
  createCharacterHistoryContextPeople,
  characterHistoryContextPersonId,
} from "../../simulation/character-history";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "../../simulation/life";
import {
  createResourcePosition,
  money,
  createWorkCompensation,
  recordResourceTransferOutcomes,
} from "../../simulation/resources";
import {
  recordWorldEvent,
  writeWithWorldIntegrityOnce,
} from "../../simulation/world";
import { applyLawConsequences } from "../../simulation/enacted-law-effects";
import { ensureLifePathPersonalPosition } from "../../simulation/life-paths2-resources";
import { assessPaychecksTaxes } from "../../simulation/statutory-tax";
import { recordLocalPayrollTaxBases } from "../../simulation/payroll-tax-bases";
import { recordPaycheckTaxBases } from "../../simulation/paycheck-tax-bases";
import { payPaidLeaveClaims } from "../../simulation/paid-leave-benefits";
import { cancelFutureDueItem } from "../../simulation/future-transitions";
import { jobPayFacts } from "./test-support/job-pay-facts";
import { lawPayHost } from "./test-support/law-pay-host";
import * as own from "./job-pay-effects";
import type { World, EntityId, IsoDate } from "../../simulation/types";
function run(
  world: World,
  town: EntityId,
  person: EntityId,
  since: IsoDate,
  mode: "hire" | "first" | "settle",
) {
  const expected =
    mode === "hire"
      ? native.hireAtAdultStart(world, {
          personId: person,
          jurisdictionId: town,
        })
      : mode === "first"
        ? native.payFirstJob(world, person)
        : native.settleJobPay(world, person);
  const initial = jobPayFacts(world, since),
    gen =
      mode === "hire"
        ? own.hireAtAdultStart(initial, {
            personId: person,
            jurisdictionId: town,
          })
        : mode === "first"
          ? own.payFirstJob(initial, person)
          : own.settleJobPay(initial, person);
  let current = world,
    step = gen.next();
  const original = payNative.applyLawPayConsequence,
    adapter = vi
      .spyOn(payNative, "applyLawPayConsequence")
      .mockImplementation((w, input) => lawPayHost(w, input, original));
  try {
    writeWithWorldIntegrityOnce(world, () => {
      while (!step.done) {
        const r = step.value;
        switch (r.kind) {
          case "createWorkRelationship":
            current = createWorkRelationship(current, r.input);
            break;
          case "recordWorkStatus":
            current = recordWorkStatus(current, r.input);
            break;
          case "createWorkCompensation":
            current = createWorkCompensation(current, r.input);
            break;
          case "recordWorldEvent":
            current = recordWorldEvent(current, r.input);
            break;
          case "applyLawConsequences":
            current = applyLawConsequences(current, r.input);
            break;
          case "ensureLifePathPersonalPosition":
            current = ensureLifePathPersonalPosition(current, ...r.input);
            break;
          case "recordResourceTransferOutcomes":
            current = recordResourceTransferOutcomes(current, r.input);
            break;
          case "assessPaychecksTaxes":
            current = assessPaychecksTaxes(current, r.input);
            break;
          case "recordLocalPayrollTaxBases":
            current = recordLocalPayrollTaxBases(current, r.input);
            break;
          case "recordPaycheckTaxBases":
            current = recordPaycheckTaxBases(current, r.input);
            break;
          case "payPaidLeaveClaims":
            current = payPaidLeaveClaims(current, r.input);
            break;
        }
        step = gen.next(jobPayFacts(current, since));
      }
      return current;
    });
  } finally {
    adapter.mockRestore();
  }
  expect(current).toEqual(expected);
  return current;
}
describe.each(Object.keys(STATES))(
  "complete adult/first-job/weekly-pay public owners in US-%s",
  (usps) => {
    it("matches actual town-employer choice, pay drafts, identity/timing, cash/tax order and repeats", () => {
      const f = smallWorld({
        place: "US-" + usps,
        people: 12,
        date: "2026-01-05",
        seed: "rules2:job-pay:" + usps,
      });
      let world = fillTownJobs(
        f.world,
        f.jurisdictionId,
        f.world.personOrder.map((personId) => ({
          personId,
          age: ageOnDate(
            f.world.people[personId]!.birthDate,
            f.world.currentDate,
          ),
          enrolled: false,
          parentOfYoungChild: false,
        })),
        { round: "rules2:job-pay:initial" },
      );
      const input = {
        stableKey: "rules2:adult-candidate",
        givenName: "Canonical",
        familyName: "Applicant",
        birthDate: makeIsoDate("2000-01-01"),
        homeJurisdictionId: f.jurisdictionId,
      };
      world = createCharacterHistoryContextPeople(world, [input]);
      const person = characterHistoryContextPersonId(world, input.stableKey);
      // Actual default corpus behavior is compared first, including the no-employer frontiers in DC/AS/MP. This additional canonical named retail-worker control is applied in every World; it is not ordinary NPC hiring.
      run(world, f.jurisdictionId, person, f.world.currentDate, "hire");
      const reference = smallWorldPlace("US-CO").context.jurisdiction;
      world = ensureJurisdiction(world, reference);
      const referenceTown = reference.id;
      const workerInput = {
        stableKey: "rules2:retail-reference-worker",
        givenName: "Canonical",
        familyName: "Worker",
        birthDate: makeIsoDate("1970-01-01"),
        homeJurisdictionId: referenceTown,
      };
      world = createCharacterHistoryContextPeople(world, [workerInput]);
      const referenceWorker = characterHistoryContextPersonId(
        world,
        workerInput.stableKey,
      );
      world = createOrganization(world, {
        stableKey:
          "town-employment-v1:" + referenceTown + ":employer:retail:99",
        formedAt: world.currentDate,
        provenance: {
          kind: "authored",
          note: "Labeled canonical employer/occupation control across all places",
        },
        initialProfile: {
          name: "Canonical retail employer",
          classification: "enterprise:retail",
          locationJurisdictionId: referenceTown,
        },
      });
      world = createWorkRelationship(world, {
        stableKey: "rules2:retail-reference-work",
        personId: referenceWorker,
        organizationId: world.history.organizations.at(-1)!.id,
        startedAt: world.currentDate,
        kind: "employment:retail",
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: {
          kind: "authored",
          note: "Labeled canonical recorded-worker control",
        },
        initialRole: {
          title: "Cashier",
          occupationClassification: "occupation:cashier",
          locationJurisdictionId: referenceTown,
          timeDemand: {
            expectedWeekly: { minimumHours: 40, maximumHours: 40 },
            attention: "moderate",
            concurrency: "mostly-exclusive",
            scheduleRigidity: "rigid",
            interruptibility: "limited",
            locationJurisdictionId: referenceTown,
          },
        },
      });
      const hired = run(
        world,
        referenceTown,
        person,
        f.world.currentDate,
        "hire",
      );
      expect(
        hired.history.workRelationships.some(
          (w) =>
            w.personId === person &&
            w.stableKey === "adult-start-work-v1:" + person,
        ),
      ).toBe(true);
      run(hired, f.jurisdictionId, person, f.world.currentDate, "hire");
      let later = hired;
      const adult = hired.history.workRelationships.find(
        (w) => w.stableKey === "adult-start-work-v1:" + person,
      )!;
      const payFlow = hired.history.resourceFlows.find(
        (flow) =>
          flow.basisReference.kind === "work" &&
          flow.basisReference.workRelationshipId === adult.id,
      )!;
      if (payFlow.source.kind !== "organization")
        throw Error("Expected canonical employer payer");
      later = createResourcePosition(later, {
        stableKey: "rules2:job-pay:tracked-employer",
        owner: payFlow.source,
        openedAt: later.currentDate,
        openingBalance: money(1000000, "USD"),
        provenance: {
          kind: "authored",
          note: "Labeled canonical tracked employer cash control",
        },
      });
      const date = addDays(later.currentDate, 28);
      for (const item of later.history.futureDueItems)
        if (item.dueAt < date)
          later = cancelFutureDueItem(later, {
            stableKey: item.stableKey + ":rules2-job-clock",
            dueItemId: item.id,
            effectiveAt: later.currentDate,
            reasonKey: "test:job-pay-clock",
            context: "Labeled pay-parent clock, not NPC activity.",
          });
      later = {
        ...later,
        currentDate: date,
        currentMoment: simulationMomentOnLocalDate(later.currentMoment, date),
      };
      const paid = run(
        later,
        f.jurisdictionId,
        person,
        f.world.currentDate,
        "settle",
      );
      expect(
        paid.history.resourceTransferOutcomes.some(
          (row) =>
            row.resourceFlowId === payFlow.id && row.status === "completed",
        ),
      ).toBe(true);
      run(paid, f.jurisdictionId, person, f.world.currentDate, "settle");
      const other = hired.personOrder.find(
        (id) =>
          id !== person &&
          ageOnDate(hired.people[id]!.birthDate, hired.currentDate) >= 18,
      )!;
      const role = hired.history.workRoles.find(
        (r) => r.locationJurisdictionId === f.jurisdictionId,
      )!;
      const first = createWorkRelationship(hired, {
        stableKey: own.LEGACY_FIRST_JOB_WORK_KEY,
        personId: other,
        organizationId: hired.history.organizations.find(
          (o) => o.formedAt <= hired.currentDate,
        )!.id,
        startedAt: hired.currentDate,
        kind: "employment:staff",
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: {
          kind: "authored",
          note: "Labeled canonical legacy first-job control",
        },
        initialRole: {
          title: "First job",
          occupationClassification: role.occupationClassification,
          locationJurisdictionId: f.jurisdictionId,
          timeDemand: role.timeDemand,
        },
      });
      const firstPaid = run(
        first,
        f.jurisdictionId,
        other,
        f.world.currentDate,
        "first",
      );
      expect(firstPaid.history.resourceFlows.length).toBeGreaterThan(
        first.history.resourceFlows.length,
      );
      run(firstPaid, f.jurisdictionId, other, f.world.currentDate, "first");
      run(firstPaid, f.jurisdictionId, other, f.world.currentDate, "settle");
    }, 120000);
  },
);
