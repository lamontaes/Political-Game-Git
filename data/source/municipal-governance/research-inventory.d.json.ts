// Hand-maintained shape of research-inventory.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  schemaVersion: number;
  files: {
    packet: string;
    path: string;
    bytes: number;
    sha256: string;
    rights: string;
    usage: string;
  }[];
  reports: {
    packet: string;
    heading: string;
    state: string;
    name: string;
    line: number;
    text: string;
    citedUrls: string[];
    status: string;
  }[];
  controls: {
    packet: string;
    heading: string;
    line: number;
    reason: string;
  }[];
};
export default data;
