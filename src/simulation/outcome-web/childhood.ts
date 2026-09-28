import { dateAtAge, daysBetween, makeIsoDate } from "../dates";
import type { EntityId, IsoDate, World } from "../types";

/**
 * A person's childhood record (04 SYSTEM SPECS, part 5): what they lived with
 * from birth to 18, which adult outcomes read through exposure-years links.
 *
 * It is read from the history the world already keeps, never stored a second
 * time: the history is append-only, so the record for any date can be read
 * again later and comes out the same. Years before the world opened were not
 * watched. They are reported as unobserved, never as years without exposure.
 */
export const CHILDHOOD_RECORD_VERSION = "childhood-record/v1" as const;

export const CHILDHOOD_END_AGE = 18;

export interface ChildhoodExposure {
  /** The measure an exposure-years link reads, such as `health.child-coverage-years`. */
  readonly key: string;
  /** The amount over the watched part of childhood, or null if unknown. */
  readonly amount: number | null;
  readonly unit: string;
  /** Why the amount is null, when it is. */
  readonly unknownBecause: string | null;
}

export interface ChildhoodRecord {
  readonly personId: EntityId;
  readonly asOf: IsoDate;
  readonly childhoodStart: IsoDate;
  /** The 18th birthday, or `asOf` for a child. */
  readonly childhoodEnd: IsoDate;
  /** The part of childhood the world has watched, or null if none. */
  readonly watchedFrom: IsoDate | null;
  readonly watchedYears: number;
  /** Childhood years before the world opened. */
  readonly unwatchedYears: number;
  readonly exposures: readonly ChildhoodExposure[];
}

interface ChildhoodWindow {
  readonly personId: EntityId;
  readonly from: IsoDate;
  readonly to: IsoDate;
}

interface ExposureReader {
  readonly key: string;
  readonly unit: string;
  read(
    world: World,
    window: ChildhoodWindow,
  ): { amount: number } | { unknownBecause: string };
}

const years = (from: IsoDate, to: IsoDate) =>
  Math.max(0, daysBetween(from, to)) / 365.25;

/**
 * Homes a child moved into during the watched part of childhood: a new
 * household joined as a resident, or the household's own address changing.
 */
const moves: ExposureReader = {
  key: "housing.childhood-moves",
  unit: "moves",
  read(world, window) {
    const history = world.history;
    const stateOf = new Map<
      EntityId,
      (typeof history.householdMembershipStates)[number][]
    >();
    for (const state of history.householdMembershipStates) {
      stateOf.set(state.membershipId, [
        ...(stateOf.get(state.membershipId) ?? []),
        state,
      ]);
    }
    const residences = history.householdMemberships.filter(
      (membership) =>
        membership.personId === window.personId &&
        (stateOf.get(membership.id) ?? []).some(
          (state) =>
            state.status === "resident" && state.residenceRole === "primary",
        ),
    );
    let count = 0;
    for (const membership of residences) {
      if (
        membership.startedAt > window.from &&
        membership.startedAt <= window.to
      )
        count += 1;
      const ended = (stateOf.get(membership.id) ?? [])
        .filter((state) => state.status === "ended")
        .map((state) => state.effectiveAt)
        .sort()[0];
      const livedTo = ended && ended < window.to ? ended : window.to;
      const livedFrom =
        membership.startedAt > window.from ? membership.startedAt : window.from;
      count += history.householdLocations.filter(
        (location) =>
          location.householdId === membership.householdId &&
          location.supersedesLocationId !== null &&
          location.effectiveAt > livedFrom &&
          location.effectiveAt <= livedTo,
      ).length;
    }
    return { amount: count };
  },
};

/** Exposures the part 5 research names whose owning lane records nothing per person yet. */
const unrecorded = (
  key: string,
  unit: string,
  owner: string,
): ExposureReader => ({
  key,
  unit,
  read: () => ({ unknownBecause: `${owner} records no per-person figure yet` }),
});

/**
 * Keys match the `from` of the exposure-years links in
 * `data/research/outcome-web/links.json`, so a link reads its own exposure.
 */
const EXPOSURES: readonly ExposureReader[] = [
  moves,
  unrecorded("health.child-coverage-years", "years eligible for coverage", "F"),
  unrecorded(
    "program.snap-years-in-childhood",
    "years in a household receiving food aid",
    "F",
  ),
  unrecorded(
    "household.child-poverty-years",
    "years below the poverty line",
    "F",
  ),
  unrecorded(
    "school.spending-per-student",
    "years of school money per student",
    "M",
  ),
  unrecorded(
    "neighborhood.years-in-better-area",
    "years in a higher-opportunity area",
    "M",
  ),
  unrecorded(
    "env.particulates-in-birth-year",
    "fine particles in the birth year",
    "O",
  ),
];

export const CHILDHOOD_EXPOSURE_KEYS: readonly string[] = EXPOSURES.map(
  (row) => row.key,
);

/**
 * A person's childhood record as of a date: null when the person is not in
 * the world. For an adult it covers birth to the 18th birthday.
 */
export function childhoodRecord(
  world: World,
  personId: EntityId,
  asOf: IsoDate,
): ChildhoodRecord | null {
  const person = world.people[personId];
  if (!person) return null;
  const start = makeIsoDate(person.birthDate);
  const eighteen = dateAtAge(start, CHILDHOOD_END_AGE);
  const end = eighteen < asOf ? eighteen : asOf;
  const opened = makeIsoDate(world.startedAt);
  const watchedFrom = opened > start ? opened : start;
  const watched = watchedFrom < end ? watchedFrom : null;
  const window: ChildhoodWindow | null = watched
    ? { personId, from: watched, to: end }
    : null;
  return {
    personId,
    asOf,
    childhoodStart: start,
    childhoodEnd: end,
    watchedFrom: watched,
    watchedYears: watched ? years(watched, end) : 0,
    unwatchedYears: years(start, watched ?? end),
    exposures: EXPOSURES.map((reader) => {
      if (!window) {
        return {
          key: reader.key,
          unit: reader.unit,
          amount: null,
          unknownBecause: "the world opened after this childhood ended",
        };
      }
      const read = reader.read(world, window);
      return "amount" in read
        ? {
            key: reader.key,
            unit: reader.unit,
            amount: read.amount,
            unknownBecause: null,
          }
        : {
            key: reader.key,
            unit: reader.unit,
            amount: null,
            unknownBecause: read.unknownBecause,
          };
    }),
  };
}
