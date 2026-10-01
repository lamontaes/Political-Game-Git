import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { relocateHousehold } from "../simulation/migration/relocate";
import { SeededRng, pickDistinct } from "../simulation/rng";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../simulation/life";
import { recordEventKnowledge } from "../simulation/records";
import { PersonalWorkspace } from "./ShellWorkspaces";

/**
 * "Who you are" shows how the player grew up and what moved around them, from
 * the same projection the unit test proves. One place, drawn from all 56 by the
 * seed.
 */
const SEED = "lives-screens-markup-20261001";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);

describe(`Who you are, in ${state!.jurisdictionKey} (seed ${SEED})`, () => {
  it("renders the upbringing section, then a neighbor's move once it is recorded", () => {
    const small = smallWorld({ place: state!.jurisdictionKey, seed: SEED });
    const html = (world: typeof small.world) =>
      renderToStaticMarkup(
        createElement(PersonalWorkspace, {
          world,
          personId: small.personId,
          onOpenPerson: () => undefined,
        }),
      );
    const before = html(small.world);
    expect(before).toContain('data-testid="personal-upbringing"');
    expect(before).toContain("How you grew up");
    expect(before).not.toContain('data-testid="personal-around"');

    const mover = small.world.personOrder[2]!;
    const provenance = { kind: "authored" as const, note: "LIVES fixture." };
    let next = createHousehold(small.world, {
      stableKey: "lives-markup:household",
      formedAt: small.world.currentDate,
      label: "Fixture household",
      provenance,
    });
    const householdId = next.history.households.at(-1)!.id;
    next = recordHouseholdLocation(next, {
      stableKey: "lives-markup:location",
      householdId,
      effectiveAt: next.currentDate,
      jurisdictionId: next.people[mover]!.homeJurisdictionId,
      label: "Fixture residence",
      kind: "residence:community-base",
      provenance,
      supersedesLocationId: null,
    });
    next = startHouseholdMembership(next, {
      stableKey: "lives-markup:membership",
      personId: mover,
      householdId,
      startedAt: next.currentDate,
      residenceRole: "primary",
      kind: "resident:member",
      provenance,
    });
    next = relocateHousehold(next, {
      stableKey: "lives-markup:move",
      personId: mover,
      toJurisdictionId: small.stateJurisdictionId,
      reason: "work:transfer",
      waveKey: null,
      why: "took a job elsewhere",
    });
    // Moved, but nobody told the player: the screen shows nothing of it.
    expect(html(next)).not.toContain('data-testid="personal-around"');
    const moveEvent = next.history.events.find(
      (row) => row.type === "migration.moved",
    )!;
    const told = recordEventKnowledge(next, {
      stableKey: "lives-markup:told",
      personId: small.personId,
      eventId: moveEvent.id,
      learnedAt: next.currentDate,
      believedSummary: moveEvent.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "told-by", sourcePersonId: mover, claimId: null },
    });
    const after = html(told);
    expect(after).toContain('data-testid="personal-around"');
    expect(after).toContain('data-kind="move"');
    expect(after).toContain("took a job elsewhere");
  });
});
