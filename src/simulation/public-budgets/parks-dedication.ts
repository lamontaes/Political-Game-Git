import finances from "../../../data/research/money/state-local-finances-2022.json" with { type: "json" };
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import type { EntityId, IsoDate, World } from "../types";
import { propositionIdFor } from "./fiscal";
import { PARKS_DEDICATION_QUESTION, SPENDING_QUESTION_EFFECTS } from "./rules";

/**
 * DEDICATED PARKS FUNDING: what the parks line gains or loses, as a share of
 * what the place spends on parks.
 *
 * The money is the state law's cost table (`SPENDING_QUESTION_EFFECTS`,
 * `lawSpendingForMonth`): a dedication that was not in force when the game
 * began adds the same dollars per resident to the state's parks line every
 * month it stands, and a repeal of one the game began with takes them away.
 * Park access moves with the size of that change against the whole parks
 * budget the place's residents live under, state and local together, the
 * base the research fitted access on (Census Bureau 2022 finances, fiscal 2022
 * dollars per 2023 resident). A place the Census file does not carry
 * (the territories) reads the national figure, ESTIMATED FROM AVERAGE.
 */

const PLACES = finances.places as unknown as Readonly<
  Record<
    string,
    {
      readonly stateAndLocalPerResident?: {
        readonly parksAndRecreation: number;
      };
    }
  >
>;

/** State and local parks spending per resident where the law began, in dollars. */
export function parksSpendingPerResident(placeKey: string): number {
  return (
    PLACES[placeKey]?.stateAndLocalPerResident?.parksAndRecreation ??
    PLACES.US!.stateAndLocalPerResident!.parksAndRecreation
  );
}

/**
 * The percent the parks line has been moved by the law in force on `asOf`,
 * against what the place spends on parks: 0 while the law is where the place
 * began, positive after a dedication, negative after a repeal.
 */
export function parksLawAddedPct(
  world: World,
  jurisdictionId: EntityId,
  placeKey: string,
  asOf: IsoDate,
): number {
  const effect = SPENDING_QUESTION_EFFECTS.find(
    (row) => row.questionKey === PARKS_DEDICATION_QUESTION,
  );
  const propositionId = propositionIdFor(world, PARKS_DEDICATION_QUESTION);
  if (!effect || !propositionId) return 0;
  const now = lawInForce(world, jurisdictionId, propositionId, asOf)?.answer;
  const began = lawInForceAtStart(world, jurisdictionId, propositionId, asOf);
  const perResident =
    began === "no" && now === "yes"
      ? effect.toYes
      : began === "yes" && now === "no"
        ? effect.toNo
        : null;
  return perResident === null
    ? 0
    : (perResident / parksSpendingPerResident(placeKey)) * 100;
}
