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
import { TRAIT_CHANGE_MODULE } from "../core2/modules/trait-change";
import { RESTING_STRESS_MODULE } from "../core2/modules/resting-stress";
import { movesModule } from "../core2/modules/moves";
import { RENEWAL_MODULE } from "../core2/modules/renewal";
import { renewalData } from "../core2/births-setup";
import { newsModule } from "../core2/modules/news";
import { speechModule } from "../core2/modules/speech";
import { viewsModule } from "../core2/modules/views";
import type { CoreData, CoreModule } from "../core2/types";
import { beliefsModule } from "./conversation";

/** The core data the people engines need (drives' actions and parameters, the newborn tier). */
export function peopleData(data: CoreData = DEFAULT_DATA): CoreData {
  return renewalData(withDrives(data, DEFAULT_DRIVES_DATA));
}

/** The people engines, in the order they should run before the director. */
export function peopleModules(): CoreModule[] {
  return [
    HEALTH_MODULE,
    RESTING_STRESS_MODULE,
    TRAIT_CHANGE_MODULE,
    createDrivesModule(DEFAULT_DRIVES_DATA),
    viewsModule,
    newsModule,
    speechModule,
    candidacyModule,
    corruptionModule,
    RENEWAL_MODULE,
    movesModule,
    beliefsModule,
  ];
}
