import { randomBytes, createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { localRaces } from "./government";
import { coreAPI } from "../core2/state";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../core2/modules/elections";
import {
  OFFICES_MODULE_ID,
  vacateSeat,
  type TermRow,
  type VacancyRow,
} from "../core2/modules/offices";
import readings from "../core2/gov-rules/municipal-governments.json" with { type: "json" };
import islandAreas from "../core2/data/reference/island-area-governments.json" with { type: "json" };
import territoryPlaces from "../core2/data/places/territory-places.json" with { type: "json" };
import municipalCycles from "../core2/data/elections/municipal-cycles.json" with { type: "json" };
import filing from "../../data/research/elections/filing-requirements.json" with { type: "json" };

// A territory's own local government is a race to run for (Player on #9995:
// "In Guam there's nothing to run for on day one"). The Census listing the
// town offices are read from carries no Island Area, so their governments are
// rows of their own law (island-area-governments.json); a place one of them
// governs opens with that government's offices seated and its next regular
// race on the Elections page, on the calendar its law sets, filed with the
// officer and at the age the territory's filing research reads. The test
// draws one governed place from every row, by the seed it prints.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const opening = "2026-10-12";
type PlaceRow = [string, string, string, string | null, string, number];
const places = (territoryPlaces as { rows: PlaceRow[] }).rows;

describe(`an Island Area place has its own local race (seed ${seed})`, () => {
  it("every row governs a place of the game, and every place of its territory has one", () => {
    const rows = islandAreas.governments;
    const states = new Set(rows.map((row) => row.stateUsps));
    for (const row of rows)
      expect(
        places.some((p) => p[2] === row.stateUsps && p[4] === row.placeGeoid),
        row.id,
      ).toBe(true);
    for (const place of places.filter((p) => states.has(p[2])))
      expect(
        rows.filter((row) => row.placeGeoid === place[4]).length,
        place[0],
      ).toBe(1);
  });

  it("opens with the place's own race on the Elections page, on its law's calendar", () => {
    const rank = (key: string) =>
      createHash("sha256").update(`${seed}:${key}`).digest("hex");
    const row = [...islandAreas.governments].sort((a, b) =>
      rank(a.id).localeCompare(rank(b.id)),
    )[0]!;
    const place = places.find(
      (p) => p[2] === row.stateUsps && p[4] === row.placeGeoid,
    )!;
    const world = buildBenchWorld(seed, opening, {
      twoLevel: true,
      placeKey: place[0],
    });
    const label = `${place[1]}, ${row.stateUsps} (${place[0]}, seed ${seed})`;
    process.stdout.write(`island-area-local-race: ${label}\n`);
    expect(world.place.key, label).toBe(place[0]);
    const api = coreAPI(world.core);
    const contests = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
    const own = contests.filter((contest) =>
      contest.seatId.startsWith(`seat:${row.id}:`),
    );
    expect(own.length, label).toBeGreaterThan(0);

    // The page lists the government's race, the nearest local one.
    const page = localRaces(world.core);
    const race = page.races.find((r) =>
      r.contestIds.some((id) => own.some((contest) => contest.id === id)),
    );
    expect(
      race,
      `${label}: ${JSON.stringify(page.races.map((r) => r.title))}`,
    ).toBeDefined();

    // On the calendar its law sets: a cycle year of the territory's row.
    const cycle = (
      municipalCycles as {
        states: Record<string, { anchorYear: number; periodYears: number }>;
      }
    ).states[`US-${row.stateUsps}`]!;
    const year = Number(race!.electionDate.slice(0, 4));
    expect((year - cycle.anchorYear) % cycle.periodYears, label).toBe(0);
    expect(race!.electionDate > opening, label).toBe(true);

    // Filed with the territory's officer, at the age its research reads.
    const research = (
      filing as unknown as {
        places: Record<
          string,
          { municipalOffice?: { filedWith?: string; minimumAge?: number } }
        >;
      }
    ).places[`US-${row.stateUsps}`]!.municipalOffice!;
    expect(race!.filedWith, label).toBe(research.filedWith);
    // A player born 18 years before the opening is younger than the
    // territory's age on every day its race can be filed for.
    const player = world.core.people.get(world.core.playerId!)!;
    const turns = `${Number(player.birthDate.slice(0, 4)) + research.minimumAge!}${player.birthDate.slice(4)}`;
    if (turns > race!.filingDeadline)
      expect(race!.cannotFile, label).toMatchObject({
        rule: "minimum-age",
        required: String(research.minimumAge),
      });
  }, 600_000);

  it("a Vice Mayor is elected where the law has one, and takes a vacated Mayor's seat", () => {
    // Every government whose reading names a Vice Mayor (5 GCA sec. 40101),
    // one drawn by the seed.
    const withVice = new Set(
      (
        readings.governments as {
          publisherId: string | null;
          reading: { viceMayor?: unknown };
        }[]
      )
        .filter((g) => g.reading.viceMayor)
        .map((g) => g.publisherId),
    );
    const rank = (key: string) =>
      createHash("sha256").update(`${seed}:vice:${key}`).digest("hex");
    const row = islandAreas.governments
      .filter((g) => withVice.has(g.id))
      .sort((a, b) => rank(a.id).localeCompare(rank(b.id)))[0]!;
    const place = places.find(
      (p) => p[2] === row.stateUsps && p[4] === row.placeGeoid,
    )!;
    const world = buildBenchWorld(seed, opening, {
      twoLevel: true,
      placeKey: place[0],
    });
    const label = `${place[1]}, ${row.stateUsps} (${place[0]}, seed ${seed})`;
    process.stdout.write(`island-area-vice-mayor: ${label}\n`);
    const api = coreAPI(world.core);
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    const serving = (seatId: string) =>
      (
        terms.query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[]
      )[0];
    const mayorSeat = `seat:${row.id}:mayor:0`;
    const viceSeat = `seat:${row.id}:vice-mayor:0`;

    // Seated on day one and raced with the Mayor, on the page.
    const vice = serving(viceSeat);
    expect(vice?.personId, label).toBeTruthy();
    const race = localRaces(world.core).races.find((r) =>
      r.contestIds.some((id) => id.startsWith(`contest:${viceSeat}:`)),
    );
    const mayorRace = localRaces(world.core).races.find((r) =>
      r.contestIds.some((id) => id.startsWith(`contest:${mayorSeat}:`)),
    );
    expect(race?.title, label).toBe("Vice Mayor");
    expect(race?.electionDate, label).toBe(mayorRace?.electionDate);

    // The Mayor leaves: the Vice Mayor takes the seat for the rest of the
    // term, and the Vice Mayor's seat stays vacant to its end (sec. 40110(b)).
    const mayor = serving(mayorSeat)!;
    vacateSeat(api, mayorSeat, "resigned");
    const risen = serving(mayorSeat);
    expect(risen?.personId, label).toBe(vice!.personId);
    expect(risen?.reached, label).toContain("succeeded as Vice Mayor");
    expect(risen?.endDate, label).toBe(mayor.endDate);
    expect(serving(viceSeat), label).toBeUndefined();
    const left = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("vacancies")
        .rows() as unknown as VacancyRow[]
    ).find((v) => v.seatId === viceSeat);
    expect(left?.rule.method, label).toBe("remains-vacant");
    expect(left?.status, label).toBe("open");
    // The rise is a seating the other engines read, as any other is.
    const record = world.core.durableLog.get(
      `took-office:${mayorSeat}:${world.core.date}`,
    );
    expect(record?.personIds, label).toContain(vice!.personId);
  }, 600_000);
});
