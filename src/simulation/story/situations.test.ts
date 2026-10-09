import { describe, expect, it } from "vitest";
import typesData from "../../../data/content/situation-types.json" with { type: "json" };
import movesData from "../../../data/content/story-moves.json" with { type: "json" };
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { SPEECH_ACTS } from "../../presentation/english-composition";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { stableHash } from "../ids";
import {
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "../life-opportunities";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { latestPersonalityTendenciesForPerson } from "../queries";
import { ACT_KINDS, isActConsideration } from "../traits/act-pulls";
import type { World } from "../types";
import { recordStoryMoments, STORY_MOMENT_KINDS } from "./moments";
import {
  ALWAYS_OPEN_MOVES,
  answeringMoves,
  chooseSituationMove,
  moveActs,
  moveAftermath,
  movesForRole,
  SITUATION_TYPES,
  situationType,
  situationVocabulary,
  STORY_MOVES,
} from "./situations";

const NAMESPACES = new Set([
  "contact",
  "work",
  "experience",
  "support",
  "exchange",
  "conflict",
  "commitment",
  "care",
  "mentorship",
]);
const CHANGES = new Set([
  "formed",
  "strengthened",
  "maintained",
  "strained",
  "ended",
]);
const SIGNIFICANCES = new Set(["minor", "meaningful", "major"]);
const THREAD_TURNS = new Set([
  "started",
  "grew",
  "soured",
  "turned",
  "faded",
  "renewed",
  "closed",
]);

/** Whether a cause's moment key names a kind step 1 scores. */
function momentKindExists(key: string): boolean {
  if (key.startsWith("relationship:")) {
    const parts = key.split(":");
    return parts.length === 4 && CHANGES.has(parts[3]!);
  }
  return STORY_MOMENT_KINDS.some((kind) => kind.key === key);
}

describe("the situation library", () => {
  const vocabulary = situationVocabulary();

  it("holds the 32 approved types, each once, with becoming friends among them", () => {
    const keys = SITUATION_TYPES.map((type) => type.key);
    expect(keys).toHaveLength(32);
    expect(new Set(keys).size).toBe(32);
    expect(keys).toContain("becoming-friends");
  });

  it("keeps at least four moves for every present role: ask, stay silent, leave and one of its own", () => {
    expect([...ALWAYS_OPEN_MOVES].sort()).toEqual(
      ["ask", "leave", "stay-silent"].sort(),
    );
    const short: string[] = [];
    for (const type of SITUATION_TYPES)
      for (const role of type.roles) {
        if (role.present === false) {
          expect(movesForRole(type, role.key)).toEqual([]);
          continue;
        }
        const moves = movesForRole(type, role.key);
        const own = role.moves.filter(
          (move) => !ALWAYS_OPEN_MOVES.includes(move),
        );
        if (moves.length < 4 || own.length === 0)
          short.push(`${type.key}/${role.key}: ${moves.join(", ")}`);
        for (const move of ALWAYS_OPEN_MOVES) expect(moves).toContain(move);
      }
    expect(short).toEqual([]);
  });

  it("gives every move a speech act on the English engine's list and one to three act kinds in the decision table", () => {
    expect(STORY_MOVES).toHaveLength(20);
    const speechActs = new Set<string>(SPEECH_ACTS);
    for (const move of STORY_MOVES) {
      if (move.speechAct === null)
        expect(["stay-silent", "leave"]).toContain(move.key);
      else expect(speechActs.has(move.speechAct)).toBe(true);
      const acts = moveActs(move.key);
      expect(acts.size).toBeGreaterThanOrEqual(1);
      expect(acts.size).toBeLessThanOrEqual(3);
      for (const act of acts) expect(ACT_KINDS.has(act)).toBe(true);
    }
    // The seven speech acts the owner approved for the director's moves.
    const approved = Object.fromEntries(
      ["comfort", "blame", "promise", "thank", "confess", "farewell", "recall"]
        .map((key) => STORY_MOVES.find((move) => move.key === key)!)
        .map((move) => [move.key, move.speechAct]),
    );
    expect(approved).toEqual({
      comfort: "comfort",
      blame: "blame",
      promise: "promise",
      thank: "thank",
      confess: "confess",
      farewell: "farewell",
      recall: "recall",
    });
  });

  it("uses only its closed lists, and every cause binds roles the type has", () => {
    const problems: string[] = [];
    const moveKeys = new Set(STORY_MOVES.map((move) => move.key));
    for (const type of SITUATION_TYPES) {
      const roleKeys = new Set(type.roles.map((role) => role.key));
      for (const role of type.roles) {
        if (!vocabulary.fills.has(role.fill))
          problems.push(`${type.key}/${role.key} fill ${role.fill}`);
        for (const move of role.moves)
          if (!moveKeys.has(move))
            problems.push(`${type.key}/${role.key} move ${move}`);
        for (const act of role.wants)
          if (!ACT_KINDS.has(act))
            problems.push(`${type.key}/${role.key} wants ${act}`);
      }
      for (const setting of type.setting)
        if (!vocabulary.settings.has(setting))
          problems.push(`${type.key} setting ${setting}`);
      if (!vocabulary.timings.has(type.timing))
        problems.push(`${type.key} timing ${type.timing}`);
      for (const record of type.awaiting ?? [])
        if (!vocabulary.awaiting.has(record))
          problems.push(`${type.key} awaits ${record}`);
      if (type.causes.length === 0 && (type.awaiting ?? []).length === 0)
        problems.push(`${type.key} has no cause and awaits nothing`);
      for (const cause of type.causes) {
        if (cause.moment !== undefined && !momentKindExists(cause.moment))
          problems.push(`${type.key} cause ${cause.moment}`);
        if (
          cause.threadTurn !== undefined &&
          !THREAD_TURNS.has(cause.threadTurn)
        )
          problems.push(`${type.key} cause turn ${cause.threadTurn}`);
        if ((cause.moment === undefined) === (cause.threadTurn === undefined))
          problems.push(`${type.key} cause names neither or both`);
        for (const [roleKey, fill] of Object.entries(cause.bind)) {
          if (!roleKeys.has(roleKey))
            problems.push(`${type.key} binds unknown role ${roleKey}`);
          if (!vocabulary.fills.has(fill))
            problems.push(`${type.key} binds ${roleKey} to ${fill}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("names an opener that is a present role, and an opening that role can make", () => {
    const problems: string[] = [];
    for (const type of SITUATION_TYPES)
      for (const cause of type.causes) {
        if (cause.opening !== undefined && cause.opener === undefined)
          problems.push(`${type.key}: an opening with no opener`);
        if (cause.opener === undefined) continue;
        const opener = type.roles.find((role) => role.key === cause.opener);
        if (!opener || opener.present === false)
          problems.push(`${type.key}: opener ${cause.opener}`);
        else if (
          cause.opening !== undefined &&
          !opener.moves.includes(cause.opening)
        )
          problems.push(`${type.key}: ${cause.opener} cannot ${cause.opening}`);
      }
    expect(problems).toEqual([]);
  });

  it("answers every spoken move with spoken moves, citing the pairs' source", () => {
    expect(movesData.answeredBySource).toMatch(/Schegloff/);
    const problems: string[] = [];
    const spoken = new Set(
      STORY_MOVES.filter((move) => move.speechAct !== null).map(
        (move) => move.key,
      ),
    );
    for (const [move, answers] of Object.entries(movesData.answeredBy)) {
      if (!spoken.has(move)) problems.push(`${move} is not a spoken move`);
      for (const answer of answers)
        if (!spoken.has(answer)) problems.push(`${move} answered by ${answer}`);
    }
    for (const move of spoken)
      if (answeringMoves(move).length === 0)
        problems.push(`${move} has no answer`);
    expect(problems).toEqual([]);
  });

  it("writes only valid relationship interactions as aftermath", () => {
    const problems: string[] = [];
    for (const type of SITUATION_TYPES)
      for (const role of type.roles)
        for (const move of movesForRole(type, role.key)) {
          const aftermath = moveAftermath(type, move);
          if (!aftermath) continue;
          const [namespace] = aftermath.kind.split(":");
          if (
            !NAMESPACES.has(namespace!) ||
            !CHANGES.has(aftermath.change) ||
            !SIGNIFICANCES.has(aftermath.significance)
          )
            problems.push(`${type.key}/${move}: ${JSON.stringify(aftermath)}`);
        }
    expect(problems).toEqual([]);
  });

  it("holds no sentence: every value in the types and moves is a key", () => {
    const sentences: string[] = [];
    const visit = (value: unknown, path: string) => {
      if (typeof value === "string") {
        if (!/^[a-z0-9*:.-]+$/.test(value)) sentences.push(`${path}: ${value}`);
      } else if (Array.isArray(value))
        value.forEach((item, index) => visit(item, `${path}[${index}]`));
      else if (value && typeof value === "object")
        for (const [key, item] of Object.entries(value))
          visit(item, `${path}.${key}`);
    };
    visit(typesData.types, "types");
    visit(typesData.standingPulls, "standingPulls");
    visit(movesData.moves, "moves");
    expect(sentences).toEqual([]);
  });

  it("is one rule for all 56 places: no place is named in either table", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    const text = JSON.stringify([typesData, movesData]).toLowerCase();
    for (const state of states) {
      expect(text).not.toContain(`"${state.usps.toLowerCase()}"`);
      expect(text).not.toContain(state.name.toLowerCase());
      const place = searchLifePlaces("", 1, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      })[0]!;
      expect(text).not.toContain(place.displayName.toLowerCase());
    }
  });
});

/** A new game in a place drawn from all 56 by the seed's hash, advanced 7 days. */
function seededWeek(seed: string, startAge: number) {
  const states = lifePlaceStateIdentities();
  const state =
    states[parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  })[0]!;
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge,
    placeKey: place.key,
  });
  const personId = game.playerPersonId;
  const opened = refreshLifeOpportunities(
    openOrdinaryLifeRecords(game.world, personId),
    personId,
  );
  return {
    world: recordStoryMoments(passOrdinaryDays(opened, 7)) as World,
    personId,
  };
}

describe("a role choosing its move in a seeded week", () => {
  // Seed p6-story-c draws Aberdeen Gardens, Washington: Mateo McKenzie, 34.
  const { world, personId } = seededWeek("p6-story-c", 34);
  const named = (given: string) =>
    Object.values(world.people).find((person) => person.givenName === given)!;

  const rank = (choice: ReturnType<typeof chooseSituationMove>) =>
    Object.fromEntries(
      choice.optionEvaluations.map((option) => [
        option.optionKey,
        option.finalRank,
      ]),
    );

  it("leaves Mateo undecided when nothing on record separates the moves his role wants", () => {
    const audrey = named("Audrey");
    const input = {
      stableKey: "p6-test:reach-out:mateo",
      typeKey: "reach-out",
      roleKey: "asked",
      personId,
      towardPersonIds: [audrey.id],
    };
    const choice = chooseSituationMove(world, input);
    // No trait is on record for Mateo and nothing has passed between him and
    // his sister, so only the role's wants weigh, and they weigh two moves
    // equally. Nothing breaks the tie by chance.
    expect(choice.context.randomness).toBe("none");
    expect(
      choice.context.considerations.map((reason) => [
        reason.optionKey,
        reason.sourceType,
        reason.weightScale,
      ]),
    ).toEqual([
      ["request", "context:situation-role", 0.5],
      ["thank", "context:situation-role", 0.5],
    ]);
    expect([choice.outcomeKind, choice.selectedOptionKey]).toEqual([
      "undecided",
      null,
    ]);
    expect(chooseSituationMove(world, input)).toEqual(choice);
  });

  it("lets standing weigh in: Mateo's warmth toward Wyatt Murray lifts the reunion's own moves", () => {
    const wyatt = named("Wyatt");
    const choice = chooseSituationMove(world, {
      stableKey: "p6-test:reunion:mateo",
      typeKey: "reunion",
      roleKey: "one",
      personId,
      towardPersonIds: [wyatt.id],
    });
    const standing = choice.context.considerations.filter(
      (reason) => reason.sourceType === "social:relationship",
    );
    expect(standing.map((reason) => reason.optionKey).sort()).toEqual(
      ["apologize", "promise", "recall", "tell", "thank"].sort(),
    );
    for (const reason of standing) {
      expect(reason.weightScale).toBe(0.666667);
      expect(reason.sourceRefs.length).toBeGreaterThan(0);
    }
    // The warm moves the role also wants rank first together.
    const ranks = rank(choice);
    expect([ranks.recall, ranks.tell, ranks.thank]).toEqual([1, 1, 1]);
    expect(ranks.apologize).toBeGreaterThan(1);
  });

  it("lets a person's recorded traits weigh in through the shared act table, and they decide", () => {
    const traited = Object.values(world.people)
      .filter(
        (person) =>
          person.id !== personId &&
          latestPersonalityTendenciesForPerson(world, person.id).length > 0,
      )
      .map((person) =>
        chooseSituationMove(world, {
          stableKey: `p6-test:argument:${person.id}`,
          typeKey: "argument",
          roleKey: "side",
          personId: person.id,
          towardPersonIds: [],
        }),
      )
      .find((choice) =>
        choice.context.considerations.some(isActConsideration),
      )!;
    expect(traited).toBeDefined();
    expect(traited.outcomeKind).toBe("selected");
    expect(rank(traited)[traited.selectedOptionKey!]).toBe(1);
  });

  it("refuses a move for a role that is not present", () => {
    expect(() =>
      chooseSituationMove(world, {
        stableKey: "p6-test:funeral:deceased",
        typeKey: "funeral",
        roleKey: "deceased",
        personId,
        towardPersonIds: [],
      }),
    ).toThrow(/not present/);
    expect(situationType("funeral").roles.map((role) => role.key)).toContain(
      "deceased",
    );
  });
});
