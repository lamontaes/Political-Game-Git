import { describe, it, expect } from "vitest";
import { createLifeCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { createDirector } from "../director/ledger";
import {
  registerModuleStopV1,
  releaseModuleStopV1,
} from "../core2/player-stops-v1";
import { earliestPlayerStopV1 } from "../core2/player-v1";
import { BenchPlayer, directorStops } from "./player";
import type { CoreInput } from "../core2/types";
import type { Moment } from "../director/types";

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
      { id: "home", placeId: "place", memberIds: ["person"], source },
    ],
    organizations: [],
    jobs: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  const director = createDirector();
  const bridge = directorStops(director);
  const core = createLifeCore(input, {
    modules: [director.module, bridge, { id: "fixture-offer-owner" }],
  });
  director.start(core);
  const player = new BenchPlayer(core, director);
  player.select("person");
  return { core, director, bridge, player };
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
  it("admits the equality interrupt and ignores historical and below-line moments", () => {
    const { core, director, bridge } = fixture();
    bridge.onDay!(
      coreAPI(core),
      () => {
        throw new Error("No choices in bridge");
      },
      () => undefined,
    );
    const book = director.ledger.people.get("person")!;
    const row = (id: string, impact: number, past = false): Moment => ({
      id,
      impact,
      past,
      personId: "person",
      date: core.date,
      label: "recorded-fixture-moment",
      causeId: "fixture-cause",
      causeKind: "fixture",
      counterpartIds: [],
      channels: [],
      hindsight: impact,
      hindsightAt: core.date,
      echoes: [],
    });
    book.moments.push(
      row("below", 0.49),
      row("equal", 0.5),
      row("past", 1, true),
    );
    bridge.onAfterDay!(coreAPI(core));
    const stop = earliestPlayerStopV1(core, {
      controlledPersonId: "person",
      through: { date: "2021-01-03", minuteOfDay: 0 },
    });
    expect(stop?.modules.map((x) => x.recordId)).toEqual(["equal"]);
    expect(stop?.at).toEqual({ date: "2021-01-02", minuteOfDay: 0 });
    bridge.onAfterDay!(coreAPI(core));
    expect(
      earliestPlayerStopV1(core, {
        controlledPersonId: "person",
        through: { date: "2021-01-03", minuteOfDay: 0 },
      }),
    ).toEqual(stop);
  });
  it("does not invent scores for an absent record", () => {
    const { player, core } = fixture();
    const before = core.sequence;
    const trace = player.trace("not-a-saved-record");
    expect(trace.status).toBe("record-not-found");
    expect(trace.scoresStatus).toBe("none-saved");
    expect(core.sequence).toBe(before);
  });
  it("resumes only the current bounded skip probe after a discretionary choice", () => {
    const { player } = fixture();
    const result = player.advance("skip");
    expect(result.through.date).toBe("2021-01-03");
    expect(result.lookahead?.date).toBe("2022-01-02");
    const packet = result.packet;
    if (packet.kind !== "choice")
      throw new Error("Expected discretionary pause");
    const complete = player.resume({
      kind: "choice",
      pauseId: packet.pauseId,
      offerId: packet.offers[0]!.offerId,
    }).packet;
    expect(complete.kind).toBe("complete");
    expect(complete.simulatedDays).toBe(1);
    expect(complete.at.date).toBe("2021-01-03");
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
