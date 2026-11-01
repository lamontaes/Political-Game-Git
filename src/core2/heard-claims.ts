/**
 * Whether a hearer takes in a claim they cannot check: the usual benefit of
 * the doubt (truth-default, `believeStrangerPull`), more for a teller they are
 * close to and for a claim that fits where they already stand, against every
 * trait's lean toward doubting, through the shared two-way formula. One rule
 * wherever one resident's claim reaches another: a story a neighbor passes
 * on, a speech a listener retells at home. The player's own line in a
 * conversation is still read by the director's `doubtsClaim` until the Words
 * line routes it here.
 *
 * The case differs from one hearing to the next (who told it, how close the
 * two are today, whether it argues the way the hearer already leans), so a
 * doubter still believes a trusted friend and a trusting person can doubt a
 * stranger who argues against them: the case slides, no trait decides alone.
 */
import { personLean } from "./campaign-views";
import { closenessBetween } from "./closeness";
import { viewOn } from "./modules/views";
import { parameter } from "./parameters";
import { leanedYes } from "./trait-decisions";
import type { CoreAPI, CoreState, PersonState } from "./types";

const CAMPAIGNS_MODULE_ID = "core2-campaigns-v1";

/** What a hearer knows about one hearing of a claim. */
export interface HeardClaim {
  /** Who told it, when the hearer has a tie to the teller (none: a stranger's word). */
  readonly tellerId?: string;
  /** How well the claim fits the hearer's own view, -1 (argues against it) to 1 (argues for it); 0 for a claim that argues no side. */
  readonly fit?: number;
}

// stopgapId: SG-TRAITS-director-claims-reader
export function believesClaim(
  core: Pick<CoreState, "data" | "date" | "relationships">,
  hearer: Pick<PersonState, "traits"> & { id?: string },
  claim: HeardClaim = {},
): boolean {
  const params = core.data.parameters;
  const closeness =
    claim.tellerId && hearer.id
      ? closenessBetween(core, hearer.id, claim.tellerId)
      : parameter("zero", params);
  return leanedYes(
    core,
    hearer,
    "conversation.believe-claim",
    "believe",
    "doubt",
    parameter("believeStrangerPull", params) +
      parameter("believeClosenessWeight", params) * closeness +
      parameter("believeFitWeight", params) *
        (claim.fit ?? parameter("zero", params)),
  );
}

/**
 * How well a claim that argues a change on a policy question fits where the
 * hearer already stands (their current view, -1 to 1, times the way the claim
 * argues: +1 for enacting, -1 for repealing). Zero for a claim that argues no
 * question or no side.
 */
export function claimFit(
  api: CoreAPI,
  hearer: Readonly<PersonState>,
  topic: string | undefined,
  desiredChange: string | undefined,
): number {
  const side =
    desiredChange === "enact" ? 1 : desiredChange === "repeal" ? -1 : 0;
  if (!topic || side === 0) return 0;
  const town = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? (
        api.moduleState(CAMPAIGNS_MODULE_ID).table("town").get("town") as
          { lean?: number } | undefined
      )?.lean
    : undefined;
  return (
    side *
    viewOn(
      api,
      hearer.id,
      topic,
      personLean(api.state.people, hearer, town ?? 0),
    )
  );
}
