import type { StopgapBanner } from "./tripwires";

/** Developer-only evidence. A core must never import a LifeFile. */
export interface Citation {
  id: string;
  url: string;
  title: string;
  publisher: string;
  location: string;
  kind: string;
  accessed: string;
}

export interface Sourced<T> {
  value: T;
  sourceRefs: string[];
}
export interface PlaceInput {
  key: string;
  name: string;
  stateCode: string;
  country: string;
}
export interface DateWindow {
  earliest: string;
  latest: string;
  precision: string;
  sourceRefs: string[];
}
export type DataValue =
  string | boolean | { [key: string]: DataValue } | DataValue[];

export interface WorldInput {
  id: string;
  fromDate: string;
  throughDate: string;
  kind: string;
  scope: { country: string; stateCode?: string; placeKey?: string };
  value: DataValue;
  sourceRefs: string[];
}

export interface LifeStep {
  id: string;
  date: DateWindow;
  kind: "event" | "decision" | "outcome";
  mechanism: string;
  payload: Record<string, DataValue>;
  sourceRefs: string[];
  requires: string[];
  checks: { metric: string; equals: DataValue }[];
  ranges: {
    metric: string;
    minimumParameter?: string;
    maximumParameter?: string;
  }[];
}

export interface LifeFile {
  version: string;
  id: string;
  cohort: string;
  identity: Sourced<{ name: string }>;
  birth: Sourced<{ date: string; place: PlaceInput }>;
  family: Sourced<Record<string, DataValue>>[];
  household: Sourced<Record<string, DataValue>>;
  checkpoints: {
    id: string;
    date: string;
    sourceRefs: string[];
    knownState: Record<string, DataValue>;
  }[];
  conditions: WorldInput[];
  timeline: LifeStep[];
  sources: Citation[];
  unknowns: { field: string; reason: string; checkedSources: string[] }[];
}

export interface CoreSetup {
  seed: string;
  controller: "god" | "free";
  startDate: string;
  subject: { name: string; birthDate: string; birthPlace: PlaceInput };
  family: Sourced<Record<string, DataValue>>[];
  household: Sourced<Record<string, DataValue>>;
  /** Only state documented before the selected checkpoint, never future outcomes. */
  past: CorePastFact[];
  knownState: Record<string, DataValue>;
  stopgapSink: (banner: StopgapBanner) => void;
}

/** Past facts establish the checkpoint. Expectations never cross this boundary. */
export type CorePastFact = Pick<
  LifeStep,
  "date" | "kind" | "mechanism" | "payload" | "sourceRefs"
>;

export interface Gap {
  code: string;
  detail: string;
  evidence: string[];
}

export interface CoreObservation {
  metric: string;
  value: DataValue | number;
  date: string;
  origin: "initialized" | "forced" | "engine";
  recordIds: string[];
}

export interface CoreDecision {
  id: string;
  actorId: string;
  actorKey: string;
  mechanism: string;
  choices: {
    key: string;
    intent: Record<string, DataValue>;
    enabled: boolean;
    blockers: string[];
  }[];
}

export interface CoreReceipt {
  gaps: Gap[];
  observations: CoreObservation[];
  recordIds: string[];
}

export interface AdvanceReceipt extends CoreReceipt {
  throughDate: string;
  simulatedDays: number;
  complete: boolean;
}

export interface CoreMetadata {
  apiVersion: string;
  id: string;
  revision: string;
  execution: "continuous" | "bounded-projection";
}

/** P8 plugs in through this boundary. The core sees no expected values or life IDs.
 * Actions, inputs, and observation metrics are open data keys, not a closed content list.
 * Resolving a forced choice controls that choice only; it must run ordinary consequences.
 */
export interface ReplayCore {
  metadata: CoreMetadata;
  initialize(setup: CoreSetup): CoreReceipt;
  input(input: WorldInput): CoreReceipt;
  advance(throughDate: string, remainingDays: number): AdvanceReceipt;
  decisions(): CoreDecision[];
  resolve(decisionId: string, choiceKey: string): CoreReceipt;
  observe(): CoreObservation[];
  /** Events are external factual inputs, never documented outcomes inserted as successes. */
  event(input: CorePastFact): CoreReceipt;
  capability(mechanism: string): {
    representation: "full" | "records-only" | "missing";
    gaps: Gap[];
  };
}

export interface StepReceipt {
  stepId: string;
  representation: "full" | "records-only" | "missing";
  attempted: boolean;
  forcedDecision: { decisionId: string; choiceKey: string } | null;
  observations: CoreObservation[];
  gaps: Gap[];
  recordIds: string[];
}

export interface RunReceipt {
  version: string;
  lifeId: string;
  mode: "god" | "free";
  seed: string;
  core: CoreMetadata;
  startDate: string;
  endDate: string;
  simulatedDays: number;
  complete: boolean;
  elapsedMilliseconds: number;
  peakRssBytes: number;
  initialization: CoreReceipt;
  advances: AdvanceReceipt[];
  inputs: { inputId: string; receipt: CoreReceipt }[];
  steps: StepReceipt[];
  stopgaps: StopgapBanner[];
}
