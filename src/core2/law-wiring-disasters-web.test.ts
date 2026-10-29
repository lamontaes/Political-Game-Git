/**
 * A severe disaster reaches people through the outcome web, in a played world.
 *
 * A place is drawn from all 56 on a seed nobody chose (DISASTERS_WEB_SEED
 * names one). Places whose FEMA records show no disaster in the played window
 * with damage enough to read as severe in their town are passed over, named,
 * and drawing goes on. At the first place with one, the bench world is built
 * twice from the same seed: the treated world replays FEMA's declaration as
 * the game does; the control world is the same world with the disasters
 * engine switched off, so the declaration is never replayed. Both run to
 * 75 days after the incident began.
 *
 * Two links run on the disasters engine's own record (the severity on its
 * news event, read as `disaster.severe` by `severeDisasterReading`):
 *   - disaster-to-home-values: the housing engine values each owned home at
 *     the web's factor on `housing.home-value` (ownedHomes), so a named
 *     household's home is worth the link's size times the severity less than
 *     in the control world;
 *   - disaster-to-out-migration: the moves engine builds each adult's pull to
 *     leave at the web's factor on `population.out-migration`, so a named
 *     person's factor is the link's size times the severity more than in the
 *     control world.
 * disaster-to-public-transfers stays unread: no engine keeps a place's
 * non-disaster transfers by kind (see the link's notes).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import declarations from "./data/disasters/declarations.json" with { type: "json" };
import households from "./data/disasters/households.json" with { type: "json" };
import severityData from "./data/disasters/severity.json" with { type: "json" };
import lookup from "./data/places/place-lookup.json" with { type: "json" };
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import type { IsoDate } from "./kernel/brands";
import { addDays, makeIsoDate } from "./kernel/dates";
import { placePopulation } from "./gov-rules/place-population";
import { advanceCore } from "./life";
import {
  DISASTERS_MODULE_ID,
  normalizedGovernmentName,
  severityOf,
} from "./modules/disasters";
import { ownedHomes } from "./modules/housing";
import { MOVES_MODULE_ID } from "./modules/moves";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.DISASTERS_WEB_SEED || randomBytes(20).toString("hex");
/** The most places drawn before the test names every one it passed over and fails. */
const MAX_DRAWS = 8000;
/** Days after the incident begins that both worlds run: past the web's next monthly record and the moves engine's next review. */
const RUN_DAYS = 75;
/** The latest an incident may begin and leave RUN_DAYS inside the first year. */
const LATEST_BEGIN_DAYS = 290;
/** A disaster that reads this severe moves records by a share the test can tell from rounding. */
const MIN_SEVERITY = 0.5;

type DeclarationRow = [string, string, number, number, number];
type TownFigures = [aid: number, damage: number, damagedHomes: number];

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const HOME_VALUES = link("disaster-to-home-values");
const OUT_MIGRATION = link("disaster-to-out-migration");

interface Candidate {
  readonly number: number;
  readonly begins: string;
  readonly severity: number;
}

/**
 * From FEMA's records alone, the earliest disaster in the played window that
 * would read severe in the drawn place's town (any county of its state: the
 * opened world's own county decides).
 */
function screen(drawn: ReturnType<typeof drawPlace>): Candidate | undefined {
  const usps = drawn.state.replace(/^US-/, "");
  const start = gameStartDate();
  const latest = addDays(start, LATEST_BEGIN_DAYS);
  const town = normalizedGovernmentName(drawn.name.split(",")[0] ?? "");
  const residents = placePopulation(drawn.key.replace(/^.*:/, ""), drawn.seed);
  if (!residents) return undefined;
  const byCounty = declarations.byCounty as unknown as Record<
    string,
    DeclarationRow[]
  >;
  const figures = households.byCountyDisaster as unknown as Record<
    string,
    Record<string, TownFigures>
  >;
  let best: Candidate | undefined;
  for (const [county, , state] of lookup.counties.rows as [
    string,
    string,
    string,
  ][]) {
    if (state !== usps) continue;
    for (const row of [
      ...(byCounty[county] ?? []),
      ...(byCounty[`${county.slice(0, 2)}000`] ?? []),
    ]) {
      if (row[0] <= start || row[0] > latest) continue;
      const homes = figures[`${county}|${row[4]}`]?.[town]?.[2] ?? 0;
      const severity = severityOf(homes / residents);
      if (severity >= MIN_SEVERITY && (!best || row[0] < best.begins))
        best = { number: row[4], begins: row[0], severity };
    }
  }
  return best;
}

/** What a world kept, as plain data, so the first world can be let go before the second is built. */
interface Kept {
  readonly town: string;
  readonly date: string;
  readonly event?: { id: string; severity: number; date: string };
  readonly web?: WebMonth;
  /** Every month row the web kept for the town, by id (a pull cites the month it last read). */
  readonly months: Map<string, WebMonth>;
  /** Owner households' homes in the town that were valued at the opening: the value today. */
  readonly homes: Map<string, number>;
  readonly pulls: Map<string, { webFactor?: number; webRecord?: string }>;
}

function keep(core: CoreState): Kept {
  const api = coreAPI(core);
  const town = core.people.get(core.playerId ?? "")!.placeId;
  const events = [...(core.logByKind.get("hazard.disaster") ?? [])]
    .map((id) => core.durableLog.get(id)!)
    .filter((row) => row.placeId === town && row.facts?.severity !== undefined)
    .sort((a, b) => Number(b.facts!.severity) - Number(a.facts!.severity));
  const rows = [
    ...(api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .query("byPlace", [town]) as unknown as readonly WebMonth[]),
  ].sort((a, b) => b.month.localeCompare(a.month));
  const web = rows[0];
  const opening = new Set(
    (
      api.moduleState("housing").table("dwellings").rows() as unknown as {
        householdId: string;
        tenure: string;
        basis: string;
      }[]
    )
      .filter((row) => row.tenure === "own" && row.basis === "opening")
      .map((row) => row.householdId),
  );
  return {
    town,
    date: core.date,
    ...(events[0]
      ? {
          event: {
            id: events[0].id,
            severity: Number(events[0].facts!.severity),
            date: events[0].date,
          },
        }
      : {}),
    ...(web ? { web } : {}),
    months: new Map(rows.map((row) => [row.id, row])),
    homes: new Map(
      ownedHomes(api, town)
        .filter((row) => opening.has(row.householdId))
        .map((row) => [row.householdId, row.valueMinor]),
    ),
    pulls: new Map(
      (
        api.moduleState(MOVES_MODULE_ID).table("pulls").rows() as unknown as {
          id: string;
          webFactor?: number;
          webRecord?: string;
        }[]
      ).map((row) => [
        row.id,
        {
          ...(row.webFactor !== undefined ? { webFactor: row.webFactor } : {}),
          ...(row.webRecord !== undefined ? { webRecord: row.webRecord } : {}),
        },
      ]),
    ),
  };
}

function run(
  drawn: ReturnType<typeof drawPlace>,
  until: IsoDate,
  withoutDisasters: boolean,
): Kept {
  const core = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  }).core as CoreState;
  if (withoutDisasters) core.modules.delete(DISASTERS_MODULE_ID);
  advanceCore(core, until);
  return keep(core);
}

describe("a declaration is not a severe disaster", () => {
  it("reads zero below the low cutoff, one above the high, and slides between", () => {
    const { lowCutoff, highCutoff } = severityData;
    expect(lowCutoff.value).toBeLessThan(highCutoff.value);
    expect(severityOf(0)).toBe(0);
    expect(severityOf(lowCutoff.value)).toBe(0);
    expect(severityOf(highCutoff.value)).toBe(1);
    expect(severityOf(highCutoff.value * 10)).toBe(1);
    const middle = (lowCutoff.value + highCutoff.value) / 2;
    expect(severityOf(middle)).toBeCloseTo(0.5, 12);
    // Nothing flips: a little more damage is a little more severe.
    expect(severityOf(middle + 1e-6)).toBeGreaterThan(severityOf(middle));
  });

  it("keeps each cutoff tagged with its source and the way it was ranked", () => {
    for (const cutoff of [severityData.lowCutoff, severityData.highCutoff]) {
      expect(cutoff.tag).toBe("ESTIMATED");
      expect(cutoff.citation).toContain("Roth Tran and Wilson 2023");
      expect(cutoff.estimatedFrom).toContain("SHELDUS");
    }
    expect(severityData.effectYears.tag).toBe("SOURCED");
    expect(severityData.effectYears.citation).toContain("25 or more deaths");
  });
});

describe("a severe disaster reaches home values and moving through the outcome web", () => {
  it(
    `the severity on the disaster's news event moves a home's value and a person's pull to leave (seed ${seed})`,
    { timeout: 3_600_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < MAX_DRAWS; attempt += 1) {
          const drawn = drawPlace(seed, `law-wiring-disasters-web:${attempt}`);
          const label = `${drawn.name} (draw ${attempt})`;
          const found = screen(drawn);
          if (!found) {
            passed.push(`${label}: no severe disaster in its FEMA records`);
            continue;
          }
          const until = addDays(makeIsoDate(found.begins), RUN_DAYS);
          const treated = run(drawn, until, false);
          if (!treated.event || treated.event.severity < MIN_SEVERITY) {
            passed.push(
              `${label}: opened with no severe disaster (the player's county differs from the screen's)`,
            );
            continue;
          }
          const control = run(drawn, until, true);
          console.log(
            `disasters-web: passed over ${passed.length} drawn places with no severe disaster in the played window, e.g. ${passed
              .slice(0, 6)
              .map((row) => row.split(":")[0])
              .join("; ")}`,
          );

          // The record both links start from.
          const severity = treated.event.severity;
          const web = treated.web!;
          expect(control.event, "the control world has no disaster").toBe(
            undefined,
          );
          expect(web.values["disaster.severe"]).toBeCloseTo(severity, 12);
          expect(web.engineSources["disaster.severe"]).toBe(treated.event.id);
          expect(control.web!.values["disaster.severe"]).toBe(0);
          expect(web.effects[OUT_MIGRATION.key]).toBeCloseTo(
            OUT_MIGRATION.size! * severity,
            12,
          );
          expect(web.effects[HOME_VALUES.key]).toBeCloseTo(
            HOME_VALUES.size! * severity,
            12,
          );
          expect(control.web!.effects[OUT_MIGRATION.key] ?? 0).toBe(0);
          expect(control.web!.effects[HOME_VALUES.key] ?? 0).toBe(0);

          // The housing engine: every owner household's home is worth the link's share less.
          const expectedValue = 1 + HOME_VALUES.size! * severity;
          const ratios = [...treated.homes]
            .filter(([id]) => control.homes.has(id))
            .map(
              ([id, value]) =>
                [id, value, control.homes.get(id)!] as [string, number, number],
            )
            .filter(([, , base]) => base > 0);
          expect(ratios.length, "owner households in the town").toBeGreaterThan(
            0,
          );
          for (const [id, value, base] of ratios)
            expect(
              Math.abs(value / base - expectedValue),
              `${id}: ${value} against ${base}`,
            ).toBeLessThan(2e-4);
          const [household, homeTreated, homeControl] = ratios[0]!;

          // The moves engine: the pull to leave builds at the web's factor,
          // for each person whose latest review read a month carrying the
          // disaster (an officeholder's pull, or one last built before the
          // disaster or in another place, still cites an earlier month).
          const expectedLeaving = 1 + OUT_MIGRATION.size! * severity;
          const reviewedSince = (row: { webRecord?: string }) =>
            (treated.months.get(row.webRecord ?? "")?.effects[
              OUT_MIGRATION.key
            ] ?? 0) !== 0;
          const before = [...treated.pulls].filter(
            ([, row]) => row.webFactor !== undefined && !reviewedSince(row),
          );
          if (before.length)
            console.log(
              `disasters-web: ${before.length} pulls last built on a month without the disaster, e.g. ${before
                .slice(0, 3)
                .map(([id, row]) => `${id} on ${row.webRecord}`)
                .join("; ")}`,
            );
          const people = [...treated.pulls]
            .filter(
              ([id, row]) =>
                row.webFactor !== undefined &&
                reviewedSince(row) &&
                control.pulls.get(id)?.webFactor !== undefined,
            )
            .map(
              ([id, row]) =>
                [
                  id,
                  row.webFactor!,
                  control.pulls.get(id)!.webFactor!,
                  row.webRecord,
                ] as const,
            );
          expect(people.length, "people with a pull to leave").toBeGreaterThan(
            0,
          );
          for (const [id, a, b] of people)
            expect(
              Math.abs(a / b - expectedLeaving),
              `${id}: ${a} against ${b}`,
            ).toBeLessThan(2e-3);
          const [person, leaving, leavingControl, record] = people[0]!;
          // The month row the pull cites (the latest the moves review read)
          // carries the link's effect, so the factor traces to the record.
          const cited = treated.months.get(record!);
          expect(cited, `${person} cites ${record}`).toBeDefined();
          expect(cited!.effects[OUT_MIGRATION.key]).toBeCloseTo(
            OUT_MIGRATION.size! * severity,
            12,
          );
          expect(cited!.engineSources["disaster.severe"]).toBe(
            treated.event.id,
          );

          console.log(
            `disasters-web proof: ${drawn.name}, ${drawn.state}, seed ${seed}, draw ${attempt}: disaster ${found.number} began ${treated.event.date}, severity ${severity.toFixed(3)} on ${treated.event.id}; web ${web.id} at ${treated.date}: disaster.severe ${web.values["disaster.severe"]}, ${HOME_VALUES.key} ${web.effects[HOME_VALUES.key]!.toFixed(4)}, ${OUT_MIGRATION.key} ${web.effects[OUT_MIGRATION.key]!.toFixed(4)}; household ${household} home ${homeTreated} against ${homeControl} cents in the control world (x${(homeTreated / homeControl).toFixed(4)}, expected ${expectedValue.toFixed(4)}) across ${ratios.length} owner households; ${person} pull factor ${leaving.toFixed(4)} against ${leavingControl.toFixed(4)} (x${(leaving / leavingControl).toFixed(4)}, expected ${expectedLeaving.toFixed(4)}) on ${record} across ${people.length} people`,
          );
          return;
        }
        throw new Error(
          `no severe disaster in ${MAX_DRAWS} drawn places (seed ${seed}); passed over: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
