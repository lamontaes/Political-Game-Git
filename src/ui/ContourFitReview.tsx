import { useEffect, useMemo, useRef, useState } from "react";

import { galleryCandidateUrls } from "../presentation/bundled-art";
import {
  armLengthRatio,
  composeOver,
  fitLayer,
  measureFigure,
  recolorRegion,
  type RgbaRaster,
} from "../presentation/contour-fit";
import {
  contourFitBodies,
  contourFitPacks,
  type ContourFitBody,
  type ContourFitPack,
} from "../presentation/contour-fit-packs";

/**
 * Developer review of the contour-fit engine in the running game.
 *
 * One dressed master's garment layers are fitted, in the browser, onto every
 * Wave A runtime body, with an optional color per layer. Nothing here is in a
 * catalog, a save or the player's appearance; it reads bundled candidate art
 * and draws into canvases on this page only.
 */

async function loadRaster(url: string): Promise<RgbaRaster> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D is unavailable.");
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return { width: pixels.width, height: pixels.height, data: pixels.data };
}

function RasterCanvas({
  raster,
  label,
}: {
  raster: RgbaRaster;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.width = raster.width;
    canvas.height = raster.height;
    const data = new Uint8ClampedArray(raster.data);
    context.putImageData(
      new ImageData(data, raster.width, raster.height),
      0,
      0,
    );
  }, [raster]);
  return (
    <figure className="contour-fit-figure">
      <canvas
        ref={ref}
        aria-label={label}
        style={{ height: 480, width: "auto", background: "#1e1a18" }}
      />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

interface Result {
  readonly body: ContourFitBody;
  readonly bare: RgbaRaster;
  readonly dressed: RgbaRaster;
  readonly milliseconds: number;
}

export function ContourFitReview() {
  const bodies = useMemo(() => contourFitBodies(galleryCandidateUrls), []);
  const packs = useMemo(() => contourFitPacks(galleryCandidateUrls), []);
  const [packId, setPackId] = useState(packs[0]?.id ?? "");
  const [sex, setSex] = useState<"masc" | "fem" | "all">("masc");
  const [colors, setColors] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState("");
  const pack: ContourFitPack | undefined = packs.find((p) => p.id === packId);

  useEffect(() => {
    if (!pack) return;
    let active = true;
    setStatus("Fitting…");
    void (async () => {
      const dressed = await loadRaster(pack.dressedUrl);
      const source = measureFigure(dressed);
      const ratio = armLengthRatio(source) ?? undefined;
      const layers = await Promise.all(
        pack.layers.map(async (layer) => {
          const raster = await loadRaster(layer.url);
          const color = colors[layer.name];
          return color
            ? recolorRegion(
                raster,
                (i) => (raster.data[i * 4 + 3] ?? 0) > 0,
                color,
              )
            : raster;
        }),
      );
      const chosen = bodies.filter((b) => sex === "all" || b.sex === sex);
      const next: Result[] = [];
      for (const body of chosen) {
        const bare = await loadRaster(body.url);
        const started = performance.now();
        const target = measureFigure(bare, { armLengthRatio: ratio });
        const dressedBody = layers.reduce(
          (acc, layer) =>
            composeOver(acc, fitLayer(layer, source, target, { ease: 4 })),
          bare,
        );
        next.push({
          body,
          bare,
          dressed: dressedBody,
          milliseconds: Math.round(performance.now() - started),
        });
      }
      if (active) {
        setResults(next);
        setStatus("");
      }
    })().catch((error: unknown) => {
      if (active) setStatus(`Could not fit: ${String(error)}`);
    });
    return () => {
      active = false;
    };
  }, [pack, bodies, sex, colors]);

  return (
    <section className="contour-fit-review" data-testid="contour-fit-review">
      <h2>Contour fit: one dressed master on every body</h2>
      {packs.length === 0 ? (
        <p data-testid="contour-fit-no-packs">
          No dressed master is installed. Put a folder with{" "}
          <code>dressed.png</code> and one PNG per garment layer (same canvas,
          drawn in file-name order) under{" "}
          <code>art/generated/candidates/art-desk/contour-fit/</code>, which Git
          ignores, then reload.
        </p>
      ) : (
        <div className="contour-fit-controls">
          <label>
            Dressed master{" "}
            <select
              value={packId}
              onChange={(event) => setPackId(event.target.value)}
            >
              {packs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}
                </option>
              ))}
            </select>
          </label>{" "}
          <label>
            Bodies{" "}
            <select
              value={sex}
              onChange={(event) =>
                setSex(event.target.value as "masc" | "fem" | "all")
              }
            >
              <option value="masc">Men</option>
              <option value="fem">Women</option>
              <option value="all">All</option>
            </select>
          </label>
          {pack?.layers.map((layer) => (
            <label key={layer.name}>
              {" "}
              {layer.name}{" "}
              <input
                type="color"
                value={colors[layer.name] ?? "#808080"}
                onChange={(event) =>
                  setColors({ ...colors, [layer.name]: event.target.value })
                }
              />
              {colors[layer.name] && (
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...colors };
                    delete next[layer.name];
                    setColors(next);
                  }}
                >
                  painted color
                </button>
              )}
            </label>
          ))}
        </div>
      )}
      {status && <p>{status}</p>}
      <div
        className="contour-fit-results"
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {results.map((r) => (
          <div key={r.body.id} data-testid="contour-fit-result">
            <RasterCanvas raster={r.bare} label={`${r.body.label}, bare`} />
            <RasterCanvas
              raster={r.dressed}
              label={`${r.body.label}, fitted in ${r.milliseconds} ms`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
