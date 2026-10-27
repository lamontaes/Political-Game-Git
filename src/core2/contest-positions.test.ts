/**
 * The positions a candidate can take when filing are the issues the seat's
 * own government decides (pool item laws-filing-positions-are-the-seats-own-issues).
 *
 * In a world from buildBenchWorld in a place drawn from all 56 on a seed
 * nobody chose (GOLDEN_PATH_SEED pins one), one council contest, one mayor
 * contest, one state legislature contest and one governor contest in the same
 * world list only questions their government may decide: the question is that
 * level's own (question-powers.json), and for a town the state lets its places
 * act on it (the readers the bodies file by when they sit). A council lists
 * none that only a state or federal body can change. Then a year of the played
 * world runs, and every computer candidate's filed platform holds only the
 * positions of the contest they filed in.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import geography from "../../data/research/geography/state-reference.json" with { type: "json" };
import questionPowers from "../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import { contestPositions } from "./contest-positions";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  authorityFor,
  beyondPower,
  type Provision,
} from "./modules/legislature";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { parsePlatform } from "./modules/campaigns";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 12;
/** Days of the played world run for the computer candidates' filings. */
const PLAYED_DAYS = 400;
const STEP_DAYS = 50;

const LEVELS = (
  questionPowers as unknown as {
    questions: Record<string, { levels: readonly string[] }>;
  }
).questions;
const KINDS = geography.places as Readonly<
  Record<string, { jurisdictionKind: string }>
>;

interface OfficeRecord {
  id: string;
  kind: string;
  level: "federal" | "state" | "county" | "city" | "township";
}

/** One contest of each wanted kind of office in the world, or what is missing. */
function contestsOfKinds(api: CoreAPI) {
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  const rows = [
    ...(api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]),
  ].sort((a, b) => a.id.localeCompare(b.id));
  const find = (match: (office: OfficeRecord) => boolean) => {
    const contest = rows.find((row) =>
      match(offices.get(row.officeId) as unknown as OfficeRecord),
    );
    return contest
      ? {
          contest,
          office: offices.get(contest.officeId) as unknown as OfficeRecord,
        }
      : null;
  };
  return {
    council: find((o) => o.kind === "council"),
    mayor: find((o) => o.kind === "mayor"),
    legislature: find((o) => o.kind.startsWith("legislature-")),
    governor: find((o) => o.kind === "governor"),
  };
}

it("a contest lists only the questions its seat's government decides, and a played year's filings hold only those", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "contest-positions");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const found = contestsOfKinds(api);
    const missing = Object.entries(found)
      .filter(([, hit]) => !hit)
      .map(([name]) => name);
    if (missing.length) {
      tried.push(`${where}: no contest for ${missing.join(", ")}`);
      continue;
    }
    const districtKind =
      KINDS[place.state.slice(place.state.lastIndexOf("-") + 1)]
        ?.jurisdictionKind;
    // A federal district's council holds the state's powers as well as a town's.
    const federalDistrict = districtKind === "federal-district";
    const owned = (office: OfficeRecord): readonly string[] =>
      office.level === "federal"
        ? ["federal"]
        : federalDistrict
          ? ["state", "county", "city"]
          : [office.level === "township" ? "city" : office.level];

    const lists = Object.fromEntries(
      Object.entries(found).map(([name, hit]) => [
        name,
        contestPositions(api, hit!.contest),
      ]),
    ) as Record<keyof typeof found, readonly string[]>;

    for (const [name, hit] of Object.entries(found)) {
      const { office } = hit!;
      const list = lists[name as keyof typeof lists];
      for (const question of list) {
        const note = `${where}: ${name} ${office.id} lists ${question}`;
        expect(PLATFORM_QUESTIONS, note).toContain(question);
        // The question is that government's own (data).
        expect(
          LEVELS[question]!.levels.some((level) =>
            owned(office).includes(level),
          ),
          `${note}, which only ${LEVELS[question]!.levels.join("/")} decides`,
        ).toBe(true);
        // The readers a body files by when it sits.
        const provision: Provision = {
          kind: "policy-question",
          question,
          value: 1,
        };
        if (office.level === "federal" || office.level === "state")
          expect(beyondPower(provision, office.level), note).toBeNull();
        else {
          expect(beyondPower(provision, "local"), note).toBeNull();
          expect(authorityFor(api, provision).allowed, note).toBe(true);
        }
      }
    }

    // A council lists none that only a state or federal body can change.
    const above = PLATFORM_QUESTIONS.filter((question) =>
      LEVELS[question]!.levels.every(
        (level) => level === "state" || level === "federal",
      ),
    );
    expect(
      above.length,
      `${where}: questions only above a town`,
    ).toBeGreaterThan(0);
    if (!federalDistrict)
      expect(
        lists.council.filter((question) => above.includes(question)),
        `${where}: council ${found.council!.office.id} lists questions only a state or federal body can change`,
      ).toEqual([]);
    // The mayor's government is the council's; the governor's is the legislature's.
    expect(lists.mayor, `${where}: ${found.mayor!.office.id}`).toEqual(
      lists.council,
    );
    expect(lists.governor, `${where}: ${found.governor!.office.id}`).toEqual(
      lists.legislature,
    );
    if (!federalDistrict)
      expect(
        lists.legislature.length,
        `${where}: ${found.legislature!.office.id}`,
      ).toBeGreaterThan(lists.council.length);
    expect(
      lists.legislature.filter((question) => above.includes(question)).length,
      `${where}: ${found.legislature!.office.id} lists no state question`,
    ).toBeGreaterThan(0);

    // A played year: every computer candidate's filed platform holds only the
    // positions of the contest they filed in.
    const contests = new Map<string, ContestRow>();
    const filings: FilingRow[] = [];
    let day = 0;
    while (day < PLAYED_DAYS) {
      day += STEP_DAYS;
      advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
      for (const row of api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[])
        contests.set(row.id, row);
      filings.length = 0;
      filings.push(
        ...(api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .rows() as unknown as FilingRow[]),
      );
      if (filings.some((row) => row.platform.length)) break;
    }
    const stated = filings.filter((row) => row.platform.length);
    if (!stated.length) {
      tried.push(`${where}: no filing stated a position in ${day} days`);
      continue;
    }
    let checked = 0;
    for (const filing of stated) {
      const contest = contests.get(filing.contestId)!;
      const allowed = contestPositions(api, contest);
      for (const stance of parsePlatform(filing.platform)) {
        expect(
          allowed,
          `${where}: filing ${filing.id} states ${stance.question}, not a position of ${contest.officeId}`,
        ).toContain(stance.question);
        checked += 1;
      }
    }
    const line = (name: string, hit: NonNullable<(typeof found)["council"]>) =>
      `  ${name} ${hit.office.id} (${hit.office.level}, contest ${hit.contest.id}): ${lists[name as keyof typeof lists].length} positions ${JSON.stringify(
        lists[name as keyof typeof lists].map((q) => q.split(":")[1]),
      )}`;
    process.stdout.write(
      `CONTEST POSITIONS ${where} (draw ${draw}, GOLDEN_PATH_SEED=${seed})\n${Object.entries(
        found,
      )
        .map(([name, hit]) => line(name, hit!))
        .join(
          "\n",
        )}\n  played ${day} days: ${stated.length} filings stated ${checked} positions, all in their contest's list\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place in ${DRAWS} had a council, mayor, state legislature and governor contest and a filing that stated a position (seed ${seed}): ${tried.join("; ")}`,
  );
}, 1_800_000);
