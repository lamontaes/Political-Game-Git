import { createScenarioWorld } from "../../../src/simulation/demo";
import { ageOnDate, makeIsoDate } from "../../../src/simulation/dates";
import {
  createOrganization,
  createOrganizationParticipation,
  createWorkRelationship,
  recordKinship,
  recordWorkStatus,
} from "../../../src/simulation/life";
import { stateJurisdictionForKey } from "../../../src/simulation/life-places";
import {
  establishPersonnelDesignation,
  establishPersonnelIncumbency,
  establishPersonnelPosition,
  type PersonnelResult,
} from "../../../src/simulation/civil-personnel-actions";
import type { EntityId, World } from "../../../src/simulation/types";
import { recordWorldEvent } from "../../../src/simulation/world";
import {
  PERSONNEL_INFORMAL_SUBJECT_TAG,
  PERSONNEL_JUST_CAUSE_TAG_PREFIX,
} from "../../../src/presentation/civil-personnel-evidence";

/**
 * An explicitly authored diagnostic scenario, not ordinary play. The two
 * agencies are fictional; their charters, positions and prior employment are
 * game-authored. Only the statutory procedures come from acquired law.
 */
export interface CivilAuthorityFixture {
  readonly world: World;
  readonly director: EntityId;
  readonly employee: EntityId;
  readonly commissioner: EntityId;
  readonly relative: EntityId;
  readonly coveredEmployee: EntityId;
  readonly probationer: EntityId;
  readonly otherDirector: EntityId;
  /** Separated from the class in 2025, inside the four-year window. */
  readonly formerEmployee: EntityId;
  /** Separated in 2021, outside the four-year window. */
  readonly lapsedEmployee: EntityId;
  readonly agencyId: EntityId;
  readonly otherAgencyId: EntityId;
  readonly specialistPositionId: EntityId;
  readonly otherSpecialistPositionId: EntityId;
  readonly incumbencyId: EntityId;
  readonly coveredIncumbencyId: EntityId;
  readonly probationIncumbencyId: EntityId;
}

const authored = (note: string) => ({ kind: "authored" as const, note });

function must(result: PersonnelResult): { world: World; id: EntityId } {
  if (!result.ok) throw new Error(result.reason);
  return { world: result.world, id: result.recordId };
}

const timeDemand = (jurisdictionId: EntityId) => ({
  expectedWeekly: { minimumHours: 40, maximumHours: 40 },
  attention: "high" as const,
  concurrency: "mostly-exclusive" as const,
  scheduleRigidity: "mixed" as const,
  interruptibility: "limited" as const,
  locationJurisdictionId: jurisdictionId,
});

export function civilAuthorityFixture(
  date = "2026-09-14",
  stateKey: "US-MN" | "US-AK" = "US-MN",
  controlled: "director" | "otherDirector" = "director",
  seed = "civil-authority13",
): CivilAuthorityFixture {
  const jurisdiction = stateJurisdictionForKey(stateKey)!;
  let world = createScenarioWorld(
    `${seed}:${stateKey}`,
    {
      jurisdiction,
      initialMoment: {
        date: makeIsoDate(date),
        minuteOfDay: 9 * 60,
        timeZone:
          stateKey === "US-MN" ? "America/Chicago" : "America/Anchorage",
        utcOffsetMinutes: stateKey === "US-MN" ? -300 : -480,
      },
      creationSummary: "Authored public-personnel diagnostic scenario.",
      goalScope: "Authored public-personnel diagnostic scenario",
      householdLocationLabel: "Authored diagnostic residence",
    },
    { peopleCount: 14 },
  );
  const adults = world.personOrder.filter((id) => {
    const person = world.people[id]!;
    return ageOnDate(person.birthDate, world.currentDate) >= 25;
  });
  if (adults.length < 9) throw new Error("Scenario needs nine adults.");
  const [
    director,
    employee,
    commissioner,
    relative,
    coveredEmployee,
    probationer,
    otherDirector,
    formerEmployee,
    lapsedEmployee,
  ] = adults as [
    EntityId,
    EntityId,
    EntityId,
    EntityId,
    EntityId,
    EntityId,
    EntityId,
    EntityId,
    EntityId,
  ];
  world = {
    ...world,
    control: {
      kind: "person",
      personId: controlled === "director" ? director : otherDirector,
    },
  };
  const agency = (key: string, name: string) => {
    world = createOrganization(world, {
      stableKey: `civil-authority:${key}`,
      formedAt: world.currentDate,
      provenance: authored(
        `Fictional ${name}; game-authored, not a real agency.`,
      ),
      initialProfile: {
        name,
        classification: "service:state-agency",
        locationJurisdictionId: jurisdiction.id,
      },
    });
    return world.history.organizations.at(-1)!.id;
  };
  const lead = (
    personId: EntityId,
    organizationId: EntityId,
    key: string,
    roleKind: `leader:${string}`,
  ) => {
    world = createOrganizationParticipation(world, {
      stableKey: `civil-authority:${key}`,
      personId,
      organizationId,
      startedAt: world.currentDate,
      kind: "leadership:office",
      roleKind,
      context: null,
      provenance: authored("Authored diagnostic office holder."),
    });
  };
  const agencyId = agency("agency", "Fictional State Records Agency");
  const otherAgencyId = agency(
    "other-agency",
    "Fictional State Licensing Agency",
  );
  const commissionerOfficeId = agency(
    "commissioner",
    "Office of the chapter 43A commissioner",
  );
  lead(director, agencyId, "director", "leader:agency-director");
  lead(
    otherDirector,
    otherAgencyId,
    "other-director",
    "leader:agency-director",
  );
  lead(
    commissioner,
    commissionerOfficeId,
    "commissioner",
    "leader:commissioner",
  );
  for (const [key, organizationId] of [
    ["charter", agencyId],
    ["other-charter", otherAgencyId],
  ] as const)
    world = must(
      establishPersonnelDesignation(world, {
        stableKey: key,
        organizationId,
        roleKind: "leader:agency-director",
        power: "appointing-authority",
        jurisdictionKey: stateKey,
        basis: {
          kind: "authored-charter",
          note: "The fictional agency's authored charter makes its director the appointing authority.",
        },
      }),
    ).world;
  if (stateKey === "US-MN")
    world = must(
      establishPersonnelDesignation(world, {
        stableKey: "commissioner-office",
        organizationId: commissionerOfficeId,
        roleKind: "leader:commissioner",
        power: "commissioner-settlement",
        jurisdictionKey: stateKey,
        basis: { kind: "statute", procedureKey: "mn-commissioner-settlement" },
      }),
    ).world;
  const position = (
    key: string,
    organizationId: EntityId,
    title: string,
    agreementCoverage: "covered" | "not-covered",
  ) => {
    const result = must(
      establishPersonnelPosition(world, {
        stableKey: key,
        organizationId,
        title,
        classKey: "fictional:records-specialist",
        civilClass: "classified",
        bargainingCoverage: "unknown",
        agreementCoverage,
        note: "Authored position of a fictional agency.",
      }),
    );
    world = result.world;
    return result.id;
  };
  const specialistPositionId = position(
    "specialist",
    agencyId,
    "Records specialist",
    "not-covered",
  );
  const coveredPositionId = position(
    "covered",
    agencyId,
    "Records specialist (represented)",
    "covered",
  );
  const probationPositionId = position(
    "probation",
    agencyId,
    "Records specialist (new)",
    "not-covered",
  );
  const otherSpecialistPositionId = position(
    "other-specialist",
    otherAgencyId,
    "Records specialist",
    "not-covered",
  );
  const employ = (
    personId: EntityId,
    key: string,
    startedAt: string,
    positionId: EntityId,
    tenure: "permanent" | "probationary",
  ) => {
    world = createWorkRelationship(world, {
      stableKey: `civil-authority:${key}:work`,
      personId,
      organizationId: agencyId,
      startedAt,
      kind: "employment:civil-service",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: authored(
        "Authored prior employment for the diagnostic scenario.",
      ),
      initialRole: {
        title: "Records specialist",
        occupationClassification: null,
        locationJurisdictionId: jurisdiction.id,
        timeDemand: timeDemand(jurisdiction.id),
      },
    });
    const workRelationshipId = world.history.workRelationships.at(-1)!.id;
    const result = must(
      establishPersonnelIncumbency(world, {
        stableKey: `${key}:incumbency`,
        positionId,
        workRelationshipId,
        tenure,
        note: "Authored scenario status; not derived from acquired law.",
      }),
    );
    world = result.world;
    return result.id;
  };
  const incumbencyId = employ(
    employee,
    "employee",
    "2021-03-01",
    specialistPositionId,
    "permanent",
  );
  const coveredIncumbencyId = employ(
    coveredEmployee,
    "covered",
    "2020-06-01",
    coveredPositionId,
    "permanent",
  );
  const probationIncumbencyId = employ(
    probationer,
    "probationer",
    date,
    probationPositionId,
    "probationary",
  );
  const separate = (
    personId: EntityId,
    key: string,
    startedAt: string,
    endedAt: string,
  ) => {
    const positionId = position(
      key,
      agencyId,
      "Records specialist (earlier)",
      "not-covered",
    );
    employ(personId, key, startedAt, positionId, "permanent");
    const work = world.history.workRelationships.at(-1)!;
    const status = world.history.workStatuses
      .filter((candidate) => candidate.workRelationshipId === work.id)
      .at(-1)!;
    world = recordWorkStatus(world, {
      stableKey: `civil-authority:${key}:separated`,
      workRelationshipId: work.id,
      effectiveAt: endedAt,
      status: "ended",
      reason: "Authored earlier resignation in good standing.",
      provenance: authored(
        "Authored earlier separation for the diagnostic scenario.",
      ),
      supersedesStatusId: status.id,
    });
  };
  separate(formerEmployee, "former", "2018-04-02", "2025-06-30");
  separate(lapsedEmployee, "lapsed", "2014-04-01", "2021-06-30");
  world = recordKinship(world, {
    stableKey: "civil-authority:director-sibling",
    personIds: [director, relative],
    establishedAt:
      world.people[relative]!.birthDate > world.people[director]!.birthDate
        ? world.people[relative]!.birthDate
        : world.people[director]!.birthDate,
    kind: "collateral:sibling",
    provenance: authored(
      "Authored sibling relationship for the relationship-bypass control.",
    ),
  });
  world = recordWorldEvent(world, {
    stableKey: "civil-authority:employee-records-directives",
    type: "work.personnel-evidence",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [agencyId, director, employee],
    participants: [
      {
        personId: director,
        role: "focus:supervisor",
        detail: "Observed the recorded episode.",
      },
      {
        personId: employee,
        role: "focus:employee",
        detail: "Subject of the recorded episode.",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      PERSONNEL_INFORMAL_SUBJECT_TAG,
      `${PERSONNEL_JUST_CAUSE_TAG_PREFIX}insubordination`,
    ],
    summary:
      "The employee declined three written records-retention directives.",
    context: {
      location: null,
      socialContext: "Authored diagnostic workplace episode.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return {
    world,
    director,
    employee,
    commissioner,
    relative,
    coveredEmployee,
    probationer,
    otherDirector,
    formerEmployee,
    lapsedEmployee,
    agencyId,
    otherAgencyId,
    specialistPositionId,
    otherSpecialistPositionId,
    incumbencyId,
    coveredIncumbencyId,
    probationIncumbencyId,
  };
}

export function asPerson(world: World, personId: EntityId): World {
  return { ...world, control: { kind: "person", personId } };
}
