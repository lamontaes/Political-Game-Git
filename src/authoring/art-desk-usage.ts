import type { ArtbenchProjection, ProjectedCandidate } from "./artbench";

export interface SelectedArtBuild {
  readonly revision: string;
  readonly clientTreeSha256: string;
  readonly packId: string | null;
  readonly packManifestSha256: string | null;
  readonly bindings?: readonly BuildArtBinding[];
}

export interface BuildArtBinding {
  readonly assetId: string;
  readonly sourceSha256: string;
  readonly derivativeSha256: string;
  readonly derivativePath?: string;
  readonly useLabels: readonly string[];
  readonly eligible: readonly string[];
}

export interface ArtUsage {
  readonly state: "used" | "unused" | "unknown";
  readonly labels: readonly string[];
  readonly eligible: readonly string[];
  readonly receipts: readonly Readonly<Record<string, string>>[];
}

/** Approval, historic installation and descriptive tags cannot assert current use. */
export function candidateUsage(
  projection: ArtbenchProjection,
  candidate: ProjectedCandidate,
  selected: SelectedArtBuild | null,
): ArtUsage {
  const request = projection.requests[candidate.requestId]?.request;
  const compatibility = request?.compatibility;
  const eligible = compatibility
    ? [
        ...compatibility.allowedReuseRegions,
        ...compatibility.seasons,
        compatibility.environmentClass,
      ].map((label) => label.replace(/-/g, " "))
    : [];
  const receipts = projection.integrationQueue
    .filter(
      (item) =>
        !item.qa &&
        item.candidateId === candidate.candidateId &&
        item.sha256 === candidate.sha256,
    )
    .flatMap((item) =>
      item.receipts
        .filter((received) => received.state === "installed")
        .map((received) => received.receipt),
    );
  const bindings =
    selected?.bindings?.filter(
      (binding) =>
        binding.sourceSha256 === candidate.sha256 &&
        /^[a-f0-9]{64}$/.test(binding.derivativeSha256) &&
        binding.assetId &&
        binding.useLabels.length > 0,
    ) ?? [];
  return {
    state: bindings.length ? "used" : selected?.bindings ? "unused" : "unknown",
    labels: [...new Set(bindings.flatMap((binding) => binding.useLabels))],
    eligible: [
      ...new Set([
        ...bindings.flatMap((binding) => binding.eligible),
        ...eligible,
      ]),
    ],
    receipts,
  };
}
