import { describe, it, expect } from "vitest";
import { createLifeCore } from "../core2/life";
import { createDirector } from "../director/ledger";
import {
  registerModuleStopV1,
  releaseModuleStopV1,
} from "../core2/player-stops-v1";
import { earliestPlayerStopV1 } from "../core2/player-v1";
import { BenchPlayer, ownPick } from "./player";
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
    const result = player.advance("skip");
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
  it("lets the character answer its own choices while skipping", () => {
    const { player, core } = fixture();
    const first = player.advance("day").packet;
    if (first.kind !== "choice") throw new Error("Expected a choice");
    const pick = ownPick(first)!;
    const result = player.advance("skip");
    expect(result.selfChosen[0]).toMatchObject({
      pauseId: first.pauseId,
      offerId: pick.offerId,
      why: "skipping",
    });
    expect(result.selfChosen.length).toBeGreaterThan(1);
    // Nothing needs the player in a year here: the skip runs to its lookahead.
    expect(result.packet.kind).toBe("complete");
    expect(result.packet.at.date).toBe(result.through.date);
    expect(core.date >= "2021-12-31").toBe(true);
  });
  it("stops a skip at a big moment's own time while the character chooses for itself", () => {
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
    const result = player.advance("skip");
    expect(result.packet.kind).toBe("stop");
    expect(result.packet.at).toEqual(at);
    expect(result.selfChosen.length).toBeGreaterThan(0);
  });
  it("switches residents mid-day: the first finishes its day on its own", () => {
    const { player, core } = fixture();
    const packet = player.advance("day").packet;
    expect(packet.kind).toBe("choice");
    player.select("other");
    expect(player.personId).toBe("other");
    expect(player.selfChosen.at(-1)?.why).toBe("finishing-day-before-switch");
    const next = player.advance("day").packet;
    expect(next.controlledPersonId).toBe("other");
    expect(core.date >= "2021-01-02").toBe(true);
  });
  it("switches before any time has passed", () => {
    const { player } = fixture();
    player.select("other");
    expect(player.advance("day").packet.controlledPersonId).toBe("other");
  });
  it("keeps an issued choice pending when an unavailable offer is submitted", () => {
    const { player, core } = fixture();
    const packet = player.advance("day").packet;
    expect(packet.kind).toBe("choice");
    if (packet.kind !== "choice") throw new Error("Expected issued choice");
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
    expect(() => player.advance("calendar", "2020-01-01")).toThrow(/backward/);
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
