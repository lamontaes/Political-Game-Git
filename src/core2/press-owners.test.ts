/**
 * Edge cases of the press's reads (OPUS-PEOPLE, Oct 14), in a random place: a
 * speech against an outlet reaches its owner as an attack the drives engine
 * may answer with a grudge, and an owner's grudge against a candidate's rival
 * warms the candidate's framing; a tip of a recorded bribe is weighed by the
 * one who knows, the reporter and the owner, and runs only when each decided
 * so. The bribe is a fixture row (no bribe happens in a few days of a small
 * world); everything after it runs through the press's own path.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import {
  attackOutlet,
  deskContext,
  leakToReporter,
  openPress,
  PRESS_MODULE_ID,
  storiesPrinted,
} from "./modules/press";
import { grudge, slantOf } from "./press-desk";
import { viewsModule } from "./modules/views";
import { newsModule } from "./modules/news";
import { speechModule } from "./modules/speech";
import { corruptionModule, CORRUPTION_MODULE_ID } from "./modules/corruption";
import { createDrivesModule, DEFAULT_DRIVES_DATA } from "./modules/drives";
import { peopleData } from "../director/play-modules";
import { DEFAULT_DATA } from "./data";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`press-owners:${Date.now()}`).digest("hex");
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;

function world() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const state = pick(
      [...corePlaceStateIdentities()].map((s) => s.jurisdictionKey).sort(),
      `state:${attempt}`,
    );
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, `place:${attempt}`).key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 300,
      }),
      {
        data: peopleData(DEFAULT_DATA),
        modules: [
          viewsModule,
          newsModule,
          speechModule,
          createDrivesModule(DEFAULT_DRIVES_DATA),
          corruptionModule,
        ],
      },
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    const outlet = openPress(core).find(
      (o) => o.tier !== "national" && o.reporterIds.length && o.ownerId,
    );
    if (outlet) return { core, outlet, where: `seed ${seed}, place ${key}` };
  }
  throw new Error(`No town with a local outlet for seed ${seed}`);
}

describe("the press's owner and tip reads", () => {
  it("an owner's grudge against a rival warms the candidate's framing", () => {
    const { core, outlet, where } = world();
    const api = coreAPI(core);
    const adults = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.placeId === outlet.placeId &&
          !p.id.startsWith("person:press"),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const [candidate, rival, listener] = adults;
    const ctx = {
      ...deskContext(api),
      rivals: (id: string) => (id === candidate!.id ? [rival!.id] : []),
    };
    const item = {
      topic: `person:${candidate!.id}`,
      desiredChange: "profile",
      subjectIds: [candidate!.id],
    };
    const reporter = outlet.reporterIds[0]!;
    const before = slantOf(api, ctx, outlet, reporter, item);
    // The rival attacks the outlet in a speech; its owner hears of it.
    const speechId = attackOutlet(api, {
      speakerId: rival!.id,
      outletId: outlet.id,
      audienceIds: [listener!.id],
    });
    const ownerId = outlet.ownerId!;
    if (grudge(api, ownerId, rival!.id) === 0)
      // The owner's own drives carried on; give them the grudge the attack
      // could have left, from that same event (fixture for this edge case).
      api.updateDrive(ownerId, {
        id: `grudge:grudge:${rival!.id}`,
        kind: "grudge",
        topic: `grudge:${rival!.id}`,
        desiredChange: "press.attacked",
        strength: 1,
        sourceEventId: `press.attacked:${speechId}`,
      });
    const after = slantOf(api, ctx, outlet, reporter, item);
    expect(after.reasons.rivals ?? 0, where).toBeGreaterThan(
      before.reasons.rivals ?? 0,
    );
    expect(after.slant, where).toBeGreaterThan(before.slant);
  });

  it("a tip of a bribe runs only when the knower, reporter and owner each decide so", () => {
    const { core, outlet, where } = world();
    const api = coreAPI(core);
    const town = [...core.people.values()].filter(
      (p) =>
        p.alive &&
        p.placeId === outlet.placeId &&
        !p.id.startsWith("person:press"),
    );
    const [official, offerer] = town.sort((a, b) => a.id.localeCompare(b.id));
    const reporter = outlet.reporterIds[0]!;
    const crimeId = `crime:fixture:${seed}`;
    api.moduleState(CORRUPTION_MODULE_ID).table("crimes").put({
      id: crimeId,
      kind: "bribe",
      date: core.date,
      offererId: offerer!.id,
      officialId: official!.id,
      amountMinor: 50_000,
      subjectId: "fixture",
      offered: true,
      taken: true,
      reasons: {},
    });
    // The offerer tells the reporter (the listener is a reporter, so the tip
    // is already in a reporter's hands).
    api.emit({
      id: `${crimeId}:told:${offerer!.id}:${core.date}`,
      date: core.date,
      kind: "crime.told",
      personIds: [reporter],
      witnessIds: [offerer!.id],
      placeId: outlet.placeId,
      facts: { [`crime:${crimeId}`]: "bribe-taken" },
      source: { tag: "SOURCED", citation: "fixture", asOf: core.date },
    });
    const tip = api.moduleState(PRESS_MODULE_ID).table("tips").get(crimeId) as
      | { dig: number | null; run: number | null; storyId: string | null }
      | undefined;
    expect(tip, where).toBeTruthy();
    const ran = (tip!.dig ?? 0) > 0 && (tip!.run ?? 0) > 0;
    expect(!!tip!.storyId, where).toBe(ran);
    const exposed = storiesPrinted(api, outlet.id).filter(
      (s) => s.kind === "press.exposed",
    );
    expect(exposed.length, where).toBe(ran ? 1 : 0);
  });

  it("a leak is a tip the leaker chose to give: the reporter still decides to dig and the owner to run it, and the reporter knows who gave it", () => {
    const { core, outlet, where } = world();
    const api = coreAPI(core);
    const town = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.placeId === outlet.placeId &&
          !p.id.startsWith("person:press"),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const [official, offerer, leaker] = town;
    const reporter = outlet.reporterIds[0]!;
    const crimeId = `crime:fixture-leak:${seed}`;
    api.moduleState(CORRUPTION_MODULE_ID).table("crimes").put({
      id: crimeId,
      kind: "bribe",
      date: core.date,
      offererId: offerer!.id,
      officialId: official!.id,
      amountMinor: 50_000,
      subjectId: "fixture",
      offered: true,
      taken: true,
      reasons: {},
    });
    // Someone not in the press was told, and told in turn by the offerer.
    api.emit({
      id: `${crimeId}:told:${offerer!.id}:${core.date}`,
      date: core.date,
      kind: "crime.told",
      personIds: [leaker!.id],
      witnessIds: [offerer!.id],
      placeId: outlet.placeId,
      facts: { [`crime:${crimeId}`]: "bribe-taken" },
      source: { tag: "SOURCED", citation: "fixture", asOf: core.date },
    });
    const before = api
      .moduleState(PRESS_MODULE_ID)
      .table("tips")
      .get(crimeId) as { storyId: string | null } | undefined;
    // The fixture crime is new to the press: no story of it is in print yet,
    // so the leak below is what prints it. A story already in print would
    // make the leak assertions vacuous, so that is a failure, not a skip.
    expect(before?.storyId ?? null, where).toBeNull();
    // A person who does not know of it cannot leak it.
    expect(() =>
      leakToReporter(api, {
        leakerId: reporter,
        reporterId: reporter,
        crimeId,
      }),
    ).toThrow();
    const row = leakToReporter(api, {
      leakerId: leaker!.id,
      reporterId: reporter,
      crimeId,
    }) as {
      leaked?: boolean;
      knowerId: string;
      dig: number | null;
      run: number | null;
      storyId: string | null;
      tip: number;
    };
    expect(row.leaked, where).toBe(true);
    expect(row.knowerId, where).toBe(leaker!.id);
    expect(row.tip, where).toBeGreaterThan(0);
    const ran = (row.dig ?? 0) > 0 && (row.run ?? 0) > 0;
    expect(!!row.storyId, where).toBe(ran);
    // The reporter knows who gave it to them.
    expect(api.knows(reporter, `leak:${crimeId}`)?.value, where).toBe(
      leaker!.id,
    );
  });
});
