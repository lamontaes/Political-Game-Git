/**
 * Dev mode's director's day (pool items dev-mode-shows-the-directors-day and
 * dev-mode-shows-a-scenes-first-line-piece; owner, Nov 16: "a part of the dev mode should be able to
 * trace and force every scene to play. So see why every scene played"). `GET dev/director/day?person=&date=`
 * returns one person's schedule entries for one day, read from the one ledger the director writes
 * (`ledger.people.get(id).schedule`), with no copy: for each moment its cause record, outcome, the
 * types bound, the types held back with the reason the director gave, the reason a waiting scene
 * closed as a journal line, and, for a scene that stages, the bank piece its first line opened on and
 * the facts that filled it (read from the scene as the director composes it). Counts by outcome and
 * by reason come from the same rows. The board's columns (director-board-picks-a-few: candidates,
 * first failed gate, reads, scores, picks) are fields on the same row object, read from the entry's
 * `board`, not a second route; counts by cut come from them. The player and the date of the world are the defaults. Reads only; spends no game time.
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
    board: "On the day's board",
    candidates: "Candidates",
    cut: "Cut",
    score: "Felt",
    picked: "The day's pick",
    offered: "Offered and not stored",
    cuts: {
      yields: "It gives way to another scene of the same cause",
      "contest-passed": "Its race has had its election day",
      "not-allowed": "The player's filter leaves it out",
      "season-cap": "The scene's season was full",
      "nothing-changed": "Nothing had changed since it last played",
      "nothing-to-ask": "There was nothing to ask that the game can settle",
      "not-received": "Its receive rule refuses this cast",
      joined: "Taken into a sitting already staged today",
      "switched-off": "The player switched off this office stop",
      silent: "No one in it speaks and nothing is chosen",
      "nothing-said": "Its talk says nothing past its opener",
      skipping: "Time is skipped, and only a scene met where you are stops it",
      "no-room": "The life has no room left in its year",
      outscored: "Another candidate was felt more",
      requires: "Something it needs is not on record",
      excludes: "An earlier answer on record rules it out",
      "asked-twice": "The player already said no to this twice",
    },
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
      const byCut: Record<string, number> = {};
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
          if (entry.board?.cut) bump(byCut, entry.board.cut);
          for (const card of entry.board?.cards ?? [])
            if (card.cut) bump(byCut, card.cut);
          for (const offer of entry.board?.offers ?? []) bump(byCut, offer.cut);
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
            // The board's columns (board.ts): each card and its first failed
            // gate, what the score read, the score, the pick, and the scenes
            // from circumstance weighed beside it and never stored.
            board: entry.board
              ? {
                  candidates: entry.board.cards,
                  reads: entry.board.reads,
                  score: entry.board.score,
                  picked: entry.board.picked === true,
                  cut: entry.board.cut ?? null,
                  offers: entry.board.offers ?? [],
                }
              : null,
            firstLine: arrival
              ? {
                  piece: arrival.parts?.[0] ?? null,
                  facts: [...(arrival.usedFactKeys ?? [])],
                }
              : null,
          };
        });
      return {
        personId: personId ?? null,
        date,
        moments,
        byOutcome,
        byReason,
        byCut,
      };
    },
  },
};

export default view;
