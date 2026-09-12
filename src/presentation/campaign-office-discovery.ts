import {
  activeCampaignForCandidate,
  campaignForCandidate,
  candidacyAuthority,
  candidacyEligibility,
  personName,
} from "../simulation";
import type { EntityId, World } from "../simulation";

/** Read-only established alternatives, not a national office/calendar engine. */
export function projectCampaignOffices(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const authority = candidacyAuthority(person.homeJurisdictionId);
  const campaign = campaignForCandidate(world, personId);
  return (authority.pack?.offices ?? []).map((option) => {
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
        authority.scope === "local" ? "Local government" : "State government",
      provider: option.recordedBy.packName,
      eligible: eligibility.eligible,
      eligibility: eligibility.eligible
        ? "Currently eligible under the represented rules. Filing rechecks them."
        : eligibility.blocks.map((block) => block.reason).join(" "),
      timing: upcoming.length
        ? upcoming
            .map(
              (contest) =>
                `${contest.electionDate} — recorded ${contest.provenance.method} contest`,
            )
            .join("; ")
        : "Upcoming election timing is not established in this save.",
      connections: [
        ...(own ? ["Your recorded campaign is for this office."] : []),
        ...[...new Set(contacts)].map(
          (id) =>
            `${personName(world.people[id]!)} is a recorded contestant with whom you have prior contact.`,
        ),
      ],
      gaps: option.unresolvedGaps,
    };
  });
}
