/** Presentation preferences only; no simulation state or time. */
export interface WorkspaceLayout {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function readWorkspaceLayouts(
  value: unknown,
): Readonly<Record<string, WorkspaceLayout>> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, item]) =>
        key.length < 100 &&
        item &&
        typeof item === "object" &&
        [item.x, item.y, item.width, item.height].every(Number.isFinite) &&
        item.width > 0 &&
        item.height > 0,
    ),
  );
}

export function clampWorkspace(
  layout: WorkspaceLayout,
  width: number,
  height: number,
): WorkspaceLayout {
  const w = Math.min(Math.max(360, layout.width), Math.max(240, width - 24));
  const h = Math.min(Math.max(260, layout.height), Math.max(180, height - 24));
  return {
    width: w,
    height: h,
    x: Math.max(12, Math.min(layout.x, width - w - 12)),
    y: Math.max(12, Math.min(layout.y, height - h - 12)),
  };
}
