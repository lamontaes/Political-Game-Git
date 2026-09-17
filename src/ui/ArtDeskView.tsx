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
import { ART_DESK_CONTRACT_ID } from "../authoring/asset-review";
import {
  ART_DESK_TABS,
  artDeskCards,
  assetFileStem,
  candidateNotes,
  cardIsUntagged,
  cardMatchesFacet,
  familyLabel,
  filterCards,
  lineageOfCandidate,
  lineageSentence,
  originalDownloadName,
  tabCounts,
  viewedCandidateView,
  type ArtDeskCard,
  type ArtDeskTab,
} from "../authoring/art-desk-cards";
import "./art-desk.css";

const INPUTS_ROUTE = "/__dev/art-desk/inputs";
const BENCH = "/__dev/artbench";

interface BytesInfo {
  readonly state: "verified" | "missing" | "hash-mismatch" | "not-a-raster";
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
}

interface InputsReceipt {
  readonly checkedAt: string;
  readonly privatePack: ArtDeskPrivatePackReceipt;
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
  missing: "no bytes",
  "hash-mismatch": "mismatch",
  "not-a-raster": "broken",
  unchecked: "unchecked",
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
  if (candidate && bytes?.state === "verified") {
    return (
      <img
        className={`art-desk-thumb${candidate.hasAlpha ? " art-desk-thumb--alpha" : ""}`}
        data-testid={testId}
        src={originalUrl(candidate.candidateId, candidate.sha256)}
        alt=""
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

const STATUS_LABEL: Record<CandidateStatus, string> = {
  "awaiting-review": "awaiting review",
  approved: "approved",
  rejected: "rejected",
  "revision-requested": "revision requested",
  "integration-ready": "integration-ready",
  accepted: "accepted by integration",
  installed: "installed",
  "in-game": "in game",
};

const TAB_STORAGE_KEY = "ocd-art-desk-tab";

function storedTab(): ArtDeskTab {
  try {
    const value = window.localStorage.getItem(TAB_STORAGE_KEY);
    return ART_DESK_TABS.some((tab) => tab.key === value)
      ? (value as ArtDeskTab)
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

const MORE_FILTER_FACETS = ["region", "season", "family", "custom"] as const;

export function ArtDeskView() {
  const privateAuthoring = localReviewOn();
  const [bench, setBench] = useState<BenchState | null>(null);
  const [inputs, setInputs] = useState<InputsReceipt | null>(null);
  const [lane, setLane] = useState<RequestLane | "all">("needs-review");
  const [status, setStatus] = useState<CandidateStatus | "all">("all");
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
  const [tab, setTabState] = useState<ArtDeskTab>(storedTab);
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<string>("all");
  const [showMore, setShowMore] = useState(false);
  const [showQa, setShowQa] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const setTab = (next: ArtDeskTab) => {
    setTabState(next);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      /* the tab simply isn't remembered */
    }
  };

  const reload = useCallback(async () => {
    const [state, receipt] = await Promise.all([
      getJson<BenchState>(`${BENCH}/state`),
      getJson<InputsReceipt>(INPUTS_ROUTE),
    ]);
    if (state) setBench(state);
    if (receipt) setInputs(receipt);
    return state;
  }, []);

  useEffect(() => {
    if (!privateAuthoring) return;
    void loadSession();
    void reload();
    const timer = setInterval(() => void reload(), 15_000);
    return () => clearInterval(timer);
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
        status,
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
    if (!advancedOpen || !selectedRequest) return;
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
  }, [advancedOpen, selectedRequest, viewedCandidateId]);

  const viewed =
    (viewedCandidateId && projection?.candidates[viewedCandidateId]) || null;
  const viewedBytes = viewed ? bench?.bytes[viewed.candidateId] : undefined;

  const cards = useMemo(
    () => (projection ? artDeskCards(projection) : []),
    [projection],
  );
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
    const byUntagged = untagged ? byFacet.filter(cardIsUntagged) : byFacet;
    return filterCards(byUntagged, {
      tab,
      text: query,
      status,
      assetType,
      showQa,
    });
  }, [cards, facet, untagged, tab, query, status, assetType, showQa]);
  const selectedCard =
    visibleCards.find((card) => card.key === selectedCardKey) ??
    visibleCards[0] ??
    null;
  const moreFilterCount =
    (facet ? 1 : 0) + (untagged ? 1 : 0) + (showQa ? 1 : 0);
  const clearFilters = () => {
    setFacet(null);
    setUntagged(false);
    setShowQa(false);
    setQuery("");
    setStatus("all");
    setAssetType("all");
  };
  const detailRequest = advancedOpen
    ? selectedRequest
    : selectedCard && projection
      ? (projection.requests[selectedCard.requestId] ?? null)
      : null;

  useEffect(() => {
    if (advancedOpen || !selectedCard) return;
    if (
      viewedCandidateId &&
      (selectedCard.lineage.some((s) => s.candidateId === viewedCandidateId) ||
        selectedCard.otherVersions.includes(viewedCandidateId))
    )
      return;
    setViewedCandidateId(selectedCard.leadCandidateId);
  }, [advancedOpen, selectedCard, viewedCandidateId]);

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
          setMessage(
            `${decision} refused (${result.error ?? "error"}): ${result.message}`,
          );
          return false;
        }
        await reload();
        setMessage(
          `${decision} recorded for ${candidate.candidateId.slice(0, 13)}… at ${candidate.sha256.slice(0, 12)}… (event ${result.body.events[0]?.eventId ?? "?"}). Private acceptance is not public release.`,
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
      await reload();
      setMessage(
        `Sync ${status.status}: ${status.pendingOutbox} unsynced event(s), ${status.pendingBatches.length} partial batch(es)${status.lastError ? `; ${status.lastError}` : ""}.`,
      );
    } finally {
      setBusy(false);
    }
  }, [reload]);

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
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
      ? `Drive exchange synced${sync.lastSuccessAt ? ` ${shortDate(sync.lastSuccessAt)}` : ""}`
      : sync.status === "needs-mirror"
        ? "Drive exchange not on this Mac"
        : sync.status === "error"
          ? "Drive exchange error"
          : "Drive exchange not synced yet"
    : "Drive exchange —";
  const packLine =
    pack.status === "verified"
      ? "Private pack ready"
      : `Private pack ${pack.status}`;

  const detail =
    detailRequest && projection && bench ? (
      <RequestDetail
        key={detailRequest.request.requestId}
        card={advancedOpen ? undefined : (selectedCard ?? undefined)}
        request={detailRequest}
        projection={projection}
        bench={bench}
        pack={pack}
        viewed={viewed}
        viewedBytes={viewedBytes}
        busy={busy}
        showIds={showIds}
        onToggleIds={() => setShowIds((v) => !v)}
        onView={setViewedCandidateId}
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
        onTags={async (candidate, tags) => {
          const result = await postEvent("tags.set", {
            entity: "candidate",
            entityId: candidate.candidateId,
            tags,
            baseVersion: candidate.tagsVersion,
          });
          setMessage(
            result.ok
              ? `Tags saved for ${candidate.candidateId.slice(0, 13)}… (event ${result.body.events[0]?.eventId}).`
              : `Tags not saved: ${result.message}`,
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
          {ART_DESK_TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={
                !advancedOpen && tab === item.key ? "page" : undefined
              }
              data-testid={`art-desk-tab-${item.key}`}
              onClick={() => {
                setAdvancedOpen(false);
                setTab(item.key);
              }}
            >
              {item.label}{" "}
              <span className="art-desk-count">{counts4[item.key]}</span>
            </button>
          ))}
        </nav>
        <div className="art-desk-toolbar">
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
                setStatus(event.target.value as CandidateStatus | "all")
              }
            >
              <option value="all">Any</option>
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label[0]!.toUpperCase() + label.slice(1)} (
                  {counts.statuses[key] ?? 0})
                </option>
              ))}
            </select>
          </label>
          <label>
            Asset type{" "}
            <select
              aria-label="Asset type"
              data-testid="art-desk-asset-type"
              value={assetType}
              onChange={(event) => setAssetType(event.target.value)}
            >
              <option value="all">Any</option>
              {assetTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/-/g, " ")}
                </option>
              ))}
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
          assetType !== "all" ? (
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
                setTab("library");
                setSelectedCardKey(`request:${created}`);
                setSelectedRequestId(created);
              }
            }}
            setMessage={setMessage}
          />
        ) : null}
      </header>
      {advancedOpen ? null : (
        <div className="art-desk-layout">
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
                      <strong>{card.title}</strong>
                      <span className="art-desk-card-change">
                        {card.change}
                      </span>
                      <span className="art-desk-meta">
                        <span
                          className={`art-desk-badge art-desk-badge--${card.status ?? "none"}`}
                        >
                          {card.statusLabel}
                        </span>{" "}
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
                <summary>
                  {selectedCard.lineageState === "chain"
                    ? `How this asset was made (${selectedCard.lineage.length} steps)`
                    : selectedCard.lineageState === "original"
                      ? "How this asset was made (the recorded original)"
                      : "How this asset was made (not recorded)"}
                </summary>
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
                        {step.stage[0]!.toUpperCase() + step.stage.slice(1)} ·{" "}
                        {step.width}×{step.height} · {shortDate(step.at)}
                      </button>
                    </li>
                  ))}
                </ol>
                {selectedCard.otherVersions.length ? (
                  <p className="art-desk-meta">
                    Also {selectedCard.otherVersions.length} other version
                    {selectedCard.otherVersions.length === 1 ? "" : "s"} of this
                    asset, listed below.
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
        open={advancedOpen}
        onToggle={(event) =>
          setAdvancedOpen((event.target as HTMLDetailsElement).open)
        }
      >
        <summary>
          Advanced: all requests by lane, queue, history and store
        </summary>
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
                <strong>Drive exchange: {sync.status}.</strong>{" "}
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
          {advancedOpen
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
  bench,
  pack,
  viewed,
  viewedBytes,
  busy,
  showIds,
  onToggleIds,
  onView,
  onDecide,
  onIntake,
  onSelect,
  onTags,
  card,
}: {
  /** The asset card this detail was opened from, in the card view. */
  readonly card?: ArtDeskCard;
  readonly request: ProjectedRequest;
  readonly projection: ArtbenchProjection;
  readonly bench: BenchState;
  readonly pack: ArtDeskPrivatePackReceipt;
  readonly viewed: ProjectedCandidate | null;
  readonly viewedBytes?: BytesInfo;
  readonly busy: boolean;
  readonly showIds: boolean;
  readonly onToggleIds: () => void;
  readonly onView: (candidateId: string) => void;
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
  readonly onSelect: (candidateId: string) => Promise<void>;
  readonly onTags: (
    candidate: ProjectedCandidate,
    tags: TagSet,
  ) => Promise<boolean>;
}) {
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
                : `Download failed for ${detail.name}.`,
          );
        return;
      }
      setBriefNote(
        detail.state === "completed"
          ? `Saved ${detail.name} in Downloads › Our Civic Duty Art Desk.`
          : detail.state === "cancelled"
            ? "Download cancelled."
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
  const originalName = viewed
    ? originalDownloadName(
        subject?.title ?? r.title,
        viewed.sha256,
        viewed.container,
      )
    : null;
  const parent = viewed?.parentCandidateId
    ? projection.candidates[viewed.parentCandidateId]
    : undefined;

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

  async function uploadEdited(files: FileList | null, approve: boolean) {
    if (!files || !viewed) return;
    const results = await onIntake([...files], {
      requestId,
      parentCandidateId: viewed.candidateId,
      editKind,
      note: editNote || undefined,
    });
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
      className={`art-desk-detail${dragging ? " art-desk-detail--dragging" : ""}`}
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
      <h2 data-testid="art-desk-detail-heading">{heading}</h2>
      {subject?.newer ? (
        <p className="art-desk-warning" data-testid="art-desk-newer-candidate">
          A newer version of this asset is waiting for review:{" "}
          {subject.newer.title} ({shortDate(subject.newer.at)}).{" "}
          <button
            type="button"
            onClick={() => onView(subject.newer!.candidateId)}
          >
            Show the newer version
          </button>
        </p>
      ) : null}
      <p>
        {heading !== r.title
          ? `${r.title}. ${r.consumer.playerVisibleUse}`
          : r.consumer.playerVisibleUse}
      </p>
      <p className="art-desk-meta">
        {LANE_LABELS[request.lane]} · request v{r.requestVersion} · target{" "}
        {r.target.targetClass} ≥{r.target.minimumWidth}px,{" "}
        {r.target.aspectRatio}, alpha{" "}
        {r.target.alphaRequired ? "required" : "optional"} · asset{" "}
        {request.assetId}
        {request.parentRequestId
          ? ` · related to ${request.parentRequestId}`
          : ""}
      </p>
      <StyleReferenceSummary request={r} />
      {request.qa ? (
        <p className="art-desk-warning" data-testid="art-desk-qa-flag">
          Disposable QA request from the private sidecar. Its candidates are
          bench proof, not production art, and never count as coverage.
        </p>
      ) : null}
      {request.lane === "awaiting-capable-worker" &&
      request.candidateIds.length === 0 ? (
        <p className="art-desk-warning" data-testid="art-desk-awaiting-worker">
          Needs generation, but no capable generator is registered with this
          bench. Copy the brief to a producer; the inbox importer will bring the
          batch back. Nothing is faked.
        </p>
      ) : null}
      <div className="art-desk-actions">
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
        <span
          role="status"
          className="art-desk-meta"
          data-testid="art-desk-brief-status"
        >
          {briefNote}
        </span>
        <label className="art-desk-upload">
          {isInbox ? "Upload to inbox" : "Upload candidate(s)"}
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
      {request.candidateIds.length > 0 ? (
        <ol
          className="art-desk-alternatives"
          data-testid="art-desk-alternatives"
        >
          {request.candidateIds.map((candidateId) => {
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
                      rev {candidate.revision}
                      {request.selectedCandidateId === candidateId
                        ? " · selected"
                        : ""}
                    </strong>
                    <span className="art-desk-meta">
                      {STATUS_LABEL[candidate.status]} · {candidate.width}×
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
          No candidate is recorded for this request.
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
                <img
                  src={originalUrl(parent.candidateId, parent.sha256)}
                  alt={`Parent revision ${parent.revision}`}
                  data-testid="art-desk-parent-preview"
                />
                <figcaption className="art-desk-meta">
                  parent rev {parent.revision} · {parent.width}×{parent.height}
                </figcaption>
              </figure>
            ) : null}
            {viewedBytes?.state === "verified" ? (
              <figure
                className={viewed.hasAlpha ? "art-desk-checker" : undefined}
              >
                <img
                  src={originalUrl(viewed.candidateId, viewed.sha256)}
                  alt={`Candidate for ${r.title}`}
                  data-testid="art-desk-candidate-preview"
                />
                <figcaption className="art-desk-meta">
                  rev {viewed.revision} · {viewed.width}×{viewed.height}{" "}
                  {viewed.container}
                  {viewed.hasAlpha ? " · transparent" : ""}
                </figcaption>
              </figure>
            ) : (
              <p data-testid="art-desk-candidate-preview-missing">
                {viewedBytes
                  ? `${viewedBytes.state}: ${viewedBytes.note}`
                  : "Bench data not loaded for this candidate."}
              </p>
            )}
          </div>
          <p
            className="art-desk-meta"
            data-testid="art-desk-candidate-state"
            data-candidate-bytes={viewedBytes?.state ?? "unchecked"}
          >
            Recorded hash {viewed.sha256.slice(0, 12)}… · {viewed.candidateId} ·
            rev {viewed.revision} · {viewed.source} · bytes{" "}
            {viewedBytes?.state ?? "unchecked"} · {viewed.width}×{viewed.height}{" "}
            {viewed.container} · native detail {viewed.nativeDetail}
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
          <p className="art-desk-meta" data-testid="art-desk-reference-inputs">
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
                  Parent {parent.candidateId} (rev {parent.revision},{" "}
                  {parent.width}×{parent.height}
                  {parent.hasAlpha ? " α" : ""}).{" "}
                  <button type="button" onClick={() => setCompare((v) => !v)}>
                    {compare ? "Hide parent" : "Compare with parent"}
                  </button>
                </>
              ) : null}
            </p>
          ) : null}
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
                Tags carried forward:{" "}
                {Object.entries(notes.inheritedTags)
                  .map(([key, values]) => `${key}: ${values.join(", ")}`)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
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
                Make this the selected revision
              </button>
            ) : null}
            {viewedBytes?.state === "verified" ? (
              <button
                type="button"
                data-testid="art-desk-download-original"
                data-download-name={originalName ?? undefined}
                onClick={() => void downloadOriginal()}
              >
                Download original ({viewed.width}×{viewed.height}{" "}
                {viewed.container})
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
                  placeholder="Exactly what should change on this candidate."
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
            <div className="art-desk-dialog" data-testid="art-desk-edit">
              <strong>External edit round trip</strong>
              <span className="art-desk-meta">
                Download the original above, edit it outside, then upload the
                result here. Identity, tags, notes and lineage are kept;
                approval is not.
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
                Upload edited version
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
          <TagEditor
            key={`${viewed.candidateId}:${viewed.tagsVersion}`}
            candidate={viewed}
            busy={busy}
            onSave={(tags) => onTags(viewed, tags)}
          />
          <div data-testid="art-desk-decisions">
            <strong>Decisions</strong>
            {viewed.decisions.length === 0 ? (
              <p className="art-desk-meta">
                Awaiting review. No decision has been recorded for these exact
                bytes.
              </p>
            ) : (
              <ul>
                {viewed.decisions.map((d) => (
                  <li
                    key={d.eventId}
                    data-testid={`art-desk-decision-${d.payload.decision}`}
                  >
                    <strong>{d.payload.decision}</strong> by {d.actor.id} at{" "}
                    {d.at} · review {d.payload.reviewId} · event {d.eventId}
                    {d.payload.note ? ` · "${d.payload.note}"` : ""}
                    {d.payload.supersedesReviewId
                      ? ` · supersedes ${d.payload.supersedesReviewId}`
                      : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
      <details open={showIds} onToggle={onToggleIds}>
        <summary>IDs, measurements and compiled brief</summary>
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

function StyleReferenceSummary({
  request,
}: {
  readonly request: AssetRequest;
}) {
  const references = requestReferencePixels(request);
  return (
    <div className="art-desk-meta" data-testid="art-desk-style-references">
      <strong>Style reference</strong>{" "}
      {references.map((reference, index) => {
        const candidateId = reference.pathOrDriveId.startsWith("candidate:")
          ? reference.pathOrDriveId.slice("candidate:".length)
          : null;
        const driveId = reference.pathOrDriveId.startsWith("drive:")
          ? reference.pathOrDriveId.slice("drive:".length)
          : null;
        return (
          <span
            key={`${reference.pathOrDriveId}-${index}`}
            className="art-desk-reference"
            data-testid="art-desk-style-reference"
            data-resolution={reference.resolution ?? "unresolved"}
            data-role={reference.role}
          >
            {reference.role}:{" "}
            {candidateId && reference.sha256 ? (
              <img
                className="art-desk-reference-thumb"
                alt=""
                width={48}
                src={originalUrl(candidateId, reference.sha256)}
              />
            ) : null}
            {driveId ? (
              <a
                href={`https://drive.google.com/file/d/${encodeURIComponent(driveId)}/view`}
                target="_blank"
                rel="noreferrer"
              >
                {reference.pathOrDriveId}
              </a>
            ) : (
              reference.pathOrDriveId
            )}
            {reference.sha256 ? ` · sha ${reference.sha256.slice(0, 12)}…` : ""}{" "}
            ·{" "}
            {reference.resolution === "declared"
              ? "declared (not proof it was supplied)"
              : `unresolved — ${reference.missingReason ?? "no image recorded"}`}
            {index < references.length - 1 ? " | " : ""}
          </span>
        );
      })}
    </div>
  );
}

function NewRequestForm({
  mode,
  projection,
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
            ? `Request ${draft.request.requestId} created (event ${result.body.events[0]?.eventId}).`
            : `Request not created: ${result.message}`,
        );
        await onDone(result.ok ? draft.request.requestId : null);
      }}
    >
      <strong data-testid="art-desk-new-request-heading">
        {parent
          ? `Related variant of ${parent.request.requestId} — copies its target, acceptance criteria, scope and style authority`
          : "New independent request — nothing is copied from the selected row"}
      </strong>
      <span className="art-desk-meta">
        A request declares need; it does not generate or spend.{" "}
        {Object.keys(projection.requests).length} requests exist.
      </span>
      <label>
        requestId{" "}
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
        Player-visible use{" "}
        <input
          data-testid="art-desk-new-use"
          value={fields.use}
          onChange={(e) => set("use", e.target.value)}
          required
        />
      </label>
      <label>
        Consumer{" "}
        <input
          data-testid="art-desk-new-consumer"
          value={fields.consumerId}
          onChange={(e) => set("consumerId", e.target.value)}
        />
      </label>
      <label>
        Target class{" "}
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
        alpha required
      </label>
      <label>
        <input
          type="checkbox"
          data-testid="art-desk-new-qa"
          checked={qa}
          onChange={(e) => setQa(e.target.checked)}
        />{" "}
        QA / disposable (never coverage or integration cargo)
      </label>
      {parent && relatedCandidate ? (
        <label>
          <input
            type="checkbox"
            checked={linkParent}
            onChange={(e) => setLinkParent(e.target.checked)}
          />{" "}
          use {relatedCandidate.candidateId.slice(0, 13)}… as parent (variant of
          the same asset)
        </label>
      ) : null}
      <fieldset data-testid="art-desk-new-references">
        <legend>
          Style reference images (optional; unresolved is allowed)
        </legend>
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
