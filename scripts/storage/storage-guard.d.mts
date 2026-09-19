export interface StorageReservation {
  readonly id: string;
  readonly operation: string;
  readonly owner: string;
  readonly target: string;
  readonly bytes: number;
  readonly createdAt: number;
  readonly expiresAt: number;
}

/**
 * Refuse (exit 3) or reserve headroom for an entry point; the reservation is
 * released when the process ends. Returns null on a hosted CI runner or when
 * `OCD_STORAGE_OVERRIDE` records a deliberate bypass.
 */
export function gateEntryPoint(options: {
  operation: string;
  target?: string;
  outputRoots?: readonly string[];
  log?: (line: string) => void;
}): StorageReservation | null;

export function isEphemeralHost(env?: NodeJS.ProcessEnv): boolean;
export function formatBytes(bytes: number): string;
export function recordedState(
  target: string,
  identicalTo?: { store: string; commit: string },
): string[] | null;
