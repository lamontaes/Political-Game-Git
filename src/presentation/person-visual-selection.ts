import type { Person, PersonAppearance, World } from "../simulation/types";
import {
  componentsAtGeneration,
  projectCharacterLayers,
  resolveCharacterRecipe,
  type CharacterComponentLibrary,
  type CharacterRecipe,
  type CharacterWardrobeContext,
} from "./character-components";

export type PersonVisualSelection = NonNullable<PersonAppearance["selection"]>;
export type PersonWardrobeKind = "top" | "bottom" | "footwear";

/** Saved beside the World by the existing per-save UI store, keyed by person ID. */
export interface PersonWardrobePreference {
  readonly personId: string;
  /** An omitted kind preserves its seeded wardrobe choice; each choice is singular. */
  readonly families: Partial<Readonly<Record<PersonWardrobeKind, string>>>;
}

export interface PersonVisualSelectionContext {
  readonly poseFamily: string;
  /** Caller supplies the appropriate catalog; this adapter imports no asset bank. */
  readonly library: CharacterComponentLibrary;
}

export interface PersonVisualSelectionOption {
  readonly selection: PersonVisualSelection;
  readonly bodyAssetId: string;
  readonly headAssetId: string;
  readonly hairAssetIds: readonly string[];
  /** Catalog eligibility only; never an art or exact-fit approval. */
  readonly released: boolean;
}

const WARDROBE_KINDS: readonly PersonWardrobeKind[] = [
  "top",
  "bottom",
  "footwear",
];
const sortedUnique = (values: readonly string[]): string[] =>
  [...new Set(values)].sort();

function generationFor(
  appearance: PersonAppearance,
  library: CharacterComponentLibrary,
): number {
  const generation = appearance.catalogGeneration ?? 1;
  if (
    !Number.isSafeInteger(generation) ||
    generation < 1 ||
    generation > library.catalogGeneration
  ) {
    throw new Error(
      `Person appearance catalog pin ${generation} is unavailable.`,
    );
  }
  return generation;
}

function recipeFor(
  appearance: PersonAppearance,
  context: PersonVisualSelectionContext,
  wardrobe?: CharacterWardrobeContext,
): CharacterRecipe {
  return resolveCharacterRecipe(
    {
      appearance,
      poseFamily: context.poseFamily,
      catalogGeneration: generationFor(appearance, context.library),
      // Identity authoring can expose a partial supplied library. Actual
      // body/head/hair and every requested wardrobe choice are checked below;
      // a missing unrelated garment must not erase a valid identity option.
      unresolvableRequiredSlots: "diagnose",
      ...(wardrobe ? { wardrobe } : {}),
    },
    context.library,
  );
}

function optionFor(
  selection: PersonVisualSelection,
  recipe: CharacterRecipe,
): PersonVisualSelectionOption | null {
  const body = recipe.context.components.find((part) => part.kind === "body");
  const head = recipe.context.components.find((part) => part.kind === "head");
  const hair = recipe.context.components.filter(
    (part) => part.kind === "hair-front" || part.kind === "hair-back",
  );
  if (
    !body ||
    !head ||
    body.family !== selection.bodyFamily ||
    head.family !== selection.headFamily
  )
    return null;
  if (
    selection.hairFamily === null
      ? hair.length !== 0
      : !hair.some(
          (part) =>
            part.kind === "hair-front" && part.family === selection.hairFamily,
        )
  )
    return null;
  return {
    selection: { ...selection },
    bodyAssetId: body.assetId,
    headAssetId: head.assetId,
    hairAssetIds: hair.map((part) => part.assetId),
    released: [body, head, ...hair].every((part) => part.released),
  };
}

/** Enumerates exact posed identity choices through the same resolver used to draw them. */
export function listPersonVisualSelections(
  request: PersonVisualSelectionContext & {
    readonly appearance: PersonAppearance;
    /** Narrow dependent controls without enumerating unrelated combinations. */
    readonly selectionFilter?: Partial<PersonVisualSelection>;
  },
): readonly PersonVisualSelectionOption[] {
  const { appearance, library } = request;
  const available = componentsAtGeneration(
    library,
    generationFor(appearance, library),
  );
  const bodies = sortedUnique(
    available
      .filter(
        (part) =>
          part.definition.kind === "body" &&
          part.definition.pose_family === request.poseFamily,
      )
      .map((part) => part.definition.family),
  );
  const options: PersonVisualSelectionOption[] = [];
  for (const bodyFamily of bodies) {
    if (
      request.selectionFilter?.bodyFamily !== undefined &&
      request.selectionFilter.bodyFamily !== bodyFamily
    )
      continue;
    const heads = sortedUnique(
      available
        .filter(
          (part) =>
            part.definition.kind === "head" &&
            part.definition.compatible_body_families?.includes(bodyFamily),
        )
        .map((part) => part.definition.family),
    );
    for (const headFamily of heads) {
      if (
        request.selectionFilter?.headFamily !== undefined &&
        request.selectionFilter.headFamily !== headFamily
      )
        continue;
      const hairFamilies: readonly (string | null)[] = [
        null,
        ...sortedUnique(
          available
            .filter(
              (part) =>
                part.definition.kind === "hair-front" &&
                (part.definition.compatible_head_families === undefined ||
                  part.definition.compatible_head_families.includes(
                    headFamily,
                  )) &&
                (part.definition.compatible_body_families === undefined ||
                  part.definition.compatible_body_families.includes(
                    bodyFamily,
                  )),
            )
            .map((part) => part.definition.family),
        ),
      ];
      for (const hairFamily of hairFamilies) {
        if (
          request.selectionFilter?.hairFamily !== undefined &&
          request.selectionFilter.hairFamily !== hairFamily
        )
          continue;
        const selection = { bodyFamily, headFamily, hairFamily };
        try {
          const option = optionFor(
            selection,
            recipeFor({ ...appearance, selection }, request),
          );
          if (option) options.push(option);
        } catch {
          // An incompatible explicit identity is not a selectable fallback.
        }
      }
    }
  }
  return options;
}

/** Only an explicit choice writes canonical appearance; seeds, pins and facts stay intact. */
export function setPersonVisualSelection(
  world: World,
  personId: string,
  selection: PersonVisualSelection,
  context: PersonVisualSelectionContext,
): World {
  const person = world.people[personId];
  if (!person || person.id !== personId)
    throw new Error(`Unknown canonical person '${personId}'.`);
  if (!person.appearance)
    throw new Error(
      `Person '${personId}' has no saved appearance to select within.`,
    );
  const appearance = { ...person.appearance, selection: { ...selection } };
  const recipe = recipeFor(appearance, context);
  if (!optionFor(selection, recipe))
    throw new Error(
      `Explicit appearance selection is unavailable in pose '${context.poseFamily}'.`,
    );
  return {
    ...world,
    people: { ...world.people, [personId]: { ...person, appearance } },
  };
}

/** Lists only families that resolve and project for this exact saved body and pose. */
export function listPersonWardrobeFamilies(
  person: Person,
  context: PersonVisualSelectionContext,
): Readonly<Record<PersonWardrobeKind, readonly string[]>> {
  if (!person.appearance)
    throw new Error(`Person '${person.id}' has no saved appearance.`);
  const appearance = person.appearance;
  const base = recipeFor(appearance, context);
  if (appearance.selection && !optionFor(appearance.selection, base)) {
    throw new Error(
      `Person '${person.id}' has no matching selected appearance for pose '${context.poseFamily}'.`,
    );
  }
  if (!base.context.components.some((part) => part.kind === "body"))
    throw new Error(
      `Person '${person.id}' has no body for pose '${context.poseFamily}'.`,
    );
  const available = componentsAtGeneration(
    context.library,
    generationFor(appearance, context.library),
  );
  const result: Record<PersonWardrobeKind, string[]> = {
    top: [],
    bottom: [],
    footwear: [],
  };
  for (const kind of WARDROBE_KINDS) {
    const families = sortedUnique(
      available
        .filter((part) => part.definition.kind === kind)
        .map((part) => part.definition.family),
    );
    for (const family of families) {
      const wardrobe: CharacterWardrobeContext = {
        id: `person-wardrobe:${person.id}`,
        families: { [kind]: [family] },
      };
      const recipe = recipeFor(appearance, context, wardrobe);
      const part = recipe.context.components.find(
        (candidate) => candidate.kind === kind && candidate.family === family,
      );
      if (!part) continue;
      const layer = projectCharacterLayers(
        recipe,
        context.library,
      )?.layers.find((candidate) => candidate.assetId === part.assetId);
      if (layer && !layer.fitRefusal) result[kind].push(family);
    }
  }
  return result;
}

/** Validates a saved preference and adapts singleton choices to the shared compositor. */
export function resolvePersonWardrobeContext(
  person: Person,
  preference: PersonWardrobePreference,
  context: PersonVisualSelectionContext,
): CharacterWardrobeContext {
  if (!preference || preference.personId !== person.id)
    throw new Error(
      "Wardrobe preference must belong to the canonical person being rendered.",
    );
  if (
    !preference.families ||
    typeof preference.families !== "object" ||
    Array.isArray(preference.families) ||
    Object.keys(preference).some(
      (key) => !["personId", "families"].includes(key),
    )
  )
    throw new Error("Wardrobe preference requires a per-person family map.");
  const entries = Object.entries(preference.families);
  for (const [kind, family] of entries) {
    if (
      !WARDROBE_KINDS.includes(kind as PersonWardrobeKind) ||
      typeof family !== "string" ||
      family.trim().length === 0
    )
      throw new Error(
        "Wardrobe preferences accept one top, bottom or footwear family per kind.",
      );
  }
  const available = listPersonWardrobeFamilies(person, context);
  const families: Partial<Record<PersonWardrobeKind, readonly string[]>> = {};
  for (const [kind, family] of entries) {
    const wardrobeKind = kind as PersonWardrobeKind;
    if (!available[wardrobeKind].includes(family))
      throw new Error(
        `Wardrobe family '${family}' is unavailable for this person's body, pose and catalog pin.`,
      );
    families[wardrobeKind] = [family];
  }
  const wardrobe = { id: `person-wardrobe:${person.id}`, families };
  const recipe = recipeFor(person.appearance!, context, wardrobe);
  for (const [kind, family] of entries) {
    if (
      !recipe.context.components.some(
        (part) => part.kind === kind && part.family === family,
      )
    )
      throw new Error(
        `Wardrobe family '${family}' is blocked in the selected combination.`,
      );
  }
  return wardrobe;
}
