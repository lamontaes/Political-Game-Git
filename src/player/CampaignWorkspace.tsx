import { useMemo, useState } from "react";

import "./campaign-workspace.css";
import { projectCampaignOffices } from "../presentation/campaign-office-discovery";

import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../presentation/campaign-projection";
import {
  commitCampaignStrategy,
  projectCampaignStrategy,
  projectLatestCampaignStrategyReport,
} from "../presentation/campaign-strategy";
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
  const [selectedOfficeKey, setSelectedOfficeKey] = useState<string | null>(
    null,
  );
  const offices = useMemo(
    () => projectCampaignOffices(world, personId),
    [world, personId],
  );
  const selectedOffice =
    offices.find((office) => office.officeKey === selectedOfficeKey) ?? null;
  const view = useMemo(
    () => projectCampaign(world, personId, selectedOfficeKey),
    [world, personId, selectedOfficeKey],
  );
  const strategy = useMemo(
    () => projectCampaignStrategy(world, personId),
    [world, personId],
  );
  const strategyReport = useMemo(
    () => projectLatestCampaignStrategyReport(world, personId),
    [world, personId],
  );
  const [problem, setProblem] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] =
    useState<CampaignActionKind | null>(null);
  const [selectedGeography, setSelectedGeography] = useState<string | null>(
    null,
  );
  const [selectedSpending, setSelectedSpending] = useState<string | null>(null);

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
      () => fileForOffice(world, personId, null, selectedOfficeKey),
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

  const priorityKey = strategy?.priorityChoices.some(
    (choice) => choice.key === selectedPriority,
  )
    ? selectedPriority!
    : (strategy?.proposedPriorityKey ?? null);
  const priority = strategy?.priorityChoices.find(
    (choice) => choice.key === priorityKey,
  );
  const geographyKey = strategy?.geographyChoices.some(
    (choice) => choice.key === selectedGeography,
  )
    ? selectedGeography!
    : (strategy?.geographyChoices[0]?.key ?? null);
  const spendingKey = priority?.spendingChoices.some(
    (choice) => choice.key === selectedSpending,
  )
    ? selectedSpending!
    : (priority?.spendingChoices[0]?.key ?? null);

  function commitStrategy() {
    if (!strategy || !priorityKey || !geographyKey || !spendingKey) return;
    run(
      () =>
        commitCampaignStrategy(world, personId, {
          campaignId: strategy.campaignId,
          proposerPersonId: strategy.proposerPersonId,
          priorityKey,
          geographyKey,
          spendingKey,
        }),
      (next) => {
        if (next === world) {
          setProblem("Something already on the calendar has to happen first.");
          return;
        }
        setSelectedPriority(null);
        setSelectedGeography(null);
        setSelectedSpending(null);
        onWorldChange(next);
      },
    );
  }

  if (view.phase === "unavailable" && offices.length === 0) {
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

      {offices.length ? (
        <section
          className="game-campaign-strategy"
          data-testid="campaign-office-browser"
        >
          <h3>Explore established offices</h3>
          <p>
            Inspecting or selecting an office does not start a campaign or spend
            money. Existing campaigns keep their recorded office.
          </p>
          {[...new Set(offices.map((office) => office.governmentLevel))].map(
            (level) => (
              <fieldset key={level}>
                <legend>{level}</legend>
                {offices
                  .filter((office) => office.governmentLevel === level)
                  .map((office) => (
                    <label key={office.officeKey}>
                      <input
                        type="radio"
                        name="campaign-office"
                        value={office.officeKey}
                        checked={selectedOfficeKey === office.officeKey}
                        onChange={() => {
                          setSelectedOfficeKey(office.officeKey);
                          setProblem(null);
                        }}
                      />
                      <span>
                        {office.title}
                        <small>{office.provider}</small>
                        <small>{office.eligibility}</small>
                        <small>{office.timing}</small>
                        <small>
                          {office.connections.join(" ") ||
                            "No office-related connections are established in your records."}
                        </small>
                      </span>
                    </label>
                  ))}
              </fieldset>
            ),
          )}
          <p className="game-note">
            No national election calendar or inferred district membership is
            supplied here. The existing campaign filing route uses its 28-day
            game scenario schedule, not a sourced real-world election date.
          </p>
        </section>
      ) : null}
      {view.phase === "unavailable" ? (
        <p className="game-note" data-testid="campaign-unavailable">
          {view.unavailableReason}
        </p>
      ) : null}

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
          <button
            type="button"
            data-testid="file-candidacy"
            disabled={!selectedOffice?.eligible}
            onClick={file}
          >
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

          {strategy ? (
            <section
              className="game-campaign-strategy"
              data-testid="campaign-strategy"
              aria-labelledby="campaign-strategy-title"
            >
              <h3 id="campaign-strategy-title">Set the next priority</h3>
              <p data-testid="campaign-strategy-attribution">
                <strong>{strategy.attribution}</strong>
              </p>
              <p>{strategy.prompt}</p>
              <ul>
                {strategy.knownSituation.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
              <p className="game-note">{strategy.caveat}</p>

              <fieldset>
                <legend>Priority</legend>
                {strategy.priorityChoices.map((choice) => (
                  <label key={choice.key}>
                    <input
                      type="radio"
                      name="campaign-strategy-priority"
                      value={choice.key}
                      checked={priorityKey === choice.key}
                      disabled={choice.unavailable !== null}
                      onChange={() => {
                        setSelectedPriority(choice.key);
                        setSelectedSpending(null);
                      }}
                    />
                    <span>
                      {choice.label}
                      {choice.key === strategy.proposedPriorityKey
                        ? " — proposed"
                        : ""}
                      <small>{choice.unavailable ?? choice.explanation}</small>
                    </span>
                  </label>
                ))}
              </fieldset>

              <fieldset>
                <legend>Represented geography</legend>
                {strategy.geographyChoices.map((choice) => (
                  <label key={choice.key}>
                    <input
                      type="radio"
                      name="campaign-strategy-geography"
                      value={choice.key}
                      checked={geographyKey === choice.key}
                      onChange={() => setSelectedGeography(choice.key)}
                    />
                    <span>
                      {choice.label}
                      <small>{choice.explanation}</small>
                    </span>
                  </label>
                ))}
              </fieldset>

              <fieldset>
                <legend>Committee spending ceiling</legend>
                {priority?.spendingChoices.map((choice) => (
                  <label key={choice.key}>
                    <input
                      type="radio"
                      name="campaign-strategy-spending"
                      value={choice.key}
                      checked={spendingKey === choice.key}
                      onChange={() => setSelectedSpending(choice.key)}
                    />
                    <span>
                      {choice.label}
                      <small>{choice.explanation}</small>
                    </span>
                  </label>
                ))}
              </fieldset>

              <button
                type="button"
                data-testid="campaign-strategy-commit"
                disabled={
                  !priority ||
                  priority.unavailable !== null ||
                  !geographyKey ||
                  !spendingKey
                }
                onClick={commitStrategy}
              >
                Approve and carry out this plan
              </button>
            </section>
          ) : null}

          {strategyReport ? (
            <section
              className="game-campaign-strategy-report"
              data-testid="campaign-strategy-report"
            >
              <h3>What happened</h3>
              <p>{strategyReport.attribution}</p>
              <p>
                The player chose {strategyReport.chosenPriorityLabel} for{" "}
                {strategyReport.geographyLabel}, with a ceiling of{" "}
                {money(strategyReport.approvedSpendCeiling)}.
              </p>
              <p>{strategyReport.outcome}</p>
              {strategyReport.observedResult ? (
                <p className="game-note">{strategyReport.observedResult}</p>
              ) : null}
            </section>
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
