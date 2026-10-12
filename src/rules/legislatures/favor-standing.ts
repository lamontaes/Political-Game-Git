import { inferredProtegeOf, type ProtegeFacts } from "./protege-inference";
import type {
  EntityId,
  IsoDate,
  FavorRecord,
  FavorWeight,
  FavorMotive,
} from "../../simulation/types";
import type { StandingBand } from "../../simulation/relationship-standing";
import type { FavorStanding } from "../../simulation/favors";
import { daysBetween } from "../offices/calendar";
export interface FavorFacts extends ProtegeFacts {
  readonly onDate: IsoDate;
  readonly favors: readonly FavorRecord[];
  readonly reliability: ReadonlyMap<EntityId, number>;
}
const WEIGHT_STEPS: Readonly<Record<FavorWeight, number>> = {
  slight: 1,
  moderate: 2,
  great: 3,
  "life-changing": 4,
};

const DEBT_HALF_LIFE_DAYS: Readonly<Record<FavorWeight, number>> = {
  slight: 10,
  moderate: 52,
  great: 104,
  "life-changing": 210,
};

const HALF_LIFE_RANGE_DAYS = { fastest: 10, slowest: 210 } as const;

function receiverHalfLife(
  facts: FavorFacts,
  receiverId: EntityId,
  weight: FavorWeight,
): number {
  const reliability = facts.reliability.get(receiverId) ?? 0;
  const factor = reliability > 0 ? 2 : reliability < 0 ? 0.5 : 1;
  return Math.min(
    HALF_LIFE_RANGE_DAYS.slowest,
    Math.max(
      HALF_LIFE_RANGE_DAYS.fastest,
      DEBT_HALF_LIFE_DAYS[weight] * factor,
    ),
  );
}

const LASTING_STEPS: Readonly<Record<FavorWeight, number>> = {
  slight: 0,
  moderate: 0,
  great: 0.5,
  "life-changing": 1.5,
};

function lastingSteps(
  facts: FavorFacts,
  receiverId: EntityId,
  weight: FavorWeight,
): number {
  const reliability = facts.reliability.get(receiverId) ?? 0;
  return LASTING_STEPS[weight] * (reliability < 0 ? 0.5 : 1);
}

const EXPECTATION_CAP = 2;

function motiveExpects(motive: FavorMotive): number {
  switch (motive) {
    case "kindness":
      return 0;
    case "shared-belief":
      return 0.5;
    case "trade":
    case "corruption":
    case "unknown":
      return 1;
  }
}

function toBand(steps: number): StandingBand {
  if (steps >= 3) return "strong";
  if (steps >= 1.5) return "marked";
  if (steps >= 0.5) return "slight";
  return "none";
}

function directFavorStandingBetween(
  facts: FavorFacts,
  receiverPersonId: EntityId,
  giverPersonId: EntityId,
  asOf: IsoDate = facts.onDate,
): FavorStanding {
  const favors = facts.favors.filter((record) => record.givenAt <= asOf);
  const returned = new Set(
    favors
      .map((record) => record.inReturnForFavorId)
      .filter((id): id is EntityId => id !== null),
  );
  const given = favors.filter(
    (record) =>
      record.giverPersonId === giverPersonId &&
      record.receiverPersonId === receiverPersonId &&
      !returned.has(record.id),
  );
  const backTheOtherWay = favors
    .filter(
      (record) =>
        record.giverPersonId === receiverPersonId &&
        record.receiverPersonId === giverPersonId &&
        record.inReturnForFavorId === null,
    )
    .reduce((sum, record) => sum + WEIGHT_STEPS[record.weight], 0);
  let debt = 0;
  let expectation = 0;
  for (const record of given) {
    const elapsed = Math.max(0, daysBetween(record.givenAt, asOf));
    const start = WEIGHT_STEPS[record.weight];
    const halfLife = receiverHalfLife(facts, receiverPersonId, record.weight);
    const remaining = Math.pow(0.5, elapsed / halfLife);
    const lasting = lastingSteps(facts, receiverPersonId, record.weight);
    debt += lasting + (start - lasting) * remaining;
    expectation +=
      motiveExpects(record.motive) *
      start *
      Math.min(EXPECTATION_CAP, 1 + (1 - remaining));
  }
  return {
    receiverPersonId,
    giverPersonId,
    receiverDebt: toBand(Math.max(0, debt - backTheOtherWay)),
    giverExpectation: toBand(Math.max(0, expectation - backTheOtherWay)),
    openFavorIds: given.map((record) => record.id),
  };
}

function oneBandLower(band: StandingBand): StandingBand {
  if (band === "strong") return "marked";
  if (band === "marked") return "slight";
  return "none";
}

export function favorStandingBetween(
  facts: FavorFacts,
  receiverPersonId: EntityId,
  giverPersonId: EntityId,
  asOf: IsoDate = facts.onDate,
): FavorStanding {
  const direct = directFavorStandingBetween(
    facts,
    receiverPersonId,
    giverPersonId,
    asOf,
  );
  const inferred = inferredProtegeOf(
    facts,
    receiverPersonId,
    giverPersonId,
    asOf,
  );
  if (!inferred) return direct;
  const elderStanding = directFavorStandingBetween(
    facts,
    receiverPersonId,
    inferred.elderPersonId,
    asOf,
  );
  const shared = oneBandLower(elderStanding.receiverDebt);
  const rank: Readonly<Record<StandingBand, number>> = {
    none: 0,
    slight: 1,
    marked: 2,
    strong: 3,
  };
  if (rank[shared] <= rank[direct.receiverDebt]) return direct;
  return { ...direct, receiverDebt: shared };
}

// stopgapId: "SG-P14-legislatures-favor-decay"
