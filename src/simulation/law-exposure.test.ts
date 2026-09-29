import { describe, expect, it } from "vitest";
import {
  TEST_TAX_TERMS,
  enactedTaxFixture,
} from "../../tests/fixtures/tax-policy-fixture";
import { declarePersonalTaxOccurrence } from "../presentation/tax-work";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { daysBetween } from "./dates";
import { createPartnership } from "./life";
import {
  lawExposuresFrom,
  lawExposuresOf,
  recordLawExposure,
} from "./law-exposure";
import {
  followsNewsClosely,
  knowsVote,
  officialsBehind,
  peopleKnownTo,
  townSupportFromViews,
  viewOfOfficial,
} from "./living-world/official-views";
import { money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorld, assertWorldIntegrity } from "./world";

function collected(married = false) {
  const fixture = enactedTaxFixture();
  let world = fixture.world;
  const spouseId = world.personOrder.find((id) => id !== fixture.personId)!;
  if (married)
    world = createPartnership(world, {
      stableKey: "law-exposure-test:marriage",
      personIds: [fixture.personId, spouseId].sort() as [
        typeof spouseId,
        typeof spouseId,
      ],
      startedAt: world.currentDate,
      kind: "legal:marriage",
      provenance: {
        kind: "authored",
        note: "A married taxpayer for the test.",
      },
    });
  world = advanceWorld(
    world,
    daysBetween(
      fixture.world.currentDate,
      fixture.world.history.taxPolicies![0]!.effectiveAt,
    ),
    createCampaignElectionTransitionRegistry(),
  );
  world = declarePersonalTaxOccurrence(world, {
    personId: fixture.personId,
    stableKey: "law-exposure-test:occurrence",
    proposalId: fixture.proposalId,
    baseKey: TEST_TAX_TERMS.baseKey,
    amountMinorUnits: 2100,
    assumptionNote: "One explicit fictional taxable occurrence.",
  });
  world = advanceWorld(world, 2, createCampaignElectionTransitionRegistry());
  return { ...fixture, world, spouseId };
}

describe("a law reaches a person", () => {
  it("records the tax a person paid under an enacted law, on the day it was collected", () => {
    const { world, personId } = collected();
    const collection = world.history.taxCollections![0]!;
    expect(collection.status).toBe("collected");
    const measureId = world.history.taxProposals![0]!.measureId;
    const rows = lawExposuresOf(world, personId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      measureId,
      channel: "tax-payment",
      relation: "own",
      viaPersonId: null,
      direction: "cost",
      amount: money(100, "USD"),
      cadence: "one-time",
      sourceRecordId: collection.id,
      recordedAt: collection.recordedAt,
    });
    // The fixture pays this person nothing from work, so their month's pay is
    // a recorded zero, not unknown: the game tracks their money.
    expect(rows[0]!.monthlyPay).toEqual(money(0, "USD"));
    expect(lawExposuresFrom(world, measureId)).toEqual(rows);
    assertWorldIntegrity(world);
  });

  it("reaches the taxpayer's spouse as family", () => {
    const { world, personId, spouseId } = collected(true);
    const own = lawExposuresOf(world, personId)[0]!;
    expect(lawExposuresOf(world, spouseId)).toMatchObject([
      {
        measureId: own.measureId,
        relation: "family",
        viaPersonId: personId,
        amount: own.amount,
        sourceRecordId: own.sourceRecordId,
      },
    ]);
    assertWorldIntegrity(world);
  });

  it("a few days later the spouse blames the legislators they know voted for it; the player decides for themselves", () => {
    const { world, personId, spouseId } = collected(true);
    const later = advanceWorld(
      world,
      3,
      createCampaignElectionTransitionRegistry(),
    );
    const exposure = lawExposuresOf(later, spouseId)[0]!;
    const known = officialsBehind(later, exposure.measureId).filter(
      (act) =>
        act.officialId !== spouseId &&
        (act.executive || knowsVote(later, exposure, act.officialId)),
    );
    const views = (later.history.officialViews ?? []).filter(
      (row) => row.personId === spouseId,
    );
    expect(views.map((row) => row.officialId).sort()).toEqual(
      known.map((act) => act.officialId).sort(),
    );
    expect(views.length).toBeGreaterThan(0);
    for (const view of views) {
      // Every one of them voted to make the tax law, so it is blame.
      expect(view.act).toBe("voted-for");
      expect(view.points).toBeLessThan(0);
      expect(view.reasons[0]!.kind).toBe("family");
      expect(viewOfOfficial(later, spouseId, view.officialId).points).toBe(
        view.points,
      );
    }
    expect(
      (later.history.officialViews ?? []).some(
        (row) => row.personId === personId,
      ),
    ).toBe(false);
    assertWorldIntegrity(later);
  });

  it("a town count reads what residents think of a candidate", () => {
    const { world, spouseId } = collected(true);
    const later = advanceWorld(
      world,
      3,
      createCampaignElectionTransitionRegistry(),
    );
    const view = (later.history.officialViews ?? []).find(
      (row) => row.personId === spouseId,
    )!;
    const town = later.people[spouseId]!.homeJurisdictionId!;
    const blamed = townSupportFromViews(
      later,
      town,
      view.officialId,
      later.currentDate,
    );
    expect(blamed).toBeLessThan(1);
    expect(blamed).toBeGreaterThanOrEqual(0.5);
    // Nobody in town has reflected on anything this person did.
    expect(townSupportFromViews(later, town, spouseId, later.currentDate)).toBe(
      1,
    );
    // Before the view was formed, the count could not have read it.
    expect(
      townSupportFromViews(later, town, view.officialId, world.currentDate),
    ).toBe(1);
  });

  it("writes nothing twice and survives a save", () => {
    const { world, personId } = collected();
    const reloaded = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      3,
      createCampaignElectionTransitionRegistry(),
    );
    expect(lawExposuresOf(reloaded, personId)).toEqual(
      lawExposuresOf(world, personId),
    );
    const row = lawExposuresOf(world, personId)[0]!;
    expect(
      recordLawExposure(world, {
        stableKey: row.stableKey,
        personId,
        measureId: row.measureId,
        channel: row.channel,
        direction: row.direction,
        amount: row.amount,
        cadence: row.cadence,
        sourceRecordId: row.sourceRecordId,
      }),
    ).toBe(world);
  });

  it("refuses a law that was never enacted and a money effect with no cadence", () => {
    const { world, personId } = collected();
    const row = lawExposuresOf(world, personId)[0]!;
    expect(() =>
      recordLawExposure(world, {
        stableKey: "law-exposure-test:unenacted",
        personId,
        measureId: world.history.taxCollections![0]!.id,
        channel: "rent",
        direction: "cost",
        amount: money(5000, "USD"),
        cadence: "monthly",
        sourceRecordId: row.sourceRecordId,
      }),
    ).toThrow("Only an enacted law can reach a person.");
    expect(() =>
      recordLawExposure(world, {
        stableKey: "law-exposure-test:no-cadence",
        personId,
        measureId: row.measureId,
        channel: "rent",
        direction: "cost",
        amount: money(5000, "USD"),
        cadence: null,
        sourceRecordId: row.sourceRecordId,
      }),
    ).toThrow("amount and cadence go together");
  });

  it("a saved exposure pointing at a missing source record does not load", () => {
    const { world } = collected();
    const broken = {
      ...world,
      history: {
        ...world.history,
        lawExposures: world.history.lawExposures!.map((row) => ({
          ...row,
          sourceRecordId: "tax-collection_missing" as typeof row.sourceRecordId,
        })),
      },
    };
    expect(() => assertWorldIntegrity(broken)).toThrow(
      "source record is missing",
    );
  });

  it("people tell those they know, who reflect on it as something a friend went through", () => {
    const { world, personId } = collected();
    const row = lawExposuresOf(world, personId)[0]!;
    // Everyone else in the fixture has the same law reach them.
    let told = world;
    const tellers = world.personOrder.filter((id) => id !== personId);
    for (const id of tellers)
      told = recordLawExposure(told, {
        stableKey: `law-exposure-test:wom:${id}`,
        personId: id,
        measureId: row.measureId,
        channel: "tax-payment",
        direction: "cost",
        amount: row.amount,
        cadence: "one-time",
        sourceRecordId: row.sourceRecordId,
        includeFamily: false,
      });
    const registry = createCampaignElectionTransitionRegistry();
    const reflected = advanceWorld(told, 3, registry);
    const heard = (reflected.history.lawExposures ?? []).filter(
      (exposure) => exposure.relation === "friend",
    );
    expect(heard.length).toBeGreaterThan(0);
    for (const exposure of heard) {
      const teller = exposure.viaPersonId!;
      expect(tellers).toContain(teller);
      expect(peopleKnownTo(told, teller)).toContain(exposure.personId);
      expect(exposure.amount).toEqual(row.amount);
      expect(exposure.recordedAt).toBe(reflected.currentDate);
    }
    // At most three discussion partners each, and hearsay is not retold.
    for (const id of tellers)
      expect(
        heard.filter((exposure) => exposure.viaPersonId === id).length,
      ).toBeLessThanOrEqual(3);
    const later = advanceWorld(reflected, 3, registry);
    expect(
      (later.history.lawExposures ?? []).filter(
        (exposure) => exposure.relation === "friend",
      ),
    ).toEqual(heard);
    const friendViews = (later.history.officialViews ?? []).filter((view) =>
      heard.some((exposure) => exposure.id === view.exposureId),
    );
    for (const view of friendViews) {
      expect(view.reasons[0]!.kind).toBe("friend");
      expect(view.points).toBeLessThan(0);
    }
    assertWorldIntegrity(later);
  });

  it("a close news follower knows a legislator's vote; someone who neither follows nor knows them does not", () => {
    const { world } = collected();
    const exposure = lawExposuresOf(world, world.personOrder[0]!)[0]!;
    const official = world.personOrder[0]!;
    for (const personId of world.personOrder) {
      if (personId === official) continue;
      const probe = { ...exposure, personId };
      const follows = followsNewsClosely(world, personId);
      const acquainted = peopleKnownTo(world, personId).includes(official);
      expect(knowsVote(world, probe, official)).toBe(follows || acquainted);
    }
  });
});
