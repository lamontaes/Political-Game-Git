import { describe, expect, it } from "vitest";

import type { EntityId, World } from "../simulation/types";
import { storyLawReader } from "./news-front-page";

/**
 * A story built from a bill's step or its enactment links to the bill's page,
 * where what the law did is written. The world here is only the records the
 * reader follows: a published story, its lead, the events the lead was built
 * from, and the bills those events belong to. The watched run in the pull
 * request shows the same links on a world that ran.
 */

const id = (text: string) => text as EntityId;

function world(): World {
  return {
    history: {
      legislativeMeasures: [
        {
          id: id("measure_a"),
          shortTitle: "The Clean Water Act",
          designation: "H.B. 12",
        },
        {
          id: id("measure_b"),
          shortTitle: "The Bus Fare Ordinance",
          designation: "ORD 3",
        },
      ],
      legislativeActions: [
        { eventId: id("event_filed"), measureId: id("measure_a") },
      ],
      legislativeEnactments: [
        { outcomeEventId: id("event_enacted"), measureId: id("measure_b") },
      ],
      pressRecords: [
        {
          kind: "story-lead",
          id: id("lead_bill"),
          basisEventIds: [
            id("event_filed"),
            id("event_enacted"),
            id("event_other"),
          ],
        },
        {
          kind: "story-lead",
          id: id("lead_fire"),
          basisEventIds: [id("event_other")],
        },
        {
          kind: "story-disposition",
          id: id("d1"),
          leadId: id("lead_bill"),
          publicationId: id("pub_bill"),
        },
        {
          kind: "story-disposition",
          id: id("d2"),
          leadId: id("lead_fire"),
          publicationId: id("pub_fire"),
        },
        {
          kind: "story-disposition",
          id: id("d3"),
          leadId: id("lead_fire"),
          publicationId: null,
        },
      ],
    },
  } as unknown as World;
}

describe("a news story links to the laws it reports on", () => {
  it("a story built from a bill's step or enactment names each bill once", () => {
    const lawsOf = storyLawReader(world());
    expect(lawsOf(id("pub_bill"))).toEqual([
      { measureId: "measure_a", label: "The Clean Water Act (H.B. 12)" },
      { measureId: "measure_b", label: "The Bus Fare Ordinance (ORD 3)" },
    ]);
  });

  it("a story about something else links no law", () => {
    const lawsOf = storyLawReader(world());
    expect(lawsOf(id("pub_fire"))).toEqual([]);
    expect(lawsOf(id("pub_unknown"))).toEqual([]);
  });

  it("a story published about a bill's own step links that bill", () => {
    const lawsOf = storyLawReader(world());
    expect(lawsOf(id("pub_direct"), id("event_filed"))).toEqual([
      { measureId: "measure_a", label: "The Clean Water Act (H.B. 12)" },
    ]);
  });
});
