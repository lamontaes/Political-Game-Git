import type {
  ChamberMember,
  PresidingOfficerElection,
} from "../../simulation/governing/presiding-officers";
import type {
  JointAssemblyVote,
  JointAssemblyCandidate,
} from "../../simulation/governing/joint-assembly";
import { castBallots, type BallotFacts } from "./ballots";
const PRESIDING_OFFICER_VOTE_EVENT = "governing.presiding-officer-vote";
const CAUCUS_CANDIDATES = 5;

export function electPresidingOfficer(
  facts: BallotFacts,
  input: {
    readonly stableKey: string;
    readonly officeTitle: string;
    readonly members: readonly ChamberMember[];
  },
): PresidingOfficerElection {
  const player = facts.playerPersonId;
  const caucuses = new Map<string, ChamberMember[]>();
  for (const member of input.members)
    caucuses.set(member.party, [...(caucuses.get(member.party) ?? []), member]);
  const caucusVotes: {
    readonly caucus: string;
    readonly vote: JointAssemblyVote;
  }[] = [];
  const nominees: JointAssemblyCandidate[] = [];
  for (const [caucus, members] of [...caucuses.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  )) {
    const standing = members
      .filter((member) => member.personId !== player)
      .sort(
        (a, b) =>
          (a.serviceSince ?? "9999").localeCompare(b.serviceSince ?? "9999") ||
          a.personId.localeCompare(b.personId),
      )
      .slice(0, CAUCUS_CANDIDATES);
    if (standing.length === 0) continue;
    const vote = castBallots(facts, {
      stableKey: `${input.stableKey}:caucus:${caucus}`,
      decisionType: PRESIDING_OFFICER_VOTE_EVENT,
      subjectKind: "context:caucus-nomination",
      describe: () =>
        `A candidate for the caucus's nomination for ${input.officeTitle}.`,
      members,
      candidates: standing.map((member, index) => ({
        key: `person:${member.personId}`,
        personId: member.personId,
        party: caucus,
        incumbent: false,
        seniorMost: index === 0,
      })),
    });
    caucusVotes.push({ caucus, vote });
    const nominee = [...vote.candidates].sort(
      (a, b) => (vote.tallies[b.key] ?? 0) - (vote.tallies[a.key] ?? 0),
    )[0];
    if (nominee && (vote.tallies[nominee.key] ?? 0) > 0)
      nominees.push({ ...nominee, seniorMost: false });
  }
  const floorVote = castBallots(facts, {
    stableKey: `${input.stableKey}:floor`,
    decisionType: PRESIDING_OFFICER_VOTE_EVENT,
    subjectKind: "context:presiding-officer",
    describe: () => `A caucus's nominee for ${input.officeTitle}.`,
    members: input.members,
    candidates: nominees,
  });
  return {
    caucusVotes,
    floorVote,
    winnerPersonId: floorVote.winner?.personId ?? null,
  };
}

// stopgapId: "SG-P14-legislatures-presiding-shortlist"
