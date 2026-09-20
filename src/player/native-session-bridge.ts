/** Narrow native capability; ordinary browser builds expose no Quit command. */
declare global {
  interface Window {
    ocdDesktop?: { requestQuit: () => Promise<void> };
  }
}

export const NATIVE_SAVE_EVENT = "ocd:request-save";
export const NATIVE_SESSION_QUERY_EVENT = "ocd:query-session";
export type NativeSaveRequest = CustomEvent<{
  complete: (saved: boolean) => void;
}>;

export function nativeQuitAvailable(): boolean {
  return typeof window.ocdDesktop?.requestQuit === "function";
}

export function requestNativeQuit(): void {
  void window.ocdDesktop?.requestQuit().catch(() => {
    // A rejected native request leaves this recoverable game open.
  });
}

export type NativeSessionQuery = CustomEvent<{
  respond: (active: boolean) => void;
}>;
