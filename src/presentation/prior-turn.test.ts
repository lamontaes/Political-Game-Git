import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { drawRandomPlace } from "../../tests/support/random-place";
import { tellAnswer } from "./life-talk-topics";
import { parsePlanTurn } from "./prior-turn";
import {
  chooseOrdinaryLifeGoal,
  ORDINARY_LIFE_GOALS,
} from "../simulation/life-personality";
import type { World } from "../simulation";

const FUNCTION_WORDS = new Set(
  "a an the to for of and i you me my your it some time make".split(" "),
);

function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z' ]/g, " ")
      .split(/\s+/)
      .filter((word) => word && !FUNCTION_WORDS.has(word)),
  );
}

const GOALS = ["learning", "connection"] as const;

describe("a reply to a told plan answers its content", () => {
  it("names the topic and repeats nothing else of the prior turn, across ten seeded turns", () => {
    const seen: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      const seed = `en-cal-2-adjacency-${index}`;
      const place = drawRandomPlace(seed, (p) => p.scope === "locality");
      const created = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startAge: 34,
      });
      const { playerPersonId } = created;
      for (const goal of GOALS) {
        let world: World = chooseOrdinaryLifeGoal(
          created.world,
          playerPersonId,
          goal,
        );
        const listenerId = world.personOrder.find(
          (id) => id !== playerPersonId,
        )!;
        // Odd seeds: the listener has made the same plan through the writer.
        if (index % 2 === 1)
          world = {
            ...chooseOrdinaryLifeGoal(
              { ...world, control: { kind: "person", personId: listenerId } },
              listenerId,
              goal,
            ),
            control: world.control,
          };
        const prior = ORDINARY_LIFE_GOALS[goal];
        const told = parsePlanTurn(prior)!;
        const { reply } = tellAnswer(
          world,
          playerPersonId,
          listenerId,
          { kind: "plan", key: `tell:plan:${goal}`, label: prior, goal },
          { parentOfYoungPlayer: false },
        );
        seen.push(`${place.key} ${seed} ${goal}: ${reply}`);
        if (reply === "All right.") continue; // a guarded listener says nothing about it
        expect(reply.toLowerCase()).toContain(told.topicWord);
        const echoed = [...contentWords(reply)].filter(
          (word) => word !== told.topicWord && contentWords(prior).has(word),
        );
        expect(echoed, reply).toEqual([]);
      }
    }
    expect(seen).toHaveLength(10);
    expect(
      seen.filter((line) => !line.endsWith("All right.")).length,
    ).toBeGreaterThanOrEqual(8);
  });

  it("parses each plan to its topic and follow-up", () => {
    expect(parsePlanTurn(ORDINARY_LIFE_GOALS.learning)).toMatchObject({
      topicWord: "learn",
      followup: "Learn what?",
    });
    expect(parsePlanTurn(ORDINARY_LIFE_GOALS.connection)?.followup).toBe(
      "Which people?",
    );
    expect(parsePlanTurn(ORDINARY_LIFE_GOALS.privacy)?.followup).toBe(
      "Time to do what?",
    );
    expect(parsePlanTurn("I went to the store.")).toBeNull();
  });
});
