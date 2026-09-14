import { describe, expect, it } from "vitest";

import { serializeWorld, deserializeWorld } from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { projectNewsOrientation } from "./news-orientation";
import { projectPublicInformationPanel } from "./public-information-adapters";
import { recordWorldEvent } from "../simulation/world";

function ordinaryLife(seed: string) {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: "lexington-fayette",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    questionnaire: "skipped",
    givenName: "Maya",
    familyName: "Hale",
  });
}

function legislativeLife(seed: string) {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: "kentucky",
    startAge: 38,
    depth: "summarize-earlier-life",
    startingLife: "legislative-office",
    household: "shares-a-home",
    questionnaire: "skipped",
    givenName: "Maya",
    familyName: "Hale",
  });
}

describe("News orientation reader", () => {
  it("assembles institutions and vacant offices from a lived place without publishing", () => {
    const created = ordinaryLife("world39-news-populated");
    const before = created.world.history.nextSequence;
    const publications = created.world.history.publications?.length ?? 0;
    const orientation = projectNewsOrientation(
      created.world,
      created.playerPersonId,
    );
    expect(orientation.publicWorld.items.length).toBeGreaterThan(0);
    expect(
      orientation.publicWorld.items.some((item) => item.kind === "institution"),
    ).toBe(true);
    expect(
      orientation.publicWorld.items.some(
        (item) =>
          item.kind === "incumbent" && item.headline.startsWith("No incumbent"),
      ),
    ).toBe(true);
    expect(
      orientation.publicWorld.items.some((item) => item.kind === "publication"),
    ).toBe(false);
    expect(created.world.history.nextSequence).toBe(before);
    expect(created.world.history.publications?.length ?? 0).toBe(publications);
    expect(
      orientation.publicWorld.items.map((item) => item.headline).join("\n"),
    ).not.toMatch(/war|invented election|something happened/i);

    const withMeeting = recordWorldEvent(created.world, {
      stableKey: "world39:public-meeting",
      type: "civic.community-meeting-held",
      occurredAt: created.world.currentDate,
      recordedAt: created.world.currentDate,
      jurisdictionId:
        created.world.people[created.playerPersonId]!.homeJurisdictionId,
      involvedEntityIds: [
        created.world.people[created.playerPersonId]!.homeJurisdictionId,
        created.playerPersonId,
      ],
      participants: [
        {
          personId: created.playerPersonId,
          role: "presence:attendee",
          detail: null,
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["civic"],
      summary: "Residents met for the scheduled public community meeting.",
      context: {
        location: {
          jurisdictionId:
            created.world.people[created.playerPersonId]!.homeJurisdictionId,
          label: "Community meeting room",
          setting: null,
        },
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const afterMeeting = projectNewsOrientation(
      withMeeting,
      created.playerPersonId,
    );
    expect(
      afterMeeting.publicWorld.items.some(
        (item) =>
          item.kind === "public-event" &&
          item.recap.includes("scheduled public community meeting"),
      ),
    ).toBe(true);
    expect(withMeeting.history.publications?.length ?? 0).toBe(publications);
  });

  it("keeps private events out of News and lists public events with record links", () => {
    const created = ordinaryLife("world39-news-private");
    const privateWorld = recordWorldEvent(created.world, {
      stableKey: "world39:private-motive",
      type: "politics.private-vote-intention",
      occurredAt: created.world.currentDate,
      recordedAt: created.world.currentDate,
      jurisdictionId:
        created.world.people[created.playerPersonId]!.homeJurisdictionId,
      involvedEntityIds: [created.playerPersonId],
      participants: [
        {
          personId: created.playerPersonId,
          role: "agency:actor",
          detail: "private intention",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["private"],
      summary: "A private motive that must not appear in News.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: "secret",
        immediateReaction: null,
      },
    });
    const orientation = projectNewsOrientation(
      privateWorld,
      created.playerPersonId,
    );
    const text = orientation.publicWorld.items
      .map((item) => `${item.headline} ${item.recap}`)
      .join("\n");
    expect(text).not.toContain("private motive");
    expect(text).not.toContain("secret");
  });

  it("round-trips through save without changing orientation copy", () => {
    const created = ordinaryLife("world39-news-save");
    const first = projectNewsOrientation(created.world, created.playerPersonId);
    const restored = deserializeWorld(serializeWorld(created.world));
    expect(projectNewsOrientation(restored, created.playerPersonId)).toEqual(
      first,
    );
    expect(
      projectPublicInformationPanel(
        created.world,
        undefined,
        created.playerPersonId,
      ).orientation,
    ).toEqual(first);
  });

  it("names a recorded legislative incumbent from actual office work", () => {
    const created = legislativeLife("world39-news-incumbent");
    const orientation = projectNewsOrientation(
      created.world,
      created.playerPersonId,
    );
    const incumbents = orientation.publicWorld.items.filter(
      (item) =>
        item.kind === "incumbent" && !item.headline.startsWith("No incumbent"),
    );
    expect(incumbents.length).toBeGreaterThan(0);
    expect(incumbents.some((item) => item.headline.includes("Maya Hale"))).toBe(
      true,
    );
    expect(
      incumbents.every((item) =>
        item.links.some((link) => link.kind === "person"),
      ),
    ).toBe(true);
  });

  it("states that reading News does not publish, using the lived place", () => {
    const created = ordinaryLife("world39-news-reading-note");
    const orientation = projectNewsOrientation(
      created.world,
      created.playerPersonId,
    );
    expect(orientation.assembledLine).toContain("Assembled");
    expect(orientation.assembledLine).toContain(orientation.asOf);
    expect(orientation.assembledLine).toContain(
      "Reading does not publish a story or create the event it reports.",
    );
    expect(orientation.placeName).toBeTruthy();
    expect(orientation.assembledLine).toContain(orientation.placeName!);
  });
});
