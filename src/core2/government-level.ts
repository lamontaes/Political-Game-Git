/**
 * The levels of government the core tells apart, written once. A level is
 * data a row carries; nothing here decides what a level does.
 */
export type GovernmentLevel = "federal" | "state" | "county" | "city";

/** The same levels with the township, where a row can sit at a township. */
export type GovernmentLevelWithTownship = GovernmentLevel | "township";
