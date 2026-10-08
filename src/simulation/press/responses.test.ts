import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../index";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import { openMatter } from "./matters";
import { pressRecordsOfKind } from "./store";
import { respondToMatter } from "./responses";
import {
  enterSupportedTerm,
  recordedTermFixture,
} from "../../../tests/fixtures/recorded-legislative-term";

describe("subject matter responses", () => {
  it("records each of the five choices through the shared matter writer", () => {
    for (const response of [
      "deny",
      "apologize",
      "attack-source",
      "decline-comment",
      "resign",
    ] as const) {
      const created = createScenarioWorld(
        `matter-response-${response}`,
        KENTUCKY_CONTEXT,
        {
          peopleCount: 5,
        },
      );
      const personId = created.personOrder[0]!;
      const world = {
        ...created,
        control: { kind: "person" as const, personId },
      };
      const originEventId = world.history.events.at(-1)!.id;
      const opened = openMatter(world, {
        stableKey: `matter-response:${response}`,
        family: "M1",
        subjectPersonIds: [personId],
        occurrenceId: null,
        originEventId,
        jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
      });
      const answered = respondToMatter(opened.world, {
        matterId: opened.matter.id,
        personId,
        response,
        meaning: `Recorded meaning for ${response}`,
      });
      expect(
        pressRecordsOfKind(answered, "matter-response").at(-1),
      ).toMatchObject({
        matterId: opened.matter.id,
        actorPersonId: personId,
        actorRole: "subject",
        response,
        knowledgeIds: [],
      });
      expect(answered.history.events.at(-1)?.summary).toContain(
        `Recorded meaning for ${response}`,
      );
    }
  });

  it("routes resignation through the office consequence writer", () => {
    const fixture = recordedTermFixture("player");
    const world = enterSupportedTerm(fixture.world, fixture.personId);
    const opened = openMatter(world, {
      stableKey: "matter-response:resignation",
      family: "M1",
      subjectPersonIds: [fixture.personId],
      occurrenceId: null,
      originEventId: world.history.events.at(-1)!.id,
      jurisdictionId: world.people[fixture.personId]!.homeJurisdictionId,
    });
    const played = {
      ...opened.world,
      control: { kind: "person" as const, personId: fixture.personId },
    };
    const answered = respondToMatter(played, {
      matterId: opened.matter.id,
      personId: fixture.personId,
      response: "resign",
      meaning: "resign",
    });
    expect(answered.history.workStatuses.length).toBeGreaterThan(
      played.history.workStatuses.length,
    );
  });
});
