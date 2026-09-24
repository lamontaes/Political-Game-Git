/**
 * The order in which American law ranks, and how one level's law reaches
 * another's.
 *
 * Six levels, highest first. A rule set at a higher level in force governs over
 * any lower level's rule on the same matter (Supremacy Clause, then a state's
 * constitution over its own statutes, then state law over the localities it
 * creates). Within one level, the later law governs.
 *
 * What is modeled today: the levels, their rank, and resolution of an enacted
 * rule change by rank (`enacted-rule-changes.ts`). The producers that exist are
 * state statutes and state constitutional amendments; the others are declared
 * here so a producer added later lands in the right place.
 *
 * NOT MODELED, each with the blanket rule applied meanwhile, and each asked in
 * `docs/research/requests/constitutional-hierarchy-and-intergovernmental-relations.json`:
 *
 * - Local-authority doctrine (home rule or Dillon's rule, per state and class of
 *   local government). Blanket: Dillon's rule — a local charter or ordinance may
 *   change only what state law grants it, and no state grants any of the rules
 *   the game reads, so no local instrument changes them.
 * - Floor preemption (a higher level setting a minimum a lower level may
 *   exceed). Blanket: every conflict is resolved by rank, as field preemption.
 * - Which rules a state's constitution leaves to statute. Blanket: once an
 *   amendment sets a rule, a statute cannot change it.
 * - Interstate compacts, full faith and credit and extradition. They bind
 *   states to each other rather than ranking one level over another; the game
 *   holds no compact and no rule it reads is set by one.
 * - D.C. (congressional review of Council acts under the Home Rule Act),
 *   Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and the
 *   Northern Mariana Islands (the territorial clause, organic acts and the
 *   Covenant). Blanket: each ranks where a state would for the levels below
 *   federal law. That is a ranking only; no state's rules are lent to any of
 *   them.
 */

export type LawLevel =
  | "federal-constitution"
  | "federal-statute"
  | "state-constitution"
  | "state-statute"
  | "local-charter"
  | "local-ordinance";

/** Highest first. */
export const LAW_LEVELS: readonly LawLevel[] = [
  "federal-constitution",
  "federal-statute",
  "state-constitution",
  "state-statute",
  "local-charter",
  "local-ordinance",
];

/** Larger outranks smaller. */
export function lawLevelRank(level: LawLevel): number {
  return LAW_LEVELS.length - LAW_LEVELS.indexOf(level);
}

export function outranks(a: LawLevel, b: LawLevel): boolean {
  return lawLevelRank(a) > lawLevelRank(b);
}

export type LocalAuthorityDoctrine = "home-rule" | "dillons-rule" | "mixed";

/**
 * A state's doctrine for its local governments, and whether that is known.
 * No state's doctrine is compiled yet, so every answer is the blanket rule and
 * says so.
 */
export function localAuthorityDoctrine(stateUsps: string): {
  readonly stateUsps: string;
  readonly doctrine: LocalAuthorityDoctrine;
  readonly basis: "game-default";
  readonly note: string;
} {
  return {
    stateUsps,
    doctrine: "dillons-rule",
    basis: "game-default",
    note: "This state's local-authority doctrine is not modeled; the game applies Dillon's rule, so a local instrument changes only what state law grants it.",
  };
}

/**
 * Whether a local instrument may change a rule. With Dillon's rule as the
 * blanket and no grant compiled, the answer is always no, with the reason.
 */
export function localInstrumentMayChange(
  stateUsps: string,
  field: string,
): { readonly allowed: false; readonly reason: string } {
  const doctrine = localAuthorityDoctrine(stateUsps);
  return {
    allowed: false,
    reason: `${doctrine.note} No grant of "${field}" to a local government is modeled.`,
  };
}
