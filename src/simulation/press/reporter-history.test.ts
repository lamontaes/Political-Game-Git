import { describe, expect, it } from "vitest";

import type { EntityId, World } from "../types";
import { reporterContactCount } from "./reporter-history";

const reporter = "reporter" as EntityId;
const subject = "subject" as EntityId;
const otherPerson = "other" as EntityId;

function worldWithInteractions(
  relationshipInteractions: readonly unknown[],
): World {
  return {
    history: { relationshipInteractions },
  } as unknown as World;
}

describe("reporter history", () => {
  it("counts press contacts with a story subject in either person order", () => {
    const world = worldWithInteractions([
      {
        personIds: [reporter, subject],
        tags: ["press.contact"],
      },
      {
        personIds: [subject, reporter],
        tags: ["press.call.answered"],
      },
      {
        personIds: [reporter, otherPerson],
        tags: ["press.contact"],
      },
      {
        personIds: [reporter, subject],
        tags: ["family.contact"],
      },
    ]);

    expect(reporterContactCount(world, reporter, [subject])).toBe(2);
    expect(
      reporterContactCount(world, "another-reporter" as EntityId, [subject]),
    ).toBe(0);
  });
});
