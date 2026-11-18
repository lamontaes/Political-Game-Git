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
} from "../core2/modules/candidacy";
import {
  CANDIDATE_ANNOUNCED_EVENT,
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
// race page lists; every place passed over is named.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const opening = "2026-10-12";
const DRAWS = 4;
const DAYS = 150;
const addDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

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
    let date = opening;
    let announcedAnywhere = 0;
    for (let day = 0; day < DAYS; day++) {
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
      `rivals-announce: ${label}, ${filing.personId} announced for ${contest.title} on ${filing.announcedOn} by ${filing.announcedBy?.channel} to ${filing.announcedBy?.heardBy.length} people; passed over: ${passed.join("; ") || "none"}\n`,
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

    // How they said so and who heard it (owner, Nov 17: "There needs to be a
    // bunch of different ways"): the way their decision chose is the one on
    // the announcement, its hearers are people of the world other than the
    // candidate, and the announcement's record names each of them.
    const by = filing.announcedBy;
    expect(by?.channel, label).toBe(decision!.announced!.channel);
    expect(["word", "party-office", "public", "asking"], label).toContain(
      by?.channel,
    );
    expect(
      Object.keys(decision!.announced!.channelReasons).sort(),
      label,
    ).toEqual(["partyRole", "reach"]);
    for (const heard of by!.heardBy) {
      expect(heard, label).not.toBe(filing.personId);
      expect(world.core.people.has(heard), `${label}: ${heard}`).toBe(true);
    }
    if (by!.channel === "word" || by!.channel === "asking")
      expect(by!.heardBy.length, label).toBe(1);
    const record = world.core.durableLog.get(
      `${CANDIDATE_ANNOUNCED_EVENT}:${filing.id}:${filing.announcedOn}`,
    );
    expect(record?.facts?.channel, label).toBe(by!.channel);
    for (const heard of by!.heardBy)
      expect(record?.personIds, `${label}: ${heard}`).toContain(heard);

    // The race page lists them under Who's running, marked announced.
    const race = localRaces(world.core).races.find((row) =>
      row.contestIds.includes(contest.id),
    );
    const shown = race?.filers.find((f) => f.personId === filing.personId);
    expect(shown?.announced, label).toBe(true);

    // The campaign board's count of who is running reads them.
    expect(
      contestStanding(api, contest.id, filing.personId).some(
        (row) => row.candidateId === filing.personId,
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
    if (after?.status !== "withdrawn")
      expect(after?.announcedBy, label).toEqual(filing.announcedBy);
  }, 900_000);
});
