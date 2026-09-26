import { prepareWorldRecord } from "../presentation/browser-world-repository";
import type { World } from "../simulation/types";

type Request = { readonly requestId: number; readonly world: World };

const scope = self as unknown as {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent<Request>) => void) | null;
};

scope.onmessage = (event) => {
  const { requestId, world } = event.data;
  try {
    scope.postMessage({
      requestId,
      prepared: prepareWorldRecord(world),
    });
  } catch (error) {
    scope.postMessage({
      requestId,
      error:
        error instanceof Error
          ? error.message
          : "The save could not be prepared.",
    });
  }
};
