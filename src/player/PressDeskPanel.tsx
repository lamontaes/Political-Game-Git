import { useState } from "react";
import {
  answerPressRequest,
  pressAnswerStance,
  projectPressDesk,
  respondToComplaint,
  spendCampaignFundsPersonally,
  type EntityId,
  type IncomingPressRequest,
  type KnownMatterView,
  type MediaScope,
  type PressAnswerChoice,
  type World,
} from "../simulation";
import { proseDate } from "../presentation/prose-dates";

const SCOPE_LABELS: Readonly<Record<MediaScope, string>> = {
  national: "National",
  state: "Statewide",
  regional: "Regional",
  local: "Local",
};

function problemText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * PRESS46 press desk: reporters' requests, matters about the player, outlets,
 * source arrangements, and the deliberately labeled campaign-money action.
 * Reads only the domain projection; every write goes through a domain writer.
 */
export function PressDeskPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (next: World) => void;
}) {
  const desk = projectPressDesk(world, personId);
  return (
    <section data-testid="press-desk-panel" aria-label="Press desk">
      <h4>Requests from reporters</h4>
      {desk.incomingRequests.length === 0 ? (
        <p>No reporter is waiting on an answer from you.</p>
      ) : (
        <ul>
          {desk.incomingRequests.map((request) => (
            <li key={request.leadId}>
              <PressRequestItem
                world={world}
                personId={personId}
                request={request}
                onWorldChange={onWorldChange}
              />
            </li>
          ))}
        </ul>
      )}

      <h4>Matters about you</h4>
      {desk.matters.length === 0 ? (
        <p>No matter about you is known to you.</p>
      ) : (
        <ul>
          {desk.matters.map((matter) => (
            <li key={matter.matterId}>
              <MatterItem
                world={world}
                matter={matter}
                onWorldChange={onWorldChange}
              />
            </li>
          ))}
        </ul>
      )}

      <h4>Outlets</h4>
      {desk.outlets.length === 0 ? (
        <p>No news outlet is recorded here.</p>
      ) : (
        <ul data-testid="press-desk-outlets">
          {desk.outlets.map((outlet) => (
            <li key={outlet.outletId}>
              <strong>{outlet.name}</strong> — {SCOPE_LABELS[outlet.scope]}
              {outlet.reporters.length > 0 ? (
                <ul>
                  {outlet.reporters.map((reporter) => (
                    <li key={reporter.personId}>
                      {reporter.name}, {reporter.title}
                      {reporter.knownToYou ? " — you have spoken" : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h4>Your source arrangements</h4>
      {desk.agreements.length === 0 ? (
        <p>You have no ground rules agreed with a reporter.</p>
      ) : (
        <ul data-testid="press-desk-agreements">
          {desk.agreements.map((agreement) => (
            <li key={agreement.agreementId}>
              <strong>
                {agreement.reporterName}, {agreement.outletName}
              </strong>
              {agreement.label ? <> — {agreement.label}</> : null}
              <p>{agreement.explanation}</p>
            </li>
          ))}
        </ul>
      )}
      <details data-testid="press-desk-glossary">
        <summary>What the ground rules mean</summary>
        <ul>
          {desk.glossary.map((entry) => (
            <li key={entry.terms}>{entry.text}</li>
          ))}
        </ul>
      </details>

      {desk.personalUse.available ? (
        <PersonalUseSection
          world={world}
          label={desk.personalUse.label}
          balanceMinorUnits={desk.personalUse.balanceMinorUnits}
          onWorldChange={onWorldChange}
        />
      ) : null}
    </section>
  );
}

function PressRequestItem({
  world,
  personId,
  request,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly request: IncomingPressRequest;
  readonly onWorldChange: (next: World) => void;
}) {
  const [choice, setChoice] = useState<PressAnswerChoice | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const selected = request.answerOptions.find(
    (option) => option.choice === choice,
  );
  const groupName = `press-answer-${request.leadId}`;
  function give() {
    if (!selected) return;
    try {
      const { stance, worldTruth } = pressAnswerStance(
        world,
        request.leadId,
        personId,
        selected.choice,
      );
      onWorldChange(
        answerPressRequest(world, {
          leadId: request.leadId,
          stance,
          worldTruth,
        }),
      );
      setProblem(null);
    } catch (error) {
      setProblem(problemText(error));
    }
  }
  return (
    <article data-testid="press-desk-request">
      <p>
        <strong>{request.outletName}</strong> — {request.reporterName}
      </p>
      <blockquote>{request.question}</blockquote>
      <p>Answer due by {proseDate(request.dueAt)}.</p>
      <fieldset>
        <legend>Your answer</legend>
        {request.answerOptions.map((option) => (
          <label key={option.choice}>
            <input
              type="radio"
              name={groupName}
              value={option.choice}
              checked={choice === option.choice}
              onChange={() => setChoice(option.choice)}
            />
            {option.label}
            {option.isLie ? <em> (this is a lie)</em> : null}
          </label>
        ))}
      </fieldset>
      {selected ? (
        <div data-testid="press-desk-answer-preview">
          <p>You will say, exactly:</p>
          <blockquote>{selected.statement}</blockquote>
          <p>{selected.note}</p>
        </div>
      ) : null}
      <button type="button" disabled={!selected} onClick={give}>
        Give this answer
      </button>
      {problem ? <p role="status">{problem}</p> : null}
    </article>
  );
}

function MatterItem({
  world,
  matter,
  onWorldChange,
}: {
  readonly world: World;
  readonly matter: KnownMatterView;
  readonly onWorldChange: (next: World) => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const waiting = matter.awaitingYourChoice;
  function respond(choice: "counsel-responds" | "no-response") {
    if (!waiting) return;
    try {
      onWorldChange(
        respondToComplaint(world, {
          proceedingId: waiting.proceedingId,
          choice,
        }),
      );
      setProblem(null);
    } catch (error) {
      setProblem(problemText(error));
    }
  }
  return (
    <article data-testid="press-desk-matter">
      <p>
        <strong>{matter.label}</strong>
      </p>
      <ul>
        {matter.knownLines.map((line, index) => (
          <li key={`${line.date}:${index}`}>
            {proseDate(line.date)}: {line.text}
          </li>
        ))}
      </ul>
      {waiting ? (
        <div>
          <p>
            {waiting.institution} is waiting on your response. Your counsel
            handles the rest of the file either way.
          </p>
          <button type="button" onClick={() => respond("counsel-responds")}>
            Let counsel respond
          </button>
          <button type="button" onClick={() => respond("no-response")}>
            Do not respond
          </button>
        </div>
      ) : null}
      {problem ? <p role="status">{problem}</p> : null}
    </article>
  );
}

function PersonalUseSection({
  world,
  label,
  balanceMinorUnits,
  onWorldChange,
}: {
  readonly world: World;
  readonly label: string;
  readonly balanceMinorUnits: number;
  readonly onWorldChange: (next: World) => void;
}) {
  const [dollars, setDollars] = useState("");
  const [purpose, setPurpose] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const parsed = Number(dollars);
  const amountMinorUnits = Number.isFinite(parsed)
    ? Math.min(Math.round(parsed * 100), balanceMinorUnits)
    : 0;
  const ready = understood && amountMinorUnits > 0 && purpose.trim() !== "";
  function spend() {
    if (!ready) return;
    try {
      const result = spendCampaignFundsPersonally(world, {
        stableKey: `press46:personal-use:${world.actionSequence}`,
        amountMinorUnits,
        purpose: purpose.trim(),
      });
      onWorldChange(result.world);
      setDollars("");
      setPurpose("");
      setUnderstood(false);
      setProblem(null);
    } catch (error) {
      setProblem(problemText(error));
    }
  }
  return (
    <section data-testid="press-desk-personal-use" aria-label="Campaign money">
      <h4>Campaign money</h4>
      <p>
        <strong>{label}</strong>
      </p>
      <p>
        The committee holds{" "}
        {(balanceMinorUnits / 100).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}
        .
      </p>
      <label>
        Amount in dollars
        <input
          type="number"
          min={0}
          max={balanceMinorUnits / 100}
          step="0.01"
          value={dollars}
          onChange={(event) => setDollars(event.target.value)}
        />
      </label>
      <label>
        What the money pays for
        <input
          type="text"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={understood}
          onChange={(event) => setUnderstood(event.target.checked)}
        />
        I understand this is misuse of campaign funds
      </label>
      <button type="button" disabled={!ready} onClick={spend}>
        Use campaign money personally
      </button>
      {problem ? <p role="status">{problem}</p> : null}
    </section>
  );
}
