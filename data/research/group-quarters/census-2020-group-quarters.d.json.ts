// Hand-maintained shape of census-2020-group-quarters.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  id: string;
  columns: string[];
  tables: Record<string, { tag: string; vintage: string; cells: string }>;
  rows: Array<[string, "P5" | "P28" | "blocks", ...number[]]>;
};
export default data;
