/**
 * Engines that act the moment a person hears a story: the price engine ties
 * a price change the person's household already paid to the law the story
 * names. A listener returns at once for a story it does not concern. The
 * lists sit in their own file with no value imports so an engine can register
 * while it loads, whatever order the modules load in.
 */
import type { CoreAPI, PersonId } from "../types";
import type { Story } from "./news";
import type { CountedNewsAudience } from "./views";

export type HeardListener = (
  api: CoreAPI,
  personId: PersonId,
  story: Story,
) => void;
export const heardListeners: HeardListener[] = [];
export function onStoryHeard(listener: HeardListener): void {
  if (!heardListeners.includes(listener)) heardListeners.push(listener);
}

type CountedNewsSource = (
  api: CoreAPI,
  storyId: string,
  namedReaders: number,
) => readonly CountedNewsAudience[];
let countedNewsSource: CountedNewsSource | undefined;
/** The press supplies recorded audience mass; news owns delivery time. */
export function registerCountedNewsSource(source: CountedNewsSource): void {
  if (countedNewsSource && countedNewsSource !== source)
    throw new Error("Counted news already has an audience source");
  countedNewsSource = source;
}
/** The audience source the press registered, if any. */
export function countedNewsSourceOf(): CountedNewsSource | undefined {
  return countedNewsSource;
}
