import type { EntityId } from "../core2/kernel/brands";
import { storiesHeard } from "../core2/modules/news";
import { lifeOf } from "../core2/modules/people";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { spoken, stateInSentence } from "../director/words";
import type { GroundedEnglishFact } from "../english/grounded-english";
import { tell } from "../english/outline-planner";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { wordArchiveStory } from "./archive-words";
import { governmentMap } from "./map";

/** Headlines a year shows at most while loading, newest first. */
const HEADLINES_A_YEAR = 3;

/** The year a section of the loading story is shown at, by the fact that dates it. */
const SECTION_YEAR: Readonly<Record<string, string>> = {
  born: "born-year",
  school: "school-year",
  moved: "moved-year",
  finished: "finished-year",
  college: "college-year",
  lost: "lost-year",
  now: "start-year",
};

/**
 * The player's life as the loading card tells it (owner, Nov 23, P5 and P6:
 * "a little sarcastic", "It's still not written as a story"): the outline
 * row `loading-story` told from the player's own life records (lifeOf), each
 * sentence shown at its record's year. Nothing is said that the records do
 * not hold.
 */
function toldLife(
  core: CoreState,
  playerId: string,
): { year: number; text: string; recordId: string }[] {
  const person = core.people.get(playerId);
  if (!person) return [];
  const events = lifeOf(core, playerId as PersonId);
  const facts: Record<string, GroundedEnglishFact> = {};
  const put = (key: string, text: string, id: string) => {
    facts[key] ??= { text, sourceRecordIds: [id as EntityId] };
  };
  const yearOf = (date: string) => date.slice(0, date.indexOf("-"));
  const placeSaid = (id: string | undefined) => {
    const place = id ? corePlaceByJurisdictionId(id as never) : undefined;
    return place ? spoken(place) : undefined;
  };
  for (const event of events) {
    const at = `${event.life}/${event.what}`;
    if (at === "born/born") put("born-year", yearOf(event.date), event.id);
    if (at === "school/started" && !facts["school-year"]) {
      const where = placeSaid(event.placeId);
      if (where) {
        put("school-year", yearOf(event.date), event.id);
        put("school-place", where, event.id);
      }
    }
    if (at === "move/moved-in" && !facts["moved-year"]) {
      const from = placeSaid(String(event.facts?.fromPlaceId ?? ""));
      const to = placeSaid(String(event.facts?.toPlaceId ?? ""));
      if (from && to && from !== to) {
        put("moved-year", yearOf(event.date), event.id);
        put("moved-from", from, event.id);
        put("moved-to", to, event.id);
        if (String(event.facts?.pushedBy ?? "").startsWith("economy"))
          put("moved-for-work", "yes", event.id);
      }
    }
    if (at === "school/finished")
      put("finished-year", yearOf(event.date), event.id);
    if (at === "school/college-started") {
      put("college-year", yearOf(event.date), event.id);
      if (facts["finished-year"]?.text === yearOf(event.date))
        put("college-same-year", "yes", event.id);
    }
    if (at === "politics/lost" && event.facts?.office) {
      put("lost-year", yearOf(event.date), event.id);
      put("lost-office", String(event.facts.office).toLowerCase(), event.id);
      if (event.facts.votes)
        put(
          "lost-votes",
          Number(event.facts.votes).toLocaleString("en-US"),
          event.id,
        );
      if (event.facts.winnerVotes)
        put(
          "winner-votes",
          Number(event.facts.winnerVotes).toLocaleString("en-US"),
          event.id,
        );
      const before = facts["college-year"] ?? facts["finished-year"];
      if (before?.text === yearOf(event.date))
        put("lost-same-year", "yes", event.id);
    }
  }
  const home = corePlaceByJurisdictionId(person.placeId as never);
  put("start-year", yearOf(core.date), person.householdId);
  put(
    "start-month",
    new Date(`${core.date}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "long",
      timeZone: "UTC",
    }),
    person.householdId,
  );
  if (home) {
    put("place", spoken(home), person.householdId);
    if (home.withinName)
      put("state", stateInSentence(home.withinName), person.householdId);
  }
  const told = tell({
    kind: "loading-story",
    facts,
    momentKey: `loading:${playerId}`,
    worldSeed: core.seed,
    sourceRecordIds: [playerId as EntityId],
    knower: playerId as EntityId,
    traits: {},
  });
  return (told?.sentences ?? []).map((row) => ({
    year: Number(
      facts[SECTION_YEAR[row.section] ?? ""]?.text ?? yearOf(core.date),
    ),
    text: row.text,
    recordId: row.sourceRecordIds[0] ?? playerId,
  }));
}

/**
 * What the loading screen plays while the first scene is drawn (Lane 4,
 * path 3: "the journal writing itself, a year counter with headlines, the
 * map filling in"), all from the world just built: the years of the
 * player's life, each with the sentences of their own story told that year
 * (toldLife, through the outline planner) and the headlines they heard that year from the
 * paper's archive; and the state's districts with who holds them, to fill
 * in. Every line names its record.
 */
export function loadingStory(core: CoreState, playerId: string) {
  const life = toldLife(core, playerId);
  const heard = core.modules.has("news")
    ? storiesHeard(coreAPI(core), playerId as PersonId)
        .filter((story) => story.date < core.date)
        .flatMap((story) => {
          const worded = wordArchiveStory(core, story);
          return worded?.headline
            ? [
                {
                  year: Number(story.date.slice(0, 4)),
                  headline: worded.headline,
                  recordId: story.id,
                },
              ]
            : [];
        })
    : [];
  const start = Number(core.date.slice(0, 4));
  const first = Math.min(
    start,
    ...life.map((line) => line.year),
    ...heard.map((story) => story.year),
  );
  const years = [];
  for (let year = first; year <= start; year += 1) {
    const lines = life.filter((line) => line.year === year);
    const headlines = heard
      .filter((story) => story.year === year)
      .slice(0, HEADLINES_A_YEAR);
    // A year with nothing to tell is counted past, not shown.
    if (lines.length || headlines.length || year === start)
      years.push({ year, lines, headlines });
  }
  return { years, map: governmentMap(core) };
}

export type LoadingStory = ReturnType<typeof loadingStory>;
