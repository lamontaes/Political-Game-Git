import {
  createMindCatalog,
  createPersonalValueDefinition,
  createPersonalityTendencyDefinition,
} from "./mind-catalog";
import type { MindCatalog } from "./types";
import { canonicalJson } from "./canonical-json";
import { legislatureTraitPack } from "./legislature-trait-pack";
import { peopleTraitPack } from "./people-trait-pack";
import {
  loadTraitPacks,
  packOfQualifiedKey,
  traitDefinitionFromPack,
  type TraitPack,
} from "./trait-packs";

/** Authored fictional-life content, not a psychometric or empirical model. */
export const LIFE_MIND_CONTENT_VERSION = "opening-life-mind-v1";

const tendencies = [
  createPersonalityTendencyDefinition(
    `${LIFE_MIND_CONTENT_VERSION}:conversation`,
    "Conversation approach",
    "An ordinary conversational preference that context and later experience can change.",
    [
      {
        key: "ask",
        label: "Ask first",
        description: "Prefers asking a question before offering advice.",
      },
      {
        key: "listen",
        label: "Listen first",
        description: "Prefers hearing the other person out.",
      },
      {
        key: "direct",
        label: "Speak directly",
        description: "Prefers stating a concern plainly.",
      },
    ],
  ),
  createPersonalityTendencyDefinition(
    `${LIFE_MIND_CONTENT_VERSION}:leisure`,
    "Leisure preference",
    "A preference for how to spend an available ordinary moment; never an obligation.",
    [
      {
        key: "familiar",
        label: "Something familiar",
        description: "Often chooses a familiar activity.",
      },
      {
        key: "explore",
        label: "Try something",
        description: "Often wants to try an unfamiliar activity.",
      },
      {
        key: "company",
        label: "Spend time together",
        description: "Often seeks company during free time.",
      },
    ],
  ),
];
const values = [
  createPersonalValueDefinition(
    `${LIFE_MIND_CONTENT_VERSION}:privacy`,
    "Privacy",
    "Having a say in what to share about one's own life.",
  ),
  createPersonalValueDefinition(
    `${LIFE_MIND_CONTENT_VERSION}:connection`,
    "Connection",
    "Making time for people one knows.",
  ),
  createPersonalValueDefinition(
    `${LIFE_MIND_CONTENT_VERSION}:learning`,
    "Learning",
    "Taking time to understand something unfamiliar.",
  ),
];

export const LIFE_MIND_IDS = {
  conversation: tendencies[0]!.id,
  leisure: tendencies[1]!.id,
  privacy: values[0]!.id,
  connection: values[1]!.id,
  learning: values[2]!.id,
} as const;

export function createLifeMindCatalog(): MindCatalog {
  return createMindCatalog({
    catalogVersion: "mind-catalog-v1",
    tendencies,
    values,
  });
}

/**
 * The packs this build compiles in, in load order. One list: the trait
 * registry and the save check below both read it, because when they read two
 * lists that disagreed — this one once named the people pack alone — a
 * legislator's recorded manner was a trait the game wrote and the save check
 * then refused, so the life could not be saved again.
 */
export function compiledTraitPacks(): readonly TraitPack[] {
  return [peopleTraitPack(), legislatureTraitPack()];
}

/**
 * The packs this life loads: the build's own and whatever its content packs
 * install. A trait reaches a world only through one of these, and
 * `assertLifeMindContent` below will not admit a definition no pack declares.
 * See `docs/systems/traits.md`.
 */
export function loadedTraitPacks(installed: readonly TraitPack[] = []) {
  return loadTraitPacks([...compiledTraitPacks(), ...installed], []);
}

/**
 * Every definition a world carries must be one its owner still declares.
 *
 * This used to be an exact allow-list: a definition had to be one of the
 * built-ins, so any newly registered trait threw `Unsupported production
 * personality definition` the moment a world recorded it. That made
 * "register a trait rather than enumerate one" true only until the first save.
 *
 * It keeps the guarantee that list existed for — a tampered save cannot
 * redefine what a stored expression key means, so an old record can never
 * decode to something it never said — by asking a different question. The
 * namespace before the first colon of a stable key names the pack that owns
 * it, and the definition must match what that pack declares, field for field.
 * Anything any loaded pack declares is admitted; nothing else is.
 *
 * A definition whose pack is not loaded is reported as exactly that. Its
 * records are preserved and simply not consulted, because removing a pack must
 * not destroy a save's history. Older empty saves remain valid.
 *
 * `installed` is the trait packs the life's own content packs carry, read by
 * `installedTraitPacks`. A trait a mod declares is admitted on exactly the
 * terms a built-in one is: its definition must be the one its pack declares.
 */
export function assertLifeMindContent(
  catalog: MindCatalog,
  installed: readonly TraitPack[] = [],
): void {
  const allowed = createLifeMindCatalog();
  const registry = loadedTraitPacks(installed);
  const packed = new Map(
    [...registry.traits.values()].map((trait) => {
      const definition = traitDefinitionFromPack(trait);
      return [definition.id, { definition, pack: trait.pack }] as const;
    }),
  );
  for (const id of catalog.tendencyOrder) {
    const carried = catalog.tendencies[id];
    const builtIn = allowed.tendencies[id];
    if (builtIn) {
      if (canonicalJson(carried) !== canonicalJson(builtIn)) {
        throw new Error(
          `Personality definition ${id} does not match the ${LIFE_MIND_CONTENT_VERSION} content that declares it.`,
        );
      }
      continue;
    }
    const owner = packed.get(id);
    if (!owner) {
      const pack = carried ? packOfQualifiedKey(carried.stableKey) : null;
      throw new Error(
        pack === null
          ? `Unsupported production personality definition: ${id}`
          : `Personality definition ${id} belongs to the pack "${pack}", which this build does not load. Its records are kept and not consulted; load that pack to read them.`,
      );
    }
    if (canonicalJson(carried) !== canonicalJson(owner.definition)) {
      throw new Error(
        `Personality definition ${id} does not match what its pack "${owner.pack}" declares.`,
      );
    }
  }
  for (const id of catalog.valueOrder) {
    if (
      canonicalJson(catalog.values[id]) !== canonicalJson(allowed.values[id])
    ) {
      throw new Error(`Unsupported production value definition: ${id}`);
    }
  }
}
