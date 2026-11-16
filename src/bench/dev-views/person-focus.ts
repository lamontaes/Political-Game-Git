/**
 * Dev mode's Focus view (pool item legislature-colleague-ties-stay-slight): whether a person
 * chooses every day, and why, by the one daily-focus rule (calendar.ts `dailyFocusReason`). For
 * someone the records say the player knows, it also gives the last day the two were together by
 * any record (closeness.ts `lastTogether`: their tie or a sitting both sat), the last day on their
 * tie row alone, and the days the rule allows before they fall back to their tier's pace.
 */
import { dailyFocusReason, knowsThePlayer } from "../../core2/life";
import { lastMetOnRow, lastTogether } from "../../core2/closeness";
import { daysBetweenText } from "../../core2/kernel/dates";
import { parameter } from "../../core2/parameters";
import type { PersonId } from "../../core2/types";
import type { DevView } from "../dev-views";

const view: DevView = {
  name: "person-focus",
  client: "dev-person-focus.mjs",
  labels: {
    title: "Focus",
    daily: "Chooses every day",
    paced: "Chooses at their tier's pace",
    player: "The player",
    "focus-person": "Put in focus",
    "player-circle": "In the player's circle, seen lately",
    "focus-place": "Lives in the focus town",
    "focus-county": "Lives in the focus county",
    circle: "In the player's circle",
    together: "Last together",
    talk: "Last on their tie",
    allowed: "Days allowed",
  },
  routes: {
    "GET person-focus": ({ mode, q }) => {
      const core = mode.core;
      const person = core.people.get(q("id") as PersonId);
      if (!person) return null;
      const player = core.playerId;
      const together =
        player && player !== person.id
          ? lastTogether(core, player, person.id)
          : null;
      const row =
        player && player !== person.id
          ? core.relationships.get(
              player < person.id
                ? `${player}:${person.id}`
                : `${person.id}:${player}`,
            )
          : undefined;
      return {
        personId: person.id,
        tier: person.tier,
        because: dailyFocusReason(core, person),
        inPlayerCircle: knowsThePlayer(core, person.id),
        lastTogether: together,
        daysSinceTogether: together
          ? daysBetweenText(together, core.date)
          : null,
        lastOnTie: row ? lastMetOnRow(row) : null,
        daysAllowed: parameter("focusDailyContactDays", core.data.parameters),
      };
    },
  },
};

export default view;
