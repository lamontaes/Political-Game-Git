import { remapRasterMaterial } from "./raster-material";
import type { AppearanceMaterial } from "../simulation/appearance-material";
import {
  PREPARED_FAMILIES,
  ENGINE_PEOPLE29_TEMPLATES,
  type PreparedPart,
  type FeatureKind,
} from "../presentation/engine-people29-data";
import { optionalGlob } from "../presentation/optional-glob";
const sources = optionalGlob(() =>
  import.meta.glob<string>(
    [
      "../../art/authoring/kit41/families/*/*.svg",
      "../../art/authoring/engine-people29/families/*/*.svg",
      "../../art/authoring/engine-people34/families/*/*.svg",
      "../../art/authoring/engine-people35/families/*/*.svg",
      "../../art/authoring/engine-people36/families/*/*.svg",
      "../../art/authoring/engine-people40/families/*/*.svg",
      "../../art/authoring/engine-people41/families/*/*.svg",
      "../../art/authoring/modular41-head-v2/*.svg",
      "../../art/authoring/modular45/parts/*.svg",
      "../../art/authoring/modular45/pose/*.svg",
      "../../art/authoring/modular47/parts/*.svg",
      "../../art/authoring/modular47/pose/*.svg",
    ],
    { query: "?raw", import: "default" },
  ),
);
async function source(path: string) {
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
async function decodeRaster(uri: string): Promise<ImageData> {
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
    if (!ramp.stops) continue;
    const map = document.querySelector(
      `image[data-material-map="${region.channel}"]`,
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

const MAX_VARIANTS = 64;
interface Entry {
  key: string;
  refs: number;
  url: Promise<string>;
  touched: number;
}
const cache = new Map<string, Entry>();
let sequence = 0;
function revoke(entry: Entry) {
  void entry.url.then(
    (url) => URL.revokeObjectURL(url),
    () => {},
  );
}
export function acquirePreparedVariant(
  assetId: string,
  material: AppearanceMaterial,
  drawnIds: readonly string[],
  expression: "neutral" | "smile" = "neutral",
) {
  const key = JSON.stringify([
    "engine-people29-v2",
    assetId,
    ENGINE_PEOPLE29_TEMPLATES[assetId]?.sourceSha256,
    material,
    expression,
    [...drawnIds].sort(),
  ]);
  let entry = cache.get(key);
  if (!entry) {
    while (cache.size >= MAX_VARIANTS) {
      const idle = [...cache.values()]
        .filter((e) => e.refs === 0)
        .sort((a, b) => a.touched - b.touched)[0];
      if (!idle) throw new Error("Prepared variant cache is full.");
      cache.delete(idle.key);
      revoke(idle);
    }
    entry = {
      key,
      refs: 0,
      touched: ++sequence,
      url: renderPreparedSvg(assetId, material, drawnIds, expression).then(
        (svg) =>
          URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })),
      ),
    };
    cache.set(key, entry);
    void entry.url.catch(() => {
      if (cache.get(key) === entry) cache.delete(key);
    });
  }
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
        cache.delete(key);
        revoke(owned);
      }
    },
  };
}
export function preparedVariantCacheSize() {
  return cache.size;
}
