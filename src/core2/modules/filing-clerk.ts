/**
 * Who takes a filing: the person at the counter of the office a contest files
 * with. The records that name one are read, never invented: a town's clerk is
 * the department head its council or mayor appointed (a payroll job on the
 * town's treasury), a county's clerk is the person its county government's
 * public record lists under a clerk title, and a place that elects a clerk,
 * registrar or election administrator has that holder in its offices. A
 * contest filed with a state or federal office has no counter in the town, so
 * no one is named.
 */
import type { CoreAPI, CoreState } from "../types";
import { townSeats } from "./offices";
import { lawChain } from "./laws";
import {
  agencyHeadsIn,
  appointmentsIn,
  ELECTION_CHIEF_POST,
  EXECUTIVE_MODULE_ID,
} from "./executive";
import {
  ELECTIONS_MODULE_ID,
  filingOfficeFor,
  type ContestRow,
} from "./elections";

/** The elected offices whose holder is the clerk at a filing counter. */
const CLERK_SEAT_KINDS: ReadonlySet<string> = new Set([
  "county-clerk",
  "municipal-clerk",
  "registrar",
  "election-administrator",
]);
/** The town department post that keeps the town's clerk. */
export const TOWN_CLERK_POST = "city-clerk";
/** A county government's staff row is a clerk's by its recorded title. */
const CLERK_TITLE = /clerk/i;

export interface FilingClerk {
  readonly personId: string;
  readonly title: string;
  /** How the records name them: an elected seat, a town appointment or county staff. */
  readonly basis:
    "elected-seat" | "town-appointment" | "county-staff" | "state-appointment";
  /** The record that names them: the seat id, the appointment id or the staff job id. */
  readonly recordId: string;
}

const living = (core: CoreState, personId: string | null | undefined) =>
  !!personId && core.people.get(personId)?.alive === true;

/** The office a state or federal contest files with, when the place's rules name the secretary of state. */
const SECRETARY_OF_STATE_OFFICE = /secretary of state/i;
const SECRETARY_OF_STATE_POST = "secretary-of-state";

/**
 * A state or federal contest files with the state's election office. Where
 * that office is the secretary of state, the clerk is the person holding it
 * (elected, or the governor's appointee); a board, commission or division has
 * no one person to name.
 */
function stateClerkFor(api: CoreAPI, contest: ContestRow): FilingClerk | null {
  const core = api.state as CoreState;
  if (
    !SECRETARY_OF_STATE_OFFICE.test(filingOfficeFor(api, contest.id).filedWith)
  )
    return stateElectionChief(api);
  const seat = townSeats(api).find(
    (row) =>
      row.office.kind === SECRETARY_OF_STATE_POST &&
      living(core, row.holder?.personId),
  );
  if (seat?.holder?.personId)
    return {
      personId: seat.holder.personId,
      title: seat.office.title,
      basis: "elected-seat",
      recordId: seat.seat.id,
    };
  const appointment = api.state.modules.has(EXECUTIVE_MODULE_ID)
    ? appointmentsIn(api, lawChain(api).stateKey).find(
        (row) =>
          row.post === SECRETARY_OF_STATE_POST && living(core, row.holderId),
      )
    : undefined;
  return appointment
    ? {
        personId: appointment.holderId,
        title: appointment.title,
        basis: "state-appointment",
        recordId: appointment.id,
      }
    : stateElectionChief(api);
}

/** The head of the state's election agency, where the filing data names an agency and not an elected secretary of state. */
function stateElectionChief(api: CoreAPI): FilingClerk | null {
  if (!api.state.modules.has(EXECUTIVE_MODULE_ID)) return null;
  const chief = agencyHeadsIn(api, lawChain(api).stateKey).find(
    (row) =>
      row.post === ELECTION_CHIEF_POST &&
      living(api.state as CoreState, row.holderId),
  );
  return chief
    ? {
        personId: chief.holderId,
        title: chief.title,
        basis: "state-appointment",
        recordId: chief.id,
      }
    : null;
}

/**
 * The clerk who takes filings for one contest, or null where the records name
 * no one (a state or federal filing, or a place whose records list no clerk).
 */
export function filingClerkFor(
  api: CoreAPI,
  contestId: string,
): FilingClerk | null {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return null;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow | undefined;
  if (!contest) return null;
  if (contest.family !== "municipalOffice" && contest.family !== "countyOffice")
    return stateClerkFor(api, contest);
  return localClerkFor(api, contest.family);
}

/**
 * The town's clerk (`municipalOffice`) or the county's (`countyOffice`), from
 * the records that name one, or null where they name no one. The same clerk
 * takes the place's filings and keeps its council's or board's papers.
 */
export function localClerkFor(
  api: CoreAPI,
  family: "municipalOffice" | "countyOffice",
): FilingClerk | null {
  const core = api.state as CoreState;
  const municipal = family === "municipalOffice";
  const county = family === "countyOffice";

  // A clerk the place elects.
  for (const row of townSeats(api)) {
    if (!CLERK_SEAT_KINDS.has(row.office.kind)) continue;
    const kindIsMunicipal = row.office.kind === "municipal-clerk";
    const kindIsCounty = row.office.kind === "county-clerk";
    if ((kindIsMunicipal && !municipal) || (kindIsCounty && !county)) continue;
    const holder = row.holder?.personId;
    if (holder && living(core, holder))
      return {
        personId: holder,
        title: row.office.title,
        basis: "elected-seat",
        recordId: row.seat.id,
      };
  }

  if (municipal && api.state.modules.has(EXECUTIVE_MODULE_ID)) {
    const appointment = appointmentsIn(api, lawChain(api).townPlaceId).find(
      (row) => row.post === TOWN_CLERK_POST && living(core, row.holderId),
    );
    if (appointment)
      return {
        personId: appointment.holderId,
        title: appointment.title,
        basis: "town-appointment",
        recordId: appointment.id,
      };
  }

  if (county) {
    // The county government's own record: the person listed under a clerk's
    // title, in the county the town's residents live in.
    const counties = new Set(
      [...(core.peopleByPlace.get(lawChain(api).townPlaceId) ?? [])]
        .map((id) => core.people.get(id)?.countyId)
        .filter((id): id is NonNullable<typeof id> => !!id),
    );
    for (const placeId of [...counties].sort())
      for (const orgId of [
        ...(core.publicOrganizationsByPlace.get(placeId) ?? []),
      ].sort()) {
        const staff = core.publicOrganizations
          .get(orgId)
          ?.staff?.find(
            (row) => CLERK_TITLE.test(row.title) && living(core, row.personId),
          );
        if (staff)
          return {
            personId: staff.personId,
            title: staff.title,
            basis: "county-staff",
            recordId: staff.jobId,
          };
      }
  }
  return null;
}
