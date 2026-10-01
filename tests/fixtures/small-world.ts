/*
 * One shared, fast test world, and the one honest way to make a bill law.
 *
 * Most slow test files are slow for the same reason: each builds a whole
 * opening life (households, a town's population, employers, its officials)
 * when the case only needs somebody who lives in a place, an office, or a
 * policy question. `smallWorld` builds exactly what is asked for, and only from
 * the existing builders: `createScenarioWorld` for the residents, the
 * production policy catalog for the questions, and
 * `ensureStateExecutiveIncumbent` for a seated governor. It adds no simulation
 * rule of its own. One rule serves all 56 places: a place is named by its
 * state or territory, or by a life-place key, and every one resolves the same
 * way.
 *
 * `enactThroughDesk` replaces the shortcut some tests took around the
 * executive (an authored "signed" status, #1478). The bill goes to the actual
 * desk, the actual officeholder decides the bound matter, and only then is the
 * enactment recorded, the way #1568 does it.
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
import { createScenarioWorld } from "../../src/simulation/demo";
import {
  lifePlaceByKey,
  searchLifePlaces,
  stateJurisdictionForKey,
  type LifePlace,
} from "../../src/simulation/life-places";
import { ensureStateExecutiveIncumbent } from "../../src/simulation/nationwide-world/state-executives";
import { ensureStateLegislatureOpening } from "../../src/simulation/nationwide-world/state-legislature-opening";
import { ensureLivingWorldOpening } from "../../src/simulation/living-world/opening";
import { establishOpeningOfficeholders } from "../../src/presentation/opening-officeholders";
import { ensureWorldStartingConditions } from "../../src/simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../../src/simulation/world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../src/simulation/world-setup/types";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import { createWorld } from "../../src/simulation/world";
import { makeIsoDate } from "../../src/simulation/dates";
import type { EntityId, IsoDate, World } from "../../src/simulation/types";

/**
 * Offices `smallWorld` can seat, each through its existing builder, in the
 * order a new game's opening seats them whatever order they are asked in.
 * "congress" is the opening's national executives (President, Vice President,
 * Chief Justice) and both chambers of Congress. "state-legislature" is the
 * home state's legislature. Both first record the world's political starting
 * conditions, as the opening does, because seats' leans are drawn from them.
 */
export type SmallWorldOffice = "congress" | "governor" | "state-legislature";

export interface SmallWorldOptions {
  /**
   * A state or territory ("OH", "US-OH", "PR") or a life-place key
   * ("lexington-fayette"). A state resolves to its first locality, the same
   * place `firstLocality` names.
   */
  readonly place: string;
  /** The world's starting date; the place's own opening date when omitted. */
  readonly date?: string;
  /** Residents to generate: default 4, at least 3 (the scenario builder seats a household). The first is the controlled person. */
  readonly people?: number;
  readonly offices?: readonly SmallWorldOffice[];
  /**
   * Policy questions the case needs, by stable key; each resolves to its
   * proposition in `propositionIds`. Every small world carries the production
   * catalog and its state, so the place's starting law reads. An unknown key
   * throws.
   */
  readonly laws?: readonly string[];
  /** Fixed by default, so every run of a case builds the same world. */
  readonly seed?: string;
}

export interface SmallWorld {
  readonly world: World;
  readonly place: LifePlace;
  /** The locality the residents live in. */
  readonly jurisdictionId: EntityId;
  /** The place's state or territory. */
  readonly stateJurisdictionId: EntityId;
  readonly stateUsps: string;
  /** The first resident, who holds control. */
  readonly personId: EntityId;
  /** Each requested question's proposition, by stable key. */
  readonly propositionIds: Readonly<Record<string, EntityId>>;
}

export const SMALL_WORLD_SEED = "groundwork-g1-small-world";

/** The life place a test names, resolved one way for every place. */
export function smallWorldPlace(place: string): LifePlace {
  const usps = place.replace(/^US-/, "").toUpperCase();
  if (/^[A-Z]{2}$/.test(usps)) {
    const found = searchLifePlaces("", 1, {
      stateJurisdictionKey: `US-${usps}`,
      scope: "locality",
    })[0];
    if (!found) throw new Error(`No locality found for ${usps}.`);
    return found;
  }
  const found = lifePlaceByKey(place);
  if (!found) throw new Error(`No life place with key '${place}'.`);
  return found;
}

/** The smallest world a case needs, built only from existing builders. */
export function smallWorld(options: SmallWorldOptions): SmallWorld {
  const place = smallWorldPlace(options.place);
  const context = options.date
    ? {
        ...place.context,
        initialMoment: {
          ...place.context.initialMoment,
          date: makeIsoDate(options.date),
        },
      }
    : place.context;
  const residents = createScenarioWorld(
    options.seed ?? SMALL_WORLD_SEED,
    context,
    { peopleCount: options.people ?? 4 },
  );
  const stateKey = place.stateJurisdictionKey;
  if (!stateKey) throw new Error(`'${place.key}' has no state or territory.`);
  const state = stateJurisdictionForKey(stateKey);
  if (!state) throw new Error(`No state jurisdiction for ${stateKey}.`);
  const stateUsps = stateKey.replace(/^US-/, "");

  // As #1568 builds its controlled world: the residents, their state, and the
  // production catalog, so questions and the place's starting law resolve.
  let world = createWorld({
    seed: residents.seed,
    currentDate: residents.currentDate,
    currentMoment: residents.currentMoment,
    people: residents.personOrder.map((id) => residents.people[id]!),
    jurisdictions: [
      ...residents.jurisdictionOrder.map((id) => residents.jurisdictions[id]!),
      ...(residents.jurisdictions[state.id] ? [] : [state]),
    ],
    policyCatalog: createProductionPolicyCatalog(),
  });

  const personId = world.personOrder[0];
  if (!personId) throw new Error("The small world produced no residents.");
  world = { ...world, control: { kind: "person", personId } };

  const offices = new Set(options.offices ?? []);
  const conditioned = (at: World) =>
    ensureWorldStartingConditions(at, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    });
  if (offices.has("congress"))
    world = ensureLivingWorldOpening(
      establishOpeningOfficeholders(conditioned(world), personId, {
        includeVicePresident: true,
      }),
      personId,
    );
  if (offices.has("governor"))
    world = ensureStateExecutiveIncumbent(world, personId, stateUsps);
  if (offices.has("state-legislature"))
    world = ensureStateLegislatureOpening(
      conditioned(world),
      personId,
      stateUsps,
    );

  const propositionIds: Record<string, EntityId> = {};
  for (const key of options.laws ?? []) {
    const id = world.policyCatalog.propositionOrder.find(
      (candidate) =>
        world.policyCatalog.propositions[candidate]!.stableKey === key,
    );
    if (!id) throw new Error(`No policy question '${key}' in the catalog.`);
    propositionIds[key] = id;
  }

  return {
    world,
    place,
    jurisdictionId: context.jurisdiction.id,
    stateJurisdictionId: state.id,
    stateUsps,
    personId,
    propositionIds,
  };
}

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

function decideAtDesk(world: World, measureId: EntityId): World {
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
