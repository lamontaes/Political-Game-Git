import { addDays } from "../kernel/dates";
import { gameStartDate } from "../game-start";

/** A date this many days after the game's start date, whatever that date is. */
export const daysAfterStart = (days: number) => addDays(gameStartDate(), days);
