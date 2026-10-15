/**
 * Where a string the player reads came from, recorded only while an audit is
 * listening.
 *
 * The audit (`tests/e2e/runtime-text-audit.spec.ts`) installs a sink on
 * `globalThis` before the application loads. Nothing sets one in play, so every
 * call below is a single property read and a return: no text is stored, the
 * simulation is untouched, and no player screen changes.
 */
export interface EngineTextOrigin {
  /** The bank that wrote the line, such as `press.answer-directly`. */
  readonly bank: string;
  /** The variant the bank chose, when the composer knows it. */
  readonly variant?: string;
}

export interface RuntimeTextSink {
  readonly engine: (text: string, origin: EngineTextOrigin) => void;
  /** The world the player is looking at, so record values can be told apart. */
  readonly world: (world: unknown) => void;
}

declare global {
  var __ocdRuntimeText: RuntimeTextSink | undefined;
}

/** Registers engine output with the audit and returns it unchanged. */
export function tagEngineText(text: string, origin: EngineTextOrigin): string {
  globalThis.__ocdRuntimeText?.engine(text, origin);
  return text;
}

/** Hands the audit the current world; does nothing in play. */
export function tagRuntimeWorld(world: unknown): void {
  globalThis.__ocdRuntimeText?.world(world);
}
