import manifestJson from "../../../art/people-engine/v1/manifest.json" with { type: "json" };
import { optionalGlob } from "../optional-glob";
import type { BodyAnchors } from "./anchors";
import {
  composeEnginePerson,
  engineRecipeKey,
  recipeFiles,
  type BodyPose,
  type EngineRecipe,
  type PeoplePackManifest,
} from "./pack";
import type { Raster } from "./raster";

/**
 * The people engine in the browser: the pack's files, decoded once, and each
 * composed person cached by recipe. Only the people on screen are drawn,
 * and each distinct recipe once.
 */

// JSON reads every occasion as a plain string; the pack builder wrote them.
export const PEOPLE_PACK = manifestJson as unknown as PeoplePackManifest;

const urls = optionalGlob(() =>
  import.meta.glob<string>("../../../art/people-engine/v1/*.png", {
    eager: true,
    query: "?url",
    import: "default",
  }),
);

function packFileUrl(file: string): string | null {
  return urls[`../../../art/people-engine/v1/${file}`] ?? null;
}

/**
 * Whether the build has a pack file. A pose whose files are missing is drawn
 * in the pose it falls back to (posedPieces).
 */
export function peoplePackFileAvailable(file: string): boolean {
  // Outside a bundled build no file is loaded at all, and the manifest is
  // all there is to go by.
  if (Object.keys(urls).length === 0) return true;
  return packFileUrl(file) !== null;
}

/** False outside a bundled build (plain Node tools and unit tests). */
export function peoplePackAvailable(): boolean {
  return (
    typeof document !== "undefined" &&
    packFileUrl(PEOPLE_PACK.presentations.feminine.bodies.average.file) !== null
  );
}

export interface EnginePersonImage {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly anchors: BodyAnchors;
  /** The pose drawn: the recipe's, or the one it fell back to. */
  readonly pose: BodyPose;
  /** For a seated person: the row the seat is at. */
  readonly seatRow?: number;
}

const decoded = new Map<string, Promise<Raster>>();

function decode(file: string): Promise<Raster> {
  let pending = decoded.get(file);
  if (!pending) {
    pending = (async () => {
      const url = packFileUrl(file);
      if (!url) throw new Error(`The people pack has no file ${file}.`);
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("No 2D canvas is available.");
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      return { width: data.width, height: data.height, data: data.data };
    })();
    // A failed decode is not remembered: the next ask tries the file again.
    pending.catch(() => decoded.delete(file));
    decoded.set(file, pending);
  }
  return pending;
}

const composed = new Map<string, Promise<EnginePersonImage>>();
/** People are composed one at a time, so a full room never stalls a frame for long. */
let queue: Promise<unknown> = Promise.resolve();

export function enginePersonImage(
  recipe: EngineRecipe,
): Promise<EnginePersonImage> {
  const key = engineRecipeKey(recipe);
  let pending = composed.get(key);
  if (!pending) {
    pending = (async () => {
      const files = recipeFiles(PEOPLE_PACK, recipe, peoplePackFileAvailable);
      const rasters = new Map(
        await Promise.all(
          files.map(async (file) => [file, await decode(file)] as const),
        ),
      );
      const turn = queue.then(
        () => new Promise((resolve) => setTimeout(resolve, 0)),
      );
      queue = turn;
      await turn;
      const { raster, anchors, pose, seatRow } = composeEnginePerson(
        PEOPLE_PACK,
        (file) => rasters.get(file)!,
        recipe,
        peoplePackFileAvailable,
      );
      const canvas = document.createElement("canvas");
      canvas.width = raster.width;
      canvas.height = raster.height;
      canvas
        .getContext("2d")!
        .putImageData(
          new ImageData(
            new Uint8ClampedArray(raster.data),
            raster.width,
            raster.height,
          ),
          0,
          0,
        );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Encoding failed."))),
          "image/png",
        ),
      );
      return {
        url: URL.createObjectURL(blob),
        width: raster.width,
        height: raster.height,
        anchors,
        pose,
        ...(seatRow === undefined ? {} : { seatRow }),
      };
    })();
    pending.catch(() => composed.delete(key));
    composed.set(key, pending);
  }
  return pending;
}
