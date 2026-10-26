/**
 * The governments behind the town on day one, as the past reads them: its
 * offices and seats, who holds them, each holder's lean and stance on a
 * question, and a named identity for someone who held a seat before them.
 */
import { drawOfficialIdentity } from "./officials-identity";
import { memberSupportAt } from "./officials-roster";
import { questionAxis } from "./campaign-views";
import {
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  leanOf,
  members,
} from "./modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { officialOf, officialStance } from "./modules/officials";
import type { OfficeInput } from "./offices-local";
import type { CoreAPI } from "./types";
import { pastParameter } from "./past-module";

export interface PastTown {
  readonly seed: string;
  readonly opening: string;
  readonly townPlaceId: string;
  readonly stateKey: string;
  readonly usps: string;
}

export function pastTown(api: CoreAPI, seed: string): PastTown {
  const loaded = api
    .moduleState(OFFICES_MODULE_ID)
    .table("loaded")
    .get("town") as unknown as { stateKey: string; townPlaceId: string };
  return {
    seed,
    opening: api.state.date,
    townPlaceId: loaded.townPlaceId,
    stateKey: loaded.stateKey,
    usps: loaded.stateKey.split("-").at(-1)!,
  };
}

export type PastOffice = OfficeInput;

export function townOffices(api: CoreAPI): readonly PastOffice[] {
  return (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .rows() as unknown as PastOffice[]
  ).filter((office) => office.coversTown);
}

/** Lawmaking chambers, by office kind. */
export const CHAMBER_KINDS = new Set([
  "council",
  "county-board",
  "legislature-lower",
  "legislature-upper",
  "us-house",
  "us-senate",
]);

/** The office that signs a level's laws, by level. */
export const SIGNER_KINDS: Readonly<Record<string, string>> = {
  federal: "president",
  state: "governor",
  city: "mayor",
};

/**
 * Who sits in a chamber: Congress as a whole for the federal chambers (its
 * roll calls count every member), else every seat of the office.
 */
export function chamberMembers(
  api: CoreAPI,
  office: PastOffice,
): readonly TermRow[] {
  const id =
    office.kind === "us-house"
      ? FEDERAL_HOUSE
      : office.kind === "us-senate"
        ? FEDERAL_SENATE
        : office.id;
  return members(api, id).filter(
    (term) => term.personId && api.state.people.has(term.personId),
  );
}

/** A chamber's seat count: its members, or the office's seats when fewer are held. */
export function chamberSeats(
  api: CoreAPI,
  office: PastOffice,
  held: number,
): number {
  if (office.kind === "us-house" || office.kind === "us-senate")
    return Math.max(
      held,
      pastParameter(
        api,
        office.kind === "us-house" ? "pastUsHouseSeats" : "pastUsSenateSeats",
      ),
    );
  return Math.max(held, office.seats);
}

/** A member's support for a question's "yes": their own stance, right positive. */
export function supportOn(
  api: CoreAPI,
  memberId: string,
  question: string,
): number {
  return (
    officialStance(api, memberId, question) ??
    memberSupportAt(leanOf(api, memberId), question)
  );
}

/** The lean of the seat a member holds, for the people who held it before them. */
export function seatLean(api: CoreAPI, memberId: string): number {
  const row = officialOf(api, memberId);
  return row ? row.districtLean : leanOf(api, memberId);
}

export function personName(api: CoreAPI, personId: string): string {
  const person = api.state.people.get(personId);
  return person ? `${person.givenName} ${person.familyName}` : personId;
}

/** A named person who held a seat or ran for it before day one, from the seed. */
export function pastIdentityName(
  town: PastTown,
  key: string,
  date: string,
): string {
  const identity = drawOfficialIdentity({
    worldSeed: town.seed,
    seatKey: `past:${key}`,
    stateUsps: town.usps,
    role: "campaign-opponent",
    referenceDate: date,
  });
  return `${identity.givenName} ${identity.familyName}`;
}

/** Questions a body can vote on: the catalog's for its level, with a direction. */
export function questionsWithAxis(
  questions: Iterable<string>,
): readonly string[] {
  return [...new Set(questions)].filter((q) => questionAxis(q) !== 0);
}
