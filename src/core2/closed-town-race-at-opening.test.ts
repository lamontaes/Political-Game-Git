/**
 * A town race whose filing closed before the world opens still happens: those
 * who filed run, and the player is past its deadline, as on the state
 * calendar. The town calendar used to skip it and take the next cycle's race,
 * which put a four-year office two years off its cycle (a Mayor elected in
 * 2022 opened as elected in 2024, next raced in 2028).
 *
 * Drawn: towns whose law holds their regular races at the even-year November
 * election, ranked by the seed it prints (GOLDEN_PATH_SEED), opened on
 * Oct 12, 2026, after their filing closed and before the Nov 3 election.
 * Each place passed over is printed with why. Played to the next day, when
 * candidacy weighs the races closed at the opening.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import {
  openOffices,
  OFFICES_MODULE_ID,
  type TermRow,
} from "./modules/offices";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting } from "./modules/voting";
import { resolveMunicipalElectionTiming } from "./gov-rules/municipal-ballot-rules";
import placeMap from "./data/places/place-map.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const START = "2026-10-12";
const ELECTION = "2026-11-03";

type MapRow = [string, string, string | null, string, string];
const rows = (placeMap as unknown as { rows: MapRow[] }).rows;
const stateOf = new Map(
  rows.filter((r) => r[1] === "state").map((r) => [r[3], r[0].slice(3)]),
);

it(`a town race closed at the opening still happens, on its office's own cycle (seed ${seed})`, () => {
  const rank = (key: string) =>
    createHash("sha256").update(`${seed}:${key}`).digest("hex");
  const towns = rows
    .filter((r) => r[1] === "town" && r[4] === "municipality")
    .map((r) => ({
      key: r[0],
      name: r[3],
      usps: stateOf.get(r[3].slice(r[3].lastIndexOf(", ") + 2)),
    }))
    .filter(
      (t) =>
        t.usps &&
        resolveMunicipalElectionTiming(t.usps, t.key)?.timing ===
          "even-year-november-consolidated",
    )
    .sort((a, b) => rank(a.key).localeCompare(rank(b.key)));
  const passed: string[] = [];
  for (const town of towns.slice(0, 6)) {
    const label = `${town.name} (${town.key}, seed ${seed})`;
    const full = buildPopulation({
      seed,
      placeKey: town.key,
      startedAt: START,
      minimumPeople: 400,
    });
    const player = [...full.people]
      .filter(
        (p) =>
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]!;
    const core = createLifeCore(
      collapseToTwoLevels({ ...full, playerId: player.id }),
    );
    openLaws(core);
    openOffices(core, seed, core.date);
    openElections(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    const api = coreAPI(core);
    advanceCore(core, "2026-10-13");
    const contests = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).filter((c) => c.level === "city");
    if (!contests.length) {
      passed.push(`${label}: no elected town office`);
      continue;
    }
    // The race of Nov 3 is held although its filing closed before the
    // opening, and those who filed are on its ballot.
    const closed = contests.filter(
      (c) => c.electionDate === ELECTION && c.filingDeadline < START,
    );
    if (!closed.length) {
      const deadlines = [...new Set(contests.map((c) => c.filingDeadline))];
      // A town whose filing for Nov 3 is still open at the opening has no
      // race closed then: passed over, by its own deadline.
      if (contests.some((c) => c.electionDate === ELECTION)) {
        passed.push(`${label}: filing still open (${deadlines.join(", ")})`);
        continue;
      }
    }
    expect(
      closed.length,
      `${label}: town races on ${ELECTION}`,
    ).toBeGreaterThan(0);
    expect(
      closed.some((c) => ballot(api, c.id).length > 0),
      `${label}: someone on a closed race's ballot`,
    ).toBe(true);
    // Every serving holder's seat is raced before the holder's term ends,
    // and a seat raced on Nov 3 ends its term after it, not two years later.
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    for (const contest of contests) {
      const term = (
        terms.query("bySeatStatus", [
          contest.seatId,
          "serving",
        ]) as unknown as TermRow[]
      )[0];
      if (!term?.endDate) continue;
      expect(
        contest.electionDate < term.endDate,
        `${label} ${contest.id}`,
      ).toBe(true);
      if (contest.electionDate === ELECTION)
        expect(term.endDate < "2028-01-01", `${label} ${contest.id}`).toBe(
          true,
        );
    }
    process.stdout.write(
      `CLOSED TOWN RACE ${label}: ${closed.length} town races closed at the opening held on ${ELECTION}; passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn town opened between its filing deadline and ${ELECTION}: ${passed.join("; ")}`,
  );
}, 300_000);
