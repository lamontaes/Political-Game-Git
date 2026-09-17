import { useState, type ReactNode } from "react";
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
import {
  projectPressStoriesAbout,
  type PressStoryLine,
} from "../presentation/press-desk-stories";
import "./news/press-desk.css";

const SCOPE_LABELS: Readonly<Record<MediaScope, string>> = {
  national: "National",
  state: "Statewide",
  regional: "Regional",
  local: "Local",
};

function problemText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function dollars(minorUnits: number): string {
  return (minorUnits / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/**
 * PRESS46 press desk, mounted in the Press office context of News: the
 * questions reporters are waiting on, what has been printed about the player
 * and by whom, matters the player knows of, the terms agreed with reporters,
 * and the newsrooms that cover this ground.
 *
 * Reads only the domain projections; every write goes through a domain writer,
 * and a writer that refuses says so here without changing the World.
 */
export function PressDeskPanel({
  world,
  personId,
  onWorldChange,
  onOpenPerson,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (next: World) => void;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  const desk = projectPressDesk(world, personId);
  const stories = projectPressStoriesAbout(world, personId);
  return (
    <section
      className="pg-press-desk"
      data-testid="press-desk-panel"
      aria-labelledby="press-desk-title"
    >
      <h3 id="press-desk-title">Your press desk</h3>
      <p className="game-note">
        What reporters have asked you, what has been printed about you, and the
        terms you agreed to.
      </p>

      <DeskGroup id="requests" title="Questions waiting on you">
        {desk.incomingRequests.length === 0 ? (
          <p className="game-note">
            No reporter is waiting on an answer from you.
          </p>
        ) : (
          <ul className="pg-press-desk-list">
            {desk.incomingRequests.map((request) => (
              <li key={request.leadId}>
                <PressRequestItem
                  world={world}
                  personId={personId}
                  request={request}
                  onWorldChange={onWorldChange}
                  onOpenPerson={onOpenPerson}
                />
              </li>
            ))}
          </ul>
        )}
      </DeskGroup>

      <DeskGroup id="stories" title="Printed about you">
        {stories.length === 0 ? (
          <p className="game-note">Nothing has been published about you yet.</p>
        ) : (
          <ul className="pg-press-desk-list" data-testid="press-desk-stories">
            {stories.map((story) => (
              <li key={story.publicationId}>
                <PressStoryItem story={story} />
              </li>
            ))}
          </ul>
        )}
      </DeskGroup>

      <DeskGroup id="matters" title="Matters about you">
        {desk.matters.length === 0 ? (
          <p className="game-note">No matter about you is known to you.</p>
        ) : (
          <ul className="pg-press-desk-list">
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
      </DeskGroup>

      <DeskGroup id="arrangements" title="Your source arrangements">
        {desk.agreements.length === 0 ? (
          <p className="game-note">
            You have no ground rules agreed with a reporter.
          </p>
        ) : (
          <ul
            className="pg-press-desk-list"
            data-testid="press-desk-agreements"
          >
            {desk.agreements.map((agreement) => (
              <li key={agreement.agreementId}>
                <p className="pg-press-desk-line">
                  <strong>
                    {agreement.reporterName}, {agreement.outletName}
                  </strong>
                  {agreement.label ? <> — {agreement.label}</> : null}
                </p>
                <p className="game-note">{agreement.explanation}</p>
              </li>
            ))}
          </ul>
        )}
        <details data-testid="press-desk-glossary">
          <summary>What the ground rules mean</summary>
          <ul className="pg-press-desk-list">
            {desk.glossary.map((entry) => (
              <li key={entry.terms}>{entry.text}</li>
            ))}
          </ul>
        </details>
      </DeskGroup>

      <DeskGroup id="outlets" title="Newsrooms that cover this ground">
        {desk.outlets.length === 0 ? (
          <p className="game-note">No news outlet is recorded here.</p>
        ) : (
          <ul className="pg-press-desk-list" data-testid="press-desk-outlets">
            {desk.outlets.map((outlet) => (
              <li key={outlet.outletId}>
                <p className="pg-press-desk-line">
                  <strong>{outlet.name}</strong> — {SCOPE_LABELS[outlet.scope]}
                </p>
                {outlet.reporters.length > 0 ? (
                  <ul className="pg-press-desk-list">
                    {outlet.reporters.map((reporter) => (
                      <li key={reporter.personId}>
                        <button
                          type="button"
                          className="pg-inline-link"
                          onClick={() => onOpenPerson(reporter.personId)}
                        >
                          {reporter.name}
                        </button>
                        , {reporter.title}
                        {reporter.knownToYou ? (
                          <span className="game-note"> — you have spoken</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DeskGroup>

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

function DeskGroup({
  id,
  title,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section
      className="pg-press-desk-group"
      aria-labelledby={`press-desk-${id}-title`}
      data-testid={`press-desk-${id}`}
    >
      <h4 id={`press-desk-${id}-title`}>{title}</h4>
      {children}
    </section>
  );
}

/**
 * One publication and the corrections appended to it. The byline is the
 * reporter the desk recorded; with no reporter recorded there is no byline.
 */
function PressStoryItem({ story }: { readonly story: PressStoryLine }) {
  return (
    <article
      className="pg-press-desk-story"
      data-testid="press-desk-story"
      data-publication-id={story.publicationId}
    >
      <p className="pg-press-desk-line">
        <strong>{story.headline}</strong>
      </p>
      <p className="game-note">
        {story.outletName}
        {story.bylineName ? ` · By ${story.bylineName}` : ""} ·{" "}
        <time dateTime={story.publishedAt}>{proseDate(story.publishedAt)}</time>
      </p>
      {story.correctionNote ? (
        <p className="game-note">Correction: {story.correctionNote}</p>
      ) : null}
      {story.corrections.length > 0 ? (
        <ul
          className="pg-press-desk-list pg-press-desk-corrections"
          data-testid="press-desk-story-corrections"
        >
          {story.corrections.map((correction) => (
            <li key={correction.publicationId}>
              <time dateTime={correction.publishedAt}>
                {proseDate(correction.publishedAt)}
              </time>
              {": "}
              {correction.note ?? correction.headline}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function PressRequestItem({
  world,
  personId,
  request,
  onWorldChange,
  onOpenPerson,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly request: IncomingPressRequest;
  readonly onWorldChange: (next: World) => void;
  readonly onOpenPerson: (personId: EntityId) => void;
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
    <article className="pg-press-desk-card" data-testid="press-desk-request">
      <p className="pg-press-desk-line">
        <strong>{request.outletName}</strong> —{" "}
        <button
          type="button"
          className="pg-inline-link"
          onClick={() => onOpenPerson(request.reporterPersonId)}
        >
          {request.reporterName}
        </button>
      </p>
      <blockquote>{request.question}</blockquote>
      <p className="game-note">Answer due by {proseDate(request.dueAt)}.</p>
      <fieldset className="pg-press-desk-answers">
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
            <span data-lie={option.isLie ? "true" : undefined}>
              {option.isLie ? <em>{option.label}</em> : option.label}
            </span>
          </label>
        ))}
      </fieldset>
      {selected ? (
        <div data-testid="press-desk-answer-preview">
          <p className="game-note">You will say, exactly:</p>
          <blockquote>{selected.statement}</blockquote>
          <p className="game-note">{selected.note}</p>
        </div>
      ) : null}
      <button type="button" disabled={!selected} onClick={give}>
        Give this answer
      </button>
      {problem ? (
        <p className="game-problem" role="status">
          {problem}
        </p>
      ) : null}
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
    <article className="pg-press-desk-card" data-testid="press-desk-matter">
      <p className="pg-press-desk-line">
        <strong>{matter.label}</strong>
      </p>
      <ul className="pg-press-desk-list">
        {matter.knownLines.map((line, index) => (
          <li key={`${line.date}:${index}`}>
            <time dateTime={line.date}>{proseDate(line.date)}</time>:{" "}
            {line.text}
          </li>
        ))}
      </ul>
      {waiting ? (
        <div className="pg-press-desk-actions">
          <p className="game-note">
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
      {problem ? (
        <p className="game-problem" role="status">
          {problem}
        </p>
      ) : null}
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
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const parsed = Number(amount);
  // Not clamped to the balance: an amount over it is refused by the writer,
  // with its own reason, rather than quietly becoming a different amount.
  const amountMinorUnits = Number.isFinite(parsed)
    ? Math.round(parsed * 100)
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
      setAmount("");
      setPurpose("");
      setUnderstood(false);
      setProblem(null);
    } catch (error) {
      setProblem(problemText(error));
    }
  }
  return (
    <section
      className="pg-press-desk-group"
      data-testid="press-desk-personal-use"
      aria-labelledby="press-desk-personal-use-title"
    >
      <h4 id="press-desk-personal-use-title">Campaign money</h4>
      <p className="pg-press-desk-line">
        <strong>{label}</strong>
      </p>
      <p className="game-note">
        The committee holds {dollars(balanceMinorUnits)}.
      </p>
      <div className="game-fields">
        <label>
          Amount in dollars
          <input
            type="number"
            min={0}
            max={balanceMinorUnits / 100}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
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
      </div>
      <button type="button" disabled={!ready} onClick={spend}>
        Use campaign money personally
      </button>
      {problem ? (
        <p className="game-problem" role="status">
          {problem}
        </p>
      ) : null}
    </section>
  );
}
