/**
 * The dry line under the lit step on the loading card (owner, Nov 24, via the
 * CTO, 7140490160: the sarcasm belongs in the progress messages). The words
 * are the loading-steps bank (`data/english/parts/loading-steps.json`), one
 * move per build step (BuildStage in src/bench/world.ts); the bench serves
 * them to the card as `loadingLines`, and the card shows one at a time, never
 * the same line twice in a load, starting at a different place each load
 * (followBuild in src/bench/play.mjs).
 */
import loadingStepsBank from "../../data/english/parts/loading-steps.json" with { type: "json" };
import { admittedParts } from "./bank-parts";

interface StepPart {
  readonly key: string;
  readonly move: string;
  readonly text: string;
  readonly uses: readonly never[];
}

/** What the build knows about where it is, said as a sentence says it (spoken, stateInSentence). */
export interface LoadingSlots {
  readonly place: string;
  readonly state?: string;
}

/**
 * The lines a load may show, by build step, with the slots filled: the parts
 * play may say (the owner's grades and the rules hold the rest back). A line
 * whose slot the build cannot fill is left out, never filled with a stand-in.
 */
export function loadingStepLines(
  slots: LoadingSlots,
): Record<string, string[]> {
  const lines: Record<string, string[]> = {};
  for (const part of admittedParts(
    loadingStepsBank.parts as unknown as StepPart[],
  )) {
    let missing = false;
    const text = part.text.replace(/\{([a-z-]+)\}/g, (_, name: string) => {
      const said = (slots as unknown as Record<string, string | undefined>)[
        name
      ];
      if (!said) missing = true;
      return said ?? "";
    });
    if (!missing) (lines[part.move] ??= []).push(text);
  }
  return lines;
}
