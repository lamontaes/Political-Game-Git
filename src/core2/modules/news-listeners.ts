/**
 * What the press hands the news engine as a field of its module: the audience
 * mass of a story the desk has counted. Press imports news, so news reads it
 * off the installed press module. The people who act the moment a story is
 * heard are a field of their own modules (`CoreModule.onStoryHeard`).
 */
import type { CoreAPI, CoreModule } from "../types";
import type { CountedNewsAudience } from "./views";

export type CountedNewsSource = (
  api: CoreAPI,
  storyId: string,
  namedReaders: number,
) => readonly CountedNewsAudience[];
/**
 * The press module carries the recorded audience mass of a story as a field
 * of its own; news reads it off the installed module when a story is heard,
 * and owns the delivery time.
 */
export interface CountedNewsModule extends CoreModule {
  countedNewsAudience?: CountedNewsSource;
}
