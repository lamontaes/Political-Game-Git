import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { ensurePublicBudgets } from "../../src/simulation/public-budgets";
import {
  STAFFED_PROGRAMS,
  fundedStaff,
  fundingGovernment,
  staffPublicJobs,
} from "../../src/simulation/public-budgets/staffing";
import { TOWN_JOB_END_REASONS } from "../../src/simulation/living-world/town-labor-market";
import { hasLifePathCredential } from "../../src/simulation/life-paths2";
import { createEducationEnrollment } from "../../src/simulation/life";
import {
  fillTownJobs,
  laborStatus,
  townResidents,
} from "../../src/simulation/living-world/town-employment";
import type { EntityId, World } from "../../src/simulation";

// Columbus, Ohio: a city with a government of its own, so its police are
// funded by the city's budget.
const COLUMBUS = "3918000";
const police = STAFFED_PROGRAMS.find((row) => row.program === "police")!;
const schools = STAFFED_PROGRAMS.find((row) => row.program === "schools")!;

function openAt(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = ensurePublicBudgets(game.world);
  const personId = game.playerPersonId;
  return { world, personId, town: world.people[personId]!.homeJurisdictionId };
}

/** The same world with the funding government's mid-year cut set. */
function withCut(world: World, town: EntityId, cut: number): World {
  const government = fundingGovernment(world, town, police.funder)!;
  return {
    ...world,
    publicBudgets: {
      ...world.publicBudgets!,
      governments: world.publicBudgets!.governments.map((row) =>
        row.key === government.key ? { ...row, cut } : row,
      ),
    },
  };
}

describe("budgets fund the town's police officers", () => {
  it("records the funded staff first, lays off the newest when the police line is cut, and recalls them when it is restored", () => {
    const { world, personId, town } = openAt(COLUMBUS, "budget-staffing-1");
    expect(fundingGovernment(world, town, "serving-local")?.key).toBe(
      `place:${COLUMBUS}`,
    );
    const first = staffPublicJobs(world, town, personId, "t1");
    const baseline = first.publicBudgets!.staffing!.find(
      (row) => row.program === "police",
    )!;
    const officers = fundedStaff(first, town, police);
    expect(baseline.headcount).toBe(officers.length);
    expect(officers.length).toBeGreaterThanOrEqual(2);

    // A new budget year that only keeps up with prices funds the same staff.
    const government = fundingGovernment(first, town, "serving-local")!;
    const year = government.years.at(-1)!;
    const nextYear = {
      ...year,
      startsOn: "2026-07-01" as typeof year.startsOn,
      appropriations: year.appropriations.map((value) => value * 1.05),
      economyAtAdoption: baseline.economyIndex * 1.05,
    };
    const kept05 = staffPublicJobs(
      {
        ...first,
        publicBudgets: {
          ...first.publicBudgets!,
          governments: first.publicBudgets!.governments.map((row) =>
            row.key === government.key
              ? { ...row, years: [...row.years, nextYear] }
              : row,
          ),
        },
      },
      town,
      personId,
      "t1b",
    );
    expect(fundedStaff(kept05, town, police).length).toBe(officers.length);

    // Half the police line is cut: half the officers go, newest first.
    const cut = staffPublicJobs(
      withCut(first, town, 0.5),
      town,
      personId,
      "t2",
    );
    const kept = fundedStaff(cut, town, police);
    expect(kept.length).toBe(Math.round(officers.length * 0.5));
    const started = new Map(
      cut.history.workRelationships.map((row) => [row.id, row.startedAt]),
    );
    const ended = officers.filter(
      (job) => !kept.some((row) => row.relationshipId === job.relationshipId),
    );
    const newestKept = Math.max(
      ...kept.map((job) => Date.parse(started.get(job.relationshipId)!)),
    );
    for (const job of ended) {
      expect(
        Date.parse(started.get(job.relationshipId)!),
      ).toBeGreaterThanOrEqual(newestKept);
      const status = cut.history.workStatuses.filter(
        (row) => row.workRelationshipId === job.relationshipId,
      );
      expect(status.at(-1)!.reason).toBe(TOWN_JOB_END_REASONS.laidOff);
    }

    // The cut is lifted: the funded count returns, and those laid off are
    // recalled first.
    const restored = staffPublicJobs(
      withCut(cut, town, 0),
      town,
      personId,
      "t3",
    );
    const back = fundedStaff(restored, town, police);
    expect(back.length).toBe(officers.length);
    const laidOffPeople = new Set(ended.map((job) => job.personId));
    const rehired = back.filter(
      (job) => !kept.some((row) => row.relationshipId === job.relationshipId),
    );
    expect(rehired.length).toBe(ended.length);
    for (const job of rehired)
      expect(laidOffPeople.has(job.personId)).toBe(true);

    // A second run of the same review changes nothing.
    expect(staffPublicJobs(restored, town, personId, "t3")).toBe(restored);
  });
});

/** Doubles the school line's real funding and returns the teachers hired. */
function hiredTeachers(world: World, town: EntityId, personId: EntityId) {
  const first = staffPublicJobs(world, town, personId, "t1");
  const teachers = fundedStaff(first, town, schools);
  const store = first.publicBudgets!;
  const doubled: World = {
    ...first,
    publicBudgets: {
      ...store,
      staffing: store.staffing!.map((row) =>
        row.program === "schools"
          ? { ...row, realFunding: row.realFunding / 2 }
          : row,
      ),
    },
  };
  const grown = staffPublicJobs(doubled, town, personId, "t2");
  const now = fundedStaff(grown, town, schools);
  return {
    teachers,
    now,
    hired: now.filter(
      (job) =>
        !teachers.some((row) => row.relationshipId === job.relationshipId),
    ),
  };
}

describe("the state's school line funds the town's teachers", () => {
  it("hires teachers when school funding rises, but not a resident whose schooling on record has no degree", () => {
    const { world, personId, town } = openAt(COLUMBUS, "budget-staffing-2");
    expect(fundingGovernment(world, town, "state")?.key).toBe("US-OH");
    const seeker = townResidents(world, town).find(
      (resident) =>
        resident.personId !== personId &&
        resident.age >= 25 &&
        laborStatus(world, resident) === "looking-for-work",
    )!;
    expect(seeker).toBeTruthy();

    // With no schooling on record, the seeker is held to the town's own rule
    // for teachers and is hired.
    const open = hiredTeachers(world, town, personId);
    expect(open.teachers.length).toBeGreaterThan(0);
    expect(open.hired.length).toBeGreaterThan(0);
    expect(open.now.length).toBeLessThanOrEqual(open.teachers.length * 2);
    expect(open.hired.some((job) => job.personId === seeker.personId)).toBe(
      true,
    );
    expect(open.hired.every((job) => job.personId !== personId)).toBe(true);

    // The same seeker with schooling on record and no degree is not.
    const template = world.history.educationEnrollments[0]!;
    const schooled = createEducationEnrollment(world, {
      stableKey: "test:seeker-schooling",
      personId: seeker.personId,
      organizationId: template.organizationId,
      startedAt: world.currentDate,
      programKind: template.programKind,
      contextKind: world.history.educationEnrollmentStates.find(
        (row) => row.enrollmentId === template.id,
      )!.contextKind,
      provenance: template.provenance,
    });
    expect(
      hasLifePathCredential(
        schooled,
        seeker.personId,
        "postsecondary:bachelors-degree",
      ),
    ).toBe(false);
    const closed = hiredTeachers(schooled, town, personId);
    expect(closed.hired.length).toBeGreaterThan(0);
    expect(closed.hired.some((job) => job.personId === seeker.personId)).toBe(
      false,
    );
  });
});

describe("a role the budget staffs leaves the town's job mix", () => {
  it("hires no police officer or teacher from the town's own mix once the budget staffs them", () => {
    const { world, personId, town } = openAt(COLUMBUS, "budget-staffing-3");
    const staffed = staffPublicJobs(world, town, personId, "t1");
    const seekers = townResidents(staffed, town).filter(
      (resident) =>
        resident.personId !== personId &&
        laborStatus(staffed, resident) === "looking-for-work",
    );
    expect(seekers.length).toBeGreaterThan(0);
    const before = STAFFED_PROGRAMS.map(
      (row) => fundedStaff(staffed, town, row).length,
    );
    // Every job seeker is hired by the town's mix at once.
    const filled = fillTownJobs(staffed, town, seekers, { round: "mix-1" });
    expect(
      STAFFED_PROGRAMS.map((row) => fundedStaff(filled, town, row).length),
    ).toEqual(before);
    expect(filled.history.workRelationships.length).toBeGreaterThan(
      staffed.history.workRelationships.length,
    );
  });
});
