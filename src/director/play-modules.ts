/**
 * Every people engine a played world installs, in one call (audit 1, Oct 12:
 * speeches and "bring it up" must run in /play, not only in tests). The
 * story director is created separately because the screens read its ledger.
 */
import { DEFAULT_DATA } from "../core2/data";
import { candidacyModule } from "../core2/modules/candidacy";
import { corruptionModule } from "../core2/modules/corruption";
import {
  createDrivesModule,
  DEFAULT_DRIVES_DATA,
  withDrives,
} from "../core2/modules/drives";
import { HEALTH_MODULE } from "../core2/modules/health";
import { coverageModule } from "../core2/modules/coverage";
import { encountersModule } from "../core2/modules/encounters";
import { groupsModule } from "../core2/modules/groups";
import { movesModule } from "../core2/modules/moves";
import { partneringModule } from "../core2/modules/partnering";
import { RENEWAL_MODULE } from "../core2/modules/renewal";
import { renewalData } from "../core2/births-setup";
import { newsModule } from "../core2/modules/news";
import { speechModule } from "../core2/modules/speech";
import { viewsModule } from "../core2/modules/views";
import { addOpeningGroups } from "../core2/opening-groups";
import { addOpeningProfiles } from "../core2/opening-profile";
import type { CoreData, CoreInput, CoreModule } from "../core2/types";
import { beliefsModule } from "./conversation";

/** The core data the people engines need (drives' actions and parameters, the newborn tier). */
export function peopleData(data: CoreData = DEFAULT_DATA): CoreData {
  return renewalData(withDrives(data, DEFAULT_DRIVES_DATA));
}

/** The people engines, in the order they should run before the director. */
export function peopleModules(): CoreModule[] {
  return [
    HEALTH_MODULE,
    createDrivesModule(DEFAULT_DRIVES_DATA),
    viewsModule,
    newsModule,
    speechModule,
    candidacyModule,
    corruptionModule,
    RENEWAL_MODULE,
    movesModule,
    groupsModule,
    encountersModule,
    partneringModule,
    coverageModule,
    beliefsModule,
  ];
}

/**
 * What the people engines add to a town's opening records, in one call
 * before `createLifeCore`: each adult's education and faith on their record,
 * and the town's local groups from the IRS listing (so `groupsModule` has
 * groups to fill). Run it after the deep past and the two-level collapse.
 */
export function peopleOpening(input: CoreInput): CoreInput {
  return addOpeningGroups(addOpeningProfiles(input));
}
