import { incompatibleOffices } from "../office-incompatibility";
/**
 * Offices and seats: every office that covers the town, every seat in it, and
 * the person holding each one, from day one.
 *
 * Federal (president, vice president, the state's senators, every House seat
 * of the state), state (governor and statewide offices, both chambers with
 * every seat) and local (city, town or township, county). Other states' seats
 * are created the first time anything reads them (`officesOfState`), from the
 * world seed, so they are the same every time and cost nothing until used.
 *
 * Holders: a local seat is held by a resident of the town. Among residents old
 * enough for the office, the ones whose traits suit public life most
 * (sociability, sense of duty, reliability) hold the seats at the opening;
 * this is generation of who exists, not a decision anyone makes. A state or
 * federal seat is held by a named official: a stable identity from the world
 * seed and the seat, with the party that really holds the seat, filled in as
 * a full person by CORE's fill-in (stand-in until then:
 * SG-GOV-official-identity-only).
 *
 * Vacancies: a holder's death (`life.death`), move out of the office's
 * jurisdiction (`person.moved-away`), resignation or removal opens a vacancy
 * filled by the office's real rule: a successor in line takes the
 * office; an appointment is made by the appointing authority; a special
 * election is put on the calendar (stand-in until M2's elections:
 * SG-GOV-special-election-appointee).
 */
import { registerElectorate } from "../electorate";
import { partyName } from "../appointments";
import { decisionLean } from "../trait-decisions";
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import municipalBaseline from "../../../data/municipal-elections/92O-national-state-baseline.json" with { type: "json" };
import { corePlaceByJurisdictionId, corePlaceByKey } from "../place-lookup";
import { governmentUnit } from "../reference/government-units";
import type { EntityId } from "../kernel/brands";
import {
  electionInYear,
  specialElectionDate,
  staggeredSeatElection,
  termStartAfter,
  termStartInYear,
} from "../elections-calendar";
import { MOVED_AWAY_EVENT } from "./moves";
import { localOfficesForPlace, type OfficeInput } from "../offices-local";
import {
  federalOffices,
  stateOffices,
  type OfficeWithSeats,
  type SeatInput,
  type VacancyRule,
} from "../offices-state";
import { drawOfficialIdentity } from "../officials-identity";
import { createHash } from "node:crypto";
import tenure from "../data/offices/tenure.json" with { type: "json" };
import { novemberGeneralElectionDay } from "../gov-rules/town-election-calendar";
import { POLICY_QUESTIONS } from "../policy-answers";
import reachA from "../data/laws/reach-group-a-parameters.json" with { type: "json" };
import { isRealOfficeholderName } from "../officials-names";
import { pressConflict } from "../press-conflict";

export const OFFICES_MODULE_ID = "core2-offices-v1";

export interface TermRow {
  readonly id: string;
  readonly seatId: string;
  readonly officeId: string;
  /** A town resident's person id, or null for a named official not yet filled in. */
  readonly personId: string | null;
  readonly identity: {
    readonly givenName: string;
    readonly familyName: string;
    readonly gender: string;
    readonly birthDate: string;
    readonly homeState: string;
  };
  readonly party: string | null;
  readonly startDate: string;
  /** When the holder's unbroken service in this seat began (seniority). */
  readonly serviceStart?: string;
  /** When the term ends; null where the office's term isn't read. */
  readonly endDate: string | null;
  readonly endEstimated: boolean;
  /** How the holder reached the seat. */
  readonly reached: string;
  readonly status: "serving" | "ended";
  readonly endedBy?: string;
  /**
   * The election that seated the holder, for terms the world opened with
   * (history before the start): its date and the winner's estimated share.
   */
  readonly elected?: { readonly date: string; readonly share: number };
}

export interface VacancyRow {
  readonly id: string;
  readonly seatId: string;
  readonly officeId: string;
  readonly since: string;
  readonly cause: string;
  readonly rule: VacancyRule;
  readonly status: "open" | "filled" | "awaiting-election";
  readonly filledBy?: string;
  readonly electionDate?: string;
}

export const OFFICES_MODULE: CoreModule = {
  id: OFFICES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      offices: {
        indexes: {
          byJurisdiction: { fields: ["jurisdiction"] },
          byTown: { fields: ["coversTown"] },
        },
      },
      seats: { indexes: { byOffice: { fields: ["officeId"] } } },
      terms: {
        indexes: {
          bySeatStatus: { fields: ["seatId", "status"] },
          byPerson: { fields: ["personId"] },
          byStatus: { fields: ["status"] },
        },
      },
      vacancies: { indexes: { byStatus: { fields: ["status"] } } },
      incompatibilities: {},
      loaded: {},
    },
  },
  eventKinds: ["life.death", MOVED_AWAY_EVENT, "took-office"],
  onEvent: (api, event) => {
    if (event.kind === "took-office") {
      const seatId = event.facts?.seatId;
      if (seatId)
        for (const personId of event.personIds)
          enforceIncompatibility(api, personId, seatId);
      return;
    }
    for (const personId of event.personIds)
      for (const term of servingTermsOf(api, personId)) {
        if (event.kind === "life.death") vacateSeat(api, term.seatId, "death");
        else if (
          !livesWithin(
            api,
            term.officeId,
            event.facts?.[`person:${personId}:residence`] ?? event.topic,
          )
        )
          vacateSeat(api, term.seatId, "moved away");
      }
  },
  onCalendarWork: officesCalendarWork,
};

const source = (citation: string, date: string, estimate: boolean): Source =>
  estimate
    ? { tag: "ESTIMATED", citation, asOf: date, estimatedFrom: citation }
    : { tag: "SOURCED", citation, asOf: date };

function table(api: CoreAPI, name: string) {
  return api.moduleState(OFFICES_MODULE_ID).table(name);
}

/** A new mandate vacates only offices the law makes incompatible. */
export function enforceIncompatibility(
  api: CoreAPI,
  personId: string,
  seatId: string,
): void {
  const terms = servingTermsOf(api, personId);
  const acquired = terms.find((term) => term.seatId === seatId);
  if (!acquired) return;
  const office = table(api, "offices").get(
    acquired.officeId,
  ) as unknown as OfficeInput;
  const loaded = table(api, "loaded").get("town") as unknown as {
    stateKey: string;
  };
  for (const term of terms) {
    if (term.seatId === seatId) continue;
    const previous = table(api, "offices").get(
      term.officeId,
    ) as unknown as OfficeInput;
    const law = incompatibleOffices(previous, office, loaded.stateKey);
    if (!law) continue;
    if (law.tag === "ESTIMATED") api.stopgap("SG-GOV-dual-office-law");
    table(api, "incompatibilities").put({
      id: `incompatible:${term.id}:${acquired.id}`,
      personId,
      previousTermId: term.id,
      acceptedTermId: acquired.id,
      date: api.state.date,
      law,
    } as unknown as ModuleRow);
    vacateSeat(api, term.seatId, "accepted incompatible office");
  }
}

function servingTermsOf(api: CoreAPI, personId: string): readonly TermRow[] {
  return (
    table(api, "terms").query("byPerson", [personId]) as unknown as TermRow[]
  ).filter((term) => term.status === "serving");
}

/**
 * Whether a holder who moved to `destination` (a county or state
 * jurisdiction) still lives where the office serves: a state or
 * congressional office within its state, a county office within its county.
 * A city, town or township office is left by moving out of town, and the
 * presidency is never left by a move.
 */
function livesWithin(
  api: CoreAPI,
  officeId: string,
  destination: string | undefined,
): boolean {
  const office = table(api, "offices").get(officeId) as unknown as
    OfficeInput | undefined;
  if (!office || office.jurisdiction === "US") return true;
  const to = destination
    ? corePlaceByJurisdictionId(destination as EntityId)
    : null;
  if (!to) return false;
  if (office.level === "federal" || office.level === "state")
    return (to.stateJurisdictionKey ?? to.key) === office.jurisdiction;
  if (office.level === "county") {
    const county = governmentUnit(office.jurisdiction)?.countyGeoid;
    return !!county && to.key === `county:${county}`;
  }
  return false;
}

/**
 * The end of the term in progress at the opening: the start of the term won
 * at the seat's next regular election on its office's own calendar (the
 * county's or the state's municipal election law), so every term ends with an
 * election already held for it. Seats of a body take turns over the years in
 * one term the calendar holds elections. Estimated until each seat's own
 * cycle is read (SG-GOV-term-end-estimate).
 */
function termEnd(
  api: CoreAPI,
  office: OfficeInput,
  seat: SeatInput,
  date: string,
): string | null {
  if (!office.termYears) return null;
  const town = table(api, "loaded").get("town") as unknown as
    { stateKey: string; geoid: string } | undefined;
  const where = {
    office,
    stateKey: office.jurisdiction.startsWith("US-")
      ? office.jurisdiction
      : (town?.stateKey ?? ""),
    placeGeoid: town?.geoid ?? "",
  };
  const year = seat.electionYear ?? office.nextElectionYear;
  const election =
    year !== undefined
      ? // Asked from the year before: a spring election's filing can close
        // in the winter before its year.
        electionInYear({ ...where, year, onDate: `${year - 1}-07-01` })
      : staggeredSeatElection({ ...where, onDate: date, index: seat.index });
  if (election) return termStartAfter(office, election.electionDate);
  const starts = office.termStarts ?? "01-01";
  if (year !== undefined) return `${year + 1}-${starts}`;
  const offset = seat.index % Math.max(1, office.termYears);
  return `${Number(date.slice(0, 4)) + offset + 1}-${starts}`;
}

function municipalVacancyRule(stateUsps: string): VacancyRule {
  const row = (
    municipalBaseline as {
      jurisdictions: {
        usps: string;
        vacancyRule?: string;
        vacancyCitation?: string;
      }[];
    }
  ).jurisdictions.find((j) => j.usps === stateUsps);
  const text = row?.vacancyRule ?? "";
  return {
    method:
      /special/.test(text) && !/appoint/.test(text)
        ? "special-election"
        : "appointment",
    appointedBy: "the governing body",
    ...(row?.vacancyCitation ? { citation: row.vacancyCitation } : {}),
    source:
      "data/municipal-elections/92O-national-state-baseline.json (state general law; a charter may differ)",
    estimate: true,
  };
}

/** Residents who could hold a local seat, best suited first. */
function suitedResidents(
  api: CoreAPI,
  date: string,
  taken: ReadonlySet<string>,
  townPlaceId: string,
) {
  const year = Number(date.slice(0, 4));
  return [...(api.state as CoreState).people.values()]
    .filter((person) => {
      // Someone who moved away (an inactive record) lives elsewhere now; a
      // state's or another place's official lives there, not here.
      if (
        !person.alive ||
        person.tier === "husk" ||
        person.placeId !== townPlaceId ||
        taken.has(person.id)
      )
        return false;
      // Officeholders are fictional: a resident who happens to share a real
      // officeholder's full name does not hold a seat.
      if (isRealOfficeholderName(person.givenName, person.familyName))
        return false;
      // The stand-in that seats a vacant office without an election does not
      // pick by press job (a reporter put into an empty seat at the opening
      // was the defect); they may still run and win it at the ballot.
      if (pressConflict(api, person.id)) return false;
      const age = year - Number(person.birthDate.slice(0, 4));
      return age >= 25 && age < 81;
    })
    .map((person) => ({
      person,
      fit:
        (person.traits["people-mind-v1:sociability"] ?? 0) +
        (person.traits["personality-v1:facet-duty-bound"] ?? 0) +
        (person.traits["people-mind-v1:reliability"] ?? 0),
    }))
    .sort((a, b) => b.fit - a.fit || a.person.id.localeCompare(b.person.id));
}

function freshTermId(api: CoreAPI, seatId: string, date: string): string {
  const base = `term:${seatId}:${date}`;
  let id = base;
  for (let n = 2; table(api, "terms").get(id); n += 1) id = `${base}:${n}`;
  return id;
}

function putOffice(api: CoreAPI, entry: OfficeWithSeats): void {
  table(api, "offices").put(entry.office as unknown as ModuleRow);
  for (const seat of entry.seats)
    table(api, "seats").put(seat as unknown as ModuleRow);
}

function seatNamedOfficial(
  api: CoreAPI,
  worldSeed: string,
  office: OfficeInput,
  seat: SeatInput,
  date: string,
  reached: string,
): TermRow {
  const stateUsps = office.jurisdiction.startsWith("US-")
    ? office.jurisdiction.slice(3)
    : "US";
  const role = /legislature|us-house|us-senate/.test(office.kind)
    ? "sitting-legislator-at-opening"
    : "executive-officeholder-at-opening";
  // A vice president isn't related to the president: no shared family name.
  const president =
    seat.id === "seat:US:vice-president"
      ? (
          table(api, "terms").query("bySeatStatus", [
            "seat:US:president",
            "serving",
          ]) as unknown as TermRow[]
        )[0]
      : undefined;
  const identity = drawOfficialIdentity({
    worldSeed,
    seatKey: seat.id,
    stateUsps,
    role,
    referenceDate: date,
    ...(president ? { avoidFamilyNames: [president.identity.familyName] } : {}),
    ...(role === "sitting-legislator-at-opening"
      ? {
          legalMinimumAge:
            office.kind === "us-senate"
              ? 30
              : office.kind.startsWith("us-house")
                ? 25
                : 21,
        }
      : {}),
  });
  // stopgapId: SG-GOV-official-identity-only
  api.stopgap("SG-GOV-official-identity-only");
  const term: TermRow = {
    id: freshTermId(api, seat.id, date),
    seatId: seat.id,
    officeId: office.id,
    personId: null,
    identity: {
      givenName: identity.givenName,
      familyName: identity.familyName,
      gender: identity.gender,
      birthDate: identity.birthDate,
      homeState: office.jurisdiction,
    },
    party: partyName(seat.party),
    startDate: date,
    endDate: termEnd(api, office, seat, date),
    endEstimated: true,
    reached,
    status: "serving",
  };
  table(api, "terms").put(term as unknown as ModuleRow);
  return term;
}

function seatResident(
  api: CoreAPI,
  office: OfficeInput,
  seat: SeatInput,
  personId: string,
  date: string,
  reached: string,
): TermRow {
  const person = api.state.people.get(personId)!;
  const term: TermRow = {
    id: freshTermId(api, seat.id, date),
    seatId: seat.id,
    officeId: office.id,
    personId,
    identity: {
      givenName: person.givenName,
      familyName: person.familyName,
      gender: "recorded",
      birthDate: person.birthDate,
      homeState: office.jurisdiction,
    },
    party: partyName(seat.party),
    startDate: date,
    endDate: termEnd(api, office, seat, date),
    endEstimated: true,
    reached,
    status: "serving",
  };
  table(api, "terms").put(term as unknown as ModuleRow);
  return term;
}

/** Register the module and seat every office covering the town. */
export function openOffices(core: CoreState, worldSeed: string): void {
  registerElectorate(core);
  if (!core.modules.has(OFFICES_MODULE_ID))
    registerModule(core, OFFICES_MODULE);
  const api = coreAPI(core);
  const placeKey = api.state.placeMetadata.placeKey;
  const place = placeKey ? corePlaceByKey(placeKey) : null;
  if (!place?.stateJurisdictionKey)
    throw new Error("Offices need the town's place and state.");
  const stateKey = place.stateJurisdictionKey;
  const geoid = place.sourceGeoid ?? place.key;
  const date = core.date;
  // stopgapId: SG-GOV-term-end-estimate
  api.stopgap("SG-GOV-term-end-estimate");
  table(api, "loaded").put({
    id: "town",
    stateKey,
    geoid,
    worldSeed,
    townPlaceId: place.context.jurisdiction.id,
  });
  for (const entry of [
    ...federalOffices(stateKey, geoid, date),
    ...stateOffices(stateKey, geoid, date),
  ]) {
    putOffice(api, entry);
    for (const seat of entry.seats)
      pastTerms(
        api,
        worldSeed,
        entry.office,
        seat,
        seatNamedOfficial(
          api,
          worldSeed,
          entry.office,
          seat,
          date,
          "in office at the opening",
        ),
      );
  }
  table(api, "loaded").put({ id: `state:${stateKey}` });
  recordInauguration(api, place.context.jurisdiction.id);
  const rule = municipalVacancyRule(stateKey.slice(3));
  const taken = new Set<string>();
  for (const office of localOfficesForPlace(placeKey!)) {
    const seats: SeatInput[] = Array.from(
      { length: office.seats },
      (_, index) => ({
        id: `seat:${office.id.slice("office:".length)}:${index}`,
        officeId: office.id,
        // A council's ward seats are numbered; its other seats are at large.
        district:
          office.districted && index < (office.wardSeats ?? office.seats)
            ? String(index + 1)
            : null,
        index,
        coversTown: true,
        party: null,
      }),
    );
    putOffice(api, { office: { ...office, vacancyRule: rule }, seats });
    if (!office.elected) continue;
    const residents = suitedResidents(
      api,
      date,
      taken,
      place.context.jurisdiction.id,
    );
    for (const [index, seat] of seats.entries()) {
      const holder = residents[index];
      if (holder) taken.add(holder.person.id);
      // A town with too few named residents for every seat has a named
      // official in the rest, as a vacancy with no resident to fill it does.
      pastTerms(
        api,
        worldSeed,
        office,
        seat,
        holder
          ? seatResident(
              api,
              office,
              seat,
              holder.person.id,
              date,
              "in office at the opening",
            )
          : seatNamedOfficial(
              api,
              `${worldSeed}:${date}`,
              office,
              seat,
              date,
              "in office at the opening",
            ),
      );
    }
  }
}

/**
 * Inauguration Day (U.S. Const. amend. XX, § 1): when the world opens on the
 * day the president's and vice president's terms begin, their taking office
 * is a public record on day one. Nothing else follows from it.
 */
function recordInauguration(api: CoreAPI, townPlaceId: string): void {
  const date = api.state.date;
  const began = ["seat:US:president", "seat:US:vice-president"]
    .map(
      (seatId) =>
        (
          table(api, "terms").query("bySeatStatus", [
            seatId,
            "serving",
          ]) as unknown as TermRow[]
        )[0],
    )
    .filter((term): term is TermRow => term?.startDate === date);
  if (!began.length) return;
  api.emit({
    id: `inauguration:${date}`,
    date,
    kind: "inauguration",
    personIds: [],
    placeId: townPlaceId,
    source: {
      tag: "SOURCED",
      citation:
        "U.S. Const. amend. XX, § 1 (the president's and vice president's terms begin at noon on January 20); data/research/offices/federal-executive-2026.json",
      asOf: date,
    },
    publicRecord: true,
    facts: {
      officeIds: began.map((term) => term.officeId).join(" "),
      ...(began[0]!.party ? { party: began[0]!.party } : {}),
      ...(began[0]!.endDate ? { termEnds: began[0]!.endDate } : {}),
    },
  });
}

const TENURE = (
  tenure as unknown as { parameters: Record<string, { value: number }> }
).parameters;
const tenureYears = (key: string) => TENURE[key]!.value;
const shiftYears = (date: string, years: number) =>
  `${Number(date.slice(0, 4)) + years}${date.slice(4)}`;
const LEGISLATIVE = /^(council|county-board|legislature-)/;
const TERM_LIMITS =
  "us-policy-positions:government-operations.legislative-term-limits";

/**
 * The career behind a holder at the opening (M1-14 part 2): their current
 * term began a full term before it ends, and before it they won the seat
 * some number of times, recorded as ended terms. How many follows the mean
 * service of sitting officials of that kind (a geometric spread, drawn once
 * per seat from the world's seed: who exists, not what anyone decides), never
 * younger than the minimum age at the first term, and never past the state's
 * legislative term limit where it has one. The presidency keeps its real
 * record (`federal-executive-2026.json`).
 */
function pastTerms(
  api: CoreAPI,
  worldSeed: string,
  office: OfficeInput,
  seat: SeatInput,
  term: TermRow,
): void {
  const years = office.termYears;
  const opening = api.state.date;
  if (!years || !term.endDate) return;
  const start = termStartInYear(office, shiftYears(term.endDate, -years));
  // The federal executive keeps its real record: the current term began a
  // full term before it ends (January 20), with no earlier terms invented.
  if (office.kind === "president" || office.kind === "vice-president") {
    if (start <= opening)
      table(api, "terms").put({
        ...term,
        startDate: start,
        serviceStart: start,
      } as unknown as ModuleRow);
    return;
  }
  // A term read as ending more than a full term out began at the opening.
  if (start > opening) {
    table(api, "terms").put({
      ...term,
      serviceStart: term.startDate,
    } as unknown as ModuleRow);
    return;
  }
  const tenureKey =
    office.kind === "us-senate"
      ? "usSenateTenureYears"
      : office.kind.startsWith("us-house")
        ? "usHouseTenureYears"
        : office.kind.startsWith("legislature-")
          ? "stateLegislatorTenureYears"
          : office.level === "state"
            ? "statewideExecutiveTenureYears"
            : "localOfficialTenureYears";
  const mean = Math.max(0, tenureYears(tenureKey) / years - 0.5);
  const q = mean / (1 + mean);
  const hash = createHash("sha256")
    .update(`${worldSeed}:${seat.id}:career`)
    .digest("hex");
  const u = parseInt(hash.slice(0, 8), 16) / 0x1_0000_0000;
  let prior = q > 0 ? Math.floor(Math.log(1 - u) / Math.log(q)) : 0;
  // No one first served younger than the minimum age.
  const born = Number(term.identity.birthDate.slice(0, 4));
  const firstYear = (k: number) => Number(start.slice(0, 4)) - k * years;
  while (
    prior > 0 &&
    firstYear(prior) - born < tenureYears("minimumAgeAtFirstTerm")
  )
    prior -= 1;
  // A state that limits legislative terms caps the service before today.
  const state = (table(api, "loaded").get("town") as { stateKey?: string })
    ?.stateKey;
  if (
    LEGISLATIVE.test(office.kind) &&
    state &&
    POLICY_QUESTIONS[TERM_LIMITS]?.answers[state]?.answer === "yes"
  )
    prior = Math.max(
      0,
      Math.min(
        prior,
        Math.ceil(
          (
            reachA as unknown as {
              parameters: Record<string, { value: number }>;
            }
          ).parameters.termLimitYears!.value / years,
        ) - 2,
      ),
    );
  // Service begins where the earliest past term does (its start is snapped to
  // the office's own inauguration day), so the career has no gap.
  const serviceStart =
    prior > 0
      ? termStartInYear(office, shiftYears(start, -prior * years))
      : start;
  const won = (from: string) =>
    office.elected ? { elected: electionBehind(office, from) } : {};
  table(api, "terms").put({
    ...term,
    startDate: start,
    serviceStart,
    ...won(start),
  } as unknown as ModuleRow);
  for (let k = prior; k >= 1; k -= 1) {
    const from = termStartInYear(office, shiftYears(start, -k * years));
    table(api, "terms").put({
      ...term,
      id: `${term.id}:past:${k}`,
      startDate: from,
      serviceStart,
      endDate: termStartInYear(office, shiftYears(from, years)),
      reached: "elected",
      status: "ended",
      endedBy: "re-elected",
      ...won(from),
    } as unknown as ModuleRow);
  }
}

/**
 * The election that seated a term starting on a date: the general election
 * the November before a January start, else a local election some weeks
 * before; the winner's share is the average for that kind of office (an
 * estimate; the history only has to fit the world it opens).
 */
function electionBehind(
  office: OfficeInput,
  start: string,
): { date: string; share: number } {
  const year = Number(start.slice(0, 4));
  const date =
    start.slice(5, 7) <= "03"
      ? novemberGeneralElectionDay(year - 1)
      : new Date(
          Date.parse(`${start}T00:00:00Z`) -
            tenureYears("localElectionLeadDays") * 86_400_000,
        )
          .toISOString()
          .slice(0, 10);
  const key =
    office.kind === "us-senate"
      ? "usSenateWinnerShare"
      : office.kind.startsWith("us-house")
        ? "usHouseWinnerShare"
        : office.kind.startsWith("legislature-")
          ? "stateLegislatorWinnerShare"
          : office.level === "state" || office.level === "federal"
            ? "statewideExecutiveWinnerShare"
            : "localWinnerShare";
  return { date, share: tenureYears(key) };
}

/** A seat's elections before the start, oldest first (history to the opening). */
export function pastElections(
  api: CoreAPI,
  seatId: string,
): readonly {
  readonly termId: string;
  readonly date: string;
  readonly share: number;
  readonly party: string | null;
  readonly holder: string;
}[] {
  return ["serving", "ended"]
    .flatMap(
      (status) =>
        table(api, "terms").query("bySeatStatus", [
          seatId,
          status,
        ]) as unknown as TermRow[],
    )
    .filter((t) => t.elected)
    .map((t) => ({
      termId: t.id,
      date: t.elected!.date,
      share: t.elected!.share,
      party: t.party,
      holder: `${t.identity.givenName} ${t.identity.familyName}`,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Another state's offices, created the first time anything reads them. */
export function officesOfState(
  api: CoreAPI,
  stateKey: string,
): readonly OfficeInput[] {
  if (!table(api, "loaded").get(`state:${stateKey}`)) {
    const town = table(api, "loaded").get("town") as unknown as {
      worldSeed: string;
    };
    const date = api.state.date;
    for (const entry of [
      ...federalOffices(stateKey, "", date),
      ...stateOffices(stateKey, "", date),
    ]) {
      if (entry.office.jurisdiction === "US") continue;
      putOffice(api, {
        ...entry,
        office: { ...entry.office, coversTown: false },
        seats: entry.seats.map((s) => ({ ...s, coversTown: false })),
      });
      for (const seat of entry.seats)
        pastTerms(
          api,
          town.worldSeed,
          entry.office,
          seat,
          seatNamedOfficial(
            api,
            town.worldSeed,
            entry.office,
            seat,
            date,
            "in office at the opening",
          ),
        );
    }
    table(api, "loaded").put({ id: `state:${stateKey}` });
  }
  return table(api, "offices").query("byJurisdiction", [
    stateKey,
  ]) as unknown as OfficeInput[];
}

/** Each seat of the given offices with its current holder. */
export function seatsOfOffices(
  api: CoreAPI,
  offices: readonly OfficeInput[],
): readonly {
  readonly office: OfficeInput;
  readonly seat: SeatInput;
  readonly holder: TermRow | null;
}[] {
  const out = [];
  for (const office of offices)
    for (const seat of table(api, "seats").query("byOffice", [
      office.id,
    ]) as unknown as SeatInput[]) {
      const holder = (table(api, "terms").query("bySeatStatus", [
        seat.id,
        "serving",
      ])[0] ?? null) as TermRow | null;
      out.push({ office, seat, holder });
    }
  return out;
}

/** Every office whose seats cover the town, with each seat's current holder. */
export function townSeats(api: CoreAPI): readonly {
  readonly office: OfficeInput & { readonly vacancyRule: VacancyRule };
  readonly seat: SeatInput;
  readonly holder: TermRow | null;
}[] {
  const out = [];
  for (const office of table(api, "offices").query("byTown", [
    true,
  ]) as unknown as (OfficeInput & { vacancyRule: VacancyRule })[])
    for (const seat of table(api, "seats").query("byOffice", [
      office.id,
    ]) as unknown as SeatInput[]) {
      if (!seat.coversTown) continue;
      const holder = (table(api, "terms").query("bySeatStatus", [
        seat.id,
        "serving",
      ])[0] ?? null) as TermRow | null;
      out.push({ office, seat, holder });
    }
  return out;
}

/** End the seat's term and fill the vacancy the way the office's rule says. */
export function vacateSeat(
  api: CoreAPI,
  seatId: string,
  cause: string,
): VacancyRow | null {
  const term = table(api, "terms").query("bySeatStatus", [
    seatId,
    "serving",
  ])[0] as TermRow | undefined;
  if (!term) return null;
  const date = api.state.date;
  table(api, "terms").put({
    ...term,
    status: "ended",
    endDate: date,
    endEstimated: false,
    endedBy: cause,
  } as unknown as ModuleRow);
  const office = table(api, "offices").get(
    term.officeId,
  ) as unknown as OfficeInput & { vacancyRule: VacancyRule };
  const seat = table(api, "seats").get(seatId) as unknown as SeatInput;
  const vacancy: VacancyRow = {
    id: `vacancy:${seatId}:${date}`,
    seatId,
    officeId: office.id,
    since: date,
    cause,
    rule: office.vacancyRule,
    status: "open",
  };
  const citation =
    office.vacancyRule.citation ?? office.vacancyRule.source ?? office.source;
  api.emit({
    id: `seat-vacated:${seatId}:${date}`,
    date,
    kind: "seat-vacated",
    personIds: term.personId ? [term.personId] : [],
    placeId: (
      table(api, "loaded").get("town") as unknown as { townPlaceId: string }
    ).townPlaceId,
    source: source(citation, date, office.vacancyRule.estimate),
    publicRecord: true,
    news: true,
    facts: {
      officeId: office.id,
      seatId,
      cause,
      rule: office.vacancyRule.method,
    },
  });
  const filled = fillVacancy(api, office, seat, vacancy, term);
  table(api, "vacancies").put(filled as unknown as ModuleRow);
  return filled;
}

/** A regular term starts without an elected successor. Reuse vacancy law. */
export function unfilledTerm(
  api: CoreAPI,
  seatId: string,
  resultId: string,
  endDate: string | null,
): VacancyRow | null {
  const date = api.state.date;
  const id = `vacancy:${seatId}:${date}`;
  const existing = table(api, "vacancies").get(id) as unknown as
    VacancyRow | undefined;
  if (existing) return existing;
  const seat = table(api, "seats").get(seatId) as unknown as SeatInput;
  const office = table(api, "offices").get(
    seat.officeId,
  ) as unknown as OfficeInput & { vacancyRule: VacancyRule };
  const previous = table(api, "terms").query("bySeatStatus", [
    seatId,
    "serving",
  ])[0] as unknown as TermRow | undefined;
  // A later result already seated someone for this term.
  if (previous && previous.startDate >= date) return null;
  if (previous)
    table(api, "terms").put({
      ...previous,
      status: "ended",
      endDate: date,
      endedBy: resultId,
    });
  const vacancy: VacancyRow = {
    id,
    seatId,
    officeId: office.id,
    since: date,
    cause: resultId,
    rule: office.vacancyRule,
    status: "open",
  };
  const term = {
    ...(previous ?? {}),
    id: resultId,
    seatId,
    officeId: office.id,
    personId: previous?.personId ?? null,
    party: previous?.party ?? null,
    startDate: date,
    endDate,
    endEstimated: false,
    reached: resultId,
    status: "ended" as const,
  };
  const filled = fillVacancy(api, office, seat, vacancy, term);
  table(api, "vacancies").put(filled as unknown as ModuleRow);
  api.emit({
    id: `seat-vacated:${seatId}:${date}`,
    date,
    kind: "seat-vacated",
    personIds: previous?.personId ? [previous.personId] : [],
    placeId: (
      table(api, "loaded").get("town") as unknown as { townPlaceId: string }
    ).townPlaceId,
    source: source(
      office.vacancyRule.citation ?? office.vacancyRule.source ?? office.source,
      date,
      office.vacancyRule.estimate,
    ),
    publicRecord: true,
    news: true,
    facts: {
      officeId: office.id,
      seatId,
      cause: resultId,
      rule: office.vacancyRule.method,
    },
  });
  return filled;
}

/**
 * Who takes a vacated seat where the law names the person (the line of
 * succession to the presidency, a vice president nominated and confirmed),
 * by office kind. The provider names a full person, why they took it, and
 * what follows once they hold it (a successor's own seat vacated in turn).
 */
export type SuccessorProvider = (
  api: CoreAPI,
  input: { readonly seatId: string; readonly previous: TermRow },
) => {
  readonly personId: string;
  readonly party: string | null;
  readonly reached: string;
  readonly then?: () => void;
} | null;
const successorProviders = new Map<string, SuccessorProvider>();

/** The engine that names a successor for an office kind registers here. */
export function registerSuccessorProvider(
  officeKind: string,
  provider: SuccessorProvider,
): void {
  successorProviders.set(officeKind, provider);
}

/**
 * A vacancy filled by appointment (or by the stand-in for a special election)
 * leaves the same record a win does: the holder took office on this date, and
 * why. The officials and elections engines read it like any other seating.
 */
function recordFill(
  api: CoreAPI,
  office: OfficeInput & { vacancyRule: VacancyRule },
  seat: SeatInput,
  term: TermRow,
  vacancy: VacancyRow,
): void {
  const date = api.state.date;
  const id = `took-office:${seat.id}:${date}`;
  if (api.state.durableLog.has(id)) return;
  const rule = office.vacancyRule;
  api.emit({
    id,
    date,
    kind: "took-office",
    personIds: term.personId ? [term.personId] : [],
    placeId: (
      table(api, "loaded").get("town") as unknown as { townPlaceId: string }
    ).townPlaceId,
    source: source(
      rule.citation ?? rule.source ?? office.source,
      date,
      rule.estimate,
    ),
    publicRecord: true,
    news: seat.coversTown,
    facts: {
      office: office.title,
      seatId: seat.id,
      winnerId: term.personId ?? term.id,
      vacancyId: vacancy.id,
      how: term.reached,
    },
  });
}

function fillVacancy(
  api: CoreAPI,
  office: OfficeInput & { vacancyRule: VacancyRule },
  seat: SeatInput,
  vacancy: VacancyRow,
  previous: Pick<TermRow, "personId" | "party" | "endDate" | "endEstimated"> &
    Partial<TermRow>,
): VacancyRow {
  const date = api.state.date;
  const rule = office.vacancyRule;
  const town = table(api, "loaded").get("town") as unknown as {
    worldSeed: string;
  };
  const appoint = (reached: string): VacancyRow => {
    const holder =
      office.level === "city" ||
      office.level === "county" ||
      office.level === "township"
        ? suitedResidents(
            api,
            date,
            new Set([
              // The person who just left the seat isn't appointed back to it.
              ...(previous.personId ? [previous.personId] : []),
              ...(
                table(api, "terms").query("byStatus", [
                  "serving",
                ]) as unknown as TermRow[]
              ).flatMap((t) => (t.personId ? [t.personId] : [])),
            ]),
            (
              table(api, "loaded").get("town") as unknown as {
                townPlaceId: string;
              }
            ).townPlaceId,
          ).find(
            (suited) =>
              decisionLean(
                api.state,
                suited.person,
                "offices.accept-appointment",
                "accept",
                "decline",
              ) >= 0,
          )
        : undefined;
    const term = holder
      ? seatResident(api, office, seat, holder.person.id, date, reached)
      : seatNamedOfficial(
          api,
          `${town.worldSeed}:${date}`,
          office,
          { ...seat, party: previous.party },
          date,
          reached,
        );
    const finished = {
      ...term,
      endDate: previous.endDate,
      endEstimated: previous.endEstimated,
    };
    table(api, "terms").put(finished as unknown as ModuleRow);
    recordFill(api, office, seat, finished, vacancy);
    return { ...vacancy, status: "filled", filledBy: term.id };
  };
  if (rule.method === "remains-vacant") return vacancy;
  // The person the law names, where an engine reads the line.
  const named = previous.identity
    ? successorProviders.get(office.kind)?.(api, {
        seatId: seat.id,
        previous: previous as TermRow,
      })
    : null;
  if (named) {
    const term = seatResident(
      api,
      office,
      { ...seat, party: named.party },
      named.personId,
      date,
      named.reached,
    );
    table(api, "terms").put({
      ...term,
      endDate: previous.endDate,
      endEstimated: previous.endEstimated,
    } as unknown as ModuleRow);
    // A named successor leaves the succession engine's own record.
    const filled = { ...vacancy, status: "filled", filledBy: term.id } as const;
    table(api, "vacancies").put(filled as unknown as ModuleRow);
    named.then?.();
    return filled;
  }
  if (rule.method === "successor")
    return appoint(`succeeded as ${rule.successor ?? "next in line"}`);
  if (rule.method === "appointment")
    return appoint(
      `appointed by ${rule.appointedBy ?? "the appointing authority"}`,
    );
  // A special election, after an interim appointment where the law makes one.
  const scheduled: VacancyRow = {
    ...vacancy,
    status: "awaiting-election",
    electionDate: specialElectionDate({
      office,
      stateKey: office.jurisdiction.startsWith("US-")
        ? office.jurisdiction
        : (table(api, "loaded").get("town") as unknown as { stateKey: string })
            .stateKey,
      vacancyDate: date,
    }).electionDate,
  };
  // An interim appointee serves until the special election, where the law
  // makes one; they stand in it as the incumbent.
  const interim =
    rule.method === "appointment-then-special"
      ? appoint(
          `appointed by ${rule.appointedBy ?? "the appointing authority"} until a special election`,
        )
      : null;
  // Where the elections engine runs, the special election is a real race
  // (filing, residents deciding to run, the vote); else a stand-in.
  const opened = specialElections(api, {
    vacancyId: vacancy.id,
    seatId: seat.id,
    electionDate: scheduled.electionDate!,
    termEnd: previous.endDate,
  });
  if (!opened)
    api.moduleCalendar(OFFICES_MODULE_ID).schedule({
      key: `special:${seat.id}:${date}`,
      date: scheduled.electionDate!,
      kind: "special-election",
      source: source(rule.citation ?? office.source, date, true),
      sourceRecordIds: [vacancy.id],
    });
  return interim
    ? {
        ...interim,
        status: "awaiting-election",
        electionDate: scheduled.electionDate!,
      }
    : scheduled;
}

type SpecialElectionOpener = (
  api: CoreAPI,
  race: {
    readonly vacancyId: string;
    readonly seatId: string;
    readonly electionDate: string;
    readonly termEnd: string | null;
  },
) => boolean;
/** Each engine that opens real races for a seat awaiting a special election, by name. */
const specialOpeners = new Map<string, SpecialElectionOpener>();
/** The first engine that takes the seat opens its race; none leaves the stand-in. */
function specialElections(
  api: CoreAPI,
  race: Parameters<SpecialElectionOpener>[1],
): boolean {
  for (const open of specialOpeners.values()) if (open(api, race)) return true;
  return false;
}
/** An engine opens a real race for the seats it counts (the town's own, the world's). */
export function registerSpecialElections(
  open: SpecialElectionOpener,
  name = "town",
): void {
  specialOpeners.set(name, open);
}

/**
 * A special election that drew no candidate leaves its vacancy open: the
 * vacancy rule runs again, and the next special election is dated from today.
 * Returns the vacancy with its new date, or null where it is no longer waiting.
 */
export function repeatSpecialElection(
  api: CoreAPI,
  vacancyId: string,
  termEnd: string | null,
): VacancyRow | null {
  const vacancy = table(api, "vacancies").get(vacancyId) as unknown as
    VacancyRow | undefined;
  if (!vacancy || vacancy.status !== "awaiting-election") return null;
  const office = table(api, "offices").get(
    vacancy.officeId,
  ) as unknown as OfficeInput;
  const date = api.state.date;
  const next = specialElectionDate({
    office,
    stateKey: office.jurisdiction.startsWith("US-")
      ? office.jurisdiction
      : (table(api, "loaded").get("town") as unknown as { stateKey: string })
          .stateKey,
    vacancyDate: date,
  });
  const repeated: VacancyRow = { ...vacancy, electionDate: next.electionDate };
  table(api, "vacancies").put(repeated as unknown as ModuleRow);
  const opened = specialElections(api, {
    vacancyId,
    seatId: vacancy.seatId,
    electionDate: next.electionDate,
    termEnd,
  });
  if (!opened)
    api.moduleCalendar(OFFICES_MODULE_ID).schedule({
      key: `special:${vacancy.seatId}:${next.electionDate}`,
      date: next.electionDate,
      kind: "special-election",
      source: source(next.source, date, true),
      sourceRecordIds: [vacancyId],
    });
  return repeated;
}

/** A special election's winner fills the vacancy. */
export function vacancyFilled(
  api: CoreAPI,
  vacancyId: string,
  termId: string,
): void {
  const vacancy = table(api, "vacancies").get(vacancyId) as unknown as
    VacancyRow | undefined;
  if (vacancy)
    table(api, "vacancies").put({
      ...vacancy,
      status: "filled",
      filledBy: termId,
    } as unknown as ModuleRow);
}

function officesCalendarWork(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  if (work.kind !== "special-election") return;
  const vacancy = table(api, "vacancies").get(
    work.sourceRecordIds[0]!,
  ) as unknown as VacancyRow | undefined;
  if (!vacancy || vacancy.status !== "awaiting-election") return;
  // stopgapId: SG-GOV-special-election-appointee
  api.stopgap("SG-GOV-special-election-appointee");
  const office = table(api, "offices").get(
    vacancy.officeId,
  ) as unknown as OfficeInput & { vacancyRule: VacancyRule };
  const seat = table(api, "seats").get(vacancy.seatId) as unknown as SeatInput;
  const interim = table(api, "terms").query("bySeatStatus", [
    seat.id,
    "serving",
  ])[0] as TermRow | undefined;
  if (interim)
    table(api, "terms").put({
      ...interim,
      status: "ended",
      endDate: api.state.date,
      endEstimated: false,
      endedBy: "special election",
    } as unknown as ModuleRow);
  const previous =
    interim ??
    ({
      endDate: null,
      endEstimated: true,
      party: partyName(seat.party),
    } as unknown as TermRow);
  const filled = fillVacancy(
    api,
    {
      ...office,
      vacancyRule: {
        ...office.vacancyRule,
        method: "appointment",
        appointedBy: "the special election (stand-in)",
      },
    },
    seat,
    vacancy,
    previous,
  );
  table(api, "vacancies").put({
    ...filled,
    status: "filled",
  } as unknown as ModuleRow);
}
