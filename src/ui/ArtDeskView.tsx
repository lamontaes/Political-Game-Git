import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";

import assetRequestDocument from "../../art/requests/asset-requests.json";
import reviewDocumentSeed from "../../art/requests/asset-reviews.json";
import claimDocumentSeed from "../../art/requests/asset-claims.json";
import reconciliationSeed from "../../art/requests/art-desk-reconciliation.json";
import generationBatch from "../../art/requests/art-desk-generation-batch.json";
import {
  ART_DESK_LANES,
  decisionBlocker,
  filterDeskItems,
  paginateDeskItems,
  projectArtDesk,
  unknownPrivatePackReceipt,
  type ArtDeskCandidateInput,
  type ArtDeskItem,
  type ArtDeskLane,
  type ArtDeskPrivatePackReceipt,
  type ArtDeskReconciliation,
} from "../authoring/art-desk";
import {
  briefContractHash,
  compileAssetBrief,
  styleReferencesFor,
} from "../authoring/asset-brief";
import {
  emptyClaimDocument,
  type AssetClaimDocument,
} from "../authoring/asset-claim";
import type {
  AssetRequest,
  AssetRequestDocument,
} from "../authoring/asset-request";
import {
  emptyReviewDocument,
  recordReview,
  type AssetReviewDocument,
  type AssetReviewDecision,
} from "../authoring/asset-review";
import { ART_DESK_CONTRACT_ID } from "../authoring/asset-review";
import { toCanonicalJson } from "../authoring/canonical-json";
import { locationReviewVisuals } from "../presentation/location-art-review";
import { SceneBackdrop } from "../player/SceneBackdrop";
import "./art-desk.css";

const LANE_LABEL: Record<ArtDeskLane, string> = {
  "needs-your-review": "Needs your review",
  "claimed-generating": "Claimed / generating",
  revision: "Revision",
  "approved-awaiting-integration": "Approved, awaiting integration",
  "in-game": "In-game",
  "covered-history": "Covered / history",
};

const PAGE_SIZE = 8;

/** Private, gitignored sidecars the loopback bridge allowlists. */
const CANDIDATE_SIDECAR = "art/generated/candidates/art-desk/candidates.json";
const QA_REQUEST_SIDECAR = "art/generated/candidates/art-desk/qa-requests.json";
const INPUTS_ROUTE = "/__dev/art-desk/inputs";

/** Mirrors scripts/dev-lab/art-desk-inputs.ts; the browser only reads it. */
interface InputsReceipt {
  readonly checkedAt: string;
  readonly privatePack: ArtDeskPrivatePackReceipt;
  readonly candidates: readonly {
    readonly requestId: string;
    readonly sha256: string;
    readonly path: string;
    readonly source: "generation-batch" | "upload-sidecar";
    readonly bytes: "verified" | "missing" | "hash-mismatch" | "not-a-raster";
    readonly actualSha256?: string;
    readonly byteLength?: number;
    readonly raster?: {
      readonly container: "png" | "jpg";
      readonly width: number;
      readonly height: number;
    };
    readonly note: string;
  }[];
}

interface CandidateSidecar {
  readonly documentVersion: 1;
  readonly candidates: readonly {
    readonly requestId: string;
    readonly sha256: string;
    readonly path: string;
    readonly byteLength: number;
    readonly container: "png" | "jpg";
    readonly width: number;
    readonly height: number;
    readonly storedAt: string;
    readonly declaredBy: string;
    readonly rightsStatus: "unknown";
    readonly sourceDeclaration: string;
  }[];
}

async function sha256Hex(data: BufferSource | string): Promise<string> {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function candidateRelativePath(
  requestId: string,
  sha256: string,
  ext: "png" | "jpg",
): string {
  return `art/generated/candidates/art-desk/${requestId}/${sha256}.${ext}`;
}

function localReviewOn(): boolean {
  return typeof __PG_BUILD_IDENTITY__ !== "undefined";
}

function deskFileUrl(relativePath: string, version?: string): string {
  const base = `/__dev/art-desk/file?path=${encodeURIComponent(relativePath)}`;
  return version ? `${base}&v=${version.slice(0, 12)}` : base;
}

async function deskGet(relativePath: string): Promise<{
  revision: string;
  json: unknown;
} | null> {
  const response = await fetch(deskFileUrl(relativePath), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const revision = response.headers.get("X-Art-Desk-Revision") ?? "";
  return { revision, json: await response.json() };
}

async function deskPut(
  relativePath: string,
  json: unknown,
  ifMatch: string | null,
): Promise<{ ok: true; revision: string } | { ok: false; message: string }> {
  const body = toCanonicalJson(json);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (ifMatch) headers["If-Match"] = ifMatch;
  const response = await fetch(deskFileUrl(relativePath), {
    method: "PUT",
    headers,
    body,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    revision?: string;
    message?: string;
  };
  if (!response.ok) {
    return { ok: false, message: payload.message ?? response.statusText };
  }
  return { ok: true, revision: payload.revision ?? "" };
}

async function fetchInputs(): Promise<InputsReceipt | null> {
  const response = await fetch(INPUTS_ROUTE, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as InputsReceipt;
}

/** Keys typed into a field are text, never desk commands. */
function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

const THUMB_LABEL: Record<ArtDeskItem["candidateBytes"], string> = {
  unchecked: "unchecked",
  verified: "",
  missing: "no bytes",
  "hash-mismatch": "mismatch",
  "not-a-raster": "not raster",
};

function CandidateThumb({ item }: { readonly item: ArtDeskItem }) {
  const requestId = item.request.requestId;
  if (item.candidateVerified && item.candidateThumbPath) {
    return (
      <img
        className="art-desk-thumb"
        data-testid={`art-desk-thumb-${requestId}`}
        src={deskFileUrl(item.candidateThumbPath, item.candidateSha256)}
        alt=""
      />
    );
  }
  return (
    <span
      className="art-desk-thumb art-desk-thumb--none"
      data-testid={`art-desk-thumb-${requestId}-none`}
      data-candidate-bytes={item.candidateSha256 ? item.candidateBytes : "none"}
      aria-hidden="true"
    >
      {item.candidateSha256 ? THUMB_LABEL[item.candidateBytes] : "—"}
    </span>
  );
}

export function ArtDeskView() {
  const privateAuthoring = localReviewOn();
  const [lane, setLane] = useState<ArtDeskLane>("needs-your-review");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<AssetReviewDocument>(
    reviewDocumentSeed as AssetReviewDocument,
  );
  const [claims, setClaims] = useState<AssetClaimDocument>(
    claimDocumentSeed as AssetClaimDocument,
  );
  const [qaRequests, setQaRequests] = useState<readonly AssetRequest[]>([]);
  const [inputs, setInputs] = useState<InputsReceipt | null>(null);
  const [reviewRevision, setReviewRevision] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showIds, setShowIds] = useState(false);

  const reloadInputs = useCallback(async () => {
    const receipt = await fetchInputs();
    if (receipt) setInputs(receipt);
    return receipt;
  }, []);

  useEffect(() => {
    if (!privateAuthoring) return;
    void (async () => {
      const liveReviews = await deskGet("art/requests/asset-reviews.json");
      const liveClaims = await deskGet("art/requests/asset-claims.json");
      const liveQa = await deskGet(QA_REQUEST_SIDECAR);
      if (liveReviews) {
        setReviews(liveReviews.json as AssetReviewDocument);
        setReviewRevision(liveReviews.revision);
      }
      if (liveClaims) {
        setClaims(liveClaims.json as AssetClaimDocument);
      }
      if (liveQa) {
        const document = liveQa.json as { requests?: AssetRequest[] };
        setQaRequests(document.requests ?? []);
      }
      await reloadInputs();
    })();
  }, [privateAuthoring, reloadInputs]);

  const registryRequests = (assetRequestDocument as AssetRequestDocument)
    .requests;
  const requests = useMemo(() => {
    const registryIds = new Set(registryRequests.map((r) => r.requestId));
    return [
      ...registryRequests,
      ...qaRequests.filter((r) => !registryIds.has(r.requestId)),
    ];
  }, [registryRequests, qaRequests]);
  const disposableRequestIds = useMemo(
    () => new Set(qaRequests.map((r) => r.requestId)),
    [qaRequests],
  );

  const desk = useMemo(() => {
    const candidateByRequest: Record<string, ArtDeskCandidateInput> = {};
    if (inputs) {
      for (const receipt of inputs.candidates) {
        candidateByRequest[receipt.requestId] = {
          sha256: receipt.sha256,
          path: receipt.path,
          bytes: receipt.bytes,
          source: receipt.source,
          raster: receipt.raster,
        };
      }
    } else {
      // Before the receipt arrives the batch registry is metadata only.
      for (const record of generationBatch.records) {
        candidateByRequest[record.requestId] = {
          sha256: record.outputSha256,
          path: record.privatePath,
          bytes: "unchecked",
          source: "generation-batch",
        };
      }
    }
    return projectArtDesk({
      requests,
      claims: claims.claims ? claims : emptyClaimDocument(),
      reviews: reviews.reviews ? reviews : emptyReviewDocument(),
      now: new Date().toISOString(),
      reconciliation: reconciliationSeed as ArtDeskReconciliation,
      privatePack: inputs?.privatePack ?? unknownPrivatePackReceipt(),
      disposableRequestIds,
      candidateByRequest,
    });
  }, [requests, claims, reviews, inputs, disposableRequestIds]);
  const filtered = useMemo(
    () => filterDeskItems(desk.items, lane, query),
    [desk.items, lane, query],
  );
  const paged = paginateDeskItems(filtered, page, PAGE_SIZE);
  const selected =
    desk.items.find((item) => item.request.requestId === selectedId) ??
    paged.page[0];

  useEffect(() => {
    setPage(0);
  }, [lane, query]);

  useEffect(() => {
    if (
      selectedId &&
      !filtered.some((item) => item.request.requestId === selectedId)
    ) {
      setSelectedId(filtered[0]?.request.requestId ?? null);
    }
  }, [filtered, selectedId]);

  const decide = useCallback(
    async (item: ArtDeskItem, decision: AssetReviewDecision) => {
      if (!privateAuthoring) {
        setMessage(
          "Art Desk writes require the identified local authoring server.",
        );
        return;
      }
      // Re-read the receipt so the decision binds bytes as they are now, not
      // as they were when the list last rendered.
      const fresh = await reloadInputs();
      const current = fresh?.candidates.find(
        (candidate) => candidate.requestId === item.request.requestId,
      );
      const live: ArtDeskItem = current
        ? {
            ...item,
            candidateSha256: current.sha256,
            candidateBytes: current.bytes,
            candidateVerified: current.bytes === "verified",
          }
        : { ...item, candidateBytes: "unchecked", candidateVerified: false };
      const blocker = decisionBlocker(live);
      if (blocker || !current?.actualSha256 || !live.candidateSha256) {
        setMessage(blocker ?? "Candidate bytes are not verified.");
        return;
      }
      const brief = compileAssetBrief({
        request: item.request,
        stylePixels: styleReferencesFor(item.request, desk.privatePack),
      });
      const fitContractHash = await sha256Hex(briefContractHash(brief));
      const sceneContractHash = await sha256Hex(
        item.sceneId ?? item.request.requestId,
      );
      const hash = live.candidateSha256;
      const result = recordReview(reviews, {
        requestId: item.request.requestId,
        requestVersion: item.request.requestVersion,
        expectedRequestVersion: item.request.requestVersion,
        outputSha256: hash,
        currentOutputSha256: current.actualSha256,
        contractVersion: ART_DESK_CONTRACT_ID,
        fitContractHash,
        sceneContractHash,
        decision,
        authorId: "lamontae",
        decidedAt: new Date().toISOString(),
        rightsStatus: "unknown",
        sourceDeclaration:
          "user-or-agent-submission; rights not inferred from a web reference",
        reviewId: `${item.request.requestId}-${hash.slice(0, 12)}-${decision}`,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      const written = await deskPut(
        "art/requests/asset-reviews.json",
        result.document,
        reviewRevision,
      );
      if (!written.ok) {
        setMessage(written.message);
        return;
      }
      setReviews(result.document);
      setReviewRevision(written.revision);
      setMessage(
        `${decision} recorded for ${item.request.requestId} at ${hash.slice(0, 12)}… Private acceptance is not public release.`,
      );
    },
    [privateAuthoring, reviews, reviewRevision, reloadInputs, desk.privatePack],
  );

  async function onUpload(item: ArtDeskItem, file: File) {
    if (!privateAuthoring) {
      setMessage("Uploads require the identified local authoring server.");
      return;
    }
    const bytes = await file.arrayBuffer();
    const sha = await sha256Hex(bytes);
    const ext =
      file.type.includes("jpeg") || /\.jpe?g$/i.test(file.name) ? "jpg" : "png";
    const relative = candidateRelativePath(item.request.requestId, sha, ext);
    const written = await fetch(deskFileUrl(relative), {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: bytes,
    });
    const payload = (await written.json().catch(() => ({}))) as {
      message?: string;
      sha256?: string;
      byteLength?: number;
      container?: "png" | "jpg";
      width?: number;
      height?: number;
    };
    if (!written.ok) {
      setMessage(payload.message ?? written.statusText);
      return;
    }
    if (
      payload.sha256 !== sha ||
      !payload.container ||
      !payload.width ||
      !payload.height
    ) {
      setMessage(
        "Server stored the bytes but did not return decoded raster facts; the candidate was not recorded.",
      );
      return;
    }
    // Persist the request ↔ candidate association in the private sidecar so a
    // reload finds the same candidate. Optimistic concurrency on the sidecar.
    const existing = await deskGet(CANDIDATE_SIDECAR);
    const sidecar: CandidateSidecar = existing
      ? (existing.json as CandidateSidecar)
      : { documentVersion: 1, candidates: [] };
    const next: CandidateSidecar = {
      documentVersion: 1,
      candidates: [
        ...sidecar.candidates.filter(
          (record) => record.requestId !== item.request.requestId,
        ),
        {
          requestId: item.request.requestId,
          sha256: sha,
          path: relative,
          byteLength: payload.byteLength ?? bytes.byteLength,
          container: payload.container,
          width: payload.width,
          height: payload.height,
          storedAt: new Date().toISOString(),
          declaredBy: "art-desk-upload",
          rightsStatus: "unknown",
          sourceDeclaration:
            "user-or-agent-submission; rights not inferred from a web reference",
        },
      ],
    };
    const recorded = await deskPut(
      CANDIDATE_SIDECAR,
      next,
      existing?.revision ?? null,
    );
    if (!recorded.ok) {
      setMessage(
        `Bytes stored under ${sha.slice(0, 12)}… but the candidate record was not written: ${recorded.message}`,
      );
      return;
    }
    await reloadInputs();
    setSelectedId(item.request.requestId);
    setMessage(
      `Stored candidate ${sha.slice(0, 12)}… (${payload.width}×${payload.height} ${payload.container}). Rights remain unknown until declared. Bytes are private; they are not a public release.`,
    );
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (isTextTarget(event.target)) return;
    const ids = paged.page.map((item) => item.request.requestId);
    const index = selected ? ids.indexOf(selected.request.requestId) : 0;
    if (event.key === "ArrowDown" || event.key === "j") {
      event.preventDefault();
      setSelectedId(ids[Math.min(ids.length - 1, index + 1)] ?? null);
    } else if (event.key === "ArrowUp" || event.key === "k") {
      event.preventDefault();
      setSelectedId(ids[Math.max(0, index - 1)] ?? null);
    } else if (event.key === "a" && selected) {
      void decide(selected, "approve");
    } else if (event.key === "r" && selected) {
      void decide(selected, "request-revision");
    } else if (event.key === "x" && selected) {
      void decide(selected, "reject");
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

  const pack = desk.privatePack;

  return (
    <div
      className="art-desk"
      data-testid="art-desk"
      tabIndex={0}
      onKeyDown={onKey}
    >
      <header className="art-desk-header">
        <p className="eyebrow">Private authoring · {desk.contractVersion}</p>
        <h1>Art Desk</h1>
        <p>
          Review new candidates against the durable request registry. Previews
          do not write saves. Unapproved pixels never replace accepted game art.
        </p>
        <p
          className="art-desk-pack"
          data-testid="art-desk-pack"
          data-pack-status={pack.status}
        >
          <strong>Private pack: {pack.status}.</strong> {pack.note}
          {inputs ? (
            <span className="art-desk-meta" data-testid="art-desk-inputs">
              {" "}
              Receipt read {inputs.checkedAt}; {inputs.candidates.length}{" "}
              recorded candidate
              {inputs.candidates.length === 1 ? "" : "s"},{" "}
              {inputs.candidates.filter((c) => c.bytes === "verified").length}{" "}
              with verified bytes.
            </span>
          ) : null}
        </p>
        <label>
          Search{" "}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search requests"
          />
        </label>
        <nav aria-label="Art Desk lanes">
          {ART_DESK_LANES.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={lane === key}
              onClick={() => setLane(key)}
            >
              {LANE_LABEL[key]}
            </button>
          ))}
        </nav>
      </header>
      <div className="art-desk-layout">
        <ol className="art-desk-list" data-testid="art-desk-list">
          {paged.page.map((item) => (
            <li key={item.request.requestId}>
              <button
                type="button"
                className="art-desk-row"
                aria-pressed={
                  selected?.request.requestId === item.request.requestId
                }
                data-testid={`art-desk-row-${item.request.requestId}`}
                onClick={() => setSelectedId(item.request.requestId)}
              >
                <CandidateThumb item={item} />
                <span className="art-desk-row-copy">
                  <strong>{item.request.title}</strong>
                  <span>{item.request.consumer.playerVisibleUse}</span>
                  <span className="art-desk-meta">
                    {item.lane} ·{" "}
                    {item.generationEligible
                      ? "may generate"
                      : "do not generate"}
                    {item.disposable ? " · QA, disposable" : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        {selected && (
          <ArtDeskDetail
            item={selected}
            pack={pack}
            showIds={showIds}
            onToggleIds={() => setShowIds((value) => !value)}
            onDecide={decide}
            onUpload={onUpload}
          />
        )}
      </div>
      <footer className="art-desk-pager">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
        >
          Previous
        </button>
        <span>
          {paged.total} items · page {page + 1} / {paged.pages}
        </span>
        <button
          type="button"
          disabled={page + 1 >= paged.pages}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
        <p role="status" data-testid="art-desk-status">
          {message}
        </p>
      </footer>
    </div>
  );
}

function ArtDeskDetail({
  item,
  pack,
  showIds,
  onToggleIds,
  onDecide,
  onUpload,
}: {
  readonly item: ArtDeskItem;
  readonly pack: ArtDeskPrivatePackReceipt;
  readonly showIds: boolean;
  readonly onToggleIds: () => void;
  readonly onDecide: (
    item: ArtDeskItem,
    decision: AssetReviewDecision,
  ) => Promise<void>;
  readonly onUpload: (item: ArtDeskItem, file: File) => Promise<void>;
}) {
  const brief = compileAssetBrief({
    request: item.request,
    stylePixels: styleReferencesFor(item.request, pack),
    bodyPoseFamilies: item.request.requestId.startsWith("person-")
      ? ["standing-neutral"]
      : [],
  });
  const sceneId =
    item.sceneId &&
    [
      "park-community-pavilion-candidate",
      "press-briefing-room-candidate",
      "campaign-storefront-production",
      "civic-community-meeting-room",
    ].includes(item.sceneId)
      ? item.sceneId
      : null;
  const blocker = decisionBlocker(item);
  return (
    <article className="art-desk-detail" data-testid="art-desk-detail">
      <h2>{item.request.title}</h2>
      <p>{item.request.consumer.playerVisibleUse}</p>
      <p data-testid="art-desk-coverage">{item.coverage.note}</p>
      {item.warnings.map((warning) => (
        <p key={warning} className="art-desk-warning">
          {warning}
        </p>
      ))}
      <div className="art-desk-preview" data-testid="art-desk-preview">
        {item.candidateVerified && item.candidateThumbPath ? (
          <img
            src={deskFileUrl(item.candidateThumbPath, item.candidateSha256)}
            alt={`Candidate for ${item.request.title}`}
            data-testid="art-desk-candidate-preview"
          />
        ) : item.candidateSha256 ? (
          <p data-testid="art-desk-candidate-preview-missing">
            {item.coverage.note}
          </p>
        ) : (
          <p>No candidate is recorded for this request.</p>
        )}
        {item.candidateSha256 ? (
          <p
            className="art-desk-meta"
            data-testid="art-desk-candidate-state"
            data-candidate-bytes={item.candidateBytes}
          >
            Recorded hash {item.candidateSha256.slice(0, 12)}… ·{" "}
            {item.candidateSource ?? "unknown source"} · bytes{" "}
            {item.candidateBytes}
            {item.candidateRaster
              ? ` · ${item.candidateRaster.width}×${item.candidateRaster.height} ${item.candidateRaster.container}`
              : ""}
          </p>
        ) : null}
      </div>
      {sceneId && (
        <div className="art-desk-scene" data-testid="art-desk-scene">
          <SceneBackdrop
            sceneId={sceneId}
            visualLibrary={locationReviewVisuals(true)}
            people={[]}
          >
            <p>
              In-scene plate from the current registry. Disposable preview; no
              save writes.
            </p>
          </SceneBackdrop>
        </div>
      )}
      <div className="art-desk-actions">
        <button
          type="button"
          disabled={Boolean(blocker)}
          title={blocker ?? undefined}
          onClick={() => void onDecide(item, "approve")}
        >
          Approve
        </button>
        <button
          type="button"
          disabled={Boolean(blocker)}
          title={blocker ?? undefined}
          onClick={() => void onDecide(item, "request-revision")}
        >
          Request revision
        </button>
        <button
          type="button"
          disabled={Boolean(blocker)}
          title={blocker ?? undefined}
          onClick={() => void onDecide(item, "reject")}
        >
          Reject
        </button>
        <label>
          Upload image
          <input
            type="file"
            accept="image/png,image/jpeg"
            data-testid="art-desk-upload"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onUpload(item, file);
              event.target.value = "";
            }}
          />
        </label>
        {blocker ? (
          <span className="art-desk-meta" data-testid="art-desk-blocker">
            {blocker}
          </span>
        ) : null}
      </div>
      <details open={showIds} onToggle={onToggleIds}>
        <summary>IDs, measurements and compiled brief</summary>
        <pre data-testid="art-desk-brief">{JSON.stringify(brief, null, 2)}</pre>
      </details>
    </article>
  );
}

declare const __PG_BUILD_IDENTITY__: unknown;
