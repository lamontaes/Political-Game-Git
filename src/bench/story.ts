import { composeScene } from "../director/scene";
import { homePlaceFor } from "../presentation/place-backdrops";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { backdropFile, orgPlace, stagePeople } from "./scene";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import type { CoreState } from "../core2/types";
import type { Director } from "../director/ledger";

const PICTURED = new Set(
  manifest.backdrops
    .filter((row) => row.variant === "midday")
    .map((row) => row.place),
);
const SETTINGS = scenePlaces.sceneSettings as Record<string, string[]>;

/** A big moment, staged: its setting's picture, the people there, the narration. */
export function storyScene(
  core: CoreState,
  director: Director,
  personId: string,
  momentId: string,
  minuteOfDay: number,
) {
  const book = director.ledger.people.get(personId);
  const entry = book?.schedule.find((row) => row.momentId === momentId);
  if (!entry) throw new Error("No scheduled moment with that id.");
  const scene = composeScene(core, director, personId, entry);
  if (!scene) throw new Error("This moment has no scene.");
  const place =
    (SETTINGS[scene.setting.kind] ?? ["@home"])
      .map((step) =>
        step === "@home"
          ? homePlaceFor(null)
          : step === "@org"
            ? orgPlace(core, scene.setting.recordId)
            : step,
      )
      .find((row): row is string => !!row && PICTURED.has(row)) ??
    homePlaceFor(null);
  const ids = [
    personId,
    ...scene.presentIds.filter(
      (id) => id !== personId && core.people.get(id)?.alive,
    ),
  ];
  const cast = ids.map((id) => {
    const row = core.people.get(id)!;
    return { id, name: `${row.givenName} ${row.familyName}` };
  });
  return {
    momentId,
    place,
    backdrop: backdropFile(place, minuteOfDay),
    people: stagePeople(core, place, cast).people,
    narration: scene.narration,
    talkToId: scene.talkToId,
    names: Object.fromEntries(cast.map((row) => [row.id, row.name])),
  };
}
