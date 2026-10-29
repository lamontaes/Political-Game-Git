import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  standing,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { localRaces } from "./government";
import { buildBenchWorld } from "./world";

// Politics → Campaigns lists the town's next local ballot: after the first
// local election's filing deadline in a drawn place, every city, township
// and county seat on it with each candidate who filed, by filing record id.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ELECTIONS = "core2-elections-v1";
const LOCAL = new Set(["city", "township", "county"]);

it("after the filing deadline, every local seat on the next ballot lists its filers by record id", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "local-races");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const opening = localRaces(core);
    if (!opening.date) {
      tried.push(`${where}: no local election on the calendar`);
      continue;
    }
    const deadline = opening.races.reduce(
      (last, race) => (race.filingDeadline > last ? race.filingDeadline : last),
      "",
    );
    const day = addDays(makeIsoDate(deadline), 1);
    if (day >= opening.date) {
      tried.push(`${where}: filing closes on election day ${opening.date}`);
      continue;
    }
    if (day > core.date) advanceCore(core, day);
    const shown = localRaces(core);
    expect(shown.date, where).toBe(opening.date);
    const elections = coreAPI(core).moduleState(ELECTIONS);
    const contests = (
      elections.table("contests").rows() as unknown as ContestRow[]
    ).filter(
      (contest) =>
        LOCAL.has(contest.level) && contest.electionDate === opening.date,
    );
    expect(
      shown.races.map((race) => race.contestId).sort(),
      `${where}: every local seat on the ${opening.date} ballot`,
    ).toEqual(contests.map((contest) => contest.id).sort());
    let filers = 0;
    let unopposed = 0;
    for (const race of shown.races) {
      expect(race.filingClosed, `${where}: ${race.contestId}`).toBe(true);
      const filed = (
        elections
          .table("filings")
          .query("byContest", [race.contestId]) as unknown as FilingRow[]
      ).filter(standing);
      expect(
        race.filers.map((f) => f.filingId).sort(),
        `${where}: ${race.contestId}`,
      ).toEqual(filed.map((row) => row.id).sort());
      for (const f of race.filers)
        expect(f.name, `${where}: ${f.filingId} named`).toMatch(/\S+ \S+/);
      filers += race.filers.length;
      if (race.filers.length === 1) unopposed += 1;
    }
    console.log(
      `${where}: ${shown.races.length} local seats on ${shown.date}, ${filers} filers, ${unopposed} unopposed; e.g. ${shown.races
        .slice(0, 3)
        .map(
          (race) =>
            `${race.title}: ${race.filers.map((f) => `${f.name} (${f.filingId})`).join(", ") || "no one"}`,
        )
        .join("; ")}`,
    );
    return;
  }
  throw new Error(`no drawn place had a local ballot: ${tried.join("; ")}`);
}, 1_800_000);
