import { describe, expect, it } from "vitest";
import { gameStartDate } from "../core2/game-start";
import { bodyOf, members } from "../core2/modules/legislature";
import {
  adjourn,
  meetingInProgress,
  officeActsOf,
  stopsOf,
} from "../core2/modules/office-day";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, type CoreState } from "../core2/state";
import { leaveHoldsToCharacter, officeStops, officeView } from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// The stop switches on Your office (owner's card, Nov 14, 2026: "Stop me at every vote"), played
// at the council where the item measured its stops (Heber Springs, Arkansas, seed below). One
// world, two stretches: switched off, no meeting holds the player and the record has them absent
// from the votes; switched on again, the next meeting holds them.
const PLACE = {
  key: "0531090",
  name: "Heber Springs, Arkansas",
  seed: "fb9b371a2c260c1e5bd2ea80924b870a320f30742d81a7daca8fe7535f0c943d",
};
const LOCAL = ["city", "township", "county"];

const reasons = (player: BenchPlayer): string[] =>
  (
    (player.packet as { stop?: { modules?: { reasonKey: string }[] } })?.stop
      ?.modules ?? []
  ).map((m) => m.reasonKey);

describe(`stop switches (${PLACE.name}, seed ${PLACE.seed})`, () => {
  it("off, no meeting holds the player and the record has them absent; on again, a meeting holds them", () => {
    const world = buildBenchWorld(PLACE.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE.key,
    });
    const core = world.core as CoreState;
    const api = coreAPI(core);
    const body = [
      ...new Set(
        townSeats(api)
          .filter(
            (s) => LOCAL.includes(s.office.level) && bodyOf(api, s.office.id),
          )
          .map((s) => s.office.id),
      ),
    ].find((id) => members(api, id).length > 1)!;
    const member = members(api, body).find((t) => t.personId)!.personId!;
    const player = new BenchPlayer(core, world.director);
    player.select(member);

    // A council seat has the meetings switch, on; the floor and the desk are not its moments.
    expect(officeView(core, member).stops).toEqual([
      { key: "meetings", on: true },
    ]);
    expect(() => officeStops(core, member, "desk", false)).toThrow();
    expect(() => officeStops(core, member, "floor", false)).toThrow();

    /** Play to `end`; a meeting stop is answered by adjourning, as a player closing the meeting. */
    const playTo = (days: number, until?: () => boolean) => {
      const end = new Date(
        Date.parse(`${core.date}T00:00:00Z`) + days * 86_400_000,
      )
        .toISOString()
        .slice(0, 10);
      let held = 0;
      for (let guard = 0; guard < 2_000 && core.date < end; guard += 1) {
        if (player.pollingPlace) player.leavePolls();
        const packet = player.packet;
        if (packet?.kind === "stop") {
          if (reasons(player).includes("office-day.meeting")) {
            held += 1;
            const meeting = meetingInProgress(api);
            if (meeting) adjourn(api, meeting.id);
            if (until?.()) break;
          }
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        } else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      return held;
    };

    officeStops(core, member, "meetings", false);
    expect(officeView(core, member).stops).toEqual([
      { key: "meetings", on: false },
    ]);
    expect(playTo(60), "meeting stops while switched off").toBe(0);
    const absent = officeActsOf(api, member).filter(
      (a) => a.kind === "vote" && a.how === "absent",
    );
    expect(absent.length, "absent votes while switched off").toBeGreaterThan(0);
    for (const act of absent) expect(act.detail).toBe("stop-off");

    expect(officeStops(core, member, "meetings", true).stops).toEqual([
      { key: "meetings", on: true },
    ]);
    expect(
      playTo(60, () => true),
      "meeting stops switched back on",
    ).toBe(1);
  }, 290_000);
});

// A legislator's floor votes: switched off, no floor vote holds the player in a year; on again,
// the next one does. The seats and places where the item measured the stops a year.
const FLOOR_SEATS = [
  {
    name: "Danville, Iowa (state senator)",
    key: "1918435",
    seed: "4b0fc31d-ba59-4168-8b84-d7c0e3f826b6",
    seat: (kind: string) => kind.startsWith("legislature-"),
  },
] as const;

describe.each(FLOOR_SEATS)("floor switch ($name, seed $seed)", (place) => {
  /** A fresh world seated as the place's legislator; plays until `until` (a date) or its first floor stop. */
  const seated = () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core as CoreState;
    const api = coreAPI(core);
    const member = townSeats(api).find(
      (s) => s.holder?.personId && place.seat(s.office.kind),
    )!.holder!.personId!;
    const player = new BenchPlayer(core, world.director);
    player.select(member);
    const play = (until: string, stopAtFirst: boolean) => {
      let held: string | null = null;
      for (
        let guard = 0;
        guard < 20_000 && core.date < until && !held;
        guard += 1
      ) {
        if (player.pollingPlace) player.leavePolls();
        const packet = player.packet;
        if (packet?.kind === "stop") {
          if (reasons(player).some((r) => /^office-day/.test(r))) {
            held = core.date;
            leaveHoldsToCharacter(core, member);
            if (!stopAtFirst) held = held;
          }
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        } else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      return held;
    };
    return { core, member, play };
  };
  const after = (date: string, days: number) =>
    new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
      .toISOString()
      .slice(0, 10);

  it("on, a floor vote holds the player; off, the same stretch of days holds them for none", () => {
    const on = seated();
    expect(officeView(on.core, on.member).stops).toEqual([
      { key: "floor", on: true },
    ]);
    const first = on.play(after(on.core.date, 365), true);
    expect(first, "a floor stop with the switch on").not.toBeNull();
    const off = seated();
    officeStops(off.core, off.member, "floor", false);
    expect(officeView(off.core, off.member).stops).toEqual([
      { key: "floor", on: false },
    ]);
    expect(
      off.play(after(first!, 7), false),
      "a floor stop with the switch off",
    ).toBeNull();
  }, 290_000);
});

// A member of Congress has the same floor switch; the engine's own federal test
// (office-day-federal.test.ts) proves the absent record, so this checks only the seat's switch.
it("a U.S. Representative has the floor switch, and the switch is kept (St. Peter, Minnesota, seed t51-walk-a)", () => {
  const world = buildBenchWorld("t51-walk-a", gameStartDate(), {
    twoLevel: true,
    placeKey: "2758036",
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const member = townSeats(api).find(
    (s) => s.holder?.personId && s.office.kind.startsWith("us-house"),
  )!.holder!.personId!;
  expect(officeView(core, member).stops).toEqual([{ key: "floor", on: true }]);
  officeStops(core, member, "floor", false);
  expect(officeView(core, member).stops).toEqual([{ key: "floor", on: false }]);
  expect(stopsOf(api, member)["floor-vote"]).toBe(false);
}, 120_000);
