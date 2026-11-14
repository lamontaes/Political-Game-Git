import { organizationName } from "../director/words";
import { coreAPI } from "../core2/state";
import {
  JOBS_MODULE_ID,
  quitJob,
  type PositionRow,
} from "../core2/modules/jobs";
import type { CoreState } from "../core2/types";

/**
 * The jobs open in the person's town, read from the jobs module's position
 * records: the title, the employer, the hourly pay and the daily hours of the
 * job the opening replaces or copies. Each row carries its position's record
 * id. Nothing is decided here: who fits an opening is the jobs engine's to
 * say, not this list's.
 */
export function openingsView(core: CoreState, personId: string) {
  const person = core.people.get(personId);
  if (!person || !core.modules.has(JOBS_MODULE_ID)) return { openings: [] };
  const rows = coreAPI(core)
    .moduleState(JOBS_MODULE_ID)
    .table("positions")
    .rows() as unknown as PositionRow[];
  return {
    openings: rows
      .filter((row) => row.status === "open" && row.placeId === person.placeId)
      .sort(
        (a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
      )
      .map((row) => ({
        recordId: row.id,
        title: row.title,
        employer: (() => {
          const org = core.organizations.get(row.organizationId);
          return org ? organizationName(org) : null;
        })(),
        hourlyMinor: row.hourlyMinor,
        hoursDaily: core.jobs.get(row.templateJobId)?.hoursDaily ?? null,
      })),
  };
}

/**
 * The player leaves their job by their own press: the jobs engine ends it the way a worker's own
 * leaving always ends, and the answer says whether it did (`left`) or why the job stays.
 */
export function leaveJobAs(core: CoreState, personId: string) {
  return quitJob(coreAPI(core), personId);
}
