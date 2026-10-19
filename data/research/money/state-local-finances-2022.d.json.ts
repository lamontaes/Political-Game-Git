// Shape of state-local-finances-2022.json. TypeScript reads this instead of
// typing the whole file literally; the data stays in the JSON.
interface DebtLines {
  interestOnDebt: number;
  debtOutstanding: number;
}
interface Place {
  name: string;
  dollars: {
    stateAndLocal: Record<string, number>;
    state: Record<string, number> & DebtLines;
    local: Record<string, number> & DebtLines;
  };
  population2023: number;
  stateAndLocalPerResident: Record<string, number>;
}
declare const data: {
  id: string;
  asOf: string;
  sourceKind: string;
  source: {
    title: string;
    publisher: string;
    url: string;
    file: string;
    sha256: string;
    created: string;
  };
  populationSource: string;
  scope: string;
  lines: Record<string, string>;
  places: Record<string, Place> & { US: Place };
};
export default data;
