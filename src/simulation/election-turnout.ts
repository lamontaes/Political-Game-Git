import { lawInForce } from "./governing/law-in-force";
import type { EntityId, IsoDate, World } from "./types";

/** Owner's September29 Wave1 ratios, pending the Research3 source receipt.
 * These are game calibration parameters, not claimed as verified statistics. */
export const ELECTION_YEAR_TURNOUT_RATIOS = {
  presidential: 0.91,
  midterm: 0.72,
  offCycle: 0.39,
} as const;
export function electionYearKind(
  year: number,
): keyof typeof ELECTION_YEAR_TURNOUT_RATIOS {
  return year % 4 === 0
    ? "presidential"
    : year % 2 === 0
      ? "midterm"
      : "offCycle";
}
export interface TurnoutInput {
  readonly year: number;
  readonly presidentialBase: number;
  readonly democraticShare: number;
  /** Marginal change since the base electorate, in share points. */
  readonly registrationChange: number;
  readonly identificationChange: number;
}
/** Competitiveness changes engagement smoothly. Bounds are physical ballot
 * capacity, never a condition deciding one person's participation. */
export function electionTurnout(input: TurnoutInput): number {
  const competitive =
    1 - 2 * Math.abs(Math.max(0, Math.min(1, input.democraticShare)) - 0.5);
  const engagement = 1 + 0.05 * competitive;
  return Math.max(
    0,
    Math.min(
      1,
      input.presidentialBase *
        ELECTION_YEAR_TURNOUT_RATIOS[electionYearKind(input.year)] *
        engagement +
        input.registrationChange +
        input.identificationChange,
    ),
  );
}
const LAW_KEYS = {
  automaticRegistration:
    "us-policy-positions:government-operations.automatic-voter-registration",
  photoIdentification:
    "us-policy-positions:government-operations.require-photo-id-to-vote",
} as const;
/** The base count already includes laws at start. Apply only their saved
 * changes; otherwise registration would be counted twice every cycle.
 * Existing outcome-web research gives AVR +.015, photo-ID about zero. */
export function electionLawTurnoutChange(
  world: World,
  jurisdiction: EntityId,
  onDate: IsoDate,
): Pick<TurnoutInput, "registrationChange" | "identificationChange"> {
  const change = (key: string) =>
    Number(
      lawInForce(world, jurisdiction, key as EntityId, onDate)?.answer ===
        "yes",
    ) -
    Number(
      lawInForce(world, jurisdiction, key as EntityId, world.startedAt)
        ?.answer === "yes",
    );
  return {
    registrationChange: 0.015 * change(LAW_KEYS.automaticRegistration),
    identificationChange: 0 * change(LAW_KEYS.photoIdentification),
  };
}
