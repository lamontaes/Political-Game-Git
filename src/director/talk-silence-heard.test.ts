/**
 * What the player hears after staying silent is kept as heard today, like what
 * follows a spoken line (`say`), and is picked with what was already heard
 * today held back. `sayNothing` skipped both (the acting CTO's read of the
 * frozen Train 892427ec, fault 4), so a later talk the same day could say it
 * again. Played through the bench's own routes, as the screen presses them: a
 * new life at Sheridan WY (5669845), seed "7"; the player opens a talk with
 * someone in the room (/api/talk/open), presses Say nothing
 * (/api/talk/silent), and what the other person said after that is read from
 * what the player has heard today (skill pinned-tests).
 */
import { expect, it } from "vitest";
import { benchRequest, benchWorld } from "../bench/handler";

interface Talk {
  lines: { speakerId: string; text: string; wording?: { parts: string[] } }[];
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

it("keeps what the other person says after the player's silence as heard today", async () => {
  const life = (await call("POST", "/api/newlife?seed=7&placeKey=5669845")) as {
    personId: string;
  };
  const room = (await call(
    "GET",
    `/api/scene?id=${encodeURIComponent(life.personId)}`,
  )) as { people?: { personId: string }[] };
  const heard = () =>
    new Set(
      [
        ...(benchWorld().core!.knowledgeByPerson.get(life.personId as never) ??
          []),
      ]
        .filter(([key]) => key.startsWith("talk:heard:"))
        .map(([key]) => key.slice("talk:heard:".length)),
    );
  let proved = 0;
  const missing: string[] = [];
  // The room first, then the people the player knows of: at home most
  // talks end at silence with nothing said after it.
  const everyone = [
    ...(room.people ?? []).map((person) => person.personId),
    ...[...benchWorld().core!.people.keys()].filter(
      (id) => id !== life.personId,
    ),
  ];
  for (const personId of everyone) {
    if (proved >= 6) break;
    const opened = (await call(
      "POST",
      `/api/talk/open?otherId=${encodeURIComponent(personId)}`,
    )) as Talk | null;
    if (!opened) continue;
    const said = opened.lines.length;
    const after = (await call("POST", "/api/talk/silent")) as Talk;
    const parts = after.lines
      .slice(said)
      .flatMap((line) => line.wording?.parts ?? []);
    if (parts.length) {
      proved += 1;
      const kept = heard();
      for (const part of parts)
        if (!kept.has(part)) missing.push(`${personId}: ${part}`);
    }
    await call("POST", "/api/talk/leave");
  }
  expect(
    proved,
    "a talk with a line after silence in the room",
  ).toBeGreaterThan(0);
  expect(missing, "lines said after silence but not kept as heard").toEqual([]);
}, 180_000);
