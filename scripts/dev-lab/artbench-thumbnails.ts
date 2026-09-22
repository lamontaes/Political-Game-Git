/**
 * ARTBENCH THUMBNAILS — small list images, made once per stored original.
 *
 * The Art Desk list used to draw every row from the full-size original
 * (often 2–6 MB, up to 2352×1760), so opening a tab downloaded and decoded
 * tens of megabytes. A thumbnail is derived from immutable bytes, keyed by
 * their hash, and cached under the store's rebuildable cache/ directory.
 *
 * macOS `sips` does the resampling in its own process, so the dev server's
 * event loop never decodes a large image. At most `limit` run at once.
 */

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

export const THUMBNAIL_EDGE = 320;

export type ThumbnailFormat = "png" | "jpeg";

export type Thumbnailer = (
  source: string,
  destination: string,
  format: ThumbnailFormat,
  edge: number,
) => Promise<void>;

export const sipsThumbnailer: Thumbnailer = (
  source,
  destination,
  format,
  edge,
) =>
  new Promise((resolvePromise, reject) => {
    execFile(
      "/usr/bin/sips",
      [
        "-Z",
        String(edge),
        "-s",
        "format",
        format,
        source,
        "--out",
        destination,
      ],
      { timeout: 30_000 },
      (error) => (error ? reject(error) : resolvePromise()),
    );
  });

export interface Thumbnail {
  readonly file: string;
  readonly contentType: "image/png" | "image/jpeg";
}

export class ThumbnailCache {
  private readonly inflight = new Map<string, Promise<Thumbnail>>();
  private readonly waiting: (() => void)[] = [];
  private active = 0;

  constructor(
    readonly root: string,
    private readonly make: Thumbnailer = sipsThumbnailer,
    private readonly limit = 2,
    private readonly edge = THUMBNAIL_EDGE,
  ) {}

  /** A thumbnail of `source`, whose bytes hash to `sha256`. */
  get(sha256: string, source: string, hasAlpha: boolean): Promise<Thumbnail> {
    if (!/^[a-f0-9]{64}$/.test(sha256))
      return Promise.reject(new Error("A stored hash is required."));
    // Transparent art keeps its alpha; everything else is a small JPEG.
    const format: ThumbnailFormat = hasAlpha ? "png" : "jpeg";
    const thumbnail: Thumbnail = {
      file: join(
        this.root,
        `${sha256}-${this.edge}.${format === "png" ? "png" : "jpg"}`,
      ),
      contentType: format === "png" ? "image/png" : "image/jpeg",
    };
    if (existsSync(thumbnail.file)) return Promise.resolve(thumbnail);
    const known = this.inflight.get(thumbnail.file);
    if (known) return known;
    const made = this.slot(async () => {
      mkdirSync(this.root, { recursive: true });
      const temporary = `${thumbnail.file}.next-${process.pid}-${Date.now()}`;
      try {
        await this.make(source, temporary, format, this.edge);
        renameSync(temporary, thumbnail.file);
      } finally {
        rmSync(temporary, { force: true });
      }
      return thumbnail;
    }).finally(() => this.inflight.delete(thumbnail.file));
    this.inflight.set(thumbnail.file, made);
    return made;
  }

  private async slot<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit)
      await new Promise<void>((resolvePromise) =>
        this.waiting.push(resolvePromise),
      );
    this.active += 1;
    try {
      return await work();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }
}
