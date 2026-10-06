/**
 * Local crime: the offenses this game represents and every rate it uses.
 *
 * EVERY RATE HERE IS ESTIMATED FROM AVERAGE: the national rates of the
 * National Crime Victimization Survey (BJS, Criminal Victimization, 2023,
 * NCJ 309335, tables 1, 2 and 5) and the FBI's national clearance shares
 * (Crime in the Nation, 2023). No place-by-place table is read yet (filed as
 * `local-crime-rates-by-place`), so each town starts from the national
 * average. The version string below is a persisted identifier: events and
 * monthly passes already in a save are keyed by it, so it keeps its spelling.
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
   * Expected offenses per year for one represented person
   * (aged `minimumVictimAge` or older) or one represented household.
   */
  readonly annualRate: number;
  /**
   * Share of offenses reported to police, for the town's
   * police log mix only. Whether a named victim reports is their own
   * decision (`./reporting`).
   */
  readonly reportedShare: number;
  /**
   * Share of reported offenses that end in an arrest: a check
   * on totals only. Who is arrested follows from `./offenders`.
   */
  readonly arrestShare: number;
}

export const LOCAL_CRIME_RATES = {
  version: CRIME_CONTRACT_VERSION,
  provenance: "estimated-from-average",
  estimated: true,
  estimatedFrom:
    "BJS Criminal Victimization 2023 (NCJ 309335): 2023 rates per 1,000 persons 12+ (aggravated assault 4.5 plus simple assault 13.8, robbery 2.6) and per 1,000 households (burglary 9.0), and shares reported to police; FBI Crime in the Nation 2023 clearance shares. Vandalism is not an NCVS category: its rate and reported share are carried over from the earlier estimate.",
  /**
   * The same rules everywhere. Real rates differ widely by place; until the
   * place table is read, each town starts from the national average.
   */
  appliesTo: "every-represented-local-place",
  /** Youngest person a personal offense is drawn against. */
  minimumVictimAge: 12,
  offenses: [
    {
      offense: "assault",
      target: "person",
      annualRate: 0.0183,
      reportedShare: 0.449,
      arrestShare: 0.46,
    },
    {
      offense: "robbery",
      target: "person",
      annualRate: 0.0026,
      reportedShare: 0.424,
      arrestShare: 0.28,
    },
    {
      offense: "burglary",
      target: "household",
      annualRate: 0.009,
      reportedShare: 0.422,
      arrestShare: 0.13,
    },
    {
      offense: "vandalism",
      target: "household",
      annualRate: 0.02,
      reportedShare: 0.248,
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
 * town's size: EVERY local place gets the same national-average expectation until
 * place population and crime rates are researched (`local-crime-rates-by-place`).
 * That makes a village and a city equally busy, which is known to be wrong.
 * When `placePopulation(placeGeoid)` (nationwide-world/place-population.ts,
 * filed as `place-population-today`) holds a figure, scale by it here.
 */
export const TOWN_POLICE_LOG = {
  version: CRIME_CONTRACT_VERSION,
  provenance: "estimated-from-average",
  estimated: true,
  estimatedFrom:
    "National-average expectation from the NCVS rates in LOCAL_CRIME_RATES; scaling by place population waits on `place-population-today`.",
  /** Expected reported offenses per month, in any town (estimated from the national average). */
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
  const rule = LOCAL_CRIME_RATES.offenses.find(
    (candidate) => candidate.offense === offense,
  );
  if (!rule) throw new Error(`Unknown offense: ${offense}`);
  return rule;
}
