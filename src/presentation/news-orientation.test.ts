import { describe, expect, it } from "vitest";

import { serializeWorld, deserializeWorld } from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { projectNewsOrientation } from "./news-orientation";
import { projectPublicInformationPanel } from "./public-information-adapters";
import { recordWorldEvent } from "../simulation/world";
import { proseDate } from "./prose-dates";
import { establishOpeningOfficeholders } from "./opening-officeholders";

/** Wording that describes the save or the engine instead of the place. */
const DATABASE_WORDING =
  /\brecorded\b|in this save|this character|accepted authority|Reading does not|Assembled/i;

function allOrientationText(
  orientation: ReturnType<typeof projectNewsOrientation>,
): string {
  return [
    orientation.assembledLine,
    orientation.publicWorld.emptyReason ?? "",
    orientation.viewerAccessible.emptyReason ?? "",
    ...orientation.publicWorld.items.map(
      (item) => `${item.headline} ${item.recap}`,
    ),
  ].join("\n");
}

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
    // Offices the authority records support but the World has not filled are
    // reported to producers, never narrated as a vacancy or given a holder.
    expect(
      orientation.unfilledOffices.some((office) =>
        /Governor/.test(office.displayName),
      ),
    ).toBe(true);
    expect(
      orientation.publicWorld.items.some((item) => item.kind === "incumbent"),
    ).toBe(false);
    expect(allOrientationText(orientation)).not.toMatch(DATABASE_WORDING);
    expect(allOrientationText(orientation)).not.toMatch(
      /No incumbent|vacan|URBAN_COUNTY/i,
    );
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
    const meeting = afterMeeting.publicWorld.items.find(
      (item) => item.kind === "public-event",
    );
    expect(meeting?.recap).toBe(
      "Residents met for the scheduled public community meeting.",
    );
    expect(meeting?.recap).not.toMatch(/Named:/);
    expect(meeting?.links.some((link) => link.kind === "person")).toBe(true);
    expect(afterMeeting.viewerAccessible.emptyReason).toBe(
      "None of this has reached you directly yet.",
    );
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

  it("names who actually holds public office from real office work", () => {
    const created = legislativeLife("world39-news-incumbent");
    const orientation = projectNewsOrientation(
      created.world,
      created.playerPersonId,
    );
    const incumbents = orientation.publicWorld.items.filter(
      (item) => item.kind === "incumbent",
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
    expect(
      incumbents.every((item) => /since [A-Z][a-z]+ \d{4}\.$/.test(item.recap)),
    ).toBe(true);
    expect(allOrientationText(orientation)).not.toMatch(DATABASE_WORDING);
  });

  it("projects the opening's national officeholders instead of leaving those offices unfilled", () => {
    const created = ordinaryLife("world39-news-opening-holders");
    const before = projectNewsOrientation(
      created.world,
      created.playerPersonId,
    );
    expect(
      before.unfilledOffices.some((office) =>
        /President/.test(office.displayName),
      ),
    ).toBe(true);
    const opened = establishOpeningOfficeholders(
      created.world,
      created.playerPersonId,
    );
    const after = projectNewsOrientation(opened, created.playerPersonId);
    const president = after.publicWorld.items.find(
      (item) =>
        item.kind === "incumbent" &&
        item.headline.endsWith("serves as President of the United States"),
    );
    expect(president).toBeDefined();
    expect(president?.recap).toMatch(
      /^.+ has served as President of the United States at Presidency of the United States since January \d{4}\.$/,
    );
    expect(president?.links.some((link) => link.kind === "person")).toBe(true);
    expect(
      after.unfilledOffices.some((office) =>
        /President/.test(office.displayName),
      ),
    ).toBe(false);
    expect(
      after.publicWorld.items.some((item) => item.kind === "public-event"),
    ).toBe(false);
    // The office's own organization is not listed again as an institution,
    // and nothing unlocated is placed in the lived town.
    expect(
      after.publicWorld.items.some(
        (item) =>
          item.kind === "institution" &&
          /Presidency of the United States|Supreme Court/.test(item.headline),
      ),
    ).toBe(false);
    expect(allOrientationText(after)).not.toMatch(
      /(Presidency|Supreme Court)[^.]* in Lexington/,
    );
    expect(allOrientationText(after)).not.toMatch(DATABASE_WORDING);
    expect(allOrientationText(after)).not.toMatch(/fictional/i);
  });

  it("opens with a plain dateline for the lived place and no reading guarantee", () => {
    const created = ordinaryLife("world39-news-reading-note");
    const before = created.world.history.nextSequence;
    const orientation = projectNewsOrientation(
      created.world,
      created.playerPersonId,
    );
    expect(orientation.placeName).toBeTruthy();
    expect(orientation.assembledLine).toBe(
      `${orientation.placeName}, as of ${proseDate(orientation.asOf)}.`,
    );
    expect(orientation.assembledLine).not.toMatch(
      /Assembled|Reading does not publish/,
    );
    expect(created.world.history.nextSequence).toBe(before);
  });

  it("speaks about the place, not about the save", () => {
    const created = ordinaryLife("world39-news-wording");
    const orientation = projectNewsOrientation(
      created.world,
      created.playerPersonId,
    );
    const government = orientation.publicWorld.items.find((item) =>
      item.key.startsWith("institution:government:"),
    );
    expect(government?.headline).toBe(
      "Lexington, Kentucky is governed by Lexington-Fayette Urban County Government",
    );
    expect(government?.recap).toContain("Urban County Council");
    expect(government?.recap).not.toMatch(/Form:|Recorded body|Reading as of/);
    const school = orientation.publicWorld.items.find(
      (item) =>
        item.key.startsWith("institution:org:") &&
        item.headline.includes("School"),
    );
    expect(school?.recap).toMatch(/^.+ is a school in Lexington, Kentucky\.$/);
    expect(orientation.viewerAccessible.emptyReason).toBe(
      "Nothing has happened in public here lately.",
    );
    expect(allOrientationText(orientation)).not.toMatch(DATABASE_WORDING);
  });
});
