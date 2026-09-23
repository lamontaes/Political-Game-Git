import { preparedSources as sources } from "../presentation/bundled-art";
import { remapRasterMaterial } from "./raster-material";
import type { AppearanceMaterial } from "../simulation/appearance-material";
import {
  PREPARED_FAMILIES,
  ENGINE_PEOPLE29_TEMPLATES,
  type PreparedPart,
  type FeatureKind,
} from "../presentation/engine-people29-data";
import { runtimeArtUrls } from "../presentation/runtime-art";

async function source(path: string) {
  const url = runtimeArtUrls()[path];
  if (url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Prepared artwork unavailable.");
    return response.text();
  }
  const load = sources[`../../${path}`];
  if (!load) throw new Error("Prepared source is unavailable.");
  return load();
}
/**
 * Painted prepared parts (engine-people35) embed their own pixels as PNG data
 * URIs inside `<image>`; that is the only image form accepted. Anything that
 * could reach outside the document (external href, use, script, foreignObject,
 * non-fragment url()) is still refused.
 */
const EMBEDDED_PNG = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
function parse(svg: string): XMLDocument {
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (
    document.querySelector("parsererror,script,foreignObject,use") ||
    document.documentElement.localName !== "svg"
  )
    throw new Error("Unsupported prepared SVG.");
  for (const e of document.querySelectorAll("*"))
    for (const a of [...e.attributes]) {
      if (/^on/i.test(a.name) || /url\((?!#)/.test(a.value))
        throw new Error("External SVG resources are not allowed.");
      if (/href/i.test(a.name)) {
        if (e.localName !== "image" || !EMBEDDED_PNG.test(a.value))
          throw new Error("External SVG resources are not allowed.");
      }
    }
  for (const image of document.querySelectorAll("image"))
    if (!EMBEDDED_PNG.test(image.getAttribute("href") ?? ""))
      throw new Error("Prepared image must embed its pixels.");
  return document;
}
function writeSkinTable(document: XMLDocument, stops: readonly string[]) {
  const channels = [
    ...document.querySelectorAll(
      "feComponentTransfer[data-skin-map] > [data-skin-channel]",
    ),
  ];
  if (channels.length !== 3 || stops.length < 2)
    throw new Error("Incomplete prepared skin map.");
  const rgb = stops.map((stop) => {
    const match = /^#([0-9a-f]{6})$/i.exec(stop);
    if (!match) throw new Error("Invalid skin map stop.");
    const value = Number.parseInt(match[1]!, 16);
    return [value >> 16, (value >> 8) & 255, value & 255];
  });
  for (const element of channels) {
    const index = Number(element.getAttribute("data-skin-channel"));
    if (index !== 0 && index !== 1 && index !== 2)
      throw new Error("Invalid skin map channel.");
    element.setAttribute(
      "tableValues",
      rgb.map((c) => (c[index]! / 255).toFixed(4)).join(" "),
    );
  }
}
const decodedRasters = new Map<string, ImageData>();
const decodingRasters = new Map<string, Promise<ImageData>>();
const DECODED_RASTER_BYTES = 32 * 1024 * 1024;
let decodedRasterBytes = 0;
let rasterDecodeCount = 0;
export function preparedRasterDiagnostics() {
  return {
    decodedBytes: decodedRasterBytes,
    retainedImages: decodedRasters.size,
    pendingImages: decodingRasters.size,
    decodeCount: rasterDecodeCount,
  };
}
async function decodeRaster(uri: string): Promise<ImageData> {
  const cached = decodedRasters.get(uri);
  if (cached) {
    decodedRasters.delete(uri);
    decodedRasters.set(uri, cached);
    return cached;
  }
  const pending = decodingRasters.get(uri);
  if (pending) return pending;
  const task = decodeRasterUncached(uri)
    .then((pixels) => {
      if (pixels.data.byteLength <= DECODED_RASTER_BYTES) {
        while (
          decodedRasterBytes + pixels.data.byteLength >
          DECODED_RASTER_BYTES
        ) {
          const oldest = decodedRasters.keys().next().value!;
          decodedRasterBytes -= decodedRasters.get(oldest)!.data.byteLength;
          decodedRasters.delete(oldest);
        }
        decodedRasters.set(uri, pixels);
        decodedRasterBytes += pixels.data.byteLength;
      }
      return pixels;
    })
    .finally(() => decodingRasters.delete(uri));
  decodingRasters.set(uri, task);
  return task;
}
async function decodeRasterUncached(uri: string): Promise<ImageData> {
  rasterDecodeCount++;
  const image = new Image();
  image.src = uri;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Raster material canvas unavailable.");
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}
async function materializeRaster(
  document: XMLDocument,
  part: PreparedPart,
  material: AppearanceMaterial,
) {
  const paint = document.querySelector("image[data-raster-paint]");
  if (!paint) return false;
  const original = await decodeRaster(paint.getAttribute("href")!);
  let pixels: Uint8ClampedArray = original.data;
  for (const region of part.materials) {
    const ramp = region.ramps.find(
      (r) => r.id === material.palettes[region.channel],
    );
    if (!ramp) throw new Error("Unsupported raster material ramp.");
    // Historical packs explicitly offered an unmapped source-color choice.
    // Preserve that saved choice; every declared recoloring ramp requires stops.
    if (
      !ramp.stops &&
      ramp.id === "source-colour" &&
      (part.introducedGeneration ?? 0) <= 15
    )
      continue;
    if (!ramp.stops) throw new Error("Raster material ramp has no stops.");
    const map = document.querySelector(
      `image[data-material-map="${region.mapId ?? region.channel}"]`,
    );
    if (!map) throw new Error("Missing raster material map.");
    const decoded = await decodeRaster(map.getAttribute("href")!);
    if (decoded.width !== original.width || decoded.height !== original.height)
      throw new Error("Raster material map dimensions differ.");
    pixels = remapRasterMaterial(pixels, decoded.data, ramp.stops);
  }
  const canvas = window.document.createElement("canvas");
  canvas.width = original.width;
  canvas.height = original.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Raster material canvas unavailable.");
  ctx.putImageData(
    new ImageData(
      new Uint8ClampedArray(pixels),
      original.width,
      original.height,
    ),
    0,
    0,
  );
  paint.setAttribute("href", canvas.toDataURL("image/png"));
  for (const map of document.querySelectorAll("image[data-material-map]"))
    map.remove();
  return true;
}
async function materialize(
  document: XMLDocument,
  part: PreparedPart,
  material: AppearanceMaterial,
) {
  const raster = await materializeRaster(document, part, material);
  for (const m of raster ? [] : part.materials) {
    const ramp = m.ramps.find((r) => r.id === material.palettes[m.channel]);
    if (!ramp) throw new Error("Unsupported tone ramp.");
    if (!document.getElementById(m.maskId))
      throw new Error("Missing prepared material mask.");
    // Prepared skin map (MODULAR45): an authored ramp writes the gradient
    // table; the unmapped painting removes the overlay so its pixels are exact.
    // A garment carrying painted skin has the skin map as its second region.
    const overlays = [...document.querySelectorAll("image[data-skin-overlay]")];
    if (m.channel === "skin" && overlays.length) {
      if (!ramp.stops) for (const overlay of overlays) overlay.remove();
      else writeSkinTable(document, ramp.stops);
    } else if (ramp.stops) throw new Error("Part has no prepared skin map.");
    for (const e of document.querySelectorAll("stop[data-tone]")) {
      const tone = e.getAttribute("data-tone") as
        "neutral" | "shadow" | "light";
      if (!ramp[tone]) throw new Error("Unknown tone role.");
      e.setAttribute("stop-color", ramp[tone]);
    }
    for (const [id, tone] of [
      [m.neutralId, "neutral"],
      [m.shadowId, "shadow"],
      [m.lightId, "light"],
    ] as const) {
      const e = document.getElementById(id);
      if (!e) throw new Error("Missing material region.");
      if (!e.getAttribute("fill")?.startsWith("url("))
        e.setAttribute("fill", ramp[tone]);
    }
  }
  if (
    document.querySelector("image[data-skin-overlay]") &&
    !part.materials.some((m) => m.channel === "skin")
  )
    throw new Error("Skin map without a skin region.");
  for (const f of part.features ?? []) {
    const kind = f.id.split("-")[0] as FeatureKind;
    const p = material.features[kind];
    if (!p || p.variant !== part.id)
      throw new Error("Prepared feature mismatch.");
    for (const key of ["x", "y", "scaleX", "scaleY"] as const) {
      const [min, max] = f.parameters[key];
      if (!Number.isFinite(p[key]) || p[key] < min || p[key] > max)
        throw new Error("Unsupported feature range.");
    }
    const group = document.getElementById(f.groupId);
    if (!group) throw new Error("Missing prepared feature group.");
    group.setAttribute(
      "transform",
      `translate(${p.x} ${p.y}) translate(${f.origin.x} ${f.origin.y}) scale(${p.scaleX} ${p.scaleY}) translate(${-f.origin.x} ${-f.origin.y})`,
    );
  }
}
/** Native SVG material operation. Only prepared parts receive authored tone/feature transforms. */
export async function renderPreparedSvg(
  assetId: string,
  material: AppearanceMaterial,
  drawnIds: readonly string[],
  expression: "neutral" | "smile" = "neutral",
): Promise<string> {
  const template = ENGINE_PEOPLE29_TEMPLATES[assetId];
  const family = PREPARED_FAMILIES.find((f) => f.id === material.familyId);
  if (!template || !family || template.familyId !== family.id)
    throw new Error("Prepared family does not match this component.");
  let ids = [...template.partIds];
  const original = family.parts.find((p) => p.id === ids[0])!;
  if (original.kind === "body") {
    const overrides = [
      ...new Set(
        drawnIds.flatMap(
          (id) => family.parts.find((p) => p.id === id)?.anatomyOverride ?? [],
        ),
      ),
    ];
    if (overrides.length > 1)
      throw new Error("Conflicting anatomy correctives.");
    if (overrides[0]) {
      const corrective = family.parts.find((p) => p.id === overrides[0]);
      if (corrective?.kind !== "body-corrective")
        throw new Error("Invalid anatomy corrective.");
      ids = [corrective.id];
    }
  }
  if (original.kind === "head")
    ids = [
      original.id,
      ...Object.values(material.features).map((f) => f.variant),
    ];
  const result = parse(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${family.canvas.width}" height="${family.canvas.height}" viewBox="0 0 ${family.canvas.width} ${family.canvas.height}"/>`,
  );
  for (const id of ids) {
    const p = family.parts.find((p) => p.id === id);
    if (!p) throw new Error("Unknown prepared part.");
    const variant =
      expression === "neutral" ? undefined : p.expressionVariants?.[expression];
    const d = parse(await source(variant?.svgPath ?? p.svgPath));
    await materialize(d, p, material);
    for (const child of [...d.documentElement.children])
      result.documentElement.appendChild(result.importNode(child, true));
  }
  if (
    original.kind === "body" ||
    (original.kind === "head" && original.introducedGeneration !== undefined)
  ) {
    const ns = "http://www.w3.org/2000/svg";
    const defs = result.createElementNS(ns, "defs");
    const mask = result.createElementNS(ns, "mask");
    mask.id = "engine29-clothing-coverage";
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    mask.setAttribute("x", "0");
    mask.setAttribute("y", "0");
    mask.setAttribute("width", String(family.canvas.width));
    mask.setAttribute("height", String(family.canvas.height));
    const white = result.createElementNS(ns, "rect");
    white.setAttribute("width", "100%");
    white.setAttribute("height", "100%");
    white.setAttribute("fill", "white");
    mask.appendChild(white);
    for (const id of drawnIds.flatMap(
      (id) => ENGINE_PEOPLE29_TEMPLATES[id]?.partIds ?? [id],
    )) {
      const p = family.parts.find((p) => p.id === id);
      if (!p?.coverageMaskPath) continue;
      const d = parse(await source(p.coverageMaskPath));
      for (const e of d.querySelectorAll("[fill]"))
        e.setAttribute("fill", "black");
      for (const child of [...d.documentElement.children])
        mask.appendChild(result.importNode(child, true));
    }
    defs.appendChild(mask);
    const group = result.createElementNS(ns, "g");
    group.setAttribute("mask", "url(#engine29-clothing-coverage)");
    for (const child of [...result.documentElement.children])
      if (child.localName !== "defs") group.appendChild(child);
    result.documentElement.append(defs, group);
  }
  return new XMLSerializer().serializeToString(result);
}

/**
 * Who is waiting for a variant. A figure the player is looking at ("high":
 * the creator's preview, a room's people) renders before an option thumbnail
 * ("low"), and both before a choice the player has not made yet ("idle", a
 * neighboring body warmed in advance). Every thumbnail of a face or hair grid
 * changes with the body; without an order the preview appeared only after all
 * of them had rendered.
 */
export type PreparedVariantPriority = "high" | "low" | "idle";
const RANK: Record<PreparedVariantPriority, number> = {
  high: 2,
  low: 1,
  idle: 0,
};
interface Entry {
  key: string;
  refs: number;
  url: Promise<string>;
  touched: number;
  bytes: number;
  ready: boolean;
  /** The most urgent request so far; set before the render starts. */
  priority: PreparedVariantPriority;
  /** Present while the render waits for a slot; removed when it starts. */
  waiting?: { start(): void; withdraw(): void };
}
const cache = new Map<string, Entry>();
let sequence = 0;
/**
 * Rendering is mostly main-thread work (raster remap and PNG encoding), so
 * running every request at once only delays each of them until all finish.
 * A few in flight still overlap fetching and image decoding.
 */
const RENDER_SLOTS = 3;
const renderingAt = [0, 0, 0];
const waitingRenders: Entry[] = [];
let pumpQueued = false;
function pumpRenders() {
  pumpQueued = false;
  while (waitingRenders.length) {
    let best = 0;
    for (let i = 1; i < waitingRenders.length; i++)
      if (
        RANK[waitingRenders[i]!.priority] > RANK[waitingRenders[best]!.priority]
      )
        best = i;
    const rank = RANK[waitingRenders[best]!.priority];
    const running = renderingAt.reduce((sum, n) => sum + n, 0);
    // Less urgent work waits until more urgent work in flight has finished.
    if (
      running >= RENDER_SLOTS ||
      renderingAt.some((n, r) => r > rank && n > 0)
    )
      return;
    const [next] = waitingRenders.splice(best, 1);
    next!.waiting!.start();
  }
}
/** Start after the current commit has enqueued all of its requests, so a
 * preview mounted beside its thumbnails is ordered before them. */
function queuePump() {
  if (pumpQueued) return;
  pumpQueued = true;
  queueMicrotask(pumpRenders);
}
function scheduleRender(
  entry: Entry,
  render: () => Promise<string>,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    entry.waiting = {
      start() {
        entry.waiting = undefined;
        const rank = RANK[entry.priority];
        renderingAt[rank]!++;
        render()
          .then(resolve, reject)
          .finally(() => {
            renderingAt[rank]!--;
            queuePump();
          });
      },
      withdraw() {
        entry.waiting = undefined;
        const index = waitingRenders.indexOf(entry);
        if (index >= 0) waitingRenders.splice(index, 1);
        reject(new Error("Prepared variant request withdrawn."));
      },
    };
    waitingRenders.push(entry);
    queuePump();
  });
}
const IDLE_VARIANT_BYTES = 24 * 1024 * 1024;
const IDLE_VARIANT_COUNT = 24;
function revoke(entry: Entry) {
  void entry.url.then(
    (url) => URL.revokeObjectURL(url),
    () => {},
  );
}
function trimIdleVariants() {
  // Thumbnails and unvisited choices leave first, so returning to a recent
  // choice finds its preview.
  const idle = [...cache.values()]
    .filter((e) => e.refs === 0 && e.ready)
    .sort(
      (a, b) => RANK[a.priority] - RANK[b.priority] || a.touched - b.touched,
    );
  let bytes = idle.reduce((sum, e) => sum + e.bytes, 0);
  while (idle.length > IDLE_VARIANT_COUNT || bytes > IDLE_VARIANT_BYTES) {
    const oldest = idle.shift()!;
    bytes -= oldest.bytes;
    if (cache.get(oldest.key) === oldest) cache.delete(oldest.key);
    revoke(oldest);
  }
}
/** Key the inputs consumed by this layer. A hair color change must not
 * invalidate pants, and a new head must not invalidate the shirt. */
export function preparedVariantKey(
  assetId: string,
  material: AppearanceMaterial,
  drawnIds: readonly string[],
  expression: "neutral" | "smile" = "neutral",
) {
  const template = ENGINE_PEOPLE29_TEMPLATES[assetId];
  const family = PREPARED_FAMILIES.find((f) => f.id === material.familyId);
  if (!template || !family || family.id !== template.familyId)
    return JSON.stringify([
      assetId,
      material,
      [...drawnIds].sort(),
      expression,
    ]);
  const original = family.parts.find((p) => p.id === template.partIds[0]);
  const drawn = drawnIds.flatMap(
    (id) => ENGINE_PEOPLE29_TEMPLATES[id]?.partIds ?? [id],
  );
  const dependencies = family.parts.filter(
    (p) =>
      drawn.includes(p.id) &&
      ((original?.kind === "body" && p.anatomyOverride) ||
        ((original?.kind === "body" || original?.kind === "head") &&
          p.coverageMaskPath)),
  );
  const ids = new Set([
    ...template.partIds,
    ...(original?.kind === "head"
      ? Object.values(material.features).map((f) => f.variant)
      : []),
    ...dependencies.flatMap((p) => p.anatomyOverride ?? []),
  ]);
  const parts = family.parts.filter((p) => ids.has(p.id));
  const channels = [
    ...new Set(parts.flatMap((p) => p.materials.map((m) => m.channel))),
  ].sort();
  return JSON.stringify([
    "prepared-variant-v3",
    assetId,
    template.sourceSha256,
    family.id,
    parts.map((p) => [
      p.id,
      p.sha256,
      p.expressionVariants?.[expression]?.sha256,
    ]),
    channels.map((c) => [c, material.palettes[c]]),
    parts.some((p) => p.features?.length) || original?.kind === "head"
      ? material.features
      : null,
    dependencies.map((p) => [p.id, p.coverageMaskPath, p.anatomyOverride]),
  ]);
}
export function preparedVariantDiagnostics() {
  const idle = [...cache.values()].filter((e) => e.refs === 0);
  return {
    entries: cache.size,
    active: cache.size - idle.length,
    idleBytes: idle.reduce((n, e) => n + e.bytes, 0),
    idleEntries: idle.length,
  };
}
export function acquirePreparedVariant(
  assetId: string,
  material: AppearanceMaterial,
  drawnIds: readonly string[],
  expression: "neutral" | "smile" = "neutral",
  priority: PreparedVariantPriority = "high",
) {
  const key = preparedVariantKey(assetId, material, drawnIds, expression);
  let entry = cache.get(key);
  if (!entry) {
    // Mounted demand is never evicted. Only completed idle entries are bounded.
    const created: Entry = {
      key,
      refs: 0,
      touched: ++sequence,
      bytes: 0,
      ready: false,
      priority,
      url: Promise.resolve(""),
    };
    created.url = scheduleRender(created, () =>
      renderPreparedSvg(assetId, material, drawnIds, expression),
    ).then((svg) => {
      const blob = new Blob([svg], { type: "image/svg+xml" });
      created.bytes = blob.size;
      created.ready = true;
      return URL.createObjectURL(blob);
    });
    entry = created;
    cache.set(key, entry);
    void entry.url.catch(() => {
      if (cache.get(key) === created) cache.delete(key);
    });
  } else if (RANK[priority] > RANK[entry.priority]) entry.priority = priority;
  entry.refs++;
  entry.touched = ++sequence;
  const owned = entry;
  let released = false;
  return {
    key,
    url: entry.url,
    release() {
      if (released) return;
      released = true;
      owned.refs--;
      owned.touched = ++sequence;
      if (owned.refs === 0) {
        if (!owned.ready || cache.get(key) !== owned) {
          if (cache.get(key) === owned) cache.delete(key);
          // Nobody is waiting for a render that has not started: skip it.
          owned.waiting?.withdraw();
          revoke(owned);
        } else trimIdleVariants();
      }
    },
  };
}
export function preparedVariantCacheSize() {
  return cache.size;
}
