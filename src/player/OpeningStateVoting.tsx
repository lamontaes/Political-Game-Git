import "./opening-state-figures.css";
import { useEffect, useState } from "react";
import { GameSelect } from "./controls/GameSelect";
import {
  queryStateVotingContext,
  NO_SURVEY_TOTAL_REASON,
  type CpsVotingCell,
  type StateVotingContext,
} from "../presentation/state-voting-context";
import { NATIONAL_REPORTED_VOTING_2024 } from "../presentation/opening-state-estimates";

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
        stateUsps ? (
          // No state survey: the national share, marked as the estimate it is.
          <p
            role="status"
            data-problem={
              ready?.unavailableReason &&
              ready.unavailableReason !== NO_SURVEY_TOTAL_REASON
                ? "survey-unavailable"
                : failed === key || ready
                  ? "no-state-survey"
                  : "state-survey-loading"
            }
          >
            Citizen adults who voted:{" "}
            <strong>
              about {Math.round(NATIONAL_REPORTED_VOTING_2024.votedPercent)}%
            </strong>
            <br />
            Estimated from the national average
          </p>
        ) : (
          <p data-problem="no-home-state" />
        )
      ) : (
        <>
          <p>
            Reported registered:{" "}
            <strong>{count(totals.metrics.reportedRegistered)}</strong>
            <br />
            Reported voted:{" "}
            <strong>{count(totals.metrics.reportedVoted)}</strong>
            <br />
            Citizen adults who voted:{" "}
            <strong>
              {rate(
                totals.metrics.votedCitizenPercent,
                totals.metrics.votedCitizenMoe,
              )}
            </strong>
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
              <p data-problem="breakdown-unavailable" />
            )}
          </details>
        </>
      )}
    </section>
  );
}
