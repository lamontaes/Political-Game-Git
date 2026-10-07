import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeardOfficialViewsList } from "./HeardOfficialViewsList";
import type { PeopleDirectory } from "../presentation/people-directory";
import type { EntityId, IsoDate } from "../simulation/types";

describe("heard statements in People", () => {
  it("renders only supplied names, recorded positions and readable dates without totals", () => {
    const views: PeopleDirectory["heardViews"] = [
      {
        knowledgeId: "knowledge:one" as EntityId,
        eventId: "event:one" as EntityId,
        holderId: "person:holder" as EntityId,
        officialId: "person:player" as EntityId,
        holderName: "Recorded Speaker",
        position: "oppose",
        learnedAt: "2026-01-05" as IsoDate,
        accuracy: "accurate",
        confidence: "medium",
      },
    ];
    const html = renderToStaticMarkup(
      <HeardOfficialViewsList views={views} onSelectPerson={() => {}} />,
    );
    expect(html).toContain("Recorded Speaker");
    expect(html).toContain("oppose");
    expect(html).toContain("January 5, 2026");
    expect(html).toMatch(/datetime="2026-01-05"/i);
    expect(html).not.toMatch(
      /approval|percent|supporters|opponents|rating|medium|accurate/i,
    );
  });

  it("renders no placeholder or opinion when the listener heard nothing", () => {
    expect(
      renderToStaticMarkup(
        <HeardOfficialViewsList views={[]} onSelectPerson={() => {}} />,
      ),
    ).toBe("");
  });
});
