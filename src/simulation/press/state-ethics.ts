import { stateJurisdictionForKey } from "../life-places";
import type { EntityId, World } from "../types";
import type { ProcedureKey } from "./records";

/**
 * Which state's legislative ethics procedure applies, by state rather than by
 * a name written into the selector.
 *
 * `procedureForSubject` used to find the subject's state by scanning the
 * World for a jurisdiction literally named "Kentucky", and recognised a
 * legislative candidacy by a candidacy-pack prefix spelled out beside it. That
 * made the one researched state ethics commission the only one the selector
 * could ever reach: a second commission would have meant a second name
 * comparison in the middle of the routing.
 *
 * A state belongs here only once its procedure has been researched and written
 * as a `ProcedureDefinition`. A state with no entry is not a gap to be filled
 * with another state's commission — its subjects route to the simulated
 * inquiry, which says on its face that it is simulated.
 */
export interface StateLegislativeEthicsProcedure {
  /** The state key the places corpus uses, e.g. `US-KY`. */
  readonly stateJurisdictionKey: string;
  readonly procedureKey: ProcedureKey;
  /** Candidacy packs whose contests this commission has authority over. */
  readonly candidacyPackPrefixes: readonly string[];
}

export const STATE_LEGISLATIVE_ETHICS_PROCEDURES: readonly StateLegislativeEthicsProcedure[] =
  [
    {
      stateJurisdictionKey: "US-KY",
      procedureKey: "ky-legislative-ethics",
      candidacyPackPrefixes: ["us-ky-general-assembly"],
    },
  ];

/**
 * The World's own jurisdiction record for a state key, when it holds one.
 *
 * Worlds do not all build their state jurisdictions the same way — a scenario
 * placeholder and a corpus place produce different stable ids for the same
 * state — so this accepts either the canonical id or the state's canonical
 * name, and takes the name from the places corpus rather than from a literal.
 */
export function stateJurisdictionIdForKey(
  world: World,
  stateJurisdictionKey: string,
): EntityId | null {
  const canonical = stateJurisdictionForKey(stateJurisdictionKey);
  if (!canonical) return null;
  return (
    world.jurisdictionOrder.find((id) => {
      const candidate = world.jurisdictions[id]!;
      return (
        candidate.kind.startsWith("state") &&
        (candidate.id === canonical.id || candidate.name === canonical.name)
      );
    }) ?? null
  );
}
