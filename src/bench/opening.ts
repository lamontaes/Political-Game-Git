import { coreAPI } from "../core2/state";
import { townSeats } from "../core2/modules/offices";
import { lifePlaceByKey } from "../simulation/life-places";
import { capitolPlaceFor } from "../presentation/place-backdrops";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { backdropFile, stagePeople, homeOf } from "./scene";
import shots from "./data/opening-shots.json" with { type: "json" };
import type { CoreState } from "../core2/types";
import type { OpeningStory } from "../director/opening-story";

// The opening's shots show who holds each office from the records; the
// President's address, the evening news and the morning after come from the
// director's opening story, composed by the English engine at loading.

const PICTURED = new Set(
  manifest.backdrops
    .filter((row) => row.variant === "midday")
    .map((row) => row.place),
);

interface Shot {
  officeKinds?: string[][];
  family?: boolean;
  player?: boolean;
  newscast?: boolean;
  morning?: boolean;
  /** The parts of the address spoken over this shot. */
  speech?: string[];
  /** The hour the shot is lit for, when not the evening. */
  hour?: number;
  places: string[];
}

/** One line on screen: who says it and the record ids it came from. */
interface ShotLine {
  speaker: "president" | "anchor" | "reporter";
  text: string;
  /** "opening" and "remembered" lines of the address (Sept 28 ruling). */
  role?: "opening" | "remembered";
  headline?: string;
  sourceRecordIds: readonly string[];
}

/**
 * The opening: who governs the player's town, level by level, while the
 * President speaks; that night's news; then home on the morning of day two.
 * Without a story (an older world), the shots carry names only.
 */
export function openingShots(
  core: CoreState,
  playerId: string,
  story?: OpeningStory,
) {
  const player = core.people.get(playerId);
  if (!player) throw new Error("No such person.");
  const api = coreAPI(core);
  const seats = townSeats(api);
  const usps = lifePlaceByKey(
    api.state.placeMetadata.placeKey ?? "",
  )?.stateJurisdictionKey?.slice(3);
  const resolve = (place: string, minute: number) =>
    place === "capitol"
      ? capitolPlaceFor(usps ?? null)
      : place === "@home"
        ? homeOf(core, playerId, minute)
        : place;
  const out = [];
  for (const shot of shots.shots as Shot[]) {
    if ((shot.newscast || shot.morning) && !story) continue;
    const minute = (shot.hour ?? 20.5) * 60;
    const place = shot.places
      .map((row) => resolve(row, minute))
      .find((row) => PICTURED.has(row));
    if (!place) continue;
    let cast: {
      id: string;
      name: string;
      title?: string;
      detail?: string[];
    }[] = [];
    let lines: ShotLine[] = [];
    if (shot.officeKinds) {
      for (const kinds of shot.officeKinds) {
        cast = seats
          .filter((row) => kinds.includes(row.office.kind) && row.holder)
          .map(({ office, holder }) => ({
            id: holder!.personId ?? holder!.id,
            name: `${holder!.identity.givenName} ${holder!.identity.familyName}`,
            title: office.title,
          }));
        if (cast.length) break;
      }
      if (!cast.length) continue;
      // The President's own record: home state and the office before.
      if (story)
        cast = cast.map((row) =>
          row.id === story.president.id
            ? {
                ...row,
                detail: [
                  story.president.homeState,
                  story.president.priorOffice,
                ].filter((text): text is string => Boolean(text)),
              }
            : row,
        );
    } else if (shot.newscast) {
      lines = story!.newscast.flatMap((item) =>
        item.broadcast.map((line, index) => ({
          speaker: line.speaker,
          text: line.text,
          ...(index === 0 && item.headline ? { headline: item.headline } : {}),
          sourceRecordIds: item.sourceRecordIds,
        })),
      );
    } else if (shot.family || shot.morning) {
      const members = shot.morning
        ? story!.morning.memberIds
        : (core.households.get(player.householdId)?.memberIds ?? []);
      cast = members
        .filter(
          (id) =>
            (shot.morning || id !== playerId) && core.people.get(id)?.alive,
        )
        .map((id) => {
          const row = core.people.get(id)!;
          return { id, name: `${row.givenName} ${row.familyName}` };
        });
      if (!cast.length) continue;
    } else
      cast = [
        { id: playerId, name: `${player.givenName} ${player.familyName}` },
      ];
    // What the President says over this shot: the opening line first, then
    // the line people remember where its part of the address falls.
    if (story && shot.speech) {
      const { openingLine, rememberedLine } = story.address;
      const first = out.length === 0;
      if (first)
        lines.push({
          speaker: "president",
          text: openingLine.text,
          role: "opening",
          sourceRecordIds: openingLine.sourceRecordIds,
        });
      if (
        shot.speech.includes(rememberedLine.level) &&
        rememberedLine.text !== openingLine.text
      )
        lines.push({
          speaker: "president",
          text: rememberedLine.text,
          role: "remembered",
          sourceRecordIds: rememberedLine.sourceRecordIds,
        });
    }
    const { people } = stagePeople(core, place, cast);
    out.push({
      place,
      backdrop: backdropFile(place, minute),
      cast: cast.map(({ id, name, title, detail }) => ({
        id,
        name,
        title,
        ...(detail?.length ? { detail } : {}),
      })),
      people,
      lines,
      ...(shot.morning
        ? {
            date: story!.morning.date,
            // The subject the household can bring up: the address, quoted.
            subject: {
              eventId: story!.morning.subjectEventId,
              quote: story!.address.rememberedLine.text,
            },
          }
        : {}),
    });
  }
  return out;
}

/** The whole address, for the full text a tap away. */
export function openingAddress(story: OpeningStory | undefined) {
  return story
    ? {
        id: story.id,
        date: story.date,
        kind: story.speechKind,
        president: story.president,
        sentences: story.address.sentences,
      }
    : null;
}
