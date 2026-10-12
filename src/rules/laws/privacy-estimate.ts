/** Frozen SRIA bands; 100/500 boundaries remain the authored convention. */
export interface PrivacyCostFacts {
  readonly centralEstimate: {
    readonly bySize: readonly {
      readonly minEmployees: number;
      readonly maxEmployees: number | null;
      readonly dollarsPerFirm: number;
      readonly sizeClass: string;
    }[];
    readonly page: number;
    readonly bandConvention: { readonly source: string };
  };
  readonly source: { readonly url: string };
  readonly checksOnly: {
    readonly smallFirmUpperBound: { readonly quote: string };
  };
}
export interface InitialPrivacyComplianceEstimate {
  readonly initialDollars: number;
  readonly employeeSizeClass: string;
  readonly source: string;
  readonly sourcePage: number;
  readonly timing: "one-time-initial";
  readonly sourceLimit: string;
  readonly boundaryConvention?: string;
  readonly bandSource: string;
}

// stopgapId: "laws.privacy-band-convention"
export function initialPrivacyComplianceEstimate(
  ccpaCosts: PrivacyCostFacts,
  employeeCount: number,
): InitialPrivacyComplianceEstimate | null {
  if (!Number.isSafeInteger(employeeCount) || employeeCount < 1) return null;
  const bands = ccpaCosts.centralEstimate.bySize.filter(
    (row) =>
      employeeCount >= row.minEmployees &&
      (row.maxEmployees === null || employeeCount <= row.maxEmployees),
  );
  if (bands.length !== 1) return null;
  const band = bands[0]!;
  return {
    initialDollars: band.dollarsPerFirm,
    employeeSizeClass: band.sizeClass,
    source: ccpaCosts.source.url,
    sourcePage: ccpaCosts.centralEstimate.page,
    timing: "one-time-initial",
    sourceLimit: ccpaCosts.checksOnly.smallFirmUpperBound.quote,
    bandSource: ccpaCosts.centralEstimate.bandConvention.source,
    ...([100, 500].includes(employeeCount)
      ? {
          boundaryConvention: `CTO October 1, 5:16: exactly ${employeeCount} employees takes $450,000. This is an explicit boundary convention, not a claim that SUSB 100–499 includes 500.`,
        }
      : {}),
  };
}
