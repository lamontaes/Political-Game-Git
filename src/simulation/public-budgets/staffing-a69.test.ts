import { describe, expect, it } from "vitest";
import { appendFileSync } from "node:fs";
import {
  smallWorld,
  smallWorldPlace,
} from "../../../tests/fixtures/small-world";
import { addDays, ageOnDate, makeIsoDate } from "../dates";
import {
  createOrganization,
  createWorkRelationship,
  createEducationEnrollment,
  recordEducationEnrollmentState,
} from "../life";
import { lifePlaceStateIdentities } from "../life-places";
import { hasLifePathCredential } from "../life-paths2";
import { TOWN_JOB_END_REASONS } from "../living-world/town-labor-market";
import { workStatusAt } from "../life-queries";
import { personName } from "../people";
import { pickDistinct, SeededRng } from "../rng";
import { serializeWorld, deserializeWorld } from "../serialization";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
} from "./store";
import {
  staffPublicJobs,
  fundedStaff,
  fundingGovernment,
  STAFFED_PROGRAMS,
} from "./staffing";
import type { World, EntityId } from "../types";

const SEED = "a69-funded-staffing-all56";
const sampled = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  56,
);
const provenance = {
  kind: "authored" as const,
  note: "A69 recorded staffing control; the budget amounts are fixture inputs, not researched starting budgets.",
};
const teachers = STAFFED_PROGRAMS.find((row) => row.program === "schools")!;

function fixture(key: string) {
  const game = smallWorld({
    place: key,
    date: "2026-01-20",
    seed: `${SEED}:${key}`,
    people: 8,
  });
  let world = game.world;
  const adults = world.personOrder.filter((id) => {
    const age = ageOnDate(world.people[id]!.birthDate, world.currentDate);
    return age >= 22 && age < 62;
  });
  expect(adults.length).toBeGreaterThanOrEqual(4);
  // Isolate the credential gate from the separate student labor-status rule.
  // Select an actual recorded adult over its student age range, not a new age.
  const qualified = adults.find(
    (id) => ageOnDate(world.people[id]!.birthDate, world.currentDate) > 24,
  )!;
  expect(qualified).toBeDefined();
  const [player, senior, unqualified] = adults.filter(
    (id) => id !== qualified,
  ) as [EntityId, EntityId, EntityId];
  world = { ...world, control: { kind: "person", personId: player } };
  world = createOrganization(world, {
    stableKey: "a69:school",
    formedAt: addDays(world.currentDate, -30),
    provenance,
    initialProfile: {
      name: "Recorded fixture school",
      classification: "service:school",
      locationJurisdictionId: game.jurisdictionId,
    },
  });
  const school = world.history.organizations.at(-1)!.id;
  for (const [id, offset] of [
    [senior, -10],
    [player, 0],
  ] as const) {
    world = createWorkRelationship(world, {
      stableKey: `a69:teacher:${id}`,
      personId: id,
      organizationId: school,
      startedAt: addDays(world.currentDate, offset),
      kind: "employment:employee",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Teacher",
        occupationClassification: "profession:teacher",
        locationJurisdictionId: game.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 40 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: game.jurisdictionId,
        },
      },
    });
  }
  // The existing staffing mechanism consumes this explicit adopted allocation.
  // No government payment or natural adoption is claimed by this control.
  const government: PublicBudgetGovernment = {
    key: game.place.stateJurisdictionKey!,
    jurisdictionId: game.stateJurisdictionId,
    lawJurisdictionId: game.stateJurisdictionId,
    level: "state",
    name: game.place.stateJurisdictionKey!,
    stateKey: game.place.stateJurisdictionKey!,
    population: world.personOrder.length,
    fiscalYearStart: "01-01",
    fiscalYearStartBasis: "state-start-placeholder",
    budgetCycle: "annual",
    openingNotes: [provenance.note],
    balance: 0,
    reserve: 0,
    debt: 0,
    interestRate: 0,
    cut: 0,
    pension: { liability: 0, assets: 0, paidShare: 1 },
    months: [],
    years: [
      {
        fiscalYear: 2026,
        startsOn: makeIsoDate("2026-01-01"),
        endsOn: makeIsoDate("2026-12-31"),
        adoptedOn: world.currentDate,
        basis: "opening",
        expectedRevenue: BUDGET_SOURCES.map(() => 0),
        appropriations: BUDGET_PROGRAMS.map((program) =>
          program === "schools" ? 1000 : 0,
        ),
        reserveDeposit: 0,
        pensionRequired: 0,
        pensionShare: 1,
        economyAtAdoption: 1,
        laws: {
          balanced: { answer: "unknown", measureId: null, level: null },
          reserve: { answer: "unknown", measureId: null, level: null },
          pensions: { answer: "unknown", measureId: null, level: null },
        },
      },
    ],
  };
  world = {
    ...world,
    publicBudgets: {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      governments: [government],
      adjustments: [],
      unknown: [],
    },
  };
  return { world, game, player, senior, unqualified, qualified, school };
}

function funding(world: World, multiplier: number): World {
  return {
    ...world,
    publicBudgets: {
      ...world.publicBudgets!,
      governments: world.publicBudgets!.governments.map((row) => ({
        ...row,
        years: row.years.map((year) => ({
          ...year,
          appropriations: year.appropriations.map(
            (amount) => amount * multiplier,
          ),
        })),
      })),
    },
  };
}

describe("A69 funded staffing follows actual jobs and completed credentials", () => {
  it.each(sampled)(
    "includes the player and refuses missing credentials in $jurisdictionKey",
    (place) => {
      const { world, game, player, senior, unqualified, qualified, school } =
        fixture(place.jurisdictionKey);
      // A place with no modeled funding jurisdiction must remain unstaffed.
      // This is explicit source coverage, not a synthetic local jurisdiction.
      const funder = fundingGovernment(world, game.jurisdictionId, "state");
      if (!funder) {
        expect(game.place.sourceGeoid ?? null).toBeNull();
        expect(
          staffPublicJobs(world, game.jurisdictionId, player, "unmodeled"),
        ).toBe(world);
        return;
      }
      const baseline = staffPublicJobs(
        world,
        game.jurisdictionId,
        player,
        "baseline",
      );
      const cut = staffPublicJobs(
        funding(baseline, 0.5),
        game.jurisdictionId,
        player,
        "cut",
      );
      const playerWork = cut.history.workRelationships.find(
        (row) => row.personId === player,
      )!;
      const seniorWork = cut.history.workRelationships.find(
        (row) => row.personId === senior,
      )!;
      expect(workStatusAt(cut, playerWork.id)).toMatchObject({
        status: "ended",
        reason: TOWN_JOB_END_REASONS.laidOff,
      });
      expect(workStatusAt(cut, seniorWork.id)?.status).toBe("active");
      expect(fundedStaff(cut, game.jurisdictionId, teachers)).toHaveLength(1);
      expect(personName(cut.people[player]!)).not.toBe("");
      const repeated = staffPublicJobs(cut, game.jurisdictionId, player, "cut");
      expect(repeated.history.workStatuses).toEqual(cut.history.workStatuses);
      const reopened = deserializeWorld(serializeWorld(cut));
      expect(
        staffPublicJobs(reopened, game.jurisdictionId, player, "cut").history
          .workStatuses,
      ).toEqual(cut.history.workStatuses);

      expect(
        hasLifePathCredential(
          baseline,
          unqualified,
          "postsecondary:bachelors-degree",
        ),
      ).toBe(false);
      expect(baseline.history.educationEnrollments).toHaveLength(0);
      const expanded = funding(baseline, 2);
      const refused = staffPublicJobs(
        expanded,
        game.jurisdictionId,
        player,
        "expand",
      );
      expect(refused.history.workRelationships).toEqual(
        baseline.history.workRelationships,
      );
      expect(fundedStaff(refused, game.jurisdictionId, teachers)).toHaveLength(
        2,
      );

      const enrolled = createEducationEnrollment(expanded, {
        stableKey: "a69:degree",
        personId: qualified,
        organizationId: school,
        startedAt: expanded.currentDate,
        programKind: "postsecondary:bachelors-degree",
        contextKind: "program:bachelors-degree",
        provenance,
      });
      const enrollment = enrolled.history.educationEnrollments.at(-1)!;
      const studying = staffPublicJobs(
        enrolled,
        game.jurisdictionId,
        player,
        "studying",
      );
      expect(studying.history.workRelationships).toEqual(
        baseline.history.workRelationships,
      );
      const completed = recordEducationEnrollmentState(enrolled, {
        stableKey: "a69:degree-completed",
        enrollmentId: enrollment.id,
        effectiveAt: enrolled.currentDate,
        status: "completed",
        contextKind: "program:bachelors-degree",
        reason: "Authored completed credential control",
        provenance,
        supersedesStateId:
          enrolled.history.educationEnrollmentStates.at(-1)!.id,
      });
      expect(
        hasLifePathCredential(
          completed,
          qualified,
          "postsecondary:bachelors-degree",
        ),
      ).toBe(true);
      const hired = staffPublicJobs(
        completed,
        game.jurisdictionId,
        player,
        "credentialed",
      );
      expect(
        hired.history.workRelationships.some(
          (row) => row.personId === qualified && row.organizationId === school,
        ),
      ).toBe(true);
      expect(
        hired.history.workRelationships.some(
          (row) => row.personId === unqualified,
        ),
      ).toBe(false);
      expect(fundedStaff(hired, game.jurisdictionId, teachers)).toHaveLength(3);
      expect(
        staffPublicJobs(hired, game.jurisdictionId, player, "credentialed")
          .history.workRelationships,
      ).toEqual(hired.history.workRelationships);
      expect(serializeWorld(deserializeWorld(serializeWorld(hired)))).toBe(
        serializeWorld(hired),
      );
      const evidencePath = process.env.TEAM3_STAFFING_EVIDENCE_PATH;
      if (evidencePath) {
        appendFileSync(
          evidencePath,
          JSON.stringify({
            seed: `${SEED}:${place.jurisdictionKey}`,
            place: place.jurisdictionKey,
            onDate: world.currentDate,
            player: {
              id: player,
              name: personName(cut.people[player]!),
              workId: playerWork.id,
              status: workStatusAt(cut, playerWork.id),
            },
            senior: {
              id: senior,
              name: personName(cut.people[senior]!),
              workId: seniorWork.id,
              status: workStatusAt(cut, seniorWork.id),
            },
            hired: {
              id: qualified,
              name: personName(hired.people[qualified]!),
              enrollmentId: enrollment.id,
              workId: hired.history.workRelationships.find(
                (row) => row.personId === qualified,
              )!.id,
            },
            refused: {
              id: unqualified,
              name: personName(hired.people[unqualified]!),
            },
            budgetAllocationBefore: 1000,
            budgetAllocationAfter: 500,
            baselineStaff: 2,
            afterCut: 1,
            afterCredential: 3,
          }) + "\n",
        );
      }
    },
  );
});

for (const place of sampled.filter(
  (row) => !smallWorldPlace(row.jurisdictionKey).sourceGeoid,
)) {
  it.todo(
    `A69 ${place.jurisdictionKey}: actual funded staffing after a sourced government binding is available`,
  );
}
