/*
 * One shared, fast test world.
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
 * Its companion, `enactThroughDesk` in enact-through-desk.ts, makes a bill
 * law only through the real executive desk.
 */
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
import {
  createHousehold,
  startHouseholdMembership,
} from "../../src/simulation/life";
import type { EntityId, World } from "../../src/simulation/types";

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
  /** Put the generated residents in one primary household through the existing writers. */
  readonly household?: boolean;
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

  if (options.household) {
    const provenance = {
      kind: "authored" as const,
      note: "Controlled small-world household.",
    };
    world = createHousehold(world, {
      stableKey: "test:small-world:household",
      formedAt: world.currentDate,
      label: "Test household",
      provenance,
    });
    const householdId = world.history.households.at(-1)!.id;
    for (const residentId of world.personOrder) {
      world = startHouseholdMembership(world, {
        stableKey: `test:small-world:household:${residentId}`,
        personId: residentId,
        householdId,
        startedAt: world.currentDate,
        residenceRole: "primary",
        kind: "resident:member",
        provenance,
      });
    }
  }

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
