import { storiesHeard } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { wordArchiveStory } from "./archive-words";
import { knownCard } from "./card";
import { governmentMap } from "./map";

/** Headlines a year shows at most while loading, newest first. */
const HEADLINES_A_YEAR = 3;

/**
 * What the loading screen plays while the first scene is drawn (Lane 4,
 * path 3: "the journal writing itself, a year counter with headlines, the
 * map filling in"), all from the world just built: the years of the
 * player's life, each with the lines of their own story that year (the same
 * lines Your life tells) and the headlines they heard that year from the
 * paper's archive; and the state's districts with who holds them, to fill
 * in. Every line names its record.
 */
export function loadingStory(core: CoreState, playerId: string) {
  const own = knownCard(core, playerId, playerId);
  const life = (own?.history ?? []).map((line) => ({
    year: Number(line.date.slice(0, 4)),
    text: line.text,
    recordId: line.recordId,
  }));
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
