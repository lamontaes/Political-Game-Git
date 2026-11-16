import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { benchRequest, benchWorld } from "../bench/handler";
import { setBookkeeping } from "../core2/bookkeeping";
import type { PersonId } from "../core2/types";
import {
  CONVERSATION_DATA,
  openConversation,
  type ConversationData,
} from "./conversation";

// The replies to the player's own news are read at that news's stage (a job
// left, a race lost), not at the stage of the line that raised it, which is
// the same for every piece of the player's news. The red: with the replies
// staged by what the news was, a housemate who raised the player's leaving
// their job had nothing offered back, and the talk opened empty (election
// results thread, Nov 15).
//
// The bank's player-news replies carry no stages yet; the words pull request
// for the replies (words-player-news-replies-ignore-the-race-result) adds
// them. So this test carries that row: the shipped data with every
// player-news reply staged "job-left", passed to the game's own talk call.
//
// Played through the bench as a player plays it: a new life made in the
// creator (Quinn Hale, born March 9, 1981) at South Vienna, Ohio (3973796),
// world seed c1, opening January 20, 2025. The player leaves their job that
// day (the Work menu's leave); the next day Melanie, their daughter, raises
// it at home. Measured at about 18 seconds (17 to make the life, under 1 to
// play); the limits are 60 seconds for the life and 30 for the play.
const PLACE = "3973796";
const SEED = "c1";
const PLAYER = {
  givenName: "Quinn",
  familyName: "Hale",
  gender: "female",
  birthYear: 1981,
  birthMonth: 3,
  birthDay: 9,
};
const MELANIE = "person_963e0c3c92a2f494" as PersonId;

const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  return {
    status: reply.status,
    json: reply.body ? JSON.parse(String(reply.body)) : null,
  };
};

/** The shipped data with the player's news answered only when it was a job left. */
function stagedData(): ConversationData {
  const data = structuredClone(CONVERSATION_DATA) as ConversationData & {
    subjects: Record<string, { answers?: { stages?: string[] }[] }>;
  };
  const answers = data.subjects["player-news"]?.answers ?? [];
  for (const answer of answers) answer.stages = ["job-left"];
  expect(answers.length, "player-news replies").toBeGreaterThan(0);
  return data;
}

describe("the player's own news answered at home", () => {
  let was = false;
  let where = "";
  beforeAll(async () => {
    was = setBookkeeping(false);
    const person = encodeURIComponent(JSON.stringify(PLAYER));
    const built = await ask(
      "POST",
      `/api/newlife?seed=${SEED}&placeKey=${PLACE}&person=${person}`,
    );
    expect(built.status, `seed ${SEED}`).toBe(200);
    where = `${built.json.placeName} (${PLACE}), seed ${SEED}`;
  }, 60_000);
  afterAll(() => {
    setBookkeeping(was);
  });

  it("offers the replies that fit what the news was", async () => {
    const left = await ask("POST", "/api/job/leave");
    expect(left.json?.left, `${where}: ${JSON.stringify(left.json)}`).toBe(
      true,
    );
    let next = await ask("POST", "/api/advance?mode=day");
    for (let k = 0; k < 6 && next.json?.packet?.kind === "stop"; k += 1)
      next = await ask(
        "POST",
        `/api/resume?kind=stop&pauseId=${encodeURIComponent(next.json.packet.pauseId)}`,
      );
    expect(next.status, `${where}: ${JSON.stringify(next.json)}`).toBe(200);
    const world = benchWorld();
    const talk = openConversation(
      world.core!,
      world.player!.personId!,
      MELANIE,
      {
        director: world.director,
        data: stagedData(),
      },
    );
    const said = talk.lines.map((line) => `${line.kind}: ${line.text}`);
    console.log(
      `player-news-reply-stage: ${where}, ${world.core!.date}\n${said.join("\n")}\n  ${talk.choices.map((row) => row.text).join(" | ")}`,
    );
    expect(talk.lines.at(-1)?.kind, `${where}: ${said.join(" / ")}`).toBe(
      "player-news",
    );
    expect(
      talk.choices.length,
      `${where}: ${said.join(" / ")}`,
    ).toBeGreaterThan(0);
  }, 30_000);
});
