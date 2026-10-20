import { hearingScript } from "../director/hearing-script";
import { composeScene } from "../director/scene";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { backdropFile, homeOf, orgPlace, stagePeople } from "./scene";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import type { CoreState } from "../core2/types";
import type { Director } from "../director/ledger";

const PICTURED = new Set(
  manifest.backdrops
    .filter((row) => row.variant === "midday")
    .map((row) => row.place),
);
const SETTINGS = scenePlaces.sceneSettings as Record<string, string[]>;
const SITUATIONS = scenePlaces.situationPlaces as Record<string, string[]>;
const SCHOOLS = scenePlaces.schoolPlacesByAge;

/** Whole years of age on a date. */
function ageOn(birthDate: string, date: string): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

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
  const person = core.people.get(personId)!;
  const age = ageOn(person.birthDate, core.date);
  const steps = [
    ...(SITUATIONS[`${scene.typeKey}:${scene.setting.kind}`] ?? []),
    ...(scene.setting.kind === "school"
      ? (SCHOOLS.find((row) => age < row.underAge)?.places ?? [])
      : []),
    ...(SETTINGS[scene.setting.kind] ?? ["@home"]),
  ];
  const place =
    steps
      .map((step) =>
        step === "@home"
          ? homeOf(core, personId, minuteOfDay)
          : step === "@org"
            ? orgPlace(core, scene.setting.recordId)
            : step,
      )
      .find((row): row is string => !!row && PICTURED.has(row)) ??
    homeOf(core, personId, minuteOfDay);
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
  // A public hearing is also spoken: the chair, the speakers and a member, from the records.
  const talk =
    scene.typeKey === "public-hearing"
      ? (hearingScript(core, director, personId, momentId) ?? [])
      : [];
  return {
    momentId,
    place,
    backdrop: backdropFile(place, minuteOfDay),
    people: stagePeople(core, place, cast).people,
    narration: scene.narration,
    talk: talk.map((line) => ({
      speaker: line.speaker,
      text: line.text,
      sourceRecordIds: line.sourceRecordIds,
    })),
    talkToId: scene.talkToId,
    names: Object.fromEntries(cast.map((row) => [row.id, row.name])),
  };
}
