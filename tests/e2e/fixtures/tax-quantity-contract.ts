export interface TaxQuantityFixtureControl {
  reload(): void;
  counts(): {
    bases: number;
    assessments: number;
    collections: number;
    amount: unknown;
    assessedMinor: number | null;
  };
}
declare global {
  interface Window {
    p2TaxFixture?: TaxQuantityFixtureControl;
  }
}
