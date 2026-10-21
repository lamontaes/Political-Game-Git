/**
 * The people of a town's outlets (OPUS-PEOPLE press). Each outlet has a head
 * (a newspaper's publisher and editor, a station's news director) who sets
 * its editorial line, and one or more reporters. They are named people the
 * player will deal with, so they are generated at the opening as full people
 * in the town, seeded from the world and the outlet so the same people come
 * back every time, and hired through the shared payroll path: their pay is on
 * the journal, paid from the outlet's own cash.
 *
 * Who exists is seeded generation; nothing here decides what anyone does.
 */
import { SeededRng } from "./kernel/rng";
import { addDays, makeIsoDate } from "./kernel/dates";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { generatePersonIdentity } from "./gov-rules/person-identity";
import { drawCohortGivenName } from "./gov-rules/given-name-cohorts";
import {
  getNameCorpus,
  givenNamePoolForCorpus,
  nameCorpusVersionForPlace,
  PLACE_NAMES_V1_VERSION,
} from "./gov-rules/names-data";
import { isRealOfficeholderName } from "./officials-names";
import { fillInIdentity, fillInPerson } from "./state";
import { parameter } from "./parameters";
import { medianTransactionBalance } from "./starting-cash";
import { countedResidents } from "./electorate";
import { startPublicJob } from "./public-payroll";
import { giveLivingCost } from "./official-living";
import staffJson from "./data/press/staff.json" with { type: "json" };
import mastheadsJson from "./data/press/mastheads.json" with { type: "json" };
import type { CoreAPI, CoreState, PersonId, Source } from "./types";

export type StaffRole = "owner" | "head" | "reporter";

interface RoleRow {
  readonly id: StaffRole;
  readonly soc: string;
  readonly title: string;
  /** Null for an owner, who holds the outlet and is on no payroll. */
  readonly payParameter: string | null;
  readonly ageMinParameter: string;
  readonly ageMaxParameter: string;
}
export const STAFF_ROLES = (staffJson as unknown as { roles: RoleRow[] }).roles;

const MASTHEADS = mastheadsJson as unknown as {
  newspaperWords: { rows: readonly string[] };
  callSignPrefix: { byState: Readonly<Record<string, string>> };
  callSignLetters: number;
  televisionSuffix: string;
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * An outlet's name: a newspaper takes the town's name and a masthead word, a
 * station a call sign with its state's first letter. Seeded by the world and
 * the outlet; two outlets in town never share one.
 */
export function outletName(input: {
  readonly seed: string;
  readonly outletId: string;
  readonly kind: "newspaper" | "television" | "radio";
  readonly townPlaceId: string;
  readonly stateKey: string;
  readonly taken: ReadonlySet<string>;
}): string {
  const rng = new SeededRng(input.seed).fork(`press-name:${input.outletId}`);
  const usps = input.stateKey.slice(input.stateKey.lastIndexOf("-") + 1);
  for (let attempt = 0; ; attempt += 1) {
    const draw = rng.fork(String(attempt));
    let name: string;
    if (input.kind === "newspaper") {
      // The town's own name, without the state the display name adds.
      const town = (
        corePlaceByJurisdictionId(input.townPlaceId as never)?.displayName ?? ""
      ).split(",")[0]!;
      name = `${town} ${draw.pick(MASTHEADS.newspaperWords.rows)}`.trim();
    } else {
      const prefix = MASTHEADS.callSignPrefix.byState[usps] ?? "W";
      let letters = "";
      for (let i = 0; i < MASTHEADS.callSignLetters; i += 1)
        letters += LETTERS[draw.integer(0, LETTERS.length)];
      name = `${prefix}${letters}${
        input.kind === "television" ? MASTHEADS.televisionSuffix : ""
      }`;
    }
    if (!input.taken.has(name)) return name;
  }
}

/** A national outlet's name from its kind's words, seeded by the outlet. */
export function nationalOutletName(input: {
  readonly seed: string;
  readonly outletId: string;
  readonly words: readonly string[];
  readonly prefix: string;
  readonly suffix: string;
  readonly taken: ReadonlySet<string>;
}): string {
  const rng = new SeededRng(input.seed).fork(`press-name:${input.outletId}`);
  for (let attempt = 0; ; attempt += 1) {
    const name = `${input.prefix}${rng.fork(String(attempt)).pick(input.words)}${input.suffix}`;
    if (!input.taken.has(name)) return name;
  }
}

export interface StaffRow {
  /** The person's id. */
  readonly id: PersonId;
  readonly outletId: string;
  readonly role: StaffRole;
  readonly jobId: string | null;
  readonly hiredOn: string;
  /** An owner given a household cost at hire, which they spend out of each week through this date. */
  readonly livedThrough?: string;
  /** When they left the outlet (another job, a move, death). */
  readonly leftOn?: string;
  /** Why: died, moved, layoff, quit, left-work, closure, left-job. */
  readonly leftBecause?: string;
}

/**
 * Generate one of an outlet's people: a named person of the role's age where
 * they live (the town, unless given), and for staff a job on the outlet's
 * payroll at the role's pay. An owner holds the outlet and draws no pay.
 */
export function hireStaffMember(
  api: CoreAPI,
  input: {
    readonly outletId: string;
    readonly organizationId: string;
    readonly role: RoleRow;
    readonly index: number;
    readonly townPlaceId: string;
    readonly stateKey: string;
    /** Where they live, when not the town (a station group's owner). */
    readonly livesAt?: string;
    readonly parameter: (key: string) => number;
    readonly source: Source;
  },
): StaffRow {
  const core = api.state as CoreState;
  const key = `press:${input.outletId}:${input.role.id}:${input.index}`;
  const rng = new SeededRng(core.seed).fork(key);
  const gender = generatePersonIdentity(rng.fork("gender")).gender;
  const min = input.parameter(input.role.ageMinParameter);
  const max = input.parameter(input.role.ageMaxParameter);
  const birthDate = addDays(
    makeIsoDate(core.date),
    -rng
      .fork("birth")
      .integer(Math.round(min * 365.25), Math.round(max * 365.25)),
  );
  const usps = input.stateKey.slice(input.stateKey.lastIndexOf("-") + 1);
  const corpus = getNameCorpus(
    nameCorpusVersionForPlace(usps, PLACE_NAMES_V1_VERSION),
  );
  let givenName = "";
  let familyName = "";
  for (let attempt = 0; ; attempt += 1) {
    const names = rng.fork(`name:${attempt}`);
    givenName =
      (gender === "female" || gender === "male"
        ? drawCohortGivenName(names, gender, Number(birthDate.slice(0, 4)))
        : null) ??
      names.pick(
        givenNamePoolForCorpus(
          corpus,
          gender === "female" || gender === "male" ? gender : "nonbinary",
        ),
      );
    familyName = names.pick(corpus.familyNames);
    if (!isRealOfficeholderName(givenName, familyName)) break;
  }
  const id = `person:press:${input.outletId}:${input.role.id}:${input.index}`;
  const home = input.livesAt ?? input.townPlaceId;
  // A person who lives in the town is one of the town's own wider population,
  // filled in with the household the records already give them: a home, rent,
  // kin. The first of the town's jobless adults of the role's age in id order, so
  // the same person comes back every time.
  const resident =
    home === input.townPlaceId && input.role.payParameter !== null
      ? townResident(core, input.townPlaceId, min, max)
      : undefined;
  if (resident) {
    const person = fillInPerson(core, resident);
    return seatStaff(api, input, key, person.id);
  }
  const minorPerDollar = parameter("minorPerDollar", core.data.parameters);
  const neighbor =
    home === input.townPlaceId
      ? [...(core.peopleByPlace.get(input.townPlaceId) ?? [])]
          .map((pid) => core.people.get(pid))
          .find((p) => p?.alive && p.countyId)
      : undefined;
  // stopgapId: SG-PEOPLE-press-staff-households
  api.stopgap("SG-PEOPLE-press-staff-households");
  fillInIdentity(core, {
    id,
    givenName,
    familyName,
    birthDate,
    placeId: home,
    ...(neighbor?.countyId ? { countyId: neighbor.countyId } : {}),
    gender: gender === "female" || gender === "male" ? gender : "nonbinary",
    // The town's own cadence, as its neighbors live.
    ...(neighbor?.tier ? { tier: neighbor.tier } : {}),
    // What a family at their pay keeps in its accounts (SCF 2022), as the
    // town's generated residents do; later hires arrive with what they have.
    ...(input.role.payParameter && core.date === core.startedAt
      ? {
          openingLiquidMinor: Math.round(
            medianTransactionBalance(
              input.parameter(input.role.payParameter) / minorPerDollar,
            ) * minorPerDollar,
          ),
        }
      : {}),
    source: input.source,
  } as Parameters<typeof fillInIdentity>[1]);
  return seatStaff(api, input, key, id);
}

/**
 * A jobless adult of the role's age among the town's counted residents, taken
 * first in id order (the ids are the world's seeded hashes); undefined when
 * the town has none left.
 */
export function townResident(
  core: CoreState,
  townPlaceId: string,
  minAge: number,
  maxAge: number,
): PersonId | undefined {
  const today = Date.parse(core.date);
  const rows = countedResidents(core).filter((voter) => {
    if (voter.placeId !== townPlaceId || voter.weeklyMinutes > 0) return false;
    const age = (today - Date.parse(voter.birthDate)) / (365.25 * 86_400_000);
    return age >= minAge && age <= maxAge;
  });
  return rows[0]?.id;
}

function seatStaff(
  api: CoreAPI,
  input: Parameters<typeof hireStaffMember>[1],
  key: string,
  id: PersonId,
): StaffRow {
  const core = api.state as CoreState;
  const home = input.livesAt ?? input.townPlaceId;
  const pay = input.role.payParameter;
  // A national outlet's people sit outside the town's economy: the shared
  // payroll path finds no schedule there to follow, and they go unpaid.
  // stopgapId: SG-PEOPLE-press-national-payroll
  if (home !== input.townPlaceId)
    api.stopgap("SG-PEOPLE-press-national-payroll");
  // Only people living in the town hold a job on the town's payroll path.
  const jobId =
    pay && home === input.townPlaceId
      ? startPublicJob(api, {
          personId: id,
          employerId: input.organizationId,
          post: key,
          title: input.role.title,
          hourlyMinor: Math.round(
            input.parameter(pay) / input.parameter("fullTimeHoursPerYear"),
          ),
          citation: input.source.citation,
        })
      : null;
  // An owner holds the outlet and is on no payroll, so nothing gives them a
  // household: a wealthy owner's cost and savings, at the income the press
  // parameters set, with the savings paid in from outside.
  const lives =
    !pay &&
    giveLivingCost(api, {
      personId: id,
      stateKey: input.stateKey,
      annualMinor: input.parameter("ownerHouseholdIncomeMinor"),
      governmentKey: input.stateKey,
    });
  return {
    id,
    outletId: input.outletId,
    role: input.role.id,
    jobId,
    hiredOn: core.date,
    ...(lives ? { livedThrough: core.date } : {}),
  };
}
