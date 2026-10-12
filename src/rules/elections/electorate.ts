import type {
  EntityId,
  IsoDate,
  HistoricalEvent,
} from "../../simulation/types";
import type { StartingRegime } from "../../simulation/world-setup/types";
import type { CensusRegion } from "../../simulation/world-setup/census-regions";
import type {
  CalibrationRow,
  ElectoralCalibration,
} from "../../simulation/world-setup/political-start";
const SEAT_TENURE_EVENT = "world.legislative-seat-tenure";
const SEAT_VACANCY_EVENT = "world.legislative-seat-vacancy";
const LIVING_WORLD_WRITER_VERSION = "living-world-v1";
interface SwingPolicy {
  readonly logitEpsilon: number;
  readonly swingToLogitDivisor: number;
}
export interface ElectorateFacts {
  readonly stateUsps: string | null;
  readonly region: CensusRegion;
  readonly policy: SwingPolicy;
  readonly conditions: PoliticalLatents | null;
  readonly calibration: readonly CalibrationRow[];
  readonly presidentialByState: ElectoralCalibration["presidentialByState"];
  readonly partyId: EntityId | null;
  readonly majorPartyIds: {
    readonly democratic: EntityId;
    readonly republican: EntityId;
  };
  readonly seatShare: number | null | undefined;
  readonly events: readonly HistoricalEvent[];
}
const LN2 = 0.6931471805599453;

const SQRT_HALF = 0.7071067811865476;

export function detLog(value: number): number {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new Error(`detLog needs a finite positive number: ${value}`);
  }
  let mantissa = value;
  let exponent = 0;
  while (mantissa >= 2 * SQRT_HALF) {
    mantissa /= 2;
    exponent += 1;
  }
  while (mantissa < SQRT_HALF) {
    mantissa *= 2;
    exponent -= 1;
  }
  const t = (mantissa - 1) / (mantissa + 1);
  const t2 = t * t;
  let term = t;
  let sum = 0;
  for (let k = 1; k < 80; k += 2) {
    const next = sum + term / k;
    if (next === sum) break;
    sum = next;
    term *= t2;
  }
  return 2 * sum + exponent * LN2;
}

export function detExp(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`detExp needs a finite number: ${value}`);
  }
  if (value > 700) return Number.MAX_VALUE;
  if (value < -700) return 0;
  const k = Math.round(value / LN2);
  const r = value - k * LN2;
  let term = 1;
  let sum = 1;
  for (let n = 1; n < 60; n += 1) {
    term = (term * r) / n;
    const next = sum + term;
    if (next === sum) break;
    sum = next;
  }
  let scaled = sum;
  for (let i = 0; i < Math.abs(k); i += 1) {
    scaled = k > 0 ? scaled * 2 : scaled / 2;
  }
  return scaled;
}

export function logistic(x: number): number {
  return x >= 0 ? 1 / (1 + detExp(-x)) : detExp(x) / (1 + detExp(x));
}

export function logit(p: number): number {
  return detLog(p / (1 - p));
}

export function clampShare(p: number, epsilon: number): number {
  return Math.min(1 - epsilon, Math.max(epsilon, p));
}
export interface PoliticalLatents {
  readonly regime: StartingRegime;
  readonly nationalSwingPp: number;
  readonly regionSwingPp: Readonly<Record<CensusRegion, number>>;
  readonly stateSwingPp: Readonly<Record<string, number>>;
}

export function sharedSwing(
  latents: PoliticalLatents,
  region: CensusRegion,
  stateUsps: string,
): number {
  return (
    latents.nationalSwingPp +
    latents.regionSwingPp[region] +
    (latents.stateSwingPp[stateUsps] ?? 0)
  );
}

export function applySwing(
  policy: SwingPolicy,
  baselineShare: number,
  swingPp: number,
): number {
  return logistic(
    logit(clampShare(baselineShare, policy.logitEpsilon)) +
      swingPp / policy.swingToLogitDivisor,
  );
}
export interface StatewideElectorate {
  readonly stateUsps: string;
  readonly democraticShare: number;
  readonly ballots: number;
  readonly neitherMajorShare: number;
}

function neitherMajorShareOf(
  facts: ElectorateFacts,
  stateUsps: string,
): number {
  const row = facts.presidentialByState?.find(
    (candidate) => candidate.stateUsps === stateUsps,
  );
  if (!row || !row.totalVotes || row.totalVotes <= 0) return 0;
  const major =
    (row.totalsByParty.democratic ?? 0) + (row.totalsByParty.republican ?? 0);
  return Math.max(0, (row.totalVotes - major) / row.totalVotes);
}

export function statewideElectorate(
  facts: ElectorateFacts,
): StatewideElectorate | null {
  const stateUsps = facts.stateUsps;
  if (!stateUsps) return null;
  const row = facts.calibration.find(
    (candidate) => candidate.stateUsps === stateUsps,
  );
  if (
    !row ||
    row.democraticTwoPartyShare === null ||
    row.totalVotes === null ||
    row.totalVotes <= 0
  )
    return null;
  const conditions = facts.conditions;
  return {
    stateUsps,
    democraticShare: applySwing(
      facts.policy,
      row.democraticTwoPartyShare,
      conditions ? sharedSwing(conditions, facts.region, stateUsps) : 0,
    ),
    ballots: row.totalVotes,
    neitherMajorShare: neitherMajorShareOf(facts, stateUsps),
  };
}

export function majorPartyOf(
  facts: ElectorateFacts,
): "democratic" | "republican" | null {
  const partyId = facts.partyId;
  if (!partyId) return null;
  for (const party of ["democratic", "republican"] as const)
    if (partyId === facts.majorPartyIds[party]) return party;
  return null;
}

export interface SeatElectorate extends StatewideElectorate {
  readonly seatKey: string;
  readonly holderPersonId: EntityId | null;
}

export function congressSeatElectorate(
  facts: ElectorateFacts,
  seatKey: string,
  asOf: IsoDate,
): SeatElectorate | null {
  if (!/^us-(house|senate):/.test(seatKey)) return null;
  const row =
    facts.calibration.find((row) => row.contestKey === seatKey) ?? null;
  const share = facts.seatShare;
  if (
    !row ||
    row.totalVotes === null ||
    row.totalVotes <= 0 ||
    share === null ||
    share === undefined
  )
    return null;
  return {
    seatKey,
    stateUsps: row.stateUsps,
    democraticShare: share,
    ballots: row.totalVotes,
    neitherMajorShare: neitherMajorShareOf(facts, row.stateUsps),
    holderPersonId: seatHolderOn(facts, seatKey, asOf),
  };
}

function seatHolderOn(
  facts: ElectorateFacts,
  seatKey: string,
  asOf: IsoDate,
): EntityId | null {
  let latest: HistoricalEvent | undefined;
  for (const type of [SEAT_TENURE_EVENT, SEAT_VACANCY_EVENT])
    for (const event of facts.events.filter((event) => event.type === type)) {
      if (
        event.occurredAt > asOf ||
        !event.tags.includes(LIVING_WORLD_WRITER_VERSION) ||
        !event.tags.includes(`seat:${seatKey}`)
      )
        continue;
      if (
        !latest ||
        event.occurredAt > latest.occurredAt ||
        (event.occurredAt === latest.occurredAt &&
          event.sequence > latest.sequence)
      )
        latest = event;
    }
  if (latest?.type !== SEAT_TENURE_EVENT) return null;
  return (
    latest.participants.find((p) => p.role === "focus:subject")?.personId ??
    null
  );
}

export function partyAffiliationReadDate(
  currentDate: IsoDate,
  asOf: IsoDate,
): IsoDate {
  return asOf > currentDate ? currentDate : asOf;
}
