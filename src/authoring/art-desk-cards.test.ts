import { describe, expect, it } from "vitest";

import {
  artDeskCards,
  conciseChange,
  filterCards,
  tabCounts,
} from "./art-desk-cards";
import {
  ARTBENCH_CONTRACT_VERSION,
  projectArtbench,
  type ArtbenchEvent,
  type EditKind,
} from "./artbench";

let seq = 0;
function ingest(
  candidateId: string,
  editKind: EditKind,
  options: {
    parent?: string;
    family?: string;
    note?: string;
    at?: string;
    requestId?: string;
  } = {},
): ArtbenchEvent {
  seq += 1;
  return {
    contractVersion: ARTBENCH_CONTRACT_VERSION,
    eventId: `evt-${seq}`,
    seq,
    at: options.at ?? `2026-09-17T0${Math.min(seq, 9)}:00:00.000Z`,
    actor: { kind: "worker", id: "producer" },
    source: "inbox",
    origin: "store-test",
    type: "candidate.ingested",
    payload: {
      candidateId,
      assetId: "asset:inbox",
      requestId: options.requestId ?? "inbox",
      requestVersion: 1,
      sha256: candidateId.padEnd(64, "0").slice(0, 64),
      byteLength: 10,
      container: "png",
      width: 3840,
      height: 2160,
      hasAlpha: false,
      storagePath: `bytes/${candidateId}.png`,
      parentCandidateId: options.parent,
      editKind,
      note: options.note,
      provenance: { itemId: candidateId },
      nativeDetail: "derived",
      calibrationRecheck: [],
      inheritedTags: options.family
        ? { family: [options.family], assetType: ["environment-plate"] }
        : undefined,
    },
  } as ArtbenchEvent;
}

function projection(events: ArtbenchEvent[]) {
  return projectArtbench({ registryRequests: [], events });
}

const corridor = "school-corridor-generic";
const REVIEW_ID = "cand-7cb8ae76-50a4-f439-d468-75cb81da0959";

describe("Art Desk cards", () => {
  it("groups a delivery lineage into one named card led by the review copy", () => {
    const cards = artDeskCards(
      projection([
        ingest("cand-native", "original", { family: corridor }),
        ingest("cand-repaint", "repaint", {
          parent: "cand-native",
          family: corridor,
        }),
        ingest("cand-crop", "crop", {
          parent: "cand-repaint",
          family: corridor,
        }),
        ingest("cand-up", "upscale", { parent: "cand-crop", family: corridor }),
        ingest(REVIEW_ID, "other", {
          parent: "cand-up",
          family: corridor,
          note: "FINAL-REVIEW DERIVATIVE: exact 3840x2160 downsample. Pending owner review.",
        }),
      ]),
    );
    expect(cards).toHaveLength(1);
    const card = cards[0]!;
    expect(card.title).toBe("School corridor — fountain correction");
    expect(card.leadCandidateId).toBe(REVIEW_ID);
    expect(card.statusLabel).toBe("Awaiting review");
    expect(card.lineage.map((step) => step.stage)).toEqual([
      "review copy",
      "upscale",
      "16:9 crop",
      "repair",
      "original",
    ]);
    expect(card.otherVersions).toEqual([]);
    expect(card.versionCount).toBe(5);
    expect(card.tabs).toContain("needs-review");
    expect(card.title).not.toMatch(/rev\s*\d/i);
  });

  it("names unknown deliveries by scene and stage, never by revision", () => {
    const cards = artDeskCards(
      projection([
        ingest("cand-a", "original", { family: "park-community-pavilion" }),
        ingest("cand-b", "crop", {
          parent: "cand-a",
          family: "park-community-pavilion",
        }),
        ingest("cand-loose", "original"),
      ]),
    );
    const titles = cards.map((card) => card.title).sort();
    expect(titles).toContain("Park pavilion — 16:9 crop");
    expect(cards.find((c) => c.key.includes("cand-loose"))?.title).toMatch(
      /— original$/,
    );
  });

  it("counts tabs from the same cards and hides QA unless asked", () => {
    const events = [
      ingest("cand-x", "original", { family: corridor }),
      ingest("cand-qa", "original", {
        family: "neighborhood-doorstep-generic",
      }),
    ];
    const cards = artDeskCards(projection(events)).map((card) =>
      card.family === "neighborhood-doorstep-generic"
        ? { ...card, qa: true }
        : card,
    );
    expect(tabCounts(cards)).toEqual({
      "needs-review": 1,
      "in-progress": 0,
      "in-game": 0,
      library: 1,
    });
    expect(tabCounts(cards, true).library).toBe(2);
    expect(filterCards(cards, { tab: "library" })).toHaveLength(1);
    expect(
      filterCards(cards, { tab: "library", showQa: true, text: "doorstep" }),
    ).toHaveLength(1);
    expect(
      filterCards(cards, { tab: "library", family: corridor }),
    ).toHaveLength(1);
  });

  it("takes the purpose from a producer TITLE line", () => {
    const street = "small-town-main-street-generic";
    const card = artDeskCards(
      projection([
        ingest("cand-street", "original", { family: street }),
        ingest("cand-street-fix", "repaint", {
          parent: "cand-street",
          family: street,
          note: "TITLE: Small-town main street B - road markings (CRUNCH46 E2). STAGE: ready for owner review (not approved). CHANGES: painted a double yellow centerline. Bench untouched. OPEN ISSUE: none.",
        }),
      ]),
    )[0]!;
    expect(card.title).toBe("Main street — road markings");
    expect(card.change).toBe("painted a double yellow centerline.");
  });

  it("keeps the change line short and readable", () => {
    const card = artDeskCards(
      projection([
        ingest("cand-n", "upscale", {
          note: `UPSCALE: ${"very ".repeat(60)}long. Second sentence.`,
        }),
      ]),
    )[0]!;
    expect(card.change.length).toBeLessThanOrEqual(140);
    expect(card.change.startsWith("UPSCALE")).toBe(false);
    expect(conciseChange(undefined)).toBe("No version delivered yet.");
  });
});
