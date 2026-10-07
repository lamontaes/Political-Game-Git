import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { BUDGET_DOLLARS } from "../simulation/governing/executive-budget-requests";
import {
  ExecutiveBudgetRequestEditor,
  ExecutiveBudgetRequestHistory,
} from "./ExecutiveBudgetRequest";

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
  const [selectedItemId, setSelectedItemId] = useState<EntityId | null>(null);
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
  const items = [...briefing.significant, ...briefing.more];
  const selectedItem =
    items.find((item) => item.id === selectedItemId) ?? items[0];

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
      budgetEditor={
        matter.options.some((option) => option.key === BUDGET_DOLLARS) ? (
          <ExecutiveBudgetRequestEditor
            world={world}
            personId={personId}
            matterId={matter.id}
            onCommit={commit}
          />
        ) : null
      }
    />
  );

  const itemTitle = (item: ExecutiveInboxItem) =>
    item.kind === "work" ? item.work.title : item.matter.title;

  return (
    <section
      id="governing-calendar"
      className={
        inline ? "governing-briefing" : "planning-workspace governing-briefing"
      }
      aria-label="Calendar"
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
            Continue
          </button>
        )}
        {!inline && onClose && (
          <button ref={close} onClick={onClose}>
            Back
          </button>
        )}
        <dl className="game-note" data-testid="governing-office-facts">
          {briefing.termEnds ? (
            <dd data-testid="governing-term-ends">{briefing.termEnds}</dd>
          ) : null}
          {briefing.chiefOfStaff ? (
            <dd data-testid="governing-chief-of-staff">
              {briefing.chiefOfStaff.name}
            </dd>
          ) : null}
        </dl>
      </header>

      <IncidentResponsePanel world={world} onWorldChange={onWorldChange} />
      <ExecutiveBudgetRequestHistory world={world} personId={personId} />
      {items.length === 0 ? (
        <p data-testid="governing-nothing-open" data-problem="nothing-open" />
      ) : (
        <div className="governing-matter-browser">
          <nav className="governing-matter-list" aria-label="Calendar">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="pg-tab"
                aria-pressed={selectedItem?.id === item.id}
                onClick={() => setSelectedItemId(item.id)}
              >
                {itemTitle(item)}
              </button>
            ))}
          </nav>
          <ul className="governing-matters" data-testid="governing-significant">
            {selectedItem ? card(selectedItem) : null}
          </ul>
        </div>
      )}
      {problem ? (
        <p
          role="alert"
          className="game-note"
          data-testid="governing-problem"
          data-reason={problem}
        />
      ) : null}

      {briefing.more.length > 0 ? (
        <span data-testid="governing-more" data-count={briefing.more.length} />
      ) : null}

      {briefing.recent.length > 0 ? (
        <ul data-testid="governing-recent">
          {briefing.recent.map((entry, index) => (
            <li key={`${entry.date}:${index}`}>
              <time>{entry.date}</time> {entry.text}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function MatterCard({
  matter,
  onDecide,
  onDelegate,
  budgetEditor,
}: {
  readonly matter: BriefingMatter;
  readonly onDecide: (optionKey: string) => void;
  readonly onDelegate: () => void;
  readonly budgetEditor: ReactNode;
}) {
  return (
    <li className="governing-matter" data-testid="governing-matter">
      <h5>{matter.title}</h5>
      <p
        className="game-note"
        data-testid="governing-deadline"
        data-problem={matter.deadline ? undefined : "no-deadline"}
        data-days-left={matter.daysLeft ?? undefined}
      >
        {matter.deadline ?? "—"}
      </p>
      {matter.recommendation ? (
        <p
          data-testid="governing-recommendation"
          data-reason={matter.recommendation.reason}
        >
          <strong>{matter.recommendation.byName}</strong>{" "}
          {matter.recommendation.optionLabel}
        </p>
      ) : null}
      <div className="game-choices">
        {matter.options
          .filter((option) => option.key !== BUDGET_DOLLARS)
          .map((option) => (
            <button
              key={option.key}
              type="button"
              className="ui-action ui-action--choice"
              data-testid="governing-option"
              data-option={option.key}
              onClick={() => onDecide(option.key)}
            >
              {option.label}
            </button>
          ))}
        {matter.canDelegate ? (
          <button
            type="button"
            className="ui-action ui-action--quiet"
            data-testid="governing-delegate"
            onClick={onDelegate}
          >
            Continue
          </button>
        ) : null}
      </div>
      {budgetEditor}
    </li>
  );
}
