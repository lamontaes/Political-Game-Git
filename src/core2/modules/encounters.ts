/**
 * Encounters during play that come from other engines' records: people at a
 * town hall or a hearing meet those they spoke with. A new hire meets their
 * coworkers through WORLD's jobs engine, which calls `meetAtWork` at the hire.
 */
import { ENCOUNTERS, meetAtMeeting } from "../encounters";
import type { CoreModule } from "../types";

export const ENCOUNTERS_MODULE_ID = "encounters";

export const encountersModule: CoreModule = {
  id: ENCOUNTERS_MODULE_ID,
  eventKinds: [
    ENCOUNTERS.meetingEvents.townHall,
    ENCOUNTERS.meetingEvents.publicComment,
  ],
  onEvent(api, event) {
    meetAtMeeting(api, event);
  },
};
