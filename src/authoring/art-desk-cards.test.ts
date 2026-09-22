import { describe, expect, it } from "vitest";
import { candidateUsage, type SelectedArtBuild } from "./art-desk-usage";

import {
  ART_DESK_NAV_TABS,
  artDeskCards,
  cardOnDesk,
  generationRequestReady,
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

it("owner navigation omits library, references, rejected and removed art", () => {
  const keys = ART_DESK_NAV_TABS.map((tab) => tab.key);
  for (const key of ["library", "references", "rejected", "archived"])
    expect(keys).not.toContain(key);
  expect(keys).toContain("needs-review");
});

it("only cards live in an owner-facing tab are on the desk", () => {
  expect(cardOnDesk({ tabs: ["library", "needs-review"] })).toBe(true);
  expect(cardOnDesk({ tabs: ["library", "requests"] })).toBe(true);
  expect(cardOnDesk({ tabs: ["library"] })).toBe(false);
  expect(cardOnDesk({ tabs: ["library", "references"] })).toBe(false);
  expect(cardOnDesk({ tabs: ["library", "rejected"] })).toBe(false);
  expect(cardOnDesk({ tabs: ["library", "archived"] })).toBe(false);
  // A question on removed or rejected art does not bring it back.
  expect(cardOnDesk({ tabs: ["library", "archived", "discussion"] })).toBe(
    false,
  );
});

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
  it("files old preparation away without hiding a fresh revision", () => {
    const original = ingest("cand-preparation", "original", {
      family: corridor,
      tags: { deskView: ["cand-preparation:library"] },
    });
    const before = artDeskCards(projection([original]));
    expect(before[0].tabs).toEqual(["library"]);
    const child = ingest("cand-ready", "repaint", {
      family: corridor,
      parent: "cand-preparation",
      tags: { deskView: ["cand-preparation:library"] },
    });
    const after = artDeskCards(projection([original, child]));
    expect(after[0].leadCandidateId).toBe("cand-ready");
    expect(after[0].tabs).toContain("in-progress");
    expect(after[0].versionCount).toBe(2);
  });
  it("keeps style references and removed images recoverable without review decisions", () => {
    const original = ingest("cand-disposition", "original", {
      family: corridor,
    });
    for (const kind of ["reference", "archived"] as const) {
      const tag: ArtbenchEvent = {
        ...original,
        eventId: `tag-${kind}`,
        seq: original.seq + 1,
        type: "tags.set",
        payload: {
          entity: "candidate",
          entityId: "cand-disposition",
          tags: { reviewQueue: [`cand-disposition:${kind}`] },
          baseVersion: 0,
          author: { kind: "owner", id: "fixture-owner" },
        },
      };
      const p = projection([original, tag]);
      const cards = artDeskCards(p);
      expect(tabCounts(cards)["in-progress"]).toBe(0);
      expect(
        filterCards(cards, {
          tab: kind === "reference" ? "references" : "archived",
        }),
      ).toHaveLength(1);
      expect(p.candidates["cand-disposition"].decisions).toHaveLength(0);
      expect(p.candidates["cand-disposition"].status).toBe("awaiting-review");
      const restore: ArtbenchEvent = {
        ...tag,
        eventId: `restore-${kind}`,
        seq: tag.seq + 1,
        payload: {
          ...tag.payload,
          tags: { reviewQueue: ["cand-disposition:review"] },
          baseVersion: 1,
        },
      };
      expect(
        tabCounts(artDeskCards(projection([original, tag, restore])))[
          "in-progress"
        ],
      ).toBe(1);
      const child = ingest(`cand-${kind}-child`, "repaint", {
        parent: "cand-disposition",
        family: corridor,
        tags: { reviewQueue: [`cand-disposition:${kind}`] },
      });
      expect(
        tabCounts(artDeskCards(projection([original, tag, child])))[
          "in-progress"
        ],
      ).toBe(1);
    }
  });
  it("keeps an archived revision from resurrecting its undecided original", () => {
    const alternate = ingest("removed-alternate", "original", {
      family: corridor,
      at: "2026-09-01T00:00:00Z",
    });
    const original = ingest("removed-original", "original", {
      family: corridor,
    });
    const archived = ingest("removed-revision", "repaint", {
      parent: "removed-original",
      family: corridor,
      tags: { reviewQueue: ["removed-revision:archived"] },
    });
    const reference = ingest("removed-comparison", "repaint", {
      parent: "removed-revision",
      family: corridor,
      tags: { reviewQueue: ["removed-comparison:reference"] },
    });
    for (const events of [
      [alternate, original, archived],
      [alternate, original, archived, reference],
    ]) {
      const card = artDeskCards(projection(events))[0];
      expect(card.leadCandidateId).toBe("removed-revision");
      expect(card.tabs).toEqual(["library", "archived"]);
      expect(card.versionCount).toBe(events.length);
    }
  });
  it("removes an approved review copy from Awaiting review while retaining undecided ancestors", () => {
    const original = ingest("cand-queue-original", "original", {
      family: corridor,
    });
    const revised = ingest("cand-queue-revised", "repaint", {
      family: corridor,
      parent: "cand-queue-original",
    });
    const events = [original, revised];
    const before = projection(events);
    expect(tabCounts(artDeskCards(before))["in-progress"]).toBe(1);
    const decision = {
      ...revised,
      eventId: "queue-approval",
      seq: revised.seq + 1,
      actor: { kind: "owner", id: "fixture-owner" },
      type: "review.decided",
      payload: {
        reviewId: "review-queue",
        requestId: "inbox",
        requestVersion: 1,
        candidateId: "cand-queue-revised",
        viewedCandidateId: "cand-queue-revised",
        outputSha256: before.candidates["cand-queue-revised"].sha256,
        decision: "approve",
        contractVersion: ARTBENCH_CONTRACT_VERSION,
        fitContractHash: "a".repeat(64),
        sceneContractHash: "b".repeat(64),
        rightsStatus: "unknown",
        sourceDeclaration: "Disposable test fixture",
        authority: "session-capability",
      },
    } as ArtbenchEvent;
    const after = projection([...events, decision]);
    const cards = artDeskCards(after);
    expect(cards[0].leadCandidateId).toBe("cand-queue-revised");
    expect(cards[0].status).not.toBe("awaiting-review");
    expect(tabCounts(cards)["in-progress"]).toBe(0);
    expect(filterCards(cards, { tab: "library" })).toHaveLength(1);
    expect(cards[0].versionCount).toBe(2);
    expect(after.candidates["cand-queue-original"].status).toBe(
      "awaiting-review",
    );
    const rejectedWrite = projection([
      ...events,
      {
        ...decision,
        payload: { ...decision.payload, outputSha256: "0".repeat(64) },
      } as ArtbenchEvent,
    ]);
    expect(tabCounts(artDeskCards(rejectedWrite))["in-progress"]).toBe(1);
    const later = ingest("cand-queue-new", "repaint", {
      family: corridor,
      parent: "cand-queue-revised",
    });
    expect(
      tabCounts(artDeskCards(projection([...events, decision, later])))[
        "in-progress"
      ],
    ).toBe(1);
  });
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
    expect(card.statusLabel).toBe("With the art team");
    expect(card.lineage.map((step) => step.stage)).toEqual([
      "review copy",
      "upscale",
      "16:9 crop",
      "repair",
      "original",
    ]);
    expect(card.otherVersions).toEqual([]);
    expect(card.versionCount).toBe(5);
    expect(card.tabs).toContain("in-progress");
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

  it("keeps a production card visible when a child is marked QA", () => {
    const original = ingest("cand-production", "original", {
      family: corridor,
    });
    const child = ingest("cand-qa-child", "crop", {
      parent: "cand-production",
      family: corridor,
    });
    const p = projection([
      original,
      child,
      {
        ...child,
        eventId: "qa-disposition",
        seq: child.seq + 1,
        type: "qa.disposition",
        payload: { candidateId: "cand-qa-child", reason: "Round-trip QA" },
      } as ArtbenchEvent,
    ]);
    const cards = artDeskCards(p);
    expect(cards).toHaveLength(1);
    expect(cards[0].qa).toBe(false);
    expect(cards[0].leadCandidateId).toBe("cand-production");
    expect(cards[0].versionCount).toBe(2);
    expect(
      viewedCandidateView(cards[0], p, "cand-production").newer,
    ).toBeNull();
    expect(tabCounts(cards)["in-progress"]).toBe(1);
    expect(p.candidates["cand-qa-child"].qa).toBe(true);
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
      "needs-review": 0,
      "in-progress": 1,
      "in-game": 0,
      library: 1,
      references: 0,
      archived: 0,
      approved: 0,
      rejected: 0,
      requests: 0,
      discussion: 0,
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

  it("labels imported rows that predate edit-kind recording as versions", () => {
    const legacy = ingest("cand-legacy-stage", "other");
    delete (legacy.payload as { editKind?: unknown }).editKind;
    const view = projection([legacy]);
    const card = artDeskCards(view)[0]!;
    expect(card.title).toContain("version");
    expect(card.title).not.toContain("undefined");
    expect(viewedCandidateView(card, view, null).stage).toBe("version");
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

  it("says a declared parent is missing rather than that none was declared", () => {
    // The parent id is on the record; the parent itself is not in this
    // projection. Reporting "no declared parent" would deny the record.
    const view = projection([
      ingest("cand-lost", "upscale", {
        parent: "cand-absent",
        family: corridor,
      }),
    ]);
    const record = lineageOfCandidate(view, view.candidates["cand-lost"]!);
    expect(record.state).toBe("not-recorded");
    expect(record.declaredParentId).toBe("cand-absent");
    const sentence = lineageSentence(record);
    expect(sentence).toContain("declaring parent cand-absent");
    expect(sentence).toContain("not in this record");
    expect(sentence).not.toContain("no declared parent");
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

it("only offers complete short-prompt requests with exact decoded reference bytes", () => {
  const p = projection([ingest("reference", "original")]);
  const base = p.requests.inbox!.request;
  const candidate = p.candidates.reference!;
  const request = {
    ...base,
    whyNeeded: "A readable room.",
    consumer: { ...base.consumer, playerVisibleUse: "The room." },
    generatorParameters: {
      fireflyPrompt: "Paint the room.",
      fireflyModel: "Clean Interior Scenes / IMAGE 5",
      referenceUploadCount: "1",
    },
    target: {
      ...base.target,
      styleReferences: [
        {
          role: "parent-template" as const,
          ref: "candidate:reference",
          sha256: candidate.sha256,
        },
      ],
    },
  };
  const bytes = { reference: { state: "verified" } };
  expect(generationRequestReady(request, p, bytes)).toBe(true);
  expect(generationRequestReady(request, p, {})).toBe(false);
  expect(
    generationRequestReady(
      { ...request, target: { ...request.target, styleReferences: [] } },
      p,
      bytes,
    ),
  ).toBe(false);
  expect(
    generationRequestReady(
      {
        ...request,
        generatorParameters: {
          ...request.generatorParameters,
          fireflyPrompt: "x".repeat(1025),
        },
      },
      p,
      bytes,
    ),
  ).toBe(false);
  expect(
    generationRequestReady(
      {
        ...request,
        target: {
          ...request.target,
          styleReferences: [
            { ...request.target.styleReferences[0]!, sha256: "changed" },
          ],
        },
      },
      p,
      bytes,
    ),
  ).toBe(false);
});

it("keeps backgrounds searchable before and after return and clothes out of owner requests", () => {
  const base = projection([ingest("category-reference", "original")]).requests
    .inbox!.request;
  const scene = {
    ...base,
    requestId: "coast",
    title: "Coast",
    scope: { familyId: "regional-opening" },
    target: { ...base.target, targetClass: "environment-plate" as const },
  };
  const clothes = {
    ...base,
    requestId: "shoes",
    title: "Shoes",
    scope: { familyId: "modular-wardrobe" },
  };
  const before = projectArtbench({
    registryRequests: [scene, clothes],
    events: [],
  });
  const sceneCards = filterCards(artDeskCards(before), {
    tab: "requests",
    assetType: "environment-plate",
    text: "Coast",
  });
  expect(sceneCards.map((card) => card.requestId)).toEqual(["coast"]);
  expect(
    artDeskCards(before).find((card) => card.requestId === "shoes")?.tabs,
  ).toContain("in-progress");
  expect(
    artDeskCards(before).find((card) => card.requestId === "shoes")?.tabs,
  ).not.toContain("requests");
  const after = projectArtbench({
    registryRequests: [scene, clothes],
    events: [ingest("coast-original", "original", { requestId: "coast" })],
  });
  const returned = filterCards(artDeskCards(after), {
    tab: "in-progress",
    assetType: "environment-plate",
    text: "Coast",
  });
  expect(returned.map((card) => card.requestId)).toEqual(["coast"]);
  expect(cardMatchesFacet(returned[0]!, "purpose", "regional-background")).toBe(
    true,
  );
});

describe("current artwork and scoped recommendations", () => {
  it("keeps a chosen alternative only through the returns it examined", () => {
    const inboxTemplate = projection([ingest("template", "original")]).requests
      .inbox.request;
    const project = (events: ArtbenchEvent[]) =>
      projectArtbench({
        registryRequests: [{ ...inboxTemplate, requestId: "coast" }],
        events,
      });
    const a = ingest("a", "original", {
      family: corridor,
      requestId: "coast",
      at: "2026-09-20T10:00:00Z",
    });
    const b = ingest("b", "original", {
      family: corridor,
      requestId: "coast",
      at: "2026-09-20T11:00:00Z",
    });
    const selection: ArtbenchEvent = {
      ...b,
      eventId: "choose-a",
      seq: b.seq + 1,
      at: "2026-09-20T13:00:00Z",
      type: "candidate.selected",
      payload: {
        requestId: "coast",
        candidateId: "a",
        latestArrivalBoundary: "2026-09-20T11:00:00Z",
      },
    };
    expect(artDeskCards(project([a, b, selection]))[0].leadCandidateId).toBe(
      "a",
    );
    // A return that arrived after the examined snapshot must win, even when
    // the recommendation itself was synchronized later.
    const c = ingest("c", "original", {
      family: corridor,
      requestId: "coast",
      at: "2026-09-20T12:00:00Z",
    });
    const cards = artDeskCards(project([a, b, c, selection]));
    expect(cards[0].leadCandidateId).toBe("c");
    expect(cards[0].tabs).toContain("in-progress");
    expect(cards[0].otherVersions).toEqual(expect.arrayContaining(["a", "b"]));
  });

  it("ties usage to exact selected bytes without inheriting it into a new child", () => {
    const source = ingest("a", "original", { family: corridor });
    const child = ingest("b", "repaint", { family: corridor, parent: "a" });
    const p = projection([source, child]);
    const selected: SelectedArtBuild = {
      revision: "current",
      clientTreeSha256: "tree",
      packId: "pack",
      packManifestSha256: "manifest",
      bindings: [
        {
          assetId: "hall",
          sourceSha256: p.candidates.a.sha256,
          derivativeSha256: "f".repeat(64),
          useLabels: ["Local-government introduction"],
          eligible: ["Generic civic illustration"],
        },
      ],
    };
    expect(candidateUsage(p, p.candidates.a, selected).state).toBe("used");
    expect(candidateUsage(p, p.candidates.b, selected).state).toBe("unknown");
    expect(
      candidateUsage(p, p.candidates.a, {
        ...selected,
        revision: "other",
        bindings: [],
      }).state,
    ).toBe("unknown");
    expect(
      candidateUsage(p, p.candidates.a, { ...selected, bindings: undefined })
        .state,
    ).toBe("unknown");
    expect(candidateUsage(p, p.candidates.a, null).state).toBe("unknown");
    expect(
      candidateUsage(p, p.candidates.a, JSON.parse(JSON.stringify(selected))),
    ).toEqual(candidateUsage(p, p.candidates.a, selected));
  });
});

it("only an explicit exact-revision handoff enters the owner's review queue", () => {
  const original = ingest("owner-lead", "original", {
    family: corridor,
    tags: { ownerReviewReady: ["owner-lead:ready"] },
  });
  // Ingested/inherited metadata cannot make an owner handoff.
  expect(artDeskCards(projection([original]))[0].tabs).toContain("in-progress");
  const ready: ArtbenchEvent = {
    ...original,
    eventId: "ready-owner-lead",
    seq: original.seq + 1,
    type: "tags.set",
    payload: {
      entity: "candidate",
      entityId: "owner-lead",
      baseVersion: 0,
      tags: { ownerReviewReady: ["owner-lead:ready"] },
      author: { kind: "worker", id: "art-team" },
    },
  };
  const p = projection([original, ready]);
  const card = artDeskCards(p)[0];
  expect(card.tabs).toContain("needs-review");
  expect(card.tabs).not.toContain("in-progress");
  expect(card.statusLabel).toBe("Awaiting your review");
  expect(
    filterCards([card], { tab: "library", status: "awaiting-review" }),
  ).toHaveLength(1);
  expect(
    filterCards([card], { tab: "library", status: "with-art-team" }),
  ).toHaveLength(0);
  expect(
    artDeskCards(projection(JSON.parse(JSON.stringify([original, ready]))))[0],
  ).toEqual(card);
  const child = ingest("owner-child", "repaint", {
    parent: "owner-lead",
    family: corridor,
    tags: { ownerReviewReady: ["owner-lead:ready", "owner-child:ready"] },
    at: "2026-10-01T00:00:00Z",
  });
  const childCard = artDeskCards(projection([original, ready, child]))[0];
  expect(childCard.leadCandidateId).toBe("owner-child");
  expect(childCard.tabs).toContain("in-progress");
  expect(childCard.tabs).not.toContain("needs-review");
  expect(childCard.statusLabel).toBe("With the art team");
  const comparison = ingest("owner-comparison", "repaint", {
    parent: "owner-lead",
    family: corridor,
    tags: { reviewQueue: ["owner-comparison:reference"] },
    at: "2026-10-02T00:00:00Z",
  });
  const supportedCard = artDeskCards(
    projection([original, ready, comparison]),
  )[0];
  expect(supportedCard.leadCandidateId).toBe("owner-lead");
  expect(supportedCard.tabs).toContain("needs-review");
  expect(supportedCard.versionCount).toBe(2);
  expect(
    viewedCandidateView(
      supportedCard,
      projection([original, ready, comparison]),
      "owner-lead",
    ).newer,
  ).toBeNull();
  const revisionRequested = {
    ...ready,
    eventId: "owner-requests-more-work",
    seq: ready.seq + 1,
    actor: { kind: "owner", id: "fixture-owner" },
    type: "review.decided",
    payload: {
      reviewId: "owner-asks-revision",
      requestId: "inbox",
      requestVersion: 1,
      candidateId: "owner-lead",
      viewedCandidateId: "owner-lead",
      outputSha256: p.candidates["owner-lead"].sha256,
      decision: "request-revision",
      contractVersion: ARTBENCH_CONTRACT_VERSION,
      fitContractHash: "a".repeat(64),
      sceneContractHash: "b".repeat(64),
      rightsStatus: "unknown",
      sourceDeclaration: "Disposable fixture",
      authority: "session-capability",
    },
  } as ArtbenchEvent;
  const revisionCard = artDeskCards(
    projection([original, ready, revisionRequested]),
  )[0];
  expect(revisionCard.statusLabel).toBe("With the art team");
  expect(revisionCard.tabs).toContain("in-progress");
  expect(revisionCard.tabs).not.toContain("needs-review");
  for (const disposition of ["reference", "archived"]) {
    const filed: ArtbenchEvent = {
      ...ready,
      eventId: `file-${disposition}`,
      seq: ready.seq + 1,
      payload: {
        ...ready.payload,
        baseVersion: 1,
        tags: { reviewQueue: [`owner-lead:${disposition}`] },
      },
    } as ArtbenchEvent;
    const filedCard = artDeskCards(projection([original, ready, filed]))[0];
    expect(filedCard.tabs).not.toContain("needs-review");
    expect(filedCard.tabs).not.toContain("in-progress");
    expect(filedCard.tabs).toContain(
      disposition === "reference" ? "references" : "archived",
    );
  }
});
