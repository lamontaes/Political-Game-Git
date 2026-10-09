import {
  activeCampaignForCandidate,
  campaignForCandidate,
  candidacyAuthority,
  candidacyEligibility,
  electiveOfficesForJurisdiction,
  localGoverningBodyIdentityForOfficeKey,
  personName,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { filingOfficeForSeat } from "../simulation/filing-office";
import {
  availableCampaignElectionDate,
  campaignElectionDateIsEstimated,
} from "./campaign-projection";
import { proseDate } from "./prose-dates";

/** Read-only established alternatives, not a national office/calendar engine. */
export function projectCampaignOffices(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) throw new Error("Person not found");
  const authority = candidacyAuthority(person.homeJurisdictionId);
  const campaign = campaignForCandidate(world, personId);
  const offices = electiveOfficesForJurisdiction(person.homeJurisdictionId).map(
    (option) => {
      const eligibility = candidacyEligibility(world, {
        personId,
        jurisdictionId: person.homeJurisdictionId,
        officeKey: option.officeKey,
        alreadyACandidate: activeCampaignForCandidate(world, personId) !== null,
      });
      const contests = (world.history.electionContests ?? []).filter(
        (contest) =>
          contest.jurisdictionId === person.homeJurisdictionId &&
          contest.office.officeKey === option.officeKey,
      );
      const upcoming = contests
        .filter((contest) => contest.electionDate >= world.currentDate)
        .sort((a, b) => a.electionDate.localeCompare(b.electionDate));
      const contacts = contests.flatMap((contest) =>
        contest.candidatePersonIds.filter(
          (id) =>
            id !== personId &&
            world.history.relationshipInteractions.some(
              (relationship) =>
                relationship.occurredAt <= world.currentDate &&
                relationship.personIds.includes(personId) &&
                relationship.personIds.includes(id),
            ),
        ),
      );
      const own = campaign?.officeKey === option.officeKey;
      const recordedElectionDate = upcoming[0]?.electionDate ?? null;
      const electionDate =
        recordedElectionDate ??
        availableCampaignElectionDate(
          world,
          person.homeJurisdictionId,
          option.officeKey,
        );

      return {
        officeKey: option.officeKey,
        title: option.office.title,
        governmentLevel:
          authority.scope === "local" ||
          localGoverningBodyIdentityForOfficeKey(option.officeKey) !== null
            ? "Local government"
            : "State government",
        provider: option.recordedBy.packName,
        eligible: eligibility.eligible && electionDate !== null,
        eligibility: [
          electionDate === null
            ? "Election calendar: not on record"
            : eligibility.eligible
              ? "Eligible"
              : eligibility.blocks.map((block) => block.reason).join(" · "),
          eligibility.minimumAge &&
          !eligibility.blocks.some((block) =>
            block.reason.startsWith("Minimum age"),
          )
            ? `Minimum age: ${eligibility.minimumAge.value}${eligibility.minimumAge.estimated ? " (estimated)" : ""}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        // The contest already on the record, else the office's own calendar:
        // the same date a filing today would stand in.
        electionDate,
        timing: electionDate
          ? `Next election: ${proseDate(electionDate)}${campaignElectionDateIsEstimated(world, option.officeKey) ? " (estimated)" : ""}`
          : null,
        connections: [
          ...(own ? ["Your campaign"] : []),
          ...[...new Set(contacts)].map(
            (id) => `Contestant you know: ${personName(world.people[id]!)}`,
          ),
        ],
        gaps: option.unresolvedGaps,
      };
    },
  );
  // ESTIMATED FROM AVERAGE: an office with no date on record takes the
  // earliest election date among the other offices on the same ballot.
  const dated = offices
    .map((office) => office.electionDate)
    .filter((date): date is NonNullable<typeof date> => date !== null)
    .sort();
  const estimate = dated[0] ?? null;
  return offices.map((office) =>
    office.timing === null && estimate
      ? {
          ...office,
          timing: `Next election: ${proseDate(estimate)} (estimated)`,
        }
      : office,
  );
}

/**
 * The offices the Campaigns screen lists for filing. A seat whose filing goes
 * to a counter in the world is filed only there (owner, October 8, 2026:
 * "running starts only at the clerk's office"), so it leaves the list; the
 * list keeps the seats that have no counter yet.
 */
export function projectCampaignListOffices(world: World, personId: EntityId) {
  return projectCampaignOffices(world, personId).filter(
    (office) => filingOfficeForSeat(world, office.officeKey) === null,
  );
}
