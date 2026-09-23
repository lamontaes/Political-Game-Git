/**
 * Local crime: the offenses this game represents and every rate it uses.
 *
 * EVERY NUMBER HERE IS A PLACEHOLDER. None of them is researched for any
 * place. They are blanket game rules so that ordinary towns are no longer
 * crime-free, held until the research filed as `local-crime-rates-by-place`
 * lands. A researched table replaces this one under a new version; it is not
 * edited in place, so a save always knows which rules produced its history.
 *
 * What is deliberately not represented, because the world keeps no record a
 * scene could name: theft of a specific object (no inventory of belongings),
 * vehicle theft (no record of who owns a vehicle), and anything drawing on an
 * offender's identity (see `OFFENDERS_ARE_NOT_REPRESENTED`).
 */
export const CRIME_CONTRACT_VERSION = "local-crime-unresearched-v1" as const;

export type CrimeOffense = "assault" | "robbery" | "burglary" | "vandalism";

/** Whom an offense happens to: one person, or everyone living in a home. */
export type CrimeTarget = "person" | "household";

export interface CrimeOffenseRule {
  readonly offense: CrimeOffense;
  readonly target: CrimeTarget;
  /**
   * UNRESEARCHED. Expected offenses per year for one represented person
   * (aged `minimumVictimAge` or older) or one represented household.
   */
  readonly annualRate: number;
  /** UNRESEARCHED. Share of offenses the victim reports to police. */
  readonly reportedShare: number;
  /** UNRESEARCHED. Share of reported offenses that end in an arrest. */
  readonly arrestShare: number;
}

export const UNRESEARCHED_LOCAL_CRIME = {
  version: CRIME_CONTRACT_VERSION,
  provenance: "unresearched-blanket-rule",
  /**
   * The same rules everywhere. Real rates differ widely by place; until the
   * research lands, no town is made more or less dangerous than another.
   */
  appliesTo: "every-represented-local-place",
  /** UNRESEARCHED. Youngest person a personal offense is drawn against. */
  minimumVictimAge: 12,
  offenses: [
    {
      offense: "assault",
      target: "person",
      annualRate: 0.016,
      reportedShare: 0.45,
      arrestShare: 0.4,
    },
    {
      offense: "robbery",
      target: "person",
      annualRate: 0.002,
      reportedShare: 0.6,
      arrestShare: 0.25,
    },
    {
      offense: "burglary",
      target: "household",
      annualRate: 0.012,
      reportedShare: 0.5,
      arrestShare: 0.12,
    },
    {
      offense: "vandalism",
      target: "household",
      annualRate: 0.02,
      reportedShare: 0.3,
      arrestShare: 0.1,
    },
  ] as const satisfies readonly CrimeOffenseRule[],
} as const;

/**
 * The town's own police log: offenses against residents the world does not
 * represent by name.
 *
 * A town is represented by a handful of named people (about sixteen in a
 * measured Charlottesville opening), so drawing only against them leaves a
 * town of tens of thousands with a crime every few years. The simulation
 * holds no population figure for a place, so this log cannot be scaled to the
 * town's size: EVERY local place gets the same blanket expectation until
 * place population and crime rates are researched (`local-crime-rates-by-place`).
 * That makes a village and a city equally busy, which is known to be wrong.
 * When `placePopulation(placeGeoid)` (nationwide-world/place-population.ts,
 * filed as `place-population-today`) holds a figure, scale by it here.
 */
export const UNRESEARCHED_TOWN_POLICE_LOG = {
  version: CRIME_CONTRACT_VERSION,
  provenance: "unresearched-blanket-rule",
  /** UNRESEARCHED. Expected reported offenses per month, in any town. */
  reportedPerMonth: 2,
  /**
   * Which offense a logged report is: in proportion to each rule's
   * `annualRate` times `reportedShare` above, so the two tables agree.
   */
  offenseMix: "annual-rate-times-reported-share",
} as const;

/**
 * Who commits an offense is not drawn. Choosing a represented person to be an
 * offender would invent a motive and a character the world never produced;
 * that has to come from pressure on real people (money, grievance, habit),
 * which is filed as research, not from a die. Until then an arrest names no
 * represented person and its hand-off to prosecution carries no offender.
 */
export const OFFENDERS_ARE_NOT_REPRESENTED = true as const;

/** What the public police log says happened, by offense. */
export const REPORTED_OFFENSE_PHRASE: Readonly<Record<CrimeOffense, string>> = {
  assault: "an assault",
  robbery: "a robbery",
  burglary: "a home burglary",
  vandalism: "vandalism at a home",
};

/** What the victim knows happened to them. `{name}` is the victim. */
export const VICTIM_KNOWS: Readonly<Record<CrimeOffense, string>> = {
  assault: "{name} was assaulted.",
  robbery: "{name} was robbed.",
  burglary: "Someone broke into {name}'s home.",
  vandalism: "Someone vandalized {name}'s home.",
};

export function crimeRule(offense: CrimeOffense): CrimeOffenseRule {
  const rule = UNRESEARCHED_LOCAL_CRIME.offenses.find(
    (candidate) => candidate.offense === offense,
  );
  if (!rule) throw new Error(`Unknown offense: ${offense}`);
  return rule;
}
