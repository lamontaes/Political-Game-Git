import bodyNames from "./data/offices/body-names.json" with { type: "json" };
/**
 * The local offices that cover a place: its city (council and mayor), its
 * town or township board where it has no city, and its county (governing
 * body, elected executive, elected row offices).
 *
 * Every size, title and term comes from the existing data readers over the
 * Census Bureau's 2025 government-units listing and the researched rule
 * tables; each office keeps the reader's basis, so a typical value is marked
 * as an estimate and a read one as sourced.
 */
import stateExecutiveGovernments from "../../data/research/local-government/state-executive-governments.json" with { type: "json" };
import countySchedule from "../../data/research/government/county-election-schedule-by-state.json" with { type: "json" };
import { corePlaceByKey } from "./place-lookup";
import { placeLocalGovernmentUnits } from "./gov-rules/local-governments";
import { localGoverningBodyRules } from "./gov-rules/local-governing-body-rules";
import { localChiefExecutiveRules } from "./gov-rules/local-chief-executive-rules";
import { countyElectedRowOffices } from "./gov-rules/county-row-offices";
import { councilElectionMethod } from "./gov-rules/council-election-method";
import { boardGoverningBodyRules } from "./gov-rules/township-governing-body-rules";
import type { GovernmentUnitIdentity } from "./reference/government-units";
import { countyDisplayName } from "./business-names";

/** A listed government as people write it: "VILLAGE OF EOLIA" is "Village of Eolia". */
export function governmentTitleName(listed: string): string {
  return listed
    .trim()
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word === "and" || word === "of"
        ? word
        : word.replace(/(^|-)([a-z])/g, (found) => found.toUpperCase()),
    )
    .join(" ");
}

/**
 * What a board of a county, parish or township is called: its government as
 * people say it plus the board's own name, without saying "County" twice.
 * "COUNTY OF POCAHONTAS" with "County Commission" is "Pocahontas County
 * Commission"; with "Board of County Commissioners" it is "Board of County
 * Commissioners of Pocahontas County"; with "Board of Supervisors" it is
 * "Pocahontas County Board of Supervisors".
 */
export function boardBodyName(listed: string, bodyName: string): string {
  const area = countyDisplayName(listed);
  const kind = area.split(" ").at(-1)!;
  if (bodyName.startsWith(`${kind} `))
    return `${area.slice(0, -kind.length)}${bodyName}`;
  if (bodyName.split(" ").includes(kind)) return `${bodyName} of ${area}`;
  return `${area} ${bodyName}`;
}

export type OfficeLevel = "federal" | "state" | "county" | "city" | "township";

/** An office: one title in one government, with how many seats it has. */
export interface OfficeInput {
  readonly id: string;
  readonly level: OfficeLevel;
  /** The government: "US", "US-XX", or a government-units id. */
  readonly jurisdiction: string;
  readonly governmentName: string;
  /** The collective body, distinct from a member’s office title. */
  readonly bodyName?: string;
  readonly kind: string;
  readonly title: string;
  readonly seats: number;
  readonly termYears: number | null;
  /** The next regular election for a single-seat office, where read. */
  readonly nextElectionYear?: number;
  /** The month and day a new term starts (MM-DD), where read. */
  readonly termStarts?: string;
  readonly elected: boolean;
  /** Seats elected by district, or at large. */
  readonly districted: boolean;
  /**
   * A council's seats chosen by part of town (the first `wardSeats` seats,
   * numbered 1 to n); its other seats are at large. Absent where none are.
   */
  readonly wardSeats?: number;
  /** What the place calls a part of town: "ward" only where its charter does. */
  readonly seatTerm?: "ward" | "district";
  /** Whether the method comes from the charter or is an estimate, and its source. */
  readonly method?: {
    readonly basis: "charter" | "estimated";
    readonly citation: string;
  };
  /** True when the office's seats represent the player's town. */
  readonly coversTown: boolean;
  readonly source: string;
  readonly estimate: boolean;
}

interface CountyScheduleRow {
  readonly stateUsps: string;
  readonly body?: { readonly termYears?: number };
  readonly status: string;
  readonly citation?: string;
}

const scheduleByState = new Map(
  (countySchedule as { states: CountyScheduleRow[] }).states.map((row) => [
    row.stateUsps,
    row,
  ]),
);

/**
 * Local governments that are also the place's state-level government (the
 * District of Columbia): their offices are seated once, at the state level.
 */
const STATE_LEVEL_GOVERNMENTS = new Set(
  Object.keys(
    (stateExecutiveGovernments as { governments: Record<string, unknown> })
      .governments,
  ),
);

function cityOffices(unit: GovernmentUnitIdentity): OfficeInput[] {
  const offices: OfficeInput[] = [];
  const body = localGoverningBodyRules(unit);
  if (
    body?.researchedGovernmentKey &&
    STATE_LEVEL_GOVERNMENTS.has(body.researchedGovernmentKey)
  )
    return [];
  const method = body?.seats ? councilElectionMethod(unit) : null;
  if (body?.seats)
    offices.push({
      id: `office:${unit.id}:council`,
      level: "city",
      jurisdiction: unit.id,
      governmentName: unit.name,
      // stopgapId: SG-GOV-municipal-body-name — charter names not yet in the compiled reader.
      bodyName: `${governmentTitleName(unit.name)} ${bodyNames.municipal.value}`,
      kind: "council",
      title: "Council member",
      seats: body.seats.value,
      termYears: body.termYears?.value ?? null,
      elected: true,
      districted: (method?.wardSeats ?? 0) > 0,
      ...(method && method.wardSeats > 0
        ? { wardSeats: method.wardSeats, seatTerm: method.seatTerm }
        : {}),
      ...(method
        ? { method: { basis: method.basis, citation: method.citation } }
        : {}),
      coversTown: true,
      source: body.researchedGovernmentKey
        ? `Municipal reading ${body.researchedGovernmentKey}`
        : "ICMA municipal form of government survey: the national typical council size and term",
      estimate: body.seats.basis !== "read",
    });
  const chief = localChiefExecutiveRules(unit);
  if (chief)
    offices.push({
      id: `office:${unit.id}:mayor`,
      level: "city",
      jurisdiction: unit.id,
      governmentName: unit.name,
      kind: "mayor",
      title: chief.title.value,
      seats: 1,
      termYears: chief.termYears.value,
      elected: chief.directlyElected.value,
      districted: false,
      coversTown: true,
      source: chief.researchedGovernmentKey
        ? `Municipal reading ${chief.researchedGovernmentKey}`
        : "ICMA municipal form of government survey: whether the typical town elects its mayor directly",
      estimate: chief.directlyElected.basis !== "read",
    });
  return offices;
}

function boardOffices(
  unit: GovernmentUnitIdentity,
  level: "county" | "township",
): OfficeInput[] {
  const offices: OfficeInput[] = [];
  const board = boardGoverningBodyRules(unit);
  const schedule = scheduleByState.get(unit.stateUsps);
  const termYears =
    level === "county" ? (schedule?.body?.termYears ?? null) : null;
  if (board) {
    offices.push({
      id: `office:${unit.id}:board`,
      level,
      jurisdiction: unit.id,
      governmentName: unit.name,
      bodyName: boardBodyName(unit.name, board.bodyName),
      kind: level === "county" ? "county-board" : "township-board",
      title: board.memberTitle,
      seats: board.seats,
      termYears,
      elected: true,
      districted: level === "county",
      coversTown: true,
      source: `${board.citation} ${board.url}`.trim(),
      estimate: board.basis === "estimated",
    });
    if (board.executive.kind === "elected" && board.executive.title)
      offices.push({
        id: `office:${unit.id}:executive`,
        level,
        jurisdiction: unit.id,
        governmentName: unit.name,
        kind: "county-executive",
        title: board.executive.title,
        seats: 1,
        termYears,
        elected: true,
        districted: false,
        coversTown: true,
        source: `${board.citation} ${board.url}`.trim(),
        estimate: board.executive.status !== "SOURCED",
      });
  }
  if (level === "county")
    for (const row of countyElectedRowOffices(unit))
      offices.push({
        id: `office:${unit.id}:${row.office}`,
        level,
        jurisdiction: unit.id,
        governmentName: unit.name,
        kind: `county-${row.office}`,
        title: row.title,
        seats: 1,
        termYears,
        elected: row.elected,
        districted: false,
        coversTown: true,
        source: row.source,
        estimate: row.basis !== "read",
      });
  return offices;
}

/** Every local office whose seats cover the place. */
export function localOfficesForPlace(placeKey: string): readonly OfficeInput[] {
  const place = corePlaceByKey(placeKey);
  const units = placeLocalGovernmentUnits(place);
  return [
    ...units.municipal.flatMap(cityOffices),
    ...units.townships
      .slice(0, 1)
      .flatMap((unit) => boardOffices(unit, "township")),
    ...units.counties
      .slice(0, 1)
      .flatMap((unit) => boardOffices(unit, "county")),
  ];
}
