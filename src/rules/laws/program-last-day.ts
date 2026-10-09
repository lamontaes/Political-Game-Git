export interface ProgramTermChangeFact {
  readonly kind: "sunset" | "extension" | "repeal";
  readonly lastDay: string;
  readonly enactedOn: string;
  readonly enactmentSequence: number;
}

/** Resolve the last operative term from already target-matched changes. */
export function programLastDayFromFacts<T extends ProgramTermChangeFact>(
  changes: readonly T[],
): T | null {
  let current: T | null = null;
  let repealed = false;
  const ordered = [...changes].sort((left, right) =>
    left.enactedOn === right.enactedOn
      ? left.enactmentSequence - right.enactmentSequence
      : left.enactedOn < right.enactedOn
        ? -1
        : 1,
  );
  for (const change of ordered) {
    if (!repealed || current === null || change.lastDay < current.lastDay) {
      current = change;
    }
    if (change.kind === "repeal") repealed = true;
  }
  return current;
}
