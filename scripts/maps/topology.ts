/**
 * Offline, topology-preserving geometry reduction.
 *
 * Rings from one layer are cut at junctions into arcs; each distinct arc is
 * simplified exactly once with its endpoints fixed, so two districts that
 * share a border still share the same simplified border. Coordinates are then
 * quantized and delta-encoded. Nothing here runs in the browser.
 */

export type Point = readonly [number, number];

export interface SourceFeature {
  readonly id: string;
  /** Projected rings (map units). Outer/hole role is resolved by even-odd fill. */
  readonly rings: readonly (readonly Point[])[];
}

export interface EncodedFeature {
  readonly id: string;
  /** Rings as arc references; a negative reference ~i walks arc i backwards. */
  readonly rings: readonly (readonly number[])[];
  readonly bbox: readonly [number, number, number, number];
  readonly label: readonly [number, number];
  readonly droppedRings: number;
}

export interface LayerTopologyReport {
  readonly featureCount: number;
  readonly arcCount: number;
  readonly sharedArcCount: number;
  readonly borderArcCount: number;
  readonly overusedArcCount: number;
  readonly sourcePointCount: number;
  readonly keptPointCount: number;
  readonly droppedRingCount: number;
}

export interface EncodeOptions {
  /** Visvalingam effective-area threshold, map units squared. */
  readonly minTriangleArea: number;
  /** Rings smaller than this (map units squared) are dropped unless largest. */
  readonly minRingArea: number;
  /** Quantization step in map units. */
  readonly quantum: number;
}

export interface ArcStore {
  readonly arcs: number[][];
}

const keyOf = (point: Point) => `${point[0]},${point[1]}`;

function ringArea(ring: readonly Point[]): number {
  let sum = 0;
  for (
    let index = 0, prev = ring.length - 1;
    index < ring.length;
    prev = index++
  ) {
    const a = ring[prev] as Point;
    const b = ring[index] as Point;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

/** Closed ring without the duplicated closing vertex and without repeats. */
function normalizeRing(ring: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const point of ring) {
    const last = out[out.length - 1];
    if (!last || last[0] !== point[0] || last[1] !== point[1]) out.push(point);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (
    out.length > 1 &&
    first &&
    last &&
    first[0] === last[0] &&
    first[1] === last[1]
  ) {
    out.pop();
  }
  return out;
}

function visvalingamKeep(
  points: readonly Point[],
  threshold: number,
  minInterior: number,
): boolean[] {
  const count = points.length;
  const keep = new Array<boolean>(count).fill(true);
  if (count <= 2) return keep;
  const prev = new Int32Array(count);
  const next = new Int32Array(count);
  const area = new Float64Array(count);
  for (let index = 0; index < count; index += 1) {
    prev[index] = index - 1;
    next[index] = index + 1;
  }
  const triangle = (i: number) => {
    const a = points[prev[i] as number] as Point;
    const b = points[i] as Point;
    const c = points[next[i] as number] as Point;
    return (
      Math.abs((a[0] - c[0]) * (b[1] - a[1]) - (a[0] - b[0]) * (c[1] - a[1])) /
      2
    );
  };
  // Binary heap of interior indices by area.
  const heap: number[] = [];
  const position = new Int32Array(count).fill(-1);
  const less = (x: number, y: number) =>
    (area[x] as number) < (area[y] as number) ||
    ((area[x] as number) === (area[y] as number) && x < y);
  const swap = (i: number, j: number) => {
    const a = heap[i] as number;
    const b = heap[j] as number;
    heap[i] = b;
    heap[j] = a;
    position[b] = i;
    position[a] = j;
  };
  const up = (i: number) => {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!less(heap[i] as number, heap[parent] as number)) break;
      swap(i, parent);
      i = parent;
    }
  };
  const down = (i: number) => {
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let smallest = i;
      if (l < heap.length && less(heap[l] as number, heap[smallest] as number))
        smallest = l;
      if (r < heap.length && less(heap[r] as number, heap[smallest] as number))
        smallest = r;
      if (smallest === i) break;
      swap(i, smallest);
      i = smallest;
    }
  };
  const pop = () => {
    const top = heap[0] as number;
    const last = heap.pop() as number;
    position[top] = -1;
    if (heap.length) {
      heap[0] = last;
      position[last] = 0;
      down(0);
    }
    return top;
  };
  const update = (i: number, value: number) => {
    area[i] = value;
    const at = position[i] as number;
    if (at < 0) return;
    up(at);
    down(position[i] as number);
  };
  for (let index = 1; index < count - 1; index += 1) {
    area[index] = triangle(index);
    position[index] = heap.length;
    heap.push(index);
    up(heap.length - 1);
  }
  let interior = count - 2;
  let floor = 0;
  while (heap.length && interior > minInterior) {
    const top = heap[0] as number;
    const effective = Math.max(area[top] as number, floor);
    if (effective >= threshold) break;
    pop();
    floor = effective;
    keep[top] = false;
    interior -= 1;
    const p = prev[top] as number;
    const n = next[top] as number;
    next[p] = n;
    prev[n] = p;
    if (p > 0) update(p, triangle(p));
    if (n < count - 1) update(n, triangle(n));
  }
  return keep;
}

/**
 * Encode one layer into the shared arc store. Features keep their order.
 */
export function encodeLayer(
  features: readonly SourceFeature[],
  options: EncodeOptions,
  store: ArcStore,
): { features: EncodedFeature[]; report: LayerTopologyReport } {
  const normalized = features.map((feature) => ({
    id: feature.id,
    rings: feature.rings.map(normalizeRing).filter((ring) => ring.length >= 3),
  }));
  // One string key per vertex, computed once.
  const ringKeys = new Map<readonly Point[], string[]>();
  for (const feature of normalized) {
    for (const ring of feature.rings) ringKeys.set(ring, ring.map(keyOf));
  }

  // 1. Junctions: a vertex whose neighbours differ between visits.
  const neighbourKey = new Map<string, string>();
  const junctions = new Set<string>();
  let sourcePointCount = 0;
  for (const feature of normalized) {
    for (const ring of feature.rings) {
      sourcePointCount += ring.length;
      const keys = ringKeys.get(ring) as string[];
      for (let index = 0; index < ring.length; index += 1) {
        const here = keys[index] as string;
        const a = keys[(index - 1 + ring.length) % ring.length] as string;
        const b = keys[(index + 1) % ring.length] as string;
        const pair = a < b ? `${a}|${b}` : `${b}|${a}`;
        const seen = neighbourKey.get(here);
        if (seen === undefined) neighbourKey.set(here, pair);
        else if (seen !== pair) junctions.add(here);
      }
    }
  }

  // 2. Cut rings into arcs; dedupe by canonical coordinate sequence.
  interface RawArc {
    points: Point[];
    minInterior: number;
    uses: number;
  }
  const rawArcs: RawArc[] = [];
  const arcIndex = new Map<string, number>();
  // Arcs between the same junctions are compared by a short signature and
  // then confirmed point-for-point, so long borders never build huge keys.
  const arcSignature = (keys: readonly string[]) =>
    `${keys[0]}|${keys[1]}|${keys[keys.length - 2]}|${keys[keys.length - 1]}|${keys.length}`;
  const arcKeys: string[][] = [];
  const sameSequence = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((key, index) => key === b[index]);
  const featureRings = normalized.map((feature) =>
    feature.rings.map((ring) => {
      const keys = ringKeys.get(ring) as string[];
      let start = keys.findIndex((key) => junctions.has(key));
      const closed = start < 0;
      if (closed) {
        // Rotate an isolated ring to its lexicographically smallest vertex so
        // an identical ring elsewhere produces the same arc.
        start = 0;
        for (let index = 1; index < keys.length; index += 1) {
          if ((keys[index] as string) < (keys[start] as string)) start = index;
        }
      }
      const rotated = [...ring.slice(start), ...ring.slice(0, start)];
      rotated.push(rotated[0] as Point);
      const rotatedKeys = [...keys.slice(start), ...keys.slice(0, start)];
      rotatedKeys.push(rotatedKeys[0] as string);
      const refs: number[] = [];
      let from = 0;
      for (let index = 1; index < rotated.length; index += 1) {
        const atEnd = index === rotated.length - 1;
        if (!atEnd && (closed || !junctions.has(rotatedKeys[index] as string)))
          continue;
        const piece = rotated.slice(from, index + 1);
        const pieceKeys = rotatedKeys.slice(from, index + 1);
        const reversedKeys = [...pieceKeys].reverse();
        const forwardHit = arcIndex.get(arcSignature(pieceKeys));
        const backwardHit = arcIndex.get(arcSignature(reversedKeys));
        let ref: number;
        if (
          forwardHit !== undefined &&
          sameSequence(arcKeys[forwardHit] as string[], pieceKeys)
        ) {
          ref = forwardHit;
        } else if (
          backwardHit !== undefined &&
          sameSequence(arcKeys[backwardHit] as string[], reversedKeys)
        ) {
          ref = ~backwardHit;
        } else {
          ref = rawArcs.length;
          if (forwardHit === undefined)
            arcIndex.set(arcSignature(pieceKeys), ref);
          arcKeys.push(pieceKeys);
          rawArcs.push({ points: piece, minInterior: closed ? 3 : 0, uses: 0 });
        }
        (rawArcs[ref < 0 ? ~ref : ref] as RawArc).uses += 1;
        refs.push(ref);
        from = index;
      }
      return { refs, area: ringArea(ring) };
    }),
  );

  // 3. Simplify each arc once, then guarantee every kept ring stays a polygon.
  const simplified: Point[][] = rawArcs.map((arc) => {
    const keep = visvalingamKeep(
      arc.points,
      options.minTriangleArea,
      arc.minInterior,
    );
    return arc.points.filter((_, i) => keep[i]);
  });
  const resimplify = (index: number) => {
    const arc = rawArcs[index] as RawArc;
    const keep = visvalingamKeep(
      arc.points,
      options.minTriangleArea,
      arc.minInterior,
    );
    simplified[index] = arc.points.filter((_, i) => keep[i]);
  };
  const quantize = (value: number) => Math.round(value / options.quantum);
  const ringPointCount = (refs: readonly number[]) => {
    const unique = new Set<string>();
    for (const ref of refs) {
      for (const point of simplified[ref < 0 ? ~ref : ref] as Point[]) {
        unique.add(`${quantize(point[0])},${quantize(point[1])}`);
      }
    }
    return unique.size;
  };

  let droppedRingCount = 0;
  const keptRings = featureRings.map((rings) => {
    const largest = rings.reduce(
      (best, ring, index) =>
        ring.area > (rings[best]?.area ?? -1) ? index : best,
      0,
    );
    let dropped = 0;
    const kept = rings.filter((ring, index) => {
      if (index === largest) return true;
      if (ring.area < options.minRingArea) {
        dropped += 1;
        return false;
      }
      return true;
    });
    for (const ring of kept) {
      for (
        let attempt = 0;
        attempt < 4 && ringPointCount(ring.refs) < 3;
        attempt += 1
      ) {
        for (const ref of ring.refs) {
          const arc = rawArcs[ref < 0 ? ~ref : ref] as RawArc;
          arc.minInterior = Math.min(
            arc.points.length - 2,
            arc.minInterior + 1,
          );
          resimplify(ref < 0 ? ~ref : ref);
        }
      }
    }
    const survivors = kept.filter((ring, index) => {
      if (ringPointCount(ring.refs) >= 3) return true;
      if (
        ring === rings[largest] &&
        index === kept.indexOf(rings[largest] as never)
      )
        return true;
      dropped += 1;
      return false;
    });
    droppedRingCount += dropped;
    return { rings: survivors, dropped };
  });

  // 4. Emit used arcs into the shared store (quantized, delta-encoded).
  const storeIndex = new Map<number, number>();
  let keptPointCount = 0;
  const emit = (local: number): number => {
    const existing = storeIndex.get(local);
    if (existing !== undefined) return existing;
    const encoded: number[] = [];
    let px = 0;
    let py = 0;
    let lastX: number | null = null;
    let lastY: number | null = null;
    const points = simplified[local] as Point[];
    points.forEach((point, index) => {
      const x = quantize(point[0]);
      const y = quantize(point[1]);
      const isEndpoint = index === 0 || index === points.length - 1;
      if (!isEndpoint && x === lastX && y === lastY) return;
      encoded.push(x - px, y - py);
      px = x;
      py = y;
      lastX = x;
      lastY = y;
    });
    keptPointCount += encoded.length / 2;
    const global = store.arcs.length;
    store.arcs.push(encoded);
    storeIndex.set(local, global);
    return global;
  };

  const encodedFeatures: EncodedFeature[] = normalized.map(
    (feature, featureIndex) => {
      const { rings, dropped } = keptRings[featureIndex] as {
        rings: { refs: number[]; area: number }[];
        dropped: number;
      };
      const encodedRings = rings.map((ring) =>
        ring.refs.map((ref) => (ref < 0 ? ~emit(~ref) : emit(ref))),
      );
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const ring of feature.rings) {
        for (const [x, y] of ring) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      }
      const round = (value: number) =>
        Math.round(value / options.quantum) * options.quantum;
      const precision = (value: number) => Number(round(value).toFixed(6));
      // Labels come from the simplified rings: same interior at display
      // precision, and far cheaper than sampling every source vertex.
      const label = labelPoint(
        rings.map((ring) =>
          ring.refs.flatMap((ref) => {
            const points = simplified[ref < 0 ? ~ref : ref] as Point[];
            return ref < 0 ? [...points].reverse() : points;
          }),
        ),
      );
      return {
        id: feature.id,
        rings: encodedRings,
        bbox: [precision(x0), precision(y0), precision(x1), precision(y1)],
        label: [precision(label[0]), precision(label[1])],
        droppedRings: dropped,
      };
    },
  );

  let sharedArcCount = 0;
  let borderArcCount = 0;
  let overusedArcCount = 0;
  for (const [local] of storeIndex) {
    const uses = (rawArcs[local] as RawArc).uses;
    if (uses === 2) sharedArcCount += 1;
    else if (uses === 1) borderArcCount += 1;
    else overusedArcCount += 1;
  }

  return {
    features: encodedFeatures,
    report: {
      featureCount: features.length,
      arcCount: storeIndex.size,
      sharedArcCount,
      borderArcCount,
      overusedArcCount,
      sourcePointCount,
      keptPointCount,
      droppedRingCount,
    },
  };
}

function pointInRings(
  x: number,
  y: number,
  rings: readonly (readonly Point[])[],
): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i] as Point;
      const [xj, yj] = ring[j] as Point;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
  }
  return inside;
}

function distanceToRings(
  x: number,
  y: number,
  rings: readonly (readonly Point[])[],
): number {
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[j] as Point;
      const [bx, by] = ring[i] as Point;
      const dx = bx - ax;
      const dy = by - ay;
      const length = dx * dx + dy * dy;
      const t = length
        ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length))
        : 0;
      const ex = ax + t * dx - x;
      const ey = ay + t * dy - y;
      best = Math.min(best, ex * ex + ey * ey);
    }
  }
  return Math.sqrt(best);
}

/**
 * Deterministic interior label anchor: the sampled point farthest from any
 * edge inside the largest part (holes respected). Never a membership point.
 */
export function labelPoint(
  rings: readonly (readonly Point[])[],
): [number, number] {
  const largest = rings.reduce<readonly Point[] | null>(
    (best, ring) => (!best || ringArea(ring) > ringArea(best) ? ring : best),
    null,
  );
  if (!largest || largest.length === 0) return [0, 0];
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of largest) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  // Holes are the other rings that sit inside the largest ring's bbox.
  const relevant = rings.filter(
    (ring) =>
      ring === largest ||
      ring.every(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1),
  );
  let best: [number, number] = [(x0 + x1) / 2, (y0 + y1) / 2];
  let bestDistance = -1;
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    for (let j = 0; j <= steps; j += 1) {
      const x = x0 + ((x1 - x0) * (i + 0.5)) / (steps + 1);
      const y = y0 + ((y1 - y0) * (j + 0.5)) / (steps + 1);
      if (!pointInRings(x, y, relevant)) continue;
      const distance = distanceToRings(x, y, relevant);
      if (distance > bestDistance) {
        bestDistance = distance;
        best = [x, y];
      }
    }
  }
  if (bestDistance < 0) {
    const first = largest[0] as Point;
    best = [first[0], first[1]];
  }
  return best;
}
