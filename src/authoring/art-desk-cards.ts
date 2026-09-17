import type {
  ArtbenchProjection,
  CandidateStatus,
  EditKind,
  ProjectedCandidate,
  ProjectedRequest,
  RequestLane,
  TagSet,
} from "./artbench";
import { INBOX_REQUEST_ID } from "./artbench";

/**
 * The human Art Desk's cards (CRUNCH46 H5). Pure, over the existing
 * projection; nothing here writes an event or renames an id.
 *
 * One card per logical asset: a registry/bench request is one card; inbox
 * deliveries are grouped by their scene family so an original, its repair,
 * crop, upscale and review copy read as one asset with a lineage, not as
 * unrelated requests. Card titles come from an explicit display map for known
 * deliveries, else from the request title or scene family plus the latest
 * production stage — never from revision numbers.
 */

export type ArtDeskTab = "needs-review" | "in-progress" | "in-game" | "library";

export const ART_DESK_TABS: readonly {
  readonly key: ArtDeskTab;
  readonly label: string;
}[] = [
  { key: "needs-review", label: "Needs review" },
  { key: "in-progress", label: "In progress" },
  { key: "in-game", label: "In game" },
  { key: "library", label: "Library" },
];

/**
 * Display names from the delivery receipts (CRUNCH46 H5). Keyed by exact
 * candidate id; ids and history stay untouched.
 */
export const DELIVERY_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  "cand-7cb8ae76-50a4-f439-d468-75cb81da0959":
    "School corridor — fountain correction",
  "cand-9281cb27-1934-954b-062f-82b2e432b57c": "Main street — road markings",
  "cand-cf67df3c-dce6-f759-4526-737a6f542e2f":
    "Neighborhood doorstep — 4K preparation",
  "cand-b65c5d9d-ba26-916c-957c-3eb669e35b41":
    "Executive office — 4K preparation",
};

const FAMILY_LABELS: Readonly<Record<string, string>> = {
  "school-corridor-generic": "School corridor",
  "small-town-main-street-generic": "Main street",
  "neighborhood-doorstep-generic": "Neighborhood doorstep",
  "generic-executive-working-office": "Executive office",
  "white-house-introduction": "White House introduction",
  "park-community-pavilion": "Park pavilion",
};

const STAGE_LABELS: Readonly<Record<EditKind, string>> = {
  original: "original",
  upscale: "upscale",
  "background-removal": "cut-out",
  repaint: "repair",
  crop: "16:9 crop",
  "canvas-change": "canvas change",
  other: "review copy",
};

export const CARD_STATUS_LABELS: Readonly<Record<CandidateStatus, string>> = {
  "awaiting-review": "Awaiting review",
  approved: "Approved",
  rejected: "Not used",
  "revision-requested": "Revision requested",
  "integration-ready": "Approved — preparing for the game",
  accepted: "Approved — preparing for the game",
  installed: "In game",
  "in-game": "In game",
};

const IN_PROGRESS_LANES: readonly RequestLane[] = [
  "need-generation",
  "awaiting-capable-worker",
  "claimed-generating",
  "revision-requested",
  "approved-awaiting-integration",
];

export interface LineageStep {
  readonly candidateId: string;
  readonly stage: string;
  readonly width: number;
  readonly height: number;
  readonly at: string;
  readonly status: CandidateStatus;
}

/**
 * What the record actually says about how a version came to be.
 *
 * `chain` — the version declares a parent, so the steps are the real chain.
 * `original` — the version is a recorded original with nothing before it.
 * `not-recorded` — the version is a derived stage whose parent was never
 * declared. Nothing here guesses one from a filename, a time or a likeness.
 */
export type LineageState = "chain" | "original" | "not-recorded";

export interface LineageRecord {
  readonly state: LineageState;
  /** Newest first: this version and its declared parents. */
  readonly steps: readonly LineageStep[];
  /**
   * The parent this version declared, when the record names one. It is set
   * even when that parent is absent from the record, so a missing parent is
   * reported as unresolved rather than as never declared.
   */
  readonly declaredParentId: string | null;
}

export interface ArtDeskCard {
  readonly key: string;
  readonly requestId: string;
  readonly title: string;
  /** The asset's name without the latest stage's purpose suffix. */
  readonly baseTitle: string;
  /** Short purpose line: what the latest version changed. */
  readonly change: string;
  readonly status: CandidateStatus | null;
  readonly statusLabel: string;
  readonly leadCandidateId: string | null;
  /** Newest first: the lead and its parents back to the original. */
  readonly lineage: readonly LineageStep[];
  /** What the record says about the lead's lineage; null with no lead. */
  readonly lineageState: LineageState | null;
  /** Other versions of the same asset that are not on the lead's line. */
  readonly otherVersions: readonly string[];
  readonly versionCount: number;
  readonly updatedAt: string | null;
  readonly family: string | null;
  readonly assetType: string | null;
  /** Every tag value on any of the card's versions, by facet. */
  readonly facets: Readonly<Record<string, readonly string[]>>;
  readonly qa: boolean;
  readonly tabs: readonly ArtDeskTab[];
}

function tagValue(tags: TagSet | undefined, facet: string): string | null {
  return tags?.[facet]?.[0] ?? null;
}

function familyOf(candidate: ProjectedCandidate): string | null {
  return (
    tagValue(candidate.tags, "family") ??
    tagValue(candidate.inheritedTags, "family")
  );
}

function assetTypeOf(candidate: ProjectedCandidate | undefined): string | null {
  if (!candidate) return null;
  return (
    tagValue(candidate.tags, "assetType") ??
    tagValue(candidate.inheritedTags, "assetType")
  );
}

/**
 * Every tag value carried by any version of the card, by facet. A region,
 * season or source tag recorded on a version that is not the lead still
 * belongs to the asset, so filters must see it.
 */
function facetsOf(
  candidates: readonly ProjectedCandidate[],
): Record<string, string[]> {
  const facets: Record<string, string[]> = {};
  for (const candidate of candidates) {
    for (const tags of [candidate.tags, candidate.inheritedTags]) {
      for (const [key, values] of Object.entries(tags ?? {})) {
        const known = (facets[key] ??= []);
        for (const value of values)
          if (!known.includes(value)) known.push(value);
      }
    }
  }
  for (const values of Object.values(facets)) values.sort();
  return facets;
}

/** True when the card carries this exact tag value on any of its versions. */
export function cardMatchesFacet(
  card: ArtDeskCard,
  key: string,
  value: string,
): boolean {
  return (card.facets[key] ?? []).includes(value);
}

/** True when no version of the card carries any tag at all. */
export function cardIsUntagged(card: ArtDeskCard): boolean {
  return Object.values(card.facets).every((values) => values.length === 0);
}

/** Every version id on the card: the lead's line and the versions beside it. */
export function cardCandidateIds(card: ArtDeskCard): string[] {
  return [
    ...card.lineage.map((step) => step.candidateId),
    ...card.otherVersions,
  ];
}

function humanize(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : slug;
}

export function familyLabel(family: string): string {
  return FAMILY_LABELS[family] ?? humanize(family.replace(/-generic$/, ""));
}

const TITLE_LINE = /^TITLE:\s*([^\n.]*?)(?:\s*\([^)]*\))?\.(?:\s+|$)/;

/**
 * A producer's own "TITLE: Scene B - purpose (tracking)." line, reduced to
 * its purpose ("road markings"). Null when the note has no title line.
 */
export function deliveryPurpose(
  candidate: ProjectedCandidate | undefined,
): string | null {
  const match = TITLE_LINE.exec(candidate?.note ?? "");
  if (!match) return null;
  const parts = match[1]!.split(/\s+[-–—]\s+/);
  const purpose = (parts.length > 1 ? parts.slice(1).join(" — ") : "").trim();
  return purpose || null;
}

/** The concise change: the note's first sentence, without shouting prefixes. */
export function conciseChange(
  candidate: ProjectedCandidate | undefined,
): string {
  if (!candidate) return "No version delivered yet.";
  const raw = candidate.note ?? "";
  // Structured producer notes: prefer the CHANGES section.
  const changes =
    /(?:^|\s)CHANGES:\s*([\s\S]*?)(?=\s[A-Z][A-Z ]{3,}:\s|$)/.exec(raw);
  const note = (changes ? changes[1]! : raw)
    .replace(TITLE_LINE, "")
    .replace(/^STAGE:[^.]*\.\s*/, "")
    .replace(/^[A-Z0-9 -]{6,}:\s*/, "")
    .trim();
  const first = note.split(/(?<=\.)\s/)[0] ?? "";
  const text = first.length > 140 ? `${first.slice(0, 137)}…` : first;
  if (text) return text;
  return `${humanize(STAGE_LABELS[candidate.editKind])}, ${candidate.width}×${candidate.height}.`;
}

function lineageOf(
  projection: ArtbenchProjection,
  lead: ProjectedCandidate,
): LineageStep[] {
  const steps: LineageStep[] = [];
  const seen = new Set<string>();
  let current: ProjectedCandidate | undefined = lead;
  while (current && !seen.has(current.candidateId)) {
    seen.add(current.candidateId);
    steps.push({
      candidateId: current.candidateId,
      stage: STAGE_LABELS[current.editKind],
      width: current.width,
      height: current.height,
      at: current.ingestedAt,
      status: current.status,
    });
    current = current.parentCandidateId
      ? projection.candidates[current.parentCandidateId]
      : undefined;
  }
  return steps;
}

function lineageStateOf(
  candidate: ProjectedCandidate,
  steps: readonly LineageStep[],
): LineageState {
  if (steps.length > 1) return "chain";
  return candidate.editKind === "original" ? "original" : "not-recorded";
}

/**
 * The declared chain behind one version, and what the record says about it.
 * A missing parent stays missing: a derived version with no declared parent
 * reports `not-recorded`, never a flat original.
 */
export function lineageOfCandidate(
  projection: ArtbenchProjection,
  candidate: ProjectedCandidate,
): LineageRecord {
  const steps = lineageOf(projection, candidate);
  return {
    state: lineageStateOf(candidate, steps),
    steps,
    declaredParentId: candidate.parentCandidateId ?? null,
  };
}

/** Plain sentence for a lineage record, for the detail view. */
export function lineageSentence(record: LineageRecord): string {
  if (record.state === "chain")
    return `${record.steps.length} recorded steps: ${[...record.steps]
      .reverse()
      .map((step) => step.stage)
      .join(" → ")}.`;
  if (record.state === "original")
    return "Recorded as the original; nothing came before it here.";
  const stage = record.steps[0]?.stage ?? "version";
  if (record.declaredParentId)
    return `Lineage is not recorded for this version: it arrived as a ${stage} declaring parent ${record.declaredParentId}, and that parent is not in this record. Nothing is inferred from its filename or timing.`;
  return `Lineage is not recorded for this version: it arrived as a ${stage} with no declared parent. Nothing is inferred from its filename or timing.`;
}

/** The version a card leads with: newest awaiting review, else newest. */
function leadOf(
  candidates: readonly ProjectedCandidate[],
  selectedId?: string,
): ProjectedCandidate | undefined {
  const selected = candidates.find((c) => c.candidateId === selectedId);
  const byTime = [...candidates].sort(
    (a, b) =>
      b.ingestedAt.localeCompare(a.ingestedAt) || b.revision - a.revision,
  );
  const newestWaiting = byTime.find((c) => c.status === "awaiting-review");
  return newestWaiting ?? selected ?? byTime[0];
}

function tabsFor(
  lane: RequestLane,
  status: CandidateStatus | null,
): ArtDeskTab[] {
  const tabs: ArtDeskTab[] = ["library"];
  if (status === "awaiting-review" || lane === "needs-review")
    tabs.push("needs-review");
  else if (status === "installed" || status === "in-game" || lane === "in-game")
    tabs.push("in-game");
  else if (IN_PROGRESS_LANES.includes(lane) || status === "revision-requested")
    tabs.push("in-progress");
  return tabs;
}

/**
 * A delivery that named no scene family. The file it arrived as is shown as a
 * file, never as the asset's name — a filename is not an identity.
 */
export function unlabelledDeliveryTitle(
  candidate: ProjectedCandidate | undefined,
): string {
  const file = candidate?.provenance.originalName?.trim();
  return file ? `Unlabelled delivery (file ${file})` : "Unlabelled delivery";
}

function stageTitle(base: string, lead: ProjectedCandidate | undefined) {
  if (!lead) return base;
  return `${base} — ${deliveryPurpose(lead) ?? STAGE_LABELS[lead.editKind]}`;
}

/** Disposable proof requests: flagged, or named as QA by convention. */
function isQaRequest(request: ProjectedRequest): boolean {
  return request.qa || /^qa[-:]/i.test(request.request.requestId);
}

function cardFor(
  projection: ArtbenchProjection,
  key: string,
  request: ProjectedRequest,
  candidates: readonly ProjectedCandidate[],
  baseTitle: string,
  family: string | null,
  lane: RequestLane,
): ArtDeskCard {
  const lead = leadOf(candidates, request.selectedCandidateId);
  const lineage = lead ? lineageOf(projection, lead) : [];
  const onLine = new Set(lineage.map((step) => step.candidateId));
  const status = lead?.status ?? null;
  const facets = facetsOf([
    ...candidates,
    ...lineage
      .map((step) => projection.candidates[step.candidateId])
      .filter((c): c is ProjectedCandidate => Boolean(c)),
  ]);
  return {
    key,
    requestId: request.request.requestId,
    title:
      (lead && DELIVERY_DISPLAY_NAMES[lead.candidateId]) ??
      stageTitle(baseTitle, lead),
    baseTitle,
    change: conciseChange(lead),
    status,
    statusLabel: status
      ? CARD_STATUS_LABELS[status]
      : request.lane === "awaiting-capable-worker"
        ? "Waiting for a generator"
        : "No version yet",
    leadCandidateId: lead?.candidateId ?? null,
    lineage,
    lineageState: lead ? lineageStateOf(lead, lineage) : null,
    otherVersions: candidates
      .map((c) => c.candidateId)
      .filter((id) => !onLine.has(id)),
    // The inbox lists only leaf versions; their parents are versions too.
    versionCount: new Set([
      ...candidates.map((c) => c.candidateId),
      ...lineage.map((step) => step.candidateId),
    ]).size,
    updatedAt: lead?.ingestedAt ?? null,
    family,
    assetType:
      assetTypeOf(lead) ??
      candidates.map((c) => assetTypeOf(c)).find(Boolean) ??
      null,
    facets,
    qa: isQaRequest(request) || candidates.some((c) => c.qa),
    tabs: tabsFor(lane, status),
  };
}

export function artDeskCards(projection: ArtbenchProjection): ArtDeskCard[] {
  const cards: ArtDeskCard[] = [];
  for (const request of Object.values(projection.requests)) {
    const candidates = request.candidateIds
      .map((id) => projection.candidates[id])
      .filter((c): c is ProjectedCandidate => Boolean(c) && !c!.aliasOf);
    if (request.request.requestId !== INBOX_REQUEST_ID) {
      cards.push(
        cardFor(
          projection,
          `request:${request.request.requestId}`,
          request,
          candidates,
          request.request.title,
          request.request.scope?.familyId ?? null,
          request.lane,
        ),
      );
      continue;
    }
    // Inbox deliveries: one card per scene family; unfamilied lines stay alone.
    const groups = new Map<string, ProjectedCandidate[]>();
    for (const candidate of candidates) {
      let root = candidate;
      const seen = new Set<string>();
      while (root.parentCandidateId && !seen.has(root.candidateId)) {
        seen.add(root.candidateId);
        const parent = projection.candidates[root.parentCandidateId];
        if (!parent || parent.requestId !== INBOX_REQUEST_ID) break;
        root = parent;
      }
      const family = familyOf(candidate) ?? familyOf(root);
      const key = family ? `family:${family}` : `line:${root.candidateId}`;
      groups.set(key, [...(groups.get(key) ?? []), candidate]);
    }
    for (const [key, members] of groups) {
      const family = key.startsWith("family:") ? key.slice(7) : null;
      const lead = leadOf(members);
      cards.push(
        cardFor(
          projection,
          `inbox:${key}`,
          request,
          members,
          family ? familyLabel(family) : unlabelledDeliveryTitle(lead),
          family,
          lead?.status === "awaiting-review" ? "needs-review" : "inbox",
        ),
      );
    }
  }
  return cards.sort(
    (a, b) =>
      (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") ||
      a.title.localeCompare(b.title),
  );
}

export interface CardFilter {
  readonly tab: ArtDeskTab;
  readonly text?: string;
  readonly status?: CandidateStatus | "all";
  readonly assetType?: string | "all";
  readonly family?: string | "all";
  readonly showQa?: boolean;
}

export function filterCards(
  cards: readonly ArtDeskCard[],
  filter: CardFilter,
): ArtDeskCard[] {
  const needle = filter.text?.trim().toLowerCase() ?? "";
  return cards.filter((card) => {
    if (!filter.showQa && card.qa) return false;
    if (!card.tabs.includes(filter.tab)) return false;
    if (
      filter.status &&
      filter.status !== "all" &&
      card.status !== filter.status
    )
      return false;
    if (
      filter.assetType &&
      filter.assetType !== "all" &&
      card.assetType !== filter.assetType
    )
      return false;
    if (
      filter.family &&
      filter.family !== "all" &&
      card.family !== filter.family
    )
      return false;
    if (
      needle &&
      ![
        card.title,
        card.change,
        card.requestId,
        card.family ?? "",
        ...card.lineage.map((s) => s.candidateId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
      return false;
    return true;
  });
}

/** Tab counts from the same cards the tabs show (QA hidden unless asked). */
export function tabCounts(
  cards: readonly ArtDeskCard[],
  showQa = false,
): Readonly<Record<ArtDeskTab, number>> {
  const counts: Record<ArtDeskTab, number> = {
    "needs-review": 0,
    "in-progress": 0,
    "in-game": 0,
    library: 0,
  };
  for (const card of cards) {
    if (card.qa && !showQa) continue;
    for (const tab of card.tabs) counts[tab] += 1;
  }
  return counts;
}

/** What one version of an asset is called: its own name, never a sibling's. */
export function candidateDisplayName(
  card: ArtDeskCard,
  candidate: ProjectedCandidate | undefined,
): string {
  if (!candidate) return card.baseTitle;
  return (
    DELIVERY_DISPLAY_NAMES[candidate.candidateId] ??
    `${card.baseTitle} — ${deliveryPurpose(candidate) ?? STAGE_LABELS[candidate.editKind]}`
  );
}

export interface ViewedCandidateView {
  /** The name of the version actually on screen. */
  readonly title: string;
  readonly candidateId: string | null;
  readonly stage: string | null;
  readonly status: CandidateStatus | null;
  /** A version that arrived after the viewed one and is still unreviewed. */
  readonly newer: {
    readonly candidateId: string;
    readonly title: string;
    readonly at: string;
  } | null;
}

/**
 * The detail's own subject. While a version is being viewed it keeps its
 * identity even when a newer delivery lands on the same card; the newer
 * arrival is reported separately instead of renaming what is on screen.
 */
export function viewedCandidateView(
  card: ArtDeskCard,
  projection: ArtbenchProjection,
  viewedCandidateId: string | null,
): ViewedCandidateView {
  const ids = cardCandidateIds(card);
  const viewed =
    (viewedCandidateId && ids.includes(viewedCandidateId)
      ? projection.candidates[viewedCandidateId]
      : undefined) ??
    (card.leadCandidateId
      ? projection.candidates[card.leadCandidateId]
      : undefined);
  const arrivals = ids
    .map((id) => projection.candidates[id])
    .filter((c): c is ProjectedCandidate => Boolean(c))
    .filter(
      (c) =>
        viewed &&
        c.candidateId !== viewed.candidateId &&
        c.status === "awaiting-review" &&
        (c.ingestedAt.localeCompare(viewed.ingestedAt) > 0 ||
          (c.ingestedAt === viewed.ingestedAt && c.revision > viewed.revision)),
    )
    .sort(
      (a, b) =>
        b.ingestedAt.localeCompare(a.ingestedAt) || b.revision - a.revision,
    );
  const newest = arrivals[0];
  return {
    title: viewed ? candidateDisplayName(card, viewed) : card.title,
    candidateId: viewed?.candidateId ?? null,
    stage: viewed ? STAGE_LABELS[viewed.editKind] : null,
    status: viewed?.status ?? null,
    newer: newest
      ? {
          candidateId: newest.candidateId,
          title: candidateDisplayName(card, newest),
          at: newest.ingestedAt,
        }
      : null,
  };
}

export interface CandidateNotes {
  /** The note this version arrived with, if any. */
  readonly own: string | null;
  /** Notes from the declared parents, nearest parent first. */
  readonly inherited: readonly {
    readonly candidateId: string;
    readonly stage: string;
    readonly note: string;
  }[];
  /** Tags carried forward from the parent at intake. */
  readonly inheritedTags: TagSet;
}

/**
 * An edited reimport is new bytes with its own review state, but it is still
 * the same asset: the notes and tags of the versions it came from are carried
 * forward here rather than being lost at the edit.
 */
export function candidateNotes(
  projection: ArtbenchProjection,
  candidate: ProjectedCandidate | undefined,
): CandidateNotes {
  if (!candidate) return { own: null, inherited: [], inheritedTags: {} };
  const inherited: {
    candidateId: string;
    stage: string;
    note: string;
  }[] = [];
  const seen = new Set<string>([candidate.candidateId]);
  let parent = candidate.parentCandidateId
    ? projection.candidates[candidate.parentCandidateId]
    : undefined;
  while (parent && !seen.has(parent.candidateId)) {
    seen.add(parent.candidateId);
    if (parent.note?.trim())
      inherited.push({
        candidateId: parent.candidateId,
        stage: STAGE_LABELS[parent.editKind],
        note: parent.note.trim(),
      });
    parent = parent.parentCandidateId
      ? projection.candidates[parent.parentCandidateId]
      : undefined;
  }
  return {
    own: candidate.note?.trim() || null,
    inherited,
    inheritedTags: candidate.inheritedTags ?? {},
  };
}

/** A readable, filesystem-safe stem for a download, or "asset". */
export function assetFileStem(label: string): string {
  const stem = label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return stem || "asset";
}

/**
 * The saved name of a downloaded original: the human name of the version plus
 * the recorded hash's first 12 characters, so the bytes stay identifiable.
 */
export function originalDownloadName(
  displayName: string | null | undefined,
  sha256: string,
  container: string,
): string {
  const hash = /^[0-9a-f]+$/i.test(sha256)
    ? sha256.slice(0, 12).toLowerCase()
    : "";
  const extension = assetFileStem(container || "bin");
  return `${assetFileStem(displayName ?? "")}${hash ? `-${hash}` : ""}.${extension}`;
}
