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
  /** "City of Paducah", or the town's own name where its government was read. */
  readonly governmentName: string;
  /**
   * The body's own name where the game has read it, such as "Board of
   * Commissioners"; otherwise "governing body".
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
   * where it was read, a typical value otherwise, and labelled so.
   */
  readonly seats: LocalRuleValue | null;
  readonly termYears: LocalRuleValue | null;
}

export function localGoverningSeatFor(
  world: World,
  personId: EntityId,
): LocalGoverningSeat | null {
  const held = activeOrganizationParticipationsAt(world, personId).find(
    ({ participation, state }) =>
      participation.kind === "leadership:municipal-office" &&
      state.roleKind !== null &&
      state.roleKind !== "leader:municipal-clerk" &&
      state.roleKind !== "leader:municipal-manager",
  );
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
  return {
    organizationId: held.participation.organizationId,
    governmentName:
      reading?.displayName ??
      organizationProfileAt(world, held.participation.organizationId)?.name ??
      "the town government",
    bodyName: reading?.bodyName ?? "governing body",
    since: held.participation.startedAt as IsoDate,
    seatContext: held.state.context,
    hasCityScreen: compiled !== null,
    seats: rules?.seats ?? null,
    termYears: rules?.termYears ?? null,
  };
}

/**
 * One sentence on the body's size and term, saying which the town's own rules
 * state and which are typical values the game has given it. Null when neither
 * is known at all.
 */
export function townSeatRulesSentence(
  seat: Pick<LocalGoverningSeat, "seats" | "termYears">,
): string | null {
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
