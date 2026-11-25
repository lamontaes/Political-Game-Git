import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { benchRequest, benchWorld } from "../bench/handler";
import { setBookkeeping } from "../core2/bookkeeping";
import { sharedHistory } from "../core2/shared-history";
import type { PersonId } from "../core2/types";
import { subjectsBetween } from "./conversation";

// Asked "Remember Dortches Public Schools?", the player's answer never ends
// the talk: the asker says how long it has been, from the school record's
// year, or agrees where the player's answer already said it (the red was
// "You remember Cumming Public Schools?" "Yes, I do." and nothing after it,
// played talks, Nov 15).
//
// Through the player's own presses, as the bench plays them: a new life made
// in the creator at 45 (born May 12, 1979), so the player's school years are
// long enough ago for a schoolmate to raise them (conversation-rules.json
// sharedPast), at seed f574fd270912a678, which opens in Golden Valley, North
// Dakota. The schoolmates are the school records' (sharedHistory) who work
// at a place the player's Travel menu lists; the player goes to each place
// and talks to each schoolmate there, answering yes where a yes is offered.
// One question about the school is needed, asked by a schoolmate on record,
// and the asker's answer back after the player's reply is checked.
//
// The method changed (Account lead, Nov 15). Old: a played year of the
// director's scenes, waiting for a scene whose counterpart was a schoolmate;
// after the Train moved the draw, no school question came in the year. New:
// the player chooses whom to talk to, so nothing waits on a draw.
//
// Re-pinned once (Account lead, Nov 16). Old pin: seed 7952d3f3e3253ee4,
// Dortches, North Carolina, four questions over two days. Its premise was
// that every grown resident was born at home and schooled in the town's
// district (a stopgap #9538 removed), so a 45-year-old had many working
// schoolmates in reach. With birthplaces drawn from the survey and a birth
// outside the state counted once (#9643), about one adult in five went to
// the town's schools, and over 69 seeds drawn through these presses none
// heard more than one school question. New pin: seed f574fd270912a678,
// Golden Valley, one schoolmate in reach and one question; the test proves
// the give-back, not a count. Measured at about 30 seconds alone and 73 beside other
// tests; the limits, 150 seconds for the life and for the play, are about
// twice the slower.
const SEED = "f574fd270912a678";
const PLAYER = {
  givenName: "Dana",
  familyName: "Reyes",
  gender: "female",
  birthYear: 1979,
  birthMonth: 5,
  birthDay: 12,
};
/**
 * Two classmates still at Golden Valley's public schools together, at one
 * stage and not kin, read from the played world's school records at this
 * seed: Alex (born Aug 18, 2017) and Jeremiah (born Mar 11, 2017), both in
 * elementary school.
 */
const STILL_THERE = [
  "person_16f6cec1fba7cd69",
  "person_4ec46fcf6ffcbb31",
] as PersonId[];
/**
 * Levi (born Jul 13, 1989), in the district's elementary school from 1994 to
 * 1999 while the player was in its high school: never schoolmates.
 */
const NEVER_TOGETHER = "person_16f6ccc1fba7ca03" as PersonId;

const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  return {
    status: reply.status,
    json: reply.body ? JSON.parse(String(reply.body)) : null,
  };
};

describe("a question about a school both went to", () => {
  // Read tracing is a debug switch (AGENTS.md): play runs without it.
  let was = false;
  let built: { status: number; json: { placeName: string } };
  beforeAll(async () => {
    was = setBookkeeping(false);
    const person = encodeURIComponent(JSON.stringify(PLAYER));
    built = await ask("POST", `/api/newlife?seed=${SEED}&person=${person}`);
  }, 150_000);
  afterAll(() => {
    setBookkeeping(was);
  });

  // A check of the subject, not a played talk: two still there together have
  // no years since and no reason to raise it, so no line about the school
  // can say how long it has been.
  it("has no years for two still at school together", () => {
    expect(built.status, `seed ${SEED}`).toBe(200);
    const world = benchWorld();
    const core = world.core!;
    const where = `${built.json.placeName}, seed ${SEED}`;
    const [a, b] = STILL_THERE as [PersonId, PersonId];
    const row = sharedHistory(core, a, b).find(
      (shared) => shared.kind === "schoolmate",
    );
    expect(row, `${where}: ${a} and ${b} share a school`).toBeTruthy();
    expect(row!.ended, `${where}: both still enrolled`).toBeUndefined();
    const subject = subjectsBetween(core, a, b, world.director).find(
      (row) => row.kind === "shared-school",
    );
    expect(subject, `${where}: the shared school is a subject`).toBeTruthy();
    expect(Object.keys(subject!.facts).sort(), where).toEqual(["school"]);
  });

  // A check of the record: together means one stage of the school in the
  // same years, not the same district (Account lead, Nov 15).
  it("counts no schoolmates who were at different stages", () => {
    const world = benchWorld();
    const core = world.core!;
    const me = world.player!.personId! as PersonId;
    const where = `${built.json.placeName}, seed ${SEED}`;
    expect(
      sharedHistory(core, me, NEVER_TOGETHER).some(
        (row) => row.kind === "schoolmate",
      ),
      `${where}: Levi in elementary school, the player in high school`,
    ).toBe(false);
  });
});
