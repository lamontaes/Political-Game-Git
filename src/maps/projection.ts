/**
 * Composite U.S. projection used by the offline geometry compiler and by the
 * runtime for any longitude/latitude pin.
 *
 * Conterminous states use an Albers equal-area conic. Alaska and Hawaii are
 * deliberately drawn as insets with their own conics. They are NOT at true
 * position or relative scale; the map legend says so. The inset is chosen by
 * the state FIPS code the caller supplies, never by guessing from a point.
 *
 * Parameters follow the widely published "Albers USA" composite so the canvas
 * is 960 x 600 map units.
 */

export const MAP_CANVAS = { width: 960, height: 600 } as const;

export type ProjectionRegion = "conterminous" | "alaska" | "hawaii";

interface ConicParameters {
  readonly rotate: number;
  readonly center: readonly [number, number];
  readonly parallels: readonly [number, number];
  readonly scale: number;
  readonly translate: readonly [number, number];
}

const BASE_SCALE = 1070;
const [TX, TY] = [480, 250];
const RADIANS = Math.PI / 180;

const REGION_PARAMETERS: Readonly<Record<ProjectionRegion, ConicParameters>> = {
  conterminous: {
    rotate: 96,
    center: [-0.6, 38.7],
    parallels: [29.5, 45.5],
    scale: BASE_SCALE,
    translate: [TX, TY],
  },
  alaska: {
    rotate: 154,
    center: [-2, 58.5],
    parallels: [55, 65],
    scale: BASE_SCALE * 0.35,
    translate: [TX - 0.307 * BASE_SCALE, TY + 0.201 * BASE_SCALE],
  },
  hawaii: {
    rotate: 157,
    center: [-3, 19.9],
    parallels: [8, 18],
    scale: BASE_SCALE,
    translate: [TX - 0.205 * BASE_SCALE, TY + 0.212 * BASE_SCALE],
  },
};

/** Areas that the national canvas deliberately does not draw. */
export const NOT_DRAWN_STATE_FIPS: Readonly<Record<string, string>> = {
  "60": "American Samoa",
  "66": "Guam",
  "69": "Northern Mariana Islands",
  "72": "Puerto Rico",
  "78": "U.S. Virgin Islands",
};

export function projectionRegionForStateFips(
  stateFips: string,
): ProjectionRegion | null {
  if (stateFips in NOT_DRAWN_STATE_FIPS) return null;
  if (stateFips === "02") return "alaska";
  if (stateFips === "15") return "hawaii";
  return "conterminous";
}

type Projector = (lon: number, lat: number) => readonly [number, number];

function conicEqualArea(parameters: ConicParameters): Projector {
  const [phi0, phi1] = parameters.parallels.map((value) => value * RADIANS) as [
    number,
    number,
  ];
  const sy0 = Math.sin(phi0);
  const n = (sy0 + Math.sin(phi1)) / 2;
  const c = 1 + sy0 * (2 * n - sy0);
  const r0 = Math.sqrt(c) / n;
  const raw = (lambda: number, phi: number): [number, number] => {
    const r = Math.sqrt(c - 2 * n * Math.sin(phi)) / n;
    return [r * Math.sin(lambda * n), r0 - r * Math.cos(lambda * n)];
  };
  const rotated = (lon: number) => {
    let value = lon + parameters.rotate;
    value = ((((value + 180) % 360) + 360) % 360) - 180;
    return value * RADIANS;
  };
  const [cx, cy] = raw(
    rotated(parameters.center[0] - parameters.rotate),
    parameters.center[1] * RADIANS,
  );
  const { scale, translate } = parameters;
  return (lon, lat) => {
    const [x, y] = raw(rotated(lon), lat * RADIANS);
    return [translate[0] + scale * (x - cx), translate[1] - scale * (y - cy)];
  };
}

const PROJECTORS: Readonly<Record<ProjectionRegion, Projector>> = {
  conterminous: conicEqualArea(REGION_PARAMETERS.conterminous),
  alaska: conicEqualArea(REGION_PARAMETERS.alaska),
  hawaii: conicEqualArea(REGION_PARAMETERS.hawaii),
};

export function projectLonLat(
  region: ProjectionRegion,
  lon: number,
  lat: number,
): readonly [number, number] {
  return PROJECTORS[region](lon, lat);
}
