import { describe, expect, it } from "vitest";
import type { World } from "../simulation";
import { readerHeadline } from "./news-headlines";

function worldWith(summary: string, tags: readonly string[]): World {
  return {
    history: { events: [{ id: "event_1", summary, tags }] },
  } as unknown as World;
}

const item = (headline: string) => ({ sourceEventId: "event_1", headline });

describe("a reader's headline for a saved publication", () => {
  it("writes a short headline for each stage of a local proposal", () => {
    const posted =
      "City of Lincoln posted a proposal about the repair schedule for several local roads and opened a public comment period.";
    expect(
      readerHeadline(
        worldWith(posted, ["family:local-matter", "stage:proposal-posted"]),
        item(posted),
      ),
    ).toBe("City of Lincoln seeks comment on road repair schedule plan");
    const withdrawn =
      "City of Lincoln withdrew its proposal about the repair schedule for several local roads.";
    expect(
      readerHeadline(
        worldWith(withdrawn, [
          "family:local-matter",
          "stage:proposal-withdrawn",
        ]),
        item(withdrawn),
      ),
    ).toBe("City of Lincoln drops road repair schedule plan");
  });

  it("writes a headline for an international development", () => {
    const eased =
      "The governments in the fishing-rights talks announced an interim arrangement.";
    expect(
      readerHeadline(
        worldWith(eased, ["family:international", "stage:eased"]),
        item(eased),
      ),
    ).toBe("Fishing-rights talks reach interim arrangement");
  });

  it("keeps the saved headline for anything it does not recognize", () => {
    expect(
      readerHeadline(worldWith("Something else happened.", []), item("Saved")),
    ).toBe("Saved");
    expect(
      readerHeadline(
        worldWith("A council met about an unlisted subject.", [
          "family:local-matter",
          "stage:proposal-posted",
        ]),
        item("Saved"),
      ),
    ).toBe("Saved");
    expect(
      readerHeadline(worldWith("x", []), {
        sourceEventId: "missing",
        headline: "Saved",
      }),
    ).toBe("Saved");
  });
});
