export function selectBenchPlace<
  P extends {
    key: string;
    scope: string;
    stateJurisdictionKey: string | null;
  },
>(
  seed: string,
  jurisdictions: readonly { jurisdictionKey: string }[],
  places: readonly P[],
): P;
