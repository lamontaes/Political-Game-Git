import { describe, expect, it } from "vitest";
import {
  ARTBENCH_CONTRACT_VERSION,
  projectArtbench,
  type ArtbenchActorKind,
  type ArtbenchEvent,
  type ArtbenchEventOf,
  type ArtbenchMessagePayload,
} from "./artbench";
import { artDeskNotifications } from "./art-desk-notifications";

function image(id: string, seq: number, parent?: string): ArtbenchEvent {
  return {
    contractVersion: ARTBENCH_CONTRACT_VERSION,
    eventId: `image-${id}`,
    seq,
    at: `2026-09-20T00:0${seq}:00Z`,
    actor: { kind: "worker", id: "artist" },
    source: "bench",
    origin: "store-test",
    type: "candidate.ingested",
    payload: {
      candidateId: id,
      requestId: "inbox",
      assetId: "asset:inbox",
      requestVersion: 1,
      sha256: id.padEnd(64, "0").slice(0, 64),
      byteLength: 10,
      container: "png",
      width: 1600,
      height: 1000,
      hasAlpha: false,
      storagePath: `bytes/${id}.png`,
      parentCandidateId: parent,
      editKind: parent ? "repaint" : "original",
      nativeDetail: "derived",
      calibrationRecheck: [],
      provenance: { originalName: `${id}.png` },
    },
  };
}

function message(
  id: string,
  seq: number,
  kind: ArtbenchMessagePayload["kind"],
  actor: ArtbenchActorKind,
  replyTo?: string,
): ArtbenchEventOf<"message.posted", ArtbenchMessagePayload> {
  return {
    contractVersion: ARTBENCH_CONTRACT_VERSION,
    eventId: id,
    seq,
    at: "2026-09-20T00:03:00Z",
    actor: { kind: actor, id: actor === "owner" ? "owner" : "artist" },
    source: "bench",
    origin: "store-test",
    type: "message.posted",
    payload: {
      requestId: "inbox",
      candidateId: "original",
      kind,
      text: id,
      replyTo,
    },
  };
}

const base: ArtbenchEvent[] = [
  image("original", 1),
  message("owner-question", 2, "question", "owner"),
  message("first-reply", 3, "reply", "agent", "owner-question"),
];

describe("Art Desk reply notifications", () => {
  it("keeps the exact replied-to artwork when a newer revision arrives", () => {
    const projection = projectArtbench({
      registryRequests: [],
      events: [...base, image("newer", 4, "original")],
    });
    const before = JSON.stringify(projection);
    const [notification] = artDeskNotifications(projection);
    expect(notification).toMatchObject({
      eventId: "first-reply",
      requestId: "inbox",
      candidateId: "original",
      replyTo: "owner-question",
      authorId: "artist",
      unread: true,
      text: "first-reply",
    });
    expect(notification!.cardKey).toBeTruthy();
    expect(notification!.title).not.toContain("newer");
    expect(JSON.stringify(projection)).toBe(before);
  });

  it("excludes owner posts, unrelated team notes and system events", () => {
    const projection = projectArtbench({
      registryRequests: [],
      events: [
        ...base,
        message("owner-reply", 4, "reply", "owner", "owner-question"),
        message("team-note", 5, "note", "worker"),
        message("system-reply", 6, "reply", "system", "owner-question"),
        message("worker-reply", 7, "reply", "worker", "owner-question"),
      ],
    });
    expect(artDeskNotifications(projection).map((item) => item.eventId)).toEqual([
      "worker-reply",
      "first-reply",
    ]);
  });

  it("acknowledges exact event IDs without hiding an older late-arriving reply", () => {
    const late = message("late-reply", 4, "reply", "worker", "owner-question");
    const projection = projectArtbench({
      registryRequests: [],
      events: [...base, { ...late, at: "2026-09-19T20:00:00Z" }],
    });
    expect(
      artDeskNotifications(projection, ["first-reply"]).map((item) => [
        item.eventId,
        item.unread,
      ]),
    ).toEqual([
      ["late-reply", true],
      ["first-reply", false],
    ]);
  });

  it("does not surface replies on disposable QA candidates", () => {
    const projection = projectArtbench({ registryRequests: [], events: base });
    const qaProjection = {
      ...projection,
      candidates: {
        ...projection.candidates,
        original: { ...projection.candidates.original!, qa: true },
      },
    };
    expect(artDeskNotifications(qaProjection)).toEqual([]);
  });
});
