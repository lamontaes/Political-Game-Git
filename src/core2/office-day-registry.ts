/**
 * What each level adds to the officeholder's day (office play): its acts of
 * office (rows, who is offered them, what they do) and the kinds of moment
 * that may stop the player. OFFICE-LOCAL, OFFICE-STATE and OFFICE-FEDERAL
 * each register from their own file (`office-day-acts.ts`,
 * `office-day-state.ts`, `office-day-federal.ts`), imported once from
 * `office-day-levels.ts`; the engine (`modules/office-day.ts`) runs them
 * all by one rule. Nothing here imports an engine.
 */
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreData,
  DecisionResult,
  PersonState,
} from "./types";

export type OfficeOfferProvider = (
  api: CoreAPI,
  actor: Readonly<PersonState>,
  action: ActionDefinition,
) => ActOffer[];
export type OfficeEffectHandler = (
  api: CoreAPI,
  actorId: string,
  offer: ActOffer,
  date: string,
  days: number,
  decision: DecisionResult,
) => void;

/** One level's acts: rows for the day's catalog, their hour parameters, offers and effects. */
export interface OfficeActKit {
  readonly id: string;
  readonly onDay?: (api: CoreAPI) => void;
  readonly onAfterDay?: (api: CoreAPI) => void;
  readonly acts: readonly ActionDefinition[];
  readonly parameters?: CoreData["parameters"];
  /** By target kind. */
  readonly providers?: Readonly<Record<string, OfficeOfferProvider>>;
  /** By effect; an act's `effect` names its handler. */
  readonly handlers?: Readonly<Record<string, OfficeEffectHandler>>;
}

/** A kind of moment that may stop the player, and whether it does by default. */
export interface OfficeStopKind {
  readonly kind: string;
  readonly byDefault: boolean;
}

const kits = new Map<string, OfficeActKit>();
const stopKinds = new Map<string, OfficeStopKind>();

/** Register a level's acts (once per kit id; a second call replaces the first). */
export function registerOfficeActs(kit: OfficeActKit): void {
  kits.set(kit.id, kit);
}

export function officeActKits(): readonly OfficeActKit[] {
  return [...kits.values()];
}

/** Register the moments a level adds to what may stop the player. */
export function registerStopKinds(rows: readonly OfficeStopKind[]): void {
  for (const row of rows) stopKinds.set(row.kind, row);
}

export function officeStopKinds(): readonly OfficeStopKind[] {
  return [...stopKinds.values()];
}
