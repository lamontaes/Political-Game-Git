/**
 * One call into the English engine's grounded renderer for the new core:
 * a bank of reviewed variants, the recorded facts a line may copy, and the
 * person who holds them. Returns null when a fact is missing, never text.
 * The director calls it with the variants its banks give it; the scene-talk
 * words (`scene-talk-words.ts`) call it with the pieces they pick.
 */
import { P } from "../core2/parameters";
import {
  renderGroundedEnglish,
  type EnglishSurface,
  type GroundedEnglishPacket,
} from "./grounded-english";

export interface Fact {
  text: string;
  sourceRecordIds: readonly string[];
}
export interface Variant {
  key: string;
  text: string;
  stages?: readonly string[];
  /** The manner the wording carries, for the speaker's trait pulls. */
  bearing?: string;
  /** The bank part it comes from, for its running grade. */
  pieceKey?: string;
}
export interface RenderedLine {
  text: string;
  sourceRecordIds: readonly string[];
  /** The bank variant the stable pick chose, and the facts it copied. */
  variantKey?: string;
  factKeys?: readonly string[];
}

export function renderLine(input: {
  seed: string;
  surface: EnglishSurface;
  holderId: string;
  bankKey: string;
  version: string;
  variants: readonly Variant[] | undefined;
  facts: Readonly<Record<string, Fact>>;
  momentKey: string;
  stage?: string;
  fallbackSourceId: string;
  /** The speaker's trait levels and the register, so the line is in their voice. */
  voice?: { traits: Readonly<Record<string, number>>; register?: string };
}): RenderedLine | null {
  if (!input.variants?.length) return null;
  const ids = [
    ...new Set(
      Object.values(input.facts).flatMap((fact) => fact.sourceRecordIds),
    ),
  ];
  const holder = { personId: input.holderId, traits: {} };
  const result = renderGroundedEnglish(
    {
      surface: input.surface,
      momentKey: input.momentKey,
      worldSeed: input.seed,
      bankVersion: input.version,
      stage: input.stage ?? "default",
      sourceRecordIds: ids.length ? ids : [input.fallbackSourceId],
      facts: input.facts,
      ...(input.surface === "dialogue"
        ? { speaker: holder }
        : { viewer: holder }),
      ...(input.voice ? { voice: input.voice } : {}),
      // The holder's own records establish every fact the line copies.
      knowledge: Object.entries(input.facts).map(([factKey, fact]) => ({
        personId: input.holderId,
        factKey,
        sourceRecordIds: fact.sourceRecordIds,
      })),
    } as unknown as GroundedEnglishPacket,
    {
      key: input.bankKey,
      version: input.version,
      surface: input.surface,
      variants: input.variants.map((row) => ({
        key: row.key,
        kind: "template" as const,
        text: row.text,
        ...(row.stages ? { stages: row.stages } : {}),
        ...(row.bearing ? { bearing: row.bearing } : {}),
        ...(row.pieceKey ? { pieceKey: row.pieceKey } : {}),
      })),
    },
  );
  if (result.kind !== "rendered") return null;
  return {
    text: result.text.charAt(P.zero).toUpperCase() + result.text.slice(P.one),
    sourceRecordIds: result.sourceRecordIds as unknown as string[],
    variantKey: result.variantKey,
    factKeys: result.usedFactKeys,
  };
}
