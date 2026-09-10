import type { EntityId, World } from "../../simulation";
import { projectOpeningLife } from "../../presentation/opening-life";

/** Feature-local content; UI-CORE owns creator, transitions, navigation and backdrop. */
export function OpeningLifePanel({
  world,
  playerPersonId,
  phase,
  onNext,
  onBack,
  onSkip,
}: {
  world: World;
  playerPersonId: EntityId;
  phase: "world" | "household";
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const view = projectOpeningLife(world, playerPersonId);
  return (
    /*
     * This IS main's life introduction, in the shell that replaced its card.
     *
     * Main showed one section — the household sentences, the grounding facts
     * the generator had already written, and "Step inside" — and nothing else
     * until it had been read. That contract is preserved here and widened: the
     * world the life starts in comes first, the household second, and the same
     * gate still holds the scene back until both have been passed.
     *
     * It keeps main's test ids because it is main's behavior, not a lookalike:
     * `life-introduction` for the section, `life-grounding` for the facts, and
     * `introduction-continue` for the control that advances. What is NOT
     * restored is the permanent people rail main paired it with — the owner
     * asked for that to go, and preserving information is not a reason to bring
     * back chrome they rejected.
     */
    <div data-testid="life-introduction" data-introduction-phase={phase}>
      <section
        className="life-exposition"
        data-testid="opening-life-panel"
        aria-label={phase === "world" ? "Your world" : "Your household"}
      >
        <p className="life-exposition-kicker">
          {view.name} · Age {view.age}
        </p>
        <p>
          {view.date}
          {view.place ? ` · ${view.place}` : ""}
        </p>
        {phase === "world" ? (
          <>
            <p>{view.context}</p>
            {view.officeholders.map((holder) => (
              <p key={holder.termId}>
                {holder.title}: {holder.personName}
              </p>
            ))}
          </>
        ) : (
          <>
            {view.household.sentences.map((text) => (
              <p key={text}>{text}</p>
            ))}
            {view.household.grounding.length > 0 ? (
              <div data-testid="life-grounding">
                {view.household.grounding.map((fact) => (
                  <p key={fact.basis} data-grounding={fact.kind}>
                    {fact.text}
                  </p>
                ))}
              </div>
            ) : null}
          </>
        )}
        <div className="game-choices">
          {phase === "household" ? (
            <button className="ui-action" type="button" onClick={onBack}>
              Back
            </button>
          ) : null}
          <button
            className="ui-action ui-action--primary"
            type="button"
            data-testid="introduction-continue"
            onClick={onNext}
          >
            {phase === "world" ? "Meet your household" : "Step inside"}
          </button>
          <button className="ui-action" type="button" onClick={onSkip}>
            Skip introduction
          </button>
        </div>
      </section>
    </div>
  );
}
