import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { benchRequest, benchWorld } from "../bench/handler";
import { setBookkeeping } from "../core2/bookkeeping";
import { storyOfReadEvent } from "../core2/modules/news";
import type { PersonId } from "../core2/types";

// News a housemate brings up reaches the player only when the talk says it
// (Account lead, Nov 15: bring-it-up wrote its "told" record before the talk
// chose whether to say the news, so the player was on record as told a
// change and a blame nobody said). The red: the room's own check of who has
// something to say, made each time the player looks at home, told the player
// what John had seen on television though no talk was opened.
//
// Played through the bench as a player plays it: a new life made in the
// creator (born May 12, 1979) at seed t1, which opens in Harper, Texas. The
// day's packet is advanced to January 28, 2025, when John (the housemate
// below) knows a story the player has not heard; the player looks at the
// room, then talks to him. Measured at about 39 seconds (16 of loading, 22 to
// play the days); the limit for the days is 120 seconds.
const SEED = "t1";
const PLAYER = {
  givenName: "Dana",
  familyName: "Reyes",
  gender: "female",
  birthYear: 1979,
  birthMonth: 5,
  birthDay: 12,
};
const DAY = "2025-01-28";
const TELLER = "person_44e6d302a374a0df" as PersonId;

const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  return {
    status: reply.status,
    json: reply.body ? JSON.parse(String(reply.body)) : null,
  };
};

interface Talk {
  lines: { speakerId: string; text: string; sourceRecordIds: string[] }[];
  choices: { key: string; text: string }[];
}

describe("news brought up at home", () => {
  let was = false;
  let where = "";
  beforeAll(async () => {
    was = setBookkeeping(false);
    const person = encodeURIComponent(JSON.stringify(PLAYER));
    const built = await ask(
      "POST",
      `/api/newlife?seed=${SEED}&person=${person}`,
    );
    expect(built.status, `seed ${SEED}`).toBe(200);
    where = `${built.json.placeName}, seed ${SEED}`;
    const core = benchWorld().core!;
    for (let day = 0; day < 60 && core.date < DAY; day += 1) {
      let next = await ask("POST", "/api/advance?mode=day");
      for (let k = 0; k < 6 && next.json?.packet?.kind === "stop"; k += 1)
        next = await ask(
          "POST",
          `/api/resume?kind=stop&pauseId=${encodeURIComponent(next.json.packet.pauseId)}`,
        );
      expect(next.status, `${where}: ${JSON.stringify(next.json)}`).toBe(200);
    }
    expect(core.date, where).toBe(DAY);
  }, 120_000);
  afterAll(() => {
    setBookkeeping(was);
  });

  const heard = (): string[] => {
    const world = benchWorld();
    return [
      ...(world.core!.knowledgeByPerson.get(world.player!.personId!)?.keys() ??
        []),
    ].filter((key) => key.startsWith("heard:") || key.startsWith("blame:"));
  };

  it("tells the player nothing when the room is only looked at", async () => {
    const me = benchWorld().player!.personId!;
    const before = heard();
    const scene = await ask("GET", `/api/scene?id=${me}`);
    expect(scene.status, where).toBe(200);
    expect(
      scene.json.people.some(
        (row: { personId: string; talkable: boolean }) =>
          row.personId === TELLER && row.talkable,
      ),
      `${where}: John has something to say`,
    ).toBe(true);
    expect(heard(), `${where}: told by looking`).toEqual(before);
  });

  it("tells the player the news the talk says, and only that", async () => {
    const before = new Set(heard());
    const talk = (await ask("POST", `/api/talk/open?otherId=${TELLER}`))
      .json as Talk;
    await ask("POST", "/api/talk/leave");
    const said = talk.lines.filter((line) => line.speakerId === TELLER);
    const told = heard().filter((key) => !before.has(key));
    console.log(
      `bring-it-up-told-when-said: ${where}\n${said.map((line) => line.text).join(" / ")}\n${told.join("\n")}`,
    );
    expect(told.length, `${where}: told something`).toBeGreaterThan(0);
    // Each news the player is now on record as told is one a line said, by
    // the story's record.
    for (const key of told) {
      const storyId = storyOfReadEvent(key.slice(key.indexOf(":") + 1));
      expect(
        said.some((line) => line.sourceRecordIds.includes(storyId!)),
        `${where}: ${key} said in ${JSON.stringify(said)}`,
      ).toBe(true);
    }
  });
});
