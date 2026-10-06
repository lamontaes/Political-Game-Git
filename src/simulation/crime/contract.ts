/**
 * Local crime: the offenses this game represents and every rate it uses.
 *
 * These are ESTIMATED FROM AVERAGE national rates because the game does not
 * yet hold offense-specific local rates. The basis is the 2023 National Crime
 * Victimization Survey for victimization and reporting, and FBI Crime Data
 * Explorer clearance totals for arrests. The places used are the largest
 * represented place in each of the game's 56 state and territory profiles.
 * A later place table replaces this one under a new version; this version is
 * not edited in place, so a save always knows which rules produced its history.
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
   * ESTIMATED FROM AVERAGE. Expected offenses per year for one represented
   * person (aged `minimumVictimAge` or older) or one represented household.
   */
  readonly annualRate: number;
  /**
   * ESTIMATED FROM AVERAGE. Share of offenses reported to police, for the
   * town's police log mix only. Whether a named victim reports is their own
   * decision (`./reporting`).
   */
  readonly reportedShare: number;
  /**
   * ESTIMATED FROM AVERAGE. Share of reported offenses that end in an arrest:
   * a check on totals only. Who is arrested follows from `./offenders`.
   */
  readonly arrestShare: number;
}

export const LOCAL_CRIME_ESTIMATES = {
  version: CRIME_CONTRACT_VERSION,
  provenance: "estimated-from-national-average",
  /**
   * The same rules everywhere. Real rates differ widely by place; until the
   * research lands, no town is made more or less dangerous than another.
   */
  appliesTo: "every-represented-local-place",
  /** NCVS estimates cover people age 12 and older. */
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
export const TOWN_POLICE_LOG_ESTIMATE = {
  version: CRIME_CONTRACT_VERSION,
  provenance: "estimated-from-national-average",
  /** ESTIMATED FROM AVERAGE: monthly reports across the 56-place basis. */
  reportedPerMonth: 2,
  /**
   * Which offense a logged report is: in proportion to each rule's
   * `annualRate` times `reportedShare` above, so the two tables agree.
   */
  offenseMix: "annual-rate-times-reported-share",
} as const;

/**
 * Who commits an offense is not drawn: `./offenders` lays it at the door of the
 * resident whose own circumstances point to it, or of nobody the world names.
 */
export const OFFENDERS_ARE_NOT_REPRESENTED = false as const;

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

/**
 * The private record of an offense nobody reported. Only the victims know of
 * it, so it says what happened to them, by name. `{names}` is the victims,
 * `{place}` the town.
 */
export const UNREPORTED_OFFENSE_RECORD: Readonly<Record<CrimeOffense, string>> =
  {
    assault:
      "{names} was assaulted in {place} and did not report it to police.",
    robbery: "{names} was robbed in {place} and did not report it to police.",
    burglary:
      "Someone broke into the {place} home of {names}. No one reported it to police.",
    vandalism:
      "Someone vandalized the {place} home of {names}. No one reported it to police.",
  };

export function crimeRule(offense: CrimeOffense): CrimeOffenseRule {
  const rule = LOCAL_CRIME_ESTIMATES.offenses.find(
    (candidate) => candidate.offense === offense,
  );
  if (!rule) throw new Error(`Unsupported crime offense: ${offense}`);
  return rule;
}
