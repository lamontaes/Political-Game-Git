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
 * none that only a state or federal body can change, and adds its own
 * government's budget lines (pool item campaigns-local-platform-budget-lines).
 * Then a year of the played world runs, and every computer candidate's filed
 * platform holds only the positions of the contest they filed in.
 *
 * The second case draws a place whose state lets its towns decide none of the
 * platform questions: its council still offers its budget lines, a computer
 * candidate's platform holds one, the campaign event opens on it, and a
 * voter's ballot in the race weighs the platform.
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
import { BUDGETS_MODULE_ID, budgetsOf, governments } from "./modules/budgets";
import { ballotOf, resultOf } from "./modules/voting";
import { openLaws } from "./modules/laws";
import { levelMayDecide } from "./modules/world-legislating";
import { campaignDayChoices } from "./campaign-day";
import { questionAxis } from "./campaign-views";
import { createLifeCore } from "./life";
import { buildPopulation } from "./population";
import { setKeepEveryonesWhy } from "./why-kept";
import { corePlaceByKey } from "./place-lookup";
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

const BUDGET = "budget-line:";

/** The lines of a local seat's own government's latest budget, as positions. */
function ownBudgetLines(api: CoreAPI, office: OfficeRecord): Set<string> {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return new Set();
  const own = office.level === "county" ? "county" : "city";
  const gov = governments(api).find((row) => row.level === own);
  const latest = gov
    ? [...budgetsOf(api, gov.id)].sort((a, b) => b.fiscalYear - a.fiscalYear)[0]
    : undefined;
  return new Set(
    Object.entries(latest?.spendingMinor ?? {})
      .filter(([, minor]) => minor > 0)
      .map(([line]) => `${BUDGET}${line}`),
  );
}

/**
 * Each filing's platform held against its contest's positions on the day it
 * was filed. The platform is fixed then, while the positions follow the law
 * in force and the latest budget, which play changes later (a state law
 * giving towns a question, a new year's budget). Filings already made when
 * the world opens are checked at once; later ones as they are filed.
 */
function checkAtFiling(api: CoreAPI, where: string) {
  const found = { stances: 0, misses: [] as string[] };
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  const check = (filingId: string) => {
    const filing = elections.table("filings").get(filingId) as unknown as
      FilingRow | undefined;
    const contest =
      filing &&
      (elections.table("contests").get(filing.contestId) as unknown as
        ContestRow | undefined);
    if (!filing || !contest) return;
    const allowed = contestPositions(api, contest);
    for (const stance of parsePlatform(filing.platform)) {
      found.stances += 1;
      if (!allowed.includes(stance.question))
        found.misses.push(
          `${where}: filing ${filing.id} states ${stance.question} on ${api.state.date}, not a position of ${contest.officeId}`,
        );
    }
  };
  for (const row of elections.table("filings").rows() as unknown as FilingRow[])
    check(row.id);
  api.subscribeEvents(
    `contest-positions-at-filing:${where}`,
    ["candidate-filed"],
    (_, event) => check(event.id.slice("candidate-filed:".length)),
  );
  return found;
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
    const atFiling = checkAtFiling(api, where);
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
      const lines = ownBudgetLines(api, office);
      for (const question of list) {
        const note = `${where}: ${name} ${office.id} lists ${question}`;
        // A local seat's own government's budget line, which someone leans on.
        if (question.startsWith(BUDGET)) {
          expect(
            office.level === "federal" || office.level === "state",
            note,
          ).toBe(false);
          expect(lines.has(question), `${note}, not a line of its budget`).toBe(
            true,
          );
          expect(questionAxis(question), note).not.toBe(0);
          continue;
        }
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
      ).toBeGreaterThan(
        lists.council.filter((q) => !q.startsWith(BUDGET)).length,
      );
    // A town decides its own budget: its council offers the lines.
    expect(
      lists.council.some((q) => q.startsWith(BUDGET)),
      `${where}: council ${found.council!.office.id} offers no budget line`,
    ).toBe(true);
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
    // Each platform as it was filed, against its contest's positions that day.
    expect(atFiling.misses, where).toEqual([]);
    const checked = atFiling.stances;
    // What play changed after filing: stances their contest no longer lists.
    const drifted = stated.flatMap((filing) => {
      const allowed = contestPositions(api, contests.get(filing.contestId)!);
      return parsePlatform(filing.platform)
        .filter((stance) => !allowed.includes(stance.question))
        .map((stance) => `${filing.id} ${stance.question}`);
    });
    const line = (name: string, hit: NonNullable<(typeof found)["council"]>) =>
      `  ${name} ${hit.office.id} (${hit.office.level}, contest ${hit.contest.id}): ${lists[name as keyof typeof lists].length} positions ${JSON.stringify(
        lists[name as keyof typeof lists].map((q) => q.split(":").pop()),
      )}`;
    process.stdout.write(
      `CONTEST POSITIONS ${where} (draw ${draw}, GOLDEN_PATH_SEED=${seed})\n${Object.entries(
        found,
      )
        .map(([name, hit]) => line(name, hit!))
        .join(
          "\n",
        )}\n  played ${day} days: ${stated.length} filings stated ${checked} positions, each in its contest's list the day it was filed; ${drifted.length} no longer listed by then${drifted.length ? ` (e.g. ${drifted[0]})` : ""}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place in ${DRAWS} had a council, mayor, state legislature and governor contest and a filing that stated a position (seed ${seed}): ${tried.join("; ")}`,
  );
}, 1_800_000);

/** Whether the drawn place's state lets its towns decide none of the platform questions, read from a small world with only its laws open. */
function townsDecideNoQuestion(placeKey: string): boolean {
  const core = createLifeCore(
    buildPopulation({
      seed,
      placeKey,
      startedAt: gameStartDate(),
      minimumPeople: 20,
    }),
  );
  openLaws(core);
  const api = coreAPI(core);
  return !PLATFORM_QUESTIONS.some((q) => levelMayDecide(api, "city", q));
}

/**
 * One drawn place whose towns decide no question, played until a computer
 * candidate in a local race files a platform with a budget line, then to the
 * race's result. Returns why the place could not be checked (no local race
 * filed in the year), or null once every check ran.
 */
function noQuestionTown(place: ReturnType<typeof drawPlace>): string | null {
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const atFiling = checkAtFiling(api, where);
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  const officeOf = (contest: ContestRow) =>
    offices.get(contest.officeId) as unknown as OfficeRecord;
  const local = (contest: ContestRow) =>
    !["state", "federal"].includes(officeOf(contest).level);
  const contests = () =>
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
  // An unincorporated place has no council of its own to check.
  const council = contests().find((c) => officeOf(c).kind === "council");
  if (!council) return `${where}: no council contest`;
  const list = contestPositions(api, council);
  expect(list.length, `${where}: council ${council.officeId}`).toBeGreaterThan(
    0,
  );
  expect(
    list.filter((q) => !q.startsWith(BUDGET)),
    `${where}: council ${council.officeId} lists a question`,
  ).toEqual([]);
  // Play until computer candidates in local races file platforms with a
  // budget line; take, in order, a town race whose campaign can pay for an
  // event, then any race that can, then a town race, then any.
  const eventOf = (row: FilingRow) =>
    // A computer candidate's day, read as the world reads it.
    campaignDayChoices(api, row.id, true).find((c) => c.kind === "event");
  const town = (row: FilingRow) => {
    const c = contests().find((x) => x.id === row.contestId)!;
    return officeOf(c).level !== "county";
  };
  const stated = () =>
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .rows() as unknown as FilingRow[]
    ).filter((row) => {
      const c = contests().find((x) => x.id === row.contestId);
      return (
        c &&
        local(c) &&
        parsePlatform(row.platform).some((s) => s.question.startsWith(BUDGET))
      );
    });
  // A race already held offers no event, so one whose campaign still offers
  // it (open or shut on price) comes before one that offers none.
  const pick = (rows: readonly FilingRow[]) =>
    rows.find((r) => town(r) && eventOf(r)?.available) ??
    rows.find((r) => eventOf(r)?.available) ??
    rows.find((r) => town(r) && eventOf(r)) ??
    rows.find((r) => eventOf(r)) ??
    rows.find(town) ??
    rows[0];
  // Each choice as it stood the day it was taken: a race's event choice is
  // read while its campaign is open.
  let chosen:
    { filing: FilingRow; event: ReturnType<typeof eventOf> } | undefined;
  let day = 0;
  while (!chosen?.event?.available && day < PLAYED_DAYS) {
    day += STEP_DAYS;
    advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
    const next = pick(stated());
    const event = next && eventOf(next);
    if (next && (!chosen || event?.available || (!chosen.event && event)))
      chosen = { filing: next, event };
  }
  // What the local filings held, when none stated a budget line.
  const localFilings = () =>
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .rows() as unknown as FilingRow[]
    ).filter((row) => {
      const c = contests().find((x) => x.id === row.contestId);
      return c && local(c);
    });
  if (!chosen)
    return `${where}: no local filing stated a budget line in ${day} days (${localFilings().length} local filings)`;
  const filing = chosen!.filing;
  const contest = contests().find((c) => c.id === filing.contestId)!;
  // Every filing seen had its race held between two looks (a town meeting
  // race filed and held within one step): its campaign offers no event.
  if (!chosen.event)
    return `${where}: ${filing.id} offered no campaign event when seen, its race held ${contest.electionDate}, and no other local filing with a budget line offered one in ${day} days`;
  const stances = parsePlatform(filing.platform);
  // Every platform holds only its own contest's positions as they stood the
  // day it was filed; the positions follow the law and the budget after.
  expect(atFiling.misses, where).toEqual([]);
  const positions = contestPositions(api, contest);
  // The campaign event opens on a platform with a position; only the
  // venue's price can keep it shut.
  const event = chosen!.event;
  expect(
    event,
    `${where}: no campaign event choice for ${filing.id}`,
  ).toBeDefined();
  if (event) {
    expect(
      event.facts.platformStances,
      `${where}: ${filing.id}`,
    ).toBeGreaterThan(0);
    expect(event.available, `${where}: ${filing.id}`).toBe(
      Number(event.facts.cashMinor) >= Number(event.facts.venuePriceMinor),
    );
  }
  // On to the race's result: a voter's ballot weighs the platform.
  while (!resultOf(api, contest.id) && day < 3 * PLAYED_DAYS) {
    day += STEP_DAYS;
    advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
  }
  expect(
    resultOf(api, contest.id),
    `${where}: ${contest.id} not held by day ${day}`,
  ).not.toBeNull();
  const weighed = [...core.people.keys()]
    .map((id) => ballotOf(api, contest.id, id))
    .filter(
      (b) =>
        b &&
        b.basis === "platform" &&
        b.appeal[filing.personId]?.agreement != null,
    );
  expect(
    weighed.length,
    `${where}: no ballot in ${contest.id} weighs ${filing.id}'s platform`,
  ).toBeGreaterThan(0);
  process.stdout.write(
    `CONTEST POSITIONS (no question) ${where} (GOLDEN_PATH_SEED=${seed})\n  council ${council.officeId}: ${list.length} positions; ${contest.officeId}: ${positions.length} positions (${positions.filter((q) => !q.startsWith(BUDGET)).length} questions); filing ${filing.id} states ${JSON.stringify(stances.map((s) => `${s.question.split(":").pop()} ${s.position}`))}; event ${event ? (event.available ? "open" : `shut on price (${event.facts.cashMinor} < ${event.facts.venuePriceMinor})`) : "none"}; ${weighed.length} ballots weigh it, e.g. ${weighed[0]!.id} (agreement ${weighed[0]!.appeal[filing.personId]!.agreement})\n`,
  );
  return null;
}

it("a town whose state lets it decide no platform question still campaigns on its own budget lines, and a voter weighs them", () => {
  setBookkeeping(false);
  const keptBefore = setKeepEveryonesWhy(true);
  try {
    // Draw places from all 56 whose towns decide no question, until one has
    // a council and a local race that files in the year; each passed over is
    // named.
    const tried: string[] = [];
    let checked = false;
    // A place to replay first, as "<key>:<place seed>" (a send-back names one).
    const replay = process.env.CONTEST_POSITIONS_PLACE?.split(":");
    if (replay?.length === 2) {
      const passedOver = noQuestionTown({
        ...drawPlace(seed, "contest-positions-replay"),
        key: replay[0]!,
        name: corePlaceByKey(replay[0]!)?.displayName ?? replay[0]!,
        seed: replay[1]!,
      });
      if (passedOver) tried.push(passedOver);
      else checked = true;
    }
    for (let draw = 0; draw < 200 && !checked && tried.length < 8; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "contest-positions-none");
      if (!townsDecideNoQuestion(place.key)) continue;
      const passedOver = noQuestionTown(place);
      if (passedOver) tried.push(passedOver);
      else checked = true;
    }
    expect(
      checked,
      `no drawn place whose towns decide no question had a council and a local filing with a budget line (seed ${seed}): ${tried.join("; ")}`,
    ).toBe(true);
  } finally {
    setKeepEveryonesWhy(keptBefore);
  }
}, 2_400_000);
