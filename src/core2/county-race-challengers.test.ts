/**
 * The rest of the county runs for its seats (elections-county-race-sees-only-
 * the-town, step B): in a played world, a county contest draws a candidate
 * who lives elsewhere in the county, filled in as a full person at the
 * county's place, whose decision to run cites the county and the town's
 * counted record that stands for them, and who files. A place drawn from all
 * 56; one with no county on record or no such candidate in the window is
 * passed over by name. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countyPlaceIdOf } from "./electorate-places";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { decisionOf } from "./modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;

it(`a county race draws a candidate from elsewhere in the county, by their own counted reasons (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "county-race-challengers");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const elections = api.moduleState(ELECTIONS_MODULE_ID);
    const { stateKey } = elections.table("town").get("town") as unknown as {
      stateKey: string;
    };
    const county = countyPlaceIdOf(
      core.placeMetadata.countyNames as string | undefined,
      stateKey.slice(3),
    );
    if (!county) {
      tried.push(`${where}: no county on record`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    const contests = elections
      .table("contests")
      .rows() as unknown as ContestRow[];
    let found: { contest: ContestRow; filing: FilingRow } | undefined;
    for (const contest of contests) {
      if (contest.family !== "countyOffice") continue;
      const filing = (
        elections
          .table("filings")
          .query("byContest", [contest.id]) as unknown as FilingRow[]
      ).find(
        (f) =>
          f.status !== "withdrawn" &&
          core.people.get(f.personId as PersonId)?.placeId === county,
      );
      if (filing) {
        found = { contest, filing };
        break;
      }
    }
    if (!found) {
      tried.push(`${where}: no county contest drew someone from ${county}`);
      continue;
    }
    const { contest, filing } = found;
    const person = core.people.get(filing.personId as PersonId)!;
    // A full person living in the county, outside the town.
    expect(person.placeId, where).toBe(county);
    expect(person.givenName.length, where).toBeGreaterThan(0);
    // Their own decision to run, citing the county and the counted record
    // that stands for them, with the counted reasons it weighed.
    const decision = decisionOf(api, contest.id, person.id);
    expect(decision?.run, `${where}: ${filing.id}`).toBe(true);
    expect(decision!.sourceIds, where).toContain(county);
    expect(
      decision!.sourceIds.some(
        (id) => id !== county && id.startsWith("person"),
      ),
      `${where}: no counted record cited`,
    ).toBe(true);
    expect(Object.keys(decision!.reasons).length, where).toBeGreaterThan(1);
    process.stdout.write(
      `COUNTY CHALLENGER ${where}: ${person.givenName} ${person.familyName} (${person.id}, ${county}) filed ${filing.id} for ${contest.id}; decision ${decision!.id} cites ${decision!.sourceIds.join(", ")}${tried.length ? `; passed over: ${tried.join("; ")}` : ""}\n`,
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 3_600_000);
