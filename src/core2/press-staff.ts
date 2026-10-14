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
import { SeededRng } from "../simulation/rng";
import { addDays, makeIsoDate } from "../simulation/dates";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { generatePersonIdentity } from "./gov-rules/person-identity";
import { drawCohortGivenName } from "./gov-rules/given-name-cohorts";
import {
  getNameCorpus,
  givenNamePoolForCorpus,
  nameCorpusVersionForPlace,
  PLACE_NAMES_V1_VERSION,
} from "./gov-rules/names-data";
import { isRealOfficeholderName } from "./officials-names";
import { fillInIdentity } from "./state";
import { startPublicJob } from "./public-payroll";
import staffJson from "./data/press/staff.json" with { type: "json" };
import mastheadsJson from "./data/press/mastheads.json" with { type: "json" };
import type { CoreAPI, CoreState, PersonId, Source } from "./types";

export type StaffRole = "head" | "reporter";

interface RoleRow {
  readonly id: StaffRole;
  readonly soc: string;
  readonly title: string;
  readonly payParameter: string;
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
      const town =
        lifePlaceByJurisdictionId(input.townPlaceId as never)?.displayName ??
        "";
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

export interface StaffRow {
  /** The person's id. */
  readonly id: PersonId;
  readonly outletId: string;
  readonly role: StaffRole;
  readonly jobId: string | null;
  readonly hiredOn: string;
}

/**
 * Generate and hire one member of an outlet's staff: a named person of the
 * role's working age in the town, on the outlet's payroll at the role's pay.
 * Returns the person's id.
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
  const neighbor = [...(core.peopleByPlace.get(input.townPlaceId) ?? [])]
    .map((pid) => core.people.get(pid))
    .find((p) => p?.alive && p.countyId);
  // stopgapId: SG-PEOPLE-press-staff-households
  api.stopgap("SG-PEOPLE-press-staff-households");
  fillInIdentity(core, {
    id,
    givenName,
    familyName,
    birthDate,
    placeId: input.townPlaceId,
    ...(neighbor?.countyId ? { countyId: neighbor.countyId } : {}),
    gender: gender === "female" || gender === "male" ? gender : "nonbinary",
    // The town's own cadence, as its neighbors live.
    ...(neighbor?.tier ? { tier: neighbor.tier } : {}),
    source: input.source,
  } as Parameters<typeof fillInIdentity>[1]);
  const annual = input.parameter(input.role.payParameter);
  const jobId = startPublicJob(api, {
    personId: id,
    employerId: input.organizationId,
    post: key,
    title: input.role.title,
    hourlyMinor: Math.round(annual / input.parameter("fullTimeHoursPerYear")),
    citation: input.source.citation,
  });
  return {
    id,
    outletId: input.outletId,
    role: input.role.id,
    jobId,
    hiredOn: core.date,
  };
}
