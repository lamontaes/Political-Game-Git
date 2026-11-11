/**
 * The clock spends time on what the player does: a trip and a visit, a talk
 * (its lines) and a wait all move the one clock the packet reports, so after a
 * morning of errands it stands past noon and the people present are those there
 * at that hour. Through the bench's own routes, in a place drawn from all 56;
 * set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { benchRequest, benchWorld } from "./handler";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  return {
    status: reply.status,
    json: JSON.parse(String(reply.body)) as {
      packet?: { at: { date: string; minuteOfDay: number } };
      lines?: unknown[];
    },
  };
};

it("a trip, two visits, a talk and a wait move the clock past noon", async () => {
  const place = drawPlace(seed, "clock-spends-time");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const built = await ask(
    "POST",
    `/api/build?seed=${encodeURIComponent(place.seed)}`,
  );
  expect(built.status, where).toBe(200);
  const world = benchWorld();
  const core = world.core!;
  const parameters = core.data.parameters;
  const parameter = (key: string) => {
    const row = (parameters as Record<string, { value: number }>)[key];
    if (!row) throw new Error(`no parameter ${key}`);
    return row.value;
  };
  const ids = [...core.people.values()].filter((p) => p.alive).map((p) => p.id);
  const me = ids[0]!;
  world.player!.select(me);
  // The opening evening comes before the first morning: a talk then holds the
  // clock, so the first Day still lands on the very next morning. (Spent from
  // tomorrow morning, it cost the player that whole day: Panama, Nebraska,
  // seed f06ba996-7a12-41f6-a670-66607f7659bb, Nov 11.)
  const opening = core.date;
  for (const other of ids.slice(1, 21)) {
    const opened = await ask("POST", `/api/talk/open?otherId=${other}`);
    expect(opened.status, where).toBe(200);
    const said = (opened.json.lines ?? []).length;
    const left = await ask("POST", "/api/talk/leave");
    expect(left.status, where).toBe(200);
    expect(
      left.json.packet,
      `${where}: the evening's talk moved the clock`,
    ).toBeUndefined();
    if (said) break;
  }
  expect(
    world.player!.packet,
    `${where}: the clock has not started`,
  ).toBeUndefined();
  const day = await ask("POST", "/api/advance?mode=day");
  expect(day.status, where).toBe(200);
  expect(day.json.packet!.at.date, `${where}: the first Day's date`).toBe(
    addDays(makeIsoDate(opening), 1),
  );
  const start = day.json.packet!.at.minuteOfDay as number;
  const minute = () => world.player!.packet!.at.minuteOfDay as number;
  expect(start, `${where}: Day lands on the morning`).toBeLessThan(12 * 60);

  const places = (await ask("GET", `/api/goto?id=${me}`)).json as unknown as {
    organizationId: string;
  }[];
  expect(places.length, `${where}: somewhere to go`).toBeGreaterThan(1);
  const trip = parameter("tripMinutes"),
    errand = parameter("visitHours") * parameter("minutesPerHour");
  let expected = start;
  for (const org of places.slice(0, 2)) {
    const visit = await ask(
      "POST",
      `/api/goto/visit?org=${encodeURIComponent(org.organizationId)}`,
    );
    expect(visit.status, where).toBe(200);
    expected += trip + errand;
    expect(minute(), `${where}: a trip and an errand`).toBe(expected);
  }

  // A talk spends its lines when it ends.
  let lines = 0;
  for (const other of ids.slice(1, 21)) {
    const opened = await ask("POST", `/api/talk/open?otherId=${other}`);
    expect(opened.status, where).toBe(200);
    lines = ((opened.json?.lines as unknown[] | undefined) ?? []).length;
    if (lines) break;
    await ask("POST", "/api/talk/leave");
  }
  expect(lines, `${where}: no talk had a line`).toBeGreaterThan(0);
  const left = await ask("POST", "/api/talk/leave");
  expect(left.status, where).toBe(200);
  expected += lines * parameter("talkMinutesPerLine");
  expect(minute(), `${where}: the talk's lines`).toBe(expected);

  // Waiting spends the hours asked for, so the morning's errands end past noon.
  const wait = Math.max(1, Math.ceil((12 * 60 + 1 - expected) / 60));
  const waited = await ask("POST", `/api/wait?hours=${wait}`);
  expect(waited.status, where).toBe(200);
  expected += wait * parameter("minutesPerHour");
  expect(minute(), `${where}: the wait`).toBe(expected);
  expect(minute(), `${where}: past noon`).toBeGreaterThan(12 * 60);
}, 900_000);
