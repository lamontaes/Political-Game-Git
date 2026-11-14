/**
 * Visit and Call on a person's card (owner, Nov 14: a promise made in a talk,
 * "I'll come by" or "I'll call", needs acts that keep it). Through the bench's
 * own routes at named places and fixed seeds: the card lists both acts with
 * a closed reason where one cannot be done; Visit spends the trip and the
 * visit's hours, puts the player in the room the person is in and writes a
 * `contact.visit` record with the time together on the tie; Call spends no
 * trip, opens the talk and writes a `contact.call` record.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { closenessBetween } from "../core2/closeness";
import { parameter } from "../core2/parameters";
import { benchRequest, benchWorld } from "./handler";
import { CONTACT_CALL, CONTACT_VISIT } from "./person-acts";

/** Named worlds: the seed names the place (drawPlace over all 56), fixed in the file. */
const WORLDS = ["person-acts-1", "person-acts-2"] as const;

const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  return { status: reply.status, json: JSON.parse(String(reply.body)) };
};

interface Act {
  kind: string;
  open: boolean;
  reason?: string;
}

for (const seed of WORLDS) {
  it(`the card offers Visit and Call, and doing them spends time and writes the record (${seed})`, async () => {
    const place = drawPlace(seed, "person-acts");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    expect(
      (await ask("POST", `/api/build?seed=${encodeURIComponent(place.seed)}`))
        .status,
      where,
    ).toBe(200);
    const world = benchWorld();
    const core = world.core!;
    const me = [...core.people.values()]
      .filter((p) => p.alive)
      .sort((a, b) => a.id.localeCompare(b.id))[0]!.id;
    world.player!.select(me);
    expect((await ask("POST", "/api/advance?mode=day")).status, where).toBe(
      200,
    );
    const parameters = core.data.parameters;
    const acts = async (other: string) =>
      (await ask("GET", `/api/known?id=${me}&other=${other}`)).json
        .acts as Act[];
    const hereIds = async () =>
      (
        (await ask("GET", `/api/scene?id=${me}`)).json as {
          people: { personId: string }[];
        }
      ).people.map((p) => p.personId);

    // Your own card offers nothing; someone in the room cannot be visited
    // (talk to them) but can be called if they have something to say.
    expect(await acts(me), `${where}: own card`).toEqual([]);
    const room = await hereIds();
    for (const id of room.slice(0, 1)) {
      const row = (await acts(id)).find((a) => a.kind === "visit")!;
      expect(row, `${where}: someone in the room`).toMatchObject({
        open: false,
        reason: "here",
      });
    }

    // Someone in town not in the room: Visit is open (or closed with a
    // reason the card words), and a closed act always carries its reason.
    const town = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== me &&
          p.placeId === core.people.get(me)!.placeId &&
          !room.includes(p.id),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    let other: string | undefined;
    for (const candidate of town.slice(0, 60)) {
      const rows = await acts(candidate.id);
      expect(
        rows.map((r) => r.kind),
        `${where}: both acts listed`,
      ).toEqual(["visit", "call"]);
      for (const row of rows)
        expect(row.open || !!row.reason, `${where}: reason`).toBe(true);
      if (rows.every((r) => r.open)) {
        other = candidate.id;
        break;
      }
    }
    expect(other, `${where}: someone to visit and call`).toBeDefined();

    // A call: no trip, a talk opens, the record is written.
    const beforeCall = world.player!.packet?.at.minuteOfDay;
    const called = await ask("POST", `/api/act?kind=call&other=${other}`);
    expect(called.status, where).toBe(200);
    expect(
      called.json.talk.lines.length,
      `${where}: they pick up`,
    ).toBeGreaterThan(0);
    expect(
      world.player!.packet?.at.minuteOfDay,
      `${where}: no trip, no hours until the talk ends`,
    ).toBe(beforeCall);
    const callEvents = [...(core.logByKind.get(CONTACT_CALL) ?? [])].filter(
      (id) => id.includes(`:${me}:${other}:`),
    );
    expect(callEvents.length, `${where}: contact.call written`).toBe(1);
    expect(core.people.get(other!)!.lastContactDate, where).toBe(core.date);
    expect((await ask("POST", "/api/talk/leave")).status, where).toBe(200);
    expect(
      world.player!.packet!.at.minuteOfDay,
      `${where}: the talk's lines spent time`,
    ).toBeGreaterThan(beforeCall ?? 0);

    // A visit: the trip and the visit's hours, the person in the room.
    const clock = () => {
      const at = world.player!.packet!.at;
      return Date.parse(at.date) / 60_000 + at.minuteOfDay;
    };
    const clockBefore = clock();
    const closenessBefore = closenessBetween(core, me, other!);
    const visit = await ask("POST", `/api/act?kind=visit&other=${other}`);
    expect(visit.status, where).toBe(200);
    const spent =
      parameter("tripMinutes", parameters) +
      parameter("socialHours", parameters) *
        parameter("minutesPerHour", parameters);
    expect(
      clock() - clockBefore,
      `${where}: a trip and the visit's hours`,
    ).toBe(Math.round(spent));
    const inRoom = (visit.json.people as { personId: string }[]).map(
      (p) => p.personId,
    );
    expect(inRoom, `${where}: the person is in the room`).toContain(other);
    expect(
      [...(core.logByKind.get(CONTACT_VISIT) ?? [])].filter((id) =>
        id.includes(`:${me}:${other}:`),
      ).length,
      `${where}: contact.visit written`,
    ).toBe(1);
    expect(
      closenessBetween(core, me, other!),
      `${where}: the visit is time together on the tie`,
    ).toBeGreaterThanOrEqual(closenessBefore);
    // The player stays there: the room is the person's until they go home.
    const staying = (await ask("GET", `/api/scene?id=${me}`)).json as {
      people: { personId: string }[];
    };
    expect(
      staying.people.map((p) => p.personId),
      `${where}: still there`,
    ).toContain(other);
    // And now the person is in the room: Visit is closed with "here".
    expect(
      (await acts(other!)).find((a) => a.kind === "visit"),
      where,
    ).toMatchObject({ open: false, reason: "here" });
  }, 900_000);
}
