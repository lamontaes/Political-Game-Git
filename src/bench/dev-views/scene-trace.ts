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
 *  - `force`: causes a type through the game's own code (`DevMode.forceScene`, or the elections
 *    engine's own writers for its scenes, dev-force-elections.ts, and the campaigns engine's for its,
 *    dev-force-campaigns.ts) and writes a dev-mode mark
 *    `scene-forced` on the record; a forced scene is never a played one for a Words stamp.
 * Who each person in a scene is named as is the "who is named" view's (who-named), not read here.
 */
import { lineByKey, linesForPurpose } from "../../english/line-register";
import { applyCoreEvent } from "../../core2/state";
import { addDays, makeIsoDate } from "../../core2/kernel/dates";
import { SITUATION_LIBRARY } from "../../director/scheduling";
import type { PersonId } from "../../core2/types";
import type { PurposeType } from "../../director/scene-talk";
import type { DevView } from "../dev-views";
import type { DevMode } from "../dev-mode";
import { forceElectionsScene } from "../dev-force-elections";
import { forceCampaignsScene } from "../dev-force-campaigns";
import forceMap from "./scene-force-map.json";

/** How each situation type can be forced, measured by scripts/words/force-all-probe.mts: a record of its cause kind that the director stages from, or the reason that takes its module's own writer. */
const FORCE = (
  forceMap as {
    types: Record<
      string,
      {
        how: "event" | "writer" | "elections" | "campaigns";
        kind?: string;
        facts?: Record<string, string>;
        reason?: string;
        recipe?: string;
      }
    >;
  }
).types;
/** The recipes that already cause a cause through an engine's own function: the map never overrides them. */
const OWN_RECIPES = ["death", "illness", "layoff"];

const MOMENTS = 20;

const personLabel = (person?: { givenName: string; familyName: string }) =>
  person ? `${person.givenName} ${person.familyName}` : undefined;

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
      "party-decides":
        "Its cause is a party's chair asking the member the party's own list puts first: dev mode cannot pick who the party asks",
      "no-race":
        "No race you may enter took your filing within two years of running the world",
      "no-ballot":
        "Your petition came up short at the clerk's check, so there was no race for you to lose",
      "no-count":
        "The count of your race did not come by its election day and the weeks a count may take after it",
      won: "You won the race, so there was no loss to tell: the voters decided it",
      "no-stake":
        "No one at home has anything of theirs at stake in the race, so there is no talk at home about it",
      "no-player": "There is no player to bring it about for",
      "no-runner":
        "No one close to you could file for a race within two years of running the world",
      "no-offer":
        "No one you know offered to help in that role within two months: each weighs it by their own reasons",
      "no-rival-word":
        "No one brought you word of a rival within two months of the campaign",
      "no-gift": "No donor you called gave in two weeks of calls",
      "no-endorse-ask":
        "The campaign of the one close to you did not ask you to endorse them within two months",
    },
    campaigns:
      "Brought about through the campaigns' own writers: a campaign runs on a filing (yours, or for an ask to endorse, the one closest to you who may run), and the people in it act by their own reasons",
    elections:
      "Brought about through the elections' own writers: the world runs to a race that takes your filing, you file at the counter, and for a loss you canvass for your petition and the world runs to the count",
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
        // A type the elections' own writers bring about is forced at once too.
        const byWriter =
          (way?.how === "elections" || way?.how === "campaigns") &&
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
          recipe: byEvent ? "event" : byWriter ? way!.how : scene.recipe,
          state: byEvent || byWriter ? "plays" : scene.state,
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
    "POST scene-trace/force": ({ mode, input }) => {
      const typeKey = String(input.typeKey ?? "");
      // A force goes past the director's pacing (the season cap, "nothing changed") for this one
      // type while it runs (CTO, Nov 17, #9809: "force every scene to play"); the director's own day
      // never sets this.
      mode.director?.forceType(typeKey, true);
      try {
        return force(mode, input, typeKey);
      } finally {
        mode.director?.forceType(typeKey, false);
      }
    },
  },
};

/** Brings about one situation type's cause through the game's own code and says what was staged. */
function force(
  mode: DevMode,
  input: Readonly<Record<string, unknown>>,
  typeKey: string,
) {
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
    const staged = !!book?.schedule
      .slice(seen)
      .some((row) => row.bindings.some((bound) => bound.typeKey === typeKey));
    return {
      recipe: "event",
      personId: playerId,
      causeRecords: [eventId],
      staged,
      mark: mode.mark("scene-forced", [eventId], {
        typeKey,
        recipe: "event",
        staged: String(staged),
      }),
    };
  }
  if (way?.how === "campaigns") {
    const forced = forceCampaignsScene(mode, typeKey);
    return {
      ...forced,
      why: forced.refused ?? null,
      mark: mode.mark(
        "scene-forced",
        [...forced.written, ...forced.causeRecords],
        {
          typeKey,
          recipe: `campaigns:${forced.way}`,
          staged: String(forced.staged),
        },
      ),
    };
  }
  if (way?.how === "elections") {
    const forced = forceElectionsScene(mode, typeKey);
    return {
      ...forced,
      why: forced.refused ?? null,
      mark: mode.mark(
        "scene-forced",
        [...forced.written, ...forced.causeRecords],
        {
          typeKey,
          recipe: `elections:${forced.way}`,
          staged: String(forced.staged),
        },
      ),
    };
  }
  const forced = mode.forceScene({
    typeKey,
    ...(typeof input.forId === "string" ? { forId: input.forId } : {}),
    ...(typeof input.where === "string" ? { where: input.where } : {}),
  });
  return {
    ...forced,
    mark: mode.mark("scene-forced", [], {
      typeKey,
      recipe: String(forced.recipe),
    }),
  };
}

export default view;
