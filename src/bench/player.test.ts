import { describe, it, expect } from "vitest";
import { createLifeCore } from "../core2/life";
import { createDirector } from "../director/ledger";
import {
  registerModuleStopV1,
  releaseModuleStopV1,
} from "../core2/player-stops-v1";
import { advancePlayerV1 } from "../core2/player-v1";
import { BenchPlayer } from "./player";
import type { CoreInput } from "../core2/types";

// Controlled edge fixtures only; screen-receipt.json proves ordinary generated worlds.
const source = {
  tag: "SOURCED" as const,
  asOf: "2020-01-01",
  citation: "Explicit bench adapter edge fixture",
};
function fixture() {
  const input: CoreInput = {
    seed: "bench-adapter-edge-fixture",
    startedAt: "2021-01-01",
    people: [
      {
        id: "other",
        givenName: "Second",
        familyName: "Resident",
        birthDate: "1982-01-01",
        placeId: "place",
        householdId: "home",
        tier: "weekly",
        traits: {},
        liquidMinor: 0,
        livingCostDailyMinor: 0,
        source,
        familyIds: [],
        knownIds: [],
      },
      {
        id: "person",
        givenName: "Fixture",
        familyName: "Resident",
        birthDate: "1980-01-01",
        placeId: "place",
        householdId: "home",
        tier: "weekly",
        traits: {},
        liquidMinor: 0,
        livingCostDailyMinor: 0,
        source,
        familyIds: [],
        knownIds: [],
      },
    ],
    households: [
      { id: "home", placeId: "place", memberIds: ["person", "other"], source },
    ],
    organizations: [],
    jobs: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  const director = createDirector();
  const core = createLifeCore(input, {
    modules: [director.module, { id: "fixture-offer-owner" }],
  });
  director.start(core);
  const player = new BenchPlayer(core, director);
  player.select("person");
  return { core, director, player };
}
/** A calendar jump a year past the fixture's start. */
const A_YEAR_ON = "2022-01-02";
describe("bench public player adapter", () => {
  it("stops at a tied exact held deadline and refuses to waive it", () => {
    const { core, player } = fixture();
    const at = { date: "2021-01-02", minuteOfDay: 0 };
    const token = registerModuleStopV1(core, {
      moduleId: "fixture-offer-owner",
      recordId: "recorded-offer",
      controlledPersonId: "person",
      at,
      kind: "offer-deadline",
      reasonKey: "recorded-offer-expiration",
      source,
      hold: true,
    });
    const result = player.advance("calendar", A_YEAR_ON);
    expect(result.packet.kind).toBe("stop");
    expect(result.packet.at).toEqual(at);
    expect(result.earliest?.at).toEqual(at);
    if (result.packet.kind !== "stop")
      throw new Error("Expected deadline stop");
    expect(
      player.resume({ kind: "stop", pauseId: result.packet.pauseId }).packet,
    ).toBe(result.packet);
    releaseModuleStopV1(core, token);
    expect(
      player.resume({ kind: "stop", pauseId: result.packet.pauseId }).packet,
    ).not.toBe(result.packet);
  });
  it("does not invent scores for an absent record", () => {
    const { player, core } = fixture();
    const before = core.sequence;
    const trace = player.trace("not-a-saved-record");
    expect(trace.status).toBe("record-not-found");
    expect(trace.scoresStatus).toBe("none-saved");
    expect(core.sequence).toBe(before);
  });
  it("lets the character answer its own choices when the day advances", () => {
    const { player, core } = fixture();
    const day = player.advance("day");
    // Day never opens a choice list (owner, Oct 14, 2026).
    expect(day.packet.kind).toBe("complete");
    expect(day.selfChosen.length).toBeGreaterThan(0);
    expect(day.selfChosen[0]).toMatchObject({ why: "advancing" });
    const result = player.advance("calendar", A_YEAR_ON);
    expect(result.selfChosen.length).toBeGreaterThan(1);
    // Nothing needs the player in a year here: the jump runs to its day.
    expect(result.packet.kind).toBe("complete");
    expect(result.packet.at.date).toBe(result.through.date);
    expect(core.date >= "2021-12-31").toBe(true);
  });
  it("stops a calendar jump at a big moment's own time while the character chooses for itself", () => {
    const { player, core } = fixture();
    const at = { date: "2021-03-01", minuteOfDay: 600 };
    registerModuleStopV1(core, {
      moduleId: "fixture-offer-owner",
      recordId: "recorded-moment",
      controlledPersonId: "person",
      at,
      kind: "interrupt",
      reasonKey: "recorded-fixture-moment",
      source,
      hold: false,
    });
    const result = player.advance("calendar", A_YEAR_ON);
    expect(result.packet.kind).toBe("stop");
    expect(result.packet.at).toEqual(at);
    expect(result.selfChosen.length).toBeGreaterThan(0);
  });
  it("Week advances seven days and a director stop ends it on its own day", () => {
    const { player, core } = fixture();
    const week = player.advance("week");
    expect(week.packet.kind).toBe("complete");
    expect(week.packet.at.date).toBe("2021-01-09");
    const at = { date: "2021-01-12", minuteOfDay: 600 };
    registerModuleStopV1(core, {
      moduleId: "fixture-offer-owner",
      recordId: "recorded-week-moment",
      controlledPersonId: "person",
      at,
      kind: "interrupt",
      reasonKey: "recorded-fixture-moment",
      source,
      hold: false,
    });
    const next = player.advance("week");
    expect(next.packet.kind).toBe("stop");
    expect(next.packet.at).toEqual(at);
  });
  it("a calendar jump cannot go backward", () => {
    const { player } = fixture();
    expect(() => player.advance("calendar", "2021-01-01")).toThrow(
      "can't go backward",
    );
  });
  it("switches residents mid-day: the first finishes its day on its own", () => {
    const { player, core } = fixture();
    player.advance("day");
    player.select("other");
    expect(player.personId).toBe("other");
    const next = player.advance("day").packet;
    expect(next.controlledPersonId).toBe("other");
    expect(core.date >= "2021-01-02").toBe(true);
  });
  it("hands the clock to a connected person when the controlled character dies", () => {
    const { player, core } = fixture();
    player.advance("day");
    // The character dies at the end of the day the clock is on.
    (core.people.get("person") as { alive: boolean }).alive = false;
    player.select("other");
    expect(player.personId).toBe("other");
    const next = player.advance("day").packet;
    expect(next.controlledPersonId).toBe("other");
    expect(core.people.get("other")!.alive).toBe(true);
  });
  it("switches before any time has passed", () => {
    const { player } = fixture();
    player.select("other");
    expect(player.advance("day").packet.controlledPersonId).toBe("other");
  });
  it("keeps an issued choice pending when an unavailable offer is submitted", () => {
    const { player, core } = fixture();
    const packet = advancePlayerV1(core, {
      controlledPersonId: "person",
      through: { date: "2021-01-03", minuteOfDay: 0 },
    });
    expect(packet.kind).toBe("choice");
    if (packet.kind !== "choice") throw new Error("Expected issued choice");
    player.packet = packet;
    const before = core.sequence;
    expect(() =>
      player.resume({
        kind: "choice",
        pauseId: packet.pauseId,
        offerId: "unissued",
      }),
    ).toThrow(/unavailable/);
    expect(core.sequence).toBe(before);
    expect(player.packet).toBe(packet);
  });
  it("rejects backward calendar movement and foreign answers before mutation", () => {
    const { player, core } = fixture();
    expect(() => player.advance("calendar", "2020-01-01")).toThrow(
      /after today/,
    );
    const before = core.sequence;
    expect(() =>
      player.resume({
        kind: "choice",
        pauseId: "unissued",
        offerId: "unissued",
      }),
    ).toThrow();
    expect(core.sequence).toBe(before);
  });
});
