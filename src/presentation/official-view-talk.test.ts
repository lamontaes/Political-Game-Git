import { describe, expect, it } from "vitest";
import {
  TEST_TAX_TERMS,
  enactedTaxFixture,
} from "../../tests/fixtures/tax-policy-fixture";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { daysBetween } from "../simulation/dates";
import { createPartnership } from "../simulation/life";
import {
  officialStanding,
  viewOfOfficial,
} from "../simulation/official-view-reads";
import { advanceWorld } from "../simulation/world";
import { projectLifeConversation } from "./life-conversation";
import { openNextLifeScene } from "./life-scene-flow";
import { officialViewLine, strongestOfficialView } from "./small-talk-english";
import { declarePersonalTaxOccurrence } from "./tax-work";

function reflected() {
  const fixture = enactedTaxFixture();
  const spouseId = fixture.world.personOrder.find(
    (id) => id !== fixture.personId,
  )!;
  let world = createPartnership(fixture.world, {
    stableKey: "official-view-talk:marriage",
    personIds: [fixture.personId, spouseId].sort() as [
      typeof spouseId,
      typeof spouseId,
    ],
    startedAt: fixture.world.currentDate,
    kind: "legal:marriage",
    provenance: { kind: "authored", note: "A married taxpayer for the test." },
  });
  const registry = createCampaignElectionTransitionRegistry();
  world = advanceWorld(
    world,
    daysBetween(world.currentDate, world.history.taxPolicies![0]!.effectiveAt),
    registry,
  );
  world = declarePersonalTaxOccurrence(world, {
    personId: fixture.personId,
    stableKey: "official-view-talk:occurrence",
    proposalId: fixture.proposalId,
    baseKey: TEST_TAX_TERMS.baseKey,
    amountMinorUnits: 2100,
    assumptionNote: "One explicit fictional taxable occurrence.",
  });
  world = advanceWorld(world, 5, registry);
  return { world, personId: fixture.personId, spouseId };
}

describe("people say what they think of an official", () => {
  it("the standing shown is the view the spouse saved through the belief pipeline", () => {
    const { world, spouseId } = reflected();
    const view = strongestOfficialView(world, spouseId)!;
    // The saved view: the spouse's latest private belief about this official.
    const saved = world.history.privateBeliefs
      .filter(
        (belief) =>
          belief.personId === spouseId &&
          belief.subject?.kind === "official" &&
          belief.subject.personId === view.officialId,
      )
      .at(-1)!;
    expect(view.belief).toEqual(saved);
    expect(view.sourceRecordId).toBe(saved.id);
    expect(saved.position).toBe("oppose");
    expect(view.points).toBe(officialStanding(saved));
    expect(view.points).toBe(
      viewOfOfficial(world, spouseId, view.officialId).points,
    );
    // Formed by the pipeline, not computed beside it: a decision trace on
    // the official, whose winning reason is what the law did.
    const trace = world.history.decisionTraces.find(
      (row) => row.id === saved.formation.decisionTraceIds[0],
    )!;
    expect(trace.context.decisionType).toBe("political-belief-formation");
    expect(trace.context.subject.entityId).toBe(view.officialId);
    expect(trace.selectedOptionKey).toBe("opposition");
    expect(
      trace.context.considerations.some(
        (row) => row.stableKey === `factor:law-exposure:${view.exposure.id}`,
      ),
    ).toBe(true);
    // No old reflection rows are written.
    expect(world.history.officialViews ?? []).toEqual([]);
  });

  it("the spouse names who voted for the tax, the law, and that it cost the player's household", () => {
    const { world, personId, spouseId } = reflected();
    const view = strongestOfficialView(world, spouseId)!;
    expect(view.points).toBeLessThan(0);
    const official = world.people[view.officialId]!;
    const measure = world.history.legislativeMeasures!.find(
      (row) => row.id === view.measureId,
    )!;
    const line = officialViewLine(world, spouseId, personId, [])!;
    expect(line.text).toContain(`${official.givenName} ${official.familyName}`);
    expect(line.text).toContain(measure.shortTitle);
    expect(line.text).toContain(world.people[personId]!.givenName);
    expect(line.text).not.toMatch(/\d+ points?/);
    expect(line.parts.map((part) => part.variantKey)).toContain("family-cost");
  });

  it("is offered only to someone who holds such a view", () => {
    const reflectedWorld = reflected();
    const { personId, spouseId } = reflectedWorld;
    // The player is home, with the household present, as play opens a day.
    const world = openNextLifeScene(reflectedWorld.world, personId, "home");
    const withView = projectLifeConversation(world, personId, spouseId);
    expect(
      withView?.intents.map((row) => (typeof row === "string" ? row : row.key)),
    ).toContain("officials");
    const other = world.personOrder.find(
      (id) => id !== personId && strongestOfficialView(world, id) === null,
    );
    if (other) {
      const without = projectLifeConversation(world, personId, other);
      expect(
        (without?.intents ?? []).map((row) =>
          typeof row === "string" ? row : row.key,
        ),
      ).not.toContain("officials");
    }
  });
});
