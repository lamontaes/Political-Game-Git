/**
 * The English engine's half of the speech the player builds (owner, Oct 15:
 * the Suzerain example): the authored pieces of
 * `data/english/parts/speech-stages.json`, by stage role, that a speech may
 * be worded from. The director's speech builder says which stage and subject
 * comes next and fills the facts; it never reads the bank (CTO, Oct 19: two
 * layers under one contract). Pieces the owner's grades hold back are left
 * out.
 */
import stagesJson from "../../data/english/parts/speech-stages.json" with { type: "json" };
import { heldByGrades } from "./english-grades";
import type { Variant } from "./bank-line";

interface BankPart {
  key: string;
  text: string;
  uses: { subject: string; role: string }[];
  shippable: boolean;
}
const BANK = stagesJson as unknown as { parts: BankPart[] };

/** The bank's version, for the renderer's stable pick. */
export const SPEECH_STAGES_VERSION = "words-speech-stages-v1";

/** The pieces that may word one stage role ("opener", "core:work", ...), as renderer variants. */
export function speechStageVariants(role: string): Variant[] {
  return BANK.parts
    .filter(
      (part) =>
        part.shippable &&
        !heldByGrades(part.key) &&
        part.uses.some((use) => use.subject === "stage" && use.role === role),
    )
    .map((part) => ({
      key: part.key,
      // The bank writes a slot as {name}; the renderer reads {{name}}.
      text: part.text.replace(/\{(\w+)\}/g, "{{$1}}"),
    }));
}
