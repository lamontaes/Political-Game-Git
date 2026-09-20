/** Lazy browser loading through the named one-way historical survey adapter. */
import {
  CPS_STATE_NAMES,
  projectStateVotingContext,
} from "../source/adapters/state-voting-context";
import type {
  StateVotingContext,
  StateVotingManifest,
  StateVotingShard,
} from "../source/adapters/state-voting-context";
export {
  CPS_STATE_NAMES,
  projectStateVotingContext,
} from "../source/adapters/state-voting-context";
export type {
  StateVotingContext,
  StateVotingManifest,
  StateVotingShard,
  StateVotingSource,
  CpsVotingRecord,
  CpsVotingCell,
  CpsMetricKey,
} from "../source/adapters/state-voting-context";

export async function queryStateVotingContext(
  selection: { readonly stateUsps: string; readonly asOf: string },
  options: {
    readonly baseUrl?: string;
    readonly fetchJson?: (url: string) => Promise<unknown>;
  } = {},
): Promise<StateVotingContext> {
  const missing = () =>
    projectStateVotingContext(selection.stateUsps, selection.asOf, []);
  if (!CPS_STATE_NAMES[selection.stateUsps] || selection.asOf < "2025-04-30")
    return missing();
  const load =
    options.fetchJson ??
    (async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Survey lookup failed");
      return response.json() as Promise<unknown>;
    });
  const base = (options.baseUrl ?? "/data/state-voting/v1").replace(/\/$/, "");
  try {
    const manifest = (await load(
      `${base}/manifest.json`,
    )) as StateVotingManifest;
    if (
      manifest.schemaVersion !== "1" ||
      manifest.inputClass !== "production" ||
      manifest.releaseDate !== "2025-04-30" ||
      !/^[a-f0-9]{64}$/.test(manifest.corpusSha256) ||
      !Array.isArray(manifest.sources) ||
      manifest.sources.length < 5 ||
      manifest.sources.some(
        (s) => !/^[a-f0-9]{64}$/.test(s.sha256) || !/^https:\/\//.test(s.url),
      )
    )
      return missing();
    const path = manifest.states[selection.stateUsps];
    if (path !== `${selection.stateUsps}.json`) return missing();
    const shard = (await load(`${base}/${path}`)) as StateVotingShard;
    if (
      shard.schemaVersion !== "1" ||
      shard.stateUsps !== selection.stateUsps ||
      shard.stateName !== CPS_STATE_NAMES[selection.stateUsps] ||
      !Array.isArray(shard.records)
    )
      return missing();
    return projectStateVotingContext(
      selection.stateUsps,
      selection.asOf,
      shard.records,
      manifest.sources,
    );
  } catch {
    return missing();
  }
}
