import { beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { createPressReadingWorld } from "../../../tests/e2e/support/press-reading-world";
import { PRESS_STORY_EVENT_TYPE } from "../../simulation/public-information-integrity";
import { readPressPublication } from "../../simulation/press/read-publication";
import {
  deserializeWorld,
  serializeWorld,
} from "../../simulation/serialization";
import { projectRoomMedia } from "../../presentation/room-media";
import {
  ROOM_TELEVISION_SLOT_ID,
  ROOM_PAPERS_SLOT_ID,
} from "../../presentation/room-media";
import { projectLivingSceneSurface } from "../../presentation/living-scene-surfaces";
import { roomPressPublicationId } from "../room-press-read";
import {
  projectNewsFrontPage,
  projectNewsArticle,
} from "../../presentation/news-front-page";
import { publishPublicEvent } from "../../simulation/public-information";
import { NewsDesk } from "./NewsDesk";
import type { World } from "../../simulation/types";

describe("explicit press-story reads", () => {
  let f: ReturnType<typeof createPressReadingWorld>;
  beforeAll(() => {
    f = createPressReadingWorld("press-story-learning:generated-opening");
  });
  const publication = () => {
    const id = projectRoomMedia(f.world, f.personId).broadcast?.story
      ?.publicationId;
    const row = f.world.history.publications?.find((entry) => entry.id === id);
    if (!row)
      throw new Error("The actual room broadcast publication is required.");
    return row;
  };
  it("uses actual canonical publications from a generated world", () => {
    const publications = f.world.history.publications ?? [];
    expect(publications.length).toBeGreaterThan(0);
    for (const row of publications)
      expect(
        f.world.history.events.find((event) => event.id === row.sourceEventId)
          ?.type,
      ).toBe(PRESS_STORY_EVENT_TYPE);
  });
  it("keeps front-page projection, article projection and render informational", () => {
    const before = serializeWorld(f.world);
    let calls = 0;
    projectNewsFrontPage(f.world, "front", null);
    projectNewsArticle(f.world, publication().id);
    projectRoomMedia(f.world, f.personId);
    for (const context of ["read", "around", "directory", "press"] as const) {
      renderToStaticMarkup(
        <NewsDesk
          world={f.world}
          context={context}
          onContextChange={() => {}}
          mode="front"
          outletKey={null}
          onModeChange={() => {}}
          onOutletChange={() => {}}
          onOpenPerson={() => {}}
          onReadPublication={() => {
            calls += 1;
          }}
          around={null}
          directory={null}
          press={null}
        />,
      );
    }
    expect(calls).toBe(0);
    expect(serializeWorld(f.world)).toBe(before);
  });
  it("learns exactly the selected public story and media reference without spending time", () => {
    const row = publication();
    const before = f.world;
    const next = readPressPublication(before, f.personId, row.id);
    const added = next.history.knowledge.filter(
      (entry) =>
        !before.history.knowledge.some((prior) => prior.id === entry.id),
    );
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      personId: f.personId,
      eventId: row.sourceEventId,
      learnedAt: before.currentDate,
      source: { kind: "media", outlet: row.outletName, reference: row.id },
    });
    expect(next.currentMoment).toBe(before.currentMoment);
    expect(next.history.events).toBe(before.history.events);
    expect(next.history.publications).toBe(before.history.publications);
    expect(next.history.resourceTransferOutcomes).toBe(
      before.history.resourceTransferOutcomes,
    );
    writeFileSync(
      "/tmp/team6-press-generated-proof.json",
      JSON.stringify(
        {
          seed: f.seed,
          worldId: next.id,
          place: f.place.displayName,
          date: next.currentDate,
          personId: f.personId,
          publication: row,
          sourceEvent: next.history.events.find(
            (event) => event.id === row.sourceEventId,
          ),
          basisEvents: f.sources,
          assignmentAndEditorialDecisions: next.history.decisionTraces.filter(
            (trace) => trace.stableKey.startsWith(f.seed),
          ),
          knowledge: added,
          consultedLaw: "no law consulted by the explicit reading route",
          fixtureBoundary:
            "Generated opening records; controlled existing reporter assignment/work/editorial pipeline, not autonomous newsroom delivery.",
        },
        null,
        2,
      ),
    );
  });
  it("makes explicit reopening idempotent before and after canonical save/reload", () => {
    const row = publication();
    const next = readPressPublication(f.world, f.personId, row.id);
    expect(readPressPublication(next, f.personId, row.id)).toBe(next);
    const loaded = deserializeWorld(serializeWorld(next));
    const before = serializeWorld(loaded);
    expect(readPressPublication(loaded, f.personId, row.id)).toBe(loaded);
    expect(serializeWorld(loaded)).toBe(before);
  });
  it("admits only the actual displayed room story and refuses a quiet paper's generic lead", () => {
    const room = projectRoomMedia(f.world, f.personId);
    const shown = publication();
    const record = projectLivingSceneSurface(f.world, f.personId, {
      kind: "news",
      publicationId: shown.id,
    });
    expect(roomPressPublicationId(room, ROOM_TELEVISION_SLOT_ID, record)).toBe(
      shown.id,
    );
    expect(room.frontPage?.story).toBeNull();
    expect(
      roomPressPublicationId(room, ROOM_PAPERS_SLOT_ID, record),
    ).toBeNull();
  });
  it("leaves observer and a different reader informational", () => {
    const row = publication();
    const observer: World = { ...f.world, control: { kind: "observer" } };
    expect(readPressPublication(observer, f.personId, row.id)).toBe(observer);
    const other = f.world.personOrder.find((id) => id !== f.personId)!;
    expect(readPressPublication(f.world, other, row.id)).toBe(f.world);
  });
  it("does not broaden unsupported published public-record kinds into press learning", () => {
    const world = publishPublicEvent(f.world, {
      stableKey: `${f.seed}:raw-record`,
      sourceEventId: f.sources[0]!.id,
    });
    const raw = world.history.publications!.at(-1)!;
    expect(readPressPublication(world, f.personId, raw.id)).toBe(world);
  });
});
