import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { benchRequest, benchWorld } from "../bench/handler";
import { setBookkeeping } from "../core2/bookkeeping";

// A scene that says someone has news must say the news (scene standard: a
// scene exists only if it writes something back;
// director-street-news-scene-ends-after-its-opener). At Sheridan, Wyoming,
// on April 26, 2025, a housemate "has news" about the death of a constituent
// the player met on the street, says "I need to talk to you about
// something." and nothing more: the death-news subject is a relative's, and
// she was nobody's relative in the house.
//
// Played through the bench as a player plays it: an Advanced start at
// Sheridan, Wyoming (5669845), world seed 7, as the selectboard member
// (person_0f713cf2e3e20027), then Day presses to April 26, each stop
// resumed and each meeting the member sits in voted by their own judgment
// and adjourned. Every scene that stops the day is shown as the story screen
// shows it, and a scene with someone to talk to opens that talk with the
// moment as its occasion.
const SEED = "7";
const PLACE = "5669845";
const MEMBER = "person_0f713cf2e3e20027";
const UNTIL = "2025-04-26";
const DEATH = `${MEMBER}:2025-04-25:life.death:person_04c8672722482399:2025-04-25`;

const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  return {
    status: reply.status,
    json: reply.body ? JSON.parse(String(reply.body)) : null,
  };
};

interface Shown {
  momentId: string;
  narration: string;
  talk: string[];
  choices: number;
}

describe("a scene with someone to talk to", () => {
  let was = false;
  let where = "";
  const shown: Shown[] = [];
  let built = 0;
  let played = 0;

  const show = async (momentId: string) => {
    const story = (
      await ask("GET", `/api/story?momentId=${encodeURIComponent(momentId)}`)
    ).json;
    const withId = story?.talk?.askerId ?? story?.talkToId;
    // A speech plays its parts, and a purpose scene its own exchange.
    if (!withId || story.speech || story.talk) return;
    const opened = await ask(
      "POST",
      `/api/talk/open?otherId=${encodeURIComponent(withId)}&momentId=${encodeURIComponent(momentId)}`,
    );
    expect(opened.status, `${where}: ${momentId}`).toBe(200);
    shown.push({
      momentId,
      narration: story.narration
        .map((line: { text: string }) => line.text)
        .join(" "),
      talk: (opened.json.lines ?? []).map(
        (line: { kind: string; text: string }) => `${line.kind}: ${line.text}`,
      ),
      choices: (opened.json.choices ?? []).length,
    });
    await ask("POST", "/api/talk/leave");
  };

  beforeAll(async () => {
    was = setBookkeeping(false);
    const t0 = Date.now();
    const life = await ask(
      "POST",
      `/api/newlife?seed=${SEED}&placeKey=${PLACE}`,
    );
    expect(life.status, `seed ${SEED}`).toBe(200);
    where = `${life.json.placeName} (${PLACE}), seed ${SEED}`;
    expect((await ask("POST", `/api/play?id=${MEMBER}`)).status).toBe(200);
    built = (Date.now() - t0) / 1000;
    const t1 = Date.now();
    const core = benchWorld().core!;
    while (core.date < UNTIL) {
      let next = await ask("POST", "/api/advance?mode=day");
      for (let stops = 0; next.json?.packet?.kind === "stop"; stops += 1) {
        expect(stops, `${where}: ${core.date} does not resume`).toBeLessThan(
          12,
        );
        const modules = next.json.packet.stop?.modules ?? [];
        for (const row of modules)
          if (row.moduleId === "p13-story-director" && row.kind === "interrupt")
            await show(row.recordId);
        if (
          modules.some(
            (row: { reasonKey?: string }) =>
              row.reasonKey === "office-day.meeting",
          )
        ) {
          const meeting = (await ask("GET", "/api/meeting")).json;
          for (const item of meeting?.items ?? [])
            if (!item.takenUp && item.status === "drafted" && meeting.seated)
              await ask(
                "POST",
                `/api/meeting/item?${new URLSearchParams({ meetingId: meeting.id, billId: item.billId, vote: "own" })}`,
              );
          if (meeting?.id)
            await ask(
              "POST",
              `/api/meeting/adjourn?${new URLSearchParams({ meetingId: meeting.id })}`,
            );
        }
        next = await ask(
          "POST",
          `/api/resume?kind=stop&pauseId=${encodeURIComponent(next.json.packet.pauseId)}`,
        );
      }
      expect(next.status, `${where}: ${core.date}`).toBe(200);
    }
    played = (Date.now() - t1) / 1000;
  }, 360_000);
  afterAll(() => {
    setBookkeeping(was);
  });

  it("says something past its opener, or is not staged", () => {
    console.log(
      `scene-says-past-its-opener: ${where}; world ${built} s, played ${played} s\n${shown
        .map(
          (row) =>
            `${row.momentId}\n  ${row.narration}\n  ${row.talk.join(" / ")} (${row.choices} replies)`,
        )
        .join("\n")}`,
    );
    for (const row of shown)
      expect(
        row.talk.some(
          (line) =>
            !line.startsWith("greet: ") && !line.startsWith("family-open: "),
        ) || row.choices > 0,
        `${where}: ${row.momentId} ends after its opener: ${row.narration} / ${row.talk.join(" / ")}`,
      ).toBe(true);
    // The death no one in the house can tell is the Journal's line, with why.
    const book = benchWorld().director!.ledger.people.get(MEMBER as never)!;
    const entry = book.schedule.find((row) => row.momentId === DEATH);
    expect(entry, `${where}: ${DEATH} has no schedule entry`).toBeTruthy();
    expect(entry!.outcome).toBe("journal-line");
    expect(entry!.closed).toBe("nothing to say past its opener");
  });
});
