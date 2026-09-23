import { describe, expect, it } from "vitest";

import { addDays, createPartnership } from "../simulation";
import type { EntityId, World } from "../simulation";
import { householdMembershipsAt } from "../simulation/life-queries";
import {
  FAMILY_INTENTION_ANSWERED_EVENT,
  familyPlans,
} from "../simulation/people-family-plan";
import { personName } from "../simulation/people";
import {
  commitLifeConversation,
  projectLifeConversation,
} from "./life-conversation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

function couple(placeKey: string, seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 30,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey,
    household: "shares-a-home",
  });
  const player = game.playerPersonId;
  const world = openOrdinaryLife(game.world, player);
  const mine = householdMembershipsAt(world, player).map(
    (entry) => entry.household.id,
  );
  const partner = world.history.householdMemberships.find(
    (record) => record.personId !== player && mine.includes(record.householdId),
  )!.personId;
  const together = createPartnership(world, {
    stableKey: `family-talk:${seed}:partnership`,
    personIds: [player, partner].sort() as [EntityId, EntityId],
    kind: "legal:marriage",
    startedAt: addDays(world.currentDate, -400),
    provenance: { kind: "authored", note: "Family talk fixture." },
  });
  return { player, partner, world: together, unpartnered: world };
}

function intents(world: World, player: EntityId, other: EntityId) {
  return (
    projectLifeConversation(world, player, other)?.intents.map(
      (intent) => intent.key,
    ) ?? []
  );
}

describe("talking about a family", () => {
  it.each([
    ["2236255", "Houma, Louisiana"],
    ["5114968", "Charlottesville, Virginia"],
  ])(
    "in %s (%s), a couple at home can raise it, and the answer comes on its own day",
    (placeKey) => {
      const { player, partner, world, unpartnered } = couple(
        placeKey,
        `family-talk-${placeKey}`,
      );
      // A housemate who is not a partner is not asked.
      expect(intents(unpartnered, player, partner)).not.toContain(
        "familyChild",
      );
      expect(intents(world, player, partner)).toEqual(
        expect.arrayContaining(["familyChild", "familyAdopt"]),
      );

      const raised = commitLifeConversation(world, {
        playerPersonId: player,
        personId: partner,
        intent: "familyChild",
        revision: projectLifeConversation(world, player, partner)!.revision,
      });
      const plan = familyPlans(raised, player).at(-1)!;
      expect(plan.answer).toBe("waiting");
      expect(plan.kind).toBe("birth");
      const name = personName(raised.people[partner]!);
      expect(
        raised.history.events.some(
          (event) =>
            event.summary ===
            `You told ${name} you would like to have a child together.`,
        ),
      ).toBe(true);
      // Raised once is raised: it is not offered again while they think.
      expect(intents(raised, player, partner)).not.toContain("familyChild");

      const later = passOrdinaryDays(raised, 3);
      const answered = familyPlans(later, player).at(-1)!;
      expect(answered.answer).not.toBe("waiting");
      const answer = later.history.events.find(
        (event) => event.type === FAMILY_INTENTION_ANSWERED_EVENT,
      )!;
      expect([
        `${name} said yes to having a child with you.`,
        `${name} would rather wait for now.`,
      ]).toContain(answer.summary);
    },
    180_000,
  );
});
