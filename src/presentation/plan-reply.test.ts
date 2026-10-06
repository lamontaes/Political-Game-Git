import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import type { EntityId, World } from "../simulation";
import {
  ORDINARY_LIFE_GOALS,
  chooseOrdinaryLifeGoal,
} from "../simulation/life-personality";
import { createNewGameWorld } from "./new-game";
import { planQuestion } from "./plan-question";
import { tellAnswer, tellableTopics, type TellTopic } from "./life-talk-topics";

type Goal = keyof typeof ORDINARY_LIFE_GOALS;

describe("planQuestion reads the plan's own words", () => {
  it("fills an open object with its question word", () => {
    expect(planQuestion("Make time to learn something")).toBe("Learn what?");
    expect(planQuestion("Make time to meet someone")).toBe("Meet who?");
  });

  it("asks which people, without the qualifying clause", () => {
    expect(planQuestion("Make time for people you know")).toBe("Which people?");
  });

  it("asks nothing when the plan leaves nothing open", () => {
    expect(planQuestion("Make some time for yourself")).toBeNull();
  });
});

const WORDS = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

describe(
  "a reply to a told plan answers what was said",
  { timeout: 180_000 },
  () => {
    const seeds = Array.from(
      { length: 10 },
      (_, index) => `encal2-plan-${index}`,
    );

    function lifeWithPlan(seed: string, goal: Goal) {
      const place = drawRandomPlace(seed);
      const created = createNewGameWorld({
        startKind: "custom",
        seed,
        placeKey: place.key,
        startAge: 34,
        depth: "play-formative-years",
        startingLife: "ordinary-life",
        household: "shares-a-home",
        givenName: "Plan",
        familyName: "Teller",
        gender: "male",
        pronouns: "he-him",
        questionnaire: "skipped",
        appearanceCatalogGeneration: 10,
        appearanceRecipeVersion: "appearance-recipe-v2",
        appearanceOutfitVersion: "complete-outfit-v2",
      } as never);
      const world: World = chooseOrdinaryLifeGoal(
        created.world,
        created.playerPersonId,
        goal,
      );
      const listeners: EntityId[] = world.personOrder.filter(
        (id) => id !== created.playerPersonId,
      );
      return {
        place,
        world,
        playerPersonId: created.playerPersonId,
        listeners,
      };
    }

    const EXPECTED: Readonly<Record<Goal, string | null>> = {
      learning: "Learn what?",
      connection: "Which people?",
      privacy: null,
    };

    for (const goal of Object.keys(EXPECTED) as Goal[]) {
      it(`names the topic of "${ORDINARY_LIFE_GOALS[goal]}" without echoing the player's words`, () => {
        let engaged = 0;
        for (const seed of seeds) {
          const { place, world, playerPersonId, listeners } = lifeWithPlan(
            seed,
            goal,
          );
          for (const listenerId of listeners.slice(0, 6)) {
            const topic = tellableTopics(
              world,
              playerPersonId,
              listenerId,
            ).find(
              (entry): entry is Extract<TellTopic, { kind: "plan" }> =>
                entry.kind === "plan" && entry.goal === goal,
            );
            if (!topic) continue;
            const answer = tellAnswer(
              world,
              playerPersonId,
              listenerId,
              topic,
              {
                parentOfYoungPlayer: false,
              },
            );
            const reply = answer.reply;
            const said = WORDS(topic.label);
            const repeated = WORDS(reply).filter(
              (word) =>
                said.includes(word) &&
                !["learn", "people", "oh", "yeah", "nice"].includes(word),
            );
            expect(
              repeated,
              `${place.displayName}, seed ${seed}: "${reply}" repeats the player's words`,
            ).toEqual([]);
            expect(reply).not.toMatch(/me too/i);
            const open = EXPECTED[goal];
            if (
              open &&
              answer.parts.some((part) => part.partKey.includes("core:core")) &&
              reply.includes(open)
            ) {
              engaged += 1;
              // A reaction first, then the question about the named thing.
              expect(reply).toMatch(
                new RegExp(
                  `^(Oh yeah\\?|Huh\\.|Oh nice\\.|Oh\\?|Oh, nice\\.) ${open.replace("?", "\\?")}$`,
                ),
              );
            }
            if (!open && !/^Can it wait|^All right/.test(reply))
              expect(reply).toBe("Oh yeah?");
          }
        }
        if (EXPECTED[goal])
          expect(
            engaged,
            "at least one listener asked about the plan",
          ).toBeGreaterThan(0);
      });
    }
  },
);
