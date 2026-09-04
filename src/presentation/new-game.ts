import {
  defaultPronounsForGender,
  lifePlaceByKey,
  questionnaireLength,
  requireLifePlace,
} from "../simulation";
import type {
  EntityId,
  GenderIdentityKey,
  LifePlace,
  PronounSetKey,
  SetupAnswerRecord,
  SetupQuestionnairePath,
  World,
} from "../simulation";
import { buildProductionWorld } from "./production-world";
import { setupPriorStoreFor, worldSeedFor } from "./new-game-identity";

/**
 * Starting a life.
 *
 * The setup screen asks for as little as the world builder actually needs:
 * where the life begins, how old the character is when the player picks them
 * up, how much of the earlier life is played rather than summarized, and
 * whether the character already works somewhere the game has rules for.
 *
 * Nothing here invents biography. A name the player leaves blank is generated;
 * an age is a starting point, not a claim about anyone real; and a place is
 * only offered when the accepted data can put a life in it.
 */

export type NewGameDepth = "play-formative-years" | "summarize-earlier-life";

/**
 * What the character is doing when play begins. This is the capability gate:
 * the office and legislation surfaces exist because the world says the person
 * works there, not because the game has nowhere else to put them.
 */
export type NewGameStartingLife = "ordinary-life" | "legislative-office";

/**
 * Whether anybody else is at home.
 *
 * The world has no way to know this and must not guess. Left to itself it
 * either invents a housemate nobody chose, or — as it did — reaches for the
 * nearest other person in the world and puts a parent the character moved away
 * from decades ago in the next room. So it is asked, once, and answered.
 */
export type NewGameHousehold = "lives-alone" | "shares-a-home";

export interface NewGameSetup {
  readonly placeKey: string;
  readonly startAge: number;
  readonly depth: NewGameDepth;
  readonly startingLife: NewGameStartingLife;
  readonly household: NewGameHousehold;
  readonly seed: string;
  /** Blank means "generate one" rather than "leave it empty". */
  readonly givenName: string | null;
  readonly familyName: string | null;
  /**
   * The character's gender, as the player states it.
   *
   * `unstated` is the default and a real answer: the world then records
   * nothing about it rather than picking. It is never inferred from the name,
   * because the name corpus deliberately carries no demographic attribute for
   * anything to be inferred from.
   */
  readonly gender?: GenderIdentityKey;
  /**
   * Which pronouns the game uses about them.
   *
   * Kept as its own field rather than derived at the point of use, so a player
   * can pick a set that does not follow from the gender they chose. The setup
   * screen defaults it and lets them change it.
   */
  readonly pronouns?: PronounSetKey;
  /**
   * Which calibration path the player took, if any.
   *
   * Optional, and absent means none: a setup written before the questionnaire
   * existed is a valid setup that answered nothing, and must keep building the
   * world it always built.
   */
  readonly questionnaire?: SetupQuestionnairePath;
  /**
   * What they answered, in the order they were asked.
   *
   * These are non-diegetic weak priors and nothing else. They do not enter
   * `worldSeedFor`, they create no history, and no biography follows from
   * them — see `new-game-identity.ts` for why the split is load-bearing.
   */
  readonly priors?: readonly SetupAnswerRecord[];
}

export interface NewGame {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly place: LifePlace;
  readonly setup: NewGameSetup;
}

export const MINIMUM_START_AGE = 5;
export const MAXIMUM_START_AGE = 70;
/** Below this the legislative office is not offered, and not silently granted. */
export const LEGISLATIVE_OFFICE_MINIMUM_AGE = 21;

export const DEFAULT_NEW_GAME_SETUP: Omit<NewGameSetup, "seed"> = {
  placeKey: "kentucky",
  startAge: 10,
  depth: "play-formative-years",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  givenName: null,
  familyName: null,
  // No pronoun default beside the gender default, deliberately: leaving it
  // absent means it follows whatever gender is chosen, so a caller that sets
  // only the gender cannot end up with a character whose pronouns disagree
  // with it by accident.
  gender: "unstated",
  questionnaire: "short",
  priors: [],
};

export interface NewGameSetupProblem {
  readonly field: keyof NewGameSetup;
  readonly message: string;
}

/** Rejects a setup the world cannot honestly build, and says why in plain words. */
export function newGameSetupProblems(
  setup: NewGameSetup,
): readonly NewGameSetupProblem[] {
  const problems: NewGameSetupProblem[] = [];
  const place = lifePlaceByKey(setup.placeKey);
  if (!place) {
    problems.push({
      field: "placeKey",
      message: "Choose a place the game can start a life in.",
    });
  }
  if (
    !Number.isSafeInteger(setup.startAge) ||
    setup.startAge < MINIMUM_START_AGE ||
    setup.startAge > MAXIMUM_START_AGE
  ) {
    problems.push({
      field: "startAge",
      message: `Choose a starting age between ${MINIMUM_START_AGE} and ${MAXIMUM_START_AGE}.`,
    });
  }
  if (setup.startingLife === "legislative-office") {
    if (setup.startAge < LEGISLATIVE_OFFICE_MINIMUM_AGE) {
      problems.push({
        field: "startingLife",
        message: `A legislative office job needs a character of at least ${LEGISLATIVE_OFFICE_MINIMUM_AGE}.`,
      });
    }
    if (place && place.capabilities.legislativeScenarioKey === null) {
      problems.push({
        field: "startingLife",
        message: `The game has no legislative procedure for ${place.displayName} yet, so it cannot put a character to work in one there.`,
      });
    }
  }
  if (setup.seed.trim().length === 0) {
    problems.push({ field: "seed", message: "A world needs a seed." });
  }
  const path = setup.questionnaire ?? "skipped";
  const answered = setup.priors?.length ?? 0;
  if (answered > questionnaireLength(path)) {
    problems.push({
      field: "priors",
      message: "There are more answers here than that path ever asks for.",
    });
  }
  return problems;
}

export { worldSeedFor };

/** True when the formative years are actually reachable from this setup. */
export function playsFormativeYears(setup: NewGameSetup): boolean {
  return setup.depth === "play-formative-years" && setup.startAge < 18;
}

export function createNewGameWorld(setup: NewGameSetup): NewGame {
  const problems = newGameSetupProblems(setup);
  if (problems.length > 0) {
    throw new Error(problems[0]!.message);
  }
  const place = requireLifePlace(setup.placeKey);
  const built = buildProductionWorld({
    seed: worldSeedFor(setup),
    place,
    age: setup.startAge,
    givenName: setup.givenName,
    familyName: setup.familyName,
    // Only a stated gender reaches the world. "Rather not say" is recorded as
    // an absent identity rather than as a neutral one, so the record can tell
    // the two apart.
    ...(setup.gender === undefined || setup.gender === "unstated"
      ? {}
      : {
          identity: {
            gender: setup.gender,
            pronouns:
              setup.pronouns ?? defaultPronounsForGender(setup.gender),
          },
        }),
    startingLife: setup.startingLife,
    household: setup.household,
    depth: setup.depth,
    priors: setupPriorStoreFor(setup),
  });
  return {
    world: built.world,
    playerPersonId: built.playerPersonId,
    place,
    setup,
  };
}
