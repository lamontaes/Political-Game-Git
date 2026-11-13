/**
 * A resident player attends a council or board meeting and speaks (pool item
 * meetings-resident-player-speaks-at-public-comment). A player who does not
 * sit on the body marks a posted meeting to attend; the meeting holds their
 * clock at its hour; they speak for an item through the one sign-up
 * (`speakOnItem`, `signUpToSpeak`), cannot vote or adjourn, and leave; the
 * body votes at its close and its members and the player know each other
 * (the public-comment rule of #8938). Watching changes nothing: the same
 * world with the player attending in silence decides the same bills by the
 * same votes. A place is drawn from all 56; set GOLDEN_PATH_SEED to reproduce.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  billOf,
  bodyOf,
  LEGISLATURE_MODULE_ID,
  members,
  votesOn,
  type BillRow,
} from "./modules/legislature";
import { remarksOn } from "./modules/meetings";
import {
  adjourn,
  attendMeeting,
  leaveMeeting,
  meetingInProgress,
  meetingOf,
  meetingToAttend,
  officeActsOf,
  setStops,
  speakOnItem,
  takeUpItem,
  upcomingMeeting,
} from "./modules/office-day";
import { townSeats } from "./modules/offices";
import { coreAPI, type CoreState } from "./state";
import type { CoreAPI } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

const LOCAL = ["city", "township", "county"];
/** The town's and county's own bodies that meet. */
const localBodies = (api: CoreAPI): string[] => [
  ...new Set(
    townSeats(api)
      .filter((s) => LOCAL.includes(s.office.level) && bodyOf(api, s.office.id))
      .map((s) => s.office.id),
  ),
];

const reasons = (packet: unknown): string[] =>
  (
    (packet as { stop?: { modules?: { reasonKey: string }[] } })?.stop
      ?.modules ?? []
  ).map((m) => m.reasonKey);

/** The meeting the player's clock is stopped at now, by the meeting's own stop. */
const stoppedAt = (api: CoreAPI, player: BenchPlayer) =>
  player.packet?.kind === "stop" &&
  reasons(player.packet).includes("office-day.meeting")
    ? meetingInProgress(api)
    : undefined;

/** One day of play: a stop or choice already open is answered, else the day advances. */
function step(player: BenchPlayer) {
  if (player.pollingPlace) player.leavePolls();
  const packet = player.packet;
  if (packet?.kind === "stop")
    player.resume({ kind: "stop", pauseId: packet.pauseId });
  else if (packet?.kind === "choice")
    player.resume({ kind: "own-choice", pauseId: packet.pauseId });
  else player.advance("day");
}

function open(placeSeed: string, placeKey: string) {
  const world = buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(world.core);
  const me = (world.core as CoreState).playerId!;
  const player = new BenchPlayer(world.core, world.director);
  player.select(me);
  // The clock is bound to the resident before anything is marked.
  player.advance("day");
  return { core: world.core as CoreState, api, me, player };
}

/** Mark every posted meeting of a body the player does not sit on. */
function markAll(api: CoreAPI): number {
  let marked = 0;
  for (const officeId of localBodies(api)) {
    const next = upcomingMeeting(api, officeId);
    const open = next && meetingToAttend(api, officeId, next.date);
    if (open && !open.marked) {
      attendMeeting(api, officeId, next.date, true);
      marked += 1;
    }
  }
  return marked;
}

it("a resident marks a posted meeting, is held at its hour, speaks, leaves, and the members meet them", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "resident-attends");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, api, me, player } = open(place.seed, place.key);
    const end = new Date(
      Date.parse(`${core.date}T00:00:00Z`) + 150 * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    let emptyRooms = 0;
    let spoke: { meetingId: string; billId: string; body: string } | null =
      null;
    for (
      let guard = 0;
      guard < 2_000 && core.date < end && !spoke;
      guard += 1
    ) {
      markAll(api);
      step(player);
      // Held by the meeting's own stop, as a member is, and in the room as audience.
      const meeting = stoppedAt(api, player);
      if (!meeting) continue;
      expect(meeting.audience, where).toBe(me);
      expect(
        members(api, meeting.officeId).some((t) => t.personId === me),
        `${where}: the player holds no seat`,
      ).toBe(false);
      const billId = meeting.agenda[0];
      if (!billId) {
        emptyRooms += 1;
        leaveMeeting(api, meeting.id);
        continue;
      }
      // Still undecided at the stop: the filings waited for the room.
      for (const id of meeting.agenda)
        expect(billOf(api, id).status, `${where}: ${id}`).toBe("drafted");
      speakOnItem(api, meeting.id, billId, 1);
      // A resident takes nothing up and cannot adjourn the body.
      expect(() => takeUpItem(api, meeting.id, billId, "yes")).toThrow();
      expect(() => adjourn(api, meeting.id)).toThrow();
      expect(billOf(api, billId).status, where).toBe("drafted");
      leaveMeeting(api, meeting.id);
      expect(meetingOf(api, meeting.id)?.playerPresent, `${where}: left`).toBe(
        false,
      );
      expect(meetingInProgress(api)?.id, `${where}: left`).not.toBe(meeting.id);
      spoke = { meetingId: meeting.id, billId, body: meeting.officeId };
    }
    if (!spoke) {
      tried.push(
        `${where}: ${emptyRooms} meetings attended, none with an item`,
      );
      continue;
    }
    // The day goes on and closes: the body votes with the remark on its record.
    const day = core.date;
    for (let guard = 0; guard < 20 && core.date <= day; guard += 1) {
      // Another body's meeting the same day, marked too: left in silence.
      const other = stoppedAt(api, player);
      if (other) leaveMeeting(api, other.id);
      step(player);
    }
    const bill = billOf(api, spoke.billId);
    expect(bill.status, `${where}: voted at the close`).not.toBe("drafted");
    expect(meetingOf(api, spoke.meetingId)?.status, where).toBe("adjourned");
    const remark = remarksOn(api, spoke.billId).find((r) => r.personId === me);
    expect(remark, `${where}: the remark`).toMatchObject({
      kind: "public-comment",
      position: 1,
      signedUp: true,
    });
    expect(
      officeActsOf(api, me).some(
        (act) => act.kind === "speak" && act.recordId === remark!.id,
      ),
      `${where}: the act`,
    ).toBe(true);
    // That they came is on the record too.
    expect(
      officeActsOf(api, me).some(
        (act) => act.kind === "attend" && act.recordId === spoke!.meetingId,
      ),
      `${where}: attended`,
    ).toBe(true);
    // No vote of the player's: they hold no seat.
    expect(
      votesOn(api, spoke.billId).some((v) => v.memberId === me),
      where,
    ).toBe(false);
    const seated = members(api, spoke.body).flatMap((t) =>
      t.personId ? [t.personId] : [],
    );
    expect(seated.length, `${where}: named members`).toBeGreaterThan(0);
    const mine = core.people.get(me)!;
    for (const id of seated) {
      expect(mine.knownIds.has(id), `${where}: player knows ${id}`).toBe(true);
      expect(
        core.people.get(id)!.knownIds.has(me),
        `${where}: ${id} knows the player`,
      ).toBe(true);
    }
    console.log(
      `resident-attends ${where}: spoke for ${bill.number} at ${spoke.meetingId}; ${bill.status}; ${seated.length} members met; ${emptyRooms} earlier meetings had no item`,
    );
    return;
  }
  throw new Error(`no meeting with an item was reached; ${tried.join("; ")}`);
}, 3_600_000);

it("a mark taken back holds nobody, and a meeting whose hour has come cannot be marked", () => {
  const place = drawPlace(seed, "resident-unmarks");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core, api, player } = open(place.seed, place.key);
  let checked = 0;
  for (let guard = 0; guard < 400 && checked < 2; guard += 1) {
    const marked = localBodies(api).flatMap((officeId) => {
      const next = upcomingMeeting(api, officeId);
      return next && meetingToAttend(api, officeId, next.date)
        ? [{ officeId, date: next.date }]
        : [];
    });
    for (const { officeId, date } of marked) {
      attendMeeting(api, officeId, date, true);
      expect(meetingToAttend(api, officeId, date)?.marked, where).toBe(true);
      attendMeeting(api, officeId, date, false);
      expect(meetingToAttend(api, officeId, date)?.marked, where).toBe(false);
    }
    const dates = new Set(marked.map((m) => m.date));
    step(player);
    expect(
      reasons(player.packet),
      `${where}: no meeting stop on ${core.date}`,
    ).not.toContain("office-day.meeting");
    // A meeting of a day now behind the clock is closed to marking.
    for (const { officeId, date } of marked)
      if (date < core.date) {
        expect(meetingToAttend(api, officeId, date), where).toBeNull();
        expect(() => attendMeeting(api, officeId, date, true)).toThrow();
        checked += 1;
      }
    void dates;
  }
  expect(checked, `${where}: meetings passed`).toBeGreaterThan(0);
  console.log(`resident-unmarks ${where}: ${checked} unmarked meetings passed`);
}, 3_600_000);

/** Every bill of the town's own bodies that was decided, with each member's vote. */
function decided(api: CoreAPI): string[] {
  const bodies = new Set(localBodies(api));
  return (
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as BillRow[]
  )
    .filter((b) => bodies.has(b.bodyOfficeId) && b.status !== "drafted")
    .map(
      (b) =>
        `${b.bodyOfficeId} ${b.number} ${b.status} ${votesOn(api, b.id)
          .map((v) => `${v.memberId}:${v.vote}`)
          .sort()
          .join(",")}`,
    )
    .sort();
}

/**
 * The places the twin runs play: drawn ones, tried in turn until one has what the twin
 * needs (a local body that meets), or `TWIN_PLACES` ("key:seed,key:seed") to replay
 * named ones, every one of which must pass.
 */
const named = process.env.TWIN_PLACES?.split(",").map((pair) => {
  const [key, placeSeed] = pair.split(":") as [string, string];
  return { key, seed: placeSeed, name: key };
});
const twinPlaces = (salt: string) =>
  named ??
  Array.from({ length: 6 }, (_, draw) => drawPlace(`${seed}:${draw}`, salt));
/**
 * The place that showed two filing paths cannot decide alike (Nov 13, 2026):
 * its council voted a budget line differently once the town had a night to
 * hear of it. Kept, so the one path is proved where the two paths split.
 */
const SPLIT_PLACE = {
  key: "1820692",
  name: "Elizabethtown, Indiana",
  seed: "fcad6dc9215fc941ce39501ad985fc28419c852d4dab6e3dd5220a7b1d462a7a",
};
const DAYS = Number(process.env.TWIN_DAYS ?? 100);
const endOf = (core: CoreState) =>
  new Date(Date.parse(`${core.date}T00:00:00Z`) + DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

it("watching changes nothing: attending in silence, the same bills get the same votes", () => {
  let proved = 0;
  const passedOver: string[] = [];
  // The kept place first, and it must pass; then drawn ones until one has a meeting to attend.
  const places = named ?? [SPLIT_PLACE, ...twinPlaces("resident-watches")];
  for (const place of places) {
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    console.log(`resident-watches builds ${where}`);
    const kept = place === SPLIT_PLACE;
    // One world in memory at a time: each run returns only what is compared.
    const run = (attend: boolean) => {
      const { core, api, player } = open(place.seed, place.key);
      const end = endOf(core);
      let attended = 0;
      let items = 0;
      for (let guard = 0; guard < 2_000 && core.date < end; guard += 1) {
        if (attend) markAll(api);
        step(player);
        const meeting = stoppedAt(api, player);
        if (meeting) {
          attended += 1;
          items += meeting.agenda.length;
          leaveMeeting(api, meeting.id);
        }
      }
      return { bills: decided(api), attended, items, date: core.date };
    };
    const watched = run(true);
    const alone = run(false);
    console.log(
      `resident-watches ${where}: ${watched.attended} meetings attended with ${watched.items} items; ${watched.bills.length} bills decided watched, ${alone.bills.length} unwatched, through ${watched.date}`,
    );
    expect(alone.attended).toBe(0);
    expect(watched.date).toBe(alone.date);
    expect(watched.bills, where).toEqual(alone.bills);
    // A place with no meeting to attend proves nothing: passed over by name.
    if (kept) {
      expect(watched.attended, `${where}: meetings attended`).toBeGreaterThan(
        0,
      );
      continue;
    }
    if (watched.attended > 0) proved += 1;
    else passedOver.push(where);
    if (!named && proved) break;
  }
  expect(
    proved,
    `no drawn place had a meeting to attend; passed over: ${passedOver.join("; ")}`,
  ).toBeGreaterThan(0);
}, 3_600_000);

it("a member the player plays decides alike at the stop and away from it: the member's own vote on every item", () => {
  // The two worlds: the player plays the same member in both. In one they are
  // held at every meeting and leave each item to the character ("Decide for
  // me"), which casts the vote the member's own position gives; in the other no meeting stops them, and the meeting's
  // close votes the items with the member's own vote. Same place, same seed,
  // same days. (A seat the player plays is not compared with the same seat
  // left to the world: a played member files no ordinances of their own and
  // is not voted for on an override, so those two worlds differ by what the
  // player does, not by the hold. The watcher's twin above compares held
  // against unheld.)
  let proved = 0;
  const passedOver: string[] = [];
  for (const place of twinPlaces("seated-holds")) {
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const run = (present: boolean) => {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core as CoreState;
      const api = coreAPI(core);
      const seat = townSeats(api).find(
        (s) =>
          s.holder?.personId &&
          LOCAL.includes(s.office.level) &&
          bodyOf(api, s.office.id) &&
          members(api, s.office.id).length > 1,
      );
      if (!seat?.holder?.personId) return null;
      const member = seat.holder.personId;
      const player = new BenchPlayer(core, world.director);
      player.select(member);
      setStops(api, member, {
        "every-meeting": present,
        "own-bill-vote": present,
        "deciding-vote": present,
      });
      const end = endOf(core);
      let held = 0;
      let items = 0;
      for (let guard = 0; guard < 2_000 && core.date < end; guard += 1) {
        step(player);
        const meeting = stoppedAt(api, player);
        if (meeting) {
          held += 1;
          for (const id of [...meeting.agenda]) {
            if (billOf(api, id).status !== "drafted") continue;
            items += 1;
            takeUpItem(api, meeting.id, id, "own");
          }
          adjourn(api, meeting.id);
        }
      }
      return { bills: decided(api), held, items, date: core.date };
    };
    const held = run(true);
    if (!held) {
      passedOver.push(`${where}: no seated member`);
      continue;
    }
    const away = run(false)!;
    console.log(
      `seated-holds ${where}: ${held.held} meetings held with ${held.items} items; ${held.bills.length} bills decided held, ${away.bills.length} away, through ${held.date}`,
    );
    expect(away.held).toBe(0);
    expect(held.date).toBe(away.date);
    expect(held.bills, where).toEqual(away.bills);
    if (held.held > 0) proved += 1;
    else passedOver.push(where);
    if (!named && proved) break;
  }
  expect(
    proved,
    `no drawn place had a seat to play at a meeting; passed over: ${passedOver.join("; ")}`,
  ).toBeGreaterThan(0);
}, 3_600_000);
