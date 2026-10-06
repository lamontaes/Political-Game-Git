import process from "node:process";
import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { ageOnDate } from "../dates";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createPolicyDomainDefinition,
  createPolicyIssueDefinition,
  createPolicyPropositionDefinition,
} from "../policy";
import { constituentsConsideration } from "./constituent-views";
import { recordCivicMessage } from "../living-world/civic-actions";
import { currentGovernorOf } from "../crisis/offices";
import type { World } from "../types";

describe("constituent messages in local considerations", () => {
  it("opens a random-place new game and includes ten named constituent letters", () => {
    const seed = "session46-b18-p6-random-place-proof";
    const place = drawRandomPlace(
      seed,
      (candidate) => candidate.scope === "locality",
    );
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startAge: 30,
        questionnaire: "skipped",
      }),
    ).game!;
    const playerId = game.playerPersonId;
    const jurisdictionId = game.world.people[playerId]!.homeJurisdictionId;
    expect(place.stateJurisdictionKey).not.toBeNull();
    const governor = currentGovernorOf(
      game.world,
      place.stateJurisdictionKey!.slice(3),
    );
    expect(governor).not.toBeNull();
    const officialId = governor!.personId;

    const domain = createPolicyDomainDefinition(
      "test:b18-constituent-domain",
      "Local services",
      "Services residents share.",
    );
    const issue = createPolicyIssueDefinition(
      "test:b18-constituent-issue",
      domain.id,
      "Library hours",
      "Access to the local library.",
    );
    const proposition = createPolicyPropositionDefinition(
      "test:b18-constituent-proposition",
      issue.id,
      "Extend library hours",
      "Should the library stay open later?",
    );
    let world: World = {
      ...game.world,
      policyCatalog: {
        ...game.world.policyCatalog,
        domains: { ...game.world.policyCatalog.domains, [domain.id]: domain },
        domainOrder: [...game.world.policyCatalog.domainOrder, domain.id],
        issues: { ...game.world.policyCatalog.issues, [issue.id]: issue },
        issueOrder: [...game.world.policyCatalog.issueOrder, issue.id],
        propositions: {
          ...game.world.policyCatalog.propositions,
          [proposition.id]: proposition,
        },
        propositionOrder: [
          ...game.world.policyCatalog.propositionOrder,
          proposition.id,
        ],
      },
    };
    const residents = world.personOrder.filter(
      (id) =>
        id !== playerId &&
        world.people[id]!.homeJurisdictionId === jurisdictionId &&
        ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
    );
    expect(residents.length).toBeGreaterThanOrEqual(10);
    for (const senderId of residents.slice(0, 10)) {
      world = recordCivicMessage(world, {
        stableKey: `session46:b18:p6:letter:${senderId}`,
        jurisdictionId,
        senderId,
        officialId,
        propositionId: proposition.id,
        stance: "no",
        channel: "letter",
      });
    }
    const consideration = constituentsConsideration(world, jurisdictionId, [
      { propositionId: proposition.id, answer: "yes" },
    ]);
    expect(consideration).not.toBeNull();
    expect(consideration!.explanation).toContain("constituents who wrote");
    for (const id of residents.slice(0, 10))
      expect(consideration!.explanation).toContain(
        `${world.people[id]!.givenName} ${world.people[id]!.familyName}`,
      );
    expect(consideration!.sourceRefs).toHaveLength(10);
    process.stdout.write(
      `${JSON.stringify({
        proof: "B18 p6 new-game constituent letters",
        place: place.key,
        seed,
        worldId: game.world.id,
        messages: 10,
      })}\n`,
    );
  }, 300_000);
});
