/**
 * A press of a reply the talk has already moved past (a second press that was
 * in flight with the first; pool item words-talk-reply-not-offered-after-one-engine)
 * is answered with the talk as it stands, never an error and never a second
 * line. Pinned to Sheridan WY (5669845), seed "7": a new life, the first
 * person in the room whose talk offers a reply (skill pinned-tests).
 */
import { expect, it } from "vitest";
import { benchRequest } from "./handler";

interface Talk {
  lines: { kind: string; text: string }[];
  choices: { key: string }[];
}

const call = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: false,
  });
  const text =
    typeof reply.body === "string"
      ? reply.body
      : Buffer.from(reply.body).toString("utf8");
  expect(reply.status, `${method} ${path}: ${text.slice(0, 200)}`).toBe(200);
  return JSON.parse(text) as unknown;
};

it("answers a second press of the same reply with the talk as it stands", async () => {
  const life = (await call("POST", "/api/newlife?seed=7&placeKey=5669845")) as {
    personId: string;
  };
  const room = (await call(
    "GET",
    `/api/scene?id=${encodeURIComponent(life.personId)}`,
  )) as { people?: { personId: string }[] };
  let proved = 0;
  for (const person of room.people ?? []) {
    const opened = (await call(
      "POST",
      `/api/talk/open?otherId=${encodeURIComponent(person.personId)}`,
    )) as Talk | null;
    const first = opened?.choices[0];
    if (!first) {
      if (opened) await call("POST", "/api/talk/leave");
      continue;
    }
    const say = `/api/talk/say?key=${encodeURIComponent(first.key)}`;
    const after = (await call("POST", say)) as Talk;
    const again = (await call("POST", say)) as Talk;
    expect(again.lines.map((line) => line.text)).toEqual(
      after.lines.map((line) => line.text),
    );
    expect(again.choices.map((choice) => choice.key)).toEqual(
      after.choices.map((choice) => choice.key),
    );
    proved += 1;
    await call("POST", "/api/talk/leave");
    break;
  }
  expect(proved, "a talk with a reply in the room").toBeGreaterThan(0);
}, 180_000);
