import { candidacyEligibility } from "../simulation/candidacy";
import { activeCampaignForCandidate } from "../simulation/campaign-queries";
import { recordsWithFieldValue } from "../simulation/history-index";
import { candidateQualificationRuleSet } from "../simulation/candidate-qualification";
import { qualificationTemporalApplicability } from "../simulation/office-qualification-rules";
import {
  nextTownElection,
  FILING_LEAD_DAYS,
  FILING_LEAD_SOURCE,
} from "../simulation/nationwide-world/town-election-calendar";
import { localGoverningBodyIdentityForOfficeKey } from "../simulation/nationwide-world/local-governing-body-candidacy-packs";
import { recordWorldEvent } from "../simulation/world";
import {
  filersForOffice,
  undatedRivalsForOffice,
} from "../simulation/office-filers";
import type { EntityId, World } from "../simulation/types";
import { electionClerksForPerson } from "./election-clerk";
import {
  electionClerkOffices,
  fileThroughElectionClerk,
} from "./election-clerk-offices";

/** An office-scoped read, not a claim that employment establishes legal knowledge.
 * Central scene writers consume the evidence and record what was actually taught.
 */
export function electionClerkSceneOffer(
  world: World,
  playerPersonId: EntityId,
  clerkPersonId: EntityId,
  officeChoiceKey: string,
) {
  const player = world.people[playerPersonId];
  const clerk = electionClerksForPerson(world, playerPersonId).find(
    (row) => row.personId === clerkPersonId,
  );
  const office = electionClerkOffices(world, playerPersonId).find(
    (row) => row.key === officeChoiceKey,
  );
  if (!player || !clerk || !office) return null;
  const eligibility = candidacyEligibility(world, {
    personId: playerPersonId,
    jurisdictionId: player.homeJurisdictionId,
    officeKey: office.officeKey,
    alreadyACandidate:
      activeCampaignForCandidate(world, playerPersonId) !== null,
    districtBinding: office.districtBinding,
    municipalSeatKey: office.municipalSeatKey,
  });
  const local = localGoverningBodyIdentityForOfficeKey(office.officeKey);
  const townCalendar =
    local?.unit.unitType === "municipality" && local.unit.placeGeoid
      ? nextTownElection(
          local.unit.stateUsps,
          local.unit.placeGeoid,
          world.currentDate,
        )
      : null;
  const qualificationRules =
    eligibility.pack && eligibility.office
      ? candidateQualificationRuleSet(
          eligibility.pack.packId,
          eligibility.office.officeKey,
          world.currentDate,
        )
      : null;
  const calendar = {
    electionDate: office.electionDate,
    filingDeadline: office.filingDeadline,
    filingBasis: office.filingBasis,
    townCalendar,
    // A modeled lead is not a verified municipal filing deadline.
    modeledTownLead:
      local?.unit.unitType === "municipality" && !townCalendar
        ? { days: FILING_LEAD_DAYS, source: FILING_LEAD_SOURCE }
        : null,
  };
  const qualificationEvidence = eligibility.qualificationAssessments.map(
    (assessment) => ({
      ...assessment,
      temporalApplicability: assessment.source
        ? qualificationTemporalApplicability(
            assessment.source,
            world.currentDate,
          )
        : null,
    }),
  );
  const reading = clerk.presenceEventId
    ? [
        ...recordsWithFieldValue(
          world.history.events,
          "type",
          "election.clerk-office-examined",
        ),
      ]
        .reverse()
        .find(
          (event) =>
            event.occurredAt === world.currentDate &&
            event.recordedAt <= world.currentDate &&
            event.sequence < world.history.nextSequence &&
            event.tags.includes(`office:${office.officeKey}`) &&
            event.tags.includes(`choice:${officeChoiceKey}`) &&
            event.tags.includes(`presence:${clerk.presenceEventId}`) &&
            event.participants.some(
              (row) =>
                row.personId === playerPersonId &&
                row.role === "other:office-inquirer",
            ) &&
            event.participants.some(
              (row) =>
                row.personId === clerkPersonId &&
                row.role === "other:office-source-reader",
            ),
        )
    : undefined;
  const recordedPacket = reading?.tags.find((tag) =>
    tag.startsWith("office-reading:"),
  );
  const filers = filersForOffice(
    world,
    office.officeKey,
    world.currentDate,
  ).filter((row) => row.candidatePersonId !== playerPersonId);
  const rivalsWithoutFilingDate = undatedRivalsForOffice(
    world,
    office.officeKey,
    world.currentDate,
  ).filter((row) => row.candidatePersonId !== playerPersonId);
  let recordedEvidence: Record<string, unknown> | null = null;
  if (recordedPacket) {
    try {
      const parsed: unknown = JSON.parse(
        recordedPacket.slice("office-reading:".length),
      );
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      )
        recordedEvidence = parsed as Record<string, unknown>;
    } catch {
      // An old or unreadable saved packet does not establish knowledge.
    }
  }
  const readingStillCurrent =
    recordedEvidence !== null &&
    JSON.stringify([
      recordedEvidence.eligibility,
      recordedEvidence.qualificationRules,
      recordedEvidence.qualificationEvidence,
      recordedEvidence.office,
      recordedEvidence.filers,
      recordedEvidence.rivalsWithoutFilingDate,
      recordedEvidence.calendar,
    ]) ===
      JSON.stringify([
        eligibility,
        qualificationRules,
        qualificationEvidence,
        office,
        filers,
        rivalsWithoutFilingDate,
        calendar,
      ]);
  const knowledgeBasis = readingStillCurrent && reading ? [reading.id] : [];
  return {
    version: 1 as const,
    playerPersonId,
    clerkPersonId,
    officeChoiceKey,
    officeKey: office.officeKey,
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
    currentMoment: world.currentMoment,
    presenceEventId: clerk.presenceEventId,
    sourceEntityIds: [
      clerk.roleRecordId,
      clerk.statusRecordId,
      clerk.workRelationshipId,
      clerk.organizationId,
      ...(clerk.presenceEventId ? [clerk.presenceEventId] : []),
    ],
    // Only an actual office consultation establishes these record IDs.
    // Unsupported law fields remain unsupported even after consultation.
    knownRecordIds: knowledgeBasis as readonly EntityId[],
    speakableFacts: readingStillCurrent
      ? {
          officeTitle: { text: office.title, sourceRecordIds: knowledgeBasis },
          eligibilityAssessment: {
            eligible: eligibility.eligible,
            blocks: eligibility.blocks,
            sourceRecordIds: knowledgeBasis,
          },
          qualifications: qualificationEvidence.map((row) => ({
            ...row,
            sourceRecordIds: knowledgeBasis,
          })),
          sourceRecordIds: knowledgeBasis,
        }
      : null,
    office,
    eligibility,
    qualificationRules,
    qualificationEvidence,
    filers,
    rivalsWithoutFilingDate,
    calendar,
    actions: {
      examine: {
        kind: "election-clerk.examine-office" as const,
        officeKey: office.officeKey,
        officeChoiceKey,
      },
      file:
        clerk.presenceEventId && office.eligible && eligibility.eligible
          ? {
              kind: "election-clerk.file" as const,
              officeKey: office.officeKey,
              officeChoiceKey,
            }
          : null,
    },
  };
}

export type ElectionClerkSceneOffer = NonNullable<
  ReturnType<typeof electionClerkSceneOffer>
>;

/** The central turn writer invokes this only for a re-read, accepted examination
 * action. This records consultation, not speech, knowledge, attendance or filing.
 */
export function recordElectionClerkOfficeExamination(
  world: World,
  playerPersonId: EntityId,
  clerkPersonId: EntityId,
  officeChoiceKey: string,
): World {
  const offer = electionClerkSceneOffer(
    world,
    playerPersonId,
    clerkPersonId,
    officeChoiceKey,
  );
  if (!offer?.presenceEventId)
    throw new Error("The clerk is not recorded here with you now.");
  return recordWorldEvent(world, {
    stableKey: `election-clerk:examine:${offer.presenceEventId}:${officeChoiceKey}:${world.history.nextSequence}`,
    type: "election.clerk-office-examined",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: offer.eligibility.office
      ? world.people[playerPersonId]!.homeJurisdictionId
      : null,
    involvedEntityIds: [playerPersonId, clerkPersonId],
    participants: [
      {
        personId: playerPersonId,
        role: "other:office-inquirer",
        detail: offer.officeKey,
      },
      {
        personId: clerkPersonId,
        role: "other:office-source-reader",
        detail: offer.officeKey,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "election-clerk.office-reading.v1",
      `office:${offer.officeKey}`,
      `choice:${officeChoiceKey}`,
      `presence:${offer.presenceEventId}`,
      `office-reading:${JSON.stringify(offer)}`,
    ],
    summary:
      "The clerk examined the recorded qualifications and calendar for the requested office.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** Re-read presence, selected office and dated eligibility at the actual turn.
 * Filing uses the existing canonical writer; central scene writing stays separate.
 */
export function fileFromElectionClerkScene(
  world: World,
  playerPersonId: EntityId,
  clerkPersonId: EntityId,
  officeChoiceKey: string,
): World {
  const offer = electionClerkSceneOffer(
    world,
    playerPersonId,
    clerkPersonId,
    officeChoiceKey,
  );
  if (!offer?.presenceEventId)
    throw new Error("The clerk is not recorded here with you now.");
  if (!offer.actions.file) throw new Error(offer.office.eligibility);
  return fileThroughElectionClerk(world, playerPersonId, officeChoiceKey);
}
