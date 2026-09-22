import {
  homeStateUsps,
  workStatusAt,
  type EntityId,
  type World,
} from "../simulation";
import { CAREER_PROVIDERS } from "./career-path7-provider";
import { careerEligibility } from "../simulation/career-path7";
import {
  LIFE_PATHS2_CATALOG,
  lifePathDefinition,
} from "../simulation/life-paths2-catalog";
import {
  lifePathEntryReason,
  pathForRelationship,
} from "../simulation/life-paths2";
import { searchInstitutions } from "../education/catalog";
import {
  educationOptionReason,
  studyDefinition,
} from "../education/study-provider";
import type { EducationInstitution } from "../education/types";

/** Readers preserve the difference between a directory listing, a possible path and an issued offer. */
export function projectPracticalOpportunities(
  world: World,
  personId: EntityId,
  query = "",
) {
  const terms = query
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/\s+/)
    .filter(Boolean);
  const careers = CAREER_PROVIDERS.map((provider) => {
    const path = lifePathDefinition(provider.pathId);
    const relationship = world.history.workRelationships
      .filter(
        (item) =>
          item.personId === personId &&
          pathForRelationship(world, item.id)?.id === path.id,
      )
      .at(-1);
    const status = relationship
      ? (workStatusAt(world, relationship.id)?.status ?? "unknown")
      : "catalog";
    return {
      id: provider.id,
      kind: "work" as const,
      path,
      relationshipId: relationship?.id ?? null,
      status,
      unavailable: careerEligibility(world, provider),
      provider,
      locationJurisdictionId: path.timeDemand.locationJurisdictionId,
    };
  }).filter((item) =>
    terms.every((term) =>
      `${item.path.title} ${item.path.organizationName} ${item.path.responsibility}`
        .toLocaleLowerCase("en-US")
        .includes(term),
    ),
  );
  const study = LIFE_PATHS2_CATALOG.filter(
    (path) =>
      path.scope === "personal" &&
      path.kind === "study" &&
      terms.every((term) =>
        `${path.title} ${path.organizationName}`
          .toLocaleLowerCase("en-US")
          .includes(term),
      ),
  ).map((path) => ({
    id: path.id,
    kind: "study" as const,
    path,
    status: "catalog" as const,
    unavailable: lifePathEntryReason(world, personId, path),
    locationJurisdictionId: path.timeDemand.locationJurisdictionId,
  }));
  // Existing engagements lead. Eligible catalog choices follow; ordering is presentation only.
  careers.sort(
    (a, b) =>
      Number(b.relationshipId !== null) - Number(a.relationshipId !== null) ||
      Number(a.unavailable !== null) - Number(b.unavailable !== null),
  );
  return {
    careers,
    study,
    suggestedCareers: careers.slice(0, 6),
    suggestedStudy: study
      .filter((item) => item.unavailable === null)
      .slice(0, 6),
  };
}

/** Blank search starts in-state; entering a search reaches the complete supplied catalog. */
export function projectRelevantEducationDirectory(
  world: World,
  personId: EntityId,
  catalog: readonly EducationInstitution[],
  query = "",
  kind = "postsecondary",
  offset = 0,
) {
  const state = homeStateUsps(world, personId);
  const local = query.trim() === "" && state !== null;
  const result = searchInstitutions(
    local ? catalog.filter((item) => item.state === state) : catalog,
    query,
    kind,
    offset,
  );
  return {
    ...result,
    scope: local ? ("in-state" as const) : ("catalog" as const),
    state,
    rows: result.rows.map((institution) => ({
      institution,
      status: "directory" as const,
      programs: institution.capabilities
        .filter(
          (capability) =>
            capability.kind === "noncredit" && capability.state === "offered",
        )
        .map((capability) => ({
          capability,
          path: studyDefinition(institution, capability),
          unavailable: educationOptionReason(world, institution, capability),
        })),
    })),
  };
}
