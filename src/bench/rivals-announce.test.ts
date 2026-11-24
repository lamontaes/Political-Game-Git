import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { localRaces } from "./government";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { contestStanding } from "../core2/campaign-day";
import {
  CANDIDACY_MODULE_ID,
  type CandidacyDecision,
  filingWindowOpens,
  weighingDate,
} from "../core2/modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";

// Other people announce early too (owner, Nov 17: "Of course, other people
// should be able to do it early"; CTO line on #9995): a runner who has decided
// to run says so before filing opens, from their own record, shows on the race
// page under Who's running marked as announced, counts on the campaign board,
// and files when the window opens with the day they announced kept. The test
// draws places and plays each forward until a rival announces in a race the
// race page lists; every place passed over is named. A place whose listed
// races are weighed only after the days the test can play is passed over at
// the opening, by the race's own weighing day, not played to no purpose: the
// state and federal races rivals announce for early are not on the race page.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const opening = "2026-10-12";
const DRAWS = 8;
const DAYS = 150;
const addDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
const last = (() => {
  let date = opening;
  for (let day = 0; day < DAYS; day++) date = addDay(date);
  return date;
})();

interface Found {
  readonly world: ReturnType<typeof buildBenchWorld>;
  readonly label: string;
  readonly filing: FilingRow;
  readonly contest: ContestRow;
}

function findAnnouncedRival(passed: string[]): Found {
  for (let draw = 0; draw < DRAWS; draw++) {
    const drawSeed = draw === 0 ? seed : `${seed}:${draw}`;
    const world = buildBenchWorld(drawSeed, opening, { twoLevel: true });
    const api = coreAPI(world.core);
    const label = `${world.place.context.jurisdiction.name ?? world.place.key} (seed ${drawSeed})`;
    const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
    const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
    // A listed race is announced for between its weighing day and the day
    // its filing opens; one whose weighing comes after the last day played
    // cannot be the case.
    const windows = localRaces(world.core)
      .races.flatMap((race) => race.contestIds)
      .map((id) => contests.get(id) as unknown as ContestRow | undefined)
      .filter((contest): contest is ContestRow => Boolean(contest))
      .map((contest) => ({
        weighed: weighingDate(api, contest),
        opens: filingWindowOpens(api, contest),
      }))
      .filter((w) => w.weighed < w.opens && w.opens > opening);
    const reachable = windows.filter((w) => w.weighed <= last);
    if (!reachable.length) {
      passed.push(
        `${label}: ${
          windows.length
            ? `its listed races are weighed from ${windows.map((w) => w.weighed).sort()[0]}, after ${last}`
            : "no listed race is announced for before its filing opens"
        }`,
      );
      continue;
    }
    const until = reachable.map((w) => w.opens).sort()[reachable.length - 1]!;
    let date = opening;
    let announcedAnywhere = 0;
    for (let day = 0; day < DAYS && date < until; day++) {
      date = addDay(date);
      advanceCore(world.core, date);
      const announced = (filings.rows() as unknown as FilingRow[]).filter(
        (row) =>
          row.status === "announced" && row.personId !== world.core.playerId,
      );
      announcedAnywhere = Math.max(announcedAnywhere, announced.length);
      if (!announced.length) continue;
      const listed = new Set(
        localRaces(world.core).races.flatMap((race) => race.contestIds),
      );
      const filing = announced.find((row) => listed.has(row.contestId));
      if (filing)
        return {
          world,
          label,
          filing,
          contest: contests.get(filing.contestId) as unknown as ContestRow,
        };
    }
    passed.push(
      `${label}: to ${date}, ${announcedAnywhere ? `${announcedAnywhere} announced, none in a race the race page lists` : "no rival announced"}`,
    );
  }
  throw new Error(
    `No rival announced in a listed race at ${DRAWS} drawn places: ${passed.join("; ")}`,
  );
}

describe(`rivals announce before filing opens (seed ${seed})`, () => {
  it("announces from the runner's own record, shows on the race page and the board, then files keeping the day", () => {
    const passed: string[] = [];
    const { world, label, filing, contest } = findAnnouncedRival(passed);
    process.stdout.write(
      `rivals-announce: ${label}, ${filing.personId} announced for ${contest.title} on ${filing.announcedOn}; passed over: ${passed.join("; ") || "none"}\n`,
    );
    const api = coreAPI(world.core);
    const decision = (
      api
        .moduleState(CANDIDACY_MODULE_ID)
        .table("decisions")
        .rows() as unknown as CandidacyDecision[]
    ).find(
      (row) => row.contestId === contest.id && row.personId === filing.personId,
    );
    // Their own decision to run holds why they said so when they did.
    expect(decision?.run, label).toBe(true);
    expect(decision?.announced?.filingId, label).toBe(filing.id);
    expect(decision?.announced?.date, label).toBe(filing.announcedOn);
    expect(Object.keys(decision!.announced!.reasons).sort(), label).toEqual([
      "ambition",
      "built",
      "near",
      "openSeat",
      "standing",
    ]);
    expect(filing.announcedOn! < filingWindowOpens(api, contest), label).toBe(
      true,
    );

    // The race page lists them under Who's running, marked announced.
    const race = localRaces(world.core).races.find((row) =>
      row.contestIds.includes(contest.id),
    );
    const shown = race?.filers.find((f) => f.personId === filing.personId);
    expect(shown?.announced, label).toBe(true);

    // The campaign board's count of who is running reads them.
    expect(
      contestStanding(api, contest.id, filing.personId).some(
        (row) => row.candidateId === filing.personId && row.announced,
      ),
      label,
    ).toBe(true);

    // On the day filing opens they file, and the day they announced stays.
    const opens = filingWindowOpens(api, contest);
    let date = world.core.date;
    while (date < opens) {
      date = addDay(date);
      advanceCore(world.core, date);
    }
    const after = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .get(filing.id) as unknown as FilingRow | undefined;
    expect(after?.status, label).not.toBe("announced");
    expect(after?.announcedOn, label).toBe(filing.announcedOn);
    // The board counts them as filed from then on, or not at all if refused.
    expect(
      contestStanding(api, contest.id, filing.personId).some(
        (row) => row.candidateId === filing.personId && row.announced,
      ),
      label,
    ).toBe(false);
  }, 900_000);
});
