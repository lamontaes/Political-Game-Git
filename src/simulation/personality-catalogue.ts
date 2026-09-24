import { CATALOGUE_SCALES } from "./personality-catalogue.generated";
import type {
  TraitDeclaration,
  TraitMovability,
  TraitPack,
  TraitScale,
} from "./trait-packs";

/**
 * The personality catalog: the named qualities a person can be known for,
 * beyond the five ordinary-life traits. Somebody can be industrious and
 * lustful and bad at keeping secrets at once, because each of these is its
 * own scale rather than one end of a shared one.
 *
 * The scales come from `docs/research/chatgpt-answers/2026-09-22-depth2/personality-scale-dispositions.json`,
 * received whole and generated into `personality-catalogue.generated.ts` by
 * `scripts/traits/personality-catalogue.ts`. That file maps every catalog
 * word to exactly one scale. Four scales mean what the five already mean
 * (deliberation, reliability, conflict and risk) and are left out here, so
 * one meaning never argues twice.
 *
 * **Two kinds of scale.** Eighteen are two-ended: insecure against
 * self-assured. The rest are one-sided: somebody is cocky, or shows no marked
 * cockiness, and that absence is not humility. A one-sided scale is declared
 * `sides: "one"`, so its opposite is never drawn, written or read.
 *
 * **Sparse, on purpose.** Nobody is given ninety-eight readings. A person is
 * seeded with one or two salient qualities, and every other scale stays
 * unrecorded, which is unknown rather than "not like that". The catalog is
 * what a person may be; the record is what they are known to be.
 *
 * **Nothing argues yet.** The pack declares no effects. Each profile names the
 * kinds of decision its scales are meant for, but those are intended readers,
 * not decisions that exist, and a lean is admitted only against a decision
 * that publishes itself. So today these qualities are recorded, shown and
 * moved by what happens to people, and change no outcome.
 */

export const PERSONALITY_PACK = "personality-v1";

/** One scale as the generator writes it. */
export interface CatalogueScale {
  readonly key: string;
  readonly sides: "one" | "two";
  readonly family: string;
  readonly profile: CatalogueProfile;
  readonly meaning: string;
  readonly low: { readonly label: string; readonly meaning: string };
  readonly high: { readonly label: string; readonly meaning: string };
}

export type CatalogueProfile =
  | "appraisal"
  | "manner"
  | "cognition"
  | "follow-through"
  | "motivation"
  | "relational"
  | "pressure";

/**
 * The scopes each profile's scales are meant to be read in, as the research
 * gave them. These are receiving meanings: no decision reads them today.
 */
const PROFILE_SCOPES: Readonly<Record<CatalogueProfile, readonly string[]>> = {
  appraisal: [
    "life:ordinary",
    "career:choice",
    "conversation:interpretation",
    "governing:deliberation",
  ],
  manner: [
    "life:ordinary",
    "career:conversation",
    "governing:conversation",
    "relationship:conversation",
  ],
  cognition: [
    "learning:choice",
    "career:choice",
    "life:ordinary",
    "governing:deliberation",
  ],
  "follow-through": [
    "work:follow-through",
    "life:commitment",
    "governing:commitment",
    "career:choice",
  ],
  motivation: [
    "goal:selection",
    "career:choice",
    "life:ordinary",
    "governing:deliberation",
  ],
  relational: [
    "relationship:choice",
    "life:ordinary",
    "career:cooperation",
    "governing:negotiation",
  ],
  pressure: [
    "life:ordinary",
    "career:choice",
    "governing:deliberation",
    "crisis:response",
  ],
};

/**
 * How movable each profile is.
 *
 * PRIVATE CALIBRATION, NOT RESEARCHED. The research gave relative rules only:
 * manner adapts most readily, follow-through moves with sustained practice,
 * self-image and broad cognition need broader evidence. These numbers put
 * those rules in order around the five's own values (sociability settles over
 * ten years on a ninety-day spacing; deliberation over fifteen on a hundred and
 * eighty) and nothing more. Every profile keeps the five's pressure cap, so no
 * quality can be ground down by repetition alone.
 */
const PROFILE_MOVABILITY: Readonly<Record<CatalogueProfile, TraitMovability>> =
  {
    manner: movability(6, 60, 0.5),
    "follow-through": movability(8, 60, 0.5),
    relational: movability(8, 90, 0.5),
    motivation: movability(10, 90, 0.5),
    pressure: movability(10, 90, 0.5),
    cognition: movability(12, 120, 0.6),
    appraisal: movability(12, 120, 0.6),
  };

function movability(
  settlesOver: number,
  experienceSpacingDays: number,
  unsettledFloor: number,
): TraitMovability {
  return {
    settledByStrength: { subtle: 1.5, moderate: 2.5, strong: 4, defining: 5 },
    settlesOver,
    unsettledFloor,
    experienceSpacingDays,
    pressureCap: 3,
  };
}

function scaleFor(row: CatalogueScale): TraitScale {
  return {
    // A one-sided scale's middle is its known absence; a two-ended scale's
    // middle is no lean either way.
    balancedKey: `${row.key}:unmarked`,
    balancedLabel: row.sides === "one" ? row.low.label : "No settled lean",
    balancedDescription:
      row.sides === "one"
        ? row.low.meaning
        : `Neither ${row.low.label.toLowerCase()} nor ${row.high.label.toLowerCase()}.`,
    steps: [
      { magnitude: 1, strength: "moderate" },
      { magnitude: 2, strength: "strong" },
    ],
  };
}

function declarationFor(row: CatalogueScale): TraitDeclaration {
  const oneSided = row.sides === "one";
  return {
    key: row.key,
    label: oneSided ? row.high.label : `${row.low.label} or ${row.high.label}`,
    description: row.meaning,
    poles: {
      // Declared only because the store needs an expression for it; the
      // one-sided policy means it is never drawn, written or read.
      low: {
        key: `${row.key}:low`,
        label: row.low.label,
        description: row.low.meaning,
      },
      high: {
        key: `${row.key}:high`,
        label: row.high.label,
        description: row.high.meaning,
      },
    },
    scopes: PROFILE_SCOPES[row.profile],
    // Conferred rather than seeded: a seeded trait is drawn for everybody on
    // every scale, and this catalog is sparse. `seedSalientQualities` in
    // `people-traits.ts` writes the one or two a person is known for.
    conferredBy: "conferred-only",
    scale: scaleFor(row),
    seed: null,
    movability: PROFILE_MOVABILITY[row.profile],
    sides: row.sides,
  };
}

export function personalityCataloguePack(): TraitPack {
  return {
    pack: PERSONALITY_PACK,
    traits: CATALOGUE_SCALES.map(declarationFor),
    effects: [],
  };
}

/**
 * The families, in catalog order, each with its scales.
 *
 * Seeding picks a family before a scale inside it, as the research asks, so a
 * family the catalog happens to hold many synonyms for is no more common
 * for that.
 */
export function catalogueFamilies(): readonly {
  readonly family: string;
  readonly scales: readonly CatalogueScale[];
}[] {
  const families = new Map<string, CatalogueScale[]>();
  for (const row of CATALOGUE_SCALES) {
    const list = families.get(row.family) ?? [];
    list.push(row);
    families.set(row.family, list);
  }
  return [...families].map(([family, scales]) => ({ family, scales }));
}

/** The qualified keys of this pack's traits, for a caller that needs them. */
export function personalityCatalogueKeys(): readonly string[] {
  return CATALOGUE_SCALES.map((row) => `${PERSONALITY_PACK}:${row.key}`);
}
