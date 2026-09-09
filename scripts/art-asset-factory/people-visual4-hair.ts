import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as PImage from "pureimage";
// Keep this bounded derivation independent of the legacy PG rig authoring module.
async function readPng(file: string): Promise<PImage.Bitmap> {
  return PImage.decodePNGFromStream(fs.createReadStream(file));
}
async function writePng(file: string, bitmap: PImage.Bitmap): Promise<void> {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const stream = fs.createWriteStream(file);
  const finished = new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  await PImage.encodePNGToStream(bitmap, stream);
  await finished;
}
import { hashArtFile } from "./content-hash";
import type { CharacterComponentManifestRecord } from "../../src/presentation/character-components";

type Point = { x: number; y: number };
type Region = {
  shape: string;
  points?: number[][];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};
type Review = {
  composite_sha256: string;
  source_sha256: string;
  head_sha256: string;
  status: "usable-candidate" | "failed-fit" | "engineering-required";
  observations: string[];
};
type Source = {
  sourceFile: string;
  sourcePath: string;
  sourceSha256: string;
  sourceWidth: number;
  sourceHeight: number;
  reviewIndex: number;
  status: string;
  hairline: Point | null;
  temples: { left: Point; right: Point } | null;
  alphaMaskRegions: Region[];
  backVolume: Region | null;
  pairReviews?: Record<string, Review>;
};
type Head = {
  head_asset_id: string;
  head_family: string;
  source_path: string;
  snapshot_path: string;
  source_sha256: string;
  canvas: { width: number; height: number };
  neck_origin: Point;
  temples: { left: Point; right: Point };
  crown: Point;
  forehead_reference: Point;
  face_core: { x: number; y: number; width: number; height: number };
  inherited_body_families: string[];
  review_index: number;
};
const output = "art/generated/candidates/people-visual4-hair";
const qa = "art/qa/people-visual4-hair";
function clear(w: number, h: number) {
  const b = PImage.make(w, h);
  b.data.fill(0);
  return b;
}
export function contains(region: Region, x: number, y: number): boolean {
  if (region.shape === "rectangle")
    return (
      x >= region.x! &&
      y >= region.y! &&
      x < region.x! + region.width! &&
      y < region.y! + region.height!
    );
  const points = region.points!;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i],
      [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
/** Exact common scale on both axes, area reduction with premultiplied alpha.
 * Ceil dimensions add only partial/transparent edge coverage, never stretch. */
export function uniformReduce(
  source: PImage.Bitmap,
  scale: number,
): PImage.Bitmap {
  if (!(scale > 0 && scale <= 1))
    throw new Error("Uniform reduction refuses enlargement or invalid scale");
  const width = Math.ceil(source.width * scale),
    height = Math.ceil(source.height * scale),
    target = clear(width, height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const x0 = x / scale,
        x1 = (x + 1) / scale,
        y0 = y / scale,
        y1 = (y + 1) / scale;
      const sums = [0, 0, 0, 0];
      for (
        let sy = Math.floor(y0);
        sy < Math.min(source.height, Math.ceil(y1));
        sy++
      ) {
        const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
        for (
          let sx = Math.floor(x0);
          sx < Math.min(source.width, Math.ceil(x1));
          sx++
        ) {
          const weight = wy * (Math.min(x1, sx + 1) - Math.max(x0, sx)),
            at = (sy * source.width + sx) * 4,
            alpha = source.data[at + 3];
          sums[3] += alpha * weight;
          for (let c = 0; c < 3; c++)
            sums[c] += source.data[at + c] * alpha * weight;
        }
      }
      const at = (y * width + x) * 4;
      for (let c = 0; c < 3; c++)
        target.data[at + c] = sums[3] ? Math.round(sums[c] / sums[3]) : 0;
      target.data[at + 3] = Math.round(sums[3] * scale * scale);
    }
  return target;
}
function paste(to: PImage.Bitmap, from: PImage.Bitmap, x: number, y: number) {
  for (let sy = 0; sy < from.height; sy++)
    for (let sx = 0; sx < from.width; sx++) {
      const tx = sx + x,
        ty = sy + y;
      if (tx < 0 || tx >= to.width || ty < 0 || ty >= to.height) continue;
      const a = (sy * from.width + sx) * 4,
        b = (ty * to.width + tx) * 4,
        sa = from.data[a + 3] / 255,
        da = to.data[b + 3] / 255,
        alpha = sa + da * (1 - sa);
      for (let c = 0; c < 3; c++)
        to.data[b + c] = alpha
          ? Math.round(
              (from.data[a + c] * sa + to.data[b + c] * da * (1 - sa)) / alpha,
            )
          : 0;
      to.data[b + 3] = Math.round(alpha * 255);
    }
}
export function placement(
  source: Pick<Source, "temples" | "sourceWidth" | "sourceHeight">,
  head: Pick<Head, "temples" | "canvas" | "neck_origin">,
) {
  if (!source.temples) throw new Error("No frontal aperture");
  const s = source.temples,
    t = head.temples,
    scale = (t.right.x - t.left.x) / (s.right.x - s.left.x);
  if (!(scale > 0 && scale <= 1))
    throw new Error("Source cannot fill target without enlargement");
  const dx = Math.round(
    (t.left.x + t.right.x) / 2 - ((s.left.x + s.right.x) / 2) * scale,
  );
  const dy = Math.round(t.left.y - s.left.y * scale);
  const left = Math.min(0, dx) - 2,
    top = Math.min(0, dy) - 2;
  const width =
    Math.max(head.canvas.width, dx + Math.ceil(source.sourceWidth * scale)) -
    left +
    2;
  const height =
    Math.max(head.canvas.height, dy + Math.ceil(source.sourceHeight * scale)) -
    top +
    2;
  return {
    scale,
    dx,
    dy,
    left,
    top,
    width,
    height,
    origin: {
      x: (head.canvas.width * head.neck_origin.x - left) / width,
      y: (head.canvas.height * head.neck_origin.y - top) / height,
    },
  };
}
export async function deriveHair(root = process.cwd(), check = false) {
  const absolute = (p: string) => path.join(root, p);
  const sourceManifest = "art/manifest/people_visual4_hair_attachments.json",
    headManifest = "art/manifest/people_visual4_head_targets.json";
  const sources = JSON.parse(fs.readFileSync(absolute(sourceManifest), "utf8"))
    .entries as Source[];
  const heads = JSON.parse(fs.readFileSync(absolute(headManifest), "utf8"))
    .heads as Head[];
  const records: CharacterComponentManifestRecord[] = [],
    pairs: Record<string, unknown>[] = [];
  const sheets = Array.from({ length: Math.ceil(sources.length / 8) }, () => {
    const b = clear(1600, 2070);
    for (let p = 0; p < b.data.length; p += 4) {
      b.data[p] = 188;
      b.data[p + 1] = 198;
      b.data[p + 2] = 203;
      b.data[p + 3] = 255;
    }
    return b;
  });
  const sheetCells: Record<string, unknown>[] = [];
  async function emit(file: string, bitmap: PImage.Bitmap) {
    if (check) {
      const prior = await readPng(absolute(file));
      if (
        prior.width !== bitmap.width ||
        prior.height !== bitmap.height ||
        !Buffer.from(prior.data).equals(Buffer.from(bitmap.data))
      )
        throw new Error(`Derived replay differs: ${file}`);
    } else {
      fs.mkdirSync(path.dirname(absolute(file)), { recursive: true });
      await writePng(absolute(file), bitmap);
    }
    return hashArtFile(absolute(file));
  }
  function json(file: string, value: unknown) {
    const bytes = JSON.stringify(value, null, 2) + "\n";
    if (check) {
      if (fs.readFileSync(absolute(file), "utf8") !== bytes)
        throw new Error(`Manifest replay differs: ${file}`);
    } else {
      fs.mkdirSync(path.dirname(absolute(file)), { recursive: true });
      fs.writeFileSync(absolute(file), bytes);
    }
  }
  const headBitmaps = new Map<string, PImage.Bitmap>();
  for (const head of heads) {
    if (hashArtFile(absolute(head.snapshot_path)) !== head.source_sha256)
      throw new Error(`Head source changed: ${head.head_asset_id}`);
    if (
      fs.existsSync(absolute(head.source_path)) &&
      hashArtFile(absolute(head.source_path)) !== head.source_sha256
    )
      throw new Error(`Actual runtime head differs: ${head.head_asset_id}`);
    headBitmaps.set(
      head.head_asset_id,
      await readPng(absolute(head.snapshot_path)),
    );
  }
  for (const source of sources) {
    if (hashArtFile(absolute(source.sourcePath)) !== source.sourceSha256)
      throw new Error(`Hair source changed: ${source.sourceFile}`);
    const image = await readPng(absolute(source.sourcePath));
    if (
      image.width !== source.sourceWidth ||
      image.height !== source.sourceHeight
    )
      throw new Error(`Source dimensions differ: ${source.sourceFile}`);
    if (!source.temples || source.status === "excluded-front-view") {
      pairs.push({
        source: source.sourceFile,
        source_sha256: source.sourceSha256,
        status: "source-view-incompatible",
        reason:
          "Rear-only source has no frontal aperture; no fabricated front pixels.",
      });
      continue;
    }
    const cleaned = clear(image.width, image.height);
    for (let y = 0; y < image.height; y++)
      for (let x = 0; x < image.width; x++) {
        if (source.alphaMaskRegions.some((region) => contains(region, x, y)))
          continue;
        const at = (y * image.width + x) * 4;
        for (let c = 0; c < 4; c++) cleaned.data[at + c] = image.data[at + c];
      }
    for (const head of heads) {
      const p = placement(source, head),
        prefix = `pv4_hair_${String(source.reviewIndex).padStart(2, "0")}_${head.head_asset_id.replace("pv4_ocd_head_adult_", "")}`;
      const frontCanvas = clear(p.width, p.height),
        backCanvas = clear(p.width, p.height);
      // Reduce once, then assign complementary output alpha to layers. Independently
      // filtering cut layers creates a translucent seam where both edge alphas mix.
      const reduced = uniformReduce(cleaned, p.scale);
      for (let y = 0; y < reduced.height; y++)
        for (let x = 0; x < reduced.width; x++) {
          const target =
            source.backVolume &&
            contains(
              source.backVolume,
              (x + 0.5) / p.scale,
              (y + 0.5) / p.scale,
            )
              ? backCanvas
              : frontCanvas;
          const a = (y * reduced.width + x) * 4,
            b = ((y + p.dy - p.top) * p.width + x + p.dx - p.left) * 4;
          for (let c = 0; c < 4; c++) target.data[b + c] = reduced.data[a + c];
        }
      const frontPath = `${output}/${prefix}_front.png`,
        frontHash = await emit(frontPath, frontCanvas);
      const backPath = source.backVolume
          ? `${output}/${prefix}_back.png`
          : null,
        backHash = backPath ? await emit(backPath, backCanvas) : null;
      const composite = clear(p.width, p.height);
      paste(composite, backCanvas, 0, 0);
      paste(composite, headBitmaps.get(head.head_asset_id)!, -p.left, -p.top);
      paste(composite, frontCanvas, 0, 0);
      const compositePath = `${qa}/pairs/${prefix}.png`,
        compositeHash = await emit(compositePath, composite);
      const review = source.pairReviews?.[head.head_asset_id];
      if (
        review &&
        (review.composite_sha256 !== compositeHash ||
          review.source_sha256 !== source.sourceSha256 ||
          review.head_sha256 !== head.source_sha256)
      ) {
        throw new Error(
          `Overlay review is stale for ${prefix}; inspect the changed exact pair before registration`,
        );
      }
      const page = Math.floor((source.reviewIndex - 1) / 8),
        column = (source.reviewIndex - 1) % 8,
        row = head.review_index - 1;
      const previewScale = Math.min(
          1,
          190 / composite.width,
          220 / composite.height,
        ),
        preview =
          previewScale === 1
            ? composite
            : uniformReduce(composite, previewScale);
      paste(
        sheets[page],
        preview,
        column * 200 + Math.floor((200 - preview.width) / 2),
        row * 230 + Math.floor((230 - preview.height) / 2),
      );
      sheetCells.push({
        sheet: page + 1,
        row: row + 1,
        column: column + 1,
        source_index: source.reviewIndex,
        head: head.head_asset_id,
        composite: compositePath,
      });
      // These are observations, never fit acceptance inferred from the authored anchor arithmetic.
      const apertureY = p.dy + source.hairline!.y * p.scale;
      let coreOverlap = 0,
        corePixels = 0;
      for (
        let y = head.face_core.y;
        y < head.face_core.y + head.face_core.height;
        y++
      )
        for (
          let x = head.face_core.x;
          x < head.face_core.x + head.face_core.width;
          x++
        ) {
          corePixels++;
          if (
            frontCanvas.data[((y - p.top) * p.width + x - p.left) * 4 + 3] >=
            128
          )
            coreOverlap++;
        }
      pairs.push({
        pair_id: prefix,
        source: source.sourceFile,
        source_sha256: source.sourceSha256,
        head: head.head_asset_id,
        head_sha256: head.source_sha256,
        transform: p,
        observed_aperture_y: apertureY,
        observed_face_core_front_hair_pixels: coreOverlap,
        face_core_pixels: corePixels,
        source_mapping_authority:
          "game-authored visual estimate; not anatomical measurement",
        inherited_body_families: head.inherited_body_families,
        front: { path: frontPath, sha256: frontHash },
        back: backPath ? { path: backPath, sha256: backHash } : null,
        composite: { path: compositePath, sha256: compositeHash },
        status: review?.status ?? "awaiting-overlay-review",
        observations: review?.observations ?? [
          "Exact-pair overlay has not yet been inspected; no fit pass inferred from authored coordinates.",
        ],
        acceptance:
          "Unapproved candidate; no human visual or rights approval, no production release.",
      });
      if (review?.status !== "usable-candidate") continue;
      for (const kind of source.backVolume
        ? (["hair-back", "hair-front"] as const)
        : (["hair-front"] as const)) {
        const isBack = kind === "hair-back";
        records.push({
          asset_id: `${prefix}_${isBack ? "back" : "front"}`,
          asset_type: "character-component-candidate",
          fixed_or_modular: "modular",
          availability: "production-candidate",
          generation_status: "draft",
          qa_status: "pending",
          runtime_release_status: "unreleased",
          final_path: isBack ? backPath! : frontPath,
          hash: isBack ? backHash! : frontHash,
          candidate_component: {
            kind,
            family: `${prefix.replaceAll("_", "-")}-${isBack ? "back" : "front"}`,
            layer: isBack ? 15 : 50,
            canvas: { width: p.width, height: p.height },
            attaches_to: "head",
            origin: p.origin,
            compatible_head_families: [head.head_family],
            compatible_head_orientations: ["front"],
            ...(!isBack && source.backVolume
              ? { paired_with: `${prefix}_back` }
              : {}),
          },
        });
      }
    }
    console.log(
      `Derived source ${source.reviewIndex}/63 across ${heads.length} heads`,
    );
  }
  for (let i = 0; i < sheets.length; i++)
    await emit(`${qa}/contact-${i + 1}.png`, sheets[i]);
  json(`${qa}/contact-cells.json`, sheetCells);
  json(`${qa}/pair-report.json`, {
    schema: "people-visual4-hair-pairs-v1",
    source_authoring_sha256: hashArtFile(absolute(sourceManifest)),
    head_authoring_sha256: hashArtFile(absolute(headManifest)),
    source_count: sources.length,
    frontal_pair_count: pairs.filter((p) => p.pair_id).length,
    candidate_front_count: records.filter(
      (r) => r.candidate_component?.kind === "hair-front",
    ).length,
    rights_status: "unknown",
    external_upscale_history:
      "unknown; source dimensions are not proof of native generation detail",
    pairs,
  });
  json("art/manifest/character_candidate_visual4_hair_registry.json", {
    schema: "character-candidate-registry-v1",
    release_status: "candidate-only",
    production_pixels_released: false,
    assets: records,
  });
  return {
    sources: sources.length,
    pairs: pairs.filter((p) => p.pair_id).length,
    registered: records.filter(
      (r) => r.candidate_component?.kind === "hair-front",
    ).length,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  console.log(
    await deriveHair(process.cwd(), process.argv.includes("--check")),
  );
