import { beforeAll, describe, expect, it, vi } from "vitest";

import { smallWorld } from "../../../tests/fixtures/small-world";
import { projectGoverningOfficeDesk } from "../../presentation/governing-office-desk";
import type { World } from "../types";
import {
  executiveStaffOffice,
  hireOfficeStaff,
  officeStaffingView,
  openOfficeStaffSearch,
} from "./office-staff-hiring";
import { officeStaffPositions } from "./office-staffing";
import { createWorkRelationship } from "../life";
import { activeWorkRelationshipsAt } from "../life-queries";
import {
  CHIEF_OF_STAFF_CLASSIFICATION,
  chiefOfStaffFor,
  createCandidates,
  currentGoverningOffices,
  decideGoverningMatter,
  governingMatters,
  governingOfficeForPerson,
  openTransitionMatters,
  type GoverningOffice,
} from "./state-governing";

// Kept from when each case opened a whole new life seating all fifty state
// legislatures; the cases now build only the governor they read.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

/** Plays as the sitting governor of Oregon: a test fixture's control swap. */
function asGovernor(seed: string): World {
  // The cases read Oregon's seated governor and its office; nothing else in
  // an opening.
  const world = smallWorld({ place: "OR", seed, offices: ["governor"] }).world;
  const office = currentGoverningOffices(world).find(
    (entry) => entry.stateUsps === "OR",
  )!;
  return {
    ...world,
    control: { kind: "person", personId: office.holderPersonId },
  };
}

describe("a governor fills the office's other positions", () => {
  it("hires a Legislative Director and a Caseworker; the chief of staff stays with the transition", () => {
    let world = asGovernor("governor-staff-hiring");
    const holder =
      world.control.kind === "person" ? world.control.personId : null;
    const office = governingOfficeForPerson(world, holder!)!;
    expect(office.controlledByPlayer).toBe(true);
    world = openTransitionMatters(world, office.officeKey);
    const staffable = executiveStaffOffice(office);

    const searched = openOfficeStaffSearch(world, staffable);
    if (searched.kind !== "done") throw new Error(searched.reason);
    world = searched.world;
    const view = officeStaffingView(world, staffable);
    expect(view.openings.map((opening) => opening.title)).toEqual([
      "Legislative Director",
      "Constituent Services Caseworker",
    ]);

    const director = view.openings[0]!;
    const hired = hireOfficeStaff(world, staffable, {
      positionId: director.positionId,
      personId: director.candidates[0]!.personId,
    });
    if (hired.kind !== "done") throw new Error(hired.reason);
    world = hired.world;

    const desk = projectGoverningOfficeDesk(world, holder!)!;
    expect(desk.staff.map((member) => member.personId)).toContain(
      director.candidates[0]!.personId,
    );
    expect(
      desk.staff.find(
        (member) => member.personId === director.candidates[0]!.personId,
      )?.roleTitle,
    ).toBe("Legislative Director");

    // The chief of staff is not offered or hired from this list.
    const chief = officeStaffPositions(world, office).find(
      (position) => position.classKey === "office-chief-of-staff",
    )!;
    expect(
      hireOfficeStaff(world, staffable, {
        positionId: chief.id,
        personId: director.candidates[1]!.personId,
      }).kind,
    ).toBe("refused");
  }, 600_000);
});

/** The last administration's chief of staff, still on the payroll. */
function withPredecessorChief(
  world: World,
  office: GoverningOffice,
): { world: World; chief: string } {
  const made = createCandidates(world, office, "test:predecessor-chief", 1);
  const chief = made.personIds[0]!;
  const next = createWorkRelationship(made.world, {
    stableKey: "test:predecessor-chief:work",
    personId: chief,
    organizationId: office.organizationId,
    startedAt: made.world.currentDate,
    initialStatus: "active",
    kind: "employment:executive-staff",
    compensation: "paid",
    authority: "directs-others",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "test: a predecessor's chief" },
    initialRole: {
      title: "Chief of Staff",
      occupationClassification: CHIEF_OF_STAFF_CLASSIFICATION,
      locationJurisdictionId: office.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 45, maximumHours: 60 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: office.jurisdictionId,
      },
    },
  });
  return { world: next, chief };
}

function chiefJobs(world: World, office: GoverningOffice) {
  return world.personOrder.filter((personId) =>
    activeWorkRelationshipsAt(world, personId).some(
      ({ relationship, role }) =>
        relationship.organizationId === office.organizationId &&
        role.occupationClassification === CHIEF_OF_STAFF_CLASSIFICATION,
    ),
  );
}

describe("a new governor inherits the last chief of staff", () => {
  function transition(seed: string) {
    const start = asGovernor(seed);
    const holder =
      start.control.kind === "person" ? start.control.personId : null;
    const office = governingOfficeForPerson(start, holder!)!;
    const seated = withPredecessorChief(start, office);
    const world = openTransitionMatters(seated.world, office.officeKey);
    const matter = governingMatters(world, office.officeKey).find(
      (entry) => entry.family === "chief-of-staff",
    )!;
    return { world, office, matter, predecessor: seated.chief };
  }

  describe("keeping the predecessor", () => {
    let fixture: ReturnType<typeof transition>;
    beforeAll(() => {
      fixture = transition("gov-keep-chief");
    });
    it("offers to keep them, and keeping them hires nobody new", () => {
      const { world, office, matter, predecessor } = fixture;
      expect(matter.options).toHaveLength(4);
      const keep = matter.options.find((o) => o.personId === predecessor)!;
      expect(keep.label.startsWith("Keep ")).toBe(true);
      expect(
        matter.options.filter((o) => o.label.startsWith("Keep ")),
      ).toHaveLength(1);
      const kept = decideGoverningMatter(world, matter.id, keep.key);
      if (!kept.ok) throw new Error(kept.reason);
      expect(chiefJobs(kept.world, office)).toEqual([predecessor]);
      expect(
        kept.world.history.events.some((event) =>
          event.summary.includes("on as chief of staff"),
        ),
      ).toBe(true);
    });
  });
  describe("hiring a replacement", () => {
    let fixture: ReturnType<typeof transition>;
    beforeAll(() => {
      fixture = transition("gov-new-chief");
    });
    it("replaces them when somebody else is hired, leaving one chief", () => {
      const { world, office, matter, predecessor } = fixture;
      const hire = matter.options.find(
        (o) => o.personId && o.personId !== predecessor,
      )!;
      const hired = decideGoverningMatter(world, matter.id, hire.key);
      if (!hired.ok) throw new Error(hired.reason);
      expect(chiefJobs(hired.world, office)).toEqual([hire.personId]);
      expect(chiefOfStaffFor(hired.world, office)).toBe(hire.personId);
    });
  });
});
