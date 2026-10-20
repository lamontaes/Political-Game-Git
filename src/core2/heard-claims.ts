/**
 * Whether a hearer takes in a claim they cannot check: the usual benefit of
 * the doubt (truth-default, `truthDefaultPull`) against every trait's lean
 * toward doubting, through the shared two-way formula. One rule wherever a
 * claim reaches someone: the player's line in a conversation, a story a
 * neighbor passes on, a speech a listener retells at home.
 */
import { parameter } from "./parameters";
import { leanedYes } from "./trait-decisions";
import type { CoreState, PersonState } from "./types";

export function believesClaim(
  core: Pick<CoreState, "data">,
  hearer: Pick<PersonState, "traits"> & { id?: string },
): boolean {
  return leanedYes(
    core,
    hearer,
    "conversation.believe-claim",
    "believe",
    "doubt",
    parameter("truthDefaultPull", core.data.parameters),
  );
}
