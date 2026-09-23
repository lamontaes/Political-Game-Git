import { municipalSeats } from "../simulation/municipal-public-work";
import { personName } from "../simulation/people";
import {
  canStartRecallPetition,
  municipalRecallRule,
  recallPetitions,
  startRecallPetition,
  type RecallPetition,
} from "../simulation/recall";
import type { EntityId, World } from "../simulation/types";
import { proseDate } from "./prose-dates";

export interface RecallTargetView {
  readonly personId: EntityId;
  readonly name: string;
  readonly seatLabel: string | null;
  /** Null when a petition can be started; otherwise why not. */
  readonly refusal: string | null;
}

export interface RecallView {
  /** Why nobody here can be recalled, when the law gives no recall. */
  readonly unavailable: string | null;
  /** What the law asks of a petition, in one line. */
  readonly rule: string | null;
  readonly targets: readonly RecallTargetView[];
  readonly petitions: readonly string[];
}

function petitionLine(world: World, petition: RecallPetition): string {
  const person = world.people[petition.targetPersonId];
  const name = person ? personName(person) : "A former official";
  switch (petition.phase) {
    case "circulating":
      return `${name}: a recall petition is circulating until ${proseDate(petition.closesAt)}.`;
    case "failed-to-qualify":
      return `${name}: the recall petition did not gather enough signatures.`;
    case "awaiting-election":
      return `${name}: the recall election is on ${proseDate(petition.electionAt!)}.`;
    case "removed":
      return `${name}: removed by the voters in a recall election.`;
    case "retained":
      return `${name}: kept in office by the voters in a recall election.`;
    case "lapsed":
      return `${name}: the recall lapsed when they left office.`;
  }
}

/** What a resident can see and do about recalling their town's officials. */
export function projectRecall(
  world: World,
  governmentKey: string,
  petitionerPersonId: EntityId,
): RecallView {
  const rule = municipalRecallRule(governmentKey);
  const petitions = recallPetitions(world)
    .filter((petition) => petition.governmentKey === governmentKey)
    .map((petition) => petitionLine(world, petition));
  if (!rule.available)
    return { unavailable: rule.reason, rule: null, targets: [], petitions };
  const targets = municipalSeats(world, governmentKey).flatMap((seat) => {
    const person = world.people[seat.personId];
    if (!person || seat.personId === petitionerPersonId) return [];
    const check = canStartRecallPetition(world, {
      petitionerPersonId,
      governmentKey,
      targetPersonId: seat.personId,
    });
    return [
      {
        personId: seat.personId,
        name: personName(person),
        seatLabel: seat.seatLabel ?? null,
        refusal: check.allowed ? null : check.reason,
      },
    ];
  });
  const days = `A petition circulates for ${rule.circulationDays} days`;
  return {
    unavailable: null,
    rule: rule.groundsRequired
      ? `${days}, and the law requires stated grounds.`
      : `${days}.`,
    targets,
    petitions,
  };
}

export function startProjectedRecallPetition(
  world: World,
  governmentKey: string,
  petitionerPersonId: EntityId,
  targetPersonId: EntityId,
): World {
  return startRecallPetition(world, {
    petitionerPersonId,
    governmentKey,
    targetPersonId,
  });
}
