import { coreAPI } from "../core2/state";
import { townSeats } from "../core2/modules/offices";
import { lifePlaceByKey } from "../simulation/life-places";
import { capitolPlaceFor } from "../presentation/place-backdrops";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { backdropFile, stagePeople, homeOf } from "./scene";
import pictures from "./data/opening-pictures.json" with { type: "json" };
import type { CoreState } from "../core2/types";
import type { OpeningSentence, OpeningStory } from "../director/opening-story";

// The opening (owner, Oct 14, 2026): the President's address, full screen,
// sentence by sentence in the speech box, the picture cutting to what each
// sentence is about; then home, where that night's news can be picked up.
// Every word is the director's opening story, composed by the English engine
// at loading; this file only chooses the pictures and who stands in them.

/** The evening of the opening day, when the household has the news on. */
export const OPENING_EVENING_MINUTE = 20 * 60 + 30;

const PICTURED = new Set(
  manifest.backdrops
    .filter((row) => row.variant === "midday")
    .map((row) => row.place),
);

interface Picture {
  places: string[];
  cast?: string;
}
const RULES = pictures as unknown as {
  facts: (Picture & { facts: string[] })[];
  levels: Record<string, Picture>;
  cast: Record<string, string[][]>;
  hour: number;
};

/** The picture a sentence is shown over: its first matching fact, else its part of the address. */
function pictureFor(sentence: OpeningSentence): Picture {
  return (
    RULES.facts.find((rule) =>
      rule.facts.some((key) => sentence.facts.includes(key)),
    ) ??
    RULES.levels[sentence.level] ??
    RULES.levels.occasion!
  );
}

/**
 * The opening's frames: one per change of picture, each with the sentences
 * the President says over it and who stands in it. Read-only.
 */
export function openingFrames(
  core: CoreState,
  playerId: string,
  story: OpeningStory,
) {
  const player = core.people.get(playerId);
  if (!player) throw new Error("No such person.");
  const api = coreAPI(core);
  const seats = townSeats(api);
  const minute = RULES.hour * 60;
  const usps =
    lifePlaceByKey(
      api.state.placeMetadata.placeKey ?? "",
    )?.stateJurisdictionKey?.slice(3) ?? null;
  // A state's own capitol where it is pictured (the presentation helper reads
  // the browser build's picture list, which the bench server doesn't have).
  const capitol = (code: string | null) =>
    code && PICTURED.has(`state-capitol-${code.toLowerCase()}`)
      ? `state-capitol-${code.toLowerCase()}`
      : capitolPlaceFor(code);
  const resolve = (place: string, sentence: OpeningSentence) =>
    place === "capitol"
      ? capitol(usps)
      : place === "@visited-capitol"
        ? capitol(sentence.stateKey?.slice(3) ?? null)
        : place === "@home"
          ? homeOf(core, playerId, minute)
          : place;
  const castOf = (key: string | undefined) => {
    if (key === "family")
      return (core.households.get(player.householdId)?.memberIds ?? [])
        .filter((id) => core.people.get(id)?.alive)
        .map((id) => {
          const row = core.people.get(id)!;
          return { id, name: `${row.givenName} ${row.familyName}` };
        });
    for (const kinds of (key && RULES.cast[key]) || []) {
      const cast = seats
        .filter((row) => kinds.includes(row.office.kind) && row.holder)
        .map(({ office, holder }) => ({
          id: holder!.personId ?? holder!.id,
          name: `${holder!.identity.givenName} ${holder!.identity.familyName}`,
          title: office.title,
        }));
      if (cast.length) return cast;
    }
    return [];
  };
  const frames: {
    place: string;
    backdrop: ReturnType<typeof backdropFile>;
    cast: { id: string; name: string; title?: string }[];
    people: ReturnType<typeof stagePeople>["people"];
    lines: OpeningSentence[];
  }[] = [];
  for (const sentence of story.address.sentences) {
    const picture = pictureFor(sentence);
    const place = picture.places
      .map((row) => resolve(row, sentence))
      .find((row) => PICTURED.has(row));
    const last = frames.at(-1);
    if (!place || place === last?.place) {
      last?.lines.push(sentence);
      continue;
    }
    const cast = castOf(picture.cast);
    frames.push({
      place,
      backdrop: backdropFile(place, minute),
      cast,
      people: stagePeople(core, place, cast).people,
      lines: [sentence],
    });
  }
  const presidentFigure = frames
    .flatMap((frame) => frame.people)
    .find((row) => row.personId === story.president.id)?.figureUrl;
  return {
    /** Who is speaking, for the speech box. */
    speaker: {
      id: story.president.id,
      name: story.president.name,
      title:
        seats.find((row) => row.office.kind === "president")?.office.title ??
        null,
      detail: [story.president.homeState, story.president.priorOffice].filter(
        (text): text is string => Boolean(text),
      ),
      ...(presidentFigure ? { figureUrl: presidentFigure } : {}),
    },
    frames,
    /** That night's news, which the player picks up at home. */
    news: {
      id: story.id,
      stories: story.newscast,
      address: story.address.sentences.map((row) => row.text),
    },
    home: { ...story.home, minuteOfDay: OPENING_EVENING_MINUTE },
  };
}
