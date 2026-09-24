import {
  activeOrganizationParticipationsAt,
  organizationProfileAt,
} from "../simulation";
import {
  municipalGovernmentByKey,
  primaryReading,
} from "../simulation/municipal-government";
import {
  localGoverningBodyRulesForGovernmentKey,
  localGoverningBodyRulesForUnitId,
} from "../simulation/nationwide-world/local-governing-body-rules";
import type { LocalRuleValue } from "../simulation/nationwide-world/local-governing-body-rules";
import { localGoverningBodyName } from "../simulation/nationwide-world/local-governing-body-names";
import { governmentUnit } from "../simulation/government-units";
import {
  localChiefExecutiveRulesForUnitId,
  readMayorTerm,
} from "../simulation/nationwide-world/local-chief-executive-rules";
import type { EntityId, IsoDate, World } from "../simulation";

/**
 * The seat this person holds on their town's governing body, if any.
 *
 * Read from the same municipal-office participation every city screen reads,
 * so a seat won at the ballot box and a seat placed any other way are one
 * thing. Reading is free and writes nothing.
 */
export interface LocalGoverningSeat {
  readonly organizationId: EntityId;
  /** A seat on the body, or the town's mayoralty. */
  readonly office: "member" | "mayor";
  /** "Mayor", or the title the town's own government gives it. */
  readonly mayorTitle: string | null;
  /** "City of Paducah", or the town's own name where its government was read. */
  readonly governmentName: string;
  /**
   * The body's own name where the game has read it, such as "Board of
   * Commissioners"; otherwise the game's placeholder for the town's kind of
   * government, such as "City Council" (`local-governing-body-names.ts`).
   */
  readonly bodyName: string;
  readonly since: IsoDate;
  /** The seat in the words it was recorded with, such as "Elected 2026-02-02". */
  readonly seatContext: string | null;
  /**
   * True when the game has read this town's own government in depth, so its
   * council business opens under the city's own screen.
   */
  readonly hasCityScreen: boolean;
  /**
   * How many seats the body has and how long a term runs: the town's own rule
   * where it was read, a typical value otherwise, and labeled so. For a mayor,
   * `seats` is null and the term is the mayor's own.
   */
  readonly seats: LocalRuleValue | null;
  readonly termYears: LocalRuleValue | null;
}

export function localGoverningSeatFor(
  world: World,
  personId: EntityId,
): LocalGoverningSeat | null {
  const seats = activeOrganizationParticipationsAt(world, personId).filter(
    ({ participation, state }) =>
      participation.kind === "leadership:municipal-office" &&
      state.roleKind !== null &&
      state.roleKind !== "leader:municipal-clerk" &&
      state.roleKind !== "leader:municipal-manager",
  );
  // A mayor who also sits on the body is read as the mayor first.
  const held =
    seats.find(({ state }) => state.roleKind === "leader:municipal-mayor") ??
    seats[0];
  if (!held) return null;
  const organization = world.history.organizations.find(
    (candidate) => candidate.id === held.participation.organizationId,
  );
  const compiledKey = organization?.stableKey.startsWith(
    "municipal-government:",
  )
    ? organization.stableKey.slice("municipal-government:".length)
    : null;
  const compiled = compiledKey ? municipalGovernmentByKey(compiledKey) : null;
  const reading = compiled ? primaryReading(compiled) : null;
  const rules = compiledKey
    ? localGoverningBodyRulesForGovernmentKey(compiledKey)
    : organization?.stableKey.startsWith("local-government:")
      ? localGoverningBodyRulesForUnitId(
          organization.stableKey.slice("local-government:".length),
        )
      : null;
  const unit = rules ? governmentUnit(rules.unitId) : null;
  const mayor = held.state.roleKind === "leader:municipal-mayor";
  const chief =
    mayor && rules ? localChiefExecutiveRulesForUnitId(rules.unitId) : null;
  const readMayorYears = mayor && reading ? readMayorTerm(reading) : null;
  const mayorTerm: LocalRuleValue | null = !mayor
    ? null
    : readMayorYears !== null
      ? { value: readMayorYears, basis: "read" }
      : chief
        ? {
            value: chief.termYears.value,
            basis: chief.termYears.basis === "read" ? "read" : "typical",
          }
        : null;
  return {
    organizationId: held.participation.organizationId,
    office: mayor ? "mayor" : "member",
    mayorTitle: mayor
      ? (reading?.mayor?.title ?? chief?.title.value ?? "Mayor")
      : null,
    governmentName:
      reading?.displayName ??
      organizationProfileAt(world, held.participation.organizationId)?.name ??
      "the town government",
    bodyName:
      reading?.bodyName ??
      (unit ? localGoverningBodyName(unit).shortBodyName : "governing body"),
    since: held.participation.startedAt as IsoDate,
    seatContext: held.state.context,
    hasCityScreen: compiled !== null,
    seats: mayor ? null : (rules?.seats ?? null),
    termYears: mayor ? mayorTerm : (rules?.termYears ?? null),
  };
}

/**
 * One sentence on the body's size and term, saying which the town's own rules
 * state and which are typical values the game has given it. Null when neither
 * is known at all.
 */
export function townSeatRulesSentence(
  seat: Pick<LocalGoverningSeat, "seats" | "termYears"> &
    Partial<Pick<LocalGoverningSeat, "office">>,
): string | null {
  if (seat.office === "mayor") {
    if (!seat.termYears) return null;
    const term = `${seat.termYears.value}-year terms`;
    return seat.termYears.basis === "read"
      ? `By the town's own rules the mayor serves ${term}.`
      : `The game has not read how long this town's mayor serves, so it gives the office ${term}, as towns across the country commonly have.`;
  }
  const seats = seat.seats
    ? `${seat.seats.value} ${seat.seats.value === 1 ? "seat" : "seats"}`
    : null;
  const term = seat.termYears ? `${seat.termYears.value}-year terms` : null;
  const read = [
    seat.seats?.basis === "read" ? seats : null,
    seat.termYears?.basis === "read" ? term : null,
  ].filter((part): part is string => part !== null);
  const typical = [
    seat.seats?.basis === "typical" ? seats : null,
    seat.termYears?.basis === "typical" ? term : null,
  ].filter((part): part is string => part !== null);
  const sentences: string[] = [];
  if (read.length > 0)
    sentences.push(
      `By the town's own rules the body has ${read.join(" and ")}.`,
    );
  if (typical.length > 0)
    sentences.push(
      `The game has not read ${
        read.length > 0 ? "the rest" : "how this body is made up"
      }, so it gives it ${typical.join(" and ")}, as town councils across the country commonly have.`,
    );
  return sentences.length > 0 ? sentences.join(" ") : null;
}
