import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { useRasterTier } from "../../../src/player/useRasterTier";
import { createRasterTierLadder } from "../../../src/presentation/raster-tiers";

// A controlled browser Image loader, not a replacement for the paint state
// machine. Load and decode are separately observable and released by tests.
const loads: ControlledImage[] = [];
class ControlledImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  complete = false;
  naturalWidth = 0;
  src = "";
  resolve!: () => void;
  reject!: () => void;
  decoded = new Promise<void>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
  constructor() {
    loads.push(this);
  }
  decode() {
    return this.decoded;
  }
}
Object.defineProperty(window, "Image", { value: ControlledImage });
const widths = [1024, 2048, 3072];
const ladder = createRasterTierLadder(
  "readiness-fixture",
  widths.map((width) => ({
    width,
    height: width / 2,
    path: `${width}.svg`,
    hash: "fixture",
    derivation: "native-master" as const,
  })),
);
const urls = new Map(
  widths.map((width) => [
    width,
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width / 2}"><rect width="100%" height="100%" fill="navy"/></svg>`)}`,
  ]),
);
const unavailable = new Map<number, string>();
const viewport = { width: 1024, height: 512 };
function Harness() {
  const [width, setWidth] = useState(1024);
  const [identity, setIdentity] = useState("A");
  const [missing, setMissing] = useState(false);
  const [revision, setRevision] = useState(0);
  const paint = useRasterTier(
    ladder,
    missing
      ? unavailable
      : new Map([...urls].map(([width, url]) => [width, `${url}#${identity}`])),
    width,
    1,
    viewport,
  );
  Object.assign(window, {
    rasterHarness: {
      request: setWidth,
      identity: setIdentity,
      missing: setMissing,
      rerender: () => setRevision((value) => value + 1),
      loads: () =>
        loads.map((load) => ({
          src: load.src,
          complete: load.complete,
          naturalWidth: load.naturalWidth,
        })),
      load: (index: number) => {
        const image = loads[index]!;
        image.complete = true;
        image.naturalWidth = 1024;
        image.onload?.();
      },
      decode: (index: number) => loads[index]!.resolve(),
      fail: (index: number) => {
        loads[index]!.onerror?.();
      },
      reject: (index: number) => loads[index]!.reject(),
    },
  });
  return createElement(
    "div",
    {
      "data-testid": "harness",
      "data-painted": paint.paintedWidth ?? "",
      "data-pending": String(paint.swapPending),
      "data-revision": revision,
    },
    paint.paintedUrl
      ? createElement("img", {
          src: paint.paintedUrl,
          "data-testid": "harness-image",
        })
      : null,
  );
}
createRoot(document.getElementById("root")!).render(createElement(Harness));
