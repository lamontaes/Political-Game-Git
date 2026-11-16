import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sceneWords from "../../data/english/parts/scene-words.json" with { type: "json" };
import { benchRequest, benchWorld } from "../bench/handler";
import { setBookkeeping } from "../core2/bookkeeping";
import { causeRecordFacts } from "./cause-facts";

// A scene's first line never says it is about something that happened
// without saying what (owner, Nov 15: story points come with context; the
// second reader at Sheridan, Wyoming: "You stay in, thinking about what
// happened on January 1st."). The first line names what happened from the
// cause record (a law, a bill, the law on a topic, a charge), and a cause
// that names no happening (a speech heard, a story read) opens on the plain
// first line (director-street-news-scene-ends-after-its-opener).
//
// Played through the bench as a player plays it: an Advanced start at
// Sheridan, Wyoming (5669845), world seed 7, stepping in as a county board
// member (person_0f713cf2e3e20027), then fifteen days played to February 4,
// 2025; each scene of the player's is then shown as the story screen shows
// it. On the Train before the change, 21 of them opened "...thinking about
// what happened on January 21st." or "...to talk over what happened
// yesterday." Measured at about 27 seconds (16 to make the world, 5 to play,
// 6 to show the scenes); the limits are 60 seconds for the world and 60 for
// the rest.
const SEED = "7";
const PLACE = "5669845";
const MEMBER = "person_0f713cf2e3e20027";
const DAYS = 15;

const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  return {
    status: reply.status,
    json: reply.body ? JSON.parse(String(reply.body)) : null,
  };
};

describe("a scene's first line", () => {
  // No piece of the bank can say that something happened without its slot.
  it("has no piece that says what happened without saying what", () => {
    const parts = (sceneWords as { parts: { key: string; text: string }[] })
      .parts;
    const vague = parts.filter((part) =>
      /\{since\}|what happened|the news\b/.test(part.text),
    );
    expect(vague.map((part) => `${part.key}: ${part.text}`)).toEqual([]);
  });

  let was = false;
  let where = "";
  beforeAll(async () => {
    was = setBookkeeping(false);
    const t0 = Date.now();
    const built = await ask(
      "POST",
      `/api/newlife?seed=${SEED}&placeKey=${PLACE}`,
    );
    expect(built.status, `seed ${SEED}`).toBe(200);
    where = `${built.json.placeName} (${PLACE}), seed ${SEED}`;
    console.log(
      `arrival-says-what-happened: world ${(Date.now() - t0) / 1000} s`,
    );
  }, 180_000);
  afterAll(() => {
    setBookkeeping(was);
  });

  it("names what happened from the cause record, or opens plainly", async () => {
    const t0 = Date.now();
    expect((await ask("POST", `/api/play?id=${MEMBER}`)).status, where).toBe(
      200,
    );
    for (let day = 0; day < DAYS; day += 1) {
      let next = await ask("POST", "/api/advance?mode=day");
      for (let k = 0; k < 10 && next.json?.packet?.kind === "stop"; k += 1)
        next = await ask(
          "POST",
          `/api/resume?kind=stop&pauseId=${encodeURIComponent(next.json.packet.pauseId)}`,
        );
      expect(next.status, `${where}: ${JSON.stringify(next.json)}`).toBe(200);
    }
    const played = (Date.now() - t0) / 1000;
    const world = benchWorld();
    const core = world.core!;
    const moments = world.director!.ledger.people.get(MEMBER as never)!.moments;
    const seen: string[] = [];
    let named = 0;
    for (const moment of moments) {
      const story = (
        await ask("GET", `/api/story?momentId=${encodeURIComponent(moment.id)}`)
      ).json as { narration?: { text: string }[] } | null;
      const first = story?.narration?.[0]?.text;
      if (!first) continue;
      seen.push(`${moment.date} ${moment.causeKind}: ${first}`);
      expect(first, `${where}: ${moment.causeId}`).not.toMatch(
        /what happened|the news\b/,
      );
      // A bill the cause record names is said in the first line that is
      // about it.
      const bill = causeRecordFacts(core, moment.causeId).bill?.text;
      if (bill && first.includes(` ${bill}`)) named += 1;
    }
    console.log(
      `arrival-says-what-happened: ${where}, ${core.date}; played ${played} s, shown ${(Date.now() - t0) / 1000 - played} s\n${seen.join("\n")}`,
    );
    expect(seen.length, `${where}: scenes shown`).toBeGreaterThan(0);
    expect(named, `${where}: a first line names its bill`).toBeGreaterThan(0);
  }, 180_000);
});
