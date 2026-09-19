/** Pure view-box and history-step helpers for the political map. */

import { MAP_CANVAS } from "./projection";

export interface ViewBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const ASPECT = MAP_CANVAS.width / MAP_CANVAS.height;
const MIN_WIDTH = 0.4;
const MAX_WIDTH = MAP_CANVAS.width * 1.5;

export const HOME_VIEW: ViewBox = {
  x: 0,
  y: 0,
  w: MAP_CANVAS.width,
  h: MAP_CANVAS.height,
};

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

/** A view that fits a bounding box with a margin, keeping the canvas aspect. */
export function fitViewBox(
  bbox: readonly [number, number, number, number],
  margin = 0.08,
): ViewBox {
  const [x0, y0, x1, y1] = bbox;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let w = (x1 - x0) * (1 + margin * 2);
  let h = (y1 - y0) * (1 + margin * 2);
  if (w / h < ASPECT) w = h * ASPECT;
  else h = w / ASPECT;
  w = clampWidth(w);
  h = w / ASPECT;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Zoom by `factor` (>1 zooms in) around a fractional anchor of the view. */
export function zoomViewBox(
  view: ViewBox,
  factor: number,
  fx = 0.5,
  fy = 0.5,
): ViewBox {
  const w = clampWidth(view.w / factor);
  const h = w / ASPECT;
  const ax = view.x + view.w * fx;
  const ay = view.y + view.h * fy;
  return { x: ax - w * fx, y: ay - h * fy, w, h };
}

export function panViewBox(view: ViewBox, dx: number, dy: number): ViewBox {
  const limitX = MAP_CANVAS.width;
  const limitY = MAP_CANVAS.height;
  const x = Math.min(
    limitX - view.w * 0.2,
    Math.max(-view.w * 0.8, view.x + dx),
  );
  const y = Math.min(
    limitY - view.h * 0.2,
    Math.max(-view.h * 0.8, view.y + dy),
  );
  return { ...view, x, y };
}

const DAY_MS = 86_400_000;

function utc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

export function dayCount(from: string, to: string): number {
  return Math.max(0, Math.round((utc(to) - utc(from)) / DAY_MS));
}

export function stepForDate(from: string, date: string): number {
  return dayCount(from, date);
}

export function dateAtStep(from: string, step: number): string {
  return new Date(utc(from) + step * DAY_MS).toISOString().slice(0, 10);
}
