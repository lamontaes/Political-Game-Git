// Hand-maintained shape of place-towns-acs-2024.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  id: string;
  source: string;
  table: string;
  scope: string;
  script: string;
  placeTowns: Record<string, Array<Array<number | string>>>;
  townPopulation: Record<string, number>;
};
export default data;
