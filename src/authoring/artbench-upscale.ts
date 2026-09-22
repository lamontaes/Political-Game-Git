import type { ProjectedCandidate } from "./artbench";

/** Exact-revision finishing requirements are attributed tags in the existing store.
 * A child keeps those tags as history, but does not inherit its parent's request.
 */
export function upscaleRequirement(
  candidate: ProjectedCandidate,
  candidates: Readonly<Record<string, ProjectedCandidate>> = {},
) {
  const tags = candidate.tags;
  if (
    !tags.upscaleFor?.includes(`${candidate.candidateId}:${candidate.sha256}`)
  )
    return null;
  const dimensions = (text?: string) => {
    const match = /^(\d{1,5})x(\d{1,5})$/.exec(text ?? "");
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    return width > 0 && height > 0 ? { width, height } : null;
  };
  const minimum = dimensions(tags.upscaleMinimum?.[0]);
  const output = dimensions(tags.upscaleExport?.[0]);
  if (
    !minimum ||
    !output ||
    output.width < minimum.width ||
    output.height < minimum.height
  )
    return null;
  const use = tags.upscaleUse?.[0];
  if (!use) return null;
  const prompt = `Upscale this exact illustrated image to at least ${output.width} by ${output.height} pixels, preserving its aspect ratio and full composition. Retain the clean drawn outlines, simplified shading, colors and existing architecture and furniture. Keep the illustration style; do not add photographic texture, fabric or surface microdetail, extra objects, people, lettering, symbols or new lighting. Preserve all edges and object positions. No crop, stretching or compositional changes. Return the full-size image as a new PNG revision.`;
  const fulfilledBy =
    Object.values(candidates)
      .filter((child) => {
        if (
          child.qa ||
          child.width < minimum.width ||
          child.height < minimum.height
        )
          return false;
        const visited = new Set<string>();
        let parent = child.parentCandidateId;
        while (parent && !visited.has(parent)) {
          if (parent === candidate.candidateId) return true;
          visited.add(parent);
          parent = candidates[parent]?.parentCandidateId;
        }
        return false;
      })
      .sort((a, b) => b.revision - a.revision)[0] ?? null;
  return { minimum, output, use, prompt, fulfilledBy };
}
