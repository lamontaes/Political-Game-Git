// Hand-maintained shape of place-district-population.generated.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  compilerVersion: string;
  format: string;
  note: string;
  populationVintage: string;
  populations: Record<string, Record<string, number>>;
  relationVintage: string;
  sources: {
    bytes: number;
    sha256: string;
    url: string;
    archiveBytes?: number;
    member?: string;
    memberCrc32?: string;
  }[];
  states: string[];
};
export default data;
