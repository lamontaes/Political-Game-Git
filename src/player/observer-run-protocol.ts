import type { IsoDate, World } from "../simulation/types";
import type { ObserverHistoryCheckpoint } from "../presentation/observer-history-checkpoint";
import type { PreparedRecord } from "../presentation/browser-world-repository";

export type ObserverWorkerCommand =
  | { readonly kind: "init"; readonly world: World }
  | { readonly kind: "run" }
  | { readonly kind: "pause"; readonly requestId: number }
  | { readonly kind: "step"; readonly days: number; readonly requestId: number }
  | { readonly kind: "ack"; readonly checkpointId: number };

export type ObserverWorkerMessage =
  | { readonly kind: "progress"; readonly date: IsoDate }
  | {
      readonly kind: "checkpoint";
      readonly checkpointId: number;
      readonly checkpoint: ObserverHistoryCheckpoint | null;
      readonly prepared?: PreparedRecord;
      readonly requestId?: number;
    }
  | { readonly kind: "problem"; readonly message: string };
