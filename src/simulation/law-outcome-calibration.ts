import web from "../../data/research/outcome-web/links.json" with { type: "json" };
import lobbying from "../../data/research/laws/lobbying-cooling-off.json" with { type: "json" };
import { SeededRng } from "./rng";
import type { World } from "./types";

/** Development targets only. No simulation producer reads these values. */
export interface LawOutcomeCalibration {
  readonly target: number;
  readonly band: readonly [number, number];
  readonly lagMonths: number;
  readonly lagBandMonths: readonly [number, number];
}
interface CalibrationLink {
  readonly key: string;
  readonly calibration?: {
    readonly target: number;
    readonly spread: number;
    readonly lagMonths: number;
    readonly lagBandMonths: readonly [number, number];
  };
}
/** Drawn once by createWorld, retained in the save; no play-time draws. */
export function createLawOutcomeCalibration(
  seed: string,
): Readonly<Record<string, LawOutcomeCalibration>> {
  const result: Record<string, LawOutcomeCalibration> = {};
  for (const link of web.links as readonly CalibrationLink[]) {
    const reference = link.calibration;
    if (!reference) continue;
    const rng = new SeededRng(seed).fork(`law-calibration:${link.key}`);
    const bounds = [
      reference.target * (1 - reference.spread),
      reference.target * (1 + reference.spread),
    ];
    const band: [number, number] = [Math.min(...bounds), Math.max(...bounds)];
    const u = (rng.next() + rng.next()) / 2;
    const target = band[0] + (band[1] - band[0]) * u;
    const [low, high] = reference.lagBandMonths;
    // Opening variation in delay is centered on the reference, bounded by
    // the declared lag band. This draw does not decide any actor's behavior.
    const lagMonths = Math.min(
      high,
      Math.max(
        low,
        reference.lagMonths + (high - low) * Math.abs(rng.next() - rng.next()),
      ),
    );
    result[link.key] = { target, band, lagMonths, lagBandMonths: [low, high] };
  }
  return result;
}
export function assessLawOutcomeCalibration(
  world: World,
  key: string,
  observed: number | null,
  observedLagMonths: number | null,
) {
  const calibration = world.lawOutcomeCalibration?.[key];
  if (!calibration)
    return {
      status: "unavailable" as const,
      reason: "This world has no saved calibration target.",
    };
  if (observed === null || observedLagMonths === null)
    return {
      status: "unavailable" as const,
      reason: "The covered cohort or first effect date has not been measured.",
    };
  if (!Number.isFinite(observed) || !Number.isFinite(observedLagMonths))
    throw new Error("Calibration observations must be finite.");
  const withinBand =
    observed >= calibration.band[0] && observed <= calibration.band[1];
  const withinLagBand =
    observedLagMonths >= calibration.lagBandMonths[0] &&
    observedLagMonths <= calibration.lagBandMonths[1];
  return {
    status: withinBand && withinLagBand ? ("PASS" as const) : ("FAIL" as const),
    observed,
    observedLagMonths,
    ...calibration,
  };
}

export function assertLawOutcomeCalibration(world: World): void {
  for (const [key, cents] of Object.entries(
    world.openingLobbyistAnnualPayCents ?? {},
  ))
    if (!key.startsWith("US-") || !Number.isSafeInteger(cents) || cents <= 0)
      throw new Error(`Invalid saved opening lobbyist pay: ${key}`);
  for (const [key, row] of Object.entries(world.lawOutcomeCalibration ?? {})) {
    if (
      !key ||
      !Array.isArray(row.band) ||
      row.band.length !== 2 ||
      !Array.isArray(row.lagBandMonths) ||
      row.lagBandMonths.length !== 2 ||
      ![row.target, ...row.band, row.lagMonths, ...row.lagBandMonths].every(
        Number.isFinite,
      ) ||
      row.band[0] > row.target ||
      row.target > row.band[1] ||
      row.lagBandMonths[0] < 0 ||
      row.lagBandMonths[0] > row.lagMonths ||
      row.lagMonths > row.lagBandMonths[1]
    )
      throw new Error(`Invalid saved law calibration: ${key}`);
  }
}

/** Modeled all-state salary anchors; opening draw is saved, never an actor decision. */
export function createOpeningLobbyistPay(
  seed: string,
): Readonly<Record<string, number>> {
  const result: Record<string, number> = {};
  const source = lobbying.lobbyistPayAnchor;
  const states: Readonly<Record<string, number>> = source.stateAnnualSalary;
  const [low, high] = source.spreadRatios;
  for (const key of Object.keys(lobbying.capitals)) {
    const stateKey = `US-${key}`;
    const rng = new SeededRng(seed).fork(`opening-lobbyist-pay:${stateKey}`);
    const spread = low! + ((high! - low!) * (rng.next() + rng.next())) / 2;
    result[stateKey] = Math.round(
      (states[stateKey] ?? source.nationalAnnualSalary) * spread * 100,
    );
  }
  return result;
}
