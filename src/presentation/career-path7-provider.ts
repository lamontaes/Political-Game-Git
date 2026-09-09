import records from "./generated/career-occupations.json";
import type { CareerProvider } from "../simulation/career-path7";
const paths: Readonly<Record<string, string>> = {
  "41-2031.00": "shop-assistant",
  "43-9061.00": "office-assistant",
  "49-9043.00": "repair-worker",
};
/** All 62 task statements for the declared three existing LIFE work contexts. */
export const CAREER_PROVIDERS: readonly CareerProvider[] = records.map((r) => ({
  id: `onet31-${r.id}`,
  pathId: paths[r.id]!,
  occupationCode: r.id,
  sourceVersion: r.source.onetVersion,
  tasks: r.tasks,
}));
export const CAREER_SOURCE_CONTEXT = records;
