import { useMemo } from "react";

import "./campaign-workspace.css";
import { projectCampaignSpendingReports } from "../presentation/campaign-spending-reports";
import type { EntityId, World } from "../simulation";
import { readableCampaignDate } from "./CampaignWorkspace";

/**
 * The spending reports the campaigns in this race have filed: every payment,
 * to whom, for what and how much. Public filings, read like any other public
 * record; opening one spends no time.
 */
export function CampaignSpendingReports({
  world,
  personId,
}: {
  readonly world: World;
  readonly personId: EntityId;
}) {
  const committees = useMemo(
    () => projectCampaignSpendingReports(world, personId),
    [world, personId],
  );
  if (committees.length === 0) return null;
  return (
    <section
      className="game-campaign-spending"
      data-testid="campaign-spending-reports"
      aria-labelledby="campaign-spending-title"
    >
      <h3 id="campaign-spending-title">Spending reports</h3>
      {committees.map((committee) => (
        <div key={committee.key} data-testid="campaign-spending-committee">
          <h4>{committee.heading}</h4>
          {committee.reports.length === 0 ? (
            <p className="game-note">
              {committee.yours
                ? "Your committee has not filed a spending report yet."
                : "No spending report filed yet."}
            </p>
          ) : (
            committee.reports.map((report) => (
              <details key={report.key} data-testid="campaign-spending-report">
                <summary>
                  Filed {readableCampaignDate(report.filedOn)}: {report.total}{" "}
                  in{" "}
                  {report.lines.length === 1
                    ? "one payment"
                    : `${report.lines.length} payments`}
                </summary>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Paid to</th>
                      <th scope="col">For</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Spent to date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lines.map((line) => (
                      <tr key={line.key}>
                        <td>{readableCampaignDate(line.date)}</td>
                        <td>{line.payee}</td>
                        <td>{line.purpose}</td>
                        <td>{line.amount}</td>
                        <td>{line.runningTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ))
          )}
        </div>
      ))}
    </section>
  );
}
