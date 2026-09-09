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
          {view.household.grounding.map((fact) => (
            <p key={fact.basis}>{fact.text}</p>
          ))}
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
          onClick={onNext}
        >
          {phase === "world" ? "Meet your household" : "Step inside"}
        </button>
        <button className="ui-action" type="button" onClick={onSkip}>
          Skip introduction
        </button>
      </div>
    </section>
  );
}
