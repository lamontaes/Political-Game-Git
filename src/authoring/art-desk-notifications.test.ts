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
import { artDeskCards } from "./art-desk-cards";

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

  it("includes team notes without inventing a reply and excludes owner/system posts", () => {
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
    expect(
      artDeskNotifications(projection).map((item) => item.eventId),
    ).toEqual(["worker-reply", "team-note", "first-reply"]);
    expect(artDeskNotifications(projection)[1]).toMatchObject({
      eventId: "team-note",
      replyTo: null,
      unread: true,
      candidateId: "original",
    });
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

  it("removes all five owner-withdrawn gen17 notices while preserving history and unrelated messages", () => {
    const withdrawn = [
      "cand-1ad90f86-0c36-f49d-c7bc-cfeec996d0dd",
      "cand-a4c436e2-e2f7-ab8d-a922-35ca7051d96e",
      "cand-4f83f9e6-aea8-4a4c-2331-133f8c9097c7",
      "cand-7f280814-5743-bab6-9cc3-c5d6edd12985",
      "cand-8c4627f3-a938-374f-154f-ecf6b12d6c50",
    ];
    const original = projectArtbench({
      registryRequests: [],
      events: [image("reference", 1)],
    }).requests.inbox!.request;
    const requestOne = { ...original, requestId: "1", title: "Request 1" };
    const ingested = withdrawn.map((id, index) => image(id, index + 1));
    const notes = withdrawn.map((id, index) => ({
      ...message(`withdrawn-note-${index}`, index + 6, "note", "agent"),
      payload: {
        ...message(`withdrawn-note-${index}`, index + 6, "note", "agent")
          .payload,
        candidateId: id,
      },
    }));
    const unrelated = {
      ...message("unrelated-inbox-note", 11, "note", "worker"),
      payload: {
        ...message("unrelated-inbox-note", 11, "note", "worker").payload,
        candidateId: undefined,
      },
    };
    const requestOneNote: ArtbenchEventOf<
      "message.posted",
      ArtbenchMessagePayload
    > = {
      ...message("unrelated-request-one-note", 12, "note", "worker"),
      payload: {
        requestId: "1",
        kind: "note",
        text: "Request 1 remains active",
      },
    };
    const archiveTags: ArtbenchEvent[] = withdrawn.map((id, index) => ({
      ...ingested[index]!,
      eventId: `archive-${index}`,
      seq: index + 13,
      type: "tags.set",
      payload: {
        entity: "candidate",
        entityId: id,
        tags: { reviewQueue: [`${id}:archived`] },
        baseVersion: 0,
        author: { kind: "owner", id: "fixture-owner" },
      },
    }));
    const before = projectArtbench({
      registryRequests: [requestOne],
      events: [...ingested, ...notes, unrelated, requestOneNote],
    });
    const after = projectArtbench({
      registryRequests: [requestOne],
      events: [...ingested, ...notes, unrelated, requestOneNote, ...archiveTags],
    });
    expect(artDeskNotifications(before)).toHaveLength(7);
    expect(artDeskNotifications(after).map((item) => item.eventId)).toEqual([
      "unrelated-request-one-note",
      "unrelated-inbox-note",
    ]);
    for (const id of withdrawn) {
      expect(after.candidates[id].qa).toBe(false);
      expect(after.candidates[id].decisions).toHaveLength(0);
      expect(after.candidates[id].tags.reviewQueue).toContain(`${id}:archived`);
    }
    expect(artDeskCards(after).some((card) => card.tabs.includes("archived")))
      .toBe(true);
  });
});
