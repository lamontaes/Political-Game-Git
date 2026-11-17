/**
 * Dev mode's director's day (pool items dev-mode-shows-the-directors-day and
 * dev-mode-shows-a-scenes-first-line-piece; owner, Nov 16: "a part of the dev mode should be able to
 * trace and force every scene to play. So see why every scene played"). `GET dev/director/day?person=&date=`
 * returns one person's schedule entries for one day, read from the one ledger the director writes
 * (`ledger.people.get(id).schedule`), with no copy: for each moment its cause record, outcome, the
 * types bound, the types held back with the reason the director gave, the reason a waiting scene
 * closed as a journal line, and, for a scene that stages, the bank piece its first line opened on and
 * the facts that filled it (read from the scene as the director composes it). Counts by outcome and
 * by reason come from the same rows. The row is one object per moment so the board's columns
 * (candidates, first failed gate, reads, scores, picks) are added as fields on it, not as a second
 * route. The player and the date of the world are the defaults. Reads only; spends no game time.
 */
import { composeScene } from "../../director/scene";
import type { PersonId } from "../../core2/types";
import type { DevView } from "../dev-views";

const view: DevView = {
  name: "director-day",
  client: "dev-director-day.mjs",
  labels: {
    title: "The director's day",
    show: "Show the day",
    date: "Day",
    cause: "Cause",
    bound: "Staged as",
    held: "Held back",
    closed: "Closed as a journal line",
    firstLine: "First line opened on",
    filledBy: "Filled by",
    nothing: "The director weighed no moments this day.",
    trace: "Trace",
    byOutcome: "Moments by outcome",
    byReason: "Held or closed, by reason",
    outcomes: {
      "scene-now": "A scene now",
      "scene-waiting": "A scene waiting",
      "journal-line": "A journal line",
    },
    reasons: {
      "season-cap": "The scene's season was full",
      "nothing-changed": "Nothing had changed since it last played",
      "nothing-to-ask": "There was nothing to ask that the game can settle",
    },
    timings: { now: "Now", waiting: "Waiting for you" },
  },
  routes: {
    "GET director/day": ({ mode, q }) => {
      const core = mode.core;
      const personId = (q("person") || core.playerId) as PersonId | undefined;
      const date = q("date") || core.date;
      const book = personId
        ? mode.director?.ledger.people.get(personId)
        : undefined;
      const byOutcome: Record<string, number> = {};
      const byReason: Record<string, number> = {};
      const bump = (table: Record<string, number>, key: string) => {
        table[key] = (table[key] ?? 0) + 1;
      };
      const moments = (book?.schedule ?? [])
        .filter((entry) => entry.date === date)
        .map((entry) => {
          const moment = book!.momentsById.get(entry.momentId);
          bump(byOutcome, entry.outcome);
          for (const held of entry.heldBack ?? []) bump(byReason, held.reason);
          if (entry.closed) bump(byReason, entry.closed);
          // The first line as the director composes it from the same entry: the bank piece it
          // opened on and the facts that filled it. A scene set to the day alone has no piece.
          const arrival =
            entry.bindings.length && entry.outcome !== "journal-line"
              ? composeScene(core, mode.director!, personId!, entry)?.arrival
              : undefined;
          return {
            momentId: entry.momentId,
            date: entry.date,
            outcome: entry.outcome,
            closed: entry.closed ?? null,
            rank: entry.rank,
            pace: entry.pace,
            cause: moment
              ? {
                  id: moment.causeId,
                  kind: moment.causeKind,
                  label: moment.label,
                }
              : null,
            bound: entry.bindings.map((bound) => ({
              typeKey: bound.typeKey,
              timing: bound.timing,
              setting: bound.setting,
            })),
            held: entry.heldBack ?? [],
            firstLine: arrival
              ? {
                  piece: arrival.parts?.[0] ?? null,
                  facts: [...(arrival.usedFactKeys ?? [])],
                }
              : null,
          };
        });
      return { personId: personId ?? null, date, moments, byOutcome, byReason };
    },
  },
};

export default view;
