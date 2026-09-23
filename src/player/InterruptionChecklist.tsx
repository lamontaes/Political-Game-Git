import type { InterruptionPreferences } from "../presentation/shell-navigation";
import { INTERRUPTION_CATEGORIES } from "../presentation/interruption-policy";

/**
 * What a day or week skip stops for, as a checklist.
 *
 * Drawn on the Calendar's Interruptions tab and from the Stops control beside
 * Day and Week, so the player can see and change it at the moment they pass
 * time. The owner asked for exactly that: "when you do time you should be
 * able to have a checkbox of things that will interrupt you." The rows that
 * are not preferences are shown checked and fixed.
 */
export function InterruptionChecklist({
  interruptions,
  onChange,
  testIdPrefix = "interruption",
}: {
  readonly interruptions: InterruptionPreferences;
  readonly onChange?: (
    key: keyof InterruptionPreferences,
    value: boolean,
  ) => void;
  /** Distinguishes the two places the list is drawn. */
  readonly testIdPrefix?: string;
}) {
  return (
    <ul className="pg-interruption-list">
      {INTERRUPTION_CATEGORIES.map((category) =>
        category.key === "always" ? (
          <li key={category.label} data-testid={`${testIdPrefix}-always`}>
            <label className="pg-check pg-check--fixed">
              <input type="checkbox" checked disabled readOnly />
              <span>
                <strong>{category.label}</strong>
                <small>{category.detail}</small>
              </span>
            </label>
          </li>
        ) : (
          <li key={category.key}>
            <label className="pg-check">
              <input
                type="checkbox"
                data-testid={`${testIdPrefix}-${category.key}`}
                checked={interruptions[category.key]}
                disabled={!onChange}
                onChange={(event) =>
                  onChange?.(
                    category.key as keyof InterruptionPreferences,
                    event.target.checked,
                  )
                }
              />
              <span>
                <strong>{category.label}</strong>
                <small>{category.detail}</small>
              </span>
            </label>
          </li>
        ),
      )}
    </ul>
  );
}
