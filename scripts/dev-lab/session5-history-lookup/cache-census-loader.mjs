// Diagnostic-only loader: append a read-only closure to the compiled index.
// It never updates a cache, source array or canonical record.
export async function load(url, context, nextLoad) {
  const loaded = await nextLoad(url, context);
  if (!url.split("?")[0].endsWith("/src/simulation/history-index.ts"))
    return loaded;
  const census = `
globalThis[Symbol.for("session5.cacheCensus")] = function(history) {
  const current = new Set(Object.values(history).filter(Array.isArray));
  const seenArrays = new Set();
  const seenIndexes = new Set();
  const counters = { currentSourceArrays: 0, priorSourceArrays: 0,
    currentSourceSlots: 0, priorSourceSlots: 0, indexEntries: 0,
    groupArrays: 0, groupSlots: 0 };
  const entries = [];
  function index(value) {
    if (!value || seenIndexes.has(value)) return;
    seenIndexes.add(value);
    if (value instanceof Map) {
      counters.indexEntries += value.size;
      for (const group of value.values()) {
        if (Array.isArray(group)) {
          counters.groupArrays++;
          counters.groupSlots += group.length;
        } else if (group instanceof Map || group instanceof Set) index(group);
      }
    } else if (value instanceof Set) counters.indexEntries += value.size;
  }
  function slot(name, cache, recent) {
    let priorArrays = 0, priorSlots = 0, currentArrays = 0, currentSlots = 0;
    for (const records of new Set(recent)) {
      const isCurrent = current.has(records);
      if (isCurrent) { currentArrays++; currentSlots += records.length; }
      else { priorArrays++; priorSlots += records.length; }
      if (!seenArrays.has(records)) {
        seenArrays.add(records);
        counters[isCurrent ? "currentSourceArrays" : "priorSourceArrays"]++;
        counters[isCurrent ? "currentSourceSlots" : "priorSourceSlots"] += records.length;
      }
      index(cache.get(records));
    }
    // A currently reachable weak-key index may have left the recent list.
    for (const records of current) index(cache.get(records));
    entries.push({ name, currentArrays, currentSlots, priorArrays, priorSlots });
  }
  slot("recordsByStringField", RECORDS_BY_STRING_FIELD, RECENT_BY_STRING_FIELD);
  for (const [name, value] of KEYED_INDEXES) slot("key:" + name, value.cache, value.recent);
  for (const [name, value] of GROUPED_BY_FIELD) slot("field:" + name, value.cache, value.recent);
  for (const [name, kind] of [["stableKeys", STABLE_KEYS], ["firstStableKey", FIRST_RECORD_BY_STABLE_KEY], ["firstId", FIRST_RECORD_BY_ID]]) {
    const value = GROWING_STATES.get(kind);
    if (value) slot(name, value.byList, value.recent);
  }
  return { counters, entries, limitation: "Exact counts of visible current/recent references and grouping slots; no byte-size estimate, weak-key enumeration, reference dominators or baseline-relative heap proof. Source arrays deduplicated across slots; slots can share canonical rows." };
};`;
  return { ...loaded, source: String(loaded.source) + census };
}
