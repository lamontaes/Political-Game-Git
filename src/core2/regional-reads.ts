/** The regional economy's front door for reads: each region's kept months. Each function answers one question; none returns a table. */
import type { RegionMonth } from "./regional-model";
import type { CoreAPI, CoreState } from "./types";

/** The module's id, written here (the engine's own file names the same string) so a door reads the table without loading the engine. A door that named the wrong table fails `economy-reads.test.ts`, which reads each door in a played world. */
const REGIONAL_MODULE_ID = "regional";

/** Whether this world keeps a regional economy. */
export function regionalKept(api: CoreAPI): boolean {
  return (api.state as CoreState).modules.has(REGIONAL_MODULE_ID);
}

/** Every region's row for one month (`YYYY-MM`). */
export function regionMonthsAt(
  api: CoreAPI,
  month: string,
): readonly RegionMonth[] {
  if (!regionalKept(api)) return [];
  return api
    .moduleState(REGIONAL_MODULE_ID)
    .table("months")
    .query("byMonth", [month]) as unknown as RegionMonth[];
}

/** Every region month the engine has kept. */
export function allRegionMonths(api: CoreAPI): readonly RegionMonth[] {
  if (!regionalKept(api)) return [];
  return api
    .moduleState(REGIONAL_MODULE_ID)
    .table("months")
    .rows() as unknown as RegionMonth[];
}
