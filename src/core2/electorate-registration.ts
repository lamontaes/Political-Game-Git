/**
 * Voter registration as a record (owner, Nov 14, 2026). A full person is on
 * the rolls or not, at an address, since a day, and a move leaves the
 * registration at the old address until the person registers again. The
 * rule that fills the record in is one for both tiers of the population:
 *
 * - Whether a person registers at all, apart from what the state does for
 *   them, comes from the share of their kind who are on the rolls in the
 *   real survey (CPS, November 2024, citizens by state and age band), spread
 *   over the town's people from their own id, as a person's starting carry
 *   is (`openingVoterCarry`). A state with automatic registration registers
 *   a person when their address changes or they turn 18.
 * - How long they wait after a move, or after turning 18, comes from their
 *   own sense of duty: the median wait times e to the minus the slope times
 *   duty. A named person registers on the day the wait ends. A counted
 *   record stands for people with every wait up to and past that median,
 *   so it is on the rolls in the share `1 - 2^(-days / wait)`; a record
 *   whose date of moving is unknown stands for the share of its age that
 *   moved in the last year (the moves engine's own rates).
 * - A registration counts in an election if it took effect by the state's
 *   deadline, or on the day where the state registers people at the polls.
 *
 * Nothing here is rolled. The records it keeps are read by the turnout rule
 * (`decideTurnout`), the polling place (`pollingPlaceOf`) and the day's
 * record of who was turned away or registered at the polls.
 */
import { addDays, ageInYears, daysBetween, makeIsoDate } from "./kernel/dates";
import { campaignParameter } from "./campaign-data";
import { cpsAgeBand, cpsRegistered } from "./electorate-places";
import { dwellingMovedIn } from "./modules/housing";
import {
  PERSON_MOVED_IN,
  PERSON_MOVED_WITHIN,
  preStartHistory,
} from "./past-module";
import { openingVoterCarry } from "./turnout";
import type { ModuleRow } from "./module-data";
import type { CoreAPI, CoreState, PersonState } from "./types";

/** One person's registration, kept in the voting module. */
export interface RegistrationRow {
  readonly id: string;
  readonly personId: string;
  /** On the rolls somewhere (at `addressKey`, which may be a past address). */
  readonly registered: boolean;
  /** The address the registration is at; null for someone never registered. */
  readonly addressKey: string | null;
  /** The day it took effect (registered), or the day the wait to register began (not registered). */
  readonly since: string;
  /** How a registration was made. */
  readonly how: "opening" | "automatic" | "form" | "at-the-polls" | "none";
  /** The address at the last review, so a move since is seen. */
  readonly lastAddress: string;
  /** For a registration at a past address: the day the person moved, from which their wait to register again runs. */
  readonly staleSince: string | null;
  /** Whether this person registers at all unless the state does it for them. */
  readonly willing: boolean;
}

/** The mean of `1 - 2^(-t / lag)` over the days of a year: the share of a year's new movers on the rolls. */
export function firstYearShare(lag: number, deadline = 0): number {
  // Numeric mean over 365 days; the deadline shifts when a registration counts.
  let sum = 0;
  for (let t = 0; t < 365; t += 5)
    sum += 1 - Math.pow(2, -Math.max(0, t - deadline) / lag);
  return sum / 73;
}

/** The days a person of this duty waits to register (median at duty zero). */
export function registrationWait(duty: number): number {
  return (
    campaignParameter("registrationLagMedianDays") *
    Math.exp(-campaignParameter("registrationLagDutySlope") * duty)
  );
}

/** The share of people like a counted record on the rolls `days` after a move. */
export function registeredAfter(
  days: number,
  duty: number,
  deadline: number,
): number {
  return (
    1 - Math.pow(2, -Math.max(0, days - deadline) / registrationWait(duty))
  );
}

/** What a counted record stands for in the registration rule: the part that keeps off the rolls and the part the state registers. */
export interface CountedRegistrationInputs {
  readonly duty: number;
  /** Whole years in the home; undefined where unrecorded. */
  readonly yearsInPlace: number | undefined;
  /** Whole years since turning 18. */
  readonly yearsAdult: number;
  /** The share of people this age who moved in the last year. */
  readonly moveRate: number;
  /** Automatic registration is in force. */
  readonly automatic: boolean;
  /** Registered on or before election day counts (same-day registration), so no deadline. */
  readonly deadlineDays: number;
}

/**
 * The share of a counted record's people on the rolls is
 * `(1 - kept off) * a + b`: `a` the part that registers by their own
 * choice, `b` the part the state registers (automatic registration at a
 * move or at 18).
 */
export function countedParts(input: CountedRegistrationInputs): {
  readonly a: number;
  readonly b: number;
} {
  const wait = registrationWait(input.duty);
  const recent = Math.min(input.yearsInPlace ?? Infinity, input.yearsAdult) < 1;
  if (recent)
    return input.automatic
      ? { a: 0, b: 1 }
      : { a: firstYearShare(wait, input.deadlineDays), b: 0 };
  if (input.yearsInPlace !== undefined) return { a: 1, b: 0 };
  // The record doesn't say when it moved: it stands for the share of its age that did in the last year.
  const moved = Math.min(1, Math.max(0, input.moveRate));
  return input.automatic
    ? { a: 1 - moved, b: moved }
    : { a: 1 - moved * (1 - firstYearShare(wait, input.deadlineDays)), b: 0 };
}

/** A person's own place, 0 to 1, among those who keep off the rolls (seeded from their id, as a starting carry is). */
export function keepsOffRolls(personId: string): number {
  return openingVoterCarry(`registration:${personId}`);
}

/** The first day a person is registered who waits from `since`. */
export function registeredOn(since: string, duty: number): string {
  return addDays(makeIsoDate(since), Math.round(registrationWait(duty)));
}

/** Days from one date to a later one (0 when not later). */
export function daysSince(from: string, to: string): number {
  return Math.max(0, daysBetween(makeIsoDate(from), makeIsoDate(to)));
}

// --- the records ----------------------------------------------------------

/** What the registration records need from the voting engine, handed in so this file reads no engine back. */
export interface RegistrationDeps {
  readonly api: CoreAPI;
  /** The voting module's tables. */
  readonly table: (name: string) => {
    get(id: string): unknown;
    put(row: ModuleRow): void;
  };
  /** The town's named adults who may vote today. */
  readonly adults: () => readonly PersonState[];
  /** A voter's sense of duty (the turnout scale's duty term). */
  readonly dutyOf: (person: PersonState) => number;
  /** The town's state (its two-letter postal code), for the survey's rates. */
  readonly usps: string;
  readonly automatic: () => boolean;
}

const idOf = (personId: string) => `registration:${personId}`;

/** The day a person turns 18 (the voting age), February 29 taken as the 28th. */
function adultOn(birthDate: string, votingAge: number): string {
  const year = Number(birthDate.slice(0, 4)) + votingAge;
  const rest = birthDate.slice(4).replace("-02-29", "-02-28");
  return `${String(year).padStart(4, "0")}${rest}`;
}

/** A named person's address: their household and the day its home began in play. */
export function addressKeyOf(api: CoreAPI, person: PersonState): string {
  return `${person.householdId}@${dwellingMovedIn(api, person.householdId) ?? ""}`;
}

/** When a named person's wait to register runs from: the later of the day they turned 18 and their last move on record. */
export function waitAnchor(
  api: CoreAPI,
  person: PersonState,
): { readonly anchor: string; readonly grown: string } {
  const grown = adultOn(person.birthDate, api.parameter("votingAge"));
  const moved = lastMoveOf(api, person);
  return { anchor: moved && moved > grown ? moved : grown, grown };
}

/** The last day a named person changed homes that the records hold (before the start or in play). */
function lastMoveOf(api: CoreAPI, person: PersonState): string | undefined {
  const core = api.state as CoreState;
  let last = dwellingMovedIn(api, person.householdId);
  for (const kind of [PERSON_MOVED_IN, PERSON_MOVED_WITHIN])
    for (const row of preStartHistory(core, { kind, personId: person.id }))
      if (row.date <= api.state.date && (!last || row.date > last))
        last = row.date;
  return last;
}

/** The share of an age band's citizens on the rolls: the survey's, by the town's state. */
function surveyShare(usps: string, age: number): number {
  const band = cpsAgeBand(age);
  return cpsRegistered(usps, band) ?? cpsRegistered(usps) ?? 0.7;
}

/** One person or counted record the opening roll holds, for finding the part of each age band that keeps off the rolls. */
export interface RollEntry {
  readonly age: number;
  readonly weight: number;
  readonly inputs: CountedRegistrationInputs;
}

/**
 * Find, once and keep, the part of each age band that keeps off the rolls
 * so that the roll's expected share on them is the survey's for that band
 * (the people who moved lately are the ones the rule has waiting, so the
 * part that keeps off the rolls is what the survey leaves over).
 */
export function ensureKeptOff(
  deps: RegistrationDeps,
  roll: () => readonly RollEntry[],
): void {
  if (deps.table("registrationBase").get("registration-base")) return;
  const bands = new Map<
    string,
    { w: number; a: number; b: number; age: number }
  >();
  for (const p of roll()) {
    const key = cpsAgeBand(p.age) ?? "all";
    const { a, b } = countedParts(p.inputs);
    const sum = bands.get(key) ?? { w: 0, a: 0, b: 0, age: p.age };
    sum.w += p.weight;
    sum.a += p.weight * a;
    sum.b += p.weight * b;
    bands.set(key, sum);
  }
  const off: Record<string, number> = {};
  for (const [key, sum] of bands) {
    const survey = surveyShare(deps.usps, sum.age);
    // The share on the rolls is (1 - off) * a + b; set it to the survey's.
    const willing = (survey - sum.b / sum.w) / (sum.a / sum.w || 1);
    off[key] = Math.min(0.7, Math.max(0, 1 - willing));
  }
  deps.table("registrationBase").put({
    id: "registration-base",
    off,
  } as unknown as ModuleRow);
}

/** The part of a person's age band that keeps off the rolls (zero for a band the opening roll did not hold). */
export function keptOffOf(deps: RegistrationDeps, age: number): number {
  const row = deps.table("registrationBase").get("registration-base") as
    { readonly off: Readonly<Record<string, number>> } | undefined;
  return row?.off[cpsAgeBand(age) ?? "all"] ?? 0;
}

/** The record of one named person, read (never written). */
export function registrationRow(
  deps: RegistrationDeps,
  personId: string,
): RegistrationRow | undefined {
  return deps.table("registrations").get(idOf(personId)) as
    RegistrationRow | undefined;
}

/** Whether a named person's registration is at the address they live at and took effect by `by` (or on the day, where the state registers at the polls). */
export function onTheList(
  deps: RegistrationDeps,
  person: PersonState,
  deadline: string | null,
): "on" | "old-address" | "not-registered" | "after-deadline" {
  // The person the player controls is always registered (owner, Nov 16: "Keep
  // it for townspeople; you are always registered"): the rolls are the
  // townspeople's, and the player is never turned away from them.
  if (person.id === deps.api.state.playerId) return "on";
  const row = registrationRow(deps, person.id);
  if (!row?.registered) return "not-registered";
  if (row.addressKey !== addressKeyOf(deps.api, person)) return "old-address";
  return deadline !== null && row.since > deadline ? "after-deadline" : "on";
}

const reviewed = new WeakMap<object, string>();

/**
 * Bring every named adult's registration up to the day: a person never seen
 * gets the record the world already has them in (a mover whose wait has not
 * run out is still at the old address; the share who keep off the rolls
 * are the survey's), and a person seen before is checked for a move and for
 * their wait ending. A person is registered on the day their wait ended, not
 * the day this runs.
 */
export function reviewRegistrations(deps: RegistrationDeps): void {
  const { api } = deps;
  const date = api.state.date;
  if (reviewed.get(api.state) === date) return;
  reviewed.set(api.state, date);
  const rows = deps.table("registrations");
  const adultAge = api.parameter("votingAge");
  const automatic = deps.automatic();
  const people = deps.adults();
  for (const person of people) {
    const key = addressKeyOf(api, person);
    const row = rows.get(idOf(person.id)) as RegistrationRow | undefined;
    if (!row) {
      rows.put(
        startRow(
          deps,
          person,
          key,
          adultAge,
          automatic,
        ) as unknown as ModuleRow,
      );
      continue;
    }
    let next = row;
    if (row.lastAddress !== key) {
      // A move: the day it happened where the home's record says so, else today.
      const moved = dwellingMovedIn(api, person.householdId) ?? date;
      next = automatic
        ? {
            ...row,
            registered: true,
            addressKey: key,
            since: moved,
            how: "automatic",
            staleSince: null,
            lastAddress: key,
          }
        : row.registered
          ? { ...row, staleSince: moved, lastAddress: key }
          : { ...row, since: moved, lastAddress: key };
    }
    const waiting = next.registered
      ? next.staleSince !== null && next.addressKey !== key
      : next.willing;
    if (waiting) {
      const due = registeredOn(
        next.staleSince ?? next.since,
        deps.dutyOf(person),
      );
      if (due <= date)
        next = {
          ...next,
          registered: true,
          addressKey: key,
          since: due,
          how: "form",
          staleSince: null,
        };
    }
    if (next !== row) rows.put(next as unknown as ModuleRow);
  }
}

function startRow(
  deps: RegistrationDeps,
  person: PersonState,
  key: string,
  adultAge: number,
  automatic: boolean,
): RegistrationRow {
  const { api } = deps;
  const date = api.state.date;
  const grown = adultOn(person.birthDate, adultAge);
  const moved = lastMoveOf(api, person);
  const anchor = moved && moved > grown ? moved : grown;
  const age = ageInYears(person.birthDate, date);
  const off = keptOffOf(deps, age);
  const willing = keepsOffRolls(person.id) >= off;
  const base = {
    id: idOf(person.id),
    personId: person.id,
    lastAddress: key,
    willing,
  };
  if (automatic && daysSince(anchor, date) < 365)
    return {
      ...base,
      registered: true,
      addressKey: key,
      since: anchor,
      how: "automatic",
      staleSince: null,
    };
  if (!willing)
    return {
      ...base,
      registered: false,
      addressKey: null,
      since: anchor,
      how: "none",
      staleSince: null,
    };
  const due = registeredOn(anchor, deps.dutyOf(person));
  if (due <= date)
    return {
      ...base,
      registered: true,
      addressKey: key,
      since: due,
      how: "opening",
      staleSince: null,
    };
  // Still waiting: a mover is on the rolls at the address they left, a new adult is not on them yet.
  return moved && anchor === moved
    ? {
        ...base,
        registered: true,
        addressKey: `prior:${person.id}`,
        since: grown,
        how: "opening",
        staleSince: anchor,
      }
    : {
        ...base,
        registered: false,
        addressKey: null,
        since: anchor,
        how: "none",
        staleSince: null,
      };
}
