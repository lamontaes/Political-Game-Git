import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { benchRequest, benchWorld } from "../bench/handler";
import { setBookkeeping } from "../core2/bookkeeping";
import { storyOfReadEvent } from "../core2/modules/news";
import type { PersonId } from "../core2/types";
import { wordBringItUp } from "./bring-it-up";

// News someone brings up reaches the player only when the talk says it
// (Account lead, Nov 15: bring-it-up wrote its "told" record before the talk
// chose whether to say the news, so the player was on record as told a
// change and a blame nobody said; the room's own check of who has something
// to say, made each time the player looks at home, told the player what a
// housemate had seen on television though no talk was opened).
//
// The test draws its places (drawn-place-tests). From a base seed it draws a
// world seed at a time (each opens in some place of the 56), makes a new life
// in the creator as a player does, and plays the days one at a time. Each day
// it looks at the room at home (nothing may be told by looking), then talks to
// each person the room marks as having something to say who knows a story the
// player has not heard. After that talk, told means said: the player is on
// record as told the story exactly when a line of the talk said it, so a talk
// that knew a story and went another way leaves nothing told (the red before
// the fix). A world plays on until a talk says news or 100 days pass; two worlds with a talk that knew news are needed.
// Most national stories have no headline a talk can say (`printedSubject`), so
// the witnesses so far are talks that went another way; a talk that says the
// story is checked the same way when one turns up. Days with nobody holding
// news are named in the pass line.
const BASE = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const WITNESSES = 2;
const MAX_WORLDS = 4;
const MAX_DAYS = 100;
const PLAYER = {
  givenName: "Dana",
  familyName: "Reyes",
  gender: "female",
  birthYear: 1979,
  birthMonth: 5,
  birthDay: 12,
};

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
}

interface Witness {
  where: string;
  day: string;
  looks: number;
  teller: string;
  told: string[];
  storyId: string;
  /** True when a line of the talk said the story. */
  saidIt: boolean;
  /** Talks in this world with someone who knew news. */
  knew: number;
}

const heard = (): string[] => {
  const world = benchWorld();
  return [
    ...(world.core!.knowledgeByPerson.get(world.player!.personId!)?.keys() ??
      []),
  ].filter((key) => key.startsWith("heard:") || key.startsWith("blame:"));
};

/** One drawn world: advance day by day until a talk says news to the player. */
const playWorld = async (
  seed: string,
  passed: string[],
): Promise<Witness | null> => {
  const person = encodeURIComponent(JSON.stringify(PLAYER));
  const built = await ask("POST", `/api/newlife?seed=${seed}&person=${person}`);
  expect(built.status, `seed ${seed}`).toBe(200);
  const where = `${built.json.placeName}, seed ${seed}`;
  const core = benchWorld().core!;
  const me = benchWorld().player!.personId!;
  let looks = 0;
  let quiet = 0;
  const knew: {
    day: string;
    teller: string;
    told: string[];
    storyId: string | null;
  }[] = [];
  for (let day = 0; day < MAX_DAYS; day += 1) {
    // Look at the room as a player does: nothing may be told by looking.
    const before = heard();
    const scene = await ask("GET", `/api/scene?id=${me}`);
    expect(scene.status, where).toBe(200);
    looks += 1;
    expect(heard(), `${where}, ${core.date}: told by looking`).toEqual(before);
    const talkable = (
      scene.json.people as { personId: string; talkable: boolean }[]
    ).filter((row) => row.talkable && row.personId !== me);
    for (const row of talkable) {
      // Only a person who knows a story the player has not heard can tell
      // one: the lines worded, nothing written (wordBringItUp).
      const brought = wordBringItUp(core, row.personId as PersonId, me);
      if (!brought) {
        quiet += 1;
        continue;
      }
      const storyId = storyOfReadEvent(brought.change.eventId);
      const open = new Set(heard());
      const talk = (await ask("POST", `/api/talk/open?otherId=${row.personId}`))
        .json as Talk | null;
      await ask("POST", "/api/talk/leave");
      const told = heard().filter((key) => !open.has(key));
      const said = (talk?.lines ?? []).filter(
        (line) =>
          line.speakerId === row.personId &&
          !!storyId &&
          line.sourceRecordIds.includes(storyId),
      );
      // Told means said: only stories a line said, and each story a line
      // said is on record as told.
      for (const key of told) {
        const toldStory = storyOfReadEvent(key.slice(key.indexOf(":") + 1));
        expect(
          toldStory === storyId && said.length > 0,
          `${where}, ${core.date}: ${key} told but not said in ${JSON.stringify(talk?.lines.map((l) => l.text))}`,
        ).toBe(true);
      }
      if (said.length)
        expect(
          told.some((key) => key.includes(brought.change.eventId)),
          `${where}, ${core.date}: said ${storyId} but not on record as told`,
        ).toBe(true);
      knew.push({ day: core.date, teller: row.personId, told, storyId });
      if (said.length)
        return {
          where,
          day: core.date,
          looks,
          teller: row.personId,
          told,
          storyId: storyId!,
          saidIt: true,
          knew: knew.length,
        };
    }
    let next = await ask("POST", "/api/advance?mode=day");
    for (let k = 0; k < 6 && next.json?.packet?.kind === "stop"; k += 1)
      next = await ask(
        "POST",
        `/api/resume?kind=stop&pauseId=${encodeURIComponent(next.json.packet.pauseId)}`,
      );
    expect(next.status, `${where}: ${JSON.stringify(next.json)}`).toBe(200);
  }
  passed.push(
    `${where}: ${knew.length} talks with someone who knew news, none said it (${knew.map((k) => `${k.day} ${k.teller}`).join(", ")}); ${quiet} looks found no news to bring up`,
  );
  const first = knew[0];
  return first
    ? {
        where,
        day: first.day,
        looks,
        teller: first.teller,
        told: first.told,
        storyId: first.storyId!,
        saidIt: false,
        knew: knew.length,
      }
    : null;
};

describe("news brought up at home", () => {
  let was = false;
  beforeAll(() => {
    was = setBookkeeping(false);
  });
  afterAll(() => {
    setBookkeeping(was);
  });

  it("tells the player news only when a talk says it", async () => {
    const passed: string[] = [];
    const found: Witness[] = [];
    for (
      let draw = 0;
      draw < MAX_WORLDS && found.length < WITNESSES;
      draw += 1
    ) {
      const seed = createHash("sha256")
        .update(`${BASE}:told-when-said:${draw}`)
        .digest("hex")
        .slice(0, 16);
      const witness = await playWorld(seed, passed);
      if (witness) found.push(witness);
    }
    process.stdout.write(
      `bring-it-up-told-when-said: base ${BASE}\n${found
        .map(
          (w) =>
            `  witness ${w.where}, ${w.day}, ${w.looks} looks, teller ${w.teller}, ${w.saidIt ? "said" : "went another way"}, told [${w.told.join(" | ")}], story ${w.storyId}`,
        )
        .join(
          "\n",
        )}\n  passed over:\n${passed.map((line) => `    ${line}`).join("\n")}\n`,
    );
    expect(
      found.length,
      `base ${BASE}: ${found.length} of ${WITNESSES} worlds had news a talk could tell; passed over: ${passed.join("; ")}`,
    ).toBe(WITNESSES);
  }, 1_500_000);
});
