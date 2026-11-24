import type { EntityId } from "../core2/kernel/brands";
import { lifeOf, openWholePast } from "../core2/modules/people";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { spoken, stateInSentence } from "../director/words";
import type { GroundedEnglishFact } from "../english/grounded-english";
import { tell } from "../english/outline-planner";
import type { CoreState, PersonId } from "../core2/types";
import { governmentMap } from "./map";

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
  // The whole past is written before it is read, as the person card writes
  // it, so the story cites the records the card shows (writing it replaces
  // the records a partial past stood on).
  openWholePast(core, playerId as PersonId);
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
    // The sentence's own record (a birth, a school, a move), not the
    // player the whole story is told about.
    recordId:
      row.sourceRecordIds.find((id) => id !== playerId) ?? playerId,
  }));
}

/**
 * What the loading screen plays while the first scene is drawn: the years of
 * the player's life, each with the sentences of their own story told that
 * year (toldLife, through the outline planner), and the state's districts
 * with who holds them. The year's headlines are gone (the CTO, Nov 24,
 * send-back 2 on #10390: "Three headline rows still sit in the middle ...
 * That's the list of facts"). Every line names its record.
 */
export function loadingStory(core: CoreState, playerId: string) {
  const life = toldLife(core, playerId);
  const start = Number(core.date.slice(0, 4));
  const first = Math.min(start, ...life.map((line) => line.year));
  const years = [];
  for (let year = first; year <= start; year += 1) {
    const lines = life.filter((line) => line.year === year);
    // A year with nothing to tell is counted past, not shown.
    if (lines.length || year === start) years.push({ year, lines });
  }
  return { years, map: governmentMap(core) };
}

export type LoadingStory = ReturnType<typeof loadingStory>;
