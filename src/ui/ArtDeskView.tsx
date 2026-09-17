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
  filterDeskItems,
  paginateDeskItems,
  projectArtDesk,
  type ArtDeskItem,
  type ArtDeskLane,
  type ArtDeskReconciliation,
} from "../authoring/art-desk";
import {
  compileAssetBrief,
  privatePackInputState,
} from "../authoring/asset-brief";
import {
  emptyClaimDocument,
  type AssetClaimDocument,
} from "../authoring/asset-claim";
import type { AssetRequestDocument } from "../authoring/asset-request";
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

// Optional private input evidence; absence remains explicit in source-only builds.
const installedModularRegistry = Object.keys(
  import.meta.glob(
    "../../art/manifest/character_candidate_modular45_registry.json",
  ),
)[0];
const installedPrivatePack = installedModularRegistry
  ? { path: installedModularRegistry.replace(/^\.\.\/\.\.\//, "") }
  : null;

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

function deskFileUrl(relativePath: string): string {
  return `/__dev/art-desk/file?path=${encodeURIComponent(relativePath)}`;
}

async function deskGet(relativePath: string): Promise<{
  revision: string;
  json: unknown;
} | null> {
  const response = await fetch(
    `/__dev/art-desk/file?path=${encodeURIComponent(relativePath)}`,
    { headers: { Accept: "application/json" } },
  );
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
  const response = await fetch(
    `/__dev/art-desk/file?path=${encodeURIComponent(relativePath)}`,
    { method: "PUT", headers, body },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    revision?: string;
    message?: string;
  };
  if (!response.ok) {
    return { ok: false, message: payload.message ?? response.statusText };
  }
  return { ok: true, revision: payload.revision ?? "" };
}

function CandidateRaster({
  src,
  alt,
  testId,
  className,
  hideIfMissing = false,
}: {
  readonly src: string;
  readonly alt: string;
  readonly testId: string;
  readonly className?: string;
  readonly hideIfMissing?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (failed) {
    if (hideIfMissing) return null;
    return (
      <span className={className} data-testid={`${testId}-missing`}>
        Candidate hash is recorded. Private bytes are not in this checkout.
      </span>
    );
  }
  return (
    <img
      className={className}
      data-testid={testId}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
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
  const [reviewRevision, setReviewRevision] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewRequestId, setPreviewRequestId] = useState<string | null>(null);
  const [showIds, setShowIds] = useState(false);
  const [sessionCandidates, setSessionCandidates] = useState<
    Record<string, { readonly sha256: string; readonly path: string }>
  >({});

  useEffect(() => {
    if (!privateAuthoring) return;
    void (async () => {
      const liveReviews = await deskGet("art/requests/asset-reviews.json");
      const liveClaims = await deskGet("art/requests/asset-claims.json");
      if (liveReviews) {
        setReviews(liveReviews.json as AssetReviewDocument);
        setReviewRevision(liveReviews.revision);
      }
      if (liveClaims) {
        setClaims(liveClaims.json as AssetClaimDocument);
      }
    })();
  }, [privateAuthoring]);

  const requests = (assetRequestDocument as AssetRequestDocument).requests;
  const desk = useMemo(() => {
    const fromBatch: Record<
      string,
      { readonly sha256: string; readonly path: string }
    > = {};
    for (const record of generationBatch.records) {
      fromBatch[record.requestId] = {
        sha256: record.outputSha256,
        path: record.privatePath,
      };
    }
    return projectArtDesk({
      requests,
      claims: claims.claims ? claims : emptyClaimDocument(),
      reviews: reviews.reviews ? reviews : emptyReviewDocument(),
      now: new Date().toISOString(),
      reconciliation: reconciliationSeed as ArtDeskReconciliation,
      privatePackPath: installedPrivatePack?.path,
      candidateByRequest: { ...fromBatch, ...sessionCandidates },
    });
  }, [requests, claims, reviews, sessionCandidates]);
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
      const hash = item.candidateSha256 ?? "0".repeat(64);
      if (!item.candidateSha256) {
        setMessage(
          "Approve/reject binds exact candidate bytes. Upload or generate a candidate first.",
        );
        return;
      }
      const brief = compileAssetBrief({
        request: item.request,
        stylePixels: [privatePackInputState(installedPrivatePack)],
      });
      const fitContractHash = await sha256Hex(brief.derivativeNote);
      const sceneContractHash = await sha256Hex(
        item.sceneId ?? item.request.requestId,
      );
      const result = recordReview(reviews, {
        requestId: item.request.requestId,
        requestVersion: item.request.requestVersion,
        expectedRequestVersion: item.request.requestVersion,
        outputSha256: hash,
        currentOutputSha256: hash,
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
    [privateAuthoring, reviews, reviewRevision],
  );

  async function onUpload(item: ArtDeskItem, file: File) {
    if (!privateAuthoring) {
      setMessage("Uploads require the identified local authoring server.");
      return;
    }
    const bytes = await file.arrayBuffer();
    const sha = await sha256Hex(bytes);
    const ext =
      file.type.includes("jpeg") || file.name.endsWith(".jpg") ? "jpg" : "png";
    const relative = candidateRelativePath(item.request.requestId, sha, ext);
    const written = await fetch(
      `/__dev/art-desk/file?path=${encodeURIComponent(relative)}`,
      {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: bytes,
      },
    );
    if (!written.ok) {
      const payload = (await written.json().catch(() => ({}))) as {
        message?: string;
      };
      setMessage(payload.message ?? written.statusText);
      return;
    }
    setSessionCandidates((current) => ({
      ...current,
      [item.request.requestId]: { sha256: sha, path: relative },
    }));
    const url = URL.createObjectURL(file);
    setPreviewObjectUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return url;
    });
    setPreviewRequestId(item.request.requestId);
    setMessage(
      `Stored candidate ${sha.slice(0, 12)}… Rights remain unknown until declared. Bytes are private; they are not a public release.`,
    );
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
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
        <p className="art-desk-pack" data-testid="art-desk-pack">
          {desk.privatePack.note}
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
                className={
                  item.candidateThumbPath
                    ? "art-desk-row art-desk-row--with-thumb"
                    : "art-desk-row"
                }
                aria-pressed={
                  selected?.request.requestId === item.request.requestId
                }
                data-testid={`art-desk-row-${item.request.requestId}`}
                onClick={() => setSelectedId(item.request.requestId)}
              >
                {item.candidateThumbPath ? (
                  <CandidateRaster
                    src={deskFileUrl(item.candidateThumbPath)}
                    alt=""
                    className="art-desk-thumb"
                    testId={`art-desk-thumb-${item.request.requestId}`}
                    hideIfMissing
                  />
                ) : null}
                <span className="art-desk-row-copy">
                  <strong>{item.request.title}</strong>
                  <span>{item.request.consumer.playerVisibleUse}</span>
                  <span className="art-desk-meta">
                    {item.lane} ·{" "}
                    {item.generationEligible
                      ? "may generate"
                      : "do not generate"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        {selected && (
          <ArtDeskDetail
            item={selected}
            previewObjectUrl={
              previewRequestId === selected.request.requestId
                ? previewObjectUrl
                : null
            }
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
        <p role="status">{message}</p>
      </footer>
    </div>
  );
}

function ArtDeskDetail({
  item,
  previewObjectUrl,
  showIds,
  onToggleIds,
  onDecide,
  onUpload,
}: {
  readonly item: ArtDeskItem;
  readonly previewObjectUrl: string | null;
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
    stylePixels: [privatePackInputState(installedPrivatePack)],
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
        {previewObjectUrl ? (
          <img src={previewObjectUrl} alt="Uploaded candidate preview" />
        ) : item.candidateThumbPath ? (
          <CandidateRaster
            src={deskFileUrl(item.candidateThumbPath)}
            alt={`Candidate for ${item.request.title}`}
            testId="art-desk-candidate-preview"
          />
        ) : (
          <p>No new candidate loaded in this session.</p>
        )}
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
        <button type="button" onClick={() => void onDecide(item, "approve")}>
          Approve
        </button>
        <button
          type="button"
          onClick={() => void onDecide(item, "request-revision")}
        >
          Request revision
        </button>
        <button type="button" onClick={() => void onDecide(item, "reject")}>
          Reject
        </button>
        <label>
          Upload image
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onUpload(item, file);
            }}
          />
        </label>
      </div>
      <details open={showIds} onToggle={onToggleIds}>
        <summary>IDs, measurements and compiled brief</summary>
        <pre data-testid="art-desk-brief">{JSON.stringify(brief, null, 2)}</pre>
      </details>
    </article>
  );
}

declare const __PG_BUILD_IDENTITY__: unknown;
