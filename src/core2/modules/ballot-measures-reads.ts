/**
 * The ballot measures' id and the vote a measure received: what a reader outside the engine asks of a measure. src/core2/modules/ballot-measures.ts re-exports them.
 */
import type { CoreAPI } from "../types";

export const BALLOT_MEASURES_MODULE_ID = "core2-ballot-measures-v1";

export const table = (api: CoreAPI, name: string) =>
  api.moduleState(BALLOT_MEASURES_MODULE_ID).table(name);

/** One voter's measure vote and its reasons. */
export function measureVoteOf(
  api: CoreAPI,
  measureId: string,
  personId: string,
) {
  return (
    table(api, "votes").get(`measure-vote:${measureId}:${personId}`) ?? null
  );
}
