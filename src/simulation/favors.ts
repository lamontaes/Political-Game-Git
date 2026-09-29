import { daysBetween, makeIsoDate } from "./dates";
import { eventById } from "./event-index";
import { createStableId } from "./ids";
import { personTrait } from "./people-traits";
import type { StandingBand } from "./relationship-standing";
import type {
  ClaimAudience,
  EntityId,
  FavorKind,
  FavorMotive,
  FavorRecord,
  FavorSubject,
  FavorWeight,
  IsoDate,
  World,
} from "./types";
import { assertWorldIntegrity } from "./world";

/**
 * Help between people, and what it leaves behind.
 *
 * One record for every favor in the world, whoever gave it: a neighbor's help
 * after a fire, an endorsement, a job for somebody's cousin, an appointment to
 * a board. Appointments and patronage write through `recordFavor` too, so
 * there is one favor record and not two.
 *
 * The record stores what happened and nothing else. How much the receiver
 * still feels they owe, and how much the giver now expects, are read from it
 * on demand: they start from how much the help mattered, drift apart with
 * time, bend to each person's temperament, and are settled by help that goes
 * back the other way. Nothing here is a meter a player is shown, and nothing
 * here decides that anybody asks for anything; a person who believes they are
 * owed decides that for themselves, elsewhere, from their own need.
 */

export interface RecordFavorInput {
  readonly stableKey: string;
  readonly giverPersonId: EntityId;
  readonly receiverPersonId: EntityId;
  readonly kind: FavorKind;
  readonly description: string;
  readonly givenAt: string;
  readonly eventId: EntityId;
  readonly subject: FavorSubject;
  readonly motive: FavorMotive;
  readonly weight: FavorWeight;
  readonly audience: ClaimAudience;
  readonly witnessPersonIds: readonly EntityId[];
  readonly inReturnForFavorId: EntityId | null;
  readonly undertakingId: EntityId | null;
}

const FAVOR_NAMESPACES = ["public", "political", "private", "personal"];
const MOTIVES: readonly FavorMotive[] = [
  "kindness",
  "shared-belief",
  "trade",
  "corruption",
  "unknown",
];
const WEIGHTS: readonly FavorWeight[] = [
  "slight",
  "moderate",
  "great",
  "life-changing",
];
const AUDIENCES: readonly ClaimAudience[] = ["private", "limited", "public"];

/** Every favor on record, oldest first. */
export function favorRecords(world: World): readonly FavorRecord[] {
  return world.history.favors ?? [];
}

/** Records that one person helped another. */
export function recordFavor(world: World, input: RecordFavorInput): World {
  const givenAt = makeIsoDate(input.givenAt);
  if (givenAt > world.currentDate) {
    throw new Error("A favor cannot be recorded before it was given.");
  }
  if (!world.people[input.giverPersonId]) {
    throw new Error(`A favor names a missing giver: ${input.giverPersonId}`);
  }
  if (!world.people[input.receiverPersonId]) {
    throw new Error(
      `A favor names a missing receiver: ${input.receiverPersonId}`,
    );
  }
  if (input.giverPersonId === input.receiverPersonId) {
    throw new Error("Nobody does themselves a favor, on this record.");
  }
  const [namespace, rest] = input.kind.split(":", 2);
  if (!FAVOR_NAMESPACES.includes(namespace ?? "") || !rest) {
    throw new Error(`Invalid favor kind: ${input.kind}`);
  }
  if (!MOTIVES.includes(input.motive)) {
    throw new Error(`Invalid favor motive: ${String(input.motive)}`);
  }
  if (!WEIGHTS.includes(input.weight)) {
    throw new Error(`Invalid favor weight: ${String(input.weight)}`);
  }
  if (!AUDIENCES.includes(input.audience)) {
    throw new Error(`Invalid favor audience: ${String(input.audience)}`);
  }
  if (input.description.trim().length === 0) {
    throw new Error("A favor must say what was done.");
  }
  const event = eventById(world, input.eventId);
  if (!event || event.occurredAt > givenAt) {
    throw new Error("A favor must point at the event that did it.");
  }
  for (const personId of input.witnessPersonIds) {
    if (!world.people[personId]) {
      throw new Error(`A favor names a missing witness: ${personId}`);
    }
  }
  const existing = favorRecords(world);
  if (existing.some((record) => record.stableKey === input.stableKey)) {
    throw new Error(`Duplicate favor stable key: ${input.stableKey}`);
  }
  if (input.inReturnForFavorId !== null) {
    const earlier = existing.find(
      (record) => record.id === input.inReturnForFavorId,
    );
    if (
      !earlier ||
      earlier.giverPersonId !== input.receiverPersonId ||
      earlier.receiverPersonId !== input.giverPersonId
    ) {
      throw new Error(
        "A favor can only return an earlier favor that went the other way.",
      );
    }
  }
  if (
    input.undertakingId !== null &&
    !world.history.lifeCommitments.some(
      (record) => record.id === input.undertakingId && record.undertaking,
    )
  ) {
    throw new Error(
      `A favor names a missing undertaking: ${input.undertakingId}`,
    );
  }
  const record: FavorRecord = {
    id: createStableId("favor", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    giverPersonId: input.giverPersonId,
    receiverPersonId: input.receiverPersonId,
    kind: input.kind,
    description: input.description,
    givenAt,
    eventId: input.eventId,
    subject: { ...input.subject },
    motive: input.motive,
    weight: input.weight,
    audience: input.audience,
    witnessPersonIds: [...new Set(input.witnessPersonIds)].sort(),
    inReturnForFavorId: input.inReturnForFavorId,
    undertakingId: input.undertakingId,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      favors: [...existing, record],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

/* -------------------------------------------------------------------------- */
/* What a favor leaves behind                                                  */
/* -------------------------------------------------------------------------- */

/**
 * How much it mattered, as steps on the relationship bands.
 *
 * PLACEHOLDER (set by hand, not measured): the step each weight starts at.
 * It affects how strongly a receiver feels bound and a giver expects a return,
 * which later decides whether someone asks and how a request is answered.
 */
const WEIGHT_STEPS: Readonly<Record<FavorWeight, number>> = {
  slight: 1,
  moderate: 2,
  great: 3,
  "life-changing": 4,
};

/**
 * How many days it takes a receiver's felt debt to halve, by weight.
 *
 * PLACEHOLDER (set by hand from related measurements, not a measured rate).
 * Research 3, section 5, item 1: returning a small favor between people fell
 * 64 percent over one week (Burger and others, 1997, as reported by Chuan,
 * Kessler and Milkman, 2018), and former patients' giving to a hospital fell
 * 30 to 36 percent for each extra 30 days. Neither is a rate between friends or
 * allies. A small favor is therefore read as fading within weeks and a large
 * one over months to years. Sent to the research queue.
 */
const DEBT_HALF_LIFE_DAYS: Readonly<Record<FavorWeight, number>> = {
  slight: 7,
  moderate: 90,
  great: 365,
  "life-changing": 3650,
};

/**
 * How many days it takes a giver's expectation to grow by one step.
 *
 * PLACEHOLDER (set by hand, no measured rate). Flynn (2003) found givers value
 * a favor more as time passes and receivers less; the paper's rate is unread
 * (Research 3, section 8). Only a giver who wanted something back grows an
 * expectation; kindness expects nothing.
 */
const EXPECTATION_GROWTH_DAYS = 365;

/** A trait pole stretches or shortens how long a debt is felt. */
function receiverFadeFactor(world: World, receiverId: EntityId): number {
  // Somebody who follows through keeps an obligation in mind longer; somebody
  // who lets things slip loses it sooner. Hand-set, doubling or halving.
  const reliability = personTrait(world, receiverId, "reliability").value;
  return reliability > 0 ? 2 : reliability < 0 ? 0.5 : 1;
}

function motiveExpects(motive: FavorMotive): number {
  switch (motive) {
    case "kindness":
      return 0;
    case "shared-belief":
      // Expects the cause served rather than a personal return.
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

export interface FavorStanding {
  /** The one who received help, and the one who gave it. */
  readonly receiverPersonId: EntityId;
  readonly giverPersonId: EntityId;
  /** How bound the receiver still feels, in words, not a number. */
  readonly receiverDebt: StandingBand;
  /** How much the giver now expects back. */
  readonly giverExpectation: StandingBand;
  /** The favors this reads, oldest first. Returned ones are left out. */
  readonly openFavorIds: readonly EntityId[];
}

/**
 * What the receiver feels they owe the giver, and what the giver expects, as
 * of a date.
 *
 * Read from the favors between them and nothing else. A favor that has been
 * returned (a later favor names it) leaves nothing on either side. Other help
 * that went back the other way offsets what is owed step for step, because a
 * person who has since done a lot for their patron feels the account is less
 * one-sided even without naming it.
 */
export function favorStandingBetween(
  world: World,
  receiverPersonId: EntityId,
  giverPersonId: EntityId,
  asOf: IsoDate = world.currentDate,
): FavorStanding {
  const favors = favorRecords(world).filter((record) => record.givenAt <= asOf);
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

  const fade = receiverFadeFactor(world, receiverPersonId);
  let debt = 0;
  let expectation = 0;
  for (const record of given) {
    const elapsed = Math.max(0, daysBetween(record.givenAt, asOf));
    const start = WEIGHT_STEPS[record.weight];
    const halfLife = DEBT_HALF_LIFE_DAYS[record.weight] * fade;
    debt += start * Math.pow(0.5, elapsed / halfLife);
    expectation +=
      motiveExpects(record.motive) *
      Math.min(start + elapsed / EXPECTATION_GROWTH_DAYS, start + 1);
  }
  return {
    receiverPersonId,
    giverPersonId,
    receiverDebt: toBand(Math.max(0, debt - backTheOtherWay)),
    giverExpectation: toBand(Math.max(0, expectation - backTheOtherWay)),
    openFavorIds: given.map((record) => record.id),
  };
}

/** Every favor one person has given another, either way, oldest first. */
export function favorsBetween(
  world: World,
  firstPersonId: EntityId,
  secondPersonId: EntityId,
): readonly FavorRecord[] {
  return favorRecords(world).filter(
    (record) =>
      (record.giverPersonId === firstPersonId &&
        record.receiverPersonId === secondPersonId) ||
      (record.giverPersonId === secondPersonId &&
        record.receiverPersonId === firstPersonId),
  );
}
