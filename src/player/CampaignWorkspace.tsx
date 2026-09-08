import { useMemo, useState } from "react";

import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../presentation/campaign-projection";
import type {
  CampaignActionKind,
  EntityId,
  MoneyAmount,
  World,
} from "../simulation";

/**
 * Running for something.
 *
 * The screen answers, in order: is there anything here to run for, what is the
 * committee's position, what could this afternoon be spent on, what did the
 * last one come to, and how long is left. It shows the campaign's own field
 * memo and never anything stronger — there is no bar filling up, no percentage
 * to beat, and no way to tell from this screen whether the memo is right.
 *
 * Where the game cannot honestly offer a candidacy it says so in a sentence and
 * shows nothing else, which is the only decent alternative to inventing an
 * office.
 */

export interface CampaignWorkspaceProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}

function money(amount: MoneyAmount): string {
  return `${amount.currency} ${(amount.minorUnits / 100).toFixed(2)}`;
}

export function CampaignWorkspace({
  world,
  personId,
  onWorldChange,
}: CampaignWorkspaceProps) {
  const view = useMemo(
    () => projectCampaign(world, personId),
    [world, personId],
  );
  const [problem, setProblem] = useState<string | null>(null);

  function run<T>(work: () => T, apply: (value: T) => void) {
    try {
      apply(work());
      setProblem(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
  }

  function file() {
    run(
      () => fileForOffice(world, personId),
      (next) => onWorldChange(next),
    );
  }

  function spend(kind: CampaignActionKind) {
    run(
      () => spendAnAfternoon(world, personId, kind),
      (next) => {
        if (next === world) {
          setProblem("Something already on the calendar has to happen first.");
          return;
        }
        onWorldChange(next);
      },
    );
  }

  if (view.phase === "unavailable") {
    return (
      <section className="game-campaign" data-testid="campaign-section">
        <h2>Standing for something</h2>
        <p className="game-note" data-testid="campaign-unavailable">
          {view.unavailableReason}
        </p>
      </section>
    );
  }

  return (
    <section className="game-campaign" data-testid="campaign-section">
      <h2>Standing for something</h2>

      {view.phase === "can-file" ? (
        <div data-testid="campaign-offer">
          <p>
            There is a {view.officeTitle} to be filled
            {view.placeName ? ` in ${view.placeName}` : ""}. Nobody has asked{" "}
            {view.candidateName} to stand for it. That is not usually how it
            starts.
          </p>
          {view.officeAuthority ? (
            <p className="game-campaign-authority">{view.officeAuthority}</p>
          ) : null}
          <button type="button" data-testid="file-candidacy" onClick={file}>
            Put their name in
            <small>The committee opens with nothing in it.</small>
          </button>
          {view.openQuestions.length > 0 ? (
            <details className="game-campaign-gaps">
              <summary>What the game does not know about this</summary>
              <ul>
                {view.openQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {view.campaignId ? (
        <>
          <p className="game-band" data-testid="campaign-band">
            {view.committeeName}
            {view.daysLeft !== null
              ? ` · ${view.daysLeft} ${view.daysLeft === 1 ? "day" : "days"} to go`
              : ` · decided ${view.electionDate}`}
          </p>
          <p data-testid="campaign-opponents">
            Running against {view.opponentNames.join(", ")}.
          </p>
          <p data-testid="campaign-treasury">
            The committee has {money(view.treasury)}.
          </p>

          {view.reading ? (
            <p className="game-campaign-memo" data-testid="campaign-memo">
              {view.reading.summary}
              {view.reading.marginPercent !== null ? (
                <small>
                  Somebody&rsquo;s estimate from the calls they made. The margin
                  is what they are willing to claim, and some weeks it is
                  further out than that.
                </small>
              ) : null}
            </p>
          ) : view.phase === "active" ? (
            <p className="game-note" data-testid="campaign-no-memo">
              Nobody has counted anything yet.
            </p>
          ) : null}

          {view.offers.length > 0 ? (
            <div className="game-choices" data-testid="campaign-offers">
              {view.offers.map((offer) => (
                <button
                  key={offer.kind}
                  type="button"
                  data-testid={`campaign-${offer.kind}`}
                  disabled={offer.unavailable !== null}
                  title={offer.unavailable ?? undefined}
                  onClick={() => spend(offer.kind)}
                >
                  {offer.label}
                  <small>{offer.unavailable ?? offer.cost}</small>
                </button>
              ))}
            </div>
          ) : null}

          {view.sessions.length > 0 ? (
            <ul className="game-campaign-log" data-testid="campaign-log">
              {view.sessions.map((session) => (
                <li key={session.id}>
                  <strong>{session.title}</strong> · {session.on}
                  {session.outcome ? <span> — {session.outcome}</span> : null}
                  {session.blockedBy.length > 0 ? (
                    <span> — waiting on {session.blockedBy.join(", ")}.</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {view.tallies.length > 0 ? (
            <div data-testid="campaign-result">
              <p className="game-scene" data-testid="campaign-afterword">
                {view.afterword}
              </p>
              <ul className="game-campaign-tallies">
                {view.tallies.map((tally) => (
                  <li key={tally.candidatePersonId}>
                    {tally.candidateName}
                    {tally.isThisCandidate ? " (them)" : ""} —{" "}
                    {(tally.voteShare * 100).toFixed(1)}%
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {problem ? (
        <p className="game-problem" data-testid="campaign-problem">
          {problem}
        </p>
      ) : null}
    </section>
  );
}
