import { coreAPI } from "../core2/state";
import { townSeats } from "../core2/modules/offices";
import { corePlaceByKey } from "../core2/place-lookup";
import { capitolPlaceFor } from "./backdrop-places";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import {
  backdropFile,
  stagePeople,
  homeOf,
  orgPlace,
  type StageReason,
} from "./scene";
import { fillInPerson } from "../core2/state";
import { residentsRuntime } from "../core2/modules/residents";
import pictures from "./data/opening-pictures.json" with { type: "json" };
import type { CoreState } from "../core2/types";
import type { OpeningSentence, OpeningStory } from "../director/opening-story";
import { stageOfLevel, type OpeningFigure } from "../director/opening-sequence";

// The opening (owner, Oct 14 and Oct 26, 2026): the President's address, full
// screen, sentence by sentence in the speech box, the picture cutting to what
// each sentence is about; the first frame is the address itself. Home comes
// after the governor and the family, where that night's news can be picked up.
// The address plays over the director's sequence (owner, Oct 14, 2026,
// late): the President's stage, Congress, the state, the family, then home.
// Every word is the director's opening story, composed by the English engine
// at loading; this file only chooses the pictures and who stands in them.

/** The evening of the opening day, when the household has the news on. */
export const OPENING_EVENING_MINUTE = 20 * 60 + 30;

/** The most people a cutaway shows. */
const MOST_IN_A_CUTAWAY = 4;

const PICTURED = new Set(
  manifest.backdrops
    .filter((row) => row.variant === "midday")
    .map((row) => row.place),
);

interface Picture {
  places: string[];
  /** Who stands in it: a key of "cast" (the offices' holders). */
  cast?: string;
}
const RULES = pictures as unknown as {
  stages: Record<string, Picture>;
  /** A stage's picture for one kind of address, where it differs (the State of the Union is given on the House floor). */
  stagesByKind?: Record<string, Record<string, Picture>>;
  facts: (Picture & { facts: string[] })[];
  /** A figure the town has, and the kinds of employer whose own picture shows it. */
  cutaways: { facts: string[]; kinds: string[] }[];
  levels: Record<string, Picture>;
  cast: Record<string, string[][]>;
  hour: number;
};

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
  // A cutaway shows the town's own employer for the figure and the people who
  // work there, never an empty room (owner, Oct 26): the largest employer of
  // a listed kind in the player's town or county, pictured by its own record.
  const town = new Set<string>(
    [player.placeId, player.countyId].filter(
      (id): id is NonNullable<typeof id> => Boolean(id),
    ),
  );
  let employers:
    { classification: string; place: string; workers: string[] }[] | undefined;
  const employersOf = () => {
    if (employers) return employers;
    const jobsAt = new Map<string, Set<string>>();
    const add = (orgId: string, personId: string) =>
      jobsAt.set(orgId, (jobsAt.get(orgId) ?? new Set()).add(personId));
    for (const job of core.jobs.values())
      if (!job.endsAt) add(job.organizationId, job.personId);
    for (const job of residentsRuntime(core)?.jobs.values() ?? [])
      add(job.organizationId, job.personId);
    employers = [...core.organizations.values()]
      .filter((org) => town.has(org.placeId) && jobsAt.has(org.id))
      .sort(
        (a, b) =>
          jobsAt.get(b.id)!.size - jobsAt.get(a.id)!.size ||
          a.id.localeCompare(b.id),
      )
      .flatMap((org) => {
        const place = orgPlace(core, org.id);
        return place && PICTURED.has(place) && org.classification
          ? [
              {
                classification: org.classification,
                place,
                workers: [...jobsAt.get(org.id)!].sort(),
              },
            ]
          : [];
      });
    return employers;
  };
  const workersOf = (ids: readonly string[]) =>
    ids.slice(0, MOST_IN_A_CUTAWAY).flatMap((id) => {
      if (!core.people.has(id)) fillInPerson(core, id);
      const person = core.people.get(id);
      return person?.alive
        ? [{ id, name: `${person.givenName} ${person.familyName}` }]
        : [];
    });
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
  /** A sentence's cutaway: the town's employer for its figure, else its part of the address's picture. */
  const cutawayOf = (
    sentence: OpeningSentence,
  ):
    | { place: string; cast: { id: string; name: string; title?: string }[] }
    | undefined => {
    const rule = RULES.cutaways.find((row) =>
      row.facts.some((key) => sentence.facts.includes(key)),
    );
    if (rule) {
      const employer = employersOf().find((row) =>
        rule.kinds.includes(row.classification),
      );
      const cast = employer ? workersOf(employer.workers) : [];
      return employer && cast.length
        ? { place: employer.place, cast }
        : undefined;
    }
    const picture =
      RULES.facts.find((row) =>
        row.facts.some((key) => sentence.facts.includes(key)),
      ) ?? RULES.levels[sentence.level];
    const place = placeOf(picture, sentence);
    return place ? { place, cast: castOf(picture?.cast) } : undefined;
  };
  const stageOf = stageOfLevel(story.sequence);
  // Names are read by id from the current records: the creator may have
  // renamed the player's household since the story was composed, and the
  // camera's labels must say who the records now say.
  const nameNow = (id: string, name: string) => {
    const person = core.people.get(id);
    return person ? `${person.givenName} ${person.familyName}` : name;
  };
  const stages = new Map(
    story.sequence.map((row) => [
      row.stage,
      {
        ...row,
        people: row.people.map((figure) => ({
          ...figure,
          name: nameNow(figure.id, figure.name),
        })),
      },
    ]),
  );
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
    lines: { text: string; sourceRecordIds: readonly string[] }[];
  }[] = [];
  // Why each person stands in an opening frame: the player, their household
  // (at the family stage, after the governor), or someone the address names.
  const household = stages.get("family")?.people ?? [];
  const householdIds = new Set(household.map((row) => row.id));
  const withReasons = (cast: readonly { id: string; name: string }[]) =>
    cast.map((row) => ({
      ...row,
      reason: (row.id === playerId
        ? "you"
        : householdIds.has(row.id)
          ? "household"
          : "named") as StageReason,
    }));
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
  // Whoever the camera points out is drawn in the frame, first after the
  // frame's own cast; a tag never names someone the picture does not show.
  const drawn = (
    place: string,
    cast: { id: string; name: string; title?: string }[],
    pointOut: readonly OpeningFigure[],
  ) => {
    const ids = new Set(cast.map((row) => row.id));
    const all = [
      ...cast,
      ...pointOut
        .filter((row) => !ids.has(row.id))
        .map(({ id, name, office }) => ({ id, name, title: office ?? "" })),
    ];
    const people = stagePeople(
      core,
      place,
      withReasons(all),
      story.president.id,
    ).people;
    return { all, people };
  };
  const push = (
    stage: string,
    place: string,
    cast: { id: string; name: string; title?: string }[],
    pointOut: OpeningFigure[],
    lines: OpeningSentence[],
  ) => {
    const last = frames.at(-1);
    if (place === last?.place) {
      const { all, people } = drawn(
        place,
        [...last.cast],
        [...last.pointOut, ...pointOut],
      );
      last.lines.push(...lines);
      last.pointOut.push(...pointOut);
      last.cast = all;
      last.people = people;
      return;
    }
    const { all, people } = drawn(place, cast, pointOut);
    frames.push({
      stage,
      place,
      backdrop: backdropFile(place, minute),
      cast: all,
      people,
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
    if (!onStage) {
      frames.at(-1)?.lines.push(sentence);
      continue;
    }
    // After a stage's own picture, a sentence about the town's figures or a
    // part of the address cuts away, when the records give it somewhere with
    // somebody in it; otherwise it stays on the stage.
    const cut = first ? undefined : cutawayOf(sentence);
    if (cut && cut.place !== onStage && cut.cast.length)
      push(stage, cut.place, cut.cast, [], [sentence]);
    else
      push(
        stage,
        onStage,
        stageCast(stage),
        first ? [...(stages.get(stage)?.people ?? [])] : [],
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
  // A tag only over a person the frame draws.
  for (const frame of frames)
    frame.pointOut = frame.pointOut.filter((figure) =>
      frame.people.some((row) => row.personId === figure.id),
    );
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
      // The office alone (owner, Oct 26: "President · Michigan" read as where
      // the player is); the President's home state is not part of his tag.
      detail: [] as string[],
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
