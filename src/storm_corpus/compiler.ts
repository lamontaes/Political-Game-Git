/**
 * Deterministic Compiler for NOAA Storm Events Corpus
 *
 * Compiles raw NOAA NCEI disaster records into bit-identical normalized corpus,
 * derived calibration aggregates, and coverage manifests.
 */

import { buildDerivedAggregates } from "./aggregates";
import { buildCoverageManifest } from "./manifest_builder";
import { normalizeStormEpisode, normalizeStormEvent } from "./normalizer";
import type { RawStormEpisodeInput, RawStormEventInput } from "./normalizer";
import type {
  DerivedAggregates,
  StormCorpus,
  StormCoverageManifest,
  StormEpisodeRecord,
  StormEventRecord,
} from "./types";
import { validateStormCorpus } from "./validator";
import type { ValidationResult } from "./validator";

export interface CompileStormCorpusInput {
  readonly rawEvents: readonly RawStormEventInput[];
  readonly rawEpisodes?: readonly RawStormEpisodeInput[];
  readonly vintage?: string;
  readonly generatedAt?: string;
}

export interface CompileStormCorpusOutput {
  readonly corpus: StormCorpus;
  readonly aggregates: DerivedAggregates;
  readonly manifest: StormCoverageManifest;
  readonly validation: ValidationResult;
}

export function compileStormCorpus(
  input: CompileStormCorpusInput,
): CompileStormCorpusOutput {
  const vintage =
    input.vintage ??
    "NOAA NCEI Storm Events Database 1950-2026 (Published Month: 2026-06)";
  const generatedAt = input.generatedAt ?? "2026-08-28T00:00:00.000Z";

  // 1. Normalize all events
  const normalizedEvents: StormEventRecord[] = input.rawEvents.map((raw) =>
    normalizeStormEvent({ ...raw, vintage }),
  );

  // Sort events deterministically
  normalizedEvents.sort((a, b) => {
    if (a.beginDateTime !== b.beginDateTime)
      return a.beginDateTime.localeCompare(b.beginDateTime);
    return a.sourceEventId - b.sourceEventId;
  });

  // Group events by episode ID
  const eventsByEpisode = new Map<number, StormEventRecord[]>();
  for (const event of normalizedEvents) {
    let list = eventsByEpisode.get(event.episodeId);
    if (!list) {
      list = [];
      eventsByEpisode.set(event.episodeId, list);
    }
    list.push(event);
  }

  // 2. Build / Normalize episodes
  const explicitEpisodes = new Map<number, RawStormEpisodeInput>();
  if (input.rawEpisodes) {
    for (const rawEp of input.rawEpisodes) {
      const epId =
        typeof rawEp.episodeId === "number"
          ? rawEp.episodeId
          : parseInt(String(rawEp.episodeId), 10);
      explicitEpisodes.set(epId, rawEp);
    }
  }

  const normalizedEpisodes: StormEpisodeRecord[] = [];
  const allEpisodeIds = Array.from(
    new Set([
      ...Array.from(eventsByEpisode.keys()),
      ...Array.from(explicitEpisodes.keys()),
    ]),
  );

  for (const epId of allEpisodeIds) {
    const linked = eventsByEpisode.get(epId) ?? [];
    const rawEp = explicitEpisodes.get(epId);

    const baseInput: RawStormEpisodeInput = rawEp ?? {
      episodeId: epId,
      state: linked[0]?.state ?? "UNKNOWN",
      stateFips: linked[0]?.stateFips ?? "00",
      beginDateTime: linked[0]?.beginDateTime ?? generatedAt,
      endDateTime: linked.at(-1)?.endDateTime ?? generatedAt,
      wfo: linked[0]?.wfo ?? null,
      narrative: linked[0]?.narratives.episodeNarrative ?? null,
      vintage,
    };

    normalizedEpisodes.push(normalizeStormEpisode(baseInput, linked));
  }

  // Sort episodes deterministically
  normalizedEpisodes.sort((a, b) => {
    if (a.beginDateTime !== b.beginDateTime)
      return a.beginDateTime.localeCompare(b.beginDateTime);
    return a.sourceEpisodeId - b.sourceEpisodeId;
  });

  const corpus: StormCorpus = {
    schemaVersion: "1.0.0",
    generatedAt,
    vintage,
    totalEvents: normalizedEvents.length,
    totalEpisodes: normalizedEpisodes.length,
    events: normalizedEvents,
    episodes: normalizedEpisodes,
  };

  // 3. Build derived aggregates and manifest
  const aggregates = buildDerivedAggregates(corpus);
  const manifest = buildCoverageManifest(corpus);
  const validation = validateStormCorpus(corpus);

  return {
    corpus,
    aggregates,
    manifest,
    validation,
  };
}
