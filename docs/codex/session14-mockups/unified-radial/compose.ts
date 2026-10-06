import { writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "/workspace/Political-Game-Git/src/presentation/new-game.ts";
import { drawRandomPlace } from "/workspace/Political-Game-Git/tests/support/random-place.ts";
import {
  projectObserverRecord,
  projectObserverPerson,
} from "/workspace/Political-Game-Git/src/presentation/observer-world.ts";
import { projectPersonalRecord } from "/workspace/Political-Game-Git/src/presentation/personal-record.ts";
import { activeWorkRelationshipsAt } from "/workspace/Political-Game-Git/src/simulation/life-queries.ts";
import { engineRecipeFor } from "/workspace/Political-Game-Git/src/presentation/appearance-engine/recipe.ts";
import {
  recipeFiles,
  composeEnginePerson,
} from "/workspace/Political-Game-Git/src/presentation/appearance-engine/pack.ts";
const require = createRequire("/workspace/Political-Game-Git/package.json");
const { PNG } = require("pngjs");
const pack = JSON.parse(
  readFileSync(
    "/workspace/Political-Game-Git/art/people-engine/v1/manifest.json",
    "utf8",
  ),
);
const recipe = {
  presentation: "feminine",
  build: "average",
  shade: 6,
  face: "20s30s-04",
  hair: "afro",
  hairColor: "black",
  outfit: "hoodie-jeans",
  pose: "standing",
  colors: { bottom: "khaki", top: "navy" },
} as const;
const images = new Map();
for (const file of recipeFiles(pack, recipe)) {
  const image = PNG.sync.read(
    readFileSync("/workspace/Political-Game-Git/art/people-engine/v1/" + file),
  );
  images.set(file, {
    width: image.width,
    height: image.height,
    data: new Uint8ClampedArray(image.data),
  });
}
const composed = composeEnginePerson(pack, (file) => images.get(file), recipe);
const png = new PNG({
  width: composed.raster.width,
  height: composed.raster.height,
});
png.data = Buffer.from(composed.raster.data);
writeFileSync(
  "/tmp/session14-mockups/unified-radial/person.png",
  PNG.sync.write(png),
);
writeFileSync(
  "/tmp/session14-mockups/unified-radial/art-recipe.json",
  JSON.stringify({ recipe, files: recipeFiles(pack, recipe) }, null, 2),
);
