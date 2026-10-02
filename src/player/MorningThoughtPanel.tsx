import type { MorningThought } from "../presentation/day-rhythm";
import type { IsoDate } from "../simulation";
import "./world-orientation.css";

/** A short, optional reading from the same Today facts as Calendar. */
export function MorningThoughtPanel({
  thought,
  onDismiss,
  onOpenToday,
}: {
  readonly thought: MorningThought;
  readonly onDismiss: (date: IsoDate) => void;
  readonly onOpenToday: () => void;
}) {
  const { today } = thought;
  return (
    <section
      className="pg-recap pg-morning-thought"
      aria-labelledby="pg-morning-thought-title"
      data-testid="morning-thought"
    >
      <h2 id="pg-morning-thought-title" className="pg-recap-title">
        Morning note
      </h2>
      <p className="pg-recap-headline">{today.now}</p>
      {today.next ? (
        <p className="pg-recap-meta">
          Next: {today.next.when} · {today.next.title}
        </p>
      ) : null}
      {today.waiting.length > 0 ? (
        <p className="pg-recap-meta">
          Waiting on you: {today.waiting[0]!.sentence}
          {today.waiting.length > 1
            ? ` ${today.waiting.length - 1} more in Calendar.`
            : ""}
        </p>
      ) : null}
      <div className="pg-recap-actions">
        <button
          type="button"
          className="ui-action"
          data-testid="morning-thought-open-today"
          onClick={onOpenToday}
        >
          Open Today
        </button>
        <button
          type="button"
          className="ui-action ui-action--primary"
          data-testid="morning-thought-dismiss"
          onClick={() => onDismiss(thought.date)}
        >
          Got it
        </button>
      </div>
    </section>
  );
}
