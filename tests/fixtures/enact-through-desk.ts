/*
 * The one honest way to make a bill law in a test, kept apart from
 * small-world.ts so a file that only needs a small world does not load the
 * legislative session code.
 *
 * It replaces the shortcut some tests took around the executive (an authored
 * "signed" status, #1478). The bill goes to the actual desk, the actual
 * officeholder decides the bound matter, and only then is the enactment
 * recorded, the way #1568 does it.
 */
import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import {
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
} from "../../src/simulation/legislation";
import type { LegislativeProcedureContext } from "../../src/simulation/legislation-scenarios";
import { legislativeBlueprintForMeasure } from "../../src/simulation/governing/legislative-clock";
import {
  decideGoverningMatter,
  executiveDesk,
  governingMatters,
  governorOfficeForJurisdiction,
} from "../../src/simulation/governing/state-governing";
import { BILL_SIGN } from "../../src/simulation/governing/governor-bill-decision";
import { isCongressMeasure } from "../../src/simulation/governing/congress-chambers";
import { currentPresidentOf } from "../../src/simulation/crisis/offices";
import type { EntityId, IsoDate, World } from "../../src/simulation/types";

export interface EnactThroughDeskOptions {
  /**
   * The procedure context to carry the bill to the desk with. Without one, the
   * bill must already be on the desk or past it.
   */
  readonly context?: LegislativeProcedureContext;
  /** The enactment's effective date; the world's date when omitted. */
  readonly effectiveAt?: IsoDate;
}

/**
 * Makes a filed bill law through the real executive desk.
 *
 * With a procedure context, the bill first moves through its chambers by the
 * canonical steps (never an amendment). At the desk, the seated governor, or
 * the President for an Act of Congress, decides the bound matter: the world's
 * control passes to that officeholder for the one decision and back again, as
 * #1568 does. A desk with nobody seated throws; it is never skipped.
 */
export function enactThroughDesk(
  start: World,
  measureId: EntityId,
  options: EnactThroughDeskOptions = {},
): World {
  let world = start;
  const context = options.context ? { ...options.context, measureId } : null;
  for (let guard = 0; guard < 40; guard += 1) {
    const phase = measurePosition(world, measureId).phase;
    if (phase === "awaiting-executive" || phase === "awaiting-enactment") break;
    if (!context)
      throw new Error(
        `The bill is at '${phase}', not the desk; pass its procedure context.`,
      );
    const step = availableMeasureSteps(world, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step) throw new Error(`No canonical next step at '${phase}'.`);
    world = applyLegislativeStep(context, world, step).world;
  }

  if (measurePosition(world, measureId).phase === "awaiting-executive")
    world = decideAtDesk(world, measureId);

  const phase = measurePosition(world, measureId).phase;
  if (phase !== "awaiting-enactment")
    throw new Error(`The desk left the bill at '${phase}', not signed.`);
  return recordEnactment(world, {
    stableKey: `measure:${measureId}:enactment`,
    measureId,
    effectiveAt: options.effectiveAt ?? world.currentDate,
  });
}

/**
 * The seated governor, or the President for an Act of Congress, decides the
 * bill waiting at the desk. Exported for procedure tests that carry the bill
 * the rest of the way by their own steps.
 */
export function decideAtDesk(world: World, measureId: EntityId): World {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === measureId,
  );
  if (!measure) throw new Error("This bill is not on record.");
  const blueprint = legislativeBlueprintForMeasure(world, measure);
  const holderPersonId = isCongressMeasure(measure)
    ? (currentPresidentOf(world)?.personId ?? null)
    : (governorOfficeForJurisdiction(world, blueprint.pack.jurisdictionKey)
        ?.holderPersonId ?? null);
  if (!holderPersonId)
    throw new Error(
      "No executive is seated to decide this bill; seat one (smallWorld offices) first.",
    );
  const control = world.control;
  const asHolder: World = {
    ...world,
    control: { kind: "person", personId: holderPersonId },
  };
  const atDesk = executiveDesk(asHolder, measure, blueprint);
  const matter = governingMatters(atDesk).find(
    (row) => row.measureId === measureId && row.status === "open",
  );
  if (!matter) throw new Error("The desk opened no matter for this bill.");
  const decision = decideGoverningMatter(atDesk, matter.id, BILL_SIGN);
  if (!decision.ok) throw new Error(`The desk refused: ${decision.reason}`);
  return { ...decision.world, control };
}
