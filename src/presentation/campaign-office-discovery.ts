import {
  activeCampaignForCandidate,
  campaignForCandidate,
  candidacyAuthority,
  candidacyEligibility,
  electiveOfficesForJurisdiction,
  lifePlaceByJurisdictionId,
  localGoverningBodyIdentityForOfficeKey,
  nextStateLegislativeElection,
  personName,
} from "../simulation";
import type { EntityId, World } from "../simulation";

/** Read-only established alternatives, not a national office/calendar engine. */
export function projectCampaignOffices(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const authority = candidacyAuthority(person.homeJurisdictionId);
  const campaign = campaignForCandidate(world, personId);
  const stateKey =
    lifePlaceByJurisdictionId(
      person.homeJurisdictionId,
    )?.stateJurisdictionKey?.replace(/^US-/, "") ?? null;
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
        // The date alone: the player needs when, not how the contest was
        // recorded. A state seat is on the state's regular election before
        // anyone files; a town seat is decided four weeks after filing.
        timing:
          upcoming[0]?.electionDate ??
          (localGoverningBodyIdentityForOfficeKey(option.officeKey) || !stateKey
            ? "The election is four weeks after you file."
            : nextStateLegislativeElection(stateKey, world.currentDate)
                .electionDate),
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
