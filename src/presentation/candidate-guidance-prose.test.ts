import { describe, expect, it } from "vitest";

import {
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
  homePartyChapters,
  scheduledActivityState,
} from "../simulation";
import { attendPartyWork, requestPartyWork } from "./campaign-life-actions";
import { plainCandidateGuidance } from "./candidate-guidance-prose";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { projectWorld39Journal } from "./world39-journal";

/** An audit key or an enum left in a sentence: MINIMUM_AGE, LOWER_CHAMBER, US-WA. */
const RAW_TOKEN = /\b[A-Z]{2,}(?:_[A-Z]+)+\b|\bUS-[A-Z]{2}\b/;

/**
 * What a Seattle life's party organizer went over, exactly as the record
 * holds it in a save written before this renderer existed.
 */
const RECORDED_SEATTLE =
  "Tracy Middleton went over what is known about running for office here. House of Representatives: minimum age 21 (MINIMUM_AGE for a LOWER_CHAMBER in US-WA); residency 1 years in the state immediately preceding filing (STATE_RESIDENCE for a LOWER_CHAMBER in US-WA); term in years 2 (TERM_LENGTH for a LOWER_CHAMBER in US-WA). Senate: minimum age 30 (MINIMUM_AGE for a UPPER_CHAMBER in US-WA); residency 5 years in the state immediately preceding filing (STATE_RESIDENCE for a UPPER_CHAMBER in US-WA); term in years 4 (TERM_LENGTH for a UPPER_CHAMBER in US-WA). City of Seattle governing body: minimum age not known to this game; residency not known to this game; term in years not known to this game. Who accepts filings, the deadline, any fee and any petition requirement are not established by this game's sourced rules. The game itself will not put anyone under 21 on a ballot.";

describe("candidate guidance read back as prose", () => {
  it("reads a recorded Seattle line without audit keys or '1 years'", () => {
    const text = plainCandidateGuidance(RECORDED_SEATTLE);
    expect(text).not.toMatch(RAW_TOKEN);
    expect(text).not.toMatch(/\b1 years\b/);
    expect(text).toBe(
      "Tracy Middleton went over what is known about running for office here. To stand for the House of Representatives, you must be at least 21; you must have lived 1 year in the state immediately before filing; and a term is 2 years. To stand for the Senate, you must be at least 30; you must have lived 5 years in the state immediately before filing; and a term is 4 years. To stand for the City of Seattle governing body, the minimum age is not known to this game; the residency rule is not known to this game; and the term length is not known to this game. Who accepts filings, the deadline, any fee and any petition requirement are not established by this game's sourced rules. The game itself will not put anyone under 21 on a ballot.",
    );
  });

  it("keeps a sourced citation's own full stops from splitting the line", () => {
    const text = plainCandidateGuidance(
      "House of Representatives: minimum age 21 (Ohio Const. art. II, § 3 (as amended)); residency 1 year in the district immediately preceding filing (Ohio Const. art. II, § 3); term in years 1 (Ohio Const. art. II, § 2). Nothing else.",
    );
    expect(text).toBe(
      "To stand for the House of Representatives, you must be at least 21; you must have lived 1 year in the district immediately before filing; and a term is 1 year. Nothing else.",
    );
  });

  it("leaves a line in any other shape as it was written", () => {
    const other = "Somebody said the minimum age is 18 (they were not sure).";
    expect(plainCandidateGuidance(other)).toBe(other);
  });

  it("shows a Seattle Journal entry for the guidance evening in plain words", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "guidance-journal-seattle",
        startAge: 34,
        placeKey: "5363000",
      }),
    ).game!;
    const personId = game.playerPersonId;
    const chapter = homePartyChapters(game.world)[0]!;
    let world = requestPartyWork(
      game.world,
      personId,
      "candidate-guidance",
      chapter.organizationId,
    );
    const record = campaignLifeActivityRecords(world).at(-1)!;
    // Live up to the evening the way the day passes, then go.
    for (
      let guard = 0;
      guard < 10 &&
      scheduledActivityState(world, record.scheduledActivityId).status ===
        "scheduled";
      guard += 1
    ) {
      const before = world;
      world = passOrdinaryDays(world, 1);
      // Time stops at the evening's start: that is when to go.
      if (
        world.currentMoment.date === before.currentMoment.date &&
        world.currentMoment.minuteOfDay === before.currentMoment.minuteOfDay
      )
        world = attendPartyWork(world, personId, record.id, "condensed");
    }
    const outcome = campaignLifeOutcomeRecords(world).at(-1)!;
    expect(outcome.guidanceKnowledgeId).not.toBeNull();

    const entry = projectWorld39Journal(world, personId).entries.find((row) =>
      row.text.includes("went over what is known"),
    );
    expect(entry).toBeDefined();
    expect(entry!.text).not.toMatch(RAW_TOKEN);
    expect(entry!.text).not.toMatch(/\b1 years\b/);
    expect(entry!.text).toContain(
      "To stand for the Washington House of Representatives, you must be at least 21; you must have lived 1 year in the state immediately before filing; and a term is 2 years.",
    );
  }, 120_000);
});
