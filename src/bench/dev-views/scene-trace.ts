/**
 * Dev mode's scene trace (owner, Nov 16: "a part of the dev mode should be able to trace and force
 * every scene to play. So see why every scene played and why dialogue options were chosen"; "every
 * single line of dialogue or narration ... has to be traced so easily, there can be no leftovers").
 * One view over what the director and the line register already hold, with no tracer of its own:
 *  - `types`: every situation type the director stages, with the way dev mode can cause it (the
 *    existing `scenes()` recipes), whether it can be forced at all (a type no engine writes the cause
 *    of is listed as unreachable, which is itself the finding), how many times it was staged for the
 *    player, and what the register says of its lines.
 *  - `moments`: the player's last staged scenes, each with its cause record, who is placed and why
 *    (`presentReasons`), the setting's record, the outcome and the types held back and why.
 *  - `lines`: every scene-talk line of a type's purpose, from the line register, with its tie class,
 *    the facts it needs, whether an engine reaches it and whether the grades or a rule hold it.
 *  - `force`: causes a type through the game's own code (`DevMode.forceScene`) and writes a dev-mode
 *    mark `scene-forced` on the record; a forced scene is never a played one for a Words stamp. The
 *    forced cause then meets the board's gates and room like any other (no gate is lifted), and the
 *    answer names the board's verdict: staged, or held back with the gate that cut it.
 *  - `board`: the director's board for one day (the board design's item 7): every candidate it
 *    weighed, stored moments and the scenes from circumstance offered, each with its cause record,
 *    its cards and the gate that cut each, its score and the reads behind it, the pick, and the life's
 *    room as the pick read it. Each row's `board` is the ledger entry's own (board.ts writes it); the
 *    view computes nothing.
 * Who each person in a scene is named as is the "who is named" view's (who-named), not read here.
 */
import { lineByKey, linesForPurpose } from "../../english/line-register";
import { applyCoreEvent } from "../../core2/state";
import { addDays, makeIsoDate } from "../../core2/kernel/dates";
import {
  SITUATION_LIBRARY,
  type ScheduleEntry,
} from "../../director/scheduling";
import type { PersonLedger } from "../../director/types";
import type { PersonId } from "../../core2/types";
import type { PurposeType } from "../../director/scene-talk";
import type { DevView } from "../dev-views";
import forceMap from "./scene-force-map.json";

/** How each situation type can be forced, measured by scripts/words/force-all-probe.mts: a record of its cause kind that the director stages from, or the reason that takes its module's own writer. */
const FORCE = (
  forceMap as {
    types: Record<
      string,
      {
        how: "event" | "writer";
        kind?: string;
        facts?: Record<string, string>;
        reason?: string;
      }
    >;
  }
).types;
/** The recipes that already cause a cause through an engine's own function: the map never overrides them. */
const OWN_RECIPES = ["death", "illness", "layoff"];

const MOMENTS = 20;

const personLabel = (person?: { givenName: string; familyName: string }) =>
  person ? `${person.givenName} ${person.familyName}` : undefined;

/**
 * What the board did with a forced type, read from the entries it wrote since the force: staged
 * (bound and not a journal line), else the first gate it gave (the card's own cut, the day's cut of
 * the moment, a scene from circumstance's cut, or the held-back reason), else not weighed (no
 * moment bound the type). The entry is the latest that names the type, its cause record first.
 */
function boardVerdict(
  book: PersonLedger | undefined,
  entries: readonly ScheduleEntry[],
  typeKey: string,
  causeId?: string,
): {
  verdict: "staged" | "held-back" | "not-weighed";
  reason: string | null;
  date: string | null;
  momentId: string | null;
} {
  const names = (entry: ScheduleEntry) =>
    entry.bindings.some((row) => row.typeKey === typeKey) ||
    !!entry.board?.cards.some((card) => card.typeKey === typeKey) ||
    !!entry.board?.offers?.some((offer) => offer.typeKey === typeKey) ||
    !!entry.heldBack?.some((held) => held.typeKey === typeKey);
  const named = entries.filter(names);
  const entry =
    named
      .filter((row) => book?.momentsById.get(row.momentId)?.causeId === causeId)
      .at(-1) ?? named.at(-1);
  if (!entry)
    return { verdict: "not-weighed", reason: null, date: null, momentId: null };
  const at = { date: entry.date, momentId: entry.momentId };
  if (
    entry.outcome !== "journal-line" &&
    entry.bindings.some((row) => row.typeKey === typeKey)
  )
    return { verdict: "staged", reason: null, ...at };
  const reason =
    entry.board?.cards.find((card) => card.typeKey === typeKey && card.cut)
      ?.cut ??
    (entry.bindings.some((row) => row.typeKey === typeKey)
      ? entry.board?.cut
      : undefined) ??
    entry.board?.offers?.find((offer) => offer.typeKey === typeKey)?.cut ??
    entry.heldBack?.find((held) => held.typeKey === typeKey)?.reason ??
    entry.closed ??
    null;
  return { verdict: "held-back", reason, ...at };
}

const view: DevView = {
  name: "scene-trace",
  client: "dev-scene-trace.mjs",
  labels: {
    title: "Scene trace",
    types: "Every scene the director stages",
    moments: "Scenes staged for you",
    force: "Make this scene play now",
    unreachable:
      "No engine writes this scene's cause yet, so dev mode cannot cause it",
    reasons: {
      "journal-line":
        "A bare record of its cause only makes a journal line: forcing it takes its module's own writer",
      circumstance:
        "Its cause is a circumstance or a turn in a tie that the engines write over time: dev mode runs the world until it comes",
      "no-event":
        "A bare record of its cause is refused: forcing it takes its module's own writer",
    },
    stagedNow: "Staged on the next day",
    notStagedNow:
      "Written, but the director did not stage it in this world: see the held-back reasons",
    forced: "Forced by dev mode: not a played scene",
    lines: "Every line this scene can say",
    why: "Why it played",
    held: "Held back",
    cause: "Cause",
    setting: "Setting",
    placed: "Who is placed, and why",
    tie: "Tied to",
    needs: "Needs",
    reach: "Reached by an engine",
    heldByRule: "Held back by the grades or a rule",
    ties: {
      declared: "the tie its use declares",
      binding: "a record kind and field its composer places it from",
      facts: "facts of the record",
      subject: "the subject it answers or raises (a tie record is required)",
      frame: "the meeting itself: two people in one place",
      scene: "the scene's cause record and its cast",
      document: "one record, read by a reader",
      "slot-pair": "a record of the speaker or hearer",
      "slot-world": "a record of the world only",
      weak: "nothing: only the kind of subject",
      none: "nothing: no use declared",
    },
    board: {
      title: "The director's board for a day",
      day: "Day",
      show: "Show the board",
      nothing: "Nothing was on the director's board this day.",
      room: "The life's room",
      pace: "pace over the year",
      standing: "times its standing",
      picks: "less picks this year",
      left: "room left",
      noRoom: "The day's pick was not read: nothing waited on the board",
      own: "Its cause is your own record: weighed outside the room",
      candidate: "Candidate",
      offered: "Offered from circumstance, not stored",
      cause: "Cause",
      card: "Card",
      felt: "Felt",
      reads: "Read",
      readRecords: "Records read",
      picked: "The day's pick",
      staged: "Staged by a stop rule",
      notPicked: "Not picked",
      trace: "Trace",
      readNames: {
        impact: "how strongly it was felt",
        tie: "the tie the offer leans on",
        size: "the size of the offer",
        need: "what the offer stakes",
        "refused-before": "offers refused before",
        "offered-before": "offers made before",
        "pressed-before": "offers pressed before",
        strain: "money strain",
        public: "a public place",
        "gift-size": "the size of the gift",
        "gift-share": "the gift's share",
        close: "closeness",
        "gave-before": "gifts given before",
        "put-off-before": "asks put off before",
        "answered-before": "questions answered before",
        "sparred-before": "interviews sparred before",
        "dodged-before": "questions dodged before",
        "town-against": "the town against",
        quarrel: "a quarrel",
        "declined-party": "a party's ask declined",
        "exposed-before": "exposed in the press before",
        scandal: "scandal on record",
        "national-desk": "a national outlet",
        reach: "the office's reach",
        "same-party": "the same party",
        "holds-post": "holds a post",
        "favor-given": "favors given",
        "town-for-bill": "the town for the bill",
        "town-against-bill": "the town against the bill",
        "about-money": "about money",
        "quarreled-before": "quarrels before",
        complaint: "a complaint",
        witnessed: "seen firsthand",
        told: "told by someone",
        "bribe-taken": "a bribe taken",
        "laid-off": "laid off",
        "notice-served": "a notice served",
        "rent-owed": "rent owed",
        "own-illness": "their own illness",
        "household-illness": "illness at home",
      },
      verdicts: {
        staged: "The board staged it",
        "held-back": "The board held it back",
        "not-weighed":
          "No moment bound this scene, so the board never weighed it",
      },
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
        skipping:
          "Time is skipped, and only a scene met where you are stops it",
        "no-room": "The life has no room left in its year",
        outscored: "Another candidate was felt more",
        requires: "Something it needs is not on record",
        excludes: "An earlier answer on record rules it out",
        "asked-twice": "The player already said no to this twice",
      },
    },
  },
  routes: {
    "GET scene-trace/types": ({ mode }) => {
      const personId = mode.core.playerId as PersonId | undefined;
      const book = personId
        ? mode.director?.ledger.people.get(personId)
        : undefined;
      const staged = new Map<
        string,
        { count: number; last?: string; heldBack: number }
      >();
      for (const entry of book?.schedule ?? [])
        for (const bound of entry.bindings) {
          const row = staged.get(bound.typeKey) ?? { count: 0, heldBack: 0 };
          row.count += 1;
          row.last = entry.date;
          staged.set(bound.typeKey, row);
        }
      for (const entry of book?.schedule ?? [])
        for (const held of entry.heldBack ?? []) {
          const row = staged.get(held.typeKey) ?? { count: 0, heldBack: 0 };
          row.heldBack += 1;
          staged.set(held.typeKey, row);
        }
      const types = mode.scenes().map((scene) => {
        const type = SITUATION_LIBRARY.types.find(
          (row) => row.key === scene.key,
        ) as PurposeType | undefined;
        const lines = type?.purpose ? linesForPurpose(type.purpose) : [];
        const byTie: Record<string, number> = {};
        for (const line of lines) byTie[line.tie] = (byTie[line.tie] ?? 0) + 1;
        const way = FORCE[scene.key];
        // A type a record of its cause kind stages is forced at once; the rest name why they are not.
        const byEvent =
          way?.how === "event" &&
          !OWN_RECIPES.includes(scene.recipe ?? "") &&
          scene.state !== "none";
        return {
          key: scene.key,
          why:
            way?.how === "writer" && scene.state !== "none"
              ? (way.reason ?? null)
              : null,
          purpose: type?.purpose ?? null,
          settings:
            SITUATION_LIBRARY.types.find((row) => row.key === scene.key)
              ?.setting ?? [],
          causeRecords: scene.causeRecords,
          recipe: byEvent ? "event" : scene.recipe,
          state: byEvent ? "plays" : scene.state,
          forceable: scene.state !== "none",
          staged: staged.get(scene.key)?.count ?? 0,
          lastStaged: staged.get(scene.key)?.last ?? null,
          heldBack: staged.get(scene.key)?.heldBack ?? 0,
          lines: lines.length,
          byTie,
          unreached: lines.filter((line) => line.reach === "unreached").length,
        };
      });
      return {
        types,
        unreachable: types
          .filter((type) => !type.forceable)
          .map((type) => type.key),
      };
    },
    "GET scene-trace/moments": ({ mode }) => {
      const personId = mode.core.playerId as PersonId | undefined;
      const book = personId
        ? mode.director?.ledger.people.get(personId)
        : undefined;
      const rows = (book?.schedule ?? []).slice(-MOMENTS).reverse();
      return rows.map((entry) => {
        const moment = book?.momentsById.get(entry.momentId);
        return {
          momentId: entry.momentId,
          date: entry.date,
          outcome: entry.outcome,
          closed: entry.closed ?? null,
          cause: moment
            ? {
                id: moment.causeId,
                kind: moment.causeKind,
                label: moment.label,
              }
            : null,
          heldBack: entry.heldBack ?? [],
          scenes: entry.bindings.map((bound) => ({
            typeKey: bound.typeKey,
            setting: bound.setting,
            timing: bound.timing,
            reason: bound.reason ?? null,
            placed: Object.entries(bound.presentReasons).map(([id, why]) => ({
              personId: id,
              name: personLabel(mode.core.people.get(id as PersonId)) ?? id,
              why,
            })),
          })),
        };
      });
    },
    "GET scene-trace/lines": ({ q }) => {
      const type = SITUATION_LIBRARY.types.find(
        (row) => row.key === q("type"),
      ) as PurposeType | undefined;
      if (!type?.purpose) return [];
      return linesForPurpose(type.purpose).map((line) => ({
        key: line.key,
        text: line.text,
        tie: line.tie,
        requires: line.requires,
        reach: line.reach,
        held: line.held,
      }));
    },
    "GET scene-trace/line": ({ q }) => lineByKey(q("key")) ?? null,
    "GET scene-trace/board": ({ mode, q }) => {
      const personId = mode.core.playerId as PersonId | undefined;
      const date = q("date") || mode.core.date;
      const book = personId
        ? mode.director?.ledger.people.get(personId)
        : undefined;
      // Each entry the board weighed that day, with its own board as board.ts wrote it.
      const rows = (book?.schedule ?? [])
        .filter((entry) => entry.date === date && entry.board)
        .map((entry) => {
          const moment = book!.momentsById.get(entry.momentId);
          return {
            momentId: entry.momentId,
            outcome: entry.outcome,
            stopsBecause: entry.stopsBecause ?? [],
            cause: moment
              ? {
                  id: moment.causeId,
                  kind: moment.causeKind,
                  label: moment.label,
                }
              : null,
            bound: entry.bindings.map((row) => row.typeKey),
            board: entry.board!,
          };
        });
      return {
        personId: personId ?? null,
        date,
        rows,
        // The room as the day's pick read it, kept on one of the day's entries.
        room: rows.find((row) => row.board.room)?.board.room ?? null,
      };
    },
    "POST scene-trace/force": ({ mode, input }) => {
      const typeKey = String(input.typeKey ?? "");
      const way = FORCE[typeKey];
      const own = mode.scenes().find((row) => row.key === typeKey);
      const playerId = mode.core.playerId as PersonId | undefined;
      if (
        way?.how === "event" &&
        way.kind &&
        playerId &&
        mode.director &&
        !OWN_RECIPES.includes(own?.recipe ?? "")
      ) {
        // The cause as a record of its kind naming the player, entered through the core's one event
        // entry; the director measures it at the day's end and stages it as it would any moment.
        const book = mode.director.ledger.people.get(playerId);
        const seen = book?.schedule.length ?? 0;
        const eventId = `dev-force:${typeKey}:${mode.core.date}`;
        const player = mode.core.people.get(playerId)!;
        applyCoreEvent(mode.core, {
          id: eventId,
          date: mode.core.date,
          kind: way.kind,
          personIds: [playerId],
          witnessIds: [],
          placeId: player.placeId,
          facts: { ...way.facts },
          source: {
            tag: "ESTIMATED",
            citation: `Dev mode forced ${typeKey}`,
            asOf: mode.core.date,
          },
        } as never);
        mode.advance(addDays(makeIsoDate(mode.core.date), 1));
        const since = book?.schedule.slice(seen) ?? [];
        const staged = since.some((row) =>
          row.bindings.some((bound) => bound.typeKey === typeKey),
        );
        return {
          recipe: "event",
          personId: playerId,
          causeRecords: [eventId],
          staged,
          board: boardVerdict(book, since, typeKey, eventId),
          mark: mode.mark("scene-forced", [eventId], {
            typeKey,
            recipe: "event",
            staged: String(staged),
          }),
        };
      }
      const book = playerId
        ? mode.director?.ledger.people.get(playerId)
        : undefined;
      // The schedule folds by count over a long run, so the entries since are read by date.
      const from = mode.core.date;
      const forced = mode.forceScene({
        typeKey,
        ...(typeof input.forId === "string" ? { forId: input.forId } : {}),
        ...(typeof input.where === "string" ? { where: input.where } : {}),
      });
      return {
        ...forced,
        board: boardVerdict(
          book,
          (book?.schedule ?? []).filter((entry) => entry.date >= from),
          typeKey,
        ),
        mark: mode.mark("scene-forced", [], {
          typeKey,
          recipe: String(forced.recipe),
        }),
      };
    },
  },
};

export default view;
