import type { EntityId, World } from "../simulation";
import {
  decideMemberBallot,
  memberBallotLabel,
  memberVoteRows,
} from "../presentation/member-votes";
import type { MemberBallot } from "../simulation/governing/member-ballots";

const BALLOTS: readonly MemberBallot[] = ["yea", "nay", "present-not-voting"];

/**
 * The votes in front of a seated member. Nobody votes for the player: a
 * member who has not decided by the day of the vote is recorded absent.
 * Deciding here records the ballot and nothing else; it moves no time.
 */
export function MemberVotesPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const rows = memberVoteRows(world, personId);
  if (rows.length === 0) return null;
  return (
    <section className="member-votes" data-testid="member-votes">
      <h3>Votes coming up</h3>
      <p>
        If you have not decided by the day of a vote, you are recorded absent.
      </p>
      <ul>
        {rows.map((row) => (
          <li key={row.key} data-testid="member-vote">
            <strong>{row.bill}</strong>
            <p>
              {row.asks} {row.when}
            </p>
            <div role="group" aria-label={`Your vote on ${row.bill}`}>
              {BALLOTS.map((ballot) => (
                <button
                  key={ballot}
                  type="button"
                  className="ui-action"
                  aria-pressed={row.ballot === ballot}
                  data-testid={`member-vote-${ballot}`}
                  onClick={() => {
                    const next = decideMemberBallot(
                      world,
                      personId,
                      row.question,
                      ballot,
                    );
                    if (next !== world) onWorldChange(next);
                  }}
                >
                  {memberBallotLabel(ballot)}
                </button>
              ))}
            </div>
            {row.ballot ? (
              <p role="status">
                You will vote: {memberBallotLabel(row.ballot)}.
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
