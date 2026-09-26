/**
 * Finding contour-fit inputs among the art the build already bundles.
 *
 * Bodies: the Wave A runtime standing front bodies (public candidates).
 * Dressed masters: private packs under the ignored Art Desk folder,
 *
 *   art/generated/candidates/art-desk/contour-fit/<pack>/dressed.png
 *   art/generated/candidates/art-desk/contour-fit/<pack>/<n>-<layer>.png
 *
 * `dressed.png` is a painted, dressed figure on a transparent canvas; every
 * other PNG in the folder is one garment layer on that same canvas, drawn in
 * file-name order. A checkout without the private folder finds no packs.
 */

export interface ContourFitBody {
  readonly id: string;
  readonly label: string;
  readonly sex: "masc" | "fem";
  readonly url: string;
}

export interface ContourFitPack {
  readonly id: string;
  readonly dressedUrl: string;
  readonly layers: readonly { readonly name: string; readonly url: string }[];
}

const BODY_PATTERN =
  /wave-a-runtime\/wave_a_(skinny|average|fat|older)_(man|woman)_standing_neutral_front_a_v1_rt960\.png$/;
const PACK_PATTERN = /art-desk\/contour-fit\/([^/]+)\/([^/]+)\.png$/;
const BUILD_ORDER = ["skinny", "average", "fat", "older"];

export function contourFitBodies(
  urls: Readonly<Record<string, string>>,
): ContourFitBody[] {
  const bodies: (ContourFitBody & { order: number })[] = [];
  for (const [key, url] of Object.entries(urls)) {
    const m = BODY_PATTERN.exec(key);
    if (!m?.[1] || !m[2]) continue;
    const build = m[1];
    const sex = m[2] === "man" ? "masc" : "fem";
    bodies.push({
      id: `${build}-${m[2]}`,
      label: `${build === "skinny" ? "lean" : build === "fat" || build === "older" ? "heavy" : "average"} ${m[2]}`,
      sex,
      url,
      order: (sex === "masc" ? 0 : 10) + BUILD_ORDER.indexOf(build),
    });
  }
  return bodies
    .sort((a, b) => a.order - b.order)
    .map(({ id, label, sex, url }) => ({ id, label, sex, url }));
}

export function contourFitPacks(
  urls: Readonly<Record<string, string>>,
): ContourFitPack[] {
  const packs = new Map<
    string,
    { dressedUrl?: string; layers: { name: string; url: string }[] }
  >();
  for (const [key, url] of Object.entries(urls)) {
    const m = PACK_PATTERN.exec(key);
    if (!m?.[1] || !m[2]) continue;
    const pack = packs.get(m[1]) ?? { layers: [] };
    if (m[2] === "dressed") pack.dressedUrl = url;
    else pack.layers.push({ name: m[2], url });
    packs.set(m[1], pack);
  }
  return [...packs.entries()]
    .filter(([, p]) => p.dressedUrl && p.layers.length)
    .map(([id, p]) => ({
      id,
      dressedUrl: p.dressedUrl ?? "",
      layers: [...p.layers].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
