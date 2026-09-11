import fs from "node:fs";
import path from "node:path";
import {
  createCharacterComponentLibrary,
  liftCandidatesForReview,
  resolveCharacterRecipe,
  projectCharacterLayers,
  type CharacterCatalogData,
  type CharacterComponentManifestRecord,
} from "../../src/presentation/character-components";
import {
  createGarmentFitBank,
  type GarmentFitBankData,
} from "../../src/presentation/garment-fit";
const read = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));
const records = read("art/manifest/character_candidate_visual4_registry.json")
  .assets as CharacterComponentManifestRecord[];
const eligible = records.filter(
  (r) =>
    r.candidate_component?.kind === "body" ||
    (r.candidate_component?.compatible_body_families?.length ?? 0) > 0,
);
const lifted = liftCandidatesForReview(
  eligible,
  (read("art/manifest/character_catalog.json") as CharacterCatalogData).slots,
);
const lib = createCharacterComponentLibrary(
  lifted.records,
  lifted.catalog,
  createGarmentFitBank(
    read(
      "art/manifest/character_candidate_visual4_fit.json",
    ) as GarmentFitBankData,
  ),
);
const result = [];
for (const body of eligible.filter(
  (r) => r.candidate_component?.kind === "body",
)) {
  const family = body.candidate_component!.family;
  const head = eligible.find(
    (r) =>
      r.candidate_component?.kind === "head" &&
      r.asset_id.includes("light_oval_young_v1"),
  )!;
  const families = Object.fromEntries(
    ["top", "bottom", "footwear"].map((kind) => {
      const choices = eligible.filter(
        (r) =>
          r.candidate_component?.kind === kind &&
          r.candidate_component.compatible_body_families?.includes(family),
      );
      const selected =
        choices.find((r) => r.asset_id.includes("gray_long_sleeve_tee")) ??
        choices.find((r) => r.asset_id.includes("blue_straight_jeans")) ??
        choices.find((r) => r.asset_id.includes("low_top_sneaker")) ??
        choices[0];
      return [kind, selected ? [selected.candidate_component!.family] : []];
    }),
  );
  const recipe = resolveCharacterRecipe(
    {
      appearance: {
        seed: "visual4-diagnostic",
        recipeVersion: "appearance-recipe-v1",
        catalogGeneration: 1,
        selection: {
          bodyFamily: family,
          headFamily: head.candidate_component!.family,
          hairFamily: null,
        },
      },
      poseFamily: body.candidate_component!.pose_family!,
      wardrobe: { id: "diagnostic", families },
      unresolvableRequiredSlots: "diagnose",
    },
    lib,
  );
  result.push({
    body: body.asset_id,
    projection: projectCharacterLayers(recipe, lib),
    files: Object.fromEntries(eligible.map((r) => [r.asset_id, r.final_path])),
    diagnostics: recipe.context.diagnostics,
  });
}
const destination = process.argv[2] ?? "art/qa/people-visual4/projected.json";
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(result, null, 2) + "\n");
