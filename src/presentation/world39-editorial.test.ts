import { describe, expect, it } from "vitest";

import { serializeWorld, deserializeWorld } from "../simulation";
import { recordWorldEvent } from "../simulation/world";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { establishOpeningOfficeholders } from "./opening-officeholders";
import { projectStoryMoment, chooseStoryOption } from "./life-story";
import { projectWorld39News } from "./world39-news";
import { projectWorld39Journal } from "./world39-journal";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/** Generic checks use an explicit non-Kentucky locality (Minneapolis, Minnesota). */
const GENERIC_PLACE_KEY = "2743000";
/** Named Kentucky regression: only the consolidated-government sentence needs it. */
const KENTUCKY_LEXINGTON_PLACE_KEY = "lexington-fayette";

/** Wording that describes the save or the engine instead of the place or the life. */
const DATABASE_WORDING =
  /\brecorded\b|in this save|this character|the character\b|accepted authority|Reading does not|Assembled|saved-world|No incumbent|vacan|URBAN_COUNTY|\d{4}-\d{2}-\d{2}|proof[- ]ledger|was active\b/i;

function ordinaryLife(seed: string, placeKey: string = GENERIC_PLACE_KEY) {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey,
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    questionnaire: "skipped",
    givenName: "Maya",
    familyName: "Hale",
  });
}

function playedChild(seed: string, beats: number) {
  let created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startKind: "custom",
    placeKey: GENERIC_PLACE_KEY,
    startAge: 9,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    questionnaire: "skipped",
    givenName: "Maya",
    familyName: "Hale",
  });
  for (let index = 0; index < beats; index += 1) {
    const moment = projectStoryMoment(created.world, created.playerPersonId);
    const option = moment.scene.options[0];
    if (!option) break;
    created = {
      ...created,
      world: chooseStoryOption(created.world, {
        personId: created.playerPersonId,
        scene: moment.scene,
        optionKey: option.key,
      }),
    };
  }
  return created;
}

function newsText(model: ReturnType<typeof projectWorld39News>): string {
  return [
    ...model.standing.map((item) => `${item.headline} ${item.sentence}`),
    ...model.officeholders.map(
      (holder) => `${holder.headline} ${holder.sentence}`,
    ),
    ...model.publicEvents.map((event) => event.summary),
  ].join("\n");
}

function journalText(model: ReturnType<typeof projectWorld39Journal>): string {
  return model.entries.map((entry) => entry.text).join("\n");
}

describe("WORLD39 News editorial pass", () => {
  it("speaks about the place, projects the opening's national tenures, and never narrates a vacancy", () => {
    const created = ordinaryLife("world39-editorial-news");
    const before = projectWorld39News(created.world, created.playerPersonId);
    expect(before.placeName).toBe("Minneapolis, Minnesota");
    expect(before.officeholders).toHaveLength(0);
    expect(
      before.unfilledOffices.some((office) =>
        /President/.test(office.displayName),
      ),
    ).toBe(true);
    expect(newsText(before)).not.toMatch(DATABASE_WORDING);

    const opened = establishOpeningOfficeholders(
      created.world,
      created.playerPersonId,
    );
    const sequence = opened.history.nextSequence;
    const after = projectWorld39News(opened, created.playerPersonId);
    expect(opened.history.nextSequence).toBe(sequence);
    const president = after.officeholders.find(
      (holder) => holder.title === "President of the United States",
    );
    expect(president?.headline).toMatch(
      /^.+ serves as President of the United States$/,
    );
    expect(president?.sentence).toMatch(
      /^.+ has served as President of the United States at Presidency of the United States since January \d{4}\.$/,
    );
    // The office title bridges the opening's us-president key and the
    // authority packs' us-federal-president key.
    expect(
      after.unfilledOffices.some((office) =>
        /President/.test(office.displayName),
      ),
    ).toBe(false);
    // The office's own organization is told through its holder, and nothing
    // unlocated is placed in the lived town.
    expect(
      after.standing.some((item) =>
        /Presidency|Supreme Court/.test(item.headline),
      ),
    ).toBe(false);
    expect(newsText(after)).not.toMatch(/(Presidency|Supreme Court)[^.]* in /);
    expect(newsText(after)).not.toMatch(DATABASE_WORDING);
    const school = after.standing.find((item) => /School/.test(item.headline));
    expect(school?.sentence).toMatch(
      /^.+ is a school in Minneapolis, Minnesota\.$/,
    );
  });

  it("Kentucky regression: Lexington names its consolidated government in plain words", () => {
    const created = ordinaryLife(
      "world39-editorial-lexington",
      KENTUCKY_LEXINGTON_PLACE_KEY,
    );
    const model = projectWorld39News(created.world, created.playerPersonId);
    const government = model.standing.find(
      (item) => item.kind === "government",
    );
    expect(government?.headline).toBe(
      "Lexington, Kentucky is governed by Lexington-Fayette Urban County Government",
    );
    expect(government?.sentence).toBe(
      "Its legislative body is the Urban County Council. It runs through a consolidated city and county government.",
    );
    expect(newsText(model)).not.toMatch(DATABASE_WORDING);
  });

  it("lists a public event plainly, marks personal knowledge, and keeps private events out", () => {
    const created = ordinaryLife("world39-editorial-events");
    const jurisdictionId =
      created.world.people[created.playerPersonId]!.homeJurisdictionId;
    const withMeeting = recordWorldEvent(created.world, {
      stableKey: "world39:public-meeting",
      type: "civic.community-meeting-held",
      occurredAt: created.world.currentDate,
      recordedAt: created.world.currentDate,
      jurisdictionId,
      involvedEntityIds: [jurisdictionId, created.playerPersonId],
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
          jurisdictionId,
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
    const withPrivate = recordWorldEvent(withMeeting, {
      stableKey: "world39:private-motive",
      type: "politics.private-vote-intention",
      occurredAt: withMeeting.currentDate,
      recordedAt: withMeeting.currentDate,
      jurisdictionId,
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
    const model = projectWorld39News(withPrivate, created.playerPersonId);
    const meeting = model.publicEvents.find((event) =>
      /community meeting/.test(event.summary),
    );
    expect(meeting?.summary).toBe(
      "Residents met for the scheduled public community meeting.",
    );
    expect(meeting?.known).toBe(false);
    // The engine's own life-start record is not a public happening.
    expect(newsText(model)).not.toMatch(/life is picked up/);
    expect(newsText(model)).not.toContain("private motive");
    expect(newsText(model)).not.toContain("secret");
    expect(withPrivate.history.publications?.length ?? 0).toBe(
      created.world.history.publications?.length ?? 0,
    );
  });
});

describe("WORLD39 Journal editorial pass", () => {
  it("tells several played beats as one second-person account grouped by year", () => {
    const created = playedChild("world39-editorial-beats", 4);
    const model = projectWorld39Journal(created.world, created.playerPersonId);
    expect(model.entries[0]?.text).toMatch(
      /^You were born on [A-Z][a-z]+ \d{1,2}, \d{4}\.$/,
    );
    const events = model.entries.filter((entry) => entry.kind === "event");
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.every((entry) => /^You /.test(entry.text))).toBe(true);
    const text = journalText(model);
    expect(text).not.toMatch(/you chose to/i);
    expect(text).not.toMatch(DATABASE_WORDING);
    const dates = model.entries.map((entry) => entry.at);
    expect([...dates].sort()).toEqual(dates);
    expect(model.chapters.length).toBeGreaterThanOrEqual(2);
    expect(model.chapters[0]?.year).toBe(
      created.world.people[created.playerPersonId]!.birthDate.slice(0, 4),
    );
    expect(model.chapters.flatMap((chapter) => chapter.entries)).toEqual(
      model.entries,
    );
    const last = model.chapters[model.chapters.length - 1]!;
    expect(last.heading).toMatch(/^\d{4}, age \d+$/);
    expect(last.entries.length).toBeGreaterThanOrEqual(3);
  });

  it("names the role in work sentences and drops the engine's status reason", () => {
    const created = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "world39-editorial-office",
      placeKey: "nebraska",
      startAge: 38,
      depth: "summarize-earlier-life",
      startingLife: "legislative-office",
      household: "shares-a-home",
      questionnaire: "skipped",
      givenName: "Maya",
      familyName: "Hale",
    });
    const model = projectWorld39Journal(created.world, created.playerPersonId);
    const work = model.entries.filter((entry) => entry.id.startsWith("work:"));
    expect(work.length).toBeGreaterThan(0);
    expect(
      work.some((entry) =>
        /^You began working as .+ at .+\.$/.test(entry.text),
      ),
    ).toBe(true);
    expect(
      work.every((entry) => !/did not follow|the character/.test(entry.text)),
    ).toBe(true);
    const text = journalText(model);
    expect(text).not.toMatch(DATABASE_WORDING);
    expect(text).not.toMatch(/^I remember /m);
    expect(text).not.toMatch(/life is picked up/);
  });

  it("narrates secondhand accounts of things that happened, not the state of standing offers", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "world39-editorial-offers",
        placeKey: GENERIC_PLACE_KEY,
        startAge: 34,
        givenName: "Maya",
        familyName: "Hale",
      }),
    ).game!;
    const model = projectWorld39Journal(game.world, game.playerPersonId);
    const accounts = model.entries.filter((entry) => entry.kind === "account");
    const offerTypes = new Set(
      game.world.history.events
        .filter((event) =>
          /-(proposed|invited|requested|disclosed|approach)$/.test(event.type),
        )
        .map((event) => event.id),
    );
    expect(accounts.every((entry) => !offerTypes.has(entry.sourceId))).toBe(
      true,
    );
    const text = journalText(model);
    expect(text).not.toMatch(/authored activity|the other person will be in/);
    expect(text).not.toMatch(DATABASE_WORDING);
  });

  it("keeps the account identical after save and clean for a sparse life", () => {
    const created = playedChild("world39-editorial-save", 2);
    const first = projectWorld39Journal(created.world, created.playerPersonId);
    const restored = deserializeWorld(serializeWorld(created.world));
    expect(projectWorld39Journal(restored, created.playerPersonId)).toEqual(
      first,
    );
    const sparse = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "world39-editorial-sparse",
      placeKey: "nebraska",
      startAge: 5,
      depth: "play-formative-years",
      givenName: "Avery",
      familyName: "Stone",
    });
    const model = projectWorld39Journal(sparse.world, sparse.playerPersonId);
    expect(model.name).toBe("Avery Stone");
    expect(journalText(model)).not.toContain("Maya");
    expect(journalText(model)).not.toMatch(DATABASE_WORDING);
  });
});
