import { addDays } from "../../src/core2/kernel/dates";
import { gameStartDate } from "../../src/core2/game-start";

/** A date this many days after the game's start date, whatever that date is. */
export const daysAfterStart = (days: number) => addDays(gameStartDate(), days);
