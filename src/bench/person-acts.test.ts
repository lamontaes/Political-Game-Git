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
    // A townsperson plays (the cabinet's appointees are people too, and their
    // ids sort first; they live in the capital's records, not on a street).
    const me = [...core.people.values()]
      .filter((p) => p.alive && !p.id.startsWith("official:"))
      .sort((a, b) => a.id.localeCompare(b.id))[0]!.id;
    world.player!.select(me);
    // The opening evening, at home: nobody the player lives with is called
    // or visited (the card reads the evening the household gets home, not
    // a midday clock the opening never had).
    for (const mate of [...core.people.values()].filter(
      (p) =>
        p.alive &&
        p.id !== me &&
        p.householdId === core.people.get(me)!.householdId,
    )) {
      const rows = (await ask("GET", `/api/known?id=${me}&other=${mate.id}`))
        .json.acts as Act[];
      expect(
        rows.some((row) => row.kind === "call"),
        `${where}: no call home on the opening evening`,
      ).toBe(false);
    }
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

    // Your own card offers nothing; someone in the room is neither visited
    // nor called (talk to them).
    expect(await acts(me), `${where}: own card`).toEqual([]);
    const room = await hereIds();
    for (const id of room.slice(0, 1)) {
      const row = (await acts(id)).find((a) => a.kind === "visit")!;
      expect(row, `${where}: someone in the room`).toMatchObject({
        open: false,
        reason: "here",
      });
      expect(
        (await acts(id)).some((a) => a.kind === "call"),
        `${where}: nobody calls someone in the room`,
      ).toBe(false);
    }
    // Someone who lives with the player is never visited, wherever they are.
    const household = core.people.get(me)!.householdId;
    for (const mate of [...core.people.values()].filter(
      (p) =>
        p.alive &&
        p.id !== me &&
        p.householdId === household &&
        !room.includes(p.id),
    ))
      expect(
        (await acts(mate.id)).find((a) => a.kind === "visit"),
        `${where}: a housemate`,
      ).toMatchObject({ open: false, reason: "home" });

    // Someone in town not in the room: Visit is open (or closed with a
    // reason the card words), and a closed act always carries its reason.
    // A call is never to a stranger (the phone talk, Words lead, Nov 14), so
    // the people the player knows best are tried first.
    const town = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== me &&
          p.placeId === core.people.get(me)!.placeId &&
          !room.includes(p.id),
      )
      .map((p) => ({ p, close: closenessBetween(core, me, p.id) }))
      .sort((a, b) => b.close - a.close || a.p.id.localeCompare(b.p.id))
      .map((row) => row.p);
    let other: string | undefined;
    for (const candidate of town.slice(0, 60)) {
      const rows = await acts(candidate.id);
      // Visit is listed first, unless a visit would have nothing to say (a
      // colleague never met): then it is not offered at all.
      if (rows.length)
        expect(["visit", "call"], `${where}: Visit comes first`).toContain(
          rows[0]!.kind,
        );
      for (const row of rows)
        expect(row.open || !!row.reason, `${where}: reason`).toBe(true);
      // Visit and Call both open (Ask out or Propose may follow them).
      const open = (kind: string) =>
        rows.some((r) => r.kind === kind && r.open);
      if (open("visit") && open("call")) {
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
    // A visit offered is a talk had: the player is never set down in a room
    // where nothing is said (walk at Ainaloa HI, Nov 15).
    expect(
      visit.json.talk?.lines.length,
      `${where}: the visit opens a talk`,
    ).toBeGreaterThan(0);
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

    // Late in the day, a visit that would run past the day's end is not
    // offered: the clock is spent toward the night the way any act spends it.
    const day =
      parameter("hoursPerDay", parameters) *
      parameter("minutesPerHour", parameters);
    const now = world.player!.packet!.at.minuteOfDay;
    const late = day - Math.round(spent) + 1;
    if (now < late)
      expect(
        (
          await ask(
            "POST",
            `/api/wait?hours=${(late - now) / parameter("minutesPerHour", parameters)}`,
          )
        ).status,
        where,
      ).toBe(200);
    expect(world.player!.packet!.at.minuteOfDay, where).toBeGreaterThanOrEqual(
      late,
    );
    const lateRows = await Promise.all(
      town
        .slice(0, 20)
        .map(async (p) => (await acts(p.id)).find((a) => a.kind === "visit")!),
    );
    expect(
      lateRows.filter((row) => row.open),
      `${where}: no visit offered that runs past the day`,
    ).toEqual([]);
    expect(
      lateRows.some((row) => row.reason === "late"),
      `${where}: too late to go over`,
    ).toBe(true);
    // Each world here is built through the bench: 19 to 39 s beside the PR's
    // other changed tests (Nov 16, merged with Train c0f54ca0), and over 45 s
    // on CI's runner (unit job, cd7248a3). The limit is near twice the slower.
  }, 90_000);
}
