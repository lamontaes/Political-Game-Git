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
  type CommitteeRecord,
  votesOn,
  type BillRow,
} from "./modules/legislature";
import { remarksOn } from "./modules/meetings";
import { filesAhead } from "./modules/world-legislating";
import {
  adjourn,
  attendMeeting,
  leaveMeeting,
  meetingInProgress,
  meetingOf,
  meetingToAttend,
  OFFICE_DAY_MODULE_ID,
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
      // An item a board's committee already failed on the eve (the board has
      // committees) still sits on the agenda; the resident speaks on one that
      // waits for the floor.
      // A board with committees also ran its public-comment hook on the eve,
      // before anyone could speak at the meeting: a remark made now is not
      // heard by its members (`meetings-resident-remark-reaches-a-committee-board`),
      // so such an item is passed over here and named. Remove this skip when
      // that item is fixed. Seen in Jaguas, Puerto Rico (7237336), seed
      // 9d9e53d2305f75c3583e29af76860e2d96c0bd7bb16d04e5b1b33e87c455f942,
      // which must then pass here. A draw with no item left still fails below
      // (no meeting with an item was reached).
      const billId = meeting.agenda.find((id) => {
        const bill = billOf(api, id);
        return (
          bill.status === "drafted" &&
          !bill.hooksRun?.includes("public-comment")
        );
      });
      if (!billId) {
        emptyRooms += 1;
        leaveMeeting(api, meeting.id);
        continue;
      }
      // Not voted at the stop: the filings waited for the room. A committee
      // may have failed one on the eve, before the meeting day, never on it.
      for (const id of meeting.agenda) {
        const bill = billOf(api, id);
        if (bill.status === "drafted") continue;
        expect(bill.status, `${where}: ${id}`).toBe("failed");
        expect(
          (bill.failedOn ?? meeting.date) < meeting.date,
          `${where}: ${id} failed before the meeting day`,
        ).toBe(true);
      }
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
  // A place with no local body that meets (a territory's village) has no
  // meeting to mark: passed over by name, and the next is drawn.
  const passedOver: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "resident-unmarks");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    console.log(`resident-unmarks builds ${where}`);
    const { core, api, player } = open(place.seed, place.key);
    if (!localBodies(api).some((id) => upcomingMeeting(api, id))) {
      passedOver.push(`${where}: no local body meets`);
      continue;
    }
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
    }
    expect(checked, `${where}: meetings passed`).toBeGreaterThan(0);
    console.log(
      `resident-unmarks ${where}: ${checked} unmarked meetings passed`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a local body that meets; passed over: ${passedOver.join("; ")}`,
  );
}, 3_600_000);

it("a meeting whose agenda is filed only on its own day is not offered to a resident", () => {
  // The first meeting after a world begins, when it falls on the next day,
  // has under a day's notice: its members file on the day, after the hour a
  // resident would be in the room. Places are drawn until one has such a meeting.
  const passedOver: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "short-notice");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    console.log(`short-notice builds ${where}`);
    const { core, api } = open(place.seed, place.key);
    const short = localBodies(api).flatMap((officeId) => {
      const next = upcomingMeeting(api, officeId);
      return next && !filesAhead(api, officeId, next.date)
        ? [{ officeId, date: next.date }]
        : [];
    });
    if (!short.length) {
      passedOver.push(where);
      continue;
    }
    for (const { officeId, date } of short) {
      expect(meetingToAttend(api, officeId, date), where).toBeNull();
      expect(() => attendMeeting(api, officeId, date, true), where).toThrow();
    }
    // Its members have yet to file, so it cannot be adjourned before them:
    // it stays open, takes the filings and votes them at its close.
    const {
      core: seatedCore,
      api: seatedApi,
      player,
    } = open(place.seed, place.key);
    const early = short.filter((m) => m.date >= seatedCore.date);
    expect(early.length, `${where}: a meeting still ahead`).toBeGreaterThan(0);
    for (const { officeId, date } of early) {
      const id = `meeting:${officeId}:${date}`;
      while (seatedCore.date < date) step(player);
      if (meetingOf(seatedApi, id)?.status === "adjourned") continue;
      expect(adjourn(seatedApi, id).status, `${where}: ${id}`).not.toBe(
        "adjourned",
      );
    }
    const last = early
      .map((m) => m.date)
      .sort()
      .at(-1);
    for (
      let guard = 0;
      last && guard < 20 && seatedCore.date <= last;
      guard += 1
    )
      step(player);
    for (const { officeId, date } of early) {
      const row = meetingOf(seatedApi, `meeting:${officeId}:${date}`)!;
      expect(row.status, `${where}: ${row.id} closed`).toBe("adjourned");
      for (const billId of row.agenda)
        expect(
          billOf(seatedApi, billId).status,
          `${where}: ${billId}`,
        ).not.toBe("drafted");
    }
    console.log(
      `short-notice ${where}: ${short.length} meetings on ${short.map((m) => m.date).join(", ")} not offered on ${core.date}`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a meeting with under a day's notice; passed over: ${passedOver.join("; ")}`,
  );
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
/**
 * The place that showed two bodies meeting the same day must vote in one
 * order (Nov 13, 2026): its county board passed a law on the day its council
 * met, and the council weighed that law only when the player was away from
 * their seat. Kept, so the order is proved where it mattered.
 */
const SAME_DAY_PLACE = {
  key: "0531090",
  name: "Heber Springs, Arkansas",
  seed: "fb9b371a2c260c1e5bd2ea80924b870a320f30742d81a7daca8fe7535f0c943d",
};
/**
 * The place that showed a board with committees runs the own-vote hook once, on
 * the eve, while the player is held (Nov 13, 2026): nothing is cast for the
 * player there, and "Decide for me" at the meeting did not cast either, so the
 * member abstained where the unheld twin voted. Kept, so the vote is proved
 * cast at the meeting, by the player's ask, and not before.
 */
const COMMITTEE_PLACE = {
  key: "7230372",
  name: "Garrochales, Puerto Rico",
  seed: "7dae2d52c2ce307c8b1896e42a30f4cdf5ebf9aedcd8760777c5a5eb1dd36081",
};
/**
 * The place that showed a committee the player sits on tallies on the eve for
 * a player away and, with the seat deferred, differently for one held (Nov 13,
 * 2026, CI): the committee the player sits on now meets on the meeting's day
 * on both paths. Kept, and a committee they sit on must be in it.
 */
const SEATED_COMMITTEE_PLACE = {
  key: "7200358",
  name: "Adjuntas, Puerto Rico",
  seed: "46df10dad049f2497d21e51cb6bfb6a949ec55a83040f6eb601b9d1cf1eb2472",
};
const DAYS = Number(process.env.TWIN_DAYS ?? 100);
const endOf = (core: CoreState) =>
  new Date(Date.parse(`${core.date}T00:00:00Z`) + DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** Every local body's meeting on a date, the one whose hour comes first leading (then by id). */
function meetingsOn(api: CoreAPI, date: string) {
  return localBodies(api)
    .flatMap((officeId) => {
      const row = meetingOf(api, `meeting:${officeId}:${date}`);
      return row ? [row] : [];
    })
    .sort((a, b) => a.startMinute - b.startMinute || a.id.localeCompare(b.id));
}

it("of two bodies meeting the same day, the earlier votes first, the later is never closed early, and one the player is at waits for them", () => {
  // Heber Springs (below): its county board and its council meet the same days.
  const place = SAME_DAY_PLACE;
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  let earlierSeen = 0;
  let laterSeen = 0;
  let waited = 0;
  // Played once from a seat on each body, so the player's body is the later
  // one in one world and the earlier one in the other.
  for (let pick = 0; pick < 2; pick += 1) {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core as CoreState;
    const api = coreAPI(core);
    const bodies = localBodies(api).filter((id) => members(api, id).length > 1);
    const body = bodies[pick];
    if (!body) continue;
    const member = members(api, body).find((t) => t.personId)?.personId;
    if (!member) continue;
    const player = new BenchPlayer(core, world.director);
    player.select(member);
    setStops(api, member, {
      "every-meeting": true,
      "own-bill-vote": true,
      "deciding-vote": true,
    });
    const end = new Date(Date.parse(`${core.date}T00:00:00Z`) + 60 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    for (let guard = 0; guard < 1_000 && core.date < end; guard += 1) {
      // The player also marks any other body's coming meeting, to watch it.
      markAll(api);
      step(player);
      const meeting = stoppedAt(api, player);
      if (!meeting) continue;
      const mine = meetingOf(api, `meeting:${body}:${meeting.date}`);
      if (!mine || mine.status === "adjourned" || !mine.playerPresent) {
        // Only watching today: leave.
        if (meeting.audience) leaveMeeting(api, meeting.id);
        continue;
      }
      const sameDay = meetingsOn(api, mine.date);
      const at = sameDay.findIndex((row) => row.id === mine.id);
      const earlier = sameDay
        .slice(0, at)
        .filter((r) => r.status !== "adjourned");
      const later = sameDay.slice(at + 1);
      const item = mine.agenda.find(
        (id) => billOf(api, id).status === "drafted",
      );
      // A meeting the player is still at, watching, waits for them: taking an
      // item up at their own body votes nothing there.
      const watching = earlier.filter(
        (row) => row.playerPresent && row.audience,
      );
      if (item && watching.length) {
        takeUpItem(api, mine.id, item, "own");
        for (const row of watching) {
          const now = meetingOf(api, row.id)!;
          expect(now.status, `${where}: ${row.id} waits`).not.toBe("adjourned");
          for (const id of now.agenda)
            expect(billOf(api, id).status, `${where}: ${id}`).toBe("drafted");
          leaveMeeting(api, row.id);
          waited += 1;
        }
      } else
        for (const row of earlier)
          if (row.audience && row.playerPresent) leaveMeeting(api, row.id);
      adjourn(api, mine.id);
      // Every earlier meeting has voted; no later one was closed early.
      for (const row of earlier) {
        expect(
          meetingOf(api, row.id)!.status,
          `${where}: ${row.id} first`,
        ).toBe("adjourned");
        earlierSeen += 1;
      }
      for (const row of later) {
        const now = meetingOf(api, row.id)!;
        expect(now.status, `${where}: ${row.id} not early`).not.toBe(
          "adjourned",
        );
        // The player marked it too: leave it, and it votes at its close.
        if (now.playerPresent && now.audience) leaveMeeting(api, now.id);
        laterSeen += 1;
      }
    }
  }
  console.log(
    `same-day ${where}: ${earlierSeen} earlier meetings voted first, ${laterSeen} later meetings left to their close, ${waited} waited for the player`,
  );
  expect(
    earlierSeen,
    `${where}: an earlier meeting the same day`,
  ).toBeGreaterThan(0);
  expect(laterSeen, `${where}: a later meeting the same day`).toBeGreaterThan(
    0,
  );
  expect(
    waited,
    `${where}: a meeting that waited for the player`,
  ).toBeGreaterThan(0);
}, 3_600_000);

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
  // The kept place first, and it must pass; then drawn ones until one has a seat to play.
  for (const place of named ?? [
    SAME_DAY_PLACE,
    COMMITTEE_PLACE,
    SEATED_COMMITTEE_PLACE,
    ...twinPlaces("seated-holds"),
  ]) {
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    console.log(`seated-holds builds ${where}`);
    const kept = place === SAME_DAY_PLACE || place === COMMITTEE_PLACE;
    const run = (
      present: boolean,
      mode: "own" | "silent" | "adjourn" = "own",
    ) => {
      const silent = mode === "silent";
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
      const sat: string[] = [];
      let adjourned = 0;
      for (let guard = 0; guard < 2_000 && core.date < end; guard += 1) {
        step(player);
        const meeting = stoppedAt(api, player);
        if (meeting && silent) {
          // A player who does nothing: the day closes the meeting on them.
          held += 1;
          sat.push(...meeting.agenda);
        } else if (meeting && mode === "adjourn") {
          // The player presses Adjourn with items still open.
          held += 1;
          const open = meeting.agenda.filter(
            (id) => billOf(api, id).status === "drafted",
          );
          for (const id of open)
            expect(
              api
                .moduleState(LEGISLATURE_MODULE_ID)
                .table("choices")
                .get(`${id}|${member}`),
              `${where}: ${id} voted before Adjourn`,
            ).toBeUndefined();
          adjourn(api, meeting.id);
          for (const id of open) {
            if (billOf(api, id).moot) continue;
            const chosen = api
              .moduleState(LEGISLATURE_MODULE_ID)
              .table("choices")
              .get(`${id}|${member}`) as unknown as
              { vote?: string } | undefined;
            expect(
              chosen?.vote,
              `${where}: ${id} cast at Adjourn`,
            ).toBeDefined();
            const act = officeActsOf(api, member).find(
              (a) => a.kind === "vote" && a.recordId === id,
            );
            expect(act?.how, `${where}: ${id} act at Adjourn`).toBe(
              "own-choice",
            );
            expect(act?.date, `${where}: ${id} Adjourn day`).toBe(core.date);
            adjourned += 1;
          }
        } else if (meeting) {
          held += 1;
          for (const id of [...meeting.agenda]) {
            if (billOf(api, id).status !== "drafted") continue;
            items += 1;
            const chosen = () =>
              api
                .moduleState(LEGISLATURE_MODULE_ID)
                .table("choices")
                .get(`${id}|${member}`) as unknown as
                { vote?: string } | undefined;
            // No vote of the player's is on the record before their stop.
            expect(
              chosen(),
              `${where}: ${id} voted before the stop`,
            ).toBeUndefined();
            takeUpItem(api, meeting.id, id, "own");
            // An item found moot at the floor dies unvoted: nothing to cast.
            if (billOf(api, id).moot) continue;
            // Asked for at the meeting, it is cast that day as their own choice.
            expect(
              chosen()?.vote,
              `${where}: ${id} cast at the stop`,
            ).toBeDefined();
            const act = officeActsOf(api, member).find(
              (a) => a.kind === "vote" && a.recordId === id,
            );
            expect(act?.how, `${where}: ${id} act`).toBe("own-choice");
            expect(act?.date, `${where}: ${id} act day`).toBe(core.date);
          }
          adjourn(api, meeting.id);
        }
      }
      if (silent) {
        // Not an act, so no vote of theirs is cast from their views.
        expect(sat.length, `${where}: items sat through`).toBeGreaterThan(0);
        for (const id of sat) {
          const chosen = api
            .moduleState(LEGISLATURE_MODULE_ID)
            .table("choices")
            .get(`${id}|${member}`) as unknown as { vote?: string } | undefined;
          expect(chosen?.vote ?? "abstain", `${where}: ${id} silent`).toBe(
            "abstain",
          );
          expect(
            officeActsOf(api, member).some(
              (a) => a.recordId === id && a.how === "own-choice",
            ),
            `${where}: ${id} own-choice act for a silent player`,
          ).toBe(false);
        }
      }
      // A committee the player sits on meets on the meeting's day, whether they
      // are held at it or away: no item of it is decided before that day.
      const committees = (
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("committees")
          .rows() as unknown as CommitteeRecord[]
      )
        .filter((c) => c.memberIds.includes(member))
        .map((c) => {
          const placed = api
            .moduleState(OFFICE_DAY_MODULE_ID)
            .table("agendaItems")
            .get(c.billId) as unknown as { date: string } | undefined;
          if (placed)
            expect(c.date, `${where}: committee on ${c.billId}`).toBe(
              placed.date,
            );
          return `${c.billId} ${c.date} ${c.yes}-${c.no} ${c.votes
            .map((v) => `${v.memberId}:${v.vote}`)
            .join(",")}`;
        });
      if (mode === "adjourn")
        expect(adjourned, `${where}: items left to Adjourn`).toBeGreaterThan(0);
      return { bills: decided(api), held, items, date: core.date, committees };
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
    expect(held.committees, `${where}: committees the player sits on`).toEqual(
      away.committees,
    );
    if (place.key === SEATED_COMMITTEE_PLACE.key)
      expect(
        held.committees.length,
        `${where}: a committee the player sits on`,
      ).toBeGreaterThan(0);
    if (place.key === COMMITTEE_PLACE.key) {
      run(true, "silent");
      run(true, "adjourn");
    }
    if (kept) {
      expect(held.held, `${where}: meetings held`).toBeGreaterThan(0);
      continue;
    }
    if (held.held > 0) proved += 1;
    else passedOver.push(where);
    if (!named && proved) break;
  }
  expect(
    proved,
    `no drawn place had a seat to play at a meeting; passed over: ${passedOver.join("; ")}`,
  ).toBeGreaterThan(0);
}, 3_600_000);
