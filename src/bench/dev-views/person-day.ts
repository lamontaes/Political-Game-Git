/**
 * Dev mode's Day view (pool item office-hours-never-fill-an-officials-day): a person's day so
 * far on the clock every engine reads, as the Calendar shows it. Minutes at work, of which the
 * office's hours and the record they come from (an office day entry, a council meeting, a day at
 * the post), minutes of free time spent, and the hours left for anything else. The player's day
 * unless `id` names another person.
 */
import { discretionaryHours, officeTimeToday } from "../../core2/modules/work";
import { coreAPI } from "../../core2/state";
import type { PersonId } from "../../core2/types";
import type { DevView } from "../dev-views";

const view: DevView = {
  name: "person-day",
  client: "dev-person-day.mjs",
  labels: {
    title: "Day",
    atWork: "At work",
    office: "Office",
    free: "Free time",
    left: "Hours left",
    nobody: "No one is playing.",
  },
  routes: {
    "GET person-day": ({ mode, q }) => {
      const core = mode.core;
      const personId = (q("id") || core.playerId) as PersonId | undefined;
      if (!personId) return null;
      const api = coreAPI(core);
      const time = core.work.timeByPerson.get(personId);
      const today = time?.date === core.date;
      return {
        personId,
        date: core.date,
        workMinutes: today ? time.workMinutes : 0,
        office: officeTimeToday(api, personId),
        freeTimeMinutes: today ? time.discretionaryMinutes : 0,
        hoursLeft: discretionaryHours(api, personId),
      };
    },
  },
};

export default view;
