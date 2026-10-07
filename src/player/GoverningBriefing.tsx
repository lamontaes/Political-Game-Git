import { useState, type ReactNode } from "react";
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
import { proseDate } from "../presentation/prose-dates";
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
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const briefing = projectGoverningBriefing(world, personId);
  if (!briefing) return null;
  const matters = [...briefing.significant, ...briefing.more];
  const selectedMatter =
    matters.find((matter) => matter.id === selectedMatterId) ?? matters[0];

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

  return (
    <section
      id="governing-calendar"
      className="governing-briefing"
      data-testid="governing-briefing"
    >
      <header>
        <h3>{briefing.officeTitle}</h3>
        <dl className="game-note" data-testid="governing-office-facts">
          {briefing.termEndsAt ? (
            <dd data-testid="governing-term-ends">
              {proseDate(briefing.termEndsAt)}
            </dd>
          ) : null}
          {briefing.chiefOfStaff ? (
            <dd data-testid="governing-chief-of-staff">
              {briefing.chiefOfStaff.name}
            </dd>
          ) : null}
        </dl>
      </header>

      <ExecutiveBudgetRequestHistory world={world} personId={personId} />
      {matters.length === 0 ? (
        <p data-testid="governing-nothing-open" data-problem="nothing-open" />
      ) : (
        <div className="governing-matter-browser">
          <nav
            className="governing-matter-list"
            data-testid="governing-matter-list"
            aria-label="Calendar"
          >
            {matters.map((matter) => (
              <button
                key={matter.id}
                type="button"
                className="pg-tab"
                aria-pressed={selectedMatter?.id === matter.id}
                onClick={() => setSelectedMatterId(matter.id)}
              >
                {matter.title}
              </button>
            ))}
          </nav>
          <ul className="governing-matters" data-testid="governing-significant">
            {selectedMatter ? card(selectedMatter) : null}
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
            <li key={`${entry.date}:${index}`}>{entry.date}</li>
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
          <span>{matter.recommendation.optionLabel}</span>
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
