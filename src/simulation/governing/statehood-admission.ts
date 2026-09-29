import statehood from "../../../data/research/congress/statehood-seats.json" with { type: "json" };
import { addDays } from "../dates";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type { EntityId, IsoDate, World } from "../types";
import { lawInForce } from "./law-in-force";

/**
 * WHEN A PLACE BECOMES A STATE.
 *
 * The law on statehood for a nonvoting place takes effect on the day its Act
 * says, but the place is not a state that day: the real bills have the
 * President certify the enactment, the Mayor call the first elections, and the
 * President proclaim admission once the elections are certified, each within a
 * limit the bill names. The days come from
 * `data/research/congress/statehood-seats.json`, not from this file; the seats
 * (`living-world/statehood-seats.ts`) and the money
 * (`public-budgets/statehood-funds.ts`) both move on the admission date.
 */

/** The policy question whose enacted law admits the place. */
export const STATEHOOD_QUESTION: string = statehood.questionKey;

/** The place the law would make a state, from the data file. */
export function statehoodPlace(): string {
  return statehood.place;
}

/**
 * The days between the law taking effect and admission: each stage the bill
 * bounds takes its full allowance (HARDWIRED, the data file says why).
 */
export const STATEHOOD_ADMISSION_DAYS: number =
  statehood.admission.stages.reduce((total, stage) => total + stage.days, 0);

const questionIds = new WeakMap<object, EntityId | null>();

function statehoodQuestionId(world: World): EntityId | null {
  const catalog = world.policyCatalog as object | undefined;
  if (!catalog) return null;
  if (questionIds.has(catalog)) return questionIds.get(catalog)!;
  const found =
    Object.values(world.policyCatalog.propositions ?? {}).find(
      (definition) => definition.stableKey === STATEHOOD_QUESTION,
    )?.id ?? null;
  questionIds.set(catalog, found);
  return found;
}

/**
 * The day an enacted law on statehood took effect, or null while none has.
 * The starting law is left out: no place began as a state it was not.
 */
export function statehoodLawTookEffect(
  world: World,
  asOf: IsoDate = world.currentDate,
): IsoDate | null {
  if (!world.history.legislativeEnactments?.length) return null;
  const propositionId = statehoodQuestionId(world);
  if (!propositionId) return null;
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    propositionId,
    asOf,
    "enacted-only",
  );
  return law && law.answer === "yes" && law.origin === "enacted"
    ? law.operativeAt
    : null;
}

/**
 * The day the place was admitted, or null until it has been by `asOf`: the
 * law's effective day plus the days its bill allows for certifying,
 * proclaiming the elections and proclaiming admission.
 */
export function statehoodAdmittedOn(
  world: World,
  asOf: IsoDate = world.currentDate,
): IsoDate | null {
  const tookEffect = statehoodLawTookEffect(world, asOf);
  if (!tookEffect) return null;
  const admitted = addDays(tookEffect, STATEHOOD_ADMISSION_DAYS);
  return admitted <= asOf ? admitted : null;
}
