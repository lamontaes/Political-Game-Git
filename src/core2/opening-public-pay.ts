/** Opening-only modeled public pay links. No cash writer or salary projection. */
import { makeIsoDate } from "../simulation/dates";
import { stableHash } from "../simulation/ids";
import type { PublicGovernmentIdentity } from "../simulation/types";
import { parameter, PARAMETERS, type Parameter } from "./parameters";
import type {
  CoreInput,
  OrganizationInput,
  PublicPayAuthorityInput,
  Source,
  WorkCommitmentInput,
} from "./types";

export const OPENING_PUBLIC_PAY_STOPGAP = "SG-P8-public-payroll-due-flow";

/** The producer preserves the actual profile/historical identity witness. */
export interface OpeningPublicEmployerIdentity {
  organizationId: string;
  identity: PublicGovernmentIdentity;
  basisRecordIds: readonly string[];
  source: Source;
}

/** The root-owned API9 shape is the single public authority contract. */
export type OpeningPublicPayAuthority = PublicPayAuthorityInput;

export interface OpeningPublicPayOptions {
  parameters?: Readonly<Record<string, Parameter>>;
  /** A recorded canonical account designation, never an employer-name match. */
  ownerIdByGovernmentKey?: Readonly<Record<string, string>>;
}

type OpeningPayInput = Pick<
  CoreInput,
  "startedAt" | "people" | "jobs" | "organizations" | "workCommitments"
>;
type LinkedOrganization = OrganizationInput & {
  publicPayAuthority?: OpeningPublicPayAuthority;
};
type LinkedCommitment = WorkCommitmentInput & {
  publicPayAuthorityId?: string;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, row]) => row !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, row]) => `${JSON.stringify(key)}:${canonical(row)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}

/**
 * Only fresh zero-stock organizations with an actual recorded identity enter
 * this bridge. Work terms retain their own amounts, schedules and Sources.
 * The public authority describes a modeled due-flow role, not an enacted
 * appropriation. Public/national modules replace that open source gap.
 */
export function prepareOpeningPublicPayAuthorities(
  input: OpeningPayInput,
  identities: readonly OpeningPublicEmployerIdentity[],
  options: OpeningPublicPayOptions = {},
): {
  organizations: readonly LinkedOrganization[];
  workCommitments: readonly LinkedCommitment[];
  authorities: readonly OpeningPublicPayAuthority[];
  outsideOwnerIds: readonly string[];
  gaps: readonly string[];
} {
  const zero = parameter("zero", options.parameters ?? PARAMETERS);
  const at = makeIsoDate(input.startedAt);
  const unique = <T extends { id: string }>(
    rows: readonly T[],
    field: string,
  ) => {
    const result = new Map<string, T>();
    for (const row of rows) {
      if (!row.id.trim() || result.has(row.id))
        throw new Error(`Duplicate public pay ${field}: ${row.id}`);
      result.set(row.id, row);
    }
    return result;
  };
  const organizations = unique(input.organizations, "organization");
  const people = unique(input.people, "person");
  const jobs = unique(input.jobs, "job");
  const commitments = unique(input.workCommitments ?? [], "commitment");
  const sourceValid = (source: Source, field: string) => {
    if (
      !source ||
      !["SOURCED", "ESTIMATED"].includes(source.tag) ||
      !source.citation?.trim() ||
      makeIsoDate(source.asOf) > at
    )
      throw new Error(`Invalid dated public pay source: ${field}`);
  };
  const identityByEmployer = new Map<string, OpeningPublicEmployerIdentity>();
  const groups = new Map<string, OpeningPublicEmployerIdentity[]>();
  const gaps = new Set<string>();
  for (const record of identities) {
    const employer = organizations.get(record.organizationId);
    const identity = record.identity;
    const facts = employer?.governmentFacts;
    sourceValid(record.source, record.organizationId);
    if (
      !employer ||
      !identity ||
      !["local-government", "jurisdiction"].includes(identity.kind) ||
      !identity.jurisdictionId?.trim() ||
      !record.basisRecordIds.length ||
      record.basisRecordIds.some((id) => !id.trim()) ||
      new Set(record.basisRecordIds).size !== record.basisRecordIds.length ||
      facts?.governmentKind !== identity.kind ||
      facts.governmentJurisdictionId !== identity.jurisdictionId ||
      (identity.kind === "local-government" &&
        (!identity.governmentKey.trim() ||
          facts.governmentKey !== identity.governmentKey))
    )
      throw new Error(
        `Public pay identity does not match actual employer: ${record.organizationId}`,
      );
    // Jurisdiction-scoped records are a canonical modeled identity, never an
    // assertion that an unnamed municipality owns every local public employer.
    const governmentKey =
      identity.kind === "local-government"
        ? identity.governmentKey
        : `jurisdiction:${identity.jurisdictionId}`;
    const previous = identityByEmployer.get(employer.id);
    if (previous) {
      if (canonical(previous) !== canonical(record))
        throw new Error(`Conflicting public pay identity: ${employer.id}`);
      continue;
    }
    identityByEmployer.set(employer.id, record);
    const rows = groups.get(governmentKey) ?? [];
    if (
      rows.some(
        (row) => row.identity.jurisdictionId !== identity.jurisdictionId,
      )
    )
      throw new Error(
        `Conflicting public pay government jurisdiction: ${governmentKey}`,
      );
    rows.push(record);
    groups.set(governmentKey, rows);
  }
  const commitmentsByEmployer = new Map<string, WorkCommitmentInput[]>();
  for (const commitment of commitments.values()) {
    if (!identityByEmployer.has(commitment.organizationId)) continue;
    const job = jobs.get(commitment.jobId);
    const person = people.get(commitment.personId);
    if (
      !job ||
      !person ||
      job.organizationId !== commitment.organizationId ||
      job.personId !== commitment.personId ||
      person.jobId !== job.id ||
      (job.endsAt !== undefined && makeIsoDate(job.endsAt) <= at)
    )
      throw new Error(
        `Public pay commitment lacks actual employer/job/person: ${commitment.id}`,
      );
    sourceValid(commitment.paySource, commitment.id);
    sourceValid(commitment.scheduleSource, commitment.id);
    sourceValid(job.source, job.id);
    const rows = commitmentsByEmployer.get(commitment.organizationId) ?? [];
    rows.push(commitment);
    commitmentsByEmployer.set(commitment.organizationId, rows);
  }
  const linkedOrganizations = new Map<string, LinkedOrganization>(
    organizations,
  );
  const linkedCommitments = new Map<string, LinkedCommitment>(commitments);
  const authorities: OpeningPublicPayAuthority[] = [];
  const outsideOwnerIds: string[] = [];
  for (const [governmentKey, records] of [...groups.entries()].sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const sorted = [...records].sort((left, right) =>
      left.organizationId.localeCompare(right.organizationId),
    );
    const designated = options.ownerIdByGovernmentKey?.[governmentKey];
    const ownerRecord = designated
      ? sorted.find((record) => record.organizationId === designated)
      : sorted[zero];
    if (!ownerRecord)
      throw new Error(
        `Public pay owner designation does not match actual government: ${governmentKey}`,
      );
    const owner = organizations.get(ownerRecord.organizationId)!;
    if (owner.liquidMinor !== zero)
      throw new Error(
        `Public outside owner must already have zero stock: ${owner.id}`,
      );
    const flowSource: Source = Object.freeze({
      tag: "ESTIMATED",
      asOf: at,
      citation: `${ownerRecord.source.citation} ${OPENING_PUBLIC_PAY_STOPGAP}`,
      generationPriorVintage: ownerRecord.source.generationPriorVintage,
      estimatedFrom:
        "One modeled zero-stock outside paying authority for the actual recorded government identity. Only source-owned genuine current attended-work or admitted procurement obligations may debit outside net flow. This Source does not establish actual 2021 legal employment authority, appropriation, Treasury cash, local taxation or supplier demand; the public-budget/national modules must replace it.",
    });
    const ownerCurrent = linkedOrganizations.get(owner.id)!;
    if (
      ownerCurrent.outsideFlow &&
      canonical(ownerCurrent.outsideFlow) !== canonical(flowSource)
    )
      throw new Error(`Conflicting public outside-flow role: ${owner.id}`);
    linkedOrganizations.set(owner.id, {
      ...ownerCurrent,
      outsideFlow: flowSource,
    });
    outsideOwnerIds.push(owner.id);
    for (const record of sorted) {
      const employer = linkedOrganizations.get(record.organizationId)!;
      if (employer.liquidMinor !== zero)
        throw new Error(
          `Fresh public employer must already have zero stock: ${employer.id}`,
        );
      const ownedCommitments = [
        ...(commitmentsByEmployer.get(employer.id) ?? []),
      ].sort((left, right) => left.id.localeCompare(right.id));
      const id = `opening-public-pay:${stableHash(
        canonical([employer.id, governmentKey, record.identity.jurisdictionId]),
      )}`;
      const authoritySource: Source = Object.freeze({
        tag: "ESTIMATED",
        asOf: at,
        citation: `${record.source.citation} ${OPENING_PUBLIC_PAY_STOPGAP}`,
        generationPriorVintage: record.source.generationPriorVintage,
        estimatedFrom:
          "The actual recorded employer/government identity and existing worker-owned commitments establish this modeled public paying link. The current canonical work result supplies attended minutes, hourly terms, due date and fractional carry. No copied salary amount/calendar, projected payroll, enacted appropriation, opening capital or automatic external payment authority is supplied.",
      });
      const authority: OpeningPublicPayAuthority = Object.freeze({
        id,
        ownerId: owner.id,
        governmentKey,
        jurisdictionId: record.identity.jurisdictionId,
        workCommitmentIds: Object.freeze(ownedCommitments.map((row) => row.id)),
        basisRecordIds: Object.freeze([...record.basisRecordIds].sort()),
        source: authoritySource,
      });
      if (
        employer.publicPayAuthority &&
        canonical(employer.publicPayAuthority) !== canonical(authority)
      )
        throw new Error(`Conflicting public pay authority: ${employer.id}`);
      linkedOrganizations.set(employer.id, {
        ...employer,
        publicPayAuthority: authority,
      });
      for (const commitment of ownedCommitments) {
        const previous = linkedCommitments.get(commitment.id)!;
        if (
          previous.publicPayAuthorityId !== undefined &&
          previous.publicPayAuthorityId !== id
        )
          throw new Error(
            `Conflicting public commitment authority: ${commitment.id}`,
          );
        linkedCommitments.set(commitment.id, {
          ...previous,
          publicPayAuthorityId: id,
        });
      }
      authorities.push(authority);
      gaps.add(
        `opening-public-pay:modeled-due-flow-needs-public-budget-authority:${employer.id}`,
      );
    }
  }
  for (const organization of input.organizations)
    if (
      organization.governmentFacts &&
      !identityByEmployer.has(organization.id)
    )
      gaps.add(
        `opening-public-pay:actual-employer-owner-link-unresolved:${organization.id}`,
      );
  return {
    organizations: input.organizations.map((row) =>
      linkedOrganizations.get(row.id)!,
    ),
    workCommitments: (input.workCommitments ?? []).map((row) =>
      linkedCommitments.get(row.id)!,
    ),
    authorities: Object.freeze(authorities),
    outsideOwnerIds: Object.freeze(outsideOwnerIds),
    gaps: [...gaps].sort(),
  };
}
