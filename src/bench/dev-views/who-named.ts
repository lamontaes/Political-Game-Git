/**
 * Dev mode's "Who is named" trace (owner, Nov 16, 2026: "all this stuff that you're tracing, if
 * it's not already being traced by the dev mode, it should be being traced by that"): for the
 * player's scenes, newest first, each person in the cast and why the narrator names them the way it
 * does, from the one read the narration makes (`whyNamed`, who-they-are.ts): the phrase said after
 * their full name with the kind, stage and records it came from, or why they are named alone
 * (family, met before and by which record, the scene's own line says who they are, or nothing on
 * record). Whether they had met is read as of the day the scene is said (`sceneDay`), from the
 * met records' own dates;
 * a meeting dated later is shown as met later. Rule 136, item dev-scene-why-a-person-is-named-so.
 */
import type { DevView } from "../dev-views";
import type { PersonId } from "../../core2/types";
import { addDays, makeIsoDate } from "../../core2/kernel/dates";
import type { ScheduleEntry } from "../../director/scheduling";
import { whyNamed } from "../../director/who-they-are";

/**
 * The day a scene is said: the day its stop opened it (`stop`, written when the clock stops for
 * it); a scene still waiting to open, today, since it is composed when it opens; a scene to play
 * now with no stop, the morning after it was staged, as the ledger opens one with no clock
 * frontier (ledger.ts, `openedAt`); else the day it was staged (a journal line).
 */
function sceneDay(entry: ScheduleEntry, today: string): string {
  if (entry.stop) return entry.stop.at.date;
  if (entry.closed) return entry.date;
  if (entry.outcome === "scene-waiting") return today;
  if (entry.outcome === "scene-now") return addDays(makeIsoDate(entry.date), 1);
  return entry.date;
}

/** How many of the player's scenes the trace lists, newest first (a screen's length). */
const SCENES_LISTED = 12;

const view: DevView = {
  name: "who-named",
  client: "dev-who-named.mjs",
  labels: {
    title: "Who is named",
    show: "Show who is named",
    none: "No scenes yet",
    metLater: "met later",
    alone: {
      family: "family",
      met: "met before",
      "scene-says-it": "the scene says who",
      "nothing-on-record": "nothing on record",
    },
    metBy: {
      family: "family",
      sittings: "sat together",
      learned: "learned of",
      together: "spent time together",
    },
  },
  routes: {
    "GET who-named": ({ mode, q }) => {
      const core = mode.core;
      // The person the player plays now (an Advanced start steps into someone else), as waitingScenes reads it.
      const playerId = (q("personId") ||
        mode.player?.personId ||
        core.playerId) as PersonId | null;
      if (!playerId || !mode.director) return { scenes: [] };
      const book = mode.director.ledger.people.get(playerId);
      const nameOf = (id: string) => {
        const person = core.people.get(id);
        return person ? `${person.givenName} ${person.familyName}` : id;
      };
      const scenes = (book?.schedule ?? [])
        .flatMap((entry) =>
          entry.bindings.map((binding) => ({ entry, binding })),
        )
        .slice(-SCENES_LISTED)
        .reverse()
        .map(({ entry, binding }) => ({
          momentId: entry.momentId,
          date: entry.date,
          typeKey: binding.typeKey,
          cast: binding.presentIds
            .filter((id) => id !== playerId)
            .map((id) => ({
              personId: id,
              name: nameOf(id),
              role: binding.presentReasons[id] ?? null,
              ...whyNamed(
                core,
                playerId,
                id,
                binding.typeKey,
                sceneDay(entry, core.date),
              ),
            })),
        }));
      return { scenes };
    },
  },
};

export default view;
