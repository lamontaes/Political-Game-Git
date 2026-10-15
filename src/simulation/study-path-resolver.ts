import type { LifePathDefinition } from "./life-paths2-catalog";
import type { EntityId, World } from "./types";

export type StudyPathResolver = (
  world: World,
  enrollmentId: EntityId,
) => LifePathDefinition | undefined;

/**
 * The resolver lives in this leaf module so life-paths2 can register it while
 * education-study-progression is still loading, without reading a binding that
 * has not been initialized yet.
 */
let studyPathResolver: StudyPathResolver | null = null;

export function registerStudyPathResolver(resolver: StudyPathResolver): void {
  studyPathResolver = resolver;
}

export function resolveStudyPath(
  world: World,
  enrollmentId: EntityId,
): LifePathDefinition | undefined {
  if (!studyPathResolver)
    throw new Error("Study path resolver is not registered.");
  return studyPathResolver(world, enrollmentId);
}
