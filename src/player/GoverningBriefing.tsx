import { useEffect, useRef, useState } from "react";
import {
  decideGoverningMatter,
  delegateGoverningMatter,
  type EntityId,
  type GoverningActionResult,
  type World,
  type FutureTransitionHandlerRegistry,
} from "../simulation";
import { type BriefingMatter } from "../presentation/governing-briefing";
import {
  projectExecutiveInbox,
  type ExecutiveInboxItem,
} from "../presentation/executive-inbox";
import { ExecutiveWorkCard } from "./ExecutiveWorkCard";
import { IncidentResponsePanel } from "./IncidentResponsePanel";
import { spendExecutiveWorkTime } from "../simulation/executive-work";
import { GuideTermText } from "./GuideTerm";

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
  handlers,
  onClose,
  placement = "inline",
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly handlers?: FutureTransitionHandlerRegistry;
  readonly onClose?: () => void;
  readonly placement?: "inline" | "overlay";
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const briefing = projectExecutiveInbox(world, personId);
  const inline = placement === "inline";
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (inline) return;
    const previous = document.activeElement;
    close.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [inline]);
  if (!briefing) return null;

  const commit = (result: GoverningActionResult) => {
    if (result.ok) {
      setProblem(null);
      onWorldChange(result.world);
    } else setProblem(result.reason);
  };
  const card = (item: ExecutiveInboxItem) =>
    item.kind === "work" ? (
      <ExecutiveWorkCard
        key={item.id}
        world={world}
        item={item.work}
        onWorldChange={onWorldChange}
        handlers={handlers}
      />
    ) : (
      governingCard(item.matter)
    );
  const governingCard = (matter: BriefingMatter) => (
    <MatterCard
      key={matter.id}
      matter={matter}
      onDecide={(key) => commit(decideGoverningMatter(world, matter.id, key))}
      onDelegate={() => commit(delegateGoverningMatter(world, matter.id))}
    />
  );

  return (
    <section
      className={
        inline ? "governing-briefing" : "planning-workspace governing-briefing"
      }
      aria-label="Executive work"
      data-testid="governing-briefing"
      onKeyDown={(event) => {
        if (!inline && onClose && event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header>
        <h3>{briefing.officeTitle}</h3>
        {briefing.canSpendWorkTime && (
          <button
            onClick={() => {
              const result = spendExecutiveWorkTime(world, handlers);
              if (result.ok) {
                onWorldChange(result.world);
                setProblem(null);
              } else setProblem(result.reason);
            }}
          >
            Work for 30 minutes
          </button>
        )}
        {!inline && onClose && (
          <button ref={close} onClick={onClose}>
            Return
          </button>
        )}
        <p className="game-note">
          {briefing.termLine}{" "}
          {briefing.chiefOfStaff
            ? `Chief of staff: ${briefing.chiefOfStaff.name}.`
            : briefing.hasChiefOfStaffReading
              ? "No chief of staff yet."
              : null}
        </p>
        {briefing.calendarNote ? (
          <details className="game-campaign-detail">
            <summary>About this office's rules</summary>
            <p>{briefing.calendarNote}</p>
          </details>
        ) : null}
      </header>

      <IncidentResponsePanel world={world} onWorldChange={onWorldChange} />
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
      <p>
        <GuideTermText text={matter.ask} />
      </p>
      <p className="game-note">
        {matter.deadline
          ? `Decide by ${matter.deadline}`
          : "No deadline is established"}
        {matter.daysLeft !== null && matter.daysLeft >= 0
          ? ` (${matter.daysLeft} days).`
          : "."}
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
        <p>
          <GuideTermText text={`If nothing is decided: ${matter.ifIgnored}`} />
        </p>
      </details>
    </li>
  );
}
