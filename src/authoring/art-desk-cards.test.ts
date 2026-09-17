import { describe, expect, it } from "vitest";

import {
  artDeskCards,
  candidateNotes,
  cardIsUntagged,
  cardMatchesFacet,
  conciseChange,
  filterCards,
  lineageOfCandidate,
  lineageSentence,
  originalDownloadName,
  tabCounts,
  viewedCandidateView,
} from "./art-desk-cards";
import {
  ARTBENCH_CONTRACT_VERSION,
  projectArtbench,
  type ArtbenchEvent,
  type EditKind,
  type TagSet,
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
    tags?: TagSet;
    originalName?: string;
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
      provenance: { itemId: candidateId, originalName: options.originalName },
      nativeDetail: "derived",
      calibrationRecheck: [],
      inheritedTags: options.family
        ? {
            family: [options.family],
            assetType: ["environment-plate"],
            ...(options.tags ?? {}),
          }
        : options.tags,
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

describe("Art Desk card facets", () => {
  const doorstep = "neighborhood-doorstep-generic";

  it("matches a facet recorded on a version that is not the lead", () => {
    const card = artDeskCards(
      projection([
        ingest("cand-plate", "original", {
          family: doorstep,
          tags: { region: ["alaska"], season: ["winter"] },
        }),
        ingest("cand-plate-up", "upscale", {
          parent: "cand-plate",
          family: doorstep,
          at: "2026-09-17T09:30:00.000Z",
        }),
      ]),
    )[0]!;
    expect(card.leadCandidateId).toBe("cand-plate-up");
    expect(cardMatchesFacet(card, "region", "alaska")).toBe(true);
    expect(cardMatchesFacet(card, "season", "winter")).toBe(true);
    expect(cardMatchesFacet(card, "region", "hawaii")).toBe(false);
    // assetType must come from the asset, not only from the lead's own tags.
    expect(card.assetType).toBe("environment-plate");
    expect(cardIsUntagged(card)).toBe(false);
  });

  it("reports a card with no tags anywhere as untagged", () => {
    const card = artDeskCards(
      projection([ingest("cand-bare", "original")]),
    )[0]!;
    expect(card.facets).toEqual({});
    expect(cardIsUntagged(card)).toBe(true);
    expect(cardMatchesFacet(card, "region", "alaska")).toBe(false);
  });
});

describe("Art Desk viewed version", () => {
  const street = "small-town-main-street-generic";

  it("keeps the viewed version's name and reports a newer arrival separately", () => {
    const view = projection([
      ingest("cand-street", "original", { family: street }),
      ingest("cand-street-a", "repaint", {
        parent: "cand-street",
        family: street,
        at: "2026-09-17T08:00:00.000Z",
        note: "TITLE: Main street B - road markings. CHANGES: centerline.",
      }),
      ingest("cand-street-b", "repaint", {
        parent: "cand-street",
        family: street,
        at: "2026-09-17T10:00:00.000Z",
        note: "TITLE: Main street B - kerb repair. CHANGES: kerb.",
      }),
    ]);
    const card = artDeskCards(view)[0]!;
    expect(card.leadCandidateId).toBe("cand-street-b");
    const viewed = viewedCandidateView(card, view, "cand-street-a");
    expect(viewed.candidateId).toBe("cand-street-a");
    expect(viewed.title).toBe("Main street — road markings");
    expect(viewed.newer?.candidateId).toBe("cand-street-b");
    expect(viewed.newer?.title).toBe("Main street — kerb repair");
    const onLead = viewedCandidateView(card, view, "cand-street-b");
    expect(onLead.title).toBe("Main street — kerb repair");
    expect(onLead.newer).toBeNull();
  });

  it("falls back to the lead, not to another asset's name, for an unlabelled delivery", () => {
    const view = projection([
      ingest("cand-loose", "original", {
        originalName: "final_v3_USE_THIS.png",
      }),
    ]);
    const card = artDeskCards(view)[0]!;
    expect(card.baseTitle).toBe(
      "Unlabelled delivery (file final_v3_USE_THIS.png)",
    );
    expect(card.title).toBe(
      "Unlabelled delivery (file final_v3_USE_THIS.png) — original",
    );
    expect(viewedCandidateView(card, view, null).title).toBe(card.title);
  });
});

describe("Art Desk reimport inheritance", () => {
  const office = "generic-executive-working-office";

  it("carries the parent's notes and tags onto an edited reimport", () => {
    const view = projection([
      ingest("cand-office", "original", {
        family: office,
        tags: { region: ["alaska"] },
        note: "Native 4K plate from the approved master.",
      }),
      // What intake records for an edited reimport: the parent's tags travel
      // on the new candidate (ArtbenchStore.ingest), the note is its own.
      ingest("cand-office-crop", "crop", {
        parent: "cand-office",
        family: office,
        tags: { region: ["alaska"] },
        at: "2026-09-17T09:00:00.000Z",
        note: "Cropped to 16:9 outside the bench.",
      }),
    ]);
    const child = view.candidates["cand-office-crop"]!;
    const notes = candidateNotes(view, child);
    expect(notes.own).toBe("Cropped to 16:9 outside the bench.");
    expect(notes.inherited).toEqual([
      {
        candidateId: "cand-office",
        stage: "original",
        note: "Native 4K plate from the approved master.",
      },
    ]);
    expect(notes.inheritedTags.region).toEqual(["alaska"]);
    // New bytes, new hash, its own review state.
    expect(child.sha256).not.toBe(view.candidates["cand-office"]!.sha256);
    expect(child.status).toBe("awaiting-review");
    expect(child.tags.region).toEqual(["alaska"]);
  });

  it("reports no inherited note when the parent arrived without one", () => {
    const view = projection([
      ingest("cand-quiet", "original", { family: office }),
      ingest("cand-quiet-up", "upscale", {
        parent: "cand-quiet",
        family: office,
        note: "Upscaled externally.",
      }),
    ]);
    const notes = candidateNotes(view, view.candidates["cand-quiet-up"]);
    expect(notes.inherited).toEqual([]);
    expect(notes.own).toBe("Upscaled externally.");
    expect(candidateNotes(view, undefined)).toEqual({
      own: null,
      inherited: [],
      inheritedTags: {},
    });
  });
});

describe("Art Desk lineage honesty", () => {
  it("shows the declared chain where a parent is recorded", () => {
    const view = projection([
      ingest("cand-root", "original", { family: corridor }),
      ingest("cand-fix", "repaint", { parent: "cand-root", family: corridor }),
    ]);
    const record = lineageOfCandidate(view, view.candidates["cand-fix"]!);
    expect(record.state).toBe("chain");
    expect(record.steps.map((step) => step.candidateId)).toEqual([
      "cand-fix",
      "cand-root",
    ]);
    expect(lineageSentence(record)).toBe(
      "2 recorded steps: original → repair.",
    );
    expect(artDeskCards(view)[0]!.lineageState).toBe("chain");
  });

  it("says the lineage is not recorded for a derived version with no declared parent", () => {
    const view = projection([
      ingest("cand-orphan", "upscale", { family: corridor }),
    ]);
    const record = lineageOfCandidate(view, view.candidates["cand-orphan"]!);
    expect(record.state).toBe("not-recorded");
    expect(record.steps).toHaveLength(1);
    expect(lineageSentence(record)).toContain("Lineage is not recorded");
    expect(lineageSentence(record)).toContain("no declared parent");
    expect(artDeskCards(view)[0]!.lineageState).toBe("not-recorded");
  });

  it("calls a recorded original an original rather than a missing chain", () => {
    const view = projection([
      ingest("cand-native", "original", { family: corridor }),
    ]);
    const record = lineageOfCandidate(view, view.candidates["cand-native"]!);
    expect(record.state).toBe("original");
    expect(lineageSentence(record)).toBe(
      "Recorded as the original; nothing came before it here.",
    );
  });
});

describe("Art Desk download names", () => {
  it("builds a readable name that keeps the recorded hash", () => {
    expect(
      originalDownloadName(
        "School corridor — fountain correction",
        "4f3a91c2e0d1abcdef",
        "png",
      ),
    ).toBe("school-corridor-fountain-correction-4f3a91c2e0d1.png");
    expect(originalDownloadName("Élan café", "ABCDEF123456", "jpeg")).toBe(
      "elan-cafe-abcdef123456.jpeg",
    );
    expect(
      originalDownloadName("../../etc/passwd", "0".repeat(64), "png"),
    ).toBe("etc-passwd-000000000000.png");
    expect(originalDownloadName(null, "aabbccddeeff", "png")).toBe(
      "asset-aabbccddeeff.png",
    );
    // An unrecorded or malformed hash is left out, never invented.
    expect(originalDownloadName("Main street", "not-a-hash", "png")).toBe(
      "main-street.png",
    );
  });
});
