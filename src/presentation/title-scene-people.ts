import { makeIsoDate } from "../simulation/dates";
import { createStableId, stableHash } from "../simulation/ids";
import type { EntityId } from "../simulation/types";
import {
  presentationPose,
  type BodyPose,
  type BodyView,
  type EngineRecipe,
} from "./appearance-engine/pack";
import {
  chooseBodyPose,
  sceneActivity,
} from "./appearance-engine/pose-chooser";
import { engineRecipeFor } from "./appearance-engine/recipe";
import { PEOPLE_PACK } from "./appearance-engine/runtime";
import {
  backdropStaging,
  drawnAtSpot,
  spotDepth,
  spotFigure,
  spotView,
  turnedToSpot,
  type SpotFigure,
  type StagingSpot,
} from "./backdrop-people";
import type { BrowserWorldSummary } from "./browser-world-repository";
import { placeDressCode } from "./dress-code";
import type { TitlePicture } from "./title-civic-rotation";

/**
 * PEOPLE STANDING AND POSING IN THE TITLE'S PLACES.
 *
 * Lamontae, Oct. 7: "The point is to get people standing and posing in them
 * now." Every national picture on the title has its staging spots marked in
 * art/backdrops/staging.json (where a person can stand, sit or speak, which
 * way they face and how near they are), and this fills them: a speaker at the
 * rally's or convention's lectern with the crowd listening, members at their
 * desks on the Senate floor, a person at the Oval Office desk with others
 * standing round it, justices on the bench.
 *
 * The people are drawn by the people engine from the shared pack, generated
 * from the picture and the spot they stand on, so the same picture always
 * holds the same people and no one is a named real figure. Each is posed by
 * the pose chooser for what they are doing there (giving the speech,
 * speaking, listening, at a desk), turned the way the spot faces, sized by
 * the spot's depth and floor, and cut off only where furniture hides them.
 * A returning player takes the picture's hero spot in their own look.
 *
 * PRESENTATION ONLY, and pure: no World, no clock, no randomness.
 */

/** One person in a title picture, in percent of the picture (1672 x 941). */
export interface TitleScenePerson extends SpotFigure {
  /** The staging spot they stand on, unique in the picture. */
  readonly spotId: string;
  /** The saved player's id when this is them; null for everyone else. */
  readonly personId: EntityId | null;
  /** Draw order, 0 farthest: nearer people are drawn over farther ones. */
  readonly depth: number;
  readonly engine: EngineRecipe;
}

/** The returning player, as the title can draw them without the world. */
export interface TitleSceneHero {
  readonly personId: EntityId;
  readonly name: string;
  readonly looks: NonNullable<BrowserWorldSummary["playerLooks"]>;
  readonly roleKind: string | null;
}

/**
 * Null when there is nothing honest to draw: no save, a watched world with
 * nobody played, or a save without the character's look (a child, or a save
 * made before looks were kept).
 */
export function titleSceneHero(
  summary: BrowserWorldSummary | null | undefined,
): TitleSceneHero | null {
  if (!summary || summary.observing || !summary.playerLooks) return null;
  if (Object.keys(summary.playerLooks).length === 0) return null;
  return {
    personId: summary.playerPersonId,
    name: summary.playerName,
    looks: summary.playerLooks,
    roleKind: summary.playerRole?.kind ?? null,
  };
}

/**
 * The middle of each band of ages the pack paints faces for (recipe.ts
 * faceBand: under 45, 45 to 64, 65 and over), so a crowd has young, middle
 * aged and older faces in it. A generated person's band comes from their
 * seed, as every other part of their look does.
 */
const FACE_BAND_AGES: readonly number[] = [33, 55, 72];

/** A fixed day to measure a generated person's age on: only the gap counts. */
const AGE_REFERENCE_YEAR = 2000;

function bandAge(seed: string): number {
  const index =
    Number.parseInt(stableHash(`${seed}:age`).slice(0, 8), 16) %
    FACE_BAND_AGES.length;
  return FACE_BAND_AGES[index]!;
}

/** The outfit a spot's role comes with: a justice's robe on the bench. */
function spotUniform(role: string | undefined): string | undefined {
  return role === "judge" ? "judge-robe" : undefined;
}

/**
 * A generated person's look for a spot, posed and turned as asked. The
 * recipe strikes the pose as their presentation does (presentationPose).
 */
function generatedRecipe(
  seed: string,
  place: string,
  spot: StagingSpot,
  pose: BodyPose,
  view: BodyView,
): EngineRecipe | null {
  const age = bandAge(seed);
  const uniform = spotUniform(spot.role);
  return engineRecipeFor(
    {
      id: createStableId("person", seed),
      birthDate: makeIsoDate(`${AGE_REFERENCE_YEAR - age}-01-01`),
    },
    `${AGE_REFERENCE_YEAR}-06-01`,
    PEOPLE_PACK,
    {
      wear: placeDressCode(place).dress,
      ...(uniform ? { uniform } : {}),
      pose,
      view,
    },
  );
}

/** The returning player's look for a spot, posed and turned as asked. */
function heroRecipe(
  hero: TitleSceneHero,
  place: string,
  spot: StagingSpot,
  pose: BodyPose,
  view: BodyView,
): EngineRecipe | null {
  const looks = hero.looks;
  const look =
    looks[placeDressCode(place).dress] ??
    looks.business ??
    looks.formal ??
    looks.casual ??
    null;
  if (!look) return null;
  // Drawn afresh for the spot: the saved pose, turn and mirroring are the
  // save's, not this place's.
  const {
    pose: _savedPose,
    view: _savedView,
    mirrored: _savedMirror,
    ...base
  } = look;
  const robe =
    hero.roleKind === "judge" || spot.role === "judge"
      ? PEOPLE_PACK.presentations[look.presentation].outfits.find(
          (outfit) => outfit.id === "judge-robe",
        )
      : undefined;
  const posed = presentationPose(pose, look.presentation);
  return {
    ...base,
    ...(robe ? { outfit: robe.id, colors: {} } : {}),
    ...(posed !== "standing" ? { pose: posed } : {}),
    ...(view !== "front" ? { view } : {}),
    expression: "smile",
  };
}

/**
 * Everyone in a title picture, farthest first. The speaker is whoever stands
 * at a lectern (a rally, a convention, an election night, a debate); where
 * the picture has none, whoever stands at its hero spot speaks to the rest
 * (the Oval Office desk, the Senate well). Spots facing away from the camera
 * wait for people drawn from behind, and a spot no pose in the pack can fill
 * (a wall to lean on) stays empty: nobody is drawn where they cannot stand.
 */
export function titleScenePeople(
  picture: Pick<TitlePicture, "place" | "variant">,
  hero: TitleSceneHero | null = null,
): readonly TitleScenePerson[] {
  const stage = backdropStaging(picture.place);
  if (!stage) return [];
  const spots = stage.spots.filter(
    (spot) =>
      spot.facing !== "away" &&
      !(spot.pose === "podium" && spot.audience === "away"),
  );
  const spotId = (spot: StagingSpot) =>
    spot.id ?? `${picture.place}:spot:${stage.spots.indexOf(spot)}`;
  const seedOf = (spot: StagingSpot) =>
    `title:${picture.place}:${picture.variant}:${spotId(spot)}`;
  const speakerSpot =
    spots.find((spot) => spot.pose === "podium") ??
    spots.find((spot) => spot.hero === true) ??
    null;
  const speakerId = speakerSpot ? seedOf(speakerSpot) : null;
  const people: TitleScenePerson[] = [];
  for (const spot of spots) {
    const seed = seedOf(spot);
    const seated = spot.pose === "sit";
    const activity = sceneActivity({
      personId: seed,
      speakerId,
      anchorType:
        spot.pose === "podium" ? "podium" : (spot.group ?? spot.pose ?? "stand"),
      seated,
    });
    const pose: BodyPose =
      spot.pose === "podium"
        ? "podium"
        : chooseBodyPose({ activity, seated, seed });
    const isHero = hero !== null && spot.hero === true;
    // Turned the way the spot faces; facing the room instead when these
    // clothes have no turned painting.
    let fit: { recipe: EngineRecipe; view: BodyView } | null = null;
    for (const view of new Set<BodyView>([spotView(spot), "front"])) {
      const recipe = isHero
        ? heroRecipe(hero, picture.place, spot, pose, view)
        : generatedRecipe(seed, picture.place, spot, pose, view);
      const resolved = recipe ? drawnAtSpot(spot, recipe, view) : null;
      if (recipe && resolved) {
        fit = { recipe, view: resolved.view };
        break;
      }
    }
    if (!fit) continue;
    const engine = turnedToSpot(spot, fit.recipe, fit.view);
    people.push({
      spotId: spotId(spot),
      personId: isHero ? hero.personId : null,
      ...spotFigure(stage, spot, engine),
      depth: spotDepth(spot),
      engine,
    });
  }
  return people.sort((a, b) => a.depth - b.depth);
}
