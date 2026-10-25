/**
 * Mined sentences by part key, as renderer variants (CTO, Oct 19: the
 * director names the parts a moment may use; the English engine holds the
 * banks and gives the words). Used by the office scene, which names its
 * parts by key in `src/director/data/office-scene.json`. A part that is not
 * shippable, or that the owner's grades hold back, is never given.
 */
import addressJson from "../../data/english/parts/address.json" with { type: "json" };
import choiceNamesJson from "../../data/english/parts/choice-names.json" with { type: "json" };
import sceneWordsJson from "../../data/english/parts/scene-words.json" with { type: "json" };
import { heldByGrades } from "./english-grades";
import type { EnglishSurface } from "./grounded-english";
import {
  renderLine,
  type Fact,
  type RenderedLine,
  type Variant,
} from "./bank-line";

export type { Fact, RenderedLine };

interface MinedPart {
  key: string;
  text: string;
  shippable: boolean;
}
function partsOf(bank: unknown): ReadonlyMap<string, MinedPart> {
  return new Map(
    (bank as { parts: MinedPart[] }).parts.map((part) => [part.key, part]),
  );
}
const BANKS: Readonly<Record<string, ReadonlyMap<string, MinedPart>>> = {
  address: partsOf(addressJson),
  "choice-names": partsOf(choiceNamesJson),
  "scene-words": partsOf(sceneWordsJson),
};

/** The named parts of one bank, as renderer variants (a slot `{a_b}` read as `{{a-b}}`). */
export function minedPartVariants(
  bank: string,
  keys: readonly string[],
): Variant[] {
  const parts = BANKS[bank];
  return keys.flatMap((key) => {
    const part = parts?.get(key);
    if (!part?.shippable || heldByGrades(key)) return [];
    return [
      {
        key,
        text: part.text.replace(
          /\{(\w+)\}/g,
          (_all, slot: string) => `{{${slot.replace(/_/g, "-")}}}`,
        ),
      },
    ];
  });
}

/**
 * Words a line from the parts a moment names, or null when none fits its
 * facts: the director names the bank and the part keys its rows give the
 * moment, and the English engine picks one and renders it.
 */
export function wordMinedParts(request: {
  seed: string;
  surface: EnglishSurface;
  holderId: string;
  bankKey: string;
  version: string;
  bank: string;
  keys: readonly string[] | undefined;
  facts: Record<string, Fact>;
  momentKey: string;
  fallbackSourceId: string;
  /** Said in the speaker's own voice: their traits pull the pick. */
  voiceTraits?: Readonly<Record<string, number>>;
}): RenderedLine | null {
  return renderLine({
    seed: request.seed,
    surface: request.surface,
    holderId: request.holderId,
    bankKey: request.bankKey,
    version: request.version,
    variants: request.keys ? minedPartVariants(request.bank, request.keys) : [],
    facts: request.facts,
    momentKey: request.momentKey,
    fallbackSourceId: request.fallbackSourceId,
    ...(request.voiceTraits
      ? { voice: { traits: request.voiceTraits, register: "conversation" } }
      : {}),
  });
}
