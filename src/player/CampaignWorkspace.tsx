import { useEffect, useRef } from "react";

import type { EntityId } from "../simulation";
import type { RunECampaignProjection } from "../presentation/slice-e-campaign";

interface CampaignWorkspaceProps {
  readonly projection: RunECampaignProjection;
  readonly onFile: () => void;
  readonly onPerformAction: (actionId: EntityId) => void;
  readonly onReachElection: (activityId: EntityId) => void;
  readonly onOpenCalendar: () => void;
  readonly onClose: () => void;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatMoney(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

function statusLabel(status: RunECampaignProjection["phase"]): string {
  if (status === "not-filed") return "Ready to file";
  if (status === "active") return "Campaign active";
  if (status === "won") return "Election won";
  if (status === "lost") return "Election lost";
  return "Campaign closed";
}

export function CampaignWorkspace({
  projection,
  onFile,
  onPerformAction,
  onReachElection,
  onOpenCalendar,
  onClose,
}: CampaignWorkspaceProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const fundraisingComplete = projection.fundraising?.resultId !== null;
  const outreachComplete = projection.outreach?.resultId !== null;
  const terminal = projection.phase === "won" || projection.phase === "lost";

  return (
    <section
      className="campaign-workspace"
      aria-labelledby="campaign-workspace-title"
      data-testid="campaign-workspace"
      data-campaign-phase={projection.phase}
    >
      <header className="campaign-workspace-header">
        <div>
          <p>Local council contest</p>
          <h2 id="campaign-workspace-title">Campaign</h2>
          <span>{statusLabel(projection.phase)}</span>
        </div>
        <button ref={closeRef} type="button" onClick={onClose}>
          Return to office
        </button>
      </header>

      {projection.phase === "not-filed" ? (
        <div className="campaign-filing-card">
          <div>
            <p className="campaign-kicker">A decision with a public record</p>
            <h3>Run for {projection.officeTitle}</h3>
            <p>
              File as {projection.candidateName}, establish a campaign, and
              enter the contest against {projection.rivalNames.join(", ")}.
            </p>
          </div>
          <dl className="campaign-filing-facts">
            <div>
              <dt>Election</dt>
              <dd>{formatDate(projection.electionDate)}</dd>
            </div>
            <div>
              <dt>Opening cash</dt>
              <dd>{formatMoney(0, projection.treasury.currency)}</dd>
            </div>
            <div>
              <dt>What filing creates</dt>
              <dd>
                Contest, campaign organization, treasury, staff role, and public
                history
              </dd>
            </div>
          </dl>
          <button
            className="campaign-primary-action"
            type="button"
            onClick={onFile}
            data-testid="campaign-file"
          >
            File candidacy
          </button>
          <small>Local election details shown here may change.</small>
        </div>
      ) : (
        <>
          <div className="campaign-status-strip">
            <div>
              <span>Candidate</span>
              <strong>{projection.candidateName}</strong>
              <small>{projection.officeTitle}</small>
            </div>
            <div>
              <span>Election</span>
              <strong>{formatDate(projection.electionDate)}</strong>
              <small>Election day</small>
            </div>
            <div>
              <span>Campaign cash</span>
              <strong data-testid="campaign-treasury">
                {formatMoney(
                  projection.treasury.minorUnits,
                  projection.treasury.currency,
                )}
              </strong>
              <small>Campaign organization only</small>
            </div>
          </div>

          <div className="campaign-main-grid">
            <section
              className="campaign-action-column"
              aria-label="Campaign plan"
            >
              <p className="campaign-kicker">Campaign plan</p>
              <h3>{projection.campaignName}</h3>
              {projection.endorsementSummary ? (
                <p
                  className="campaign-endorsement"
                  data-testid="campaign-endorsement"
                >
                  <span>Public support</span>
                  {projection.endorsementSummary}
                </p>
              ) : null}

              <article
                className="campaign-action-card"
                data-complete={fundraisingComplete ? "true" : "false"}
              >
                <span>1 · Fundraising</span>
                <h4>{projection.fundraising?.title}</h4>
                <p>
                  Spend the scheduled hour making supporter calls. Proceeds move
                  into the campaign treasury and stay separate from personal
                  cash.
                </p>
                {projection.fundraising?.raisedAmount ? (
                  <strong data-testid="campaign-raised">
                    Raised{" "}
                    {formatMoney(
                      projection.fundraising.raisedAmount.minorUnits,
                      projection.fundraising.raisedAmount.currency,
                    )}
                  </strong>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (!projection.fundraising) return;
                        if (!projection.fundraising.canPerform) {
                          onOpenCalendar();
                          return;
                        }
                        onPerformAction(projection.fundraising.id);
                      }}
                      disabled={projection.phase !== "active"}
                      data-testid="campaign-fundraise"
                    >
                      {projection.fundraising?.canPerform
                        ? "Do fundraising calls"
                        : "Review earlier Calendar commitments"}
                    </button>
                    {projection.fundraising?.blockingActivityTitles.length ? (
                      <small className="campaign-blocker-note">
                        Complete{" "}
                        {projection.fundraising.blockingActivityTitles.length}{" "}
                        earlier commitment
                        {projection.fundraising.blockingActivityTitles
                          .length === 1
                          ? ""
                          : "s"}{" "}
                        before this campaign block.
                      </small>
                    ) : null}
                  </>
                )}
              </article>

              <article
                className="campaign-action-card"
                data-complete={outreachComplete ? "true" : "false"}
              >
                <span>2 · Outreach</span>
                <h4>{projection.outreach?.title}</h4>
                <p>
                  Spend the scheduled block contacting the community. The field
                  team will return with an uncertain read of the contest.
                </p>
                {outreachComplete ? (
                  <strong>Outreach completed</strong>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!projection.outreach) return;
                      if (!projection.outreach.canPerform) {
                        onOpenCalendar();
                        return;
                      }
                      onPerformAction(projection.outreach.id);
                    }}
                    disabled={
                      projection.phase !== "active" || !fundraisingComplete
                    }
                    data-testid="campaign-outreach"
                  >
                    Do neighborhood outreach
                  </button>
                )}
              </article>

              {!terminal ? (
                <article className="campaign-election-card">
                  <span>3 · Election</span>
                  <h4>Reach election night</h4>
                  <p>
                    Your recorded campaign work shapes the result, but
                    election-night uncertainty can still change the finish.
                  </p>
                  <button
                    type="button"
                    disabled={
                      projection.phase !== "active" ||
                      !fundraisingComplete ||
                      !outreachComplete ||
                      !projection.electionActivityId
                    }
                    onClick={() =>
                      projection.electionActivityId &&
                      onReachElection(projection.electionActivityId)
                    }
                    data-testid="campaign-election"
                  >
                    Reach election night
                  </button>
                </article>
              ) : null}
            </section>

            <aside
              className="campaign-intelligence"
              aria-label="Campaign field memo"
            >
              <p className="campaign-kicker">Field memo</p>
              <h3>What the campaign thinks it knows</h3>
              {projection.feedbackSummary &&
              projection.observedSupportPercent !== null &&
              projection.observationMarginPercent !== null ? (
                <div
                  className="campaign-feedback"
                  data-testid="campaign-feedback"
                >
                  <span>Latest estimate</span>
                  <strong>
                    About {Math.round(projection.observedSupportPercent)}%
                  </strong>
                  <p>
                    ±{Math.round(projection.observationMarginPercent)} points at
                    the memo’s stated confidence. This estimate is imperfect and
                    may be wrong.
                  </p>
                  <small>{projection.feedbackSummary}</small>
                </div>
              ) : (
                <p className="campaign-no-feedback">
                  Staff has no field read yet. Complete a campaign action to
                  receive an uncertain estimate.
                </p>
              )}

              {terminal ? (
                <div
                  className={`campaign-result campaign-result--${projection.phase}`}
                  data-testid="campaign-result"
                >
                  <span>Official result</span>
                  <h3>
                    {projection.phase === "won"
                      ? "You won the election"
                      : "You lost the election"}
                  </h3>
                  <p>
                    {projection.phase === "won"
                      ? "The result is recorded. You can keep working while the next transition remains ahead."
                      : "The result is recorded. Your world, relationships, calendar, and normal play continue."}
                  </p>
                  <ol>
                    {projection.tallies.map((tally) => (
                      <li key={tally.candidatePersonId}>
                        <span>{tally.candidateName}</span>
                        <strong>
                          {tally.votes.toLocaleString("en-US")} votes
                        </strong>
                      </li>
                    ))}
                  </ol>
                  <div className="campaign-result-actions">
                    <button
                      type="button"
                      onClick={onClose}
                      data-testid="campaign-continue"
                    >
                      Continue in office
                    </button>
                    <button type="button" onClick={onOpenCalendar}>
                      Open Calendar
                    </button>
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
