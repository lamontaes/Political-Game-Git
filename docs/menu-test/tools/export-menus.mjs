/* global process, console */
// Round 3 extends export-elections.mjs's opening recipe to the other menus.
// Run from a v0.113.0 checkout with npm ci already run:
//   node --max-old-space-size=8192 --import tsx /path/to/export-menus.mjs [output-directory]
// The default output lives beside this script in ../inputs/data.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL, URL, URLSearchParams } from "node:url";

const TAG = "v0.113.0";
const SEED = "4da16a2f-da10-45c7-b308-18f79c4f5388";
const PLACE_KEY = "3832580";
const PERSON = {
  givenName: "Tracy",
  familyName: "Lucas",
  gender: "male",
  birthYear: 1980,
  birthMonth: 2,
  birthDay: 14,
};

const checkout = process.cwd();
const commitAt = (ref) =>
  execFileSync("git", ["rev-parse", `${ref}^{commit}`], {
    encoding: "utf8",
  }).trim();
assert.equal(commitAt("HEAD"), commitAt(TAG), `Run from the ${TAG} checkout`);
const controlsFile = "src/bench/data/controls.json";
const controls = JSON.parse(readFileSync(join(checkout, controlsFile), "utf8"));
const playFile = "src/bench/play.mjs";
const load = (file) => import(pathToFileURL(join(checkout, file)).href);
const [
  { benchRequest, benchWorld },
  { setBookkeeping },
  { dateWords, monthWords, timeWords },
  { policyNames },
  prettier,
] = await Promise.all([
  load("src/bench/handler.ts"),
  load("src/core2/bookkeeping.ts"),
  load("src/english/plain-words.mjs"),
  load("src/bench/words.ts"),
  load("node_modules/prettier/index.mjs"),
]);

function displayValue(value) {
  if (typeof value !== "string") return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return dateWords(value);
  if (/^\d{4}-\d{2}$/.test(value)) return monthWords(value);
  return value;
}

function from(value, source) {
  assert.notEqual(value, undefined, `No value for ${source}`);
  return { value: displayValue(value), source };
}

// Record IDs locate rows where the menu returns one. Other fields use their
// path through the game view (or through the controls file for labels).
function sourced(value, source) {
  if (Array.isArray(value?.sourceRecordIds) && value.sourceRecordIds.length) {
    source += ` (records: ${value.sourceRecordIds.join(", ")})`;
  }
  if (Array.isArray(value) && value.length) {
    return value.map((row, index) => {
      const key =
        row?.id ??
        row?.personId ??
        row?.cardId ??
        row?.organizationId ??
        row?.termId ??
        row?.recordId ??
        row?.series ??
        row?.key ??
        index;
      return sourced(row, `${source}[${key}]`);
    });
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value);
    if (entries.length) {
      return Object.fromEntries(
        entries.map(([key, item]) => [key, sourced(item, `${source}.${key}`)]),
      );
    }
  }
  return from(value, source);
}

function labels(title, ...groups) {
  const headings = title
    ? { title: from(controls.titles[title], `${controlsFile}.titles.${title}`) }
    : {};
  return Object.assign(
    headings,
    Object.fromEntries(
      groups.map((key) => {
        assert(Object.hasOwn(controls, key), `Missing controls: ${key}`);
        return [key, from(controls[key], `${controlsFile}.${key}`)];
      }),
    ),
  );
}

async function request(route, query, method = "GET") {
  const url = new URL(`/api/${route}`, "http://bench");
  url.search = new URLSearchParams(query);
  const reply = await benchRequest(method, url, { developer: false });
  assert.equal(reply.status, 200, `${method} ${url.pathname}: ${reply.body}`);
  return JSON.parse(reply.body);
}

const dataFrom = (value, route, reader) =>
  sourced(value, `/api/${route} → ${reader}`);

function hudRail() {
  // Read the order from the pinned client and the wording from the controls.
  const game = readFileSync(join(checkout, playFile), "utf8");
  const tabs =
    /mountRail\(\s*\$\("rings"\),\s*\[([^\]]+)\],\s*controls\.titles/.exec(
      game,
    );
  assert(tabs, `Cannot find the HUD rail in ${playFile}`);
  return [...tabs[1].matchAll(/"([^"]+)"/g)].map(([, key]) =>
    from(controls.titles[key], `${controlsFile}.titles.${key}`),
  );
}

async function gather(opening) {
  const id = opening.personId;
  const playerQuery = { id };
  const { core } = benchWorld();
  const player = core.people.get(id);
  const ashley = [...core.people.values()].find(
    (person) =>
      person.householdId === player.householdId &&
      person.givenName === "Ashley" &&
      person.familyName === player.familyName,
  );
  assert(ashley, "Ashley Lucas is missing from Tracy's household");
  const openingSource = "/api/newlife → bench/handler";
  const world = {
    tag: from(TAG, "git tag"),
    seed: from(SEED, `${openingSource}.seed`),
    placeKey: from(PLACE_KEY, `${openingSource}.placeKey`),
    place: from(opening.placeName, `${openingSource}.placeName`),
    date: from(core.date, "core.date"),
    playerId: from(id, `${openingSource}.personId`),
  };
  const add = (data, screenLabels, not_in_game = []) => ({
    world,
    ...data,
    labels: screenLabels,
    not_in_game,
  });
  const card = await request("card", playerQuery);
  const self = await request("known", { id, other: id });
  const known = await request("known", { id, other: ashley.id });
  const politics = await request("government", playerQuery);
  const bodyLevels = Object.keys(controls.levels).filter((level) =>
    ["local", "state", "federal"].includes(level),
  );
  const bodies = {};
  for (const level of bodyLevels) {
    bodies[level] = dataFrom(
      await request("government/bodies", { id, level }),
      `government/bodies?level=${level}`,
      "bench/government-bodies.governmentBodies",
    );
  }
  const bills = await request("bills/following");
  const billDetails = [];
  for (const bill of bills) {
    const billId = bill.id;
    billDetails.push(
      dataFrom(
        await request("bill/page", { billId, id }),
        `bill/page?billId=${billId}`,
        "bench/bill-stage.billPageView",
      ),
    );
  }
  const budgets = await request("budget", playerQuery);
  const calendar = await request("calendar", playerQuery);
  const chapters = await request("journal", playerQuery);
  const news = await request("news", playerQuery);
  const stories = news.filter(
    (row) => row.fresh !== false && (row.headline || row.lede),
  );
  const destinations = await request("goto", playerQuery);
  const filingCounters = {};
  for (const { filingOffice } of politics.contests) {
    const { filedWith } = filingOffice;
    if (Object.hasOwn(filingCounters, filedWith)) continue;
    const query = { filedWith };
    filingCounters[filedWith] = {
      office: dataFrom(
        filingOffice,
        "government",
        "bench/government.governmentView.contests[].filingOffice",
      ),
      picture: dataFrom(
        await request("goto/counter-picture", query),
        "goto/counter-picture",
        `bench/scene.backdropFile(${filedWith})`,
      ),
      hours: dataFrom(
        await request("filing/hours", query),
        "filing/hours",
        `bench/handler filing hours (${filedWith})`,
      ),
    };
  }
  const scene = await request("scene", playerQuery);
  const openingScene = await request("opening", playerQuery);
  const journalNote = chapters.at(-1)?.lines.at(-1);
  const lawNames = policyNames();
  const benchGovernment = (key) =>
    dataFrom(
      politics[key],
      "government",
      `bench/government.governmentView.${key}`,
    );
  const benchCard = (key) =>
    dataFrom(
      key ? card[key] : card,
      "card",
      `bench/card.personCard(${id})${key ? `.${key}` : ""}`,
    );
  const benchKnown = (value, other) =>
    dataFrom(value, "known", `bench/card.knownCard(${id},${other})`);
  const knownPeople = [];
  for (const person of card.known) {
    const { personId } = person;
    const other =
      personId === ashley.id
        ? known
        : await request("known", { id, other: personId });
    knownPeople.push({
      ...dataFrom(
        person,
        "card",
        `bench/card.personCard(${id}).known[${personId}]`,
      ),
      face: dataFrom(
        other.face ?? null,
        "known",
        `bench/card.knownCard(${id},${personId}).face`,
      ),
    });
  }

  return {
    government: add(
      {
        homeState: benchGovernment("homeState"),
        bodies,
      },
      labels("government", "politics", "levels", "billStage"),
    ),
    parties: add(
      {
        parties: benchGovernment("parties"),
        memberships: benchGovernment("party"),
        seatsByOffice: benchGovernment("partySeatsByOffice"),
        homeState: benchGovernment("homeState"),
      },
      labels("parties", "politics", "party"),
    ),
    issues: add(
      {
        homeState: benchGovernment("homeState"),
        laws: benchGovernment("law"),
        policyNames: sourced(
          Object.fromEntries(
            politics.law.flatMap(({ series }) =>
              Object.hasOwn(lawNames, series)
                ? [[series, lawNames[series]]]
                : [],
            ),
          ),
          "bench/words.policyNames → src/core2/data/legislature/bill-catalog.json",
        ),
        changes: dataFrom(
          await request("changes", playerQuery),
          "changes",
          "bench/handler.lawChanges",
        ),
      },
      labels("issues", "politics", "levels"),
      [
        "Effects on people and households from laws passed during this playthrough before any such law takes effect.",
      ],
    ),
    bills: add(
      {
        following: dataFrom(
          bills,
          "bills/following",
          "bench/bill-stage.followedBills",
        ),
        pages: billDetails.length
          ? billDetails
          : from([], "/api/bills/following → bench/bill-stage.followedBills"),
      },
      labels("bills", "billFollow", "billPage", "billStage", "bill", "floor"),
    ),
    budgets: add(
      { books: dataFrom(budgets, "budget", "bench/budget.budgetView") },
      labels("budgets", "politics", "budgetStrips", "budgetEditor", "levels"),
    ),
    metrics: add(
      {
        metrics: dataFrom(
          await request("metrics"),
          "metrics",
          "bench/metrics.metricsView → core2/output-number-readers",
        ),
      },
      labels("metrics", "levels"),
      [
        "Prior-year figures for metrics whose reader returns no comparable observation.",
      ],
    ),
    you: add(
      {
        card: benchCard(),
        life: benchKnown(self, id),
      },
      labels("who", "who", "lifeGroups", "leanWords"),
    ),
    people: add(
      {
        knownPeople: knownPeople.length ? knownPeople : benchCard("known"),
        household: benchCard("home"),
        selected: benchKnown(known, ashley.id),
      },
      labels("people", "people", "person", "who", "lifeGroups", "leanWords"),
    ),
    journal: add(
      {
        chapters: dataFrom(
          chapters,
          "journal",
          "director/journal.composeJournal",
        ),
      },
      labels("journal", "journal"),
    ),
    calendar: add(
      {
        calendar: dataFrom(
          calendar,
          "calendar",
          "core.date and bench/calendar.calendarItems",
        ),
      },
      labels("calendar", "calendar"),
    ),
    money: add(
      {
        bank: dataFrom(
          await request("bank", playerQuery),
          "bank",
          "bench/bank.bankView",
        ),
        dwelling: benchCard("dwelling"),
        withholding: dataFrom(
          budgets.withholding ?? null,
          "budget",
          "bench/budget.budgetView.withholding",
        ),
      },
      labels("money", "money"),
      [
        "Campaign money and a daily ledger itemization are not exposed on the Money screen.",
      ],
    ),
    news: add(
      {
        outlets: dataFrom(
          await request("news/home", playerQuery),
          "news/home",
          "bench/archive-words.homePapers",
        ),
        stories: dataFrom(
          stories,
          "news",
          "bench/handler news feed → archive and nation stories",
        ),
        follows: dataFrom(
          await request("news/follows", playerQuery),
          "news/follows",
          "bench/archive-words.followsAnyOutlet",
        ),
      },
      labels("news", "news", "opening"),
    ),
    travel: add(
      {
        destinations: dataFrom(
          destinations,
          "goto",
          "bench/handler.townPlaces",
        ),
        filingCounters: Object.keys(filingCounters).length
          ? filingCounters
          : from(
              {},
              "/api/government → bench/government.governmentView.contests",
            ),
        home: dataFrom(
          await request("goto/home"),
          "goto/home",
          "bench/scene.benchScene",
        ),
      },
      labels("travel", "travel", "here"),
      ["Street addresses for the filing counters."],
    ),
    guide: add(
      {
        entries: dataFrom(
          await request("guide"),
          "guide",
          "data/research/glossary/terms.json",
        ),
      },
      labels("guide", "guide"),
    ),
    hud: add(
      {
        player: {
          name: benchCard("name"),
          face: benchCard("face"),
          place: world.place,
          at: dataFrom(card.at, "card", "bench/handler shown clock"),
          time: from(
            timeWords(card.at.minuteOfDay),
            "/api/card.at.minuteOfDay → english/plain-words.timeWords",
          ),
        },
        journalNote: dataFrom(
          journalNote ?? null,
          "journal",
          "bench/play.renderJournalNote → director/journal.composeJournal",
        ),
        room: dataFrom(
          scene,
          "scene",
          "bench/handler.sceneNow → bench/scene.benchScene",
        ),
        opening: dataFrom(
          openingScene,
          "opening",
          "director opening → bench/opening.openingFrames",
        ),
        news: dataFrom(
          stories.slice(0, 1),
          "news",
          "bench/play.nightsNews and showNewsSurface",
        ),
      },
      {
        ...labels(null, "titles", "time", "here", "opening", "talkBox"),
        rail: hudRail(),
      },
    ),
  };
}

const saveDir = mkdtempSync(join(tmpdir(), "menu-export-"));
try {
  process.env.OCD_SAVE_DIR = saveDir;
  setBookkeeping(false);
  // The gameplay entry point applies the same seed, place, identity, two-level
  // build, warmup and gameStartDate as the Elections export.
  const opening = await request(
    "newlife",
    {
      seed: SEED,
      placeKey: PLACE_KEY,
      person: JSON.stringify(PERSON),
    },
    "POST",
  );
  const screens = await gather(opening);
  assert.equal(
    benchWorld().core.date,
    opening.date,
    "A menu read advanced the game",
  );
  const target = process.argv[2]
    ? resolve(process.argv[2])
    : resolve(import.meta.dirname, "../inputs/data");
  mkdirSync(target, { recursive: true });
  const formatOptions = await prettier.resolveConfig(
    join(checkout, "docs/menu-test/inputs/data"),
  );
  for (const [screen, data] of Object.entries(screens)) {
    const json = await prettier.format(JSON.stringify(data, null, 2), {
      ...formatOptions,
      parser: "json",
    });
    writeFileSync(join(target, `${screen}.json`), json);
  }
  console.log(
    `${opening.placeName}, ${dateWords(opening.date)}: wrote ${Object.keys(screens).length} menus to ${target}`,
  );
} finally {
  rmSync(saveDir, { recursive: true, force: true });
}
