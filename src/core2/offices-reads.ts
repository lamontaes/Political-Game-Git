/**
 * The offices engine's reads: the module's id, an office or a term by its id,
 * the terms serving now or serving a person, the town's seats, the offices of a
 * jurisdiction and their seats, whether an office sits outside the town, and
 * the people holding office. They import only types, so a reader takes them
 * without loading the offices engine's ring; modules/offices.ts re-exports each
 * one and stays the one writer of offices and terms.
 */
import type { TermRow } from "./modules/offices";
import type { OfficeInput } from "./offices-local";
import type { SeatInput, VacancyRule } from "./offices-state";
import type { CoreAPI, CoreState } from "./types";

export const OFFICES_MODULE_ID = "core2-offices-v1";

export function table(api: CoreAPI, name: string) {
  return api.moduleState(OFFICES_MODULE_ID).table(name);
}

/**
 * Whether an office belongs to another place: its jurisdiction is a state or
 * territory other than the town's own. A federal office (the President, the
 * Vice President, Congress) is never another place's, and neither is a local
 * one. The one test every engine reads for "another place's office", by
 * jurisdiction, never by whether the office covers the town (a territory town
 * casts no electoral votes, and a district elsewhere in the town's own state
 * does not cover it, yet both are the town's).
 */
export function isOutsideOffice(
  api: CoreAPI,
  office: object | null | undefined,
): boolean {
  const row = office as
    | { readonly level?: unknown; readonly jurisdiction?: unknown }
    | null
    | undefined;
  if (!row || row.level === "federal") return false;
  const jurisdiction = String(row.jurisdiction ?? "");
  if (!jurisdiction.startsWith("US-")) return false;
  const town = (table(api, "loaded").get("town") as { stateKey?: string })
    ?.stateKey;
  return jurisdiction !== town;
}

/** The terms a person is serving now: the one reader of "what office does this person hold". */
export function servingTermsOf(
  api: CoreAPI,
  personId: string,
): readonly TermRow[] {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
  return (
    table(api, "terms").query("byPerson", [personId]) as unknown as TermRow[]
  ).filter((term) => term.status === "serving");
}

/** An office by its id (its title, level, jurisdiction and rule), or undefined where there is none. */
export function officeById(
  api: CoreAPI,
  officeId: string,
): OfficeInput | undefined {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return undefined;
  return table(api, "offices").get(officeId) as unknown as
    OfficeInput | undefined;
}

/** A term by its id (serving or ended), or undefined where there is none. */
export function termById(api: CoreAPI, termId: string): TermRow | undefined {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return undefined;
  return table(api, "terms").get(termId) as unknown as TermRow | undefined;
}

/** Every term a person has held or holds, serving and ended (`servingTermsOf` is the ones still serving). */
export function termsOfPerson(
  api: CoreAPI,
  personId: string,
): readonly TermRow[] {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
  return table(api, "terms").query("byPerson", [
    personId,
  ]) as unknown as TermRow[];
}

/** Every office the offices engine keeps, in its table's order. */
export function allOffices(api: CoreAPI): readonly OfficeInput[] {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
  return table(api, "offices").rows() as unknown as OfficeInput[];
}

/**
 * The offices of one jurisdiction (a state's key, `US`, or a local government's id) as the table holds
 * them now. A read only: `officesOfState` also creates another state's offices on first read.
 */
export function officesInJurisdiction(
  api: CoreAPI,
  jurisdiction: string,
): readonly OfficeInput[] {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
  return table(api, "offices").query("byJurisdiction", [
    jurisdiction,
  ]) as unknown as OfficeInput[];
}

/** Every term serving now. */
export function servingTerms(api: CoreAPI): readonly TermRow[] {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
  return table(api, "terms").query("byStatus", [
    "serving",
  ]) as unknown as TermRow[];
}

// The officials engine imports this entry, so its rows are read by module id here.
export const OFFICIALS_ID = "core2-officials-v1";

const officeholdersByCore = new WeakMap<
  CoreState,
  { date: string; ids: Set<string> }
>();

/**
 * Every person who holds a seat today, through either store: the officials
 * engine's seated members and the offices engine's serving terms that name
 * a person. Kept for the day, so a reader asking per person stays cheap.
 */
export function officeholderIds(api: CoreAPI): ReadonlySet<string> {
  const core = api.state as CoreState;
  const held = officeholdersByCore.get(core);
  if (held?.date === core.date) return held.ids;
  const ids = new Set<string>();
  if (core.modules.has(OFFICIALS_ID))
    for (const row of api.moduleState(OFFICIALS_ID).table("officials").rows())
      if (row.ended === null) ids.add(row.id as string);
  if (core.modules.has(OFFICES_MODULE_ID))
    for (const row of table(api, "terms").query("byStatus", ["serving"]))
      if (typeof row.personId === "string") ids.add(row.personId);
  officeholdersByCore.set(core, { date: core.date, ids });
  return ids;
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
