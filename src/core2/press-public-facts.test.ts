import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { createLifeCore, advanceCore } from "./life";
import { coreAPI } from "./state";
import { viewsModule, VIEWS_MODULE_ID } from "./modules/views";
import { wireItem } from "./press-topics";
import { printItem, type DeskContext, type DeskOutlet } from "./press-desk";
import { newsModule, storiesHeard } from "./modules/news";

describe("public facts through a printed story", () => {
  it("delivers the employer's reasons only to a reader, with the source record", () => {
    const input = piecesInput();
    const core = createLifeCore(
      {
        ...input,
        people: [
          ...input.people,
          { ...input.people[0]!, id: "nonreader", householdId: "other" },
        ],
        households: [
          ...input.households,
          { ...input.households[0]!, id: "other", memberIds: ["nonreader"] },
        ],
      },
      { modules: [viewsModule, newsModule] },
    );
    const api = coreAPI(core);
    api.moduleState(VIEWS_MODULE_ID).table("people").put({
      id: "actor",
      lean: 0,
      engagement: 1,
      label: "moderate",
      basis: "fixture",
      formedAt: core.date,
    });
    const facts = {
      organizationId: "shop",
      tradingId: "trading:shop:month",
      salesMinor: "100",
      costsMinor: "200",
      jobsLost: "1",
    };
    const item = wireItem(
      api,
      {
        id: "staffing:shop",
        kind: "business.staff-reduced",
        date: core.date,
        placeId: "place",
        personIds: [],
        publicRecord: true,
        topic: "shop",
        facts,
        source: piecesSource,
      },
      { placeId: "place", stateKey: "state" },
    )!;
    expect(item.facts).toEqual(facts);
    const outlet: DeskOutlet = {
      id: "paper",
      organizationId: "paper-org",
      placeId: "place",
      headId: null,
      reporterIds: ["actor"],
      lean: 0,
      audienceRevenueMinor: 0,
    };
    const ctx: DeskContext = {
      parameter: () => 0,
      followers: () => ["actor"],
      townPlaceId: "place",
      adMoney: () => 0,
      rivals: () => [],
      printed: () => false,
      countedFollowers: () => 0,
      save: () => {},
    };
    const story = printItem(api, ctx, outlet, "actor", item, null, {
      slant: {
        slant: 0,
        reasons: { lean: 0, tie: 0, publisher: 0, rivals: 0, advertiser: 0 },
      },
    });
    const saved = api.moduleState("news").table("stories").get(story.id);
    expect(saved).toMatchObject({
      facts: { ...facts, sourceRecordId: item.id },
    });
    expect(storiesHeard(api, "actor")).toHaveLength(0);
    advanceCore(core, "2026-01-25");
    expect(
      storiesHeard(api, "actor").find((row) => row.id === story.id)?.facts,
    ).toMatchObject({ ...facts, sourceRecordId: item.id });
    expect(storiesHeard(api, "nonreader")).toHaveLength(0);
  });
});
