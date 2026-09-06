/**
 * State elective-office identity.
 *
 * The smallest true thing that has to be known before a resident of a place can
 * be told which state seats exist above them: that this state has a legislature,
 * whether it sits in one chamber or two, what those chambers are called, how
 * many seats each holds, and whether the people in them are elected.
 *
 * It is deliberately smaller than a `LegislativeRulePack`. A rule pack says how
 * a bill moves through a chamber — origination, referral, committee reports,
 * concurrence, veto. Five states have one. Fifty states have a legislature.
 * Coupling the second fact to the first is what confines candidacy to five
 * jurisdictions, and separating them here is the whole point of this domain.
 *
 * What is NOT here, and must not be added here: candidate qualifications,
 * filing deadlines and fees, district geography, primary and nomination rules,
 * term lengths and limits, compensation, campaign finance, and the identity of
 * anybody currently holding a seat. Those are other domains' facts, some of
 * them already gated behind their own evidence problem, and a state-office
 * identity record that grew them would become the uniform national template
 * this substrate exists to refuse.
 */

import type { Evidence, Sourced } from "../../core/index";

/** One chamber, `unicameral` states having exactly one. */
export type LegislatureStructure = "bicameral" | "unicameral";

/**
 * Something this domain has decided not to compile, said out loud.
 *
 * A gap is not the same as an UNKNOWN value. The `Sourced` UNKNOWN says nobody
 * established this fact; a gap says why, in terms a later retrieval can act on
 * — which is what makes the difference between a substrate that is honestly
 * partial and one that is quietly empty.
 */
export interface UnresolvedGap {
  /** Stable, machine-readable: `seat-count`, `chamber-roster`, `structure`. */
  readonly gapKind: string;
  /** Which chamber the gap is about, where it is about one. */
  readonly chamberKey: string | null;
  /** Why it is unresolved, and what retrieval would resolve it. */
  readonly reason: string;
}

/**
 * A chamber's identity.
 *
 * `membersElected` is `Sourced<boolean>` and not a default. "Members of a
 * legislative chamber are elected" is true almost everywhere and is still a
 * claim about a particular state's law, so it is carried only where an
 * authority read for this domain says it.
 */
export interface ChamberIdentity {
  /** Stable within a state: `senate`, `house`, `assembly`, `legislature`. */
  readonly chamberKey: string;
  /** The chamber's official name, as the authority states it. */
  readonly name: Sourced<string>;
  /** How many seats it holds, where an authority fixes the number exactly. */
  readonly seatCount: Sourced<number>;
  /** Whether that chamber's members are elected. */
  readonly membersElected: Sourced<boolean>;
}

export interface StateLegislatureIdentity {
  /** Equal to `jurisdictionKey`; one record per state. */
  readonly recordId: string;
  /** `US-XX`, the key a rule pack and a candidacy pack already use. */
  readonly jurisdictionKey: string;
  readonly stateUsps: string;
  readonly stateName: string;
  /** The legislature's official collective name, where one is established. */
  readonly legislatureName: Sourced<string>;
  readonly structure: Sourced<LegislatureStructure>;
  /** Sorted by `chamberKey`, so a record's serialization is stable. */
  readonly chambers: readonly ChamberIdentity[];
  readonly unresolvedGaps: readonly UnresolvedGap[];
}

/** Every artifact any value in a record cites. */
export function recordCitedArtifacts(
  record: StateLegislatureIdentity,
): readonly Evidence[] {
  const found: Evidence[] = [];
  const collect = (value: Sourced<unknown>): void => {
    if (value.state === "CONFLICTING") {
      for (const claim of value.claims) found.push(...claim.evidence);
      return;
    }
    if (value.state === "UNKNOWN") {
      found.push(...value.investigated);
      return;
    }
    found.push(...value.evidence);
  };
  collect(record.legislatureName);
  collect(record.structure);
  for (const chamber of record.chambers) {
    collect(chamber.name);
    collect(chamber.seatCount);
    collect(chamber.membersElected);
  }
  return found;
}
