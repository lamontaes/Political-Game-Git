import type { ChamberRule } from "./legislature-rules";
import { SeededRng } from "./rng";
import type { EntityId, World } from "./types";

/**
 * What number a bill gets, decided by the world rather than by an author.
 *
 * A legislature does not hand out the same bill number to every life that ever
 * opens a session there. Before this, one did: production copied an authored
 * scenario's designation straight onto the measure it filed, so every Kentucky
 * character in every save worked on "HB 214" forever, and a screen could be
 * written expecting that string to exist.
 *
 * The number now comes from the jurisdiction's own numbering state in the
 * player's world:
 *
 *   - the prefix is the chamber's own, read off the chamber record the rule
 *     pack carries — "HB" is a chamber label, not a bill's identity, and it
 *     stays. It is read rather than inferred from the chamber key, so a
 *     legislature whose chambers are named differently numbers its bills the
 *     way it names them instead of raising;
 *   - where that chamber's numbering stands when this session opens is drawn
 *     once from the world's seed, so two lives started differently do not open
 *     on the same bill number;
 *   - each further measure filed in that chamber takes the next number up,
 *     which is what makes a save's second bill follow its first.
 *
 * Determinism is the property that matters: the same seed and the same filed
 * history produce the same number every time, because both inputs are facts
 * about the world and neither is a random draw at call time. A world that
 * already contains a measure keeps it — this is only consulted when a new one
 * is actually being filed.
 *
 * HB 214 is therefore still possible. It is possible the way any number is:
 * because this jurisdiction's numbering in this particular world arrived there.
 */

/**
 * Where a chamber's numbering sits when a world's first session opens.
 *
 * Real chambers do not begin a session at 1 and they do not run to four
 * digits in a short one, so the opening number is drawn from the band a
 * session's bills actually fall in. The band is content, not a claim about any
 * particular legislature's practice.
 */
const OPENING_NUMBER_MINIMUM = 12;
const OPENING_NUMBER_MAXIMUM_EXCLUSIVE = 640;

export interface MeasureDesignationInput {
  readonly jurisdictionId: EntityId;
  /** The chamber receiving the introduction, from its own rule pack. */
  readonly originChamber: ChamberRule;
}

/**
 * The designation the next measure filed in this chamber would carry.
 *
 * Pure: it reads the world and returns a string, and the caller hands it to
 * `introduceMeasure`, which is what actually writes.
 */
export function nextMeasureDesignation(
  world: World,
  input: MeasureDesignationInput,
): string {
  const prefix = input.originChamber.billDesignationPrefix;
  const originChamberKey = input.originChamber.chamberKey;
  const opening = new SeededRng(world.seed)
    .fork(`measure-numbering:${input.jurisdictionId}:${originChamberKey}`)
    .integer(OPENING_NUMBER_MINIMUM, OPENING_NUMBER_MAXIMUM_EXCLUSIVE);

  const filed = world.history.legislativeMeasures ?? [];
  const alreadyInThisChamber = filed.filter(
    (record) =>
      record.jurisdictionId === input.jurisdictionId &&
      record.originChamberKey === originChamberKey,
  ).length;

  // Two bills in one chamber never share a number. The count is the ordinary
  // increment; the loop is what keeps that true when a world already holds a
  // measure numbered by some other route, such as a save filed before this
  // existed or a bill the player drafted themselves.
  const taken = new Set(
    filed
      .filter((record) => record.jurisdictionId === input.jurisdictionId)
      .map((record) => record.designation),
  );
  let number = opening + alreadyInThisChamber;
  let designation = `${prefix} ${number}`;
  while (taken.has(designation)) {
    number += 1;
    designation = `${prefix} ${number}`;
  }
  return designation;
}
