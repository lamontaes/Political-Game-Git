import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { detectRaster } from "./art-desk-inputs";
import {
  sipsThumbnailer,
  ThumbnailCache,
  type Thumbnailer,
} from "./artbench-thumbnails";

const sha = (n: number) => n.toString(16).padStart(64, "0");

function png(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crcInput = Buffer.concat([Buffer.from(type), data]);
    let crc = ~0;
    for (const byte of crcInput) {
      crc ^= byte;
      for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    const crcBytes = Buffer.alloc(4);
    crcBytes.writeUInt32BE(~crc >>> 0);
    return Buffer.concat([length, Buffer.from(type), data, crcBytes]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const rows = Buffer.alloc((width * 3 + 1) * height);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("artbench thumbnails", () => {
  it("makes each thumbnail once, keeps alpha as PNG, and reuses it from disk", async () => {
    const root = mkdtempSync(join(tmpdir(), "artbench-thumbs-"));
    const made: string[] = [];
    const fake: Thumbnailer = async (source, destination, format) => {
      made.push(`${source}:${format}`);
      writeFileSync(destination, `thumb of ${source}`);
    };
    const cache = new ThumbnailCache(root, fake);
    const [first, again] = await Promise.all([
      cache.get(sha(1), "/art/a.png", false),
      cache.get(sha(1), "/art/a.png", false),
    ]);
    expect(first).toEqual(again);
    expect(first.contentType).toBe("image/jpeg");
    expect(readFileSync(first.file, "utf8")).toBe("thumb of /art/a.png");
    const alpha = await cache.get(sha(2), "/art/b.png", true);
    expect(alpha.contentType).toBe("image/png");
    await new ThumbnailCache(root, fake).get(sha(1), "/art/a.png", false);
    expect(made).toEqual(["/art/a.png:jpeg", "/art/b.png:png"]);
  });

  it("runs a bounded number at once and leaves nothing behind on failure", async () => {
    const root = mkdtempSync(join(tmpdir(), "artbench-thumbs-"));
    let active = 0;
    let peak = 0;
    const slow: Thumbnailer = async (source, destination) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      if (source === "/broken") throw new Error("not an image");
      writeFileSync(destination, "ok");
    };
    const cache = new ThumbnailCache(root, slow, 2);
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) =>
        cache.get(sha(10 + i), i === 3 ? "/broken" : `/art/${i}`, false),
      ),
    );
    expect(peak).toBe(2);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(existsSync(join(root, `${sha(13)}-320.jpg`))).toBe(false);
    await expect(cache.get("not-a-hash", "/art/x", false)).rejects.toThrow();
  });

  it.runIf(existsSync("/usr/bin/sips"))(
    "sips shrinks a large original to the thumbnail edge",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "artbench-thumbs-"));
      const source = join(root, "large.png");
      writeFileSync(source, png(1600, 900));
      const thumb = await new ThumbnailCache(
        join(root, "cache"),
        sipsThumbnailer,
      ).get(sha(99), source, false);
      const raster = detectRaster(readFileSync(thumb.file));
      expect(raster?.container).toBe("jpg");
      expect([raster?.width, raster?.height]).toEqual([320, 180]);
    },
  );
});
