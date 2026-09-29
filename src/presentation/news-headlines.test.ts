import { describe, expect, it } from "vitest";
import type { EntityId, World } from "../simulation";
import { readerHeadline } from "./news-headlines";

describe("recorded newspaper headlines", () => {
  it("preserves an independently reported headline and every correction", () => {
    const world = { history: { events: [] } } as unknown as World;
    for (const headline of [
      "Council adopts ORD 12",
      "Correction: ORD 12 takes effect February 1",
    ]) {
      expect(
        readerHeadline(world, {
          sourceEventId: "event_1" as EntityId,
          headline,
        }),
      ).toBe(headline);
    }
  });
});
