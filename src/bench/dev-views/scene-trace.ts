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
 *    mark `scene-forced` on the record; a forced scene is never a played one for a Words stamp.
 * Who each person in a scene is named as is the "who is named" view's (who-named), not read here.
 */
import { lineByKey, linesForPurpose } from "../../english/line-register";
import { SITUATION_LIBRARY } from "../../director/scheduling";
import type { PersonId } from "../../core2/types";
import type { PurposeType } from "../../director/scene-talk";
import type { DevView } from "../dev-views";

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
      facts: "facts of the record",
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
        return {
          key: scene.key,
          purpose: type?.purpose ?? null,
          settings:
            SITUATION_LIBRARY.types.find((row) => row.key === scene.key)
              ?.setting ?? [],
          causeRecords: scene.causeRecords,
          recipe: scene.recipe,
          state: scene.state,
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
    },
  },
};

export default view;
