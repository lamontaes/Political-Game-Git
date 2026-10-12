import * as places from "../../simulation/life-places";
import {
  createEducationEnrollment,
  recordEducationEnrollmentState,
} from "../../simulation/life";
import { ensureWorldStartingConditions } from "../../simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import { describe, it, expect, vi } from "vitest";
import {
  smallWorld,
  smallWorldPlace,
} from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { ageOnDate } from "../../simulation/dates";
import {
  createOrganization,
  createWorkRelationships,
} from "../../simulation/life";
import { ensureLocalGovernmentOrganization } from "../../simulation/nationwide-world/local-governments";
import * as native from "../../simulation/public-budgets/staffing";
import * as nativeEmployment from "../../simulation/living-world/town-employment";
import { recordTownJobLoss } from "../../simulation/living-world/town-labor-market";
import { withOpenedBudgets } from "../../simulation/public-budgets";
import {
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetStore,
} from "../../simulation/public-budgets/store";
import { macroStartingConditions } from "../../simulation/world-setup/conditions";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
} from "../../simulation/macro-economy";
import * as own from "./public-staffing";
import { staffingFacts } from "./test-support/staffing-facts";
import type { World, EntityId } from "../../simulation/types";
function run(world: World, town: EntityId, round: string) {
  const expected = native.staffPublicJobs(world, town, null, round),
    generator = own.staffPublicJobs(
      staffingFacts(world, town),
      town,
      null,
      round,
    );
  let current = world,
    step = generator.next();
  while (!step.done) {
    const request = step.value;
    switch (request.kind) {
      case "recordTownJobLoss":
        current = recordTownJobLoss(current, request.input);
        break;
      case "createOrganization":
        current = createOrganization(current, request.input);
        break;
      case "createWorkRelationships":
        current = createWorkRelationships(current, request.input);
        break;
      case "ensureLocalGovernmentOrganization":
        current = ensureLocalGovernmentOrganization(current, request.input);
        break;
      case "recordStaffingBaseline": {
        const rows = expected.publicBudgets!.staffing!,
          index = (current.publicBudgets!.staffing ?? []).length;
        expect(request.row).toEqual(rows[index]);
        expect(current.publicBudgets!.staffing ?? []).toEqual(
          rows.slice(0, index),
        );
        current = {
          ...current,
          publicBudgets: {
            ...current.publicBudgets!,
            staffing: rows.slice(0, index + 1),
          },
        };
        break;
      }
    }
    step = generator.next(staffingFacts(current, town));
  }
  expect(current).toEqual(expected);
  expect(step.value).toEqual(staffingFacts(current, town));
  for (const program of own.STAFFED_PROGRAMS) {
    expect(
      own.fundedStaff(staffingFacts(current, town), town, program),
    ).toEqual(native.fundedStaff(current, town, program));
    expect(
      own.fundingGovernment(staffingFacts(current, town), town, program.funder),
    ).toEqual(native.fundingGovernment(current, town, program.funder));
  }
  return current;
}
describe("full public funded staffing/seniority/recall/hire parents across all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
            place: "US-" + usps,
            people: 12,
            date: "2026-01-05",
            seed: "rules2:economy:public-staffing:" + usps,
          }),
          town = fixture.jurisdictionId;
        let world = fixture.world;
        run(world, town, "no-budget-control");
        world = ensureWorldStartingConditions(world, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        });
        world = ensureMacroEconomyStarted(
          world,
          macroStartForHistory(macroStartingConditions(world)),
        );
        const empty: PublicBudgetStore = {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          governments: [],
          adjustments: [],
          unknown: [],
        };
        world = {
          ...world,
          publicBudgets: withOpenedBudgets(world, empty, world.currentDate),
        };
        const provenance = {
          kind: "authored" as const,
          note: "Labeled canonical public staffing and funding controls, not ordinary NPC budget outcomes",
        };
        for (const program of own.STAFFED_PROGRAMS) {
          world = createOrganization(world, {
            stableKey: "rules2:staff:" + program.workplace,
            formedAt: world.currentDate,
            detailLevel: "lightweight",
            provenance,
            initialProfile: {
              name: "Canonical " + program.workplace,
              classification: program.classification,
              locationJurisdictionId: town,
            },
          });
          const organizationId = world.history.organizations.at(-1)!.id;
          const residents = world.personOrder.map((personId) => ({
            personId,
            age: ageOnDate(
              world.people[personId]!.birthDate,
              world.currentDate,
            ),
            enrolled: false,
            parentOfYoungChild: false,
          }));
          world = nativeEmployment.fillTownJobs(world, town, residents, {
            round: "initial-" + program.workplace,
            into: {
              workplace: program.workplace,
              role: program.role,
              organizationId,
            },
          });
        }
        // First retain the real corpus behavior, including missing territory budgets. Then supply a labeled recorded funding control from a Native-produced source year in every place.
        run(world, town, "actual-corpus-baseline");
        const reference = world.publicBudgets!.governments.find(
          (row) => row.key === "US-CO",
        )!;
        expect(reference).toBeDefined();
        const stateKey = "US-" + usps,
          actual = world.publicBudgets!.governments.find(
            (row) => row.key === stateKey,
          );
        const control = {
          ...reference,
          ...actual,
          key: stateKey,
          stateKey,
          jurisdictionId: fixture.stateJurisdictionId,
          lawJurisdictionId: fixture.stateJurisdictionId,
          name: "Raw recorded funding control " + usps,
          publicGovernmentIdentity: {
            kind: "jurisdiction" as const,
            jurisdictionId: fixture.stateJurisdictionId,
          },
          years: reference.years.map((year) => ({
            ...year,
            appropriations: [...year.appropriations],
          })),
        };
        world = {
          ...world,
          publicBudgets: {
            ...world.publicBudgets!,
            staffing: [],
            governments: [
              ...world.publicBudgets!.governments.filter(
                (row) => row.key !== stateKey,
              ),
              control,
            ],
          },
        };
        // The four authored territory localities have no source geoid, and Native requires one even for state funding. Preserve that real no-op above; this separately owned raw place control uses an actual compiled reference geoid only to exercise the funding path, not to assert a territory location.
        const sourcePlace = places.lifePlaceByJurisdictionId,
          referenceGeoid = smallWorldPlace("US-CO").sourceGeoid!;
        const geoSpy = vi
          .spyOn(places, "lifePlaceByJurisdictionId")
          .mockImplementation((id) => {
            const place = sourcePlace(id);
            return id === town && place && !place.sourceGeoid
              ? { ...place, sourceGeoid: referenceGeoid }
              : place;
          });
        try {
          const school = world.history.organizations.find(
            (row) => row.stableKey === "rules2:staff:public-school",
          )!;
          for (const personId of world.personOrder) {
            world = createEducationEnrollment(world, {
              stableKey: "rules2:staff:credential:" + personId,
              personId,
              organizationId: school.id,
              startedAt: world.currentDate,
              programKind: "postsecondary:bachelors-degree",
              contextKind: "program:classroom",
              provenance,
            });
            const enrollment = world.history.educationEnrollments.at(-1)!,
              state = world.history.educationEnrollmentStates.at(-1)!;
            world = recordEducationEnrollmentState(world, {
              stableKey: "rules2:staff:completed:" + personId,
              enrollmentId: enrollment.id,
              effectiveAt: world.currentDate,
              status: "completed",
              contextKind: "program:classroom",
              reason: "Canonical completed degree control",
              provenance,
              supersedesStateId: state.id,
            });
          }
          world = run(world, town, "baseline");
          expect((world.publicBudgets!.staffing ?? []).length).toBeGreaterThan(
            0,
          );
          world = run(world, town, "repeated-baseline");
          const cut = {
            ...world,
            publicBudgets: {
              ...world.publicBudgets!,
              governments: world.publicBudgets!.governments.map((row) => ({
                ...row,
                cut: 0.5,
              })),
            },
          };
          let reduced = run(cut, town, "half-funding-control");
          expect(reduced.history.workStatuses.length).toBeGreaterThan(
            world.history.workStatuses.length,
          );
          for (const work of reduced.history.workRelationships) {
            const status = reduced.history.workStatuses
              .filter((row) => row.workRelationshipId === work.id)
              .at(-1)!;
            if (status.status === "active")
              reduced = recordTownJobLoss(reduced, {
                stableKey: "rules2:staff:parallel-work-ended:" + work.id,
                workRelationshipId: work.id,
                effectiveAt: reduced.currentDate,
                status: "ended",
                reason: "labor:laid-off",
                supersedesStatusId: status.id,
                provenance,
              });
          }
          const increased = {
            ...reduced,
            publicBudgets: {
              ...reduced.publicBudgets!,
              governments: reduced.publicBudgets!.governments.map((row) => ({
                ...row,
                cut: 0,
                years: row.years.map((year) => ({
                  ...year,
                  appropriations: year.appropriations.map(
                    (amount) => amount * 2,
                  ),
                })),
              })),
            },
          };
          const hired = run(increased, town, "double-funding-control");
          expect(hired.history.workRelationships.length).toBeGreaterThan(
            reduced.history.workRelationships.length,
          );
          run(hired, town, "repeat-unchanged-funding-control");
        } finally {
          geoSpy.mockRestore();
        }
      },
      60000,
    );
});
