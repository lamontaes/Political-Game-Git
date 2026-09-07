import type { ProseRecord } from "./types";

/**
 * Corpus-wide repetition, measured so a later prose PR can be compared to this
 * baseline rather than argued about.
 *
 * Every number here is deterministic and derived only from the inventory, so
 * two runs on the same tree produce the same metrics and a differential
 * against a later branch means what it looks like it means. Nothing in here is
 * a judgement: a scaffold appearing forty times may be forty correct
 * sentences. The point is that the count is visible before and after.
 */

export interface DuplicateGroup {
  readonly text: string;
  readonly ids: readonly string[];
}

export interface NearDuplicateCluster {
  readonly representative: string;
  readonly ids: readonly string[];
  /** Jaccard similarity of the smallest pair in the cluster, 0..1. */
  readonly similarity: number;
}

export interface NgramCount {
  readonly ngram: string;
  readonly count: number;
  /** How many distinct banks it appears in — cross-family repetition. */
  readonly banks: number;
}

export interface ProseMetrics {
  readonly totalRecords: number;
  readonly distinctTexts: number;
  readonly exactDuplicates: readonly DuplicateGroup[];
  readonly normalizedDuplicates: readonly DuplicateGroup[];
  readonly nearDuplicateClusters: readonly NearDuplicateCluster[];
  readonly frequentNgrams: readonly NgramCount[];
  readonly repeatedOpenings: readonly NgramCount[];
  readonly repeatedEndings: readonly NgramCount[];
  readonly countsBySurface: Readonly<Record<string, number>>;
  readonly countsByBank: Readonly<Record<string, number>>;
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\{[^}]*\}/g, "  ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text: string): readonly string[] {
  return normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 0 && word !== "");
}

function group(
  records: readonly ProseRecord[],
  key: (record: ProseRecord) => string,
): readonly DuplicateGroup[] {
  const map = new Map<string, { text: string; ids: string[] }>();
  for (const record of records) {
    const k = key(record);
    if (k.length === 0) continue;
    const entry = map.get(k);
    if (entry) entry.ids.push(record.id);
    else map.set(k, { text: record.text, ids: [record.id] });
  }
  return [...map.values()]
    .filter((entry) => entry.ids.length > 1)
    .map((entry) => ({ text: entry.text, ids: [...entry.ids].sort() }))
    .sort(
      (left, right) =>
        right.ids.length - left.ids.length ||
        (left.text < right.text ? -1 : left.text > right.text ? 1 : 0),
    );
}

function jaccard(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
): number {
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  const union = left.size + right.size - shared;
  return union === 0 ? 0 : shared / union;
}

/**
 * Near-duplicates, bucketed before comparison.
 *
 * Comparing every pair in a corpus this size is quadratic and slow enough to
 * discourage running the metrics at all, which would defeat the purpose. Two
 * sentences that share no rare word are never near-duplicates, so candidates
 * are bucketed by their rarest words first and only bucket-mates are compared.
 */
function nearDuplicates(
  records: readonly ProseRecord[],
  threshold = 0.72,
): readonly NearDuplicateCluster[] {
  const prepared = records
    .map((record) => ({ record, bag: new Set(words(record.text)) }))
    .filter((entry) => entry.bag.size >= 4);

  const frequency = new Map<string, number>();
  for (const entry of prepared) {
    for (const word of entry.bag) {
      frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }
  }

  const buckets = new Map<string, typeof prepared>();
  for (const entry of prepared) {
    const rarest = [...entry.bag]
      .sort(
        (left, right) =>
          (frequency.get(left) ?? 0) - (frequency.get(right) ?? 0) ||
          (left < right ? -1 : 1),
      )
      .slice(0, 3);
    for (const word of rarest) {
      const bucket = buckets.get(word) ?? [];
      bucket.push(entry);
      buckets.set(word, bucket);
    }
  }

  const pairSeen = new Set<string>();
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = parent.get(id) ?? id;
    while (root !== (parent.get(root) ?? root)) root = parent.get(root) ?? root;
    return root;
  };
  const union = (left: string, right: string): void => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(a < b ? b : a, a < b ? a : b);
  };
  const similarities = new Map<string, number>();

  for (const bucket of buckets.values()) {
    if (bucket.length < 2 || bucket.length > 400) continue;
    for (let i = 0; i < bucket.length; i += 1) {
      for (let j = i + 1; j < bucket.length; j += 1) {
        const left = bucket[i];
        const right = bucket[j];
        if (!left || !right) continue;
        const pairKey =
          left.record.id < right.record.id
            ? `${left.record.id}|${right.record.id}`
            : `${right.record.id}|${left.record.id}`;
        if (pairSeen.has(pairKey)) continue;
        pairSeen.add(pairKey);
        const similarity = jaccard(left.bag, right.bag);
        if (similarity < threshold || similarity >= 1) continue;
        union(left.record.id, right.record.id);
        const root = find(left.record.id);
        const lowest = similarities.get(root);
        similarities.set(
          root,
          lowest === undefined ? similarity : Math.min(lowest, similarity),
        );
      }
    }
  }

  const clusters = new Map<string, string[]>();
  for (const id of parent.keys()) {
    const root = find(id);
    const cluster = clusters.get(root) ?? [];
    cluster.push(id);
    clusters.set(root, cluster);
  }
  for (const [root, members] of clusters) {
    if (!members.includes(root)) members.push(root);
    clusters.set(root, members);
  }

  const byId = new Map(records.map((record) => [record.id, record]));
  return [...clusters.entries()]
    .map(([root, ids]) => ({
      representative: byId.get(root)?.text ?? root,
      ids: [...new Set(ids)].sort(),
      similarity: Number((similarities.get(root) ?? 0).toFixed(3)),
    }))
    .filter((cluster) => cluster.ids.length > 1)
    .sort(
      (left, right) =>
        right.ids.length - left.ids.length ||
        (left.representative < right.representative ? -1 : 1),
    );
}

function ngrams(
  records: readonly ProseRecord[],
  low: number,
  high: number,
  minimum: number,
): readonly NgramCount[] {
  const counts = new Map<string, { count: number; banks: Set<string> }>();
  for (const record of records) {
    const tokens = words(record.text);
    for (let size = low; size <= high; size += 1) {
      for (let start = 0; start + size <= tokens.length; start += 1) {
        const gram = tokens.slice(start, start + size).join(" ");
        const entry = counts.get(gram) ?? {
          count: 0,
          banks: new Set<string>(),
        };
        entry.count += 1;
        entry.banks.add(record.bank);
        counts.set(gram, entry);
      }
    }
  }
  return [...counts.entries()]
    .filter(([, entry]) => entry.count >= minimum)
    .map(([ngram, entry]) => ({
      ngram,
      count: entry.count,
      banks: entry.banks.size,
    }))
    .sort(
      (left, right) =>
        right.count - left.count || (left.ngram < right.ngram ? -1 : 1),
    )
    .slice(0, 200);
}

function edges(
  records: readonly ProseRecord[],
  take: "start" | "end",
  size: number,
  minimum: number,
): readonly NgramCount[] {
  const counts = new Map<string, { count: number; banks: Set<string> }>();
  for (const record of records) {
    const tokens = words(record.text);
    if (tokens.length < size) continue;
    const gram = (
      take === "start" ? tokens.slice(0, size) : tokens.slice(-size)
    ).join(" ");
    const entry = counts.get(gram) ?? { count: 0, banks: new Set<string>() };
    entry.count += 1;
    entry.banks.add(record.bank);
    counts.set(gram, entry);
  }
  return [...counts.entries()]
    .filter(([, entry]) => entry.count >= minimum)
    .map(([ngram, entry]) => ({
      ngram,
      count: entry.count,
      banks: entry.banks.size,
    }))
    .sort(
      (left, right) =>
        right.count - left.count || (left.ngram < right.ngram ? -1 : 1),
    )
    .slice(0, 100);
}

function tally(
  records: readonly ProseRecord[],
  pick: (record: ProseRecord) => string,
): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const record of records) {
    const key = pick(record);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(out).sort(([left], [right]) => (left < right ? -1 : 1)),
  );
}

export function buildProseMetrics(
  records: readonly ProseRecord[],
): ProseMetrics {
  return {
    totalRecords: records.length,
    distinctTexts: new Set(records.map((record) => record.text)).size,
    exactDuplicates: group(records, (record) => record.text),
    normalizedDuplicates: group(records, (record) =>
      normalizeText(record.text),
    ),
    nearDuplicateClusters: nearDuplicates(records),
    frequentNgrams: ngrams(records, 3, 6, 6),
    repeatedOpenings: edges(records, "start", 3, 4),
    repeatedEndings: edges(records, "end", 3, 4),
    countsBySurface: tally(records, (record) => record.surface),
    countsByBank: tally(records, (record) => `${record.domain}/${record.bank}`),
  };
}

/* -------------------------------------------------------------------------- */
/* Differential                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The baseline a later prose PR compares itself against.
 *
 * Deliberately small: the whole inventory is already committed, so a baseline
 * that repeated it would only go stale in a second place. This carries the
 * scalar metrics plus a per-ID text digest, which is all a differential needs
 * to say what changed and by how much.
 */
export interface ProseBaseline {
  readonly digest: string;
  readonly totalRecords: number;
  readonly distinctTexts: number;
  readonly exactDuplicateGroups: number;
  readonly normalizedDuplicateGroups: number;
  readonly nearDuplicateClusters: number;
  readonly warningsByFamily: Readonly<Record<string, number>>;
  readonly reachability: Readonly<Record<string, number>>;
  /** `id` to a short digest of its text, so a differential can name changes. */
  readonly texts: Readonly<Record<string, string>>;
}

export interface ProseDifferential {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly changed: readonly string[];
  readonly metricDeltas: Readonly<Record<string, number>>;
  readonly warningDeltas: Readonly<Record<string, number>>;
}

export function compareToBaseline(
  baseline: ProseBaseline,
  current: ProseBaseline,
): ProseDifferential {
  const before = new Set(Object.keys(baseline.texts));
  const after = new Set(Object.keys(current.texts));
  const added = [...after].filter((id) => !before.has(id)).sort();
  const removed = [...before].filter((id) => !after.has(id)).sort();
  const changed = [...after]
    .filter((id) => before.has(id) && baseline.texts[id] !== current.texts[id])
    .sort();

  const scalarKeys = [
    "totalRecords",
    "distinctTexts",
    "exactDuplicateGroups",
    "normalizedDuplicateGroups",
    "nearDuplicateClusters",
  ] as const;
  const metricDeltas: Record<string, number> = {};
  for (const key of scalarKeys) {
    metricDeltas[key] = current[key] - baseline[key];
  }

  const warningDeltas: Record<string, number> = {};
  const families = new Set([
    ...Object.keys(baseline.warningsByFamily),
    ...Object.keys(current.warningsByFamily),
  ]);
  for (const family of [...families].sort()) {
    warningDeltas[family] =
      (current.warningsByFamily[family] ?? 0) -
      (baseline.warningsByFamily[family] ?? 0);
  }

  return { added, removed, changed, metricDeltas, warningDeltas };
}
