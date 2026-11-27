/**
 * The press (BOARD "next" item 1, campaign interviews). The town's local
 * outlets (newspapers, television stations and news radio) are records sized
 * from its state's real counts, and each adult follows the kinds of outlet
 * people their age follow, the most dutiful and deliberate first.
 *
 * A candidate asks an outlet for an interview, or in the weeks before a
 * general election an outlet asks the candidates on the ballot, the most
 * newsworthy first, as far as its reporter has room. The questions come from
 * the race: a promise the candidate broke, where they differ most from a
 * rival, and the most divisive question in play. Each answer is a statement on
 * the record (a promise); declining a question is recorded too. When the
 * interview runs, its readers or viewers hear the candidate's positions and
 * decide for themselves, with a recorded cause, and the story is a public
 * record the news carries.
 */
import type { CoreAPI, InterviewRow, PrintedStory } from "./press-base";
import { ACCEPTING_MOVES, REFUSING_MOVES, table } from "./press-base";
import { PRESS_MODULE_ID } from "./press-ids";

export * from "./press-base";
export * from "./press-briefs";
export * from "./press-desk-reads";
export * from "./press-exposure";
export * from "./press-ids";
export * from "./press-interviews";
export * from "./press-open";
export * from "./press-outlets";
export * from "./press-staffing";
export * from "./press-stories";
export * from "./press-week";

// The press desk's own story record, read by the director through this entry.
export { PRESS_STORY_EVENT } from "../press-desk";

/** One interview row by its id, or undefined (the door the screens read an interview's questions through). */
export function interviewOf(
  api: CoreAPI,
  interviewId: string,
): InterviewRow | undefined {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return undefined;
  return table(api, "interviews").get(interviewId) as unknown as
    InterviewRow | undefined;
}

/** The stories the desk printed from one wire item, by the wire item's id. */
export function storiesOfWire(
  api: CoreAPI,
  wireId: string,
): readonly PrintedStory[] {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return [];
  return table(api, "stories").query("byWire", [
    wireId,
  ]) as unknown as PrintedStory[];
}

export { livedQuestion } from "../outcome-news";

export { monthEvent } from "../outcome-news";

export { ACCEPTING_MOVES, REFUSING_MOVES };
