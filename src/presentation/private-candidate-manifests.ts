import type {
  PreparedProfileRecord,
  ProfileLayerChange,
  CharacterCatalogGeneration,
  CharacterComponentManifestRecord,
} from "./character-components";
import { optionalGlob } from "./optional-glob";

/**
 * The owner-private candidate people manifests (engine-people29 through 41 and
 * KIT41). Their artwork is unreleased, unapproved and not published with the
 * public repository, so a public checkout carries none of these files.
 *
 * Resolution is by optional glob rather than static import. A public checkout
 * resolves every registry to an empty registration and every generation to
 * absent, and the gated candidate provider then composes only the published
 * libraries. A private checkout resolves exactly its committed manifests, so
 * the private build composes the same records it did through static imports.
 * Nothing here fetches, copies, caches or serves artwork.
 */
export type CandidateEngine =
  "engine29" | "engine34" | "engine35" | "engine36" | "engine40" | "engine41";

export interface CandidateTemplate {
  readonly familyId: string;
  readonly partIds: readonly string[];
  readonly sourceSha256: string;
}

export interface CandidateRegistryManifest {
  readonly assets: readonly CharacterComponentManifestRecord[];
  readonly garments: readonly unknown[];
  readonly families: readonly unknown[];
  readonly templates: Readonly<Record<string, CandidateTemplate>>;
}

export interface Kit41RegistryManifest extends CandidateRegistryManifest {
  readonly labels: Readonly<
    Record<string, { readonly name: string; readonly colour: string }>
  >;
  readonly familyAdditions: Readonly<Record<string, readonly unknown[]>>;
  readonly generations: readonly CharacterCatalogGeneration[];
}

const manifests = optionalGlob(() =>
  import.meta.glob<object>(
    [
      "../../art/manifest/character_candidate_{engine29,engine34,engine35,engine36,engine40,engine41,kit41}_{registry,generation}.json",
      "../../art/manifest/character_candidate_modular41_heads.json",
      "../../art/manifest/character_candidate_modular45_registry.json",
    ],
    { eager: true, import: "default" },
  ),
);

function manifest(name: string): object | undefined {
  return manifests[`../../art/manifest/character_candidate_${name}.json`];
}

/** True only in a checkout that carries the private candidate manifests. */
export const PRIVATE_CANDIDATE_ART_AVAILABLE =
  Object.keys(manifests).length > 0;

export function candidateRegistry(
  engine: CandidateEngine,
): CandidateRegistryManifest {
  return {
    assets: [],
    garments: [],
    families: [],
    templates: {},
    ...manifest(`${engine}_registry`),
  };
}

/** Published generations for the named engines, in order; absent ones omitted. */
export function candidateGenerations(
  ...engines: readonly CandidateEngine[]
): readonly CharacterCatalogGeneration[] {
  return engines.flatMap((engine) => {
    const generation = manifest(`${engine}_generation`);
    return generation ? [generation as CharacterCatalogGeneration] : [];
  });
}

export const KIT41_REGISTRY: Kit41RegistryManifest = {
  assets: [],
  garments: [],
  families: [],
  templates: {},
  labels: {},
  familyAdditions: {},
  generations: [],
  ...manifest("kit41_registry"),
};

/** MODULAR41 additive corrected heads (generation 12); old generations stay. */
export const MODULAR41_HEADS_REGISTRY: Kit41RegistryManifest = {
  assets: [],
  garments: [],
  families: [],
  templates: {},
  labels: {},
  familyAdditions: {},
  generations: [],
  ...manifest("modular41_heads"),
};

/**
 * MODULAR45 corrected standing generation (13): fitted head/hair derivatives,
 * cleaned garment edges and prepared skin maps. Older generations stay exact.
 */
export interface Modular45RegistryManifest extends Kit41RegistryManifest {
  readonly preparedProfiles?: readonly PreparedProfileRecord[];
  readonly profileLayerChanges?: readonly ProfileLayerChange[];
  /** Authored light-to-dark skin ramp ids, in display order. */
  readonly skinRamps: readonly string[];
}

export const MODULAR45_REGISTRY: Modular45RegistryManifest = {
  assets: [],
  garments: [],
  families: [],
  templates: {},
  labels: {},
  familyAdditions: {},
  generations: [],
  skinRamps: [],
  ...manifest("modular45_registry"),
};
