import { describe, expect, it } from "vitest";

import type { EntityId } from "../simulation";
import type { PublicInformationPanelItem } from "../presentation/public-information-adapters";
import {
  itemsForPublicInformationView,
  relevanceReasons,
} from "./public-information-views";

const VIEWER = "person-viewer" as EntityId;

function item(
  publicationId: string,
  people: PublicInformationPanelItem["people"] = [],
): PublicInformationPanelItem {
  return {
    publicationId: publicationId as EntityId,
    sourceEventId: `event-${publicationId}` as EntityId,
    sourceRecordIds: [],
    kind: "civic-event",
    outletKey: "civic-ledger",
    outletName: "Civic Ledger",
    jurisdictionId: null,
    jurisdictionName: null,
    eventTime: "2026-01-01",
    publicationTime: "2026-01-02",
    headline: `Headline ${publicationId}`,
    body: `Body ${publicationId}`,
    people,
    corrections: [],
    civicReferences: [],
  };
}

const named = item("publication-named", [
  { kind: "person", personId: VIEWER, label: "Viewer Name" },
]);
const other = item("publication-other");
const items = [named, other];

describe("public-information reader views", () => {
  it("keeps All in canonical order and filters an outlet by its real key", () => {
    expect(
      itemsForPublicInformationView(items, { kind: "all" }, VIEWER, []),
    ).toEqual(items);
    expect(
      itemsForPublicInformationView(
        items,
        { kind: "outlet", outletKey: "other-outlet" },
        VIEWER,
        [],
      ),
    ).toEqual([]);
  });

  it("uses only explicit follows and canonical person links for For You", () => {
    expect(
      itemsForPublicInformationView(items, { kind: "for-you" }, VIEWER, []),
    ).toEqual([named]);
    expect(
      itemsForPublicInformationView(items, { kind: "for-you" }, VIEWER, [
        "civic-ledger",
      ]),
    ).toEqual(items);
    expect(relevanceReasons(named, VIEWER, ["civic-ledger"])).toEqual([
      "You follow Civic Ledger.",
      "This story names you.",
    ]);
  });

  it("never removes a real story when an outlet is not followed", () => {
    expect(
      itemsForPublicInformationView(items, { kind: "all" }, VIEWER, []),
    ).toHaveLength(2);
    expect(
      itemsForPublicInformationView(
        items,
        { kind: "outlet", outletKey: "civic-ledger" },
        VIEWER,
        [],
      ),
    ).toHaveLength(2);
  });
});
