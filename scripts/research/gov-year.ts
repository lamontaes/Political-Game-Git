/**
 * research-gov-sourced-parameters: one played year in a drawn place, and
 * where the town landed against each band the research recorded.
 *
 * - newsOutletDelayDays (ESTIMATED, data/research/news/apnorc-2014-news-frequency.json):
 *   how soon adults read the town outlet's printed stories, against the share
 *   who get news daily, several times a week, or weekly or less.
 * - newsStoriesPerContact (TUNABLE, data/research/news/pew-2024-2025-news-habits.json):
 *   the share of adults word of mouth reached at least once, against Pew's
 *   share who ever get local news from other residents.
 * - SG-GOV-justice-bribery-grade: the town's bribery range, and every bribery
 *   sentence of the year against it.
 * - SG-OFFICIALS-unrecorded-party: the officials whose party the rosters
 *   leave unrecorded, read or still estimated.
 *
 * Exits 1 when the news parameter rows no longer match the research files.
 * Run: node --import tsx scripts/research/gov-year.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { briberyRange } from "../../src/core2/justice-law";
import { stateOffices } from "../../src/core2/offices-state";
import { newsKey } from "../../src/core2/modules/news";
import newsRows from "../../src/core2/data/news/parameters.json" with { type: "json" };

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const frequency = read(
  "data/research/news/apnorc-2014-news-frequency.json",
) as {
  frequency: { label: string; share: number; intervalDays: number }[];
  delayEstimate: { value: number; low: number; high: number };
};
const habits = read("data/research/news/pew-2024-2025-news-habits.json") as {
  fromOtherResidents: { band: { low: number; high: number } };
};
const rows = newsRows as unknown as Record<
  string,
  {
    value: number;
    tag: string;
    spread?: { low?: number; high?: number; status?: string };
  }
>;

// The parameter rows must still be the research's.
const delay = rows.newsOutletDelayDays!;
const mismatch: string[] = [];
if (
  delay.tag !== "ESTIMATED" ||
  delay.value !== frequency.delayEstimate.value ||
  delay.spread?.low !== frequency.delayEstimate.low ||
  delay.spread?.high !== frequency.delayEstimate.high
)
  mismatch.push("newsOutletDelayDays differs from apnorc-2014-news-frequency");
if (rows.newsStoriesPerContact!.spread?.status !== "unmeasured")
  mismatch.push("newsStoriesPerContact is no longer marked unmeasured");
if (mismatch.length) {
  console.error(mismatch.join("\n"));
  process.exit(1);
}

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const townPlace = world.placeId;
const stateKey = corePlaceByKey(
  core.placeMetadata.placeKey!,
)!.stateJurisdictionKey!;
console.log(
  `${world.place.displayName} (${stateKey}), seed ${seed}, ${core.people.size} people, start ${core.date}`,
);

interface Heard {
  personId: string;
  storyId: string;
  date: string;
  access: string;
}
const heardSeen = new Map<string, Heard>();
const storyDate = new Map<string, { date: string; outletId: string }>();
const news = () => api.moduleState("news");
/** Reads who heard what before the 1st's retention pass drops old stories. */
function snapshot() {
  for (const row of news().table("stories").rows())
    storyDate.set(row.id, {
      date: row.date as string,
      outletId: row.outletId as string,
    });
  for (const row of news().table("heard").rows()) {
    if (heardSeen.has(row.id)) continue;
    const personId = row.personId as string;
    const storyId = row.storyId as string;
    const access =
      core.knowledgeByPerson.get(personId)?.get(newsKey(storyId))?.access ??
      "unknown";
    heardSeen.set(row.id, {
      personId,
      storyId,
      date: row.date as string,
      access,
    });
  }
}

const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(makeIsoDate(core.date), 365);
while (core.date < end) {
  dev.advance(addDays(makeIsoDate(core.date), 1));
  if (addDays(makeIsoDate(core.date), 1).endsWith("-01")) snapshot();
}
snapshot();

const days = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const adults = [...(core.peopleByPlace.get(townPlace) ?? [])]
  .map((id) => core.people.get(id)!)
  .filter((p) => p?.alive && days(p.birthDate, core.date) >= 18 * 365.25 - 1);
const byTier = new Map<string, typeof adults>();
for (const p of adults) byTier.set(p.tier, [...(byTier.get(p.tier) ?? []), p]);
const tiersOf = (ids: Iterable<string>) => {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const tier = core.people.get(id)?.tier ?? "none";
    counts.set(tier, (counts.get(tier) ?? 0) + 1);
  }
  return JSON.stringify(Object.fromEntries(counts));
};
console.log(
  `town residents by tier ${tiersOf(core.peopleByPlace.get(townPlace) ?? [])}; everyone in the world by tier ${tiersOf(core.people.keys())}`,
);
const pct = (n: number, d: number) =>
  d ? `${((100 * n) / d).toFixed(1)}%` : "n/a";

// 1. newsOutletDelayDays: how soon each adult reads a printed story.
const outletDelays = new Map<string, number[]>();
const toldPeople = new Set<string>();
const examples: string[] = [];
for (const h of heardSeen.values()) {
  const story = storyDate.get(h.storyId);
  if (!story) continue;
  if (h.access === "public") {
    const d = days(story.date, h.date);
    outletDelays.set(h.personId, [...(outletDelays.get(h.personId) ?? []), d]);
    if (examples.length < 3)
      examples.push(`${h.storyId} -> ${h.personId} after ${d} day(s)`);
  }
  if (h.access === "told") toldPeople.add(h.personId);
}
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const bands = frequency.frequency;
console.log(
  `\nnewsOutletDelayDays = ${delay.value} day (ESTIMATED; spread ${delay.spread!.low} to ${delay.spread!.high} days). Band (AP-NORC 2014): ${bands.map((b) => `${b.label} ${(100 * b.share).toFixed(0)}%`).join(", ")}.`,
);
for (const [tier, people] of [["all", adults] as const, ...byTier]) {
  let daily = 0,
    weekly = 0,
    rarely = 0;
  for (const p of people) {
    const xs = outletDelays.get(p.id);
    const m = xs?.length ? median(xs) : Infinity;
    if (m <= 1) daily += 1;
    else if (m <= 3) weekly += 1;
    else rarely += 1;
  }
  console.log(
    `  ${tier} (${people.length} adults): reads the outlet the next day ${pct(daily, people.length)}, in 2 to 3 days ${pct(weekly, people.length)}, later or never ${pct(rarely, people.length)}`,
  );
}
console.log(`  outlet readings, e.g. ${examples.join("; ") || "none"}`);

// 2. newsStoriesPerContact: who word of mouth reached at least once.
const band = habits.fromOtherResidents.band;
console.log(
  `\nnewsStoriesPerContact = ${rows.newsStoriesPerContact!.value} (TUNABLE, no convertible source). Band (Pew 2018-2025): ${(100 * band.low).toFixed(0)}% to ${(100 * band.high).toFixed(0)}% of adults get local news from other residents at all.`,
);
for (const [tier, people] of [["all", adults] as const, ...byTier]) {
  const told = people.filter((p) => toldPeople.has(p.id));
  console.log(
    `  ${tier} (${people.length} adults): told a story at least once ${pct(told.length, people.length)}${told[0] ? ` (e.g. ${told[0].id})` : ""}`,
  );
}

// 3. Bribery: the town's own range, and the year's sentences against it.
const range = briberyRange(api, stateKey);
console.log(
  `\nbribery in ${stateKey}: ${range.minMonths} to ${range.maxMonths} months (${range.source.tag}; ${range.source.citation})`,
);
const sentences = api.moduleState("core2-justice-v1").table("sentences").rows();
if (!sentences.length)
  console.log(
    "  no bribery sentence in the played year, so no sentence can be checked against the range (the records below say how far the year's bribery got).",
  );
for (const s of sentences) {
  const r = s.reasons as Record<string, number>;
  console.log(
    `  sentence ${s.id} (case ${s.caseId}, ${s.personId}): ${s.custodyMonths} months custody, ${s.probationMonths} probation, range ${r.rangeMinMonths}-${r.rangeMaxMonths}`,
  );
}

const justice = api.moduleState("core2-justice-v1");
const crimes = api.moduleState("corruption").table("crimes").rows();
const investigations = justice.table("investigations").rows();
const cases = justice.table("cases").rows();
console.log(
  `  the year's bribery records: ${crimes.length} crimes${crimes[0] ? ` (e.g. ${crimes[0].id})` : ""}, ${investigations.length} investigations, ${cases.length} cases${cases[0] ? ` (e.g. ${cases[0].id}, ${cases[0].status})` : ""}`,
);

// 4. Officials whose party the rosters leave unrecorded.
const holders = read(
  "data/research/offices/unrecorded-holder-parties-2026.json",
) as { places: Record<string, { seats: Record<string, unknown> }> };
const researchSeats = Object.keys(holders.places[stateKey]?.seats ?? {});
console.log(
  `\nunrecorded-holder-parties-2026 holds ${researchSeats.length} seats for ${stateKey}${researchSeats.length ? ` (e.g. ${researchSeats[0]})` : ""}.`,
);
// Coverage over all 56 places (data only, not a played read): the seats the
// rosters leave without a party, and how many the research reads.
let unrecorded = 0,
  covered = 0;
for (const place of Object.keys(holders.places))
  for (const office of stateOffices(place, "", core.date))
    for (const seat of office.seats)
      if (seat.party === null) {
        unrecorded += 1;
        if (holders.places[place]!.seats[seat.id]) covered += 1;
      }
console.log(
  `  over all ${Object.keys(holders.places).length} places: ${unrecorded} seats have no roster party, ${covered} of them read by the research (the rest take the ticket rule or the estimate).`,
);
const officials = api
  .moduleState("core2-officials-v1")
  .table("officials")
  .rows();
const readIds = officials.filter((o) =>
  String(o.partySource).startsWith("unrecorded-holder-parties-2026"),
);
const estimated = officials.filter((o) =>
  String(o.partySource).startsWith("estimated"),
);
console.log(
  `\nofficials: ${officials.length} seated; party read from unrecorded-holder-parties-2026 for ${readIds.length}${
    readIds.length
      ? ` (${readIds
          .slice(0, 3)
          .map((o) => `${o.id} ${o.seatId} ${o.party ?? "no party"}`)
          .join("; ")})`
      : ""
  }; still the 2024-lean estimate for ${estimated.length}${
    estimated.length
      ? ` (${estimated
          .slice(0, 3)
          .map((o) => `${o.id} ${o.seatId}`)
          .join("; ")})`
      : ""
  }.`,
);
