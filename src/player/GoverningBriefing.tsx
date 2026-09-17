import { useState } from "react";
import {
  decideGoverningMatter,
  delegateGoverningMatter,
  type EntityId,
  type GoverningActionResult,
  type World,
} from "../simulation";
import {
  projectGoverningBriefing,
  type BriefingMatter,
} from "../presentation/governing-briefing";

/**
 * GOVERNING: the office briefing inside Work. A few matters that need the
 * officeholder now, each with the ask, the deadline, the known tradeoffs and
 * the chief of staff's recommendation when there is one. Deciding is a click;
 * handing a matter to staff is a click; leaving it is allowed and the card
 * says what happens then. Reading spends no time.
 */
export function GoverningBriefing({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const briefing = projectGoverningBriefing(world, personId);
  if (!briefing) return null;

  const commit = (result: GoverningActionResult) => {
    if (result.ok) {
      setProblem(null);
      onWorldChange(result.world);
    } else setProblem(result.reason);
  };
  const card = (matter: BriefingMatter) => (
    <MatterCard
      key={matter.id}
      matter={matter}
      onDecide={(key) => commit(decideGoverningMatter(world, matter.id, key))}
      onDelegate={() => commit(delegateGoverningMatter(world, matter.id))}
    />
  );

  return (
    <section className="governing-briefing" data-testid="governing-briefing">
      <header>
        <h3>{briefing.officeTitle}</h3>
        <p className="game-note">
          {briefing.termLine}{" "}
          {briefing.chiefOfStaff
            ? `Chief of staff: ${briefing.chiefOfStaff.name}.`
            : "No chief of staff yet."}
        </p>
        {briefing.calendarNote ? (
          <details className="game-campaign-detail">
            <summary>About this office's rules</summary>
            <p>{briefing.calendarNote}</p>
          </details>
        ) : null}
      </header>

      <h4>Needs you</h4>
      {briefing.significant.length === 0 ? (
        <p className="game-note" data-testid="governing-nothing-open">
          Nothing is waiting on you right now.
        </p>
      ) : (
        <ul className="governing-matters" data-testid="governing-significant">
          {briefing.significant.map(card)}
        </ul>
      )}
      {problem ? (
        <p role="alert" className="game-note" data-testid="governing-problem">
          {problem}
        </p>
      ) : null}

      {briefing.more.length > 0 ? (
        <details data-testid="governing-more">
          <summary>{`${briefing.more.length} more matters`}</summary>
          <ul className="governing-matters">{briefing.more.map(card)}</ul>
        </details>
      ) : null}

      {briefing.recent.length > 0 ? (
        <>
          <h4>What came of it</h4>
          <ul data-testid="governing-recent">
            {briefing.recent.map((entry, index) => (
              <li key={`${entry.date}:${index}`}>
                <small>{entry.date}</small> {entry.text}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function MatterCard({
  matter,
  onDecide,
  onDelegate,
}: {
  readonly matter: BriefingMatter;
  readonly onDecide: (optionKey: string) => void;
  readonly onDelegate: () => void;
}) {
  return (
    <li className="governing-matter" data-testid="governing-matter">
      <h5>{matter.title}</h5>
      <p>{matter.ask}</p>
      <p className="game-note">
        {`Decide by ${matter.deadline}`}
        {matter.daysLeft >= 0 ? ` (${matter.daysLeft} days).` : "."}
      </p>
      {matter.recommendation ? (
        <p data-testid="governing-recommendation">
          {`${matter.recommendation.byName} recommends: ${matter.recommendation.optionLabel}. ${matter.recommendation.reason}`}
        </p>
      ) : null}
      <div className="game-choices">
        {matter.options.map((option) => (
          <button
            key={option.key}
            type="button"
            className="ui-action ui-action--choice"
            data-testid="governing-option"
            data-option={option.key}
            onClick={() => onDecide(option.key)}
          >
            {option.label}
            <small>{option.effect}</small>
          </button>
        ))}
        {matter.canDelegate ? (
          <button
            type="button"
            className="ui-action ui-action--quiet"
            data-testid="governing-delegate"
            onClick={onDelegate}
          >
            Let your chief of staff handle it
            <small>They will take their own recommendation.</small>
          </button>
        ) : null}
      </div>
      <details>
        <summary>Tradeoffs and what happens if you wait</summary>
        <ul>
          {matter.options.map((option) => (
            <li key={option.key}>
              <strong>{option.label}:</strong> {option.tradeoff}
            </li>
          ))}
        </ul>
        <p>{`If nothing is decided: ${matter.ifIgnored}`}</p>
      </details>
    </li>
  );
}
