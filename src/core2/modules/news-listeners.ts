/**
 * Engines that act the moment a person hears a story: the price engine ties
 * a price change the person's household already paid to the law the story
 * names. A listener returns at once for a story it does not concern. The
 * lists sit in their own file with no value imports so an engine can register
 * while it loads, whatever order the modules load in.
 */
import type { CoreAPI, CoreModule, PersonId } from "../types";
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

export type CountedNewsSource = (
  api: CoreAPI,
  storyId: string,
  namedReaders: number,
) => readonly CountedNewsAudience[];
/**
 * The press module carries the recorded audience mass of a story as a field
 * of its own; news reads it off the installed module when a story is heard,
 * and owns the delivery time. Press imports news, so news cannot import it.
 */
export interface CountedNewsModule extends CoreModule {
  countedNewsAudience?: CountedNewsSource;
}
