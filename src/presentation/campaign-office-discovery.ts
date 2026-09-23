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
import { campaignElectionDate } from "./campaign-projection";
import { proseDate } from "./prose-dates";

/** Read-only established alternatives, not a national office/calendar engine. */
export function projectCampaignOffices(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const authority = candidacyAuthority(person.homeJurisdictionId);
  const campaign = campaignForCandidate(world, personId);
  return electiveOfficesForJurisdiction(person.homeJurisdictionId).map(
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
      return {
        officeKey: option.officeKey,
        title: option.office.title,
        governmentLevel:
          authority.scope === "local" ||
          localGoverningBodyIdentityForOfficeKey(option.officeKey) !== null
            ? "Local government"
            : "State government",
        provider: option.recordedBy.packName,
        eligible: eligibility.eligible,
        eligibility: eligibility.eligible
          ? "Currently eligible under the represented rules. Filing rechecks them."
          : eligibility.blocks.map((block) => block.reason).join(" "),
        // The contest already on the record, else the office's own calendar:
        // the same date a filing today would stand in.
        timing: `The next election is ${proseDate(
          upcoming[0]?.electionDate ??
            campaignElectionDate(
              world,
              person.homeJurisdictionId,
              option.officeKey,
            ),
        )}.`,
        connections: [
          ...(own ? ["Your recorded campaign is for this office."] : []),
          ...[...new Set(contacts)].map(
            (id) =>
              `${personName(world.people[id]!)} is a recorded contestant with whom you have prior contact.`,
          ),
        ],
        gaps: option.unresolvedGaps,
      };
    },
  );
}
