import {
  prepareWorldRecord,
  type PreparedRecord,
} from "../presentation/browser-world-repository";
import type { World } from "../simulation/types";

type Reply = {
  readonly requestId: number;
  readonly prepared?: PreparedRecord;
  readonly error?: string;
};

/** One worker per open save store; the store itself coalesces superseded worlds. */
export function createBackgroundSavePreparer(): (
  world: World,
) => Promise<PreparedRecord> {
  let worker: Worker | null = null;
  let nextId = 0;
  const waiting = new Map<
    number,
    {
      resolve: (prepared: PreparedRecord) => void;
      reject: (error: Error) => void;
    }
  >();

  const fail = (reason: string) => {
    worker?.terminate();
    worker = null;
    for (const request of waiting.values()) request.reject(new Error(reason));
    waiting.clear();
  };

  return (world) => {
    // Older browsers still save correctly, though they cannot move preparation
    // off the UI thread. The normal browser route uses the same module worker
    // pattern as observer mode.
    if (typeof Worker === "undefined") {
      return Promise.resolve().then(() => prepareWorldRecord(world));
    }
    try {
      if (worker === null) {
        worker = new Worker(
          new URL("./save-preparation.worker.ts", import.meta.url),
          { type: "module" },
        );
        worker.onmessage = (event: MessageEvent<Reply>) => {
          const { requestId, prepared, error } = event.data;
          const request = waiting.get(requestId);
          if (!request) return;
          waiting.delete(requestId);
          if (prepared) request.resolve(prepared);
          else
            request.reject(
              new Error(error ?? "The save could not be prepared."),
            );
        };
        worker.onerror = () =>
          fail("The background save stopped unexpectedly.");
        worker.onmessageerror = () =>
          fail("The background save could not be read.");
      }
      const requestId = ++nextId;
      return new Promise<PreparedRecord>((resolve, reject) => {
        waiting.set(requestId, { resolve, reject });
        try {
          worker!.postMessage({ requestId, world });
        } catch (error) {
          waiting.delete(requestId);
          reject(
            error instanceof Error
              ? error
              : new Error("The world could not be sent to the save worker."),
          );
        }
      });
    } catch {
      return Promise.resolve().then(() => prepareWorldRecord(world));
    }
  };
}
