import type { EntityId, World } from "../simulation";
import { mediaOutlets, stateOfJurisdiction } from "../simulation/press/outlets";
import {
  mediaOutletKey,
  type MediaOutletRecord,
} from "../simulation/press/records";
import { projectPublicInformationPanel } from "./public-information-adapters";
import { proseDate, proseWeekdayDate } from "./prose-dates";

/**
 * The television and the newspaper in the player's room, as a broadcast and
 * a front page that change with the day.
 *
 * Both are drawn from outlets the world already has. The station is the
 * broadcaster serving the player's town, else the state's, else the national
 * one; the paper is the town's own paper, else the state's newsroom, else a
 * national paper. Nothing is invented for one player: two lives in the same
 * town see the same station and the same masthead.
 *
 * What they show is what was published. The station leads with its own story
 * of the day; with none, it shows its evening program card, and its ticker
 * carries the day's headlines from every outlet, each named. The paper leads
 * with its own story of the day; with none, its front page shows the date of
 * its latest edition. Neither is ever blank.
 */

/** Four looks for each kind of surface, chosen by the outlet's own identity. */
export const ROOM_MEDIA_LOOKS = 4;

export interface RoomOutlet {
  readonly outletId: EntityId;
  readonly outletKey: string;
  readonly name: string;
  /** 0 to 3: which of the four station or front-page looks this outlet wears. */
  readonly look: number;
}

export interface RoomStory {
  readonly publicationId: EntityId;
  readonly outletName: string;
  readonly headline: string;
  /** The report's first sentence, when it says more than the headline. */
  readonly deck: string | null;
  readonly body: string;
  readonly publishedAt: string;
}

/** The TV slot and the papers slot, in every home scene that has them. */
export const ROOM_TELEVISION_SLOT_ID = "living-room-television";
export const ROOM_PAPERS_SLOT_ID = "coffee-table-papers";

function firstSentence(body: string): string {
  const match = /^.*?[.!?](?=\s|$)/s.exec(body.trim());
  return (match ? match[0] : body).trim();
}

export interface RoomBroadcast {
  readonly station: RoomOutlet;
  /** The station's own story of the day, when it has one. */
  readonly story: RoomStory | null;
  /** Shown when the station has no story of its own today. */
  readonly card: { readonly title: string; readonly detail: string } | null;
  /** The day's headlines from every outlet, each with its outlet's name. */
  readonly ticker: readonly string[];
}

export interface RoomFrontPage {
  readonly paper: RoomOutlet;
  /** "Monday, January 5, 2026": the edition's date. */
  readonly dateLine: string;
  readonly place: string | null;
  /** The paper's own lead for today, when it has one. */
  readonly story: RoomStory | null;
  /** Without a lead today, the date of its latest edition, if any. */
  readonly latestEdition: string | null;
}

export interface RoomMedia {
  readonly broadcast: RoomBroadcast | null;
  readonly frontPage: RoomFrontPage | null;
}

function lookOf(stableKey: string): number {
  let hash = 0;
  for (const char of stableKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % ROOM_MEDIA_LOOKS;
}

function roomOutlet(outlet: MediaOutletRecord): RoomOutlet {
  return {
    outletId: outlet.id,
    outletKey: mediaOutletKey(outlet.id),
    name: outlet.name,
    look: lookOf(outlet.stableKey),
  };
}

/** Town first, then its state, then a national outlet; ties by founding order. */
function nearest(
  world: World,
  homeId: EntityId,
  outlets: readonly MediaOutletRecord[],
): MediaOutletRecord | null {
  const stateId = stateOfJurisdiction(world, homeId);
  const bySequence = [...outlets].sort((a, b) => a.sequence - b.sequence);
  return (
    bySequence.find((outlet) =>
      outlet.primaryJurisdictionIds.includes(homeId),
    ) ??
    (stateId
      ? bySequence.find((outlet) =>
          outlet.primaryJurisdictionIds.includes(stateId),
        )
      : undefined) ??
    bySequence.find((outlet) => outlet.scope === "national") ??
    null
  );
}

export function roomStation(
  world: World,
  personId: EntityId,
): RoomOutlet | null {
  const home = world.people[personId]?.homeJurisdictionId;
  if (!home) return null;
  const station = nearest(
    world,
    home,
    mediaOutlets(world).filter((outlet) =>
      outlet.mediums.includes("broadcast"),
    ),
  );
  return station ? roomOutlet(station) : null;
}

export function roomPaper(world: World, personId: EntityId): RoomOutlet | null {
  const home = world.people[personId]?.homeJurisdictionId;
  if (!home) return null;
  const paper = nearest(
    world,
    home,
    // A town's own paper may be a community outlet printed as a newsletter;
    // a broadcaster is never the paper.
    mediaOutlets(world).filter(
      (outlet) =>
        outlet.product === "general-newspaper" ||
        outlet.product === "community-outlet" ||
        outlet.product === "state-newsroom",
    ),
  );
  return paper ? roomOutlet(paper) : null;
}

export function projectRoomMedia(world: World, personId: EntityId): RoomMedia {
  const today = world.currentDate;
  const items = projectPublicInformationPanel(world).items.filter(
    (item) => item.publicationTime <= today,
  );
  const storyOf = (item: (typeof items)[number]): RoomStory => {
    const deck = firstSentence(item.body);
    return {
      publicationId: item.publicationId,
      outletName: item.outletName,
      headline: item.readerHeadline,
      deck: deck && deck !== item.readerHeadline ? deck : null,
      body: item.body,
      publishedAt: item.publicationTime,
    };
  };
  const newest = (a: (typeof items)[number], b: (typeof items)[number]) =>
    b.publicationTime.localeCompare(a.publicationTime);

  const station = roomStation(world, personId);
  const broadcast: RoomBroadcast | null = station
    ? (() => {
        const own = items
          .filter(
            (item) =>
              item.outletKey === station.outletKey &&
              item.publicationTime === today,
          )
          .sort(newest)[0];
        const ticker = items
          .filter((item) => item.publicationTime === today)
          .sort(newest)
          .filter((item) => item.publicationId !== own?.publicationId)
          .slice(0, 3)
          .map((item) => `${item.outletName}: ${item.readerHeadline}`);
        return {
          station,
          story: own ? storyOf(own) : null,
          card: own
            ? null
            : { title: "Evening News at 6", detail: proseWeekdayDate(today) },
          ticker,
        };
      })()
    : null;

  const paper = roomPaper(world, personId);
  const home = world.people[personId]?.homeJurisdictionId;
  const frontPage: RoomFrontPage | null = paper
    ? (() => {
        const editions = items
          .filter((item) => item.outletKey === paper.outletKey)
          .sort(newest);
        const lead = editions.find((item) => item.publicationTime === today);
        return {
          paper,
          dateLine: proseWeekdayDate(today),
          place: home ? (world.jurisdictions[home]?.name ?? null) : null,
          story: lead ? storyOf(lead) : null,
          latestEdition:
            lead || !editions[0]
              ? null
              : proseDate(editions[0].publicationTime),
        };
      })()
    : null;

  return { broadcast, frontPage };
}

/** The one line a surface binding carries, for tests and assistive text. */
export function roomBroadcastLine(broadcast: RoomBroadcast): string {
  return broadcast.story
    ? `${broadcast.station.name}: ${broadcast.story.headline}`
    : `${broadcast.station.name}: ${broadcast.card!.title}`;
}

export function roomFrontPageLine(frontPage: RoomFrontPage): string {
  return frontPage.story
    ? `${frontPage.paper.name}, ${frontPage.dateLine}: ${frontPage.story.headline}`
    : `${frontPage.paper.name}, ${frontPage.dateLine}`;
}
