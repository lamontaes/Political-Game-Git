/** Explicit fictional Custom Start premise for public personnel work. */
import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
} from "./character-history";
import { addDays, ageOnDate, makeIsoDate } from "./dates";
import {
  createOrganization,
  createOrganizationParticipation,
  createWorkRelationship,
  recordWorkStatus,
} from "./life";
import { workStatusAt } from "./life-queries";
import { drawCanonicalName } from "./people";
import { SeededRng } from "./rng";
import { isPersonAliveAt } from "./vitality-integrity";
import { recordWorldEvent } from "./world";
import {
  establishPersonnelDesignation,
  establishPersonnelIncumbency,
  establishPersonnelPosition,
  personnelProcedure,
  personnelStateKeyForJurisdiction,
  type PersonnelResult,
} from "./civil-personnel-actions";
import type { EntityId, IsoDate, World } from "./types";

export const STATE_AGENCY_START_NOTICE =
  "Fictional state agency. This Custom Start authors the agency, a charter naming its director as appointing authority, its positions and its existing staff. It is not a real agency, and it grants no power the acquired law does not describe.";

/**
 * States where a supported personnel transition exists to be played. The
 * start is offered only where the discipline procedure it leads to has been
 * compiled from acquired law.
 */
export function stateAgencyStartStates(): readonly string[] {
  return personnelProcedure("mn-discipline-notice").jurisdictionKey === "US-MN"
    ? ["US-MN"]
    : [];
}

export function stateAgencyStartAvailableFor(
  stateJurisdictionKey: string | null,
): boolean {
  return (
    stateJurisdictionKey !== null &&
    stateAgencyStartStates().includes(stateJurisdictionKey)
  );
}

/** Authored content adult boundary, expressly not a legal qualification rule. */
export const STATE_AGENCY_START_MINIMUM_AGE = 25;

type StartResult =
  | { readonly ok: true; readonly world: World }
  | { readonly ok: false; readonly world: World; readonly reason: string };

const OFFICE_HOURS = (jurisdictionId: EntityId) => ({
  expectedWeekly: { minimumHours: 40, maximumHours: 40 },
  attention: "high" as const,
  concurrency: "mostly-exclusive" as const,
  scheduleRigidity: "mixed" as const,
  interruptibility: "limited" as const,
  locationJurisdictionId: jurisdictionId,
});

function yearsBefore(date: IsoDate, years: number): IsoDate {
  return makeIsoDate(
    `${(Number(date.slice(0, 4)) - years).toString().padStart(4, "0")}${date.slice(4)}`,
  );
}

function must(result: PersonnelResult): { world: World; id: EntityId } {
  if (!result.ok) throw new Error(result.reason);
  return { world: result.world, id: result.recordId };
}

/**
 * Called only at explicit Custom Begin; never from opening Work, a panel or
 * loading a save. The player directs a fictional state agency whose authored
 * charter makes the director its appointing authority. Every procedure the
 * agency can then use still comes from acquired law and still applies only
 * on or after that law's observation date.
 */
export function initializeStateAgencyStart(
  world: World,
  input: { readonly mode: "custom"; readonly jurisdictionId: EntityId },
): StartResult {
  if (input.mode !== "custom" || world.control.kind !== "person")
    return {
      ok: false,
      world,
      reason: "The state agency start requires an explicit Custom Start.",
    };
  const directorId = world.control.personId;
  const director = world.people[directorId];
  const stateKey = personnelStateKeyForJurisdiction(input.jurisdictionId);
  if (
    !director ||
    !isPersonAliveAt(world, directorId, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    }) ||
    ageOnDate(director.birthDate, world.currentDate) <
      STATE_AGENCY_START_MINIMUM_AGE ||
    !world.jurisdictions[input.jurisdictionId]
  )
    return {
      ok: false,
      world,
      reason: `This authored start requires a character aged ${STATE_AGENCY_START_MINIMUM_AGE} or older and an available place.`,
    };
  if (!stateAgencyStartAvailableFor(stateKey))
    return {
      ok: false,
      world,
      reason:
        "No personnel procedure has been compiled for this state, so the game cannot start a public agency there.",
    };
  const key = `civil-personnel:custom-start:${directorId}`;
  if (world.history.events.some((e) => e.stableKey === `${key}:established`))
    return { ok: true, world };
  const provenance = {
    kind: "authored" as const,
    note: STATE_AGENCY_START_NOTICE,
  };
  const jurisdictionId = input.jurisdictionId;
  const today = world.currentDate;
  try {
    let next = world;
    const organization = (stableKey: string, name: string) => {
      next = createOrganization(next, {
        stableKey,
        formedAt: today,
        detailLevel: "lightweight",
        provenance,
        initialProfile: {
          name,
          classification: "service:state-agency",
          locationJurisdictionId: jurisdictionId,
        },
      });
      return next.history.organizations.at(-1)!.id;
    };
    const lead = (
      personId: EntityId,
      organizationId: EntityId,
      stableKey: string,
      roleKind: `leader:${string}`,
    ) => {
      next = createOrganizationParticipation(next, {
        stableKey,
        personId,
        organizationId,
        startedAt: today,
        kind: "leadership:office",
        roleKind,
        context: STATE_AGENCY_START_NOTICE,
        provenance,
      });
    };
    const contextPerson = (personKey: string, age: number) => {
      const name = drawCanonicalName(new SeededRng(next.seed).fork(personKey));
      next = applyCharacterHistoryPlan(next, {
        stableKey: personKey,
        mode: "authored",
        personId: directorId,
        transitions: [
          {
            kind: "context-person",
            input: {
              stableKey: personKey,
              givenName: name.givenName,
              familyName: name.familyName,
              birthDate: makeIsoDate(
                `${Number(today.slice(0, 4)) - age}-03-01`,
              ),
              homeJurisdictionId: jurisdictionId,
            },
          },
        ],
      }).world;
      return characterHistoryContextPersonId(next, personKey);
    };

    const agencyId = organization(`${key}:agency`, "Northstar Records Service");
    next = createWorkRelationship(next, {
      stableKey: `${key}:director:work`,
      personId: directorId,
      organizationId: agencyId,
      startedAt: today,
      kind: "employment:state-agency-director",
      compensation: "paid",
      authority: "directs-others",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Agency director",
        occupationClassification: null,
        locationJurisdictionId: jurisdictionId,
        timeDemand: OFFICE_HOURS(jurisdictionId),
      },
    });
    lead(
      directorId,
      agencyId,
      `${key}:director:role`,
      "leader:agency-director",
    );
    next = must(
      establishPersonnelDesignation(next, {
        stableKey: `${key}:charter`,
        organizationId: agencyId,
        roleKind: "leader:agency-director",
        power: "appointing-authority",
        jurisdictionKey: stateKey!,
        basis: {
          kind: "authored-charter",
          note: "The fictional agency's authored charter makes its director the appointing authority.",
        },
      }),
    ).world;

    // The statutory office that decides settlements, held by a fictional
    // person; the statute names the office, not who holds it.
    const officeId = organization(
      `${key}:commissioner-office`,
      "Commissioner's office (civil service)",
    );
    const commissionerId = contextPerson(`${key}:commissioner`, 52);
    lead(
      commissionerId,
      officeId,
      `${key}:commissioner:role`,
      "leader:commissioner",
    );
    next = must(
      establishPersonnelDesignation(next, {
        stableKey: `${key}:commissioner-office`,
        organizationId: officeId,
        roleKind: "leader:commissioner",
        power: "commissioner-settlement",
        jurisdictionKey: stateKey!,
        basis: { kind: "statute", procedureKey: "mn-commissioner-settlement" },
      }),
    ).world;

    const position = (
      suffix: string,
      title: string,
      agreementCoverage: "covered" | "not-covered",
    ) =>
      must(
        establishPersonnelPosition(next, {
          stableKey: `${key}:position:${suffix}`,
          organizationId: agencyId,
          title,
          classKey: "northstar:records-specialist",
          civilClass: "classified",
          bargainingCoverage: "unknown",
          agreementCoverage,
          note: "Authored position of a fictional agency.",
        }),
      );
    const staff = (
      suffix: string,
      age: number,
      startedAt: IsoDate,
      positionId: EntityId,
      tenure: "permanent" | "probationary",
    ) => {
      const personId = contextPerson(`${key}:staff:${suffix}`, age);
      next = createWorkRelationship(next, {
        stableKey: `${key}:staff:${suffix}:work`,
        personId,
        organizationId: agencyId,
        startedAt,
        kind: "employment:civil-service",
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance,
        initialRole: {
          title: "Records specialist",
          occupationClassification: null,
          locationJurisdictionId: jurisdictionId,
          timeDemand: OFFICE_HOURS(jurisdictionId),
        },
      });
      const workId = next.history.workRelationships.at(-1)!.id;
      next = must(
        establishPersonnelIncumbency(next, {
          stableKey: `${key}:staff:${suffix}:incumbency`,
          positionId,
          workRelationshipId: workId,
          tenure,
          note: "Authored existing staff of a fictional agency; the tenure is a scenario fact, not derived from acquired law.",
        }),
      ).world;
      return { personId, workId };
    };

    let p = position("specialist", "Records specialist", "not-covered");
    next = p.world;
    staff("specialist", 41, yearsBefore(today, 5), p.id, "permanent");
    p = position("represented", "Records specialist (represented)", "covered");
    next = p.world;
    staff("represented", 47, yearsBefore(today, 7), p.id, "permanent");
    p = position("new", "Records specialist (new)", "not-covered");
    next = p.world;
    staff("new", 29, today, p.id, "probationary");
    // A former specialist who resigned in good standing last summer, leaving
    // the position vacant; direct reinstatement is the one appointment route
    // the acquired text supports.
    p = position("vacant", "Records specialist", "not-covered");
    next = p.world;
    const former = staff(
      "former",
      38,
      yearsBefore(today, 8),
      p.id,
      "permanent",
    );
    next = recordWorkStatus(next, {
      stableKey: `${key}:staff:former:separated`,
      workRelationshipId: former.workId,
      effectiveAt: addDays(today, -190),
      status: "ended",
      reason: "Resigned in good standing.",
      provenance,
      supersedesStatusId: workStatusAt(next, former.workId)!.id,
    });

    next = recordWorldEvent(next, {
      stableKey: `${key}:established`,
      type: "civil-personnel.custom-start",
      occurredAt: today,
      recordedAt: today,
      jurisdictionId,
      involvedEntityIds: [directorId, agencyId],
      participants: [
        {
          personId: directorId,
          role: "agency:custom-start",
          detail: "Explicit fictional state agency premise",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["civil-personnel", "authored-fiction", "custom-start"],
      summary: STATE_AGENCY_START_NOTICE,
      context: {
        location: {
          jurisdictionId,
          label: "Northstar Records Service",
          setting: "The start of a working life",
        },
        socialContext: "A fictional state agency with existing staff.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    return { ok: true, world: next };
  } catch (error) {
    return { ok: false, world, reason: (error as Error).message };
  }
}
