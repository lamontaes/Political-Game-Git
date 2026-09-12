import type { FutureTransitionHandlerRegistry, IsoDate, World } from "./types";
import {
  EDUCATION_STUDY_PERIOD_DUE_KEY,
  educationStudyPeriodDueHandler,
} from "./education-study-progression";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";

/**
 * WEEKEND19 E/F boundary: education consumes canonical time advancement and
 * resolves period tuition/completion when dated dues cross. E owns shared
 * routine fast-forward; this hook owns study-period consequences only.
 */
export interface EducationStudyRoutineHook {
  readonly transitionHandlers: FutureTransitionHandlerRegistry;
  readonly advanceThroughDate: (world: World, throughDate: IsoDate) => World;
}

export const EDUCATION_STUDY_ROUTINE_HOOK: EducationStudyRoutineHook = {
  transitionHandlers: createFutureTransitionHandlerRegistry([
    [EDUCATION_STUDY_PERIOD_DUE_KEY, educationStudyPeriodDueHandler],
  ]),
  advanceThroughDate: (world) => world,
};
