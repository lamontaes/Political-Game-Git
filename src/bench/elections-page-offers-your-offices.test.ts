// @vitest-environment node
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { seatIsAnotherDistrict } from "../core2/modules/elections";
import controls from "./data/controls.json" with { type: "json" };
import { fileForOffice, localRaces } from "./government";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "./world";

// A new player's Elections page offers the offices they can run for, by name
// and with the day they can file, shows a body elected by district only its
// seat in their own district, and a refused filing says its real reason (owner,
// Nov 16, 0.111.1: "it has a bunch of commissioner things ... it should only be
// one that you can run for"). Named places on fixed draws (skill pinned-tests):
// McMinnville, Tennessee (a seven-district county commission, a city council
// and mayor) and Bonanza, Oregon (an at-large council of three seats).
const PLACES = [
  { at: "e:5", name: "McMinnville" },
  { at: "e:3", name: "Bonanza" },
];
const OF_AGE = "2000-03-01";

function opening(at: string, name: string, born?: string) {
  setBookkeeping(false);
  const place = drawPlace(at, "elec-probe");
  expect(place.name).toContain(name);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
    warmUpDays: OPENING_WARMUP_DAYS,
    ...(born ? { playerBirthDate: born } : {}),
  });
  return { core, where: `${place.name} (${place.key}), seed ${place.seed}` };
}

describe.each(PLACES)("the Elections page at $name", ({ at, name }) => {
  it("shows one seat of a district body, and the player's own offices with their filing dates", () => {
    const { core, where } = opening(at, name);
    const api = coreAPI(core);
    const { races } = localRaces(core) as unknown as {
      races: {
        title: string;
        contestId: string;
        bar: string | null;
        seats: number;
        cannotFile: { metOn?: string } | null;
        filingOpens: string | null;
        officeLevel: string;
      }[];
    };
    // No seat of another district is listed.
    for (const race of races)
      expect(seatIsAnotherDistrict(api, race.contestId), where).toBe(false);
    const commissioners = races.filter((r) =>
      /^(County )?Commissioner/.test(r.title),
    );
    expect(
      commissioners.length,
      `${where}: commissioner seats`,
    ).toBeLessThanOrEqual(1);
    // The player's own offices lead, each with when filing opens, and a
    // 17-year-old is told the day they turn 18.
    const mine = races.filter((r) => r.bar !== "not-your-office");
    expect(
      mine.map((r) => r.title),
      where,
    ).toEqual(expect.arrayContaining(["Council member", "Mayor"]));
    for (const race of mine) {
      expect(race.filingOpens, `${where}: ${race.title} opens`).toBeTruthy();
      expect(
        race.cannotFile?.metOn,
        `${where}: ${race.title} turns 18`,
      ).toBeTruthy();
    }
    // A county office is a county's, never taken for the council.
    for (const race of races.filter((r) => r.bar === "not-your-office"))
      expect(race.officeLevel, where).toBe("county");
    if (name === "Bonanza")
      expect(mine.find((r) => r.title === "Council member")!.seats, where).toBe(
        3,
      );
  }, 900_000);

  it("offers no refusal for age to a player who is old enough, and a refused filing gives its real reason", () => {
    const { core, where } = opening(at, name, OF_AGE);
    const { races } = localRaces(core) as unknown as {
      races: { contestId: string; bar: string | null; cannotFile: unknown }[];
    };
    for (const race of races.filter((r) => r.bar !== "not-your-office"))
      expect(race.cannotFile, where).toBeNull();
    const own = races.find((r) => r.bar === "window-not-open")!;
    expect(
      () => fileForOffice(core, core.playerId!, own.contestId),
      where,
    ).toThrow(controls.localRaces.refusal["window-not-open"]);
    const row = races.find((r) => r.bar === "not-your-office")!;
    expect(
      () => fileForOffice(core, core.playerId!, row.contestId),
      where,
    ).toThrow(controls.localRaces.refusal["not-your-office"]);
  }, 900_000);
});
