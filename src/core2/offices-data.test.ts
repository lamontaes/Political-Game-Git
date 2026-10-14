/**
 * Offices from data, all 56 places: every legislative chamber has the seats
 * the research gives it (lettered and multi-member districts included), every
 * multi-member statewide body has its researched members, the District of
 * Columbia has its 13-member Council, and Puerto Rico's municipal offices are
 * elected with its general election in presidential years.
 *
 * Plus one random place opened the way play opens it: the town's legislative
 * seats are those of the district covering it.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import stateOfficeResearch from "../../data/research/offices/state-offices.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { nextElectionForSeat } from "./elections-calendar";
import { localOfficesForPlace } from "./offices-local";
import { stateOffices } from "./offices-state";
import { corePlaceByKey } from "./place-lookup";
import { placeLocalities, placeStateKeys } from "./places";

const START = "2026-10-14";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`offices-data:${Date.now()}`).digest("hex");

interface Research {
  legislature?: { chambers?: { chamber: string; seats?: number }[] };
  executives?: { key: string; seats?: number }[];
}
const research = (
  stateOfficeResearch as unknown as {
    places: Record<string, Research>;
  }
).places;

function open(stateKey: string, localityKey: string) {
  const place = corePlaceByKey(localityKey);
  return stateOffices(stateKey, place?.sourceGeoid ?? localityKey, START);
}
const firstLocality = (stateKey: string) => placeLocalities(stateKey)[0]!;
const states = [...placeStateKeys()].sort();

describe("offices from data, all 56 places", () => {
  it("covers all 56 places", () => {
    expect(states).toHaveLength(56);
  });

  it("every legislative chamber has its researched number of seats", () => {
    const wrong: string[] = [];
    for (const stateKey of states) {
      const offices = open(stateKey, firstLocality(stateKey).key);
      for (const chamber of research[stateKey]?.legislature?.chambers ?? []) {
        const office = offices.find(
          (o) => o.office.kind === `legislature-${chamber.chamber}`,
        );
        const built = office?.seats.length ?? 0;
        if (built !== chamber.seats || office?.office.seats !== built)
          wrong.push(
            `${stateKey} ${chamber.chamber}: ${built} of ${chamber.seats}`,
          );
      }
    }
    expect(wrong).toEqual([]);
  });

  it("every multi-member statewide body has its researched members", () => {
    const wrong: string[] = [];
    let bodies = 0;
    for (const stateKey of states) {
      const offices = open(stateKey, firstLocality(stateKey).key);
      for (const executive of research[stateKey]?.executives ?? []) {
        if (!executive.seats || executive.seats < 2) continue;
        bodies += 1;
        const office = offices.find((o) => o.office.kind === executive.key);
        if (
          office?.office.seats !== executive.seats ||
          office.seats.length !== executive.seats ||
          new Set(office.seats.map((s) => s.id)).size !== executive.seats ||
          office.seats.some((s) => s.electionYear === undefined)
        )
          wrong.push(`${stateKey} ${executive.key}`);
      }
    }
    expect(bodies).toBeGreaterThanOrEqual(11);
    expect(wrong).toEqual([]);
    // Oklahoma's Corporation Commission has three seats, one up every even year.
    const ok = open("US-OK", firstLocality("US-OK").key).find(
      (o) => o.office.kind === "corporation-commission",
    )!;
    expect(ok.seats.map((s) => s.electionYear)).toEqual([2026, 2028, 2030]);
  });

  it("lettered and two-member districts seat every member the town's district elects", () => {
    // Idaho elects two Representatives from each of 35 districts (seats A and B).
    const id = open("US-ID", firstLocality("US-ID").key).find(
      (o) => o.office.kind === "legislature-lower",
    )!;
    expect(id.seats).toHaveLength(70);
    expect(id.seats.filter((s) => s.coversTown)).toHaveLength(2);
    // Maryland's House is 141 members in 47 districts of three, some in subdistricts.
    const md = open("US-MD", firstLocality("US-MD").key).find(
      (o) => o.office.kind === "legislature-lower",
    )!;
    expect(md.seats).toHaveLength(141);
    expect(md.seats.filter((s) => s.coversTown).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(new Set(md.seats.map((s) => s.id)).size).toBe(141);
  });

  it("the District of Columbia has its 13-member Council", () => {
    const offices = open("US-DC", firstLocality("US-DC").key);
    const council = offices.find(
      (o) => o.office.kind === "legislature-unicameral",
    )!;
    expect(council.office.seats).toBe(13);
    expect(council.seats).toHaveLength(13);
    const names = council.seats.map((s) => s.district);
    expect(names.filter((n) => n === "Chairman")).toHaveLength(1);
    expect(names.filter((n) => n === "At-Large")).toHaveLength(4);
    expect(names.filter((n) => /^\d+$/.test(n ?? ""))).toHaveLength(8);
    expect(council.office.termYears).toBe(4);
    expect(council.office.vacancyRule.citation).toContain("1-204.01(d)");
    // The town votes for the Chairman, the four at-large members and its own ward's member.
    expect(council.seats.filter((s) => s.coversTown)).toHaveLength(6);
    // Staggered four-year terms, elected in even years: both cycles are held.
    const years = new Set(council.seats.map((s) => s.electionYear));
    expect([...years].sort()).toEqual([2026, 2028]);
    // The Chairman is a seat of the Council, not a second office.
    expect(offices.some((o) => o.office.kind === "council-chair")).toBe(false);
  });

  it("Puerto Rico's municipal offices are elected in presidential years", () => {
    const place = firstLocality("US-PR");
    const local = localOfficesForPlace(place.key);
    expect(local.length).toBeGreaterThanOrEqual(2);
    for (const office of local) {
      const election = nextElectionForSeat({
        office,
        stateKey: "US-PR",
        placeGeoid: corePlaceByKey(place.key)?.sourceGeoid ?? place.key,
        termEnd: null,
        onDate: START,
      });
      expect(election?.electionDate, office.id).toBe("2028-11-07");
      expect(office.termYears).toBe(4);
    }
  });
});

describe("a random place opens with the seats covering it", () => {
  const drawn = drawPlace(seed, "offices-data");
  it(`${drawn.name} (${drawn.state}, seed ${drawn.seed.slice(0, 12)})`, () => {
    console.log("offices-data place", drawn.key, drawn.name, drawn.seed);
    const offices = open(drawn.state, drawn.key);
    for (const chamber of research[drawn.state]?.legislature?.chambers ?? []) {
      const office = offices.find(
        (o) => o.office.kind === `legislature-${chamber.chamber}`,
      )!;
      expect(office.seats).toHaveLength(chamber.seats!);
      const covering = office.seats.filter((s) => s.coversTown);
      // The town's seats are those of one district plus the whole-place
      // seats (at large or chair); never seats of two districts.
      const districts = new Set(
        covering
          .map((s) => s.district)
          .filter((d) => !/large|chair/i.test(d ?? "")),
      );
      expect(districts.size).toBeLessThanOrEqual(1);
      expect(office.office.coversTown).toBe(covering.length > 0);
    }
  });
});
