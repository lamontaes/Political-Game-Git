import type { EducationProgramKind } from "./types";

/**
 * The degree levels a player can apply for at a real college.
 *
 * Every degree used to say "Listed here, but not something you can apply
 * for", so the only study a grown character could take was a noncredit
 * course. In the long playthrough Seth Woodward in Ely, Nevada looked at
 * Great Basin College and could enroll in nothing but a $200 workforce
 * course. The college directory says which award levels each institution
 * confers; this table says which of those levels the game can now run.
 *
 * What the directory settles and what it does not:
 *
 * - That this college confers this level of degree: sourced, from the
 *   directory row the offer carries as evidence.
 * - That an open-admission college admits any applicant: sourced, from the
 *   directory's own open-admission field.
 * - Who a selective college admits, what it charges, how many hours a week
 *   the study takes and whether a high-school diploma is checked:
 *   PLACEHOLDER(research: who-gets-into-college-and-what-it-costs). Until
 *   that is answered every applicant is admitted, and length, pace and
 *   tuition are copied from the game's existing authored degree paths in
 *   `life-paths2-catalog.ts` rather than invented again here.
 *
 * Certificates and doctorates stay listed only. Their length varies too much
 * by program for one row to stand for them without the research.
 */
export interface DegreeLevel {
  /** The directory capability code, without its vintage prefix. */
  readonly code: "LEVEL3" | "LEVEL5" | "LEVEL7";
  readonly credential: string;
  /** The authored life path whose length, pace and tuition stand in. */
  readonly placeholderTemplateId:
    "college-associate" | "college-bachelors" | "college-graduate";
  /** The program other paths already check for, e.g. law school. */
  readonly equivalentProgram: EducationProgramKind;
  readonly prerequisiteProgram: EducationProgramKind | null;
}

export const DEGREE_RESEARCH_QUESTION_ID =
  "who-gets-into-college-and-what-it-costs";

export const DEGREE_LEVELS: readonly DegreeLevel[] = [
  {
    code: "LEVEL3",
    credential: "Associate's degree",
    placeholderTemplateId: "college-associate",
    equivalentProgram: "postsecondary:associate-degree",
    prerequisiteProgram: null,
  },
  {
    code: "LEVEL5",
    credential: "Bachelor's degree",
    placeholderTemplateId: "college-bachelors",
    equivalentProgram: "postsecondary:bachelors-degree",
    prerequisiteProgram: null,
  },
  {
    code: "LEVEL7",
    credential: "Master's degree",
    placeholderTemplateId: "college-graduate",
    equivalentProgram: "postsecondary:graduate-degree",
    prerequisiteProgram: "postsecondary:bachelors-degree",
  },
];

/** The degree level a directory capability code names, if the game runs it. */
export function degreeLevelForCode(code: string): DegreeLevel | null {
  const bare = code.includes(":") ? code.slice(code.indexOf(":") + 1) : code;
  return DEGREE_LEVELS.find((level) => level.code === bare) ?? null;
}

/** The program a real-college degree enrollment is recorded under. */
export function degreeProgramFor(level: DegreeLevel): EducationProgramKind {
  return `postsecondary:edu-path7-${level.code.toLowerCase()}`;
}

/**
 * The programs a completed enrollment in `programKind` also counts as.
 *
 * A bachelor's from a real college is a bachelor's for law school and for a
 * graduate degree, whichever route earned it.
 */
export function programsSatisfiedBy(
  programKind: EducationProgramKind,
): readonly EducationProgramKind[] {
  const level = DEGREE_LEVELS.find(
    (entry) => degreeProgramFor(entry) === programKind,
  );
  return level ? [programKind, level.equivalentProgram] : [programKind];
}
