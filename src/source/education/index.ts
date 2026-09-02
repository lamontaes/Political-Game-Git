/**
 * Education source domain: NCES CCD and IPEDS institution directory records.
 *
 * The committed corpus is a SAMPLE, not the national universe — see
 * `EducationCorpusSnapshot.completeness`.
 *
 * The Node-only file loader (`loader.node.ts`) is intentionally NOT re-exported
 * here: this barrel must stay browser-safe, and a runtime barrel that pulls in
 * `fs` breaks the app bundle.
 */
export {
  assertNoAutomaticAttendance,
  convertEducationInstitutionToOrganization,
  findInstitutionByStableId,
  queryEducationInstitutions,
  validateEducationCorpus,
} from "./corpus.js";
export type {
  ArtifactReleaseStatus,
  EducationCorpusCompleteness,
  EducationCorpusSnapshot,
  EducationInstitutionRecord,
  EducationSourceProvenance,
  InstitutionKind,
  InstitutionLevel,
  InstitutionLocation,
  OperatingStatusKind,
  OperatingVintageStatus,
  PostsecondaryRecord,
  PublicSchoolRecord,
  QueryEducationFilter,
  SchoolDistrictRecord,
  SourceRowLocator,
} from "./types.js";
