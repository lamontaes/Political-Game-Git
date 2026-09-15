import {
  preparedFamily,
  defaultPreparedMaterial,
  generatedPreparedMaterial,
  validatePreparedAppearance,
} from "./engine-people29-data";
import type { PersonAppearance, World } from "../simulation/types";
import { SeededRng } from "../simulation/rng";
import {
  componentsAtGeneration,
  projectCharacterLayers,
  resolveAppearanceCatalogGeneration,
  resolveCharacterRecipe,
  type CharacterComponentLibrary,
  type CharacterRecipe,
} from "./character-components";

export type OutfitFamilies = NonNullable<
  PersonAppearance["outfit"]
>["families"];
export type OutfitKind = keyof OutfitFamilies;
export const OUTFIT_KINDS: readonly OutfitKind[] = [
  "top",
  "bottom",
  "footwear",
];
export interface OutfitRequest {
  readonly appearance: PersonAppearance;
  readonly library: CharacterComponentLibrary;
  readonly poseFamily: string;
  readonly families?: OutfitFamilies;
}
export type OutfitResult =
  | {
      readonly ok: true;
      readonly recipe: CharacterRecipe;
      readonly families: OutfitFamilies;
    }
  | {
      readonly ok: false;
      readonly message: string;
      readonly diagnostics: readonly string[];
    };

/** Single whole-outfit acceptance boundary for drawing, options and writes. Pure. */
export function resolveCompleteOutfit(request: OutfitRequest): OutfitResult {
  try {
    validatePreparedAppearance(request.appearance);
    const families = request.families ?? request.appearance.outfit?.families;
    const appearance = { ...request.appearance };
    delete appearance.outfit;
    const recipe = resolveCharacterRecipe(
      {
        appearance,
        poseFamily: request.poseFamily,
        catalogGeneration: resolveAppearanceCatalogGeneration(
          appearance,
          request.library.catalogGeneration,
        ),
        unresolvableRequiredSlots: "diagnose",
        ...(families
          ? {
              wardrobe: {
                id: "complete-outfit-v1",
                families: Object.fromEntries(
                  Object.entries(families).map(([k, v]) => [k, [v]]),
                ),
              },
            }
          : {}),
      },
      request.library,
    );
    const projected = projectCharacterLayers(recipe, request.library);
    const required = request.library.slots.filter((s) => s.required);
    const body = recipe.context.components.find((c) => c.kind === "body");
    const baked = body
      ? (request.library.components.get(body.assetId)?.definition.baked_slots ??
        [])
      : [];
    const missing = required.filter(
      (s) =>
        !baked.includes(s.kind) &&
        !recipe.context.components.some((c) => c.slotId === s.slot_id),
    );
    const wrong = Object.entries(families ?? {}).filter(
      ([kind, family]) =>
        !recipe.context.components.some(
          (c) => c.kind === kind && c.family === family,
        ),
    );
    if (
      !projected ||
      missing.length ||
      wrong.length ||
      projected.fitRefusals.length ||
      projected.layers.some((l) => !l.released)
    )
      return {
        ok: false,
        message:
          "This combination needs compatible clothing or a supported standing view. Your saved appearance has not changed.",
        diagnostics: [
          ...recipe.context.diagnostics.map((d) => d.message),
          ...missing.map((s) => `Missing ${s.slot_id}`),
          ...wrong.map(([k, v]) => `Unavailable ${k}: ${v}`),
          ...(projected?.fitRefusals.map((f) => JSON.stringify(f)) ?? []),
        ],
      };
    return {
      ok: true,
      recipe,
      families: Object.fromEntries(
        OUTFIT_KINDS.flatMap((kind) => {
          const c = recipe.context.components.find((c) => c.kind === kind);
          return c ? [[kind, c.family]] : [];
        }),
      ),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        "This appearance is unavailable with the selected outfit. Keep your current appearance or preview a compatible replacement.",
      diagnostics: [String(error)],
    };
  }
}

/** Search only clothing. Never changes body/head/hair to manufacture coverage. */
export function findCompleteOutfit(request: OutfitRequest): OutfitResult {
  const first = resolveCompleteOutfit(request);
  if (first.ok) return first;
  const generation = resolveAppearanceCatalogGeneration(
    request.appearance,
    request.library.catalogGeneration,
  );
  const available = componentsAtGeneration(request.library, generation);
  const choices = OUTFIT_KINDS.map((kind) =>
    [
      ...new Set(
        available
          .filter(
            (c) => c.definition.kind === kind && !c.definition.render_piece_of,
          )
          .map((c) => c.definition.family),
      ),
    ].sort(),
  );
  // Retained choices first. A caller must explicitly preview/confirm replacements.
  for (let i = 0; i < OUTFIT_KINDS.length; i++) {
    const preferred =
      request.families?.[OUTFIT_KINDS[i]!] ??
      request.appearance.outfit?.families[OUTFIT_KINDS[i]!];
    if (preferred)
      choices[i] = [preferred, ...choices[i]!.filter((x) => x !== preferred)];
  }
  function search(
    index: number,
    families: Record<string, string>,
  ): OutfitResult {
    if (index === OUTFIT_KINDS.length)
      return resolveCompleteOutfit({ ...request, families });
    const kind = OUTFIT_KINDS[index]!;
    // Prune each fitted part before trying combinations; exclusions are checked at the leaf.
    for (const family of choices[index]!) {
      const appearance = { ...request.appearance };
      delete appearance.outfit;
      try {
        const recipe = resolveCharacterRecipe(
          {
            appearance,
            poseFamily: request.poseFamily,
            catalogGeneration: generation,
            unresolvableRequiredSlots: "diagnose",
            wardrobe: {
              id: "complete-outfit-v1",
              families: { [kind]: [family] },
            },
          },
          request.library,
        );
        const part = recipe.context.components.find(
          (c) => c.kind === kind && c.family === family,
        );
        const layer =
          part &&
          projectCharacterLayers(recipe, request.library)?.layers.find(
            (l) => l.assetId === part.assetId,
          );
        if (!layer || layer.fitRefusal || !layer.released) continue;
      } catch {
        continue;
      }
      const found = search(index + 1, { ...families, [kind]: family });
      if (found.ok) return found;
    }
    if (!request.library.slots.some((s) => s.kind === kind && s.required))
      return search(index + 1, families);
    return first;
  }
  return search(0, {});
}

export function commitCompleteOutfit(
  world: World,
  personId: string,
  appearance: PersonAppearance,
  request: Omit<OutfitRequest, "appearance">,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    throw new Error("Only your own appearance can be changed.");
  const person = world.people[personId];
  if (
    !person?.appearance ||
    person.appearance.seed !== appearance.seed ||
    person.appearance.recipeVersion !== appearance.recipeVersion ||
    person.appearance.catalogGeneration !== appearance.catalogGeneration
  )
    throw new Error(
      "Appearance edit must preserve the saved identity seed and version.",
    );
  const result = resolveCompleteOutfit({ ...request, appearance });
  if (!result.ok) throw new Error(result.message);
  return {
    ...world,
    people: {
      ...world.people,
      [personId]: {
        ...person,
        appearance: {
          ...appearance,
          outfit: { version: "complete-outfit-v1", families: result.families },
        },
      },
    },
  };
}

/** Caller invokes once after genuinely fresh candidate creation; never on replay/load. */
export function initializeFreshCandidateOutfits(
  world: World,
  library: CharacterComponentLibrary,
  initializationVersion:
    "complete-outfit-v1" | "complete-outfit-v2" = "complete-outfit-v1",
): World {
  const people = { ...world.people };
  for (const id of world.personOrder) {
    const person = people[id]!;
    const appearance = person.appearance;
    if (!appearance || appearance.selection || appearance.outfit) continue;
    const available = componentsAtGeneration(
      library,
      resolveAppearanceCatalogGeneration(appearance, library.catalogGeneration),
    );
    let bodies = [
      ...new Set(
        available
          .filter(
            (c) =>
              c.definition.kind === "body" &&
              c.definition.pose_family === "standing-neutral" &&
              !c.definition.baked_slots?.includes("head"),
          )
          .map((c) => c.definition.family),
      ),
    ].sort();
    const prepared = bodies.filter((body) => preparedFamily(body));
    if (prepared.length && (appearance.catalogGeneration ?? 0) >= 5)
      bodies = prepared;
    const coherentDefaults = initializationVersion === "complete-outfit-v2";
    if (coherentDefaults) {
      const presentation =
        person.identity?.gender === "female"
          ? "feminine"
          : person.identity?.gender === "male"
            ? "masculine"
            : undefined;
      bodies = bodies.filter((body) => {
        const family = preparedFamily(body);
        return (
          family &&
          (!presentation || family.geometry.presentation === presentation)
        );
      });
      const latest = Math.max(
        ...available
          .filter((c) => bodies.includes(c.definition.family))
          .map((c) => c.definition.catalog_generation),
      );
      bodies = bodies.filter((body) =>
        available.some(
          (c) =>
            c.definition.family === body &&
            c.definition.catalog_generation === latest,
        ),
      );
      if (!bodies.length)
        throw new Error(
          "No complete prepared body supports this person's recorded default. The constructor cannot substitute a different presentation.",
        );
    }
    const rng = new SeededRng(appearance.seed).fork(initializationVersion);
    const start = bodies.length ? rng.integer(0, bodies.length) : 0;
    let finished = false;
    for (let i = 0; i < bodies.length && !finished; i++) {
      const bodyFamily = bodies[(start + i) % bodies.length]!;
      const heads = [
        ...new Set(
          available
            .filter(
              (c) =>
                c.definition.kind === "head" &&
                c.definition.compatible_body_families?.includes(bodyFamily),
            )
            .map((c) => c.definition.family),
        ),
      ].sort();
      const headStart = heads.length ? rng.integer(0, heads.length) : 0;
      for (let h = 0; h < heads.length; h++) {
        const headFamily = heads[(headStart + h) % heads.length]!;
        const prepared = preparedFamily(bodyFamily);
        const selected = {
          ...appearance,
          ...(prepared
            ? {
                material: coherentDefaults
                  ? generatedPreparedMaterial(prepared, appearance.seed)
                  : defaultPreparedMaterial(prepared),
              }
            : {}),
          selection: { bodyFamily, headFamily, hairFamily: null },
        };
        const initialFamilies: Partial<Record<OutfitKind, string>> = {};
        if (coherentDefaults)
          for (const kind of OUTFIT_KINDS) {
            const choices = [
              ...new Set(
                available
                  .filter(
                    (c) =>
                      c.definition.kind === kind &&
                      !c.definition.render_piece_of &&
                      c.definition.compatible_body_families?.includes(
                        bodyFamily,
                      ),
                  )
                  .map((c) => c.definition.family),
              ),
            ].sort();
            if (choices.length)
              initialFamilies[kind] = rng
                .fork(`wardrobe:${kind}`)
                .pick(choices);
          }
        const result = findCompleteOutfit({
          appearance: selected,
          library,
          poseFamily: "standing-neutral",
          ...(coherentDefaults ? { families: initialFamilies } : {}),
        });
        if (!result.ok) continue;
        const hairFamilies = [
          ...new Set(
            available
              .filter(
                (c) =>
                  c.definition.kind === "hair-front" &&
                  (!c.definition.compatible_head_families ||
                    c.definition.compatible_head_families.includes(
                      headFamily,
                    )) &&
                  (!c.definition.compatible_body_families ||
                    c.definition.compatible_body_families.includes(bodyFamily)),
              )
              .map((c) => c.definition.family),
          ),
        ].sort();
        const hairStart = hairFamilies.length
          ? rng.integer(0, hairFamilies.length)
          : 0;
        let chosen: PersonAppearance = selected;
        for (let j = 0; j < hairFamilies.length; j++) {
          const candidate = {
            ...selected,
            selection: {
              ...selected.selection,
              hairFamily: hairFamilies[(hairStart + j) % hairFamilies.length]!,
            },
          };
          if (
            resolveCompleteOutfit({
              appearance: candidate,
              library,
              poseFamily: "standing-neutral",
              families: result.families,
            }).ok
          ) {
            chosen = candidate;
            break;
          }
        }
        people[id] = {
          ...person,
          appearance: {
            ...chosen,
            outfit: {
              version: "complete-outfit-v1",
              families: result.families,
            },
          },
        };
        finished = true;
        break;
      }
    }
    if (!finished)
      throw new Error(
        "No complete standing outfit is prepared for a fresh candidate person.",
      );
  }
  return { ...world, people };
}
