import {
  createKnowledgeSubjectDefinition,
  createPolicyDomainDefinition,
  createPolicyIssueDefinition,
  createPolicyPropositionDefinition,
  createPoliticalPrincipleDefinition,
} from "./policy";
import { POLICY_GOVERNMENT_LEVELS } from "./types";
import type {
  KnowledgeSubjectDefinition,
  KnowledgeSubjectScope,
  PolicyDomainDefinition,
  PolicyGovernmentLevel,
  PolicyIssueDefinition,
  PolicyPropositionDefinition,
  PoliticalPrincipleDefinition,
  PropositionParameter,
  PrincipleBearing,
  PropositionPrincipleBearing,
} from "./types";

/**
 * What a government can be about, as loaded data.
 *
 * The bill lifecycle underneath this is the deepest thing in the repository —
 * committee, floor, crossing, veto and override are all genuinely enforced —
 * and for a long time a new world shipped with nothing for it to be about: no
 * domains, no issues, no propositions, no subjects, no principles. That
 * emptiness was deliberate and correct (`production-catalog.ts` explains why an
 * empty catalog is the honest state), and it meant the content, when it
 * arrived, had to arrive as something dropped in rather than compiled in.
 *
 * This is the schema and the loader for dropping it in. It is deliberately the
 * same shape as `trait-packs.ts`, because a modder who has written one should
 * recognise the other: rows referencing rows by stable key, every reference
 * resolved once at load against declarations that exist, and a row that does
 * not resolve rejected by name with its reason rather than ignored at play
 * time, where a row matching nothing looks exactly like a row doing its job.
 *
 * **Nothing here is content**, and that is still true of this file: it is the
 * schema and the loader, and a build that loads no packs still produces the
 * empty catalog. Content now exists and arrives through it —
 * `us-state-and-local` carries the sourced issue vocabulary and
 * `us-policy-positions` the authored stances on it — but it lives in packs,
 * which is the whole point. Removing them from the registry empties the
 * catalog again without touching a line here.
 */

/* -------------------------------------------------------------------------- */
/* Provenance                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Where a pack's content came from, which is not optional.
 *
 * The production catalog boundary exists to refuse content that describes
 * somewhere real without anybody having read anything — a synthetic policy
 * corpus stamped into a player's save. A pack satisfies that boundary by
 * saying what it is: either an authored fiction, which claims nothing about
 * the real world, or a reading of named sources, which can be checked.
 *
 * A pack that will not say is refused, because "unsourced" and "sourced but
 * undeclared" are indistinguishable from the outside and only one of them is
 * allowed into a save.
 */
export type PolicyPackProvenance =
  | {
      readonly kind: "authored-fiction";
      /** What the author intends it to be, in their own words. */
      readonly note: string;
    }
  | {
      readonly kind: "sourced";
      /** Named sources a reader could go and check. At least one. */
      readonly sources: readonly string[];
      readonly note: string;
    };

/* -------------------------------------------------------------------------- */
/* Rows                                                                        */
/* -------------------------------------------------------------------------- */

/** A field of government. Referenced by issues. */
export interface PolicyDomainRow {
  readonly key: string;
  readonly name: string;
  readonly description: string;
}

/** A question inside a domain. Referenced by propositions. */
export interface PolicyIssueRow {
  readonly key: string;
  /** Qualified `pack:key`, or a bare key meaning this pack's own. */
  readonly domain: string;
  readonly name: string;
  readonly description: string;
  /**
   * The levels this question is ordinarily decided at, where the pack's
   * sources say so. Left out means the pack does not know, which a consumer
   * must not read as "every level" — see `PolicyGovernmentLevel`.
   */
  readonly levels?: readonly PolicyGovernmentLevel[];
}

/** One principle a proposition engages, as a pack writes it. */
export interface PropositionPrincipleRow {
  /** Qualified `pack:key`, or a bare key meaning this pack's own. */
  readonly principle: string;
  /** Which way AGREEING with the question cuts. */
  readonly bearing: PrincipleBearing;
}

/** A specific thing that could be done about an issue. */
export interface PolicyPropositionRow {
  readonly key: string;
  /** Qualified `pack:key`, or a bare key meaning this pack's own. */
  readonly issue: string;
  readonly name: string;
  readonly question: string;
  readonly parameters?: readonly PropositionParameter[];
  readonly tags?: readonly string[];
  /**
   * The principles this question engages, where the pack is willing to say.
   *
   * Left out means the pack has not said, which is not "engages none" — see
   * `PolicyPropositionDefinition.principles`. A row naming a principle no
   * pack loaded before it declares is rejected by name with a reason, the
   * same way an unknown issue is, rather than being silently dropped to an
   * empty list: a relation that quietly disappears is indistinguishable
   * from one nobody wrote.
   */
  readonly principles?: readonly PropositionPrincipleRow[];
}

/** Something a person can know about. */
export interface KnowledgeSubjectRow {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly scope: KnowledgeSubjectScope;
  /**
   * What this subject is knowledge *of*, qualified, when its scope says it is
   * about one thing. A `technical` subject refers to nothing and says so by
   * leaving this out.
   */
  readonly about?: string;
  readonly tags?: readonly string[];
}

/** Something a person can believe in, above any particular question. */
export interface PoliticalPrincipleRow {
  readonly key: string;
  readonly name: string;
  readonly description: string;
}

export interface PolicyPack {
  /** Also the namespace of every stable key this pack owns. */
  readonly pack: string;
  readonly provenance: PolicyPackProvenance;
  readonly domains?: readonly PolicyDomainRow[];
  readonly issues?: readonly PolicyIssueRow[];
  readonly propositions?: readonly PolicyPropositionRow[];
  readonly subjects?: readonly KnowledgeSubjectRow[];
  readonly principles?: readonly PoliticalPrincipleRow[];
}

/* -------------------------------------------------------------------------- */
/* Report                                                                      */
/* -------------------------------------------------------------------------- */

/** A row that did not load, and why. Never thrown, always reported. */
export interface PolicyLoadRejection {
  readonly pack: string;
  /** The row, as a reader of the pack file would find it. */
  readonly where: string;
  readonly reason: string;
}

/**
 * What a pack actually did, not merely that it parsed.
 *
 * `registeredButUnused` names a domain nothing sits in and an issue nothing
 * proposes about, which is a state worth being able to see: a domain with no
 * issues under it is a heading a player will never reach, and it looks exactly
 * like a domain doing its job until somebody goes looking.
 */
export interface PolicyPackReport {
  readonly pack: string;
  readonly provenance: PolicyPackProvenance["kind"];
  readonly domains: readonly string[];
  readonly issues: readonly string[];
  readonly propositions: readonly string[];
  readonly subjects: readonly string[];
  readonly principles: readonly string[];
  /** Domains with no issue, and issues with no proposition. */
  readonly registeredButUnused: readonly string[];
}

export interface PolicyLoadReport {
  readonly packs: readonly PolicyPackReport[];
  readonly rejections: readonly PolicyLoadRejection[];
}

export interface PolicyRegistry {
  readonly domains: readonly PolicyDomainDefinition[];
  readonly issues: readonly PolicyIssueDefinition[];
  readonly propositions: readonly PolicyPropositionDefinition[];
  readonly subjects: readonly KnowledgeSubjectDefinition[];
  readonly principles: readonly PoliticalPrincipleDefinition[];
  readonly report: PolicyLoadReport;
}

/* -------------------------------------------------------------------------- */
/* Keys                                                                        */
/* -------------------------------------------------------------------------- */

export function qualifiedPolicyKey(pack: string, key: string): string {
  return `${pack}:${key}`;
}

/**
 * A reference as this pack means it.
 *
 * A bare key means "mine", which is what a single-pack author writes and reads
 * naturally. A qualified key reaches another pack, which is how a pack extends
 * somebody else's government rather than replacing it.
 */
function resolveReference(pack: string, reference: string): string {
  return reference.includes(":")
    ? reference
    : qualifiedPolicyKey(pack, reference);
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                     */
/* -------------------------------------------------------------------------- */

function checkProvenance(provenance: PolicyPackProvenance): string | null {
  if (provenance.kind === "sourced") {
    if (provenance.sources.length === 0) {
      return "declares itself sourced and names no source, which is the same as not saying";
    }
    if (provenance.sources.some((source) => !source.trim())) {
      return "names an empty source";
    }
  }
  if (!provenance.note.trim()) {
    return "declares no note saying what its content is";
  }
  return null;
}

function checkNamed(
  row: {
    readonly key: string;
    readonly name: string;
    readonly description?: string;
  },
  seen: Set<string>,
  kind: string,
): string | null {
  if (!row.key.trim()) return `a ${kind} has no key`;
  if (row.key.includes(":")) {
    return `${kind} key "${row.key}" contains a colon, which separates a pack from its key`;
  }
  if (seen.has(row.key)) return `${kind} "${row.key}" is declared twice`;
  if (!row.name.trim()) return `${kind} "${row.key}" needs a name`;
  return null;
}

/**
 * Loads packs into the definitions a policy catalog is built from.
 *
 * Never throws for content: a bad row is rejected by name and the rest of the
 * pack loads. It throws only for a caller error — two packs claiming one name —
 * because that is this build's mistake rather than a pack author's.
 *
 * Order matters and is fixed: domains, then issues, then principles, then
 * propositions, so a reference always resolves against something already
 * registered. Principles come before propositions because a proposition may
 * name the principles it engages, and a proposition may not be named by a
 * principle — the relation only points one way. Across packs
 * the list order decides, which means a pack extending another must be loaded
 * after it — and a row that reaches forward is rejected by name rather than
 * quietly dropped, so the fix is legible.
 */
export function loadPolicyPacks(packs: readonly PolicyPack[]): PolicyRegistry {
  const names = new Set<string>();
  for (const pack of packs) {
    if (names.has(pack.pack)) {
      throw new Error(`Two policy packs claim the name "${pack.pack}".`);
    }
    names.add(pack.pack);
  }

  const rejections: PolicyLoadRejection[] = [];
  const reports: PolicyPackReport[] = [];

  const domains = new Map<string, PolicyDomainDefinition>();
  const issues = new Map<string, PolicyIssueDefinition>();
  const propositions = new Map<string, PolicyPropositionDefinition>();
  const subjects = new Map<string, KnowledgeSubjectDefinition>();
  const principles = new Map<string, PoliticalPrincipleDefinition>();
  /** Qualified keys of what refers to what, for the unused report. */
  const issuesByDomain = new Map<string, number>();
  const propositionsByIssue = new Map<string, number>();

  for (const pack of packs) {
    const provenanceProblem = checkProvenance(pack.provenance);
    if (provenanceProblem) {
      rejections.push({
        pack: pack.pack,
        where: "provenance",
        reason: `the pack ${provenanceProblem}, so none of its rows load`,
      });
      reports.push({
        pack: pack.pack,
        provenance: pack.provenance.kind,
        domains: [],
        issues: [],
        propositions: [],
        subjects: [],
        principles: [],
        registeredButUnused: [],
      });
      continue;
    }

    const mine = {
      domains: [] as string[],
      issues: [] as string[],
      propositions: [] as string[],
      subjects: [] as string[],
      principles: [] as string[],
    };
    const seenDomains = new Set<string>();
    const seenIssues = new Set<string>();
    const seenPropositions = new Set<string>();
    const seenSubjects = new Set<string>();
    const seenPrinciples = new Set<string>();

    for (const row of pack.domains ?? []) {
      const problem = checkNamed(row, seenDomains, "domain");
      if (problem) {
        rejections.push({
          pack: pack.pack,
          where: `domain "${row.key}"`,
          reason: problem,
        });
        continue;
      }
      seenDomains.add(row.key);
      const qualified = qualifiedPolicyKey(pack.pack, row.key);
      domains.set(
        qualified,
        createPolicyDomainDefinition(qualified, row.name, row.description),
      );
      issuesByDomain.set(qualified, 0);
      mine.domains.push(qualified);
    }

    for (const row of pack.issues ?? []) {
      const problem = checkNamed(row, seenIssues, "issue");
      if (problem) {
        rejections.push({
          pack: pack.pack,
          where: `issue "${row.key}"`,
          reason: problem,
        });
        continue;
      }
      const domainKey = resolveReference(pack.pack, row.domain);
      const domain = domains.get(domainKey);
      if (!domain) {
        rejections.push({
          pack: pack.pack,
          where: `issue "${row.key}"`,
          reason: `names the domain "${domainKey}", which no pack loaded before it declares`,
        });
        continue;
      }
      seenIssues.add(row.key);
      const qualified = qualifiedPolicyKey(pack.pack, row.key);
      // A level nobody defined routes the question nowhere, so it is dropped
      // by name and the issue loads with the levels that do mean something.
      // Keeping it would let a pack invent a level of government a consumer
      // filtering by level has never heard of; refusing the whole issue would
      // lose a real question over one bad word.
      const levels: PolicyGovernmentLevel[] = [];
      for (const level of row.levels ?? []) {
        if (!(POLICY_GOVERNMENT_LEVELS as readonly string[]).includes(level)) {
          rejections.push({
            pack: pack.pack,
            where: `issue "${row.key}" level "${level}"`,
            reason: `is not a level of government (${POLICY_GOVERNMENT_LEVELS.join(", ")}), so it was left off`,
          });
          continue;
        }
        if (!levels.includes(level)) levels.push(level);
      }
      issues.set(
        qualified,
        createPolicyIssueDefinition(
          qualified,
          domain.id,
          row.name,
          row.description,
          levels,
        ),
      );
      issuesByDomain.set(domainKey, (issuesByDomain.get(domainKey) ?? 0) + 1);
      propositionsByIssue.set(qualified, 0);
      mine.issues.push(qualified);
    }

    for (const row of pack.principles ?? []) {
      const problem = checkNamed(row, seenPrinciples, "principle");
      if (problem) {
        rejections.push({
          pack: pack.pack,
          where: `principle "${row.key}"`,
          reason: problem,
        });
        continue;
      }
      seenPrinciples.add(row.key);
      const qualified = qualifiedPolicyKey(pack.pack, row.key);
      principles.set(
        qualified,
        createPoliticalPrincipleDefinition(
          qualified,
          row.name,
          row.description,
        ),
      );
      mine.principles.push(qualified);
    }

    for (const row of pack.propositions ?? []) {
      const problem = checkNamed(
        { key: row.key, name: row.name },
        seenPropositions,
        "proposition",
      );
      if (problem) {
        rejections.push({
          pack: pack.pack,
          where: `proposition "${row.key}"`,
          reason: problem,
        });
        continue;
      }
      if (!row.question.trim()) {
        rejections.push({
          pack: pack.pack,
          where: `proposition "${row.key}"`,
          reason:
            "asks no question, and a proposition nobody can be for or against is not one",
        });
        continue;
      }
      const issueKey = resolveReference(pack.pack, row.issue);
      const issue = issues.get(issueKey);
      if (!issue) {
        rejections.push({
          pack: pack.pack,
          where: `proposition "${row.key}"`,
          reason: `names the issue "${issueKey}", which no pack loaded before it declares`,
        });
        continue;
      }
      // Resolved before the proposition is admitted, so a row naming a
      // principle nobody declares is rejected whole rather than admitted
      // with the relation quietly missing.
      const bearings: PropositionPrincipleBearing[] = [];
      let unknownPrinciple: string | null = null;
      for (const relation of row.principles ?? []) {
        const principleKey = resolveReference(pack.pack, relation.principle);
        const principle = principles.get(principleKey);
        if (!principle) {
          unknownPrinciple = principleKey;
          break;
        }
        bearings.push({
          principleId: principle.id,
          bearing: relation.bearing,
        });
      }
      if (unknownPrinciple !== null) {
        rejections.push({
          pack: pack.pack,
          where: `proposition "${row.key}"`,
          reason: `engages the principle "${unknownPrinciple}", which no pack loaded before it declares`,
        });
        continue;
      }
      seenPropositions.add(row.key);
      const qualified = qualifiedPolicyKey(pack.pack, row.key);
      propositions.set(
        qualified,
        createPolicyPropositionDefinition(
          qualified,
          issue.id,
          row.name,
          row.question,
          row.parameters ?? [],
          row.tags ?? [],
          bearings,
        ),
      );
      propositionsByIssue.set(
        issueKey,
        (propositionsByIssue.get(issueKey) ?? 0) + 1,
      );
      mine.propositions.push(qualified);
    }

    for (const row of pack.subjects ?? []) {
      const problem = checkNamed(row, seenSubjects, "subject");
      if (problem) {
        rejections.push({
          pack: pack.pack,
          where: `subject "${row.key}"`,
          reason: problem,
        });
        continue;
      }
      // A subject's scope says what kind of thing it is knowledge of, so the
      // scope decides where its reference has to resolve. A subject claiming
      // to be about an issue that does not exist is knowledge of nothing.
      let referenceId: string | null = null;
      if (row.scope === "technical") {
        if (row.about !== undefined) {
          rejections.push({
            pack: pack.pack,
            where: `subject "${row.key}"`,
            reason:
              "is technical and names something it is about; a technical subject refers to nothing",
          });
          continue;
        }
      } else {
        if (row.about === undefined) {
          rejections.push({
            pack: pack.pack,
            where: `subject "${row.key}"`,
            reason: `is scoped to a ${row.scope} and names none`,
          });
          continue;
        }
        const aboutKey = resolveReference(pack.pack, row.about);
        const target =
          row.scope === "domain"
            ? domains.get(aboutKey)
            : row.scope === "issue"
              ? issues.get(aboutKey)
              : propositions.get(aboutKey);
        if (!target) {
          rejections.push({
            pack: pack.pack,
            where: `subject "${row.key}"`,
            reason: `is about the ${row.scope} "${aboutKey}", which no pack loaded before it declares`,
          });
          continue;
        }
        referenceId = target.id;
      }
      seenSubjects.add(row.key);
      const qualified = qualifiedPolicyKey(pack.pack, row.key);
      subjects.set(
        qualified,
        createKnowledgeSubjectDefinition(
          qualified,
          row.name,
          row.description,
          row.scope,
          referenceId as KnowledgeSubjectDefinition["referenceId"],
          row.tags ?? [],
        ),
      );
      mine.subjects.push(qualified);
    }

    reports.push({
      pack: pack.pack,
      provenance: pack.provenance.kind,
      domains: mine.domains,
      issues: mine.issues,
      propositions: mine.propositions,
      subjects: mine.subjects,
      principles: mine.principles,
      registeredButUnused: [
        ...mine.domains.filter((key) => (issuesByDomain.get(key) ?? 0) === 0),
        ...mine.issues.filter(
          (key) => (propositionsByIssue.get(key) ?? 0) === 0,
        ),
      ],
    });
  }

  return {
    domains: [...domains.values()],
    issues: [...issues.values()],
    propositions: [...propositions.values()],
    subjects: [...subjects.values()],
    principles: [...principles.values()],
    report: { packs: reports, rejections },
  };
}

/** A report a person can read, for the load log and for a failing test. */
export function describePolicyLoad(report: PolicyLoadReport): string {
  const lines: string[] = [];
  for (const pack of report.packs) {
    lines.push(
      `${pack.pack} (${pack.provenance}): ${pack.domains.length} domain(s), ${pack.issues.length} issue(s), ${pack.propositions.length} proposition(s), ${pack.subjects.length} subject(s), ${pack.principles.length} principle(s)`,
    );
    for (const key of pack.registeredButUnused) {
      lines.push(`  ${key} — registered, and nothing sits under it`);
    }
  }
  for (const rejection of report.rejections) {
    lines.push(
      `REJECTED ${rejection.pack} ${rejection.where}: ${rejection.reason}`,
    );
  }
  if (lines.length === 0) lines.push("No policy packs loaded.");
  return lines.join("\n");
}
