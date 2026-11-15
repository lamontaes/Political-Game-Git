/**
 * An outlet weighs a race and a story against its own audience, not the
 * town's (pool item press-market-stations-seek-village-candidates). A market's
 * television station serves the state's people over its markets, so a
 * village's race is a sliver of its viewers: it seeks no village candidate,
 * and its week is filled from the county's, the state's and the nation's
 * records. A city that is its station's whole audience is covered as before.
 * The town's outlet of record (its own paper, else the local outlet most of
 * the town follows, where its legal notices run) keeps the town's government
 * as its beat, so the town's record is still printed and its races still
 * asked about by one outlet.
 *
 * Pinned places: Fairmont, Nebraska (a village of about 560 in a market of
 * about 286,000), Creve Coeur, Illinois (a town of about 5,000 whose county
 * has two papers and a radio station of its own) and Omaha, Nebraska (a city
 * larger than its market's share).
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import {
  PRESS_MODULE_ID,
  levelAudienceShare,
  newsworthiness,
  outletsHere,
  pressParameter,
  raceAudienceShare,
  townOutlet,
} from "./modules/press";
import { coreAPI } from "./state";

const PLACES = [
  {
    name: "Fairmont, Nebraska",
    key: "3116550",
    seed: "fair01",
    // Every station's share of a town race is a sliver.
    townShare: { television: [0, 0.01] },
    townStoriesAtMost: 0,
    stationsSeekTheSeat: false,
  },
  {
    name: "Creve Coeur, Illinois",
    key: "1717549",
    seed: "creve01",
    // The county's papers and radio station serve a share of the county; the
    // market's stations a sliver of a market of over a million.
    townShare: {
      newspaper: [0.02, 0.5],
      radio: [0.01, 0.25],
      television: [0, 0.01],
    },
    townStoriesAtMost: 0,
    stationsSeekTheSeat: false,
  },
  {
    name: "Omaha, Nebraska",
    key: "3137000",
    seed: "omaha01",
    // The city is the whole of every outlet's audience.
    townShare: { newspaper: [1, 1], radio: [1, 1], television: [1, 1] },
    townStoriesAtMost: Number.POSITIVE_INFINITY,
    stationsSeekTheSeat: true,
  },
] as const;

describe.each(PLACES)("an outlet's audience ($name)", (place) => {
  it("weighs the town's races and stories against each outlet's audience", () => {
    setBookkeeping(false);
    const opening = gameStartDate();
    const world = buildBenchWorld(place.seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const town = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).find((c) => c.level === "city" || c.level === "township");
    // The town's outlet of record keeps the town's government as its beat,
    // whatever it reaches; the rest weigh the town against their audience.
    const record = townOutlet(api)?.id;
    expect(record, `${where}: an outlet of record`).toBeTruthy();
    const all = outletsHere(api).filter((o) => o.tier !== "national");
    const recordOutlet = all.find((o) => o.id === record)!;
    expect(levelAudienceShare(api, recordOutlet, "town"), where).toBe(1);
    const local = all.filter((o) => o.id !== record);
    expect(local.length, where).toBeGreaterThan(0);
    for (const outlet of local) {
      const range = (place.townShare as Record<string, readonly number[]>)[
        outlet.kind
      ];
      if (!range) continue;
      const share = levelAudienceShare(api, outlet, "town");
      expect(
        share,
        `${where}: ${outlet.id}'s town share`,
      ).toBeGreaterThanOrEqual(range[0]!);
      expect(share, `${where}: ${outlet.id}'s town share`).toBeLessThanOrEqual(
        range[1]!,
      );
      // The state's people are all of every town outlet's audience.
      expect(levelAudienceShare(api, outlet, "state"), where).toBe(1);
      if (town)
        expect(
          raceAudienceShare(api, outlet, town.id),
          `${where}: ${town.id} at ${outlet.id}`,
        ).toBeCloseTo(share, 6);
    }
    // The town's sitting council member, running again: a station weighs
    // them against its own viewers. The incumbency and the seat that carry a
    // city member past a station's bar are a sliver of a market's audience.
    const held = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).find(
      (c) =>
        (c.level === "city" || c.level === "township") && c.incumbentTermId,
    );
    const term = held
      ? (api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .get(held.incumbentTermId!) as unknown as TermRow | undefined)
      : undefined;
    expect(term, `${where}: a town seat held at the opening`).toBeTruthy();
    const again = {
      id: `filing:test:${held!.id}`,
      contestId: held!.id,
      personId: term!.personId,
      filedOn: core.date,
      filedWith: "",
      platform: [],
      status: "on-ballot",
    } as FilingRow;
    for (const station of local.filter((o) => o.kind === "television")) {
      const worth = newsworthiness(api, again, station);
      const bar = pressParameter("televisionBar");
      if (place.stationsSeekTheSeat)
        expect(
          worth,
          `${where}: ${station.id} weighs ${held!.id}`,
        ).toBeGreaterThanOrEqual(bar);
      else
        expect(
          worth,
          `${where}: ${station.id} weighs ${held!.id}`,
        ).toBeLessThan(bar);
    }
    // Five weeks of the press's own cycle: each station prints a full week,
    // from the wider records where the town has no room. The wire's levels
    // are read each day, before an old record leaves it.
    const press = api.moduleState(PRESS_MODULE_ID);
    const levelOf = new Map<string, string>();
    let day = makeIsoDate(opening);
    for (let n = 0; n < 35; n += 1) {
      day = addDays(day, 1);
      advanceCore(core, day);
      for (const row of press.table("wire").rows() as unknown as {
        id: string;
        level: string;
      }[])
        levelOf.set(row.id, row.level);
    }
    const stories = press.table("stories").rows() as unknown as {
      outletId: string;
      wireId: string;
      kind: string;
    }[];
    const townStories = new Map<string, number>();
    for (const outlet of local.filter((o) => o.kind === "television")) {
      const theirs = stories.filter((s) => s.outletId === outlet.id);
      // A reporter's week at least, every week: the News tab does not go
      // quiet.
      expect(
        theirs.length,
        `${where}: ${outlet.id} printed stories in five weeks`,
      ).toBeGreaterThanOrEqual(5 * pressParameter("storiesPerReporterWeek"));
      // An exposure is the outlet's own reporter's dig (a tip from someone
      // they know), not a record it weighed on the wire: a scandal is news
      // to a market however small the town.
      const ofTown = theirs.filter(
        (s) => levelOf.get(s.wireId) === "town" && s.kind !== "press.exposed",
      );
      townStories.set(outlet.id, ofTown.length);
      if (place.townStoriesAtMost === 0)
        expect(
          ofTown.map((s) => s.kind),
          `${where}: ${outlet.id}'s town stories`,
        ).toEqual([]);
      else
        expect(
          ofTown.length,
          `${where}: ${outlet.id}'s town stories`,
        ).toBeGreaterThan(0);
    }
    process.stdout.write(
      `${where}: ${local
        .map(
          (o) =>
            `${o.id} town share ${levelAudienceShare(api, o, "town").toFixed(4)}, town stories ${townStories.get(o.id) ?? "-"}`,
        )
        .join("; ")}\n`,
    );
  }, 120_000);
});
