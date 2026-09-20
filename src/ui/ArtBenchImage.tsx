import { useEffect, useState } from "react";
import type { ProjectedCandidate } from "../authoring/artbench";

type Subject = Pick<ProjectedCandidate, "candidateId" | "sha256" | "revision">;
declare global {
  interface Window {
    ocdArtBench?: {
      prepare: (
        subject: Subject,
      ) => Promise<{ ready: boolean; sha256: string }>;
      startDrag: (subject: Subject) => void;
      revealDownload: () => Promise<{ ok: boolean }>;
      viewState: () => Promise<{
        candidateId?: string;
        cardKey?: string;
        requestId?: string;
        tab?: string;
      } | null>;
      rememberView: (value: {
        candidateId: string | null;
        cardKey: string | null;
        requestId: string | null;
        tab: string;
      }) => void;
    };
  }
}

/** The displayed subject owns preparation and the drag, even during a late fetch. */
export function ArtBenchImage({
  candidate,
  alt,
  testId,
  className,
}: {
  candidate: Subject;
  alt: string;
  testId?: string;
  className?: string;
}) {
  const { candidateId, sha256, revision } = candidate;
  const [prepared, setPrepared] = useState<string | null>(null);
  const [failure, setFailure] = useState("");
  const key = `${candidateId}:${revision}:${sha256}`;
  useEffect(() => {
    let active = true;
    setFailure("");
    if (window.ocdArtBench) {
      void window.ocdArtBench
        .prepare({ candidateId, sha256, revision })
        .then((result) => {
          if (active && result.ready && result.sha256 === sha256)
            setPrepared(key);
        })
        .catch((error: unknown) => {
          if (active) setFailure(String(error));
        });
    }
    return () => {
      active = false;
    };
  }, [candidateId, sha256, revision, key]);
  const ready = window.ocdArtBench ? prepared === key : false;
  return (
    <>
      <img
        src={`/__dev/artbench/original?candidateId=${encodeURIComponent(candidateId)}&sha256=${sha256}&revision=${revision}`}
        alt={alt}
        data-testid={testId}
        className={className}
        draggable={ready}
        data-native-drag={ready ? "ready" : "unavailable"}
        onDragStart={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (ready)
            window.ocdArtBench?.startDrag({ candidateId, sha256, revision });
        }}
      />
      <span className="art-desk-meta" role="status">
        {ready
          ? "Drag this full-size image into your editor."
          : failure
            ? "Drag unavailable. Download this revision below."
            : window.ocdArtBench
              ? "Preparing full-size file…"
              : "Download the full-size revision to use it outside this browser."}
      </span>
    </>
  );
}
