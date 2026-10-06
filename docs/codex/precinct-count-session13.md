# Precinct returns reuse the same voter count

Before: the canonical voter count returned only a winner and aggregate candidate totals.

After: that same loop groups its ballots by saved precinct membership, and the resolver retains the rows on the election result. Candidate totals and the winner remain unchanged. This part supplies recorded returns for election night; the played scene remains unfinished.

## Saved count and authority

Inspected: countRecordedVoterBallots returns byPrecinct alongside its existing totals. The rows include townId, mapId, precinctKey, ballotsCast and candidate tallies. The resolver alone saves them as optional ElectionContestResultRecord.precinctTallies. It rejects duplicate rows, maps unavailable on election day, inconsistent ballot totals and sums differing from the aggregate count.

The local election handler forwards the same ward-admitted count. Deceased candidates remain on the saved ballot with zero votes. A current-day local count can establish today's estimated membership; late counts never create past membership. Old saves or manually supplied results without precinct evidence retain an absent report, rather than an invented breakdown.

Measured: four focused checks pass. They verify unchanged winner and totals, exact precinct sums, save/reload, admission filtering, invalid returns and unchanged national result output. Configured application and Node typing pass. The inherited Medicaid release declaration mismatch remains red; it is not filtered or overridden.

## Remaining journey

This part depends on the precinct membership producer in #2362. Session 7 opening and Session 6 move integration remain separate. Current main's campaign support-share counter still differs from the published election repair; no support share is converted into a precinct return. That repair and the next-day staff closure must be received before ordinary campaign-night proof.

Reporting order, shared scene beats, speech/skip/return and the two natural night routes remain unfinished. The filing screenshots establish filing and continuation only.

Method: an unresampled random-place small world supplies authored candidate beliefs for these counting regressions. These are source checks, not a played election. Receipts are in docs/codex/evidence/session13-precinct-count. No annual benchmark was started.
