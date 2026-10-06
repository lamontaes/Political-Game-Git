import {
  activeWorkRelationshipsAt,
  currentOfficeWorkflowPreference,
  governingOfficeForPerson,
  measureProceduralStage,
  personName,
  type EntityId,
  type GoverningOffice,
  type LegislativeMeasureRecord,
  type OfficeCaseworkWorkflowMode,
  type OfficeVotingWorkflowMode,
  type PublicProgramAppropriationRecord,
  type World,
} from "../simulation";
import {
  dollars,
  programAppropriations,
  programCapacity,
  programCommitments,
  programInstallments,
  programOutturns,
  programAuthority,
  programPosition,
  publicProgramKeys,
  type ProgramAuthority,
} from "../simulation/governing/public-program";
import { deliveredServiceSentence } from "./law-effects-prose";
import { proseDate } from "./prose-dates";

/**
 * The officeholder's desk behind Work > "Your office": what the office is
 * working with, what has been put to it, what it has already committed, who
 * works there, which of the player's bills are moving and how the office
 * handles casework.
 *
 * Reading writes nothing. Every line here comes from a record; where the
 * World holds no record the projection says so in words rather than showing a
 * zero, a vacancy or an invented name. The commitment controls are offered
 * only where the domain itself reports the authority as available, so a
 * citizen reading the same panel sees the reason and no control.
 */

export interface OfficeStaffMember {
  readonly personId: EntityId;
  readonly name: string;
  readonly roleTitle: string;
  /** What this person is assigned to, as the role record classifies it. */
  readonly assignment: string | null;
  readonly sinceLine: string;
}

/** One commitment the office has already made. Never a draft. */
export interface OfficeProgramCommitment {
  readonly id: EntityId;
  readonly alternativeTitle: string;
  readonly decidedByName: string;
  readonly authority: string;
  readonly decidedOnLine: string;
  readonly totalLine: string;
  readonly installmentLines: readonly string[];
  readonly postedCount: number;
  readonly failedCount: number;
  readonly failureReasons: readonly string[];
}

export interface OfficeProgramAppropriation {
  readonly id: EntityId;
  readonly amountLine: string;
  readonly windowLine: string;
  readonly uncommittedLine: string;
  readonly basisNote: string;
  readonly authority: ProgramAuthority;
  /**
   * Why no commitment control is offered even though the authority holds:
   * nothing has been put to this office to decide between.
   */
  readonly alternativesNote: string | null;
}

export interface OfficeProgram {
  readonly programKey: string;
  /** The service in the office's own words, when a capacity record names it. */
  readonly serviceLabel: string | null;
  readonly objectiveLines: readonly string[];
  readonly appropriations: readonly OfficeProgramAppropriation[];
  readonly commitments: readonly OfficeProgramCommitment[];
  readonly outturnLines: readonly string[];
}

export interface OfficeMeasure {
  readonly measureId: EntityId;
  readonly designation: string;
  readonly shortTitle: string;
  readonly introducedLine: string;
  /** The last recorded procedural step, or nothing recorded past filing. */
  readonly stageLine: string;
}

export interface OfficeCasework {
  readonly officeRelationshipId: EntityId;
  readonly mode: OfficeCaseworkWorkflowMode | null;
  readonly recordedLine: string | null;
  /**
   * The office's recorded voting workflow, carried through unchanged when
   * casework alone is changed. The desk is a governor's, and a governor casts
   * no votes, so this is null unless a record already holds one; the desk
   * never invents a voting preference the player did not choose.
   */
  readonly votingMode: OfficeVotingWorkflowMode | null;
  readonly openCases: readonly {
    readonly id: EntityId;
    readonly residentName: string;
    readonly reasonLine: string;
  }[];
  readonly weeklyLines: readonly string[];
}

export interface GoverningOfficeDesk {
  readonly officeTitle: string;
  readonly termLine: string;
  readonly programs: readonly OfficeProgram[];
  /** Why the programs section is empty, when it is. */
  readonly programsNote: string | null;
  readonly staff: readonly OfficeStaffMember[];
  readonly staffNote: string | null;
  readonly measures: readonly OfficeMeasure[];
  readonly measuresNote: string | null;
  readonly casework: OfficeCasework | null;
  readonly caseworkNote: string | null;
}

function assignmentOf(classification: string | null): string | null {
  if (!classification) return null;
  const tail = classification.includes(":")
    ? classification.slice(classification.lastIndexOf(":") + 1)
    : classification;
  return tail.replaceAll("-", " ");
}

function officeRelationshipId(
  world: World,
  personId: EntityId,
  office: GoverningOffice,
): EntityId | null {
  if (!office.organizationId) return null;
  return (
    activeWorkRelationshipsAt(world, personId).find(
      ({ relationship }) =>
        relationship.organizationId === office.organizationId,
    )?.relationship.id ?? null
  );
}

function staffOf(
  world: World,
  office: GoverningOffice,
): readonly OfficeStaffMember[] {
  if (!office.organizationId) return [];
  const staff: OfficeStaffMember[] = [];
  for (const personId of world.personOrder) {
    if (personId === office.holderPersonId) continue;
    const person = world.people[personId];
    if (!person) continue;
    for (const { relationship, role } of activeWorkRelationshipsAt(
      world,
      personId,
    )) {
      if (relationship.organizationId !== office.organizationId) continue;
      staff.push({
        personId,
        name: personName(person),
        roleTitle: role.title,
        assignment: assignmentOf(role.occupationClassification),
        sinceLine: `Working here since ${proseDate(relationship.startedAt)}.`,
      });
    }
  }
  return staff;
}

function commitmentView(
  world: World,
  programKey: string,
  appropriationIds: ReadonlySet<EntityId>,
): readonly OfficeProgramCommitment[] {
  const installments = programInstallments(world, programKey);
  return programCommitments(world, programKey)
    .filter((record) => appropriationIds.has(record.appropriationId))
    .map((record) => {
      const own = installments.filter(
        (posting) => posting.commitmentId === record.id,
      );
      const decidedBy = world.people[record.decidedByPersonId];
      const total = record.installments.reduce(
        (sum, plan) => sum + plan.amount.minorUnits,
        0,
      );
      return {
        id: record.id,
        alternativeTitle: record.alternativeTitle,
        decidedByName: decidedBy ? personName(decidedBy) : "No current record",
        authority: record.authority,
        decidedOnLine: `Committed ${proseDate(record.recordedAt)}.`,
        totalLine:
          total === 0
            ? "No money committed."
            : `${dollars({ minorUnits: total, currency: record.installments[0]!.amount.currency })} committed across ${record.installments.length} ${record.installments.length === 1 ? "payment" : "payments"}.`,
        installmentLines: record.installments.map(
          (plan, index) =>
            `${dollars(plan.amount)} for ${plan.purpose}, due ${proseDate(plan.dueAt)}${
              own.find((posting) => posting.installmentIndex === index)
                ?.status === "posted"
                ? " — paid"
                : own.find((posting) => posting.installmentIndex === index)
                      ?.status === "failed"
                  ? " — did not pay"
                  : ""
            }.`,
        ),
        postedCount: own.filter((posting) => posting.status === "posted")
          .length,
        failedCount: own.filter((posting) => posting.status === "failed")
          .length,
        failureReasons: own.flatMap((posting) =>
          posting.status === "failed" && posting.reason ? [posting.reason] : [],
        ),
      };
    });
}

function appropriationView(
  world: World,
  personId: EntityId,
  record: PublicProgramAppropriationRecord,
): OfficeProgramAppropriation {
  const authority = programAuthority(
    world,
    personId,
    { kind: "state-executive" },
    record,
  );
  const position = programPosition(world, record.programKey, record.id);
  return {
    id: record.id,
    amountLine: `${dollars(record.amount)} appropriated.`,
    windowLine: `Available ${proseDate(record.availableFrom)} through ${proseDate(record.availableThrough)}.`,
    uncommittedLine: `${dollars(position.uncommitted)} of it is still uncommitted.`,
    basisNote: record.basis.note,
    authority,
    alternativesNote:
      authority.status === "available"
        ? "No alternatives have been put to this office for this appropriation, so there is nothing to decide between yet."
        : null,
  };
}

function programView(
  world: World,
  personId: EntityId,
  office: GoverningOffice,
  programKey: string,
): OfficeProgram | null {
  const appropriations = programAppropriations(world, programKey).filter(
    (record) => record.jurisdictionId === office.jurisdictionId,
  );
  const capacity = programCapacity(world, programKey);
  const inJurisdiction =
    appropriations.length > 0 ||
    capacity?.jurisdictionId === office.jurisdictionId;
  if (!inJurisdiction) return null;
  const position = programPosition(world, programKey);
  const objective: string[] = [];
  if (capacity && capacity.jurisdictionId === office.jurisdictionId) {
    // The count in service is the latest recorded one, so this line and the
    // outturn below it cannot disagree once delivered work has returned units
    // to service. The declared figure is only where the record started.
    objective.push(
      `${position.unitsOperational ?? capacity.unitsOperational} of ${capacity.unitsTotal} ${capacity.unitLabel} are in service.`,
      `Running it costs ${dollars(capacity.monthlyOperatingNeed)} a month.`,
      capacity.restorationCostPerUnit
        ? `Returning one ${capacity.unitLabel.replace(/e?s$/, "")} to service costs ${dollars(capacity.restorationCostPerUnit)}.`
        : "Nobody has established what returning one to service would cost.",
      capacity.basis.note,
    );
  } else {
    objective.push(
      "No capacity record establishes what this service has to work with.",
    );
  }
  // Nothing paid yet is not "0.0 months of cover"; it is simply not a line.
  if (
    position.operatingMonthsPosted &&
    Number(position.operatingMonthsPosted) > 0
  ) {
    objective.push(
      `Money already paid covers ${position.operatingMonthsPosted} months of operating cost.`,
    );
  }
  return {
    programKey,
    serviceLabel:
      capacity && capacity.jurisdictionId === office.jurisdictionId
        ? capacity.serviceLabel
        : null,
    objectiveLines: objective,
    appropriations: appropriations.map((record) =>
      appropriationView(world, personId, record),
    ),
    commitments: commitmentView(
      world,
      programKey,
      new Set(appropriations.map((record) => record.id)),
    ),
    outturnLines: programOutturns(world, programKey).flatMap((record) =>
      record.serviceLabel?.trim() &&
      record.unitLabel?.trim() &&
      record.placeLabel?.trim()
        ? [
            deliveredServiceSentence({
              serviceLabel: record.serviceLabel,
              unitLabel: record.unitLabel,
              placeLabel: record.placeLabel,
              deliveredAt: record.recordedAt,
              restoredUnits: record.restoredUnits,
            }),
          ]
        : [],
    ),
  };
}

function measuresOf(
  world: World,
  personId: EntityId,
): readonly OfficeMeasure[] {
  const measures: readonly LegislativeMeasureRecord[] =
    world.history.legislativeMeasures ?? [];
  return measures
    .filter((record) => record.sponsorPersonId === personId)
    .map((record) => {
      const stage = measureProceduralStage(world, record.id);
      return {
        measureId: record.id,
        designation: record.designation,
        shortTitle: record.shortTitle,
        introducedLine: `Filed ${proseDate(record.introducedAt)}.`,
        stageLine: stage.lastActionKind
          ? `Last step recorded: ${stage.lastActionKind.replaceAll("-", " ")}.`
          : "No procedural step is recorded past filing.",
      };
    });
}

export function projectGoverningOfficeDesk(
  world: World,
  personId: EntityId,
): GoverningOfficeDesk | null {
  const office = governingOfficeForPerson(world, personId);
  if (!office) return null;
  const programs = publicProgramKeys(world).flatMap((programKey) => {
    const view = programView(world, personId, office, programKey);
    return view ? [view] : [];
  });
  const staff = staffOf(world, office);
  const measures = measuresOf(world, personId);
  const relationshipId = officeRelationshipId(world, personId, office);
  const preference = relationshipId
    ? currentOfficeWorkflowPreference(world, personId, relationshipId)
    : null;
  const openEvents = relationshipId
    ? world.history.events.filter(
        (event) =>
          event.type === "office.case-opened" &&
          event.tags.includes(`office-relationship:${relationshipId}`) &&
          !world.history.events.some(
            (closed) =>
              closed.type === "office.case-closed" &&
              closed.tags.includes(`case:${event.id}`),
          ),
      )
    : [];
  const openCases =
    preference?.caseworkMode === "player-handles-all" ||
    preference?.caseworkMode === "staff-routine-player-exceptions"
      ? openEvents.map((event) => {
          const residentId = event.participants.find(
            ({ role }) => role === "focus:subject",
          )?.personId;
          const reason = event.tags.find((tag) => tag.startsWith("reason:"));
          const reasonLine =
            reason === "reason:law-cost"
              ? "a law that cost them something"
              : reason === "reason:lived-outcome"
                ? "what happened to them"
                : reason === "reason:official-view"
                  ? "your recorded actions"
                  : reason === "reason:organized-opposition"
                    ? "a law they organized against"
                    : "a general opinion call";
          return {
            id: event.id,
            residentName: residentId
              ? personName(world.people[residentId]!)
              : "A constituent",
            reasonLine,
          };
        })
      : [];
  const weekStart = new Date(`${world.currentDate}T00:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const weeklyLines = relationshipId
    ? world.history.events
        .filter(
          (event) =>
            event.type === "office.case-closed" &&
            event.tags.includes(`office-relationship:${relationshipId}`) &&
            Date.parse(`${event.occurredAt}T00:00:00Z`) >= weekStart.getTime(),
        )
        .map((event) => {
          const residentId = event.participants.find(
            ({ role }) => role === "focus:subject",
          )?.personId;
          const reason = event.tags.find((tag) => tag.startsWith("reason:"));
          const answer = event.tags
            .find((tag) => tag.startsWith("answer:"))
            ?.slice("answer:".length);
          const about =
            reason === "reason:law-cost"
              ? "the effect of a law"
              : reason === "reason:lived-outcome"
                ? "what happened to them"
                : reason === "reason:official-view"
                  ? "your record in office"
                  : reason === "reason:organized-opposition"
                    ? "a law they organized against"
                    : "a general opinion call";
          const result =
            answer === "help"
              ? "helped"
              : answer === "refer"
                ? "referred them"
                : answer === "cannot-help"
                  ? "could not help"
                  : "ignored the request";
          const resident = residentId ? world.people[residentId] : null;
          return `${resident ? personName(resident) : "A constituent"}, about ${about}: ${result}.`;
        })
    : [];
  return {
    officeTitle: office.title,
    termLine: office.termEndsAt
      ? `Your term runs until ${proseDate(office.termEndsAt)}.`
      : "Your term's end date is not established.",
    programs,
    programsNote:
      programs.length === 0
        ? "No program of this government has a record here yet — no service capacity, no appropriation and no commitment."
        : null,
    staff,
    staffNote:
      staff.length === 0
        ? "Nobody is recorded as working for this office."
        : null,
    measures,
    measuresNote:
      measures.length === 0
        ? "No measure in this world names you as its sponsor."
        : null,
    casework: relationshipId
      ? {
          officeRelationshipId: relationshipId,
          mode: preference?.caseworkMode ?? null,
          recordedLine: preference
            ? `Recorded ${proseDate(preference.recordedAt)}.`
            : null,
          votingMode: preference?.votingMode ?? null,
          openCases,
          weeklyLines,
        }
      : null,
    caseworkNote:
      relationshipId === null
        ? "This office has no recorded employment relationship, so how it handles casework cannot be recorded against it yet."
        : null,
  };
}
