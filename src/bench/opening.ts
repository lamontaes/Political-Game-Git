import { coreAPI } from "../core2/state";
import { townSeats } from "../core2/modules/offices";
import { corePlaceByKey } from "../core2/place-lookup";
import { capitolPlaceFor } from "./backdrop-places";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { backdropFile, stagePeople, homeOf } from "./scene";
import pictures from "./data/opening-pictures.json" with { type: "json" };
import type { CoreState } from "../core2/types";
import type { OpeningSentence, OpeningStory } from "../director/opening-story";
import { stageOfLevel, type OpeningFigure } from "../director/opening-sequence";

// The opening (owner, Oct 14, 2026): the President's address, full screen,
// sentence by sentence in the speech box, the picture cutting to what each
// sentence is about; then home, where that night's news can be picked up.
// The address plays over the director's sequence (owner, Oct 14, 2026,
// late): the President's stage, Congress, the state, the family, then home.
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
  stages: Record<string, Picture>;
  /** A stage's picture for one kind of address, where it differs (the State of the Union is given on the House floor). */
  stagesByKind?: Record<string, Record<string, Picture>>;
  facts: (Picture & { facts: string[] })[];
  levels: Record<string, Picture>;
  cast: Record<string, string[][]>;
  hour: number;
};

/** A cutaway's picture: its first matching fact, else its part of the address's. */
function cutawayFor(sentence: OpeningSentence): Picture | undefined {
  return (
    RULES.facts.find((rule) =>
      rule.facts.some((key) => sentence.facts.includes(key)),
    ) ?? RULES.levels[sentence.level]
  );
}

/**
 * The opening's frames: one per change of picture, each with the sentences
 * the President says over it, who stands in it, and on each stage's opening
 * picture the people the camera points out by name and office. Read-only.
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
    corePlaceByKey(
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
  const placeOf = (picture: Picture | undefined, sentence: OpeningSentence) =>
    picture?.places
      .map((row) => resolve(row, sentence))
      .find((row) => PICTURED.has(row));
  const castOf = (key: string | undefined) => {
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
  const stageOf = stageOfLevel(story.sequence);
  const stages = new Map(story.sequence.map((row) => [row.stage, row]));
  /** Who stands on a stage: the President on theirs, the player with their family. */
  const stageCast = (stage: string) => [
    ...(stage === "president"
      ? [{ id: story.president.id, name: story.president.name }]
      : stage === "family"
        ? [{ id: playerId, name: `${player.givenName} ${player.familyName}` }]
        : []),
    ...(stages.get(stage)?.people ?? []).map(({ id, name }) => ({ id, name })),
  ];
  const frames: {
    stage: string;
    place: string;
    backdrop: ReturnType<typeof backdropFile>;
    cast: { id: string; name: string; title?: string }[];
    people: ReturnType<typeof stagePeople>["people"];
    /**
     * Who the camera points out here, by name and office: on the line that
     * names them (`line`, an index into `lines`), or as the frame opens.
     */
    pointOut: (OpeningFigure & { line?: number })[];
    /** Who says the lines: the anchor's lead-in, else the President. */
    speaker?: "anchor";
    lines: { text: string; sourceRecordIds: readonly string[] }[];
  }[] = [];
  // What the player is watching, first (owner, Oct 14, 2026): their own
  // household at home that evening, the anchor leading into the address.
  const household = stages.get("family")?.people ?? [];
  if (story.lead.length) {
    const place = homeOf(core, playerId, OPENING_EVENING_MINUTE);
    const cast = [
      { id: playerId, name: `${player.givenName} ${player.familyName}` },
      ...household.map(({ id, name }) => ({ id, name })),
    ];
    frames.push({
      stage: "home",
      place,
      backdrop: backdropFile(place, OPENING_EVENING_MINUTE),
      cast,
      people: stagePeople(core, place, cast).people,
      pointOut: [...household],
      speaker: "anchor",
      lines: [...story.lead],
    });
  }
  const order = story.sequence.map((row) => row.stage);
  const opened = new Set<string>();
  const stagePlace = new Map<string, string>();
  /** A stage's opening picture, where the people it points out stand. */
  const openStage = (stage: string, sentence: OpeningSentence) => {
    opened.add(stage);
    const place =
      placeOf(RULES.stagesByKind?.[story.speechKind]?.[stage], sentence) ??
      placeOf(RULES.stages[stage], sentence) ??
      placeOf(RULES.stages.president, sentence) ??
      "";
    stagePlace.set(stage, place);
    return place;
  };
  const push = (
    stage: string,
    place: string,
    cast: { id: string; name: string; title?: string }[],
    pointOut: OpeningFigure[],
    lines: OpeningSentence[],
  ) => {
    const last = frames.at(-1);
    if (place === last?.place && !last.speaker) {
      last.lines.push(...lines);
      last.pointOut.push(...pointOut);
      return;
    }
    frames.push({
      stage,
      place,
      backdrop: backdropFile(place, minute),
      cast,
      people: stagePeople(core, place, cast).people,
      pointOut,
      lines,
    });
  };
  let next = 0;
  for (const sentence of story.address.sentences) {
    const stage = stageOf.get(sentence.level) ?? order[0]!;
    // A stage the address says nothing over still has its shot, in order:
    // the camera passes its people before the next part of the address.
    for (; next < order.indexOf(stage); next += 1) {
      const skipped = order[next]!;
      const people = stages.get(skipped)?.people ?? [];
      if (opened.has(skipped) || !people.length) continue;
      const place = openStage(skipped, sentence);
      if (place) push(skipped, place, stageCast(skipped), [...people], []);
    }
    next = Math.max(next, order.indexOf(stage));
    const first = !opened.has(stage);
    const onStage = first ? openStage(stage, sentence) : stagePlace.get(stage)!;
    const place = first
      ? onStage
      : (placeOf(cutawayFor(sentence), sentence) ?? onStage);
    if (!place) {
      frames.at(-1)?.lines.push(sentence);
      continue;
    }
    const cut = place !== onStage;
    push(
      stage,
      place,
      cut ? castOf(cutawayFor(sentence)?.cast) : stageCast(stage),
      // The household was introduced in the lead-in at home.
      first && !(stage === "family" && story.lead.length)
        ? [...(stages.get(stage)?.people ?? [])]
        : [],
      [sentence],
    );
  }
  // Each person named in the address is pointed out on the line naming them.
  for (const frame of frames)
    frame.pointOut = frame.pointOut.map((figure) => {
      if (figure.namedBy === undefined) return figure;
      const said = story.address.sentences[figure.namedBy];
      const line = frame.lines.findIndex((row) => row === said);
      return line >= 0 ? { ...figure, line } : figure;
    });
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
      // Office and state (owner, Oct 14, 2026: "President · Arkansas ·
      // Governor" read as nonsense); a former office only as the bank says it.
      detail: [story.president.homeState].filter((text): text is string =>
        Boolean(text),
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
