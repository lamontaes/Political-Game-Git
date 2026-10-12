import { existsSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import {
  homePlaceFor,
  workplacePlaceFor,
} from "../presentation/place-backdrops";
import {
  backdropStaging,
  spotFigure,
  spotPose,
  spotView,
  type StagingSpot,
} from "../presentation/backdrop-people";
import { engineRecipeFor } from "../presentation/appearance-engine/recipe";
import { placeWear } from "../presentation/dress-code";
import {
  composeEnginePerson,
  mirrorToFace,
  type EngineRecipe,
} from "../presentation/appearance-engine/pack";
import { PEOPLE_PACK } from "../presentation/appearance-engine/runtime";
import type { Raster } from "../presentation/appearance-engine/raster";
import type { CoreState, PersonState } from "../core2/types";
import { coreAPI, fillInPerson } from "../core2/state";
import { residentsRuntime } from "../core2/modules/residents";
import type { PlayerPacketV1 } from "../core2/player-v1";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

type Person = Parameters<typeof engineRecipeFor>[0];
type Occupation = Parameters<typeof workplacePlaceFor>[0];

const PACK_DIR = new URL("../../art/people-engine/v1/", import.meta.url);
const BACKDROP_DIR = new URL("../../art/backdrops/", import.meta.url);
// The presentation's hasBackdrop reads Vite's file glob; the bench reads the manifest.
const PICTURED = new Set(
  manifest.backdrops
    .filter((row) => row.variant === "midday")
    .map((row) => row.place),
);
export const hasBackdrop = (place: string) => PICTURED.has(place);
const ACTIONS = scenePlaces.actions as Record<string, readonly string[]>;
const ORG_KINDS = scenePlaces.organizationKinds as Record<string, string>;
const ORG_PLACES = scenePlaces.placesWithoutKind as Record<string, string>;

/** The bench's picture of where a person is and who is there with them. */
export interface BenchScene {
  place: string;
  why: string;
  backdrop: { file: string; variant: string; url: string };
  people: BenchScenePerson[];
  /** People who are there but have no spot or no adult artwork yet. */
  unplaced: { personId: string; reason: string }[];
}
export interface BenchScenePerson {
  personId: string;
  name: string;
  spotId: string;
  figure: ReturnType<typeof spotFigure>;
  figureUrl: string;
}

export function orgPlace(
  core: CoreState,
  orgId: string | undefined,
): string | null {
  const org = orgId ? core.organizations.get(orgId) : undefined;
  const classification = org?.classification;
  if (!classification) return null;
  if (ORG_PLACES[classification]) return ORG_PLACES[classification]!;
  const kind =
    ORG_KINDS[classification] ??
    classification.slice(classification.indexOf(":") + 1);
  return workplacePlaceFor(null, null, kind);
}

function workplaceOf(core: CoreState, person: PersonState): string {
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  if (!job) return "office";
  const org = core.organizations.get(job.organizationId);
  const classification = org?.classification;
  if (classification && ORG_PLACES[classification])
    return ORG_PLACES[classification]!;
  const kind = classification
    ? (ORG_KINDS[classification] ??
      classification.slice(classification.indexOf(":") + 1))
    : null;
  return workplacePlaceFor(
    (job.occupationClassification ?? null) as Occupation,
    null,
    kind,
  );
}

// Stopgap SG-PLAY-home-dwelling-kind: new-core households record no dwelling
// type, so every home shows the shared house interior.
const homeOf = () => homePlaceFor(null);

/** What the person is doing right now, from the open pause or their last act. */
function doing(
  core: CoreState,
  personId: string,
  packet: PlayerPacketV1 | undefined,
): { actionId: string; targetId?: string } | undefined {
  if (packet?.kind === "stop" && packet.stop.work)
    return { actionId: "work-shift" };
  if (packet?.kind === "choice" && packet.choiceKind === "committed")
    return { actionId: "work-shift" };
  const ids = [...(core.logByPerson.get(personId) ?? [])];
  for (let i = ids.length - 1; i >= 0; i--) {
    const row = core.durableLog.get(ids[i]!) as
      | {
          kind: string;
          date: string;
          actorId?: string;
          actionId?: string;
          targetId?: string;
        }
      | undefined;
    if (row?.kind === "person.acted" && row.actorId === personId) {
      if (row.date !== core.date) return undefined;
      return { actionId: row.actionId ?? "", targetId: row.targetId };
    }
  }
  return undefined;
}

export function scenePlace(
  core: CoreState,
  personId: string,
  packet?: PlayerPacketV1,
): { place: string; why: string; targetId?: string } {
  const person = core.people.get(personId)!;
  const act = doing(core, personId, packet);
  const tries = act ? (ACTIONS[act.actionId] ?? ["@home"]) : ["@home"];
  for (const step of tries) {
    const place =
      step === "@home"
        ? homeOf()
        : step === "@workplace"
          ? workplaceOf(core, person)
          : step === "@target"
            ? orgPlace(core, act?.targetId)
            : step;
    if (place && hasBackdrop(place))
      return {
        place,
        why: act ? `${act.actionId}` : "at home",
        ...(act?.targetId ? { targetId: act.targetId } : {}),
      };
  }
  return { place: homeOf(), why: "at home" };
}

export function backdropFile(place: string, minuteOfDay: number) {
  const hour = Math.floor(minuteOfDay / 60);
  let wanted = "midday";
  for (const row of scenePlaces.variantByHour)
    if (hour >= row.fromHour) wanted = row.variant;
  const rows = manifest.backdrops.filter((row) => row.place === place);
  const row =
    rows.find((r) => r.variant === wanted) ??
    rows.find((r) => r.variant === "midday") ??
    rows[0]!;
  return {
    file: row.file,
    variant: row.variant,
    url: `/art/backdrops/${row.file}`,
  };
}

/** Who is there: the household at home, coworkers at work, else the act's other person. */
function presentIds(
  core: CoreState,
  personId: string,
  place: string,
  why: string,
  targetId?: string,
): string[] {
  const person = core.people.get(personId)!;
  const alive = (id: string) => core.people.get(id)?.alive === true;
  if (why === "work-shift" || why === "attend-scheduled-work-date-segment") {
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    if (!job) return [];
    const full = [...core.jobs.values()]
      .filter(
        (row) =>
          row.organizationId === job.organizationId &&
          row.personId !== personId &&
          !row.endsAt,
      )
      .map((row) => row.personId)
      .filter(alive)
      .sort();
    // Two-level world: coworkers still in the counts are met here, so they
    // are filled in (OPUS-CORE's fillInPerson), up to the room's spots.
    const room = (backdropStaging(place)?.spots.length ?? 1) - 1;
    const counted = [...(residentsRuntime(core)?.jobs.values() ?? [])]
      .filter((row) => row.organizationId === job.organizationId)
      .map((row) => row.personId)
      .sort()
      .slice(0, Math.max(room - full.length, 0));
    for (const id of counted) if (!core.people.has(id)) fillInPerson(core, id);
    return [...full, ...counted.filter(alive)];
  }
  if (
    targetId &&
    targetId !== personId &&
    core.people.has(targetId) &&
    alive(targetId)
  )
    return [targetId];
  if (place === homeOf())
    return (core.households.get(person.householdId)?.memberIds ?? [])
      .filter((id) => id !== personId)
      .filter(alive);
  return [];
}

/** Who a figure is: a resident, or an official known only by their term record. */
interface Looks {
  id: string;
  birthDate: string;
  gender?: string;
  seed?: string;
}
const OFFICES = "core2-offices-v1";
export function looksOf(core: CoreState, id: string): Looks | null {
  const person = core.people.get(id);
  if (person)
    return {
      id: person.id,
      birthDate: person.birthDate,
      ...(person.looks?.gender ? { gender: person.looks.gender } : {}),
      ...(person.looks?.appearanceSeed
        ? { seed: person.looks.appearanceSeed }
        : {}),
    };
  const term = coreAPI(core).moduleState(OFFICES).table("terms").get(id) as
    | {
        identity?: { birthDate: string; gender: string };
      }
    | undefined;
  return term?.identity
    ? { id, birthDate: term.identity.birthDate, gender: term.identity.gender }
    : null;
}

/** Engine recipes are read from the person's own seed and recorded looks. */
function recipeFor(
  core: CoreState,
  id: string,
  spot: StagingSpot,
  place: string,
): EngineRecipe | null {
  const looks = looksOf(core, id);
  if (!looks) return null;
  const base: Person = {
    id: looks.id,
    birthDate: looks.birthDate,
    ...(looks.gender ? { identity: { gender: looks.gender } } : {}),
    ...(looks.seed ? { appearance: { seed: looks.seed } } : {}),
  } as unknown as Person;
  const view = spotView(spot);
  const pose = spotPose(spot, undefined, looks.id, { view });
  // People dress for the place: formal where government is done in
  // public, business in offices, a coat outdoors in the cold months.
  const recipe = engineRecipeFor(base, core.date, PEOPLE_PACK, {
    pose,
    view,
    wear: placeWear(place, core.date),
  });
  if (!recipe) return null;
  if (spot.facing !== "left" && spot.facing !== "right") return recipe;
  return {
    ...recipe,
    mirrored: mirrorToFace(
      PEOPLE_PACK.presentations[recipe.presentation],
      recipe,
      spot.x,
      spot.facing === "left" ? spot.x - 10 : spot.x + 10,
      packFile,
    ),
  };
}

const packFile = (file: string) => existsSync(new URL(file, PACK_DIR));

/** Puts each id on the place's spots: the first on the hero spot, the rest behind. */
export function stagePeople(
  core: CoreState,
  place: string,
  ids: readonly { id: string; name: string }[],
): { people: BenchScenePerson[]; unplaced: BenchScene["unplaced"] } {
  const stage = backdropStaging(place);
  const people: BenchScenePerson[] = [];
  const unplaced: BenchScene["unplaced"] = [];
  if (!stage) return { people, unplaced };
  const hero = stage.spots.find((spot) => spot.hero) ?? stage.spots[0]!;
  // Others stand behind the lead first, nearest first, so the lead stays
  // the largest person in the picture.
  const rest = stage.spots
    .filter((spot) => spot !== hero && spot.pose !== "podium")
    .sort(
      (a, b) =>
        Number(a.y > hero.y) - Number(b.y > hero.y) ||
        (a.y > hero.y ? a.y - b.y : b.y - a.y),
    );
  const spots = [hero, ...rest];
  for (const [index, { id, name }] of ids.entries()) {
    const spot = spots[index];
    if (!spot) {
      unplaced.push({ personId: id, reason: "no-spot" });
      continue;
    }
    const recipe = recipeFor(core, id, spot, place);
    if (!recipe) {
      unplaced.push({ personId: id, reason: "no-adult-artwork" });
      continue;
    }
    const spotId = spot.id ?? `${place}:spot:${stage.spots.indexOf(spot)}`;
    people.push({
      personId: id,
      name,
      spotId,
      figure: spotFigure(stage, spot, recipe),
      figureUrl: `/api/figure?person=${encodeURIComponent(id)}&place=${encodeURIComponent(place)}&spot=${encodeURIComponent(spotId)}`,
    });
  }
  return { people, unplaced };
}

export function benchScene(
  core: CoreState,
  personId: string,
  packet?: PlayerPacketV1,
): BenchScene {
  const { place, why, targetId } = scenePlace(core, personId, packet);
  const minute = packet?.at.minuteOfDay ?? 12 * 60;
  const ids = [personId, ...presentIds(core, personId, place, why, targetId)];
  const { people, unplaced } = stagePeople(
    core,
    place,
    ids.map((id) => {
      const person = core.people.get(id)!;
      return { id, name: `${person.givenName} ${person.familyName}` };
    }),
  );
  return {
    place,
    why,
    backdrop: backdropFile(place, minute),
    people,
    unplaced,
  };
}

const rasters = new Map<string, Raster>();
function packImage(file: string): Raster {
  let raster = rasters.get(file);
  if (!raster) {
    const png = PNG.sync.read(readFileSync(new URL(file, PACK_DIR)));
    raster = {
      width: png.width,
      height: png.height,
      data: new Uint8ClampedArray(png.data),
    };
    rasters.set(file, raster);
  }
  return raster;
}

/** One person drawn for one spot, as a PNG. */
export function figurePng(
  core: CoreState,
  personId: string,
  place: string,
  spotId: string,
): Buffer {
  const stage = backdropStaging(place);
  const spot = stage?.spots.find(
    (row, index) => (row.id ?? `${place}:spot:${index}`) === spotId,
  );
  if (!spot || !looksOf(core, personId))
    throw new Error("Unknown person or spot.");
  const recipe = recipeFor(core, personId, spot, place);
  if (!recipe) throw new Error("No adult artwork for this person yet.");
  const { raster } = composeEnginePerson(
    PEOPLE_PACK,
    packImage,
    recipe,
    packFile,
  );
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data.buffer);
  return PNG.sync.write(png);
}

export function backdropPath(file: string): URL {
  if (!/^[a-z0-9-]+__[a-z]+\.jpg$/.test(file))
    throw new Error("Unknown backdrop.");
  return new URL(file, BACKDROP_DIR);
}
