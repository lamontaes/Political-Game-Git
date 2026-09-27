import { useCalendarDateOrder } from "./UX39CalendarGrid";

/** One display preference for the title screen and in-game Options. */
export function DateFormatSetting() {
  const [dateOrder, setDateOrder] = useCalendarDateOrder();
  return (
    <fieldset className="ux39-calendar-date-order">
      <legend>Date format</legend>
      <label>
        <input
          type="radio"
          name="calendar-date-order"
          checked={dateOrder === "month-day"}
          onChange={() => setDateOrder("month-day")}
        />
        Month / day / year
      </label>
      <label>
        <input
          type="radio"
          name="calendar-date-order"
          checked={dateOrder === "day-month"}
          onChange={() => setDateOrder("day-month")}
        />
        Day / month / year
      </label>
    </fieldset>
  );
}

/**
 * Options.
 *
 * Present because the main menu names it and a menu entry that goes nowhere is
 * worse than one that says what it has. What it has today is the accessibility
 * setting the title art actually honors and an honest note about the rest.
 */
export function OptionsScreen({ onBack }: { readonly onBack: () => void }) {
  return (
    <main className="game-setup" data-testid="options-screen">
      <h1>Options</h1>
      <DateFormatSetting />
      <p className="game-note">
        Motion in the game follows your system&rsquo;s reduced-motion setting,
        so nothing here has to be switched on to make it stop.
      </p>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}
