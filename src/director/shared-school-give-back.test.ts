import { describe, expect, it } from "vitest";
import { benchRequest, benchWorld } from "../bench/handler";
import { staffOf } from "../bench/scene";
import { setBookkeeping } from "../core2/bookkeeping";
import { sharedHistory } from "../core2/shared-history";
import type { PersonId } from "../core2/types";

// Asked "Remember Dortches Public Schools?", the player's answer never ends
// the talk: the asker says how long it has been, from the school record's
// year, or agrees where the player's answer already said it (the red was
// "You remember Cumming Public Schools?" "Yes, I do." and nothing after it,
// played talks, Nov 15).
//
// Through the player's own presses, as the bench plays them: a new life made
// in the creator at 45 (born May 12, 1979), so the player's school years are
// long enough ago for a schoolmate to raise them (conversation-rules.json
// sharedPast), at seed 7952d3f3e3253ee4, which opens in Dortches, North
// Carolina. The schoolmates are the school records' (sharedHistory) who work
// at a place the player's Travel menu lists; the player goes to each place
// and talks to each schoolmate there, answering yes where a yes is offered.
// Four questions about the school are needed: three come on the first day
// and the rest on the second.
//
// The method changed (Account lead, Nov 15). Old: a played year of the
// director's scenes, waiting for a scene whose counterpart was a schoolmate;
// after the Train moved the draw, no school question came in the year. New:
// the player chooses whom to talk to, so nothing waits on a draw. Measured at
// about 32 seconds of play (50 with loading); the limit, 65 seconds, is about
// twice the play.
const SEED = "7952d3f3e3253ee4";
const PLAYER = {
  givenName: "Dana",
  familyName: "Reyes",
  gender: "female",
  birthYear: 1979,
  birthMonth: 5,
  birthDay: 12,
};
/** Questions about the school the test needs heard. */
const NEEDED = 4;
/** Played days the player goes around town on. */
const DAYS = 2;
const YES = /^(yes|yeah)\b/i;

interface Line {
  speakerId: string;
  kind: string;
  text: string;
  sourceRecordIds: string[];
}
interface Talk {
  lines: Line[];
  choices: { key: string; text: string }[];
}

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
  it("is answered back by the asker after the player's answer", async () => {
    // Read tracing is a debug switch (AGENTS.md): play runs without it.
    const was = setBookkeeping(false);
    try {
      const person = encodeURIComponent(JSON.stringify(PLAYER));
      const built = await ask(
        "POST",
        `/api/newlife?seed=${SEED}&person=${person}`,
      );
      expect(built.status, `seed ${SEED}`).toBe(200);
      const world = benchWorld();
      const core = world.core!;
      const me = world.player!.personId! as PersonId;
      const where = `${built.json.placeName}, seed ${SEED}`;

      // Where each schoolmate works, among the places the player can go.
      const places = (await ask("GET", `/api/goto?id=${me}`)).json as {
        organizationId: string;
      }[];
      const atWork = new Map<string, string[]>();
      for (const { organizationId } of places)
        for (const id of staffOf(core, organizationId).full)
          if (
            sharedHistory(core, me, id as PersonId).some(
              (row) => row.kind === "schoolmate",
            )
          )
            atWork.set(organizationId, [
              ...(atWork.get(organizationId) ?? []),
              id,
            ]);
      expect(atWork.size, `${where}: schoolmates at work`).toBeGreaterThan(0);

      const heard: string[] = [];
      const talked = new Set<string>();
      for (let day = 0; day < DAYS && heard.length < NEEDED; day += 1) {
        for (const [org, ids] of atWork) {
          const visit = await ask(
            "POST",
            `/api/goto/visit?org=${encodeURIComponent(org)}`,
          );
          expect(visit.status, `${where}: ${JSON.stringify(visit.json)}`).toBe(
            200,
          );
          const here = new Set(
            (visit.json.people as { personId: string }[]).map(
              (row) => row.personId,
            ),
          );
          for (const otherId of ids) {
            if (!here.has(otherId) || talked.has(otherId)) continue;
            let talk = (await ask("POST", `/api/talk/open?otherId=${otherId}`))
              .json as Talk | null;
            for (let turn = 0; turn < 12 && talk?.choices.length; turn += 1) {
              const asked = talk.lines.at(-1)?.kind === "shared-school";
              const choice =
                talk.choices.find((row) => YES.test(row.text)) ??
                talk.choices[0]!;
              const before = talk.lines.length;
              talk = (
                await ask(
                  "POST",
                  `/api/talk/say?key=${encodeURIComponent(choice.key)}`,
                )
              ).json as Talk;
              if (!asked) continue;
              talked.add(otherId);
              const back = talk.lines
                .slice(before)
                .find((line) => line.speakerId === otherId);
              heard.push(
                `${core.date} ${otherId}: ${talk.lines.map((line) => line.text).join(" / ")}`,
              );
              expect(back?.kind, `${where}: ${heard.at(-1)}`).toBe(
                "shared-school-give",
              );
              expect(
                back?.sourceRecordIds.length,
                `${where}: ${heard.at(-1)}`,
              ).toBeGreaterThan(0);
            }
            if (talk) await ask("POST", "/api/talk/leave");
          }
          await ask("POST", "/api/goto/home");
        }
        // The next morning; a stop the day holds is passed over.
        let next = await ask("POST", "/api/advance?mode=day");
        for (let k = 0; k < 5 && next.json?.packet?.kind === "stop"; k += 1)
          next = await ask(
            "POST",
            `/api/resume?pauseId=${encodeURIComponent(next.json.packet.pauseId)}`,
          );
        expect(next.status, `${where}: ${JSON.stringify(next.json)}`).toBe(200);
      }
      console.log(`shared-school-give-back: ${where}\n${heard.join("\n")}`);
      expect(
        heard.length,
        `${where}: questions about a school both went to`,
      ).toBeGreaterThanOrEqual(NEEDED);
    } finally {
      setBookkeeping(was);
    }
  }, 65_000);
});
