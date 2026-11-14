/**
 * The picture a story scene is drawn in. The names it tries come from
 * `pictureSteps` (scene-picture-steps.ts, one lookup in scene-places.json);
 * this fills in the tokens from the records: the household a scene is staged
 * in (the counterpart's, for a visit to their home), the employer, the
 * dwelling kind at a door, the office kind a person serves in and the room of
 * the body they sit on.
 */
import { coreAPI } from "../core2/state";
import { dwellingKind } from "../core2/modules/housing";
import { hasBackdrop } from "./backdrop-places";
import { bodyPicture } from "./legislature";
import {
  homeOf,
  officeWorkplace,
  orgPlace,
  pictureFor,
  servingOfficeIds,
} from "./scene";
import { pictureSteps, type PictureAsk } from "./scene-picture-steps";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import type { CoreState } from "../core2/types";

const DOORS = scenePlaces.doorKnockingPlaces as Record<string, string>;

export interface ScenePictureOf extends PictureAsk {
  /** The setting's record (a household, an employer, a body). */
  readonly recordId?: string | undefined;
  /** Everyone staged in the scene, for the counterpart whose home it is. */
  readonly presentIds: readonly string[];
}

/** The other person in a scene staged at someone else's home: a member of the household the setting names. */
function hostOf(core: CoreState, personId: string, ask: ScenePictureOf) {
  return ask.presentIds.find(
    (id) =>
      id !== personId &&
      core.people.get(id)?.householdId === ask.recordId &&
      core.people.get(id)?.alive,
  );
}

/** The painted place a scene is drawn in, at this hour's light by the town's own choice of its kind. */
export function scenePicture(
  core: CoreState,
  personId: string,
  ask: ScenePictureOf,
  minuteOfDay: number,
  /** The room a chamber scene shows: the body's own (agreements/3-4.md). */
  chamber: string | null,
): string {
  const at = (id: string) => homeOf(core, id, minuteOfDay);
  const resolve = (name: string): string | null => {
    switch (name) {
      case "@home": {
        // Someone else's home is that household's, not the player's own.
        const host =
          ask.setting === "other-home"
            ? hostOf(core, personId, ask)
            : undefined;
        return at(host ?? personId);
      }
      case "@org":
        return orgPlace(core, ask.recordId);
      case "@door": {
        const host = hostOf(core, personId, ask);
        const household = host ? core.people.get(host)?.householdId : undefined;
        const dwelling =
          (household && dwellingKind(coreAPI(core), household)) || "house";
        return DOORS[dwelling] ?? DOORS.house ?? null;
      }
      case "@office":
        return officeWorkplace(core, personId);
      case "@seatroom":
        return (
          servingOfficeIds(core, personId)
            .map((officeId) => bodyPicture(core, personId, officeId))
            .find((row): row is string => !!row) ?? null
        );
      default:
        return name;
    }
  };
  const place =
    [
      ...(chamber ? [chamber] : []),
      ...pictureSteps(ask).map((step) => resolve(step.name)),
    ].find((row): row is string => !!row && hasBackdrop(row)) ?? at(personId);
  return pictureFor(core, place, ask.recordId ?? ask.setting, minuteOfDay);
}
