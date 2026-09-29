import { describe, expect, it } from "vitest";

import { ageOnDate } from "../simulation/dates";
import { recordFavor } from "../simulation/favors";
import {
  CLEMENCY_GRANT,
  clemencyConsiderations,
} from "../simulation/justice/clemency-reasoning";
import type { EntityId, World } from "../simulation/types";
import { recordWorldEvent } from "../simulation/world";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { observerPlace } from "./observer-world";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/**
 * A person asking for clemency once helped the one who decides. The help,
 * still felt as owed, is a reason to grant it, weighed with the rest. The
 * place is drawn from all 56 by the seed.
 */
describe("a request from someone the decider owes", () => {
  const seed = "clemency-favor-1";
  const place = observerPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const adults = Object.values(game.world.people)
    .filter(
      (person) =>
        person.id !== game.playerPersonId &&
        ageOnDate(person.birthDate, game.world.currentDate) >= 30,
    )
    .slice(0, 2);
  const [decider, petitioner] = adults.map((person) => person.id) as [
    EntityId,
    EntityId,
  ];

  function event(world: World, key: string, summary: string): World {
    return recordWorldEvent(world, {
      stableKey: `${seed}:${key}`,
      type: "life.conversation",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [petitioner, decider],
      participants: [
        { personId: petitioner, role: "focus:subject", detail: null },
        { personId: decider, role: "presence:participant", detail: null },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["clemency-favor-test"],
      summary,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }

  const helped = event(game.world, "help", "They ran the campaign office.");
  const owed = recordFavor(helped, {
    stableKey: `${seed}:favor`,
    giverPersonId: petitioner,
    receiverPersonId: decider,
    kind: "political:campaign-work",
    description: "ran the campaign office",
    givenAt: helped.currentDate,
    eventId: helped.history.events.at(-1)!.id,
    subject: { kind: "none" },
    motive: "shared-belief",
    weight: "great",
    audience: "private",
    witnessPersonIds: [],
    inReturnForFavorId: null,
    undertakingId: null,
  });

  function considerationsIn(world: World) {
    const asked = event(world, "petition", "They asked for clemency.");
    const petition = asked.history.events.at(-1)!;
    return clemencyConsiderations(
      asked,
      decider,
      {
        petition,
        petitionerId: petitioner,
        sentenced: petition,
        earlierAnswer: null,
      },
      { stateUsps: null, termEndsAt: null },
    );
  }

  it(`weighs the help toward granting it (${place.key})`, () => {
    expect(adults).toHaveLength(2);
    const favor = considerationsIn(owed).filter(
      (row) => row.sourceType === "social:favor",
    );
    expect(favor).toHaveLength(1);
    expect(favor[0]).toMatchObject({
      optionKey: CLEMENCY_GRANT,
      direction: "supports",
    });
    expect(favor[0]!.explanation).toContain("ran the campaign office");
  });

  it("weighs nothing of the kind when nothing is owed", () => {
    expect(
      considerationsIn(game.world).filter(
        (row) => row.sourceType === "social:favor",
      ),
    ).toEqual([]);
  });
});
