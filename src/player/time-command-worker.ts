import {
  submitTimeCommand,
  type TimeCommandRequest,
} from "../presentation/time-command";
import type { World } from "../simulation";
import { diffWorld } from "./time-command-delta";

interface TimeCommandJob {
  readonly type: "advance";
  readonly jobId: string;
  readonly request: TimeCommandRequest;
}

let synchronizedWorld: World | null = null;

self.onmessage = (
  event: MessageEvent<TimeCommandJob | { type: "sync"; world: World }>,
) => {
  if (event.data.type === "sync") {
    synchronizedWorld = event.data.world;
    return;
  }
  const world = synchronizedWorld;
  if (!world) {
    self.postMessage({
      jobId: event.data.jobId,
      error: "Time is still preparing.",
    });
    return;
  }
  try {
    const result = submitTimeCommand(world, event.data.request);
    const delta = diffWorld(world, result.world);
    synchronizedWorld = result.world;
    // Materialize the lazy receipt text in the worker so formatting work also
    // stays off the UI thread. Only changed World leaves cross back to main.
    self.postMessage({
      jobId: event.data.jobId,
      result: {
        delta,
        receipt: { ...result.receipt, outcome: result.receipt.outcome },
      },
    });
  } catch (error) {
    self.postMessage({
      jobId: event.data.jobId,
      error: error instanceof Error ? error.message : "Time could not advance.",
    });
  }
};
