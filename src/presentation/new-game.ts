import {
  defaultPronounsForGender,
  generationInputsFor,
  lifePlaceByKey,
  questionnaireLength,
  requireLifePlace,
  stableHash,
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
import {
  buildSeedFor,
  setupPriorStoreFor,
  worldSeedFor,
} from "./new-game-identity";

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
 * On a NORMAL start this is not asked. Who a person is born beside is a fact of
 * the life the game generates, not a frame the player sets, so the generator
 * decides it from the world's own seed (`generatedHouseholdFor`) — some lives
 * get a sibling, some do not — and the player meets the household after Begin
 * rather than composing it before. A CUSTOM start is the explicit route where
 * this is set directly; there the world takes the answer as given rather than
 * drawing it.
 */
export type NewGameHousehold = "lives-alone" | "shares-a-home";

/**
 * Which of the two routes into a life the player took.
 *
 * `normal` is the ordinary one and the default: the game generates the
 * parents, the household and the background, and the calibration shapes that
 * generation through the seam in `setup-generation-inputs.ts`. The player
 * chooses the frame — where, how old, who is at home — and does not author the
 * biography.
 *
 * `custom` is the explicit route, for a player who wants the details the game
 * supports set directly rather than generated around them. Its distinguishing
 * property is the one that matters: the calibration does not reach generation
 * at all, so nothing a player answers moves the household. It is deliberately a
 * narrow route today, because the explicit controls the game actually has are
 * narrow, and offering more would be offering something that does not exist.
 *
 * Optional and absent means `normal`, so every setup written before this
 * existed still means what it meant.
 */
export type NewGameStartKind = "normal" | "custom";

export interface NewGameSetup {
  readonly startKind?: NewGameStartKind;
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
   * They stay out of `worldSeedFor`, which decides which world this is and is
   * read while the interview is still running. Under Packet 77 they do reach
   * the generator, through one declared seam and in one bounded form: the two
   * leans in `setup-generation-inputs.ts`. They write no history and name
   * nobody — see `buildSeedFor` for where the two halves meet.
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
  startKind: "normal",
  // A starting point for the field, not a recommendation on the screen. The
  // creator shows no place until the player searches for one, which is what
  // stopped the four supported places reading as the game's four defaults.
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
  return resolvedDepth(setup) === "play-formative-years" && setup.startAge < 18;
}

const NORMAL_START_SHARES_A_HOME_THRESHOLD = 62;

/**
 * Who is at home, for a normal start, drawn from the world's own seed.
 *
 * A normal start does not ask this; the generator decides it. It is derived
 * from `worldSeedFor` — the world's identity, not the build seed — so the
 * calibration cannot move it: on a normal start the answers lean the ages of
 * the people the world writes, never whether there is a sibling at all. The
 * same world always resolves to the same household, so replays reproduce it.
 */
export function generatedHouseholdFor(setup: NewGameSetup): NewGameHousehold {
  const digest = stableHash(`household:v1\n${worldSeedFor(setup)}`);
  const bucket = Number.parseInt(digest.slice(0, 8), 16) % 100;
  return bucket < NORMAL_START_SHARES_A_HOME_THRESHOLD
    ? "shares-a-home"
    : "lives-alone";
}

/**
 * The household the world is actually built with.
 *
 * Custom takes the player's answer; normal takes the generated one.
 */
export function resolvedHousehold(setup: NewGameSetup): NewGameHousehold {
  return setup.startKind === "custom"
    ? setup.household
    : generatedHouseholdFor(setup);
}

/**
 * How much of the earlier life is played.
 *
 * Custom takes the player's answer; normal derives it from the starting age —
 * a character young enough to have unplayed formative years plays them, an
 * adult starts where they are — rather than making it a separate question.
 */
export function resolvedDepth(setup: NewGameSetup): NewGameDepth {
  if (setup.startKind === "custom") return setup.depth;
  return setup.startAge < 18
    ? "play-formative-years"
    : "summarize-earlier-life";
}

export function createNewGameWorld(setup: NewGameSetup): NewGame {
  const problems = newGameSetupProblems(setup);
  if (problems.length > 0) {
    throw new Error(problems[0]!.message);
  }
  const place = requireLifePlace(setup.placeKey);
  const priors = setupPriorStoreFor(setup);
  const built = buildProductionWorld({
    // The build seed, not the world's identity: the calibration is allowed to
    // change what the generator draws, and never which world this is.
    seed: buildSeedFor(setup),
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
            pronouns: setup.pronouns ?? defaultPronounsForGender(setup.gender),
          },
        }),
    // On a normal start the household and the depth are the generator's to
    // decide, not the player's — see Task E. Custom keeps the explicit
    // answers. The starting role stays as the setup carries it: the normal
    // creator offers no office, so a normal start is already `ordinary-life`,
    // and a life reaches work through play rather than beginning in one.
    startingLife: setup.startingLife,
    household: resolvedHousehold(setup),
    depth: resolvedDepth(setup),
    priors,
    // The custom route is the one where the calibration does not shape the
    // family. Passing null here is the whole of that difference, and it is why
    // the two routes are genuinely distinct rather than two labels.
    generation:
      setup.startKind === "custom" ? null : generationInputsFor(priors),
  });
  return {
    world: built.world,
    playerPersonId: built.playerPersonId,
    place,
    setup,
  };
}
