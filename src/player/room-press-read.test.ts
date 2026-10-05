import type { EntityId, IsoDate } from "../simulation";
import { describe, expect, it } from "vitest";
import type { LivingSurfaceRecord } from "../presentation/living-scene-surfaces";
import {
  ROOM_PAPERS_SLOT_ID,
  ROOM_TELEVISION_SLOT_ID,
  type RoomMedia,
} from "../presentation/room-media";
import { EMPTY_SURFACE_PROJECTION } from "../presentation/surface-projection";
import { roomPressPublicationId } from "./room-press-read";

const story = {
  publicationId: "controlled-publication" as EntityId,
  outletName: "Recorded outlet",
  headline: "Recorded story",
  deck: null,
  body: "Recorded body",
  publishedAt: "2026-01-05" as IsoDate,
};
const outlet = {
  outletId: "controlled-outlet" as EntityId,
  outletKey: "controlled-key",
  name: story.outletName,
  look: 0,
};
const media: RoomMedia = {
  broadcast: { station: outlet, story, card: null, ticker: [] },
  frontPage: {
    paper: outlet,
    dateLine: "Recorded date",
    place: null,
    story,
    latestEdition: null,
  },
};
const record: LivingSurfaceRecord = {
  kind: "news",
  status: "bound",
  revision: "controlled",
  heading: story.headline,
  masthead: story.outletName,
  lines: [story.body],
  dateLabel: null,
  recordIds: [story.publicationId],
  detail: {
    kind: "article",
    article: {
      id: story.publicationId,
      headline: story.headline,
      readerHeadline: story.headline,
      sourceEventId: "controlled-source" as EntityId,
      sourceRecordIds: [],
      body: story.body,
      outletKey: outlet.outletKey,
      outletName: story.outletName,
      publishedAt: story.publishedAt,
      place: null,
      national: false,
      people: [],
      laws: [],
    },
  },
  projection: EMPTY_SURFACE_PROJECTION,
  symbolAssetId: null,
};

describe("exact room press-publication admission", () => {
  it("admits the same shown publication for TV and papers without changing projection", () => {
    const before = JSON.stringify({ media, record });
    expect(roomPressPublicationId(media, ROOM_TELEVISION_SLOT_ID, record)).toBe(
      story.publicationId,
    );
    expect(roomPressPublicationId(media, ROOM_PAPERS_SLOT_ID, record)).toBe(
      story.publicationId,
    );
    expect(JSON.stringify({ media, record })).toBe(before);
  });
  it("refuses another article, another slot, and empty or withheld surfaces", () => {
    expect(roomPressPublicationId(media, "lectern-notes", record)).toBeNull();
    expect(
      roomPressPublicationId(media, ROOM_PAPERS_SLOT_ID, {
        ...record,
        status: "withheld",
      }),
    ).toBeNull();
    expect(
      roomPressPublicationId(media, ROOM_PAPERS_SLOT_ID, {
        ...record,
        status: "empty",
      }),
    ).toBeNull();
    if (record.detail?.kind !== "article")
      throw new Error("Missing controlled article");
    expect(
      roomPressPublicationId(media, ROOM_PAPERS_SLOT_ID, {
        ...record,
        detail: {
          kind: "article",
          article: {
            ...record.detail.article,
            id: "other-publication" as EntityId,
          },
        },
      }),
    ).toBeNull();
  });
  it("does not turn day-lead fallback, program cards, or ticker text into learning", () => {
    const noShownStory: RoomMedia = {
      broadcast: {
        ...media.broadcast!,
        story: null,
        card: { title: "Program", detail: "Schedule" },
        ticker: [story.headline],
      },
      frontPage: { ...media.frontPage!, story: null },
    };
    expect(
      roomPressPublicationId(noShownStory, ROOM_TELEVISION_SLOT_ID, record),
    ).toBeNull();
    expect(
      roomPressPublicationId(noShownStory, ROOM_PAPERS_SLOT_ID, record),
    ).toBeNull();
    expect(
      roomPressPublicationId(media, ROOM_PAPERS_SLOT_ID, {
        ...record,
        detail: null,
      }),
    ).toBeNull();
  });
});
