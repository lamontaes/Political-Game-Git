import { useEffect, useState } from "react";
import { GameSelect } from "./controls/GameSelect";
import {
  CPS_STATE_NAMES,
  queryStateVotingContext,
  type CpsVotingCell,
  type StateVotingContext,
} from "../presentation/state-voting-context";

type Breakdown = "sex" | "age" | "raceAndHispanicOrigin";

function count(cell: CpsVotingCell): string {
  return cell.value.state === "HISTORICAL"
    ? cell.value.value.toLocaleString("en-US")
    : "Unavailable";
}

function rate(value: CpsVotingCell, margin: CpsVotingCell): string {
  if (value.value.state !== "HISTORICAL") return "Unavailable";
  const estimate = `${value.value.value.toFixed(1)}%`;
  return margin.value.state === "HISTORICAL"
    ? `${estimate} ± ${margin.value.value.toFixed(1)}`
    : `${estimate} (margin unavailable)`;
}

/** Historical survey context only; opening or changing a table never writes World. */
export function OpeningStateVoting({
  stateUsps,
  asOf,
}: {
  readonly stateUsps: string | null;
  readonly asOf: string;
}) {
  const [result, setResult] = useState<StateVotingContext | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown>("age");
  const key = `${stateUsps}:${asOf}`;
  useEffect(() => {
    if (!stateUsps) return;
    let active = true;
    void queryStateVotingContext({ stateUsps, asOf }).then(
      (next) => {
        if (active) setResult(next);
      },
      () => {
        if (active) setFailed(key);
      },
    );
    return () => {
      active = false;
    };
  }, [stateUsps, asOf, key]);
  const ready =
    result?.stateUsps === stateUsps && result.asOf === asOf ? result : null;
  const totals = ready?.totals;
  const groups = ready?.breakdowns[breakdown] ?? [];
  return (
    <section data-testid="opening-state-voting">
      <h3>Reported voting · November 2024</h3>
      {!totals ? (
        <p role="status">
          {ready?.unavailableReason ??
            (!stateUsps || failed === key
              ? "Voting survey information is unavailable."
              : "Loading voting survey information…")}
        </p>
      ) : (
        <>
          <p>
            Reported registered:{" "}
            <strong>{count(totals.metrics.reportedRegistered)}</strong>
            <br />
            Reported voted:{" "}
            <strong>{count(totals.metrics.reportedVoted)}</strong>
          </p>
          <p>
            Among citizen adults,{" "}
            {rate(
              totals.metrics.votedCitizenPercent,
              totals.metrics.votedCitizenMoe,
            )}{" "}
            reported voting.
          </p>
          <p>
            {stateUsps ? CPS_STATE_NAMES[stateUsps] : totals.geographyName} ·
            Survey estimates, rounded to the nearest 1,000 people.
          </p>
          <details>
            <summary>Voting by age and other groups</summary>
            <label>
              Group by{" "}
              <GameSelect
                aria-label="Group by"
                value={breakdown}
                onChange={(event) =>
                  setBreakdown(event.target.value as Breakdown)
                }
              >
                <option value="age">Age</option>
                <option value="sex">Sex (survey categories)</option>
                <option value="raceAndHispanicOrigin">
                  Race and Hispanic origin
                </option>
              </GameSelect>
            </label>
            <p>
              Rates below are percentages of citizen adults in each group, not
              shares of all voters.
            </p>
            {breakdown === "raceAndHispanicOrigin" ? (
              <p>These categories overlap and must not be added together.</p>
            ) : null}
            {groups.length ? (
              <div className="pg-state-voting-table-wrap">
                <table>
                  <caption>
                    November 2024 reported registration and voting
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Group</th>
                      <th scope="col">Registered</th>
                      <th scope="col">Voted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr key={group.recordId}>
                        <th scope="row">{group.group}</th>
                        <td>
                          {rate(
                            group.metrics.registeredCitizenPercent,
                            group.metrics.registeredCitizenMoe,
                          )}
                        </td>
                        <td>
                          {rate(
                            group.metrics.votedCitizenPercent,
                            group.metrics.votedCitizenMoe,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>This breakdown is unavailable.</p>
            )}
            <p>
              ± shows the margin of error in percentage points. These are
              estimates for adults aged 18 and over rather than a count, and
              being a citizen is not the same as being eligible to vote.
              Registration figures are not available here.
            </p>
          </details>
        </>
      )}
    </section>
  );
}
