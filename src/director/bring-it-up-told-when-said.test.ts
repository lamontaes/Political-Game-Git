import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { benchRequest, benchWorld } from "../bench/handler";
import { setBookkeeping } from "../core2/bookkeeping";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { storiesHeard, storyOfReadEvent } from "../core2/modules/news";
import { deskContext, outletsHere } from "../core2/modules/press";
import { printItem } from "../core2/press-desk";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { BRING_IT_UP_ROWS, wordBringItUp } from "./bring-it-up";
import { openConversation } from "./conversation";
import { strongestQuestion } from "./view-learned";

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
const MAX_WORLDS = 6;
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

  // The said half. No drawn world has yet had a talk that says news, so the
  // story is staged through the engine's own writer (printStory, as
  // outlet-ask-talk.test.ts does): a local outlet prints a story on a
  // housemate's own question, the housemate hears it and the player does not,
  // and the player talks to them. The player is on record as told the story
  // exactly when the news line is said: absent before the talk, present and
  // naming the story's id after. Drawn places, no pin; a drawn place with no
  // housemate holding a stand or no local outlet is named and passed over.
  it("tells the player the story when the talk says it", () => {
    const passed: string[] = [];
    const toldKeys = (
      core: ReturnType<typeof benchWorld>["core"],
      me: string,
    ) =>
      [...(core!.knowledgeByPerson.get(me as PersonId)?.keys() ?? [])].filter(
        (key) => key.startsWith(`${BRING_IT_UP_ROWS.heardKey}:`),
      );
    for (let draw = 0; draw < 12; draw += 1) {
      const place = drawPlace(`${BASE}:said:${draw}`, "told-when-said-staged");
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const me = playerId as PersonId;
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      // A housemate (someone the player knows) who follows a local outlet and
      // holds a stand on a question: who reads what an outlet prints is the
      // press's own follower list.
      const mates = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            p.id !== me &&
            p.householdId === core.people.get(me)!.householdId,
        )
        .sort((a, b) => a.id.localeCompare(b.id));
      let outlet: ReturnType<typeof outletsHere>[number] | undefined;
      let housemate: (typeof mates)[number] | undefined;
      for (const o of outletsHere(api).filter((o) => o.tier !== "national")) {
        const followers = deskContext(api).followers(o.id);
        const found = mates.find(
          (p) =>
            followers.includes(p.id) &&
            strongestQuestion(api, p.id as PersonId),
        );
        if (found) {
          outlet = o;
          housemate = found;
          break;
        }
      }
      if (!outlet || !housemate) {
        passed.push(
          `${where}: no housemate with a stand follows a local outlet`,
        );
        continue;
      }
      const id = housemate.id as PersonId;
      const reporterId = (outlet.reporterIds ?? []).find(
        (r) => core.people.get(r as PersonId)?.alive,
      );
      if (!reporterId) {
        passed.push(`${where}: the outlet has no reporter living`);
        continue;
      }
      // The press's own writer (printItem): the printed row the bring-it-up
      // reads and the news engine's delivery, the housemate the story's one
      // named subject (who hears it the day it runs).
      const printed = printItem(
        api,
        deskContext(api),
        outlet,
        reporterId,
        {
          id: `fixture:told-when-said:${draw}`,
          kind: "interview",
          date: makeIsoDate(core.date),
          level: "town",
          topic: strongestQuestion(api, id)!.question,
          desiredChange: "enact",
          ending: false,
          subjectIds: [id, me],
        } as never,
        null,
        // The story names the player (a person of the story's record), the
        // tie a story needs to be raised with them (subject-tie.ts).
        { facts: { personId: me } },
      );
      const storyId = printed.id;
      for (
        let day = 0;
        day < 7 && !storiesHeard(api, id).some((r) => r.id === storyId);
        day += 1
      )
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      if (!storiesHeard(api, id).some((r) => r.id === storyId)) {
        passed.push(`${where}: housemate never heard the staged story`);
        continue;
      }
      const before = toldKeys(core, me);
      expect(
        before.some(
          (key) =>
            storyOfReadEvent(key.slice(key.indexOf(":") + 1)) === storyId,
        ),
        `${where}: told before any talk`,
      ).toBe(false);
      const talk = openConversation(core, me, id, { director });
      const line = talk.lines.find(
        (l) => l.kind === "news" && l.speakerId === id,
      );
      if (!line) {
        passed.push(
          `${where}: the talk did not raise the story: ${talk.lines.map((l) => `${l.kind}: ${l.text}`).join(" | ")}`,
        );
        continue;
      }
      const toldNow = toldKeys(core, me).filter((key) => !before.includes(key));
      const toldFor = toldNow.filter(
        (key) => storyOfReadEvent(key.slice(key.indexOf(":") + 1)) === storyId,
      );
      expect(
        toldFor.length,
        `${where}: the line said ${JSON.stringify(line.text)} but no told record names ${storyId}; told ${JSON.stringify(toldNow)}`,
      ).toBe(1);
      const toldRecord = talk.recorded.find((rec) =>
        rec.startsWith(`${BRING_IT_UP_ROWS.toldEvent}:`),
      );
      expect(toldRecord, `${where}: talk recorded no told event`).toBeTruthy();
      process.stdout.write(
        `bring-it-up-told-when-said (said): base ${BASE}, ${where}, draw ${draw}\n  story ${storyId}\n  said: ${talk.lines.map((l) => `${l.kind}/${l.speakerId === id ? "they" : "you"}: ${l.text}`).join(" | ")}\n  told record ${toldRecord}; told key ${toldFor[0]}\n  passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `base ${BASE}: no drawn place staged a said story; passed over: ${passed.join("; ")}`,
    );
  }, 600_000);
});
