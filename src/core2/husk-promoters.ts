/**
 * Engines that keep a husk they can build a full person from (another
 * state's officials) register here, so opening one builds the person from
 * what the engine recorded. A file of its own so the engine and the state
 * can both import it without an import cycle.
 */
import type { PersonId, PersonState } from "./types";
import type { CoreState } from "./types";

type Promoter = (
  core: CoreState,
  personId: PersonId,
) => PersonState | undefined;

const promoters: Promoter[] = [];

export function registerHuskPromoter(promoter: Promoter): void {
  if (!promoters.includes(promoter)) promoters.push(promoter);
}

/** The person built for a husk by the first engine that holds its record, if any. */
export function promoteHusk(
  core: CoreState,
  personId: PersonId,
): PersonState | undefined {
  for (const promote of promoters) {
    const promoted = promote(core, personId);
    if (promoted) return promoted;
  }
  return undefined;
}

type IdentityOf = (
  core: CoreState,
  personId: PersonId,
) =>
  | {
      birthDate: string;
      placeId: string;
      traits: Readonly<Record<string, number>>;
    }
  | undefined;

const identities: IdentityOf[] = [];

/** Engines that can say who a husk is (birth date and traits) register here, so the health engine can book its illness and death. */
export function registerHuskIdentity(provider: IdentityOf): void {
  if (!identities.includes(provider)) identities.push(provider);
}

/** Who a husk is, if an engine holds its record. */
export function huskIdentityOf(core: CoreState, personId: PersonId) {
  for (const provider of identities) {
    const found = provider(core, personId);
    if (found) return found;
  }
  return undefined;
}

type IncomeOf = (core: CoreState, personId: PersonId) => number | undefined;

const incomes: IncomeOf[] = [];

/** Engines that know what a husk is paid (the pay engine, from the seat) register here, so the health engine ranks them by income as it ranks a person. */
export function registerHuskIncome(provider: IncomeOf): void {
  if (!incomes.includes(provider)) incomes.push(provider);
}

/** A husk's yearly income in minor units, if an engine knows it. */
export function huskIncomeOf(core: CoreState, personId: PersonId) {
  for (const provider of incomes) {
    const found = provider(core, personId);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Holders an engine keeps as names on its record and nothing more (another
 * state's officials nobody has opened). The health engine books their
 * illness and death by the rule it books anyone's, without building them,
 * and the engine writes only what a death leaves (`died`: the seat falls
 * vacant).
 */
export interface UnbuiltHolders {
  /** A number that changes whenever a holder may have joined, compared each day. */
  readonly marker: (core: CoreState) => number;
  /** Every holder held this way now, by person id. */
  readonly ids: (core: CoreState) => Iterable<PersonId>;
  /** Whether this engine holds `personId` this way (in office or not). */
  readonly holds: (core: CoreState, personId: PersonId) => boolean;
  /** Their death, for the engine to write what it leaves. */
  readonly died: (core: CoreState, personId: PersonId) => void;
}

const unbuilt: UnbuiltHolders[] = [];

export function registerUnbuiltHolders(holders: UnbuiltHolders): void {
  if (!unbuilt.includes(holders)) unbuilt.push(holders);
}

/** Every engine that keeps unbuilt holders. */
export function unbuiltHolderEngines(): readonly UnbuiltHolders[] {
  return unbuilt;
}

/** The engine that keeps `personId` as an unbuilt holder, if any. */
export function unbuiltHolderOf(
  core: CoreState,
  personId: PersonId,
): UnbuiltHolders | undefined {
  return unbuilt.find((holders) => holders.holds(core, personId));
}
