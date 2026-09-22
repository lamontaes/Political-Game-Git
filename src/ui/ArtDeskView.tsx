import {
  artDeskNotifications,
  type ArtDeskNotification,
} from "../authoring/art-desk-notifications";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  LANE_LABELS,
  REQUEST_LANES,
  TAG_FACETS,
  EDIT_KINDS,
  catalogRows,
  editBundleManifest,
  facetCounts,
  filterCatalog,
  type ArtbenchProjection,
  type CandidateStatus,
  type EditKind,
  type ProjectedCandidate,
  type ProjectedRequest,
  type RequestLane,
  type TagSet,
} from "../authoring/artbench";
import type { ArtDeskPrivatePackReceipt } from "../authoring/art-desk";
import {
  briefContractHash,
  compileAssetBrief,
  requestReferencePixels,
  styleReferencesFor,
} from "../authoring/asset-brief";
import {
  STYLE_REFERENCE_ROLES,
  type AssetRequest,
  type AssetStyleReference,
} from "../authoring/asset-request";
import {
  buildRequestDraft,
  initialDraftFields,
  type RequestDraftFields,
  type RequestDraftMode,
} from "../authoring/artbench-request-draft";
import {
  requestDisplayCode,
  codedGenerationPrompt,
} from "../authoring/art-desk-request-code";
import { ART_DESK_CONTRACT_ID } from "../authoring/asset-review";
import {
  ART_DESK_NAV_TABS,
  artDeskCards,
  artworkCategoryLabel,
  requestArtworkCategory,
  generationRequestReady,
  candidateReviewView,
  candidateWorkflowLabel,
  assetFileStem,
  candidateNotes,
  cardIsUntagged,
  cardOnDesk,
  cardMatchesFacet,
  familyLabel,
  filterCards,
  lineageOfCandidate,
  lineageSentence,
  originalDownloadName,
  reviewDisposition,
  tabCounts,
  viewedCandidateView,
  type ArtDeskCard,
  type ArtDeskTab,
} from "../authoring/art-desk-cards";
import "./art-desk.css";
import { ArtBenchImage } from "./ArtBenchImage";
import {
  candidateUsage,
  type SelectedArtBuild,
} from "../authoring/art-desk-usage";
import { upscaleRequirement } from "../authoring/artbench-upscale";

const INPUTS_ROUTE = "/__dev/art-desk/inputs";
const BENCH = "/__dev/artbench";

interface BytesInfo {
  /** "unchecked": the server has not verified these bytes yet (it will). */
  readonly state:
    "verified" | "missing" | "hash-mismatch" | "not-a-raster" | "unchecked";
  readonly note: string;
}

interface SyncInfo {
  readonly status: "ok" | "needs-mirror" | "error" | "never";
  readonly driveRoot: string | null;
  readonly driveRootPresent: boolean;
  readonly lastAttemptAt: string | null;
  readonly lastSuccessAt: string | null;
  readonly lastError: string | null;
  readonly pendingOutbox: number;
  readonly pendingBatches: readonly string[];
  readonly processedBatches: number;
  readonly exportedEvents: number;
  readonly importedEvents: number;
}

interface BenchState {
  readonly projection: ArtbenchProjection;
  readonly bytes: Readonly<Record<string, BytesInfo>>;
  readonly sync: SyncInfo;
  readonly store: { readonly storeId: string; readonly dataRootLabel: string };
  readonly generatorAvailable: boolean;
  /** Images still being checked in the background; poll sooner meanwhile. */
  readonly bytesPending?: number;
  readonly notificationReadEventIds?: readonly string[];
}

interface InputsReceipt {
  readonly checkedAt: string;
  readonly privatePack: ArtDeskPrivatePackReceipt;
}

/** Fields that can change what the desk renders, without serializing the art. */
function benchSnapshotSignature(state: BenchState): string {
  const byteStates = Object.entries(state.bytes)
    .map(([id, bytes]) => `${id}:${bytes.state}`)
    .join("|");
  const read = [...(state.notificationReadEventIds ?? [])].sort().join(",");
  const sync = state.sync;
  return [
    state.store.storeId,
    state.projection.lastSeq,
    byteStates,
    read,
    sync.status,
    sync.driveRoot,
    sync.lastSuccessAt,
    sync.lastError,
    sync.pendingOutbox,
    sync.pendingBatches.join(","),
    sync.processedBatches,
    sync.exportedEvents,
    sync.importedEvents,
  ].join("\n");
}

async function sha256Hex(data: BufferSource | string): Promise<string> {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function localReviewOn(): boolean {
  return typeof __PG_BUILD_IDENTITY__ !== "undefined";
}

/** A small cached list image; the full original loads only in the detail. */
function thumbUrl(candidateId: string, sha: string): string {
  return `${BENCH}/thumb?candidateId=${encodeURIComponent(candidateId)}&sha256=${sha}`;
}

function originalUrl(candidateId: string, sha: string): string {
  return `${BENCH}/original?candidateId=${encodeURIComponent(candidateId)}&v=${sha.slice(0, 12)}`;
}

async function getJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

/** Per-launch owner capability, issued only to this same-origin page. */
let ownerSession: { ownerId: string; capability: string } | null = null;

async function loadSession(): Promise<typeof ownerSession> {
  const response = await fetch(`${BENCH}/session`, { cache: "no-store" });
  ownerSession = response.ok ? await response.json() : null;
  return ownerSession;
}

async function postEvent(
  type: string,
  payload: unknown,
): Promise<
  | { ok: true; body: { events: { eventId: string }[] } }
  | { ok: false; message: string; error?: string }
> {
  if (!ownerSession) await loadSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (ownerSession) headers["X-OCD-Owner-Capability"] = ownerSession.capability;
  const response = await fetch(`${BENCH}/events`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type,
      payload,
      actor: { kind: "owner", id: ownerSession?.ownerId ?? "unknown" },
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    events?: { eventId: string }[];
    message?: string;
    error?: string;
  };
  if (!response.ok) {
    return {
      ok: false,
      message: body.message ?? response.statusText,
      error: body.error,
    };
  }
  return { ok: true, body: { events: body.events ?? [] } };
}

/** Keys typed into a field are text, never desk commands. */
function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

const BYTES_LABEL: Record<BytesInfo["state"] | "unchecked" | "none", string> = {
  verified: "",
  missing: "Image unavailable",
  "hash-mismatch": "File changed",
  "not-a-raster": "Image unreadable",
  unchecked: "Loading image",
  none: "—",
};

function Thumb({
  candidate,
  bytes,
  testId,
}: {
  readonly candidate?: ProjectedCandidate;
  readonly bytes?: BytesInfo;
  readonly testId: string;
}) {
  const [failedSha, setFailedSha] = useState<string | null>(null);
  const failed = candidate !== undefined && failedSha === candidate.sha256;
  // A row only asks for its own small thumbnail when it scrolls into view;
  // the server checks that one image on demand if it has not yet.
  if (
    candidate &&
    !failed &&
    (bytes?.state === "verified" || bytes?.state === "unchecked")
  ) {
    return (
      <img
        className={`art-desk-thumb${candidate.hasAlpha ? " art-desk-thumb--alpha" : ""}`}
        data-testid={testId}
        src={thumbUrl(candidate.candidateId, candidate.sha256)}
        alt=""
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        onError={() => setFailedSha(candidate.sha256)}
      />
    );
  }
  const state = candidate ? (bytes?.state ?? "unchecked") : "none";
  return (
    <span
      className="art-desk-thumb art-desk-thumb--none"
      data-testid={`${testId}-none`}
      data-candidate-bytes={state}
      aria-hidden="true"
    >
      {BYTES_LABEL[state]}
    </span>
  );
}

const TAB_STORAGE_KEY = "ocd-art-desk-tab";
type ArtDeskSection = ArtDeskTab | "notifications";
const ART_DESK_SECTIONS: readonly { key: ArtDeskSection; label: string }[] = [
  { key: "notifications", label: "Notifications" },
  ...ART_DESK_NAV_TABS,
];

function storedTab(): ArtDeskSection {
  try {
    const value = window.localStorage.getItem(TAB_STORAGE_KEY);
    return ART_DESK_SECTIONS.some((tab) => tab.key === value)
      ? (value as ArtDeskSection)
      : "needs-review";
  } catch {
    return "needs-review";
  }
}

function cardTestId(card: ArtDeskCard): string {
  return card.key.startsWith("request:")
    ? `art-desk-row-${card.requestId}`
    : `art-desk-card-${card.key.replace(/^inbox:/, "").replace(/[^A-Za-z0-9-]+/g, "-")}`;
}

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function historyStageLabel(stage: string | null | undefined): string {
  const label = stage?.trim() ?? "";
  return label ? label[0]!.toUpperCase() + label.slice(1) : "Version";
}

const MORE_FILTER_FACETS = ["region", "season", "family", "custom"] as const;

export function ArtDeskView() {
  const privateAuthoring = localReviewOn();
  const [bench, setBench] = useState<BenchState | null>(null);
  const [inputs, setInputs] = useState<InputsReceipt | null>(null);
  const [lane, setLane] = useState<RequestLane | "all">("needs-review");
  const [status, setStatus] = useState<
    CandidateStatus | "all" | "with-art-team"
  >("all");
  const [query, setQuery] = useState("");
  const [facet, setFacet] = useState<{ key: string; value: string } | null>(
    null,
  );
  const [untagged, setUntagged] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [viewedCandidateId, setViewedCandidateId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showIds, setShowIds] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState<RequestDraftMode | null>(
    null,
  );
  const [tab, setTabState] = useState<ArtDeskSection>(storedTab);
  const lastArtworkTab = useRef<ArtDeskTab>(
    tab === "notifications" ? "needs-review" : tab,
  );
  const [detailHasDraft, setDetailHasDraft] = useState(false);
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<string>("all");
  const [purpose, setPurpose] = useState("all");
  const [showMore, setShowMore] = useState(false);
  const [showQa, setShowQa] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [viewRestored, setViewRestored] = useState(!window.ocdArtBench);
  useEffect(() => {
    if (!window.ocdArtBench) return;
    void window.ocdArtBench
      .viewState()
      .then((saved) => {
        if (saved?.candidateId) setViewedCandidateId(saved.candidateId);
        if (saved?.cardKey) setSelectedCardKey(saved.cardKey);
        if (saved?.requestId) setSelectedRequestId(saved.requestId);
        if (
          saved?.tab &&
          ART_DESK_SECTIONS.some((entry) => entry.key === saved.tab)
        )
          setTabState(saved.tab as ArtDeskSection);
      })
      .catch(() => {})
      .finally(() => setViewRestored(true));
  }, []);
  const setTab = (next: ArtDeskSection) => {
    if (next !== "notifications") lastArtworkTab.current = next;
    setTabState(next);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      /* the tab simply isn't remembered */
    }
  };

  const reloadTicket = useRef(0);
  const inputsRequest = useRef<Promise<InputsReceipt | null> | null>(null);
  // What the page has open, so the server checks those images first.
  const deskFocus = useRef<{ tab: string; focus: readonly string[] }>({
    tab: "",
    focus: [],
  });
  const reload = useCallback(async () => {
    const ticket = ++reloadTicket.current;
    const { tab: openTab, focus } = deskFocus.current;
    const query = new URLSearchParams();
    if (openTab) query.set("tab", openTab);
    if (focus.length) query.set("focus", focus.join(","));
    const [state] = await Promise.all([
      getJson<BenchState>(`${BENCH}/state?${query}`).then((state) => {
        if (state && ticket === reloadTicket.current)
          setBench((previous) => {
            if (
              previous &&
              previous.projection.lastSeq > state.projection.lastSeq
            )
              return previous;
            const merged = {
              ...state,
              notificationReadEventIds: [
                ...new Set([
                  ...(previous?.store.storeId === state.store.storeId
                    ? (previous.notificationReadEventIds ?? [])
                    : []),
                  ...(state.notificationReadEventIds ?? []),
                ]),
              ],
            };
            return previous &&
              benchSnapshotSignature(previous) ===
                benchSnapshotSignature(merged)
              ? previous
              : merged;
          });
        return state;
      }),
      (inputsRequest.current ??= getJson<InputsReceipt>(INPUTS_ROUTE).then(
        (receipt) => {
          if (!receipt) inputsRequest.current = null;
          return receipt;
        },
        () => {
          inputsRequest.current = null;
          return null;
        },
      )).then((receipt) => {
        if (receipt) setInputs(receipt);
      }),
    ]);
    return state;
  }, []);

  useEffect(() => {
    if (!privateAuthoring) return;
    void loadSession();
    let live = true;
    let timer: number | undefined;
    // The desk updates once here and then only when the owner presses
    // Sync now (or acts). The one exception is loading: while the server is
    // still checking images it is asked again every 1.5 s, so they appear.
    const poll = async () => {
      let pending = 0;
      try {
        pending = (await reload())?.bytesPending ?? 0;
      } catch {
        /* Sync now retries */
      }
      if (live && pending > 0) timer = window.setTimeout(poll, 1500);
    };
    void poll();
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [privateAuthoring, reload]);

  const projection = bench?.projection;
  const rows = useMemo(
    () => (projection ? catalogRows(projection) : []),
    [projection],
  );
  const counts = useMemo(() => facetCounts(rows), [rows]);
  const filteredRows = useMemo(
    () =>
      filterCatalog(rows, {
        lane,
        status: status === "with-art-team" ? "all" : status,
        text: query,
        untagged,
        tags: facet ? { [facet.key]: [facet.value] } : undefined,
      }),
    [rows, lane, status, query, untagged, facet],
  );
  // One list row per request; the request's selected (or viewed) candidate leads.
  const requestRows = useMemo(() => {
    const seen = new Map<string, ProjectedRequest>();
    for (const row of filteredRows)
      seen.set(row.request.request.requestId, row.request);
    return [...seen.values()];
  }, [filteredRows]);

  // The detail always shows a request from the current lane/filter.
  const selectedRequest =
    requestRows.find((r) => r.request.requestId === selectedRequestId) ??
    requestRows[0] ??
    null;

  useEffect(() => {
    // The lane view (Advanced) keeps its own selection; the card view below
    // chooses the viewed version from the selected card.
    if (!viewRestored || !advancedOpen || !selectedRequest) return;
    if (
      viewedCandidateId &&
      selectedRequest.candidateIds.includes(viewedCandidateId)
    )
      return;
    setViewedCandidateId(
      selectedRequest.selectedCandidateId ??
        selectedRequest.candidateIds.at(-1) ??
        null,
    );
  }, [advancedOpen, selectedRequest, viewedCandidateId, viewRestored]);

  const [selectedBuild, setSelectedBuild] = useState<SelectedArtBuild | null>(
    null,
  );
  // Asked at startup and on Sync now, never on a timer.
  const refreshSelectedBuild = useRef<() => void>(() => {});
  useEffect(() => {
    let live = true;
    const refresh = () =>
      void window.ocdArtBench
        ?.selectedBuild?.()
        .then((build) => {
          if (live)
            setSelectedBuild((previous) =>
              JSON.stringify(previous) === JSON.stringify(build)
                ? previous
                : build,
            );
        })
        .catch(() => {
          if (live) setSelectedBuild(null);
        });
    refresh();
    refreshSelectedBuild.current = refresh;
    return () => {
      live = false;
      refreshSelectedBuild.current = () => {};
    };
  }, []);

  const cards = useMemo(
    () =>
      projection && bench
        ? artDeskCards(projection, selectedBuild)
            .filter(cardOnDesk)
            .map((card) => {
              const request = projection.requests[card.requestId]?.request;
              return card.tabs.includes("requests") &&
                request &&
                !generationRequestReady(request, projection, bench.bytes)
                ? {
                    ...card,
                    tabs: card.tabs.filter((tab) => tab !== "requests"),
                  }
                : card;
            })
        : [],
    [projection, bench, selectedBuild],
  );
  const notifications = useMemo(
    () =>
      projection
        ? artDeskNotifications(projection, bench?.notificationReadEventIds)
        : [],
    [projection, bench?.notificationReadEventIds],
  );
  const unreadCount = notifications.filter((item) => item.unread).length;
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationTarget, setNotificationTarget] = useState<string | null>(
    null,
  );
  const markNotificationsRead = async (ids: readonly string[]) => {
    setNotificationBusy(true);
    setNotificationError("");
    try {
      if (!ownerSession) await loadSession();
      const response = await fetch(`${BENCH}/notifications/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OCD-Owner-Capability": ownerSession?.capability ?? "",
        },
        body: JSON.stringify({ eventIds: ids }),
      });
      if (!response.ok)
        throw new Error("Could not save read status. Please try again.");
      const result = (await response.json()) as { readEventIds: string[] };
      setBench((previous) =>
        previous
          ? {
              ...previous,
              notificationReadEventIds: [
                ...new Set([
                  ...(previous.notificationReadEventIds ?? []),
                  ...result.readEventIds,
                ]),
              ],
            }
          : previous,
      );
    } catch {
      setNotificationError("Could not save read status. Please try again.");
    } finally {
      setNotificationBusy(false);
    }
  };
  useEffect(() => {
    if (!notificationTarget || tab === "notifications") return;
    const element = document.getElementById(
      `art-desk-message-${notificationTarget}`,
    );
    if (element) {
      element.focus();
      element.scrollIntoView({ block: "center" });
      setNotificationTarget(null);
    }
  }, [notificationTarget, tab, viewedCandidateId, projection]);
  const counts4 = useMemo(() => tabCounts(cards, showQa), [cards, showQa]);
  const assetTypes = useMemo(
    () =>
      [
        ...new Set(cards.map((card) => card.assetType).filter(Boolean)),
      ].sort() as string[],
    [cards],
  );
  const visibleCards = useMemo(() => {
    // A tag recorded on any version of the asset belongs to the card, so the
    // facet chips and the untagged filter read every candidate, not the lead.
    const byFacet = facet
      ? cards.filter((card) => cardMatchesFacet(card, facet.key, facet.value))
      : cards;
    const byPurpose =
      purpose === "all"
        ? byFacet
        : byFacet.filter((card) => cardMatchesFacet(card, "purpose", purpose));
    const byUntagged = untagged ? byPurpose.filter(cardIsUntagged) : byPurpose;
    return filterCards(byUntagged, {
      tab: tab === "notifications" ? lastArtworkTab.current : tab,
      text: query,
      status,
      assetType,
      showQa,
    });
  }, [cards, facet, purpose, untagged, tab, query, status, assetType, showQa]);
  const selectedCard =
    visibleCards.find((card) => card.key === selectedCardKey) ??
    visibleCards[0] ??
    null;
  const openTab = tab === "notifications" ? lastArtworkTab.current : tab;
  const focusKey = [viewedCandidateId, selectedCard?.leadCandidateId]
    .filter((id): id is string => Boolean(id))
    .join(",");
  const focusUnchecked = focusKey
    .split(",")
    .some((id) => id && bench?.bytes[id]?.state === "unchecked");
  useEffect(() => {
    deskFocus.current = {
      tab: openTab,
      focus: focusKey ? focusKey.split(",") : [],
    };
    // An open image the server has not checked yet is checked right away.
    if (focusUnchecked) void reload();
  }, [openTab, focusKey, focusUnchecked, reload]);
  const allowedCandidateIds = advancedOpen
    ? (selectedRequest?.candidateIds ?? [])
    : selectedCard
      ? [
          ...selectedCard.lineage.map((step) => step.candidateId),
          ...selectedCard.otherVersions,
        ]
      : [];
  const effectiveCandidateId =
    viewedCandidateId && allowedCandidateIds.includes(viewedCandidateId)
      ? viewedCandidateId
      : advancedOpen
        ? (selectedRequest?.selectedCandidateId ??
          selectedRequest?.candidateIds.at(-1))
        : selectedCard?.leadCandidateId;
  const viewed =
    (effectiveCandidateId && projection?.candidates[effectiveCandidateId]) ||
    null;
  const viewedBytes = viewed ? bench?.bytes[viewed.candidateId] : undefined;
  const moreFilterCount =
    (facet ? 1 : 0) + (untagged ? 1 : 0) + (showQa ? 1 : 0);
  const clearFilters = () => {
    setFacet(null);
    setUntagged(false);
    setShowQa(false);
    setQuery("");
    setStatus("all");
    setAssetType("all");
    setPurpose("all");
  };
  const openNotification = (item: ArtDeskNotification) => {
    if (detailHasDraft) {
      setNotificationError(
        "You have an unfinished note. Go back to your artwork to send or clear it before opening another message.",
      );
      return;
    }
    clearFilters();
    setAdvancedOpen(false);
    setTab("discussion");
    setSelectedCardKey(item.cardKey);
    setSelectedRequestId(item.requestId);
    setViewedCandidateId(
      item.candidateId
        ? (projection?.candidates[item.candidateId]?.aliasOf ??
            item.candidateId)
        : null,
    );
    setNotificationTarget(item.eventId);
    void markNotificationsRead([item.eventId]);
  };
  const detailRequest = advancedOpen
    ? selectedRequest
    : selectedCard && projection
      ? (projection.requests[selectedCard.requestId] ?? null)
      : null;

  useEffect(() => {
    if (!viewRestored || advancedOpen || !selectedCard) return;
    if (
      viewedCandidateId &&
      (selectedCard.lineage.some((s) => s.candidateId === viewedCandidateId) ||
        selectedCard.otherVersions.includes(viewedCandidateId))
    )
      return;
    setViewedCandidateId(selectedCard.leadCandidateId);
  }, [advancedOpen, selectedCard, viewedCandidateId, viewRestored]);
  useEffect(() => {
    if (viewRestored && (viewed || detailRequest))
      window.ocdArtBench?.rememberView({
        candidateId: viewed?.candidateId ?? null,
        cardKey: selectedCard?.key ?? null,
        requestId:
          detailRequest?.request.requestId ?? viewed?.requestId ?? null,
        tab,
      });
  }, [
    viewRestored,
    viewed,
    detailRequest?.request.requestId,
    selectedCard?.key,
    tab,
  ]);

  const contractHashes = useCallback(
    async (request: AssetRequest, sceneId: string | undefined) => {
      const brief = compileAssetBrief({
        request,
        stylePixels: styleReferencesFor(
          request,
          inputs?.privatePack ?? { status: "unknown", note: "no receipt" },
        ),
      });
      return {
        fitContractHash: await sha256Hex(briefContractHash(brief)),
        sceneContractHash: await sha256Hex(sceneId ?? request.requestId),
        contractVersion: ART_DESK_CONTRACT_ID,
      };
    },
    [inputs],
  );

  const decide = useCallback(
    async (
      candidate: ProjectedCandidate,
      decision: "approve" | "reject" | "request-revision",
      note?: string,
    ) => {
      if (!projection || busy) return false;
      const request = projection.requests[candidate.requestId];
      if (!request) {
        setMessage("Assign this candidate to a request before deciding.");
        return false;
      }
      setBusy(true);
      try {
        // The decision names the exact candidate and hash the reviewer sees now.
        const fresh = await reload();
        const current = fresh?.projection.candidates[candidate.candidateId];
        if (!current || current.sha256 !== candidate.sha256) {
          setMessage(
            "The candidate changed while you were looking; review the current one before deciding.",
          );
          return false;
        }
        const latest = fresh?.projection.requests[candidate.requestId];
        if (
          latest &&
          latest.selectedCandidateId &&
          latest.selectedCandidateId !== candidate.candidateId &&
          latest.candidateIds.at(-1) !== candidate.candidateId
        ) {
          // Another upload arrived: keep the viewed one, do not substitute.
          setMessage(
            `A newer candidate arrived on this request; your decision applies only to ${candidate.candidateId.slice(0, 13)}… (rev ${candidate.revision}).`,
          );
        }
        const result = await postEvent("review.decided", {
          candidateId: candidate.candidateId,
          viewedCandidateId: candidate.candidateId,
          viewedSha256: candidate.sha256,
          decision,
          note,
          ...(await contractHashes(
            request.request,
            request.request.scope?.familyId,
          )),
        });
        if (!result.ok) {
          setMessage(`Could not save your decision: ${result.message}`);
          return false;
        }
        await reload();
        setMessage(
          decision === "approve"
            ? "Approved. Moved to Approved / waiting to be implemented."
            : decision === "reject"
              ? "Rejected. Moved to Rejected."
              : "Changes requested. Your note is saved.",
        );
        return true;
      } finally {
        setBusy(false);
      }
    },
    [projection, busy, reload, contractHashes],
  );

  const intake = useCallback(
    async (
      files: readonly File[],
      meta: {
        requestId?: string;
        parentCandidateId?: string;
        editKind?: EditKind;
        note?: string;
      },
    ) => {
      const results: {
        name: string;
        ok: boolean;
        candidateId?: string;
        message: string;
        duplicate?: boolean;
      }[] = [];
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const params = new URLSearchParams({
          meta: JSON.stringify({ ...meta, originalName: file.name }),
        });
        const response = await fetch(`${BENCH}/intake?${params.toString()}`, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: bytes,
        });
        const body = (await response.json().catch(() => ({}))) as {
          candidate?: ProjectedCandidate;
          duplicate?: boolean;
          message?: string;
          error?: string;
        };
        results.push({
          name: file.name,
          ok: response.ok,
          candidateId: body.candidate?.candidateId,
          duplicate: body.duplicate,
          message: response.ok
            ? body.duplicate
              ? `already present as ${body.candidate?.candidateId.slice(0, 13)}…`
              : `stored as ${body.candidate?.candidateId.slice(0, 13)}… ${body.candidate?.width}×${body.candidate?.height} ${body.candidate?.container}${body.candidate?.hasAlpha ? " α" : ""}`
            : `refused (${body.error ?? response.status}): ${body.message ?? response.statusText}`,
        });
      }
      await reload();
      const last = [...results].reverse().find((r) => r.ok && r.candidateId);
      if (last?.candidateId) setViewedCandidateId(last.candidateId);
      setMessage(results.map((r) => `${r.name}: ${r.message}`).join(" · "));
      return results;
    },
    [reload],
  );

  const syncNow = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch(`${BENCH}/sync`, { method: "POST" });
      const status = (await response.json()) as SyncInfo;
      inputsRequest.current = null;
      refreshSelectedBuild.current();
      await reload();
      setMessage(
        `Sync ${status.status}: ${status.pendingOutbox} unsynced event(s), ${status.pendingBatches.length} partial batch(es)${status.lastError ? `; ${status.lastError}` : ""}.`,
      );
    } finally {
      setBusy(false);
    }
  }, [reload]);

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (tab === "notifications") return;
    if (isTextTarget(event.target)) return;
    if (
      !advancedOpen &&
      (event.key === "ArrowDown" ||
        event.key === "j" ||
        event.key === "ArrowUp" ||
        event.key === "k")
    ) {
      event.preventDefault();
      const keys = visibleCards.map((card) => card.key);
      const at = selectedCard ? keys.indexOf(selectedCard.key) : 0;
      const next =
        event.key === "ArrowDown" || event.key === "j"
          ? Math.min(keys.length - 1, at + 1)
          : Math.max(0, at - 1);
      const card = visibleCards[next];
      if (card) {
        setSelectedCardKey(card.key);
        setViewedCandidateId(card.leadCandidateId);
      }
      return;
    }
    const ids = requestRows.map((r) => r.request.requestId);
    const index = selectedRequest
      ? ids.indexOf(selectedRequest.request.requestId)
      : 0;
    if (event.key === "ArrowDown" || event.key === "j") {
      event.preventDefault();
      setSelectedRequestId(ids[Math.min(ids.length - 1, index + 1)] ?? null);
    } else if (event.key === "ArrowUp" || event.key === "k") {
      event.preventDefault();
      setSelectedRequestId(ids[Math.max(0, index - 1)] ?? null);
    } else if (event.key === "a" && viewed) {
      void decide(viewed, "approve");
    } else if (event.key === "x" && viewed) {
      void decide(viewed, "reject");
    }
  }

  if (!privateAuthoring) {
    return (
      <main
        className="art-desk art-desk--refused"
        data-testid="art-desk-refused"
      >
        <h1>Private Art Desk</h1>
        <p>
          This authoring view mounts only on the identified loopback review
          server (<code>npm run dev:identified</code>). Ordinary production play
          cannot open it.
        </p>
      </main>
    );
  }

  const pack = inputs?.privatePack ?? {
    status: "unknown",
    note: "Private pack state has not been read from the identified server yet.",
  };
  const sync = bench?.sync;

  const syncLine = sync
    ? sync.status === "ok"
      ? `Shared with the art team${sync.lastSuccessAt ? ` ${shortDate(sync.lastSuccessAt)}` : ""}`
      : sync.status === "needs-mirror"
        ? "Shared art-team exchange not connected"
        : sync.status === "error"
          ? "Could not sync with the art team"
          : "Waiting to sync with the art team"
    : "Shared art-team exchange —";
  const packLine =
    pack.status === "verified"
      ? "Artwork ready"
      : `Private pack ${pack.status}`;

  const detail =
    detailRequest && projection && bench ? (
      <RequestDetail
        key={selectedCard?.key ?? detailRequest.request.requestId}
        card={advancedOpen ? undefined : (selectedCard ?? undefined)}
        request={detailRequest}
        projection={projection}
        selectedBuild={selectedBuild}
        bench={bench}
        pack={pack}
        viewed={viewed}
        viewedBytes={viewedBytes}
        busy={busy}
        showIds={showIds}
        onToggleIds={() => setShowIds((v) => !v)}
        onView={setViewedCandidateId}
        onDraftChange={setDetailHasDraft}
        onDecide={decide}
        onIntake={intake}
        onSelect={async (candidateId) => {
          const result = await postEvent("candidate.selected", {
            requestId: detailRequest.request.requestId,
            candidateId,
          });
          setMessage(
            result.ok
              ? `Chose ${candidateId.slice(0, 13)}… as the current version.`
              : result.message,
          );
          await reload();
        }}
        onMessage={async (text) => {
          const result = await postEvent("message.posted", {
            requestId: detailRequest.request.requestId,
            candidateId: viewed?.candidateId,
            text,
            kind: "question",
          });
          setMessage(
            result.ok
              ? "Question saved. Replies will appear on this item."
              : `Could not send: ${result.message}`,
          );
          await reload();
          return result.ok;
        }}
        onTags={async (candidate, tags) => {
          const result = await postEvent("tags.set", {
            entity: "candidate",
            entityId: candidate.candidateId,
            tags,
            baseVersion: candidate.tagsVersion,
          });
          setMessage(
            result.ok ? "Saved." : `Tags not saved: ${result.message}`,
          );
          await reload();
          return result.ok;
        }}
      />
    ) : (
      <article className="art-desk-detail" data-testid="art-desk-detail">
        <p>
          {bench ? "Nothing matches these filters." : "Loading the Art Desk…"}
        </p>
      </article>
    );

  return (
    <div
      className="art-desk art-desk--human"
      data-testid="art-desk"
      tabIndex={0}
      onKeyDown={onKey}
    >
      <header className="art-desk-header art-desk-header--compact">
        <div className="art-desk-titlebar">
          <h1>Art Desk</h1>
          <p className="art-desk-connection" data-testid="art-desk-connection">
            <span data-pack-status={pack.status}>{packLine}</span>
            {" · "}
            <span data-sync-status={sync?.status ?? "unknown"}>{syncLine}</span>
            {sync && sync.pendingOutbox > 0
              ? ` · ${sync.pendingOutbox} to send`
              : ""}{" "}
            <button
              type="button"
              className="art-desk-quiet"
              disabled={busy}
              onClick={() => void syncNow()}
            >
              Sync now
            </button>
          </p>
        </div>
        <nav className="art-desk-tabs" aria-label="Art Desk sections">
          {ART_DESK_SECTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={
                !advancedOpen && tab === item.key ? "page" : undefined
              }
              data-testid={`art-desk-tab-${item.key}`}
              onClick={() => {
                if (item.key === "notifications") {
                  setSelectedCardKey(selectedCard?.key ?? null);
                  setViewedCandidateId(viewed?.candidateId ?? null);
                }
                setAdvancedOpen(false);
                setTab(item.key);
              }}
            >
              {item.label}{" "}
              <span className="art-desk-count">
                {item.key === "notifications" ? unreadCount : counts4[item.key]}
              </span>
            </button>
          ))}
        </nav>
        <div className="art-desk-toolbar" hidden={tab === "notifications"}>
          <label>
            Search{" "}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search requests"
            />
          </label>
          <label>
            Status{" "}
            <select
              aria-label="Candidate status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    CandidateStatus | "all" | "with-art-team",
                )
              }
            >
              <option value="all">Any</option>
              {[
                [
                  "awaiting-review",
                  "Awaiting your review",
                  counts4["needs-review"],
                ],
                ["with-art-team", "With the art team", counts4["in-progress"]],
                [
                  "approved",
                  "Approved / waiting to be implemented",
                  counts4.approved,
                ],
                ["rejected", "Rejected", counts4.rejected],
                ["installed", "In game", counts4["in-game"]],
              ].map(([key, label, count]) => (
                <option key={key} value={key}>
                  {label} ({count})
                </option>
              ))}
            </select>
          </label>
          <label>
            Category{" "}
            <select
              aria-label="Artwork category"
              data-testid="art-desk-asset-type"
              value={assetType}
              onChange={(event) => setAssetType(event.target.value)}
            >
              <option value="all">Any</option>
              {assetTypes.map((type) => (
                <option key={type} value={type}>
                  {artworkCategoryLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Show{" "}
            <select
              aria-label="Artwork purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
            >
              <option value="all">Everything</option>
              <option value="regional-background">Regional backgrounds</option>
              <option value="people-wardrobe">People and clothing</option>
              <option value="pose">Poses</option>
              <option value="scene-contact">People in scenes</option>
              <option value="graphics">News and graphics</option>
            </select>
          </label>
          <button
            type="button"
            data-testid="art-desk-more-filters"
            aria-expanded={showMore}
            onClick={() => setShowMore((v) => !v)}
          >
            More filters{moreFilterCount ? ` (${moreFilterCount})` : ""}
          </button>
          {moreFilterCount ||
          query ||
          status !== "all" ||
          assetType !== "all" ||
          purpose !== "all" ? (
            <button
              type="button"
              className="art-desk-quiet"
              data-testid="art-desk-clear-filters"
              onClick={clearFilters}
            >
              Clear all
            </button>
          ) : null}
          <span className="art-desk-toolbar-spacer" />
          <button
            type="button"
            data-testid="art-desk-new-request-open"
            aria-pressed={showNewRequest === "new"}
            onClick={() =>
              setShowNewRequest((v) => (v === "new" ? null : "new"))
            }
          >
            New request
          </button>
          <button
            type="button"
            data-testid="art-desk-related-request-open"
            aria-pressed={showNewRequest === "related"}
            disabled={
              !detailRequest || detailRequest.request.requestId === "inbox"
            }
            title={
              detailRequest
                ? `Variant of ${detailRequest.request.title}`
                : "Select an asset first"
            }
            onClick={() =>
              setShowNewRequest((v) => (v === "related" ? null : "related"))
            }
          >
            Create related variant
          </button>
        </div>
        {showMore ? (
          <div className="art-desk-more" data-testid="art-desk-more-drawer">
            <label>
              <input
                type="checkbox"
                checked={untagged}
                onChange={(event) => setUntagged(event.target.checked)}
              />{" "}
              Untagged only ({counts.untagged})
            </label>
            <label>
              <input
                type="checkbox"
                data-testid="art-desk-show-qa"
                checked={showQa}
                onChange={(event) => setShowQa(event.target.checked)}
              />{" "}
              Show test requests
            </label>
            {MORE_FILTER_FACETS.filter((key) => counts.tags[key]).map((key) => (
              <label key={key}>
                {key === "custom"
                  ? "Source and notes"
                  : key[0]!.toUpperCase() + key.slice(1)}{" "}
                <select
                  aria-label={`Filter by ${key}`}
                  data-testid={`art-desk-filter-${key}`}
                  value={facet?.key === key ? facet.value : ""}
                  onChange={(event) =>
                    setFacet(
                      event.target.value
                        ? { key, value: event.target.value }
                        : null,
                    )
                  }
                >
                  <option value="">Any</option>
                  {Object.entries(counts.tags[key] ?? {}).map(
                    ([value, count]) => (
                      <option key={value} value={value}>
                        {key === "family" ? familyLabel(value) : value} ({count}
                        )
                      </option>
                    ),
                  )}
                </select>
              </label>
            ))}
          </div>
        ) : null}
        {showNewRequest && projection ? (
          <NewRequestForm
            key={`${showNewRequest}:${showNewRequest === "related" ? (detailRequest?.request.requestId ?? "") : ""}`}
            mode={showNewRequest}
            projection={projection}
            related={showNewRequest === "related" ? detailRequest : null}
            relatedCandidate={showNewRequest === "related" ? viewed : null}
            onCancel={() => setShowNewRequest(null)}
            onDone={async (created) => {
              setShowNewRequest(null);
              await reload();
              if (created) {
                setTab("requests");
                setSelectedCardKey(`request:${created}`);
                setSelectedRequestId(created);
              }
            }}
            setMessage={setMessage}
          />
        ) : null}
      </header>
      {notificationError ? (
        <p role="alert" className="art-desk-warning">
          {notificationError}
        </p>
      ) : null}
      {tab === "notifications" ? (
        <section
          className="art-desk-notifications"
          aria-label="Art team notifications"
          data-testid="art-desk-notifications"
        >
          <div className="art-desk-notifications-heading">
            <div>
              <h2>Notifications</h2>
              <p>
                Updates and replies from the art team. Open a message to see its
                artwork and conversation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNotificationError("");
                setTab(lastArtworkTab.current);
              }}
            >
              Back to artwork
            </button>
            <button
              type="button"
              disabled={notificationBusy || unreadCount === 0}
              onClick={() =>
                void markNotificationsRead(
                  notifications
                    .filter((item) => item.unread)
                    .map((item) => item.eventId),
                )
              }
            >
              Mark all read
            </button>
          </div>
          {notifications.length === 0 ? (
            <p>No updates yet. Messages from the art team will appear here.</p>
          ) : null}
          <ol>
            {notifications.map((item) => (
              <li
                key={item.eventId}
                data-unread={item.unread}
                data-testid={`art-desk-notification-${item.eventId}`}
              >
                <div>
                  <strong>
                    {item.unread ? "New message" : "Art team update"}
                  </strong>
                  <time dateTime={item.at}>
                    {new Date(item.at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <button
                  type="button"
                  disabled={notificationBusy}
                  onClick={() => openNotification(item)}
                >
                  Open artwork and message
                </button>
                {item.unread ? (
                  <button
                    type="button"
                    className="art-desk-quiet"
                    disabled={notificationBusy}
                    onClick={() => void markNotificationsRead([item.eventId])}
                  >
                    Mark read
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {advancedOpen ? null : (
        <div className="art-desk-layout" hidden={tab === "notifications"}>
          <ol
            className="art-desk-list art-desk-cards"
            data-testid="art-desk-list"
          >
            {visibleCards.length === 0 && bench ? (
              <li className="art-desk-empty">
                {tab === "needs-review"
                  ? "Nothing is waiting for your review."
                  : "Nothing here yet."}
              </li>
            ) : null}
            {visibleCards.map((card) => {
              const lead = card.leadCandidateId
                ? projection?.candidates[card.leadCandidateId]
                : undefined;
              return (
                <li key={card.key}>
                  <button
                    type="button"
                    className="art-desk-row art-desk-card"
                    aria-pressed={selectedCard?.key === card.key}
                    data-testid={cardTestId(card)}
                    data-card-status={card.status ?? "none"}
                    onClick={() => {
                      setSelectedCardKey(card.key);
                      setSelectedRequestId(card.requestId);
                      setViewedCandidateId(card.leadCandidateId);
                    }}
                  >
                    <Thumb
                      candidate={lead}
                      bytes={lead ? bench?.bytes[lead.candidateId] : undefined}
                      testId={
                        card.key.startsWith("request:")
                          ? `art-desk-thumb-${card.requestId}`
                          : `${cardTestId(card)}-thumb`
                      }
                    />
                    <span className="art-desk-row-copy">
                      <strong>
                        {card.requestCode ? `${card.requestCode} · ` : ""}
                        {card.title}
                      </strong>
                      <span className="art-desk-card-change">
                        {card.change}
                      </span>
                      <span className="art-desk-meta">
                        <span
                          className={`art-desk-badge art-desk-badge--${card.status ?? "none"}`}
                        >
                          {card.statusLabel}
                        </span>{" "}
                        {lead
                          ? `Latest: revision ${lead.revision} · `
                          : "Request · "}
                        {card.versionCount} version
                        {card.versionCount === 1 ? "" : "s"}
                        {card.updatedAt
                          ? ` · ${shortDate(card.updatedAt)}`
                          : ""}
                        {card.qa ? " · test" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="art-desk-detail-column">
            {selectedCard?.lineageState ? (
              <details
                className="art-desk-asset-lineage"
                data-testid="art-desk-asset-lineage"
                data-lineage-state={selectedCard.lineageState}
              >
                <summary>Version history</summary>
                {selectedCard.lineageState === "not-recorded" ? (
                  <p
                    className="art-desk-warning"
                    data-testid="art-desk-asset-lineage-unrecorded"
                  >
                    {lineageSentence({
                      state: "not-recorded",
                      steps: selectedCard.lineage,
                      declaredParentId:
                        (selectedCard.leadCandidateId
                          ? projection?.candidates[selectedCard.leadCandidateId]
                              ?.parentCandidateId
                          : null) ?? null,
                    })}
                  </p>
                ) : null}
                <ol>
                  {[...selectedCard.lineage].reverse().map((step) => (
                    <li key={step.candidateId}>
                      <button
                        type="button"
                        aria-pressed={viewedCandidateId === step.candidateId}
                        onClick={() => setViewedCandidateId(step.candidateId)}
                      >
                        {historyStageLabel(step.stage)} · {step.width}×
                        {step.height} · {shortDate(step.at)}
                      </button>
                    </li>
                  ))}
                </ol>
                {selectedCard.otherVersions.length ? (
                  <p className="art-desk-meta">
                    Also {selectedCard.otherVersions.length} other version
                    {selectedCard.otherVersions.length === 1 ? "" : "s"} of this
                    image, listed below.
                  </p>
                ) : null}
              </details>
            ) : null}
            {detail}
          </div>
        </div>
      )}
      <details
        className="art-desk-advanced"
        data-testid="art-desk-advanced"
        hidden={tab === "notifications"}
        open={advancedOpen}
        onToggle={(event) =>
          setAdvancedOpen((event.target as HTMLDetailsElement).open)
        }
      >
        <summary>More information</summary>
        {advancedOpen ? (
          <>
            <p
              className="art-desk-pack"
              data-testid="art-desk-pack"
              data-pack-status={pack.status}
            >
              <strong>Private pack: {pack.status}.</strong> {pack.note}
              {inputs && bench ? (
                <span className="art-desk-meta" data-testid="art-desk-inputs">
                  {" "}
                  Receipt read {inputs.checkedAt};{" "}
                  {Object.keys(bench.projection.candidates).length}{" "}
                  candidate(s),{" "}
                  {
                    Object.values(bench.bytes).filter(
                      (b) => b.state === "verified",
                    ).length
                  }{" "}
                  with verified bytes; store {bench.store.storeId.slice(0, 14)}…
                  ({bench.store.dataRootLabel}).
                </span>
              ) : (
                <span className="art-desk-meta" data-testid="art-desk-loading">
                  {" "}
                  Bench data not loaded yet.
                </span>
              )}
            </p>
            {sync ? (
              <p
                className="art-desk-sync"
                data-testid="art-desk-sync"
                data-sync-status={sync.status}
              >
                <strong>Shared art-team exchange: {sync.status}.</strong>{" "}
                {sync.driveRootPresent
                  ? `Mirror ${sync.driveRoot} present.`
                  : "No Drive-for-desktop mirror of 80_ARTBENCH_EXCHANGE on this machine; decisions queue durably in the outbox."}{" "}
                Last success {sync.lastSuccessAt ?? "never"};{" "}
                {sync.pendingOutbox} unsynced event(s);{" "}
                {sync.pendingBatches.length} partial batch(es);{" "}
                {sync.processedBatches} batch(es) ingested;{" "}
                {sync.exportedEvents} exported, {sync.importedEvents} read back.
                {sync.lastError ? ` Last error: ${sync.lastError}` : ""}
              </p>
            ) : null}
            <nav aria-label="Art Desk lanes">
              <button
                type="button"
                aria-pressed={lane === "all"}
                onClick={() => setLane("all")}
              >
                All ({rows.length})
              </button>
              {REQUEST_LANES.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={lane === key}
                  onClick={() => setLane(key)}
                  data-testid={`art-desk-lane-${key}`}
                >
                  {LANE_LABELS[key]} ({counts.lanes[key] ?? 0})
                </button>
              ))}
            </nav>
            {facet ? (
              <button
                type="button"
                onClick={() => setFacet(null)}
                aria-label={`Clear tag filter ${facet.key}: ${facet.value}`}
              >
                ✕ {facet.key}: {facet.value}
              </button>
            ) : null}
            {Object.keys(counts.tags).length > 0 ? (
              <div className="art-desk-facets" data-testid="art-desk-facets">
                {Object.entries(counts.tags).map(([key, values]) => (
                  <span key={key} className="art-desk-facet">
                    <span className="art-desk-meta">{key}:</span>{" "}
                    {Object.entries(values).map(([value, count]) => (
                      <button
                        key={value}
                        type="button"
                        className="art-desk-chip"
                        aria-pressed={
                          facet?.key === key && facet.value === value
                        }
                        onClick={() =>
                          setFacet(
                            facet?.key === key && facet.value === value
                              ? null
                              : { key, value },
                          )
                        }
                      >
                        {value} ({count})
                      </button>
                    ))}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="art-desk-layout">
              <ol className="art-desk-list" data-testid="art-desk-list">
                {requestRows.map((row) => {
                  const lead =
                    (row.selectedCandidateId &&
                      projection?.candidates[row.selectedCandidateId]) ||
                    (row.candidateIds.at(-1) &&
                      projection?.candidates[row.candidateIds.at(-1)!]) ||
                    undefined;
                  const requestId = row.request.requestId;
                  return (
                    <li key={requestId}>
                      <button
                        type="button"
                        className="art-desk-row"
                        aria-pressed={
                          selectedRequest?.request.requestId === requestId
                        }
                        data-testid={`art-desk-row-${requestId}`}
                        onClick={() => {
                          setSelectedRequestId(requestId);
                          setViewedCandidateId(
                            row.selectedCandidateId ??
                              row.candidateIds.at(-1) ??
                              null,
                          );
                        }}
                      >
                        <Thumb
                          candidate={lead}
                          bytes={
                            lead ? bench?.bytes[lead.candidateId] : undefined
                          }
                          testId={`art-desk-thumb-${requestId}`}
                        />
                        <span className="art-desk-row-copy">
                          <strong>{row.request.title}</strong>
                          <span>{row.request.consumer.playerVisibleUse}</span>
                          <span className="art-desk-meta">
                            {LANE_LABELS[row.lane]} · {row.candidateIds.length}{" "}
                            candidate
                            {row.candidateIds.length === 1 ? "" : "s"}
                            {row.qa ? " · QA" : ""}
                            {row.source === "qa" ? " · QA, disposable" : ""}
                            {row.source === "event" && requestId !== "inbox"
                              ? " · bench request"
                              : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {detail}
            </div>
            {projection ? (
              <section
                className="art-desk-queue"
                data-testid="art-desk-integration-queue"
              >
                <h2>Prepare for integration</h2>
                {projection.integrationQueue.length === 0 ? (
                  <p>Nothing queued. Approving a candidate enqueues it once.</p>
                ) : null}
                <ul>
                  {projection.integrationQueue.map((item) => (
                    <li
                      key={item.itemId}
                      data-testid={`art-desk-integration-${item.itemId}`}
                    >
                      <strong>{item.state}</strong> · {item.requestId} ·{" "}
                      {item.candidateId.slice(0, 13)}… · sha{" "}
                      {item.sha256.slice(0, 12)}… · consumer {item.consumerId} ·
                      at approval {item.tagsState} · current tags{" "}
                      {Object.keys(item.currentTags).length
                        ? JSON.stringify(item.currentTags)
                        : "none"}
                      {item.qa ? " · QA, not cargo" : ""}
                      {item.missingFacts.length
                        ? ` · outstanding: ${item.missingFacts.join("; ")}`
                        : ""}
                      {item.receipts.length
                        ? ` · receipts: ${item.receipts.map((r) => `${r.state} ${JSON.stringify(r.receipt)}`).join("; ")}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {projection && projection.conflicts.length > 0 ? (
              <section
                className="art-desk-queue"
                data-testid="art-desk-conflicts"
              >
                <h2>Tag conflicts (kept, not overwritten)</h2>
                <ul>
                  {projection.conflicts.map((conflict) => (
                    <li key={conflict.eventId}>
                      {conflict.entity} {conflict.entityId.slice(0, 13)}…:{" "}
                      {conflict.author.id} wrote against version{" "}
                      {conflict.baseVersion}, current {conflict.currentVersion}:{" "}
                      {JSON.stringify(conflict.attempted)}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </details>
      <footer className="art-desk-pager">
        <span>
          {tab === "notifications"
            ? `${notifications.length} messages · ${unreadCount} unread`
            : advancedOpen
              ? `${requestRows.length} request(s) · ${filteredRows.filter((r) => r.candidate).length} candidate(s) shown`
              : `${visibleCards.length} asset(s) shown`}
        </span>
        <p role="status" data-testid="art-desk-status">
          {message}
        </p>
      </footer>
    </div>
  );
}

function RequestDetail({
  request,
  projection,
  selectedBuild,
  bench,
  pack,
  viewed,
  viewedBytes,
  busy,
  showIds,
  onToggleIds,
  onView,
  onDraftChange,
  onDecide,
  onIntake,
  onSelect,
  onTags,
  onMessage,
  card,
}: {
  /** The asset card this detail was opened from, in the card view. */
  readonly card?: ArtDeskCard;
  readonly request: ProjectedRequest;
  readonly projection: ArtbenchProjection;
  readonly selectedBuild: SelectedArtBuild | null;
  readonly bench: BenchState;
  readonly pack: ArtDeskPrivatePackReceipt;
  readonly viewed: ProjectedCandidate | null;
  readonly viewedBytes?: BytesInfo;
  readonly busy: boolean;
  readonly showIds: boolean;
  readonly onToggleIds: () => void;
  readonly onView: (candidateId: string) => void;
  readonly onDraftChange: (hasDraft: boolean) => void;
  readonly onDecide: (
    candidate: ProjectedCandidate,
    decision: "approve" | "reject" | "request-revision",
    note?: string,
  ) => Promise<boolean>;
  readonly onIntake: (
    files: readonly File[],
    meta: {
      requestId?: string;
      parentCandidateId?: string;
      editKind?: EditKind;
      note?: string;
    },
  ) => Promise<{ ok: boolean; candidateId?: string }[]>;
  readonly onMessage: (text: string) => Promise<boolean>;
  readonly onSelect: (candidateId: string) => Promise<void>;
  readonly onTags: (
    candidate: ProjectedCandidate,
    tags: TagSet,
  ) => Promise<boolean>;
}) {
  const [question, setQuestion] = useState("");
  const r = request.request;
  const requestId = r.requestId;
  const isInbox = requestId === "inbox";
  const [revisionText, setRevisionText] = useState("");
  const [showRevision, setShowRevision] = useState(false);
  const [editKind, setEditKind] = useState<EditKind>("upscale");
  const [editNote, setEditNote] = useState("");
  const [compare, setCompare] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    onDraftChange(
      Boolean(question.trim() || revisionText.trim() || editNote.trim()),
    );
  }, [question, revisionText, editNote, onDraftChange]);
  useEffect(() => {
    if (!question.trim() && !revisionText.trim() && !editNote.trim()) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [question, revisionText, editNote]);
  const brief = compileAssetBrief({
    request: r,
    stylePixels: styleReferencesFor(r, pack),
    bodyPoseFamilies: requestId.startsWith("person-")
      ? ["standing-neutral"]
      : [],
  });
  const briefName = assetFileStem(
    isInbox
      ? (viewed?.provenance.itemId ??
          viewed?.provenance.originalName?.replace(/\.[^.]+$/, "") ??
          "unassigned")
      : r.title,
  );
  const briefUrl = `${BENCH}/brief?requestId=${encodeURIComponent(requestId)}${viewed ? `&candidateId=${encodeURIComponent(viewed.candidateId)}` : ""}&name=${encodeURIComponent(briefName)}`;
  const [briefNote, setBriefNote] = useState("");
  const upscale = viewed
    ? upscaleRequirement(viewed, projection.candidates)
    : null;
  const [originalNote, setOriginalNote] = useState("");
  useEffect(() => {
    // The private hub reports how a download ended; a plain browser does not.
    const onResult = (event: Event) => {
      const detail = (event as CustomEvent<{ state?: string; name?: string }>)
        .detail;
      if (!detail?.name?.includes("brief")) {
        if (detail?.name)
          setOriginalNote(
            detail.state === "completed"
              ? `Saved ${detail.name} in Downloads › Our Civic Duty Art Desk.`
              : detail.state === "cancelled"
                ? "Download cancelled."
                : detail.state === "refused"
                  ? `The desktop app would not save ${detail.name}. Its download policy does not allow this file.`
                  : `Download failed for ${detail.name}.`,
          );
        return;
      }
      setBriefNote(
        detail.state === "completed"
          ? `Saved ${detail.name} in Downloads › Our Civic Duty Art Desk.`
          : detail.state === "cancelled"
            ? "Download cancelled."
            : detail.state === "refused"
              ? `The desktop app would not save ${detail.name}. Its download policy does not allow this file.`
              : `Download failed for ${detail.name}.`,
      );
    };
    window.addEventListener("ocd:download-result", onResult);
    return () => window.removeEventListener("ocd:download-result", onResult);
  }, []);
  const downloadTicket = useRef(0);
  const viewedIdRef = useRef<string | null>(viewed?.candidateId ?? null);
  useEffect(() => {
    // The status line belongs to one version. Carrying it onto the next one
    // would show a verified hash and a filename for bytes nobody fetched.
    viewedIdRef.current = viewed?.candidateId ?? null;
    setOriginalNote("");
  }, [viewed?.candidateId]);
  // The detail's subject is the version on screen. A newer delivery on the
  // same card is announced above; it never renames what is being reviewed.
  const subject = card
    ? viewedCandidateView(card, projection, viewed?.candidateId ?? null)
    : null;
  const heading = subject?.title ?? r.title;
  const lineage = viewed ? lineageOfCandidate(projection, viewed) : null;
  const notes = candidateNotes(projection, viewed ?? undefined);
  const discussionMessages = [
    ...new Map(
      [
        ...Object.values(projection.candidates)
          .filter(
            (candidate) =>
              candidate.requestId === requestId &&
              (!isInbox ||
                card?.lineage.some(
                  (step) => step.candidateId === candidate.candidateId,
                ) ||
                card?.otherVersions.includes(candidate.candidateId)),
          )
          .flatMap((candidate) => candidate.groupDecisions)
          .filter((decision) => decision.payload.note?.trim())
          .map((decision) => ({
            ...decision,
            payload: {
              requestId,
              candidateId: decision.payload.candidateId,
              text: decision.payload.note!,
              kind: "note",
            },
          })),
        ...(projection.messages ?? []).filter(
          (message) =>
            message.payload.requestId === requestId &&
            (!isInbox ||
              !message.payload.candidateId ||
              card?.lineage.some(
                (step) => step.candidateId === message.payload.candidateId,
              ) ||
              card?.otherVersions.includes(message.payload.candidateId)),
        ),
      ].map((message) => [message.eventId, message]),
    ).values(),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const originalName = viewed
    ? originalDownloadName(
        `${requestDisplayCode(projection, r.requestId) ? `${requestDisplayCode(projection, r.requestId)}-R${viewed.revision} ` : ""}${subject?.title ?? r.title}`,
        viewed.sha256,
        viewed.container,
      )
    : null;
  const parent = viewed?.parentCandidateId
    ? projection.candidates[viewed.parentCandidateId]
    : undefined;
  const usage = viewed
    ? candidateUsage(projection, viewed, selectedBuild)
    : null;

  /**
   * Fetch the recorded bytes, check them against the recorded hash, then hand
   * the browser a named file. The owner is told what happened either way; a
   * refused or corrupted read is never presented as a saved download.
   */
  async function downloadOriginal() {
    if (!viewed || !originalName) return;
    // One fetch owns the status line: a read that finishes after the owner
    // moved on must not report itself against the version now on screen.
    const ticket = (downloadTicket.current += 1);
    const subjectId = viewed.candidateId;
    const report = (note: string) => {
      if (
        downloadTicket.current === ticket &&
        viewedIdRef.current === subjectId
      )
        setOriginalNote(note);
    };
    report(`Preparing ${originalName}…`);
    try {
      const response = await fetch(
        originalUrl(viewed.candidateId, viewed.sha256),
        { cache: "no-store" },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          body?.message ?? `the bench refused the read (${response.status})`,
        );
      }
      const bytes = await response.arrayBuffer();
      const hash = await sha256Hex(bytes);
      if (hash !== viewed.sha256)
        throw new Error(
          `the served bytes hash ${hash.slice(0, 12)}…, not the recorded ${viewed.sha256.slice(0, 12)}…`,
        );
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type:
            response.headers.get("Content-Type") ?? "application/octet-stream",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = originalName;
      anchor.rel = "noopener";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      report(
        `${originalName}: ${bytes.byteLength.toLocaleString()} bytes, hash verified, and handed to the browser as a download. Whether a file reached disk is not confirmed here — check your downloads.`,
      );
    } catch (error) {
      report(
        `Download failed for ${originalName}: ${error instanceof Error ? error.message : String(error)}.`,
      );
    }
  }
  const blocker = !viewed
    ? "Upload or select a candidate first."
    : isInbox
      ? "Assign this candidate to a request before deciding."
      : viewedBytes?.state !== "verified"
        ? `Candidate bytes are ${viewedBytes?.state ?? "unchecked"}; a decision binds present, decoded, hash-verified bytes.`
        : null;
  const nextStep = !viewed
    ? request.lane === "awaiting-capable-worker" &&
      requestArtworkCategory(r) !== "clothing"
      ? "Create the image using the supplied prompt and reference, then add it here for review."
      : "The art team is preparing an image for this request."
    : viewed.status === "awaiting-review"
      ? viewed.ownerReviewReady
        ? "Review this image, then choose Approve, Request revision, or Reject below."
        : "The art team is checking this image before asking for your review."
      : viewed.status === "revision-requested"
        ? "The art team is preparing a revision from the feedback on this card."
        : usage?.state === "used"
          ? "Open Play to see this image in its game context."
          : ["approved", "integration-ready", "accepted"].includes(
                viewed.status,
              )
            ? "The art team will check fit and connect this approved image to its game use."
            : "The art team will check where this image appears in the selected game build.";

  async function uploadEdited(
    files: FileList | readonly File[] | null,
    approve: boolean,
  ) {
    if (!files || !viewed) return;
    const results = await onIntake([...files], {
      requestId,
      parentCandidateId: viewed.candidateId,
      editKind,
      note: editNote || undefined,
    });
    if (results.some((result) => result.ok)) setEditNote("");
    const created = results.find((x) => x.ok && x.candidateId);
    if (approve && created?.candidateId) {
      // The new preview is shown by onIntake (it views the new candidate); the
      // decision below binds the NEW bytes, re-verified by the server.
      const fresh = projection.candidates[created.candidateId];
      const state = await getJson<BenchState>(`${BENCH}/state`);
      const candidate =
        state?.projection.candidates[created.candidateId] ?? fresh;
      if (candidate)
        await onDecide(candidate, "approve", editNote || undefined);
    }
  }

  async function assignInbox() {
    if (!viewed || !assignTo) return;
    const response = await fetch(
      originalUrl(viewed.candidateId, viewed.sha256),
    );
    if (!response.ok) return;
    const blob = await response.blob();
    const file = new File(
      [blob],
      viewed.provenance.originalName ?? `${viewed.sha256}.${viewed.container}`,
      {
        type: viewed.container === "png" ? "image/png" : "image/jpeg",
      },
    );
    await onIntake([file], {
      requestId: assignTo,
      parentCandidateId: viewed.candidateId,
      editKind: "original",
    });
  }

  return (
    <article
      className={`art-desk-detail${viewed ? " art-desk-detail--with-image" : ""}${dragging ? " art-desk-detail--dragging" : ""}`}
      data-testid="art-desk-detail"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const files = [...event.dataTransfer.files].filter(
          (f) =>
            /image\/(png|jpeg)/.test(f.type) || /\.(png|jpe?g)$/i.test(f.name),
        );
        if (files.length) void onIntake(files, isInbox ? {} : { requestId });
      }}
    >
      <h2 data-testid="art-desk-detail-heading">
        {requestDisplayCode(projection, r.requestId)
          ? `${requestDisplayCode(projection, r.requestId)} · `
          : ""}
        {heading}
      </h2>
      {subject?.newer ? (
        <p className="art-desk-warning" data-testid="art-desk-newer-candidate">
          A newer version has arrived: {subject.newer.title} (
          {shortDate(subject.newer.at)}).{" "}
          <button
            type="button"
            onClick={() => onView(subject.newer!.candidateId)}
          >
            Show the newer version
          </button>
        </p>
      ) : null}
      <p className="art-desk-meta">
        {viewed ? (candidateReviewView(viewed) ?? "Artwork") : "Request"}
        {viewed
          ? ` · Revision ${viewed.revision} · ${["installed", "in-game"].includes(viewed.status) && usage?.state !== "used" ? (usage?.state === "unknown" ? "Game use not yet checked" : "Approved / waiting to be implemented") : candidateWorkflowLabel(viewed)}`
          : " · Waiting for an image"}
      </p>
      {usage ? (
        <section className="art-desk-usage" data-testid="art-desk-where-used">
          <strong>
            {usage.state === "used"
              ? "Available in this game version"
              : usage.state === "unknown"
                ? "Game use not yet checked"
                : "Not in this game version"}
          </strong>
          {selectedBuild ? (
            <p className="art-desk-meta">
              Game version {selectedBuild.revision.slice(0, 7)}
            </p>
          ) : (
            <p className="art-desk-meta">
              Select a game version to check where this image is available.
            </p>
          )}
          {usage.labels.length ? (
            <p>{usage.labels.join(" · ")}</p>
          ) : (
            <p>{r.consumer.playerVisibleUse}</p>
          )}
          {usage.eligible.length ? (
            <p>
              <strong>Eligible regions and settings:</strong>{" "}
              {usage.eligible.join(" · ")}
            </p>
          ) : null}
          {usage.receipts.length ? (
            <details>
              <summary>Build details</summary>
              <pre>{JSON.stringify(usage.receipts, null, 2)}</pre>
            </details>
          ) : null}
        </section>
      ) : null}
      <section
        className="art-desk-discussion"
        aria-label="Questions and replies"
        data-testid="art-desk-discussion"
      >
        <h3>Conversation with the art team</h3>
        <div className="art-desk-message-history">
          {discussionMessages.length ? (
            discussionMessages.map((message) => (
              <div
                key={message.eventId}
                id={`art-desk-message-${message.eventId}`}
                tabIndex={-1}
                className="art-desk-message"
                data-testid="art-desk-message"
              >
                <strong>
                  {message.actor.kind === "owner" ? "You" : "Art team"}
                  {message.payload.kind === "reply" ? " replied" : ""}
                </strong>
                <p>{message.payload.text}</p>
              </div>
            ))
          ) : (
            <p className="art-desk-meta">No messages on this card yet.</p>
          )}
        </div>
        <p className="art-desk-next-step" data-testid="art-desk-next-step">
          <strong>Next step:</strong> {nextStep}
        </p>
        <details className="art-desk-message-composer">
          <summary>Ask or reply</summary>
          <label>
            Ask a question or leave a note
            <textarea
              data-testid="art-desk-question"
              value={question}
              maxLength={8000}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy || !question.trim()}
            onClick={async () => {
              if (await onMessage(question.trim())) setQuestion("");
            }}
          >
            Send question
          </button>
        </details>
      </section>
      <StyleReferenceSummary
        request={r}
        projection={projection}
        compact={!!viewed}
      />
      <details className="art-desk-reference-details" open={!viewed}>
        <summary>Editing instructions</summary>
        <p>
          <strong>Why requested:</strong> {r.whyNeeded}
        </p>
        <p>
          <strong>Intended use:</strong> {r.consumer.playerVisibleUse}
        </p>
        {r.generatorParameters?.integrationOwner ? (
          <p>
            <strong>Who will add it:</strong> The art team prepares it; the game
            team adds it.
          </p>
        ) : null}
        {requestArtworkCategory(r) === "clothing" ? (
          <p>The art team is preparing this clothing.</p>
        ) : (
          <ProviderPrompts
            request={r}
            code={requestDisplayCode(projection, r.requestId)}
          />
        )}
      </details>
      {request.qa ? (
        <p className="art-desk-warning" data-testid="art-desk-qa-flag">
          Test request. These images are kept separately from game artwork.
        </p>
      ) : null}
      {request.lane === "awaiting-capable-worker" &&
      requestArtworkCategory(r) !== "clothing" &&
      request.candidateIds.length === 0 ? (
        <p className="art-desk-warning" data-testid="art-desk-awaiting-worker">
          Create an image using the prompt and upload reference below. Return
          the download here with Add an image.
        </p>
      ) : null}
      <div className="art-desk-actions">
        <details>
          <summary>Full production notes</summary>
          <button
            type="button"
            data-testid="art-desk-copy-brief"
            onClick={async () => {
              setBriefNote("Copying…");
              try {
                const response = await fetch(briefUrl);
                if (!response.ok)
                  throw new Error(
                    `the brief could not be read (${response.status})`,
                  );
                const text = await response.text();
                if (!navigator.clipboard)
                  throw new Error("this window has no clipboard access");
                await navigator.clipboard.writeText(text);
                setBriefNote(
                  `Copied the brief (${text.length.toLocaleString()} characters).`,
                );
              } catch (error) {
                setBriefNote(
                  `Could not copy: ${error instanceof Error ? error.message : String(error)}. Use Download brief instead.`,
                );
              }
            }}
          >
            Copy brief
          </button>
          <a
            className="art-desk-linkbutton"
            href={`${briefUrl}&download=1`}
            data-testid="art-desk-download-brief"
            onClick={() => setBriefNote(`Downloading ${briefName}-brief.md…`)}
          >
            Download brief
          </a>
        </details>
        <span
          role="status"
          className="art-desk-meta"
          data-testid="art-desk-brief-status"
        >
          {briefNote}
        </span>
        <label className="art-desk-upload">
          {isInbox ? "Upload to inbox" : "Add an image"}
          <input
            type="file"
            accept="image/png,image/jpeg"
            multiple
            data-testid="art-desk-upload"
            onChange={(event) => {
              const files = event.target.files ? [...event.target.files] : [];
              if (files.length)
                void onIntake(files, isInbox ? {} : { requestId });
              event.target.value = "";
            }}
          />
        </label>
        <span className="art-desk-meta">or drop files here</span>
      </div>
      {request.candidateIds.some(
        (id) =>
          projection.candidates[id] &&
          reviewDisposition(projection.candidates[id]) !== "review",
      ) ? (
        <details className="art-desk-history-alternatives">
          <summary>History and alternatives</summary>
          {request.candidateIds
            .filter(
              (id) =>
                projection.candidates[id] &&
                reviewDisposition(projection.candidates[id]) !== "review",
            )
            .map((id) => {
              const candidate = projection.candidates[id];
              if (!candidate) return null;
              return (
                <button key={id} type="button" onClick={() => onView(id)}>
                  Revision {candidate.revision} ·{" "}
                  {reviewDisposition(candidate) === "reference"
                    ? "Reference"
                    : "Alternative"}
                </button>
              );
            })}
        </details>
      ) : null}
      {request.candidateIds.length > 0 ? (
        <ol
          className="art-desk-alternatives"
          data-testid="art-desk-alternatives"
        >
          {request.candidateIds
            .filter((id) => {
              const candidate = projection.candidates[id];
              return candidate && reviewDisposition(candidate) === "review";
            })
            .map((candidateId) => {
              const candidate = projection.candidates[candidateId];
              if (!candidate) return null;
              const bytes = bench.bytes[candidateId];
              return (
                <li key={candidateId}>
                  <button
                    type="button"
                    className="art-desk-alt"
                    aria-pressed={viewed?.candidateId === candidateId}
                    data-testid={`art-desk-candidate-${candidateId}`}
                    onClick={() => onView(candidateId)}
                  >
                    <Thumb
                      candidate={candidate}
                      bytes={bytes}
                      testId={`art-desk-alt-thumb-${candidateId}`}
                    />
                    <span className="art-desk-row-copy">
                      <strong>
                        {candidateReviewView(candidate)
                          ? `${candidateReviewView(candidate)} · `
                          : ""}
                        Revision {candidate.revision}
                        {candidate.qa ? " · Test image" : ""}
                        {request.selectedCandidateId === candidateId
                          ? " · preferred"
                          : ""}
                      </strong>
                      <span className="art-desk-meta">
                        {candidateWorkflowLabel(candidate)} · {candidate.width}×
                        {candidate.height} {candidate.container}
                        {candidate.hasAlpha ? " α" : ""} · {candidate.editKind}
                        {candidate.parentCandidateId
                          ? ` of rev ${projection.candidates[candidate.parentCandidateId]?.revision ?? "?"}`
                          : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
        </ol>
      ) : (
        <p data-testid="art-desk-no-candidates">
          Request: an image has not been supplied yet.
        </p>
      )}
      {viewed ? (
        <div
          className="art-desk-viewed"
          data-testid="art-desk-viewed"
          data-candidate-id={viewed.candidateId}
        >
          <div
            className={`art-desk-preview${compare && parent ? " art-desk-preview--compare" : ""}`}
            data-testid="art-desk-preview"
          >
            {compare &&
            parent &&
            bench.bytes[parent.candidateId]?.state === "verified" ? (
              <figure
                className={parent.hasAlpha ? "art-desk-checker" : undefined}
              >
                <ArtBenchImage
                  candidate={parent}
                  alt={`Parent revision ${parent.revision}`}
                  testId="art-desk-parent-preview"
                />
                <figcaption className="art-desk-meta">
                  Earlier revision {parent.revision} · {parent.width}×
                  {parent.height}
                </figcaption>
              </figure>
            ) : null}
            {viewedBytes?.state === "verified" ? (
              <figure
                className={viewed.hasAlpha ? "art-desk-checker" : undefined}
              >
                <ArtBenchImage
                  candidate={viewed}
                  requestId={requestId}
                  alt={`Candidate for ${r.title}`}
                  testId="art-desk-candidate-preview"
                />
                <figcaption className="art-desk-meta">
                  Revision {viewed.revision} · {viewed.width}×{viewed.height}{" "}
                  {viewed.container}
                  {viewed.hasAlpha ? " · transparent" : ""}
                  {" · "}
                  {viewed.editKind === "original"
                    ? "Original source"
                    : viewed.editKind}
                </figcaption>
              </figure>
            ) : (
              <p data-testid="art-desk-candidate-preview-missing">
                {viewedBytes
                  ? `${viewedBytes.state}: ${viewedBytes.note}`
                  : "This image has not loaded yet. Try Sync now."}
              </p>
            )}
          </div>
          <details>
            <summary>File information</summary>
            <p
              className="art-desk-meta"
              data-testid="art-desk-candidate-state"
              data-candidate-bytes={viewedBytes?.state ?? "unchecked"}
            >
              Recorded hash {viewed.sha256.slice(0, 12)}… · {viewed.candidateId}{" "}
              · Revision {viewed.revision} · {viewed.source} · bytes{" "}
              {viewedBytes?.state ?? "unchecked"} · {viewed.width}×
              {viewed.height} {viewed.container} · native detail{" "}
              {viewed.nativeDetail}
              {r.target.minimumWidth > 1 && viewed.width < r.target.minimumWidth
                ? ` · below the ${r.target.minimumWidth}px target`
                : ""}
              {viewed.calibrationRecheck.length
                ? ` · recheck: ${viewed.calibrationRecheck.join(", ")}`
                : ""}
              {viewed.provenance.worker
                ? ` · worker ${viewed.provenance.worker}`
                : ""}
              {viewed.provenance.batchId
                ? ` · batch ${viewed.provenance.batchId}/${viewed.provenance.itemId ?? "?"}`
                : ""}
            </p>
            <p
              className="art-desk-meta"
              data-testid="art-desk-reference-inputs"
            >
              Reference inputs reported by the producer:{" "}
              {viewed.provenance.referenceInputs
                ? viewed.provenance.referenceInputs.length
                  ? viewed.provenance.referenceInputs
                      .map(
                        (input) =>
                          `${input.role ? `${input.role} ` : ""}${input.ref}${input.sha256 ? ` (${input.sha256.slice(0, 12)}…)` : ""}`,
                      )
                      .join(", ")
                  : "none"
                : "unknown (no receipt)"}
            </p>
            {viewed.aliasIds.length || viewed.ingestReceipts.length > 1 ? (
              <p className="art-desk-meta" data-testid="art-desk-duplicates">
                One delivered item, recorded {viewed.ingestReceipts.length}× by{" "}
                {[...new Set(viewed.ingestReceipts.map((x) => x.origin))].join(
                  ", ",
                )}
                {viewed.aliasIds.length
                  ? ` · legacy duplicate ids kept as history: ${viewed.aliasIds.join(", ")}`
                  : ""}
                {viewed.groupDecisions.length > viewed.decisions.length
                  ? ` · ${viewed.groupDecisions.length} decisions across the group`
                  : ""}
              </p>
            ) : null}
          </details>
          {viewed.duplicateDecisionConflict ? (
            <p
              className="art-desk-warning"
              data-testid="art-desk-duplicate-conflict"
            >
              Duplicate records of this item ended with different decisions.
              Both stay as history; decide again to settle it.
            </p>
          ) : null}
          {lineage ? (
            <details>
              <summary>About this version</summary>
              <p
                className={
                  lineage.state === "not-recorded"
                    ? "art-desk-warning"
                    : "art-desk-meta"
                }
                data-testid="art-desk-lineage"
                data-lineage-state={lineage.state}
              >
                {lineageSentence(lineage)}
                {parent ? (
                  <>
                    {" "}
                    Previous version {parent.revision}.{" "}
                    <button type="button" onClick={() => setCompare((v) => !v)}>
                      {compare
                        ? "Hide comparison"
                        : "Compare with earlier version"}
                    </button>
                  </>
                ) : null}
              </p>
            </details>
          ) : null}
          <details>
            <summary>Earlier notes</summary>
            <div className="art-desk-meta" data-testid="art-desk-notes">
              {notes.inherited.length ? (
                <p data-testid="art-desk-inherited-note">
                  Carried forward from the {notes.inherited[0]!.stage} it was
                  edited from: “{notes.inherited[0]!.note}”
                  {notes.inherited.length > 1
                    ? ` (+${notes.inherited.length - 1} earlier note${notes.inherited.length > 2 ? "s" : ""})`
                    : ""}
                </p>
              ) : null}
              {notes.own ? (
                <p data-testid="art-desk-edit-note">
                  This version's note: “{notes.own}”
                </p>
              ) : null}
              {Object.keys(notes.inheritedTags).length ? (
                <p data-testid="art-desk-inherited-tags">
                  Tags inherited at import (history):{" "}
                  {Object.entries(notes.inheritedTags)
                    .map(([key, values]) => `${key}: ${values.join(", ")}`)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
          </details>
          <div className="art-desk-actions">
            {upscale ? (
              <section
                className="art-desk-upscale-request"
                data-testid="art-desk-upscale-request"
              >
                <h3>
                  {upscale.fulfilledBy
                    ? "Larger image received"
                    : "Request: enlarge this image"}
                </h3>
                {upscale.fulfilledBy ? (
                  <p>
                    Revision {upscale.fulfilledBy.revision} is{" "}
                    {upscale.fulfilledBy.width}×{upscale.fulfilledBy.height} and
                    meets this size request.{" "}
                    <button
                      type="button"
                      onClick={() => onView(upscale.fulfilledBy!.candidateId)}
                    >
                      View returned revision
                    </button>
                  </p>
                ) : null}
                <p>
                  Current: {viewed.width}×{viewed.height}. Minimum:{" "}
                  {upscale.minimum.width}×{upscale.minimum.height} for{" "}
                  {upscale.use}. Preserve the full aspect ratio; suggested
                  export: {upscale.output.width}×{upscale.output.height}.
                </p>
                <p>
                  Use this exact revision as the single reference. Return it
                  through Add edited version and choose Upscale. You can review
                  the returned image before approving it.
                </p>
                {!upscale.fulfilledBy ? (
                  <>
                    <textarea
                      readOnly
                      aria-label="External upscale prompt"
                      rows={5}
                      value={upscale.prompt}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard.writeText(upscale.prompt).then(
                          () =>
                            setBriefNote("Copied the external upscale prompt."),
                          () =>
                            setBriefNote(
                              "Copy unavailable; select the upscale prompt text.",
                            ),
                        )
                      }
                    >
                      Copy upscale prompt ({upscale.prompt.length}/1,024)
                    </button>
                  </>
                ) : null}
              </section>
            ) : null}
          </div>
          <div className="art-desk-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void onTags(viewed, {
                  ...viewed.tags,
                  reviewQueue: [`${viewed.candidateId}:reference`],
                })
              }
            >
              Use as style reference
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void onTags(viewed, {
                  ...viewed.tags,
                  reviewQueue: [`${viewed.candidateId}:archived`],
                })
              }
            >
              Remove from review
            </button>
            {reviewDisposition(viewed) !== "review" ||
            viewed.tags.deskView?.some((value) =>
              value.startsWith(`${viewed.candidateId}:`),
            ) ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void onTags(viewed, {
                    ...viewed.tags,
                    reviewQueue: [`${viewed.candidateId}:review`],
                    deskView: [],
                  })
                }
              >
                Return to review queue
              </button>
            ) : null}
          </div>
          <p className="art-desk-meta">
            Style references and removed items remain in Library with their full
            history. These actions do not approve or reject the artwork.
          </p>
          <div className="art-desk-actions">
            <button
              type="button"
              disabled={Boolean(blocker) || busy}
              title={blocker ?? undefined}
              onClick={() => void onDecide(viewed, "approve")}
            >
              Approve
            </button>
            <button
              type="button"
              disabled={Boolean(blocker) || busy}
              title={blocker ?? undefined}
              onClick={() => setShowRevision((v) => !v)}
            >
              Request revision
            </button>
            <button
              type="button"
              disabled={Boolean(blocker) || busy}
              title={blocker ?? undefined}
              onClick={() => void onDecide(viewed, "reject")}
            >
              Reject
            </button>
            {request.selectedCandidateId !== viewed.candidateId && !isInbox ? (
              <button
                type="button"
                onClick={() => void onSelect(viewed.candidateId)}
              >
                Use this version
              </button>
            ) : null}
            {viewedBytes?.state === "verified" ? (
              <button
                type="button"
                data-testid="art-desk-download-original"
                data-download-name={originalName ?? undefined}
                onClick={() => void downloadOriginal()}
              >
                Download this revision ({viewed.width}×{viewed.height}{" "}
                {viewed.container})
              </button>
            ) : null}
            {window.ocdArtBench ? (
              <button
                type="button"
                onClick={async () => {
                  const result = await window.ocdArtBench?.revealDownload();
                  if (!result?.ok)
                    setOriginalNote(
                      "No completed download in this session. Download this revision first.",
                    );
                }}
              >
                Reveal downloaded file
              </button>
            ) : null}
            <span
              role="status"
              className="art-desk-meta"
              data-testid="art-desk-original-status"
            >
              {originalNote}
            </span>
            {blocker ? (
              <span className="art-desk-meta" data-testid="art-desk-blocker">
                {blocker}
              </span>
            ) : null}
          </div>
          {showRevision ? (
            <div
              className="art-desk-dialog"
              data-testid="art-desk-revision-dialog"
            >
              <label>
                Revision instructions
                <textarea
                  data-testid="art-desk-revision-text"
                  value={revisionText}
                  onChange={(event) => setRevisionText(event.target.value)}
                  rows={3}
                  placeholder="What would you like changed?"
                />
              </label>
              <button
                type="button"
                disabled={!revisionText.trim() || busy}
                data-testid="art-desk-revision-send"
                onClick={async () => {
                  const ok = await onDecide(
                    viewed,
                    "request-revision",
                    revisionText.trim(),
                  );
                  if (ok) {
                    setRevisionText("");
                    setShowRevision(false);
                  }
                }}
              >
                Send revision request
              </button>
              <button type="button" onClick={() => setShowRevision(false)}>
                Cancel
              </button>
            </div>
          ) : null}
          {isInbox ? (
            <div className="art-desk-dialog" data-testid="art-desk-assign">
              <label>
                Assign to request{" "}
                <select
                  value={assignTo}
                  onChange={(event) => setAssignTo(event.target.value)}
                  aria-label="Assign to request"
                >
                  <option value="">choose…</option>
                  {Object.values(projection.requests)
                    .filter((x) => x.request.requestId !== "inbox")
                    .map((x) => (
                      <option
                        key={x.request.requestId}
                        value={x.request.requestId}
                      >
                        {x.request.requestId}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!assignTo || busy}
                onClick={() => void assignInbox()}
              >
                Assign
              </button>
            </div>
          ) : (
            <div
              className="art-desk-dialog art-desk-edit-drop"
              data-testid="art-desk-edit"
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDragging(false);
                const files = [...event.dataTransfer.files];
                if (files.length === 1) void uploadEdited(files, false);
                else if (files.length) void onIntake(files, {});
              }}
            >
              <strong>Add edited version</strong>
              <span className="art-desk-meta">
                Add the edited image as a new version. Earlier images and
                decisions stay in history.
              </span>
              <label>
                Edit kind{" "}
                <select
                  data-testid="art-desk-edit-kind"
                  value={editKind}
                  onChange={(event) =>
                    setEditKind(event.target.value as EditKind)
                  }
                >
                  {EDIT_KINDS.filter((k) => k !== "original").map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Note{" "}
                <input
                  data-testid="art-desk-edit-note"
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  placeholder="optional"
                />
              </label>
              <label className="art-desk-upload">
                Choose edited version
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  data-testid="art-desk-upload-edited"
                  onChange={(event) => {
                    void uploadEdited(event.target.files, false);
                    event.target.value = "";
                  }}
                />
              </label>
              <label className="art-desk-upload">
                Upload and approve edited version
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  data-testid="art-desk-upload-edited-approve"
                  onChange={(event) => {
                    void uploadEdited(event.target.files, true);
                    event.target.value = "";
                  }}
                />
              </label>
              <a
                className="art-desk-linkbutton"
                data-testid="art-desk-download-bundle"
                download={`${requestId}-${viewed.candidateId.slice(0, 13)}-edit-bundle.json`}
                href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(editBundleManifest(r, viewed), null, 2))}`}
              >
                Download edit manifest
              </a>
            </div>
          )}
          <details>
            <summary>Organize this image</summary>
            <p className="art-desk-meta" data-testid="art-desk-current-tags">
              Current tags:{" "}
              {Object.entries(viewed.tags)
                .map(([key, values]) => `${key}: ${values.join(", ")}`)
                .join(" · ") || "None recorded"}
            </p>
            <TagEditor
              key={`${viewed.candidateId}:${viewed.tagsVersion}`}
              candidate={viewed}
              busy={busy}
              onSave={(tags) => onTags(viewed, tags)}
            />
          </details>
          <div data-testid="art-desk-decisions">
            <strong>Decisions</strong>
            {viewed.decisions.length === 0 ? (
              <p className="art-desk-meta">No decision yet.</p>
            ) : (
              <ul>
                {viewed.decisions.map((d) => (
                  <li
                    key={d.eventId}
                    data-testid={`art-desk-decision-${d.payload.decision}`}
                  >
                    <strong>
                      {d.payload.decision === "approve"
                        ? "Approved"
                        : d.payload.decision === "reject"
                          ? "Rejected"
                          : "Changes requested"}
                    </strong>{" "}
                    · {shortDate(d.at)}
                    {d.payload.note ? ` · "${d.payload.note}"` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
      <details open={showIds} onToggle={onToggleIds}>
        <summary>More information</summary>
        <pre data-testid="art-desk-brief">{JSON.stringify(brief, null, 2)}</pre>
      </details>
    </article>
  );
}

function TagEditor({
  candidate,
  busy,
  onSave,
}: {
  readonly candidate: ProjectedCandidate;
  readonly busy: boolean;
  readonly onSave: (tags: TagSet) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      TAG_FACETS.map((facet) => [
        facet,
        (candidate.tags[facet] ?? []).join(", "),
      ]),
    ),
  );
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");
  const isUntagged = Object.values(candidate.tags).every((v) => v.length === 0);
  return (
    <div
      className="art-desk-dialog"
      data-testid="art-desk-tags"
      data-tags-version={candidate.tagsVersion}
    >
      <strong>
        Tags {isUntagged ? "(untagged — approval does not wait for tags)" : ""}
      </strong>
      <span className="art-desk-meta">
        Descriptive only. A region tag never widens the request's authorized
        reuse regions; it helps you find things.
        {candidate.tagAuthors.length
          ? ` Last set by ${candidate.tagAuthors.at(-1)?.id}.`
          : ""}
      </span>
      <div className="art-desk-taggrid">
        {TAG_FACETS.map((facet) => (
          <label key={facet}>
            {facet}
            <input
              data-testid={`art-desk-tag-${facet}`}
              value={draft[facet] ?? ""}
              placeholder="comma separated"
              onChange={(event) =>
                setDraft((d) => ({ ...d, [facet]: event.target.value }))
              }
            />
          </label>
        ))}
        <label>
          custom key{" "}
          <input
            value={customKey}
            onChange={(event) => setCustomKey(event.target.value)}
            placeholder="e.g. mood"
          />
        </label>
        <label>
          custom value{" "}
          <input
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        data-testid="art-desk-tags-save"
        onClick={() => {
          const tags: Record<string, string[]> = {};
          for (const [facet, value] of Object.entries(draft)) {
            tags[facet] = value
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
          }
          if (customKey.trim())
            tags[customKey.trim()] = customValue
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
          void onSave(tags);
        }}
      >
        Save tags
      </button>
    </div>
  );
}

function ProviderPrompts({
  request,
  code,
}: {
  request: AssetRequest;
  code: string | null;
}) {
  const [copied, setCopied] = useState("");
  const parameters = request.generatorParameters;
  const prompts = [
    {
      key: "firefly",
      label: "Firefly",
      text: parameters?.fireflyPrompt
        ? codedGenerationPrompt(request, code, parameters.fireflyPrompt)
        : undefined,
      model: parameters?.fireflyModel,
      limit: 1024,
    },
    {
      key: "openai",
      label: "OpenAI image tool",
      text: parameters?.openaiPrompt
        ? codedGenerationPrompt(request, code, parameters.openaiPrompt)
        : undefined,
      model: parameters?.openaiModel,
      limit: null,
    },
  ].filter((entry) => entry.text);
  return (
    <section
      className="art-desk-provider-prompts"
      aria-label="Production prompt"
    >
      <h3>Create this image</h3>
      <p>
        {parameters?.aspect ?? request.target.aspectRatio}
        {parameters?.referenceUploadCount === "1"
          ? " · Upload only the reference marked below."
          : ""}
      </p>
      {prompts.map(({ key, label, text, model, limit }) => (
        <div key={key}>
          <strong>
            {label}
            {model ? ` · ${model}` : ""}
          </strong>
          <textarea
            aria-label={`${label} prompt`}
            readOnly
            value={text}
            rows={5}
          />
          <span>
            {text!.length}
            {limit ? ` / ${limit}` : ""} characters
          </span>{" "}
          <button
            type="button"
            disabled={limit !== null && text!.length > limit}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text!);
                setCopied(`${label} prompt copied.`);
              } catch {
                setCopied("Select the prompt text to copy it.");
              }
            }}
          >
            Copy {label} prompt
          </button>
          {limit !== null && text!.length > limit ? (
            <p role="alert">
              This prompt exceeds Firefly’s limit. Its author must shorten it
              before copying.
            </p>
          ) : null}
        </div>
      ))}
      {prompts.length === 0 ? (
        <p className="art-desk-meta">
          No provider prompt is recorded for this request.
        </p>
      ) : null}
      {parameters?.returnInstructions ? (
        <p>
          Download the original image, then choose Add an image on this card.
          The art team will prepare it for the game.
        </p>
      ) : null}
      <span role="status">{copied}</span>
    </section>
  );
}

function StyleReferenceSummary({
  request,
  projection,
  compact = false,
}: {
  readonly request: AssetRequest;
  readonly projection: ArtbenchProjection;
  readonly compact?: boolean;
}) {
  const references = requestReferencePixels(request);
  return (
    <div data-testid="art-desk-style-references">
      {references.map((reference, index) => {
        const candidateId = reference.pathOrDriveId.startsWith("candidate:")
          ? reference.pathOrDriveId.slice("candidate:".length)
          : null;
        const candidate = candidateId
          ? projection.candidates[candidateId]
          : null;
        const valid = candidate && reference.sha256 === candidate.sha256;
        const upload =
          request.generatorParameters?.referenceUploadCount === "1" &&
          index === 0;
        return (
          <div
            key={`${reference.pathOrDriveId}-${index}`}
            className={`art-desk-reference${compact ? " art-desk-reference--compact" : ""}`}
            data-testid="art-desk-style-reference"
            data-role={reference.role}
          >
            <h3>
              {compact
                ? "Original reference"
                : upload
                  ? "Upload this reference"
                  : "Reference image"}
            </h3>
            {valid ? (
              <>
                <ArtBenchImage
                  className="art-desk-reference-thumb"
                  alt={upload ? "Upload reference" : "Reference image"}
                  candidate={candidate}
                  requestId={request.requestId}
                />
                <a
                  className="art-desk-linkbutton"
                  href={`${originalUrl(candidate.candidateId, candidate.sha256)}&download=1&requestId=${encodeURIComponent(request.requestId)}`}
                >
                  Download reference
                </a>
              </>
            ) : (
              <p>The reference is being prepared.</p>
            )}
            <details>
              <summary>Image details</summary>
              <p>{request.target.styleReferences?.[index]?.note}</p>
              <p>
                {reference.pathOrDriveId} · {reference.sha256}
              </p>
            </details>
          </div>
        );
      })}
    </div>
  );
}

function NewRequestForm({
  mode,
  related,
  relatedCandidate,
  onDone,
  onCancel,
  setMessage,
}: {
  readonly mode: RequestDraftMode;
  readonly projection: ArtbenchProjection;
  readonly related: ProjectedRequest | null;
  readonly relatedCandidate: ProjectedCandidate | null;
  readonly onDone: (createdRequestId: string | null) => Promise<void>;
  readonly onCancel: () => void;
  readonly setMessage: (message: string) => void;
}) {
  const parent =
    mode === "related" && related
      ? {
          request: related.request,
          candidateId: relatedCandidate?.candidateId,
          candidateSha256: relatedCandidate?.sha256,
        }
      : null;
  const [fields, setFields] = useState<RequestDraftFields>(() =>
    initialDraftFields(mode, parent),
  );
  const set = <K extends keyof RequestDraftFields>(
    key: K,
    value: RequestDraftFields[K],
  ) => setFields((current) => ({ ...current, [key]: value }));
  const [linkParent, setLinkParent] = useState(
    mode === "related" && Boolean(relatedCandidate),
  );
  const [qa, setQa] = useState(false);
  const setReference = (index: number, patch: Partial<AssetStyleReference>) =>
    set(
      "styleReferences",
      fields.styleReferences.map((reference, i) =>
        i === index ? { ...reference, ...patch } : reference,
      ),
    );
  return (
    <form
      className="art-desk-dialog"
      data-testid="art-desk-new-request"
      data-mode={mode}
      onSubmit={async (event) => {
        event.preventDefault();
        const draft = buildRequestDraft(mode, fields, parent, {
          linkParentCandidate: linkParent,
        });
        const result = await postEvent("request.created", {
          request: draft.request,
          parentRequestId: draft.parentRequestId,
          parentCandidateId: draft.parentCandidateId,
          qa,
        });
        setMessage(
          result.ok
            ? "Request created."
            : `Request not created: ${result.message}`,
        );
        await onDone(result.ok ? draft.request.requestId : null);
      }}
    >
      <strong data-testid="art-desk-new-request-heading">
        {parent
          ? `New version of ${parent.request.title} — copies its size and references`
          : "New request — nothing is copied from the selected image"}
      </strong>
      <span className="art-desk-meta">
        Describe the image you need. You can add the result here when it is
        ready.
      </span>
      <label>
        Request name (unique){" "}
        <input
          data-testid="art-desk-new-id"
          value={fields.requestId}
          onChange={(e) => set("requestId", e.target.value)}
          pattern="[A-Za-z0-9][A-Za-z0-9._:-]*"
          required
        />
      </label>
      <label>
        Title{" "}
        <input
          data-testid="art-desk-new-title"
          value={fields.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </label>
      <label>
        Where will this image be used?{" "}
        <input
          data-testid="art-desk-new-use"
          value={fields.use}
          onChange={(e) => set("use", e.target.value)}
          required
        />
      </label>
      <label>
        Game connection (optional){" "}
        <input
          data-testid="art-desk-new-consumer"
          value={fields.consumerId}
          onChange={(e) => set("consumerId", e.target.value)}
        />
      </label>
      <label>
        Image type{" "}
        <select
          value={fields.targetClass}
          onChange={(e) =>
            set(
              "targetClass",
              e.target.value as AssetRequest["target"]["targetClass"],
            )
          }
        >
          {["environment-plate", "title-plate", "reference"].map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label>
        Minimum width{" "}
        <input
          type="number"
          value={fields.minimumWidth}
          onChange={(e) => set("minimumWidth", Number(e.target.value))}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={fields.alphaRequired}
          onChange={(e) => set("alphaRequired", e.target.checked)}
        />{" "}
        Transparent background needed
      </label>
      <label>
        <input
          type="checkbox"
          data-testid="art-desk-new-qa"
          checked={qa}
          onChange={(e) => setQa(e.target.checked)}
        />{" "}
        Test only — keep separate from game artwork
      </label>
      {parent && relatedCandidate ? (
        <label>
          <input
            type="checkbox"
            checked={linkParent}
            onChange={(e) => setLinkParent(e.target.checked)}
          />{" "}
          Link this to revision {relatedCandidate.revision}
        </label>
      ) : null}
      <fieldset data-testid="art-desk-new-references">
        <legend>Style reference images (optional)</legend>
        {fields.styleReferences.map((reference, index) => (
          <div key={index} className="art-desk-reference-row">
            <select
              aria-label="Reference role"
              value={reference.role}
              onChange={(e) =>
                setReference(index, {
                  role: e.target.value as AssetStyleReference["role"],
                })
              }
            >
              {STYLE_REFERENCE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <input
              aria-label="Reference image"
              placeholder="drive:<fileId> · repo:<path> · candidate:<id>"
              value={reference.ref}
              onChange={(e) => setReference(index, { ref: e.target.value })}
            />
            <input
              aria-label="Reference SHA-256"
              placeholder="sha256 (if known)"
              value={reference.sha256 ?? ""}
              pattern="[0-9a-f]{64}"
              onChange={(e) =>
                setReference(index, { sha256: e.target.value || undefined })
              }
            />
            <button
              type="button"
              onClick={() =>
                set(
                  "styleReferences",
                  fields.styleReferences.filter((_, i) => i !== index),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          data-testid="art-desk-add-reference"
          onClick={() =>
            set("styleReferences", [
              ...fields.styleReferences,
              { role: "drawing-style", ref: "" },
            ])
          }
        >
          Add reference image
        </button>
      </fieldset>
      <label>
        Recipe (one line each){" "}
        <textarea
          data-testid="art-desk-new-recipe"
          value={fields.recipe.join("\n")}
          onChange={(e) => set("recipe", e.target.value.split("\n"))}
          rows={3}
        />
      </label>
      <button type="submit" data-testid="art-desk-new-submit">
        Create request
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

declare const __PG_BUILD_IDENTITY__: unknown;
