/** A modeled public paying link authorizes only the current owned work obligation. */
import { makeIsoDate } from "../simulation/dates";
import type { FinancePlanningSession } from "./finance-plan";
import type {
  OrganizationInput,
  PublicPayAuthorityInput,
  PublicWorkPayDue,
  Source,
  WorkResultInput,
} from "./types";

const commitmentIndexes = new WeakMap<
  PublicPayAuthorityInput,
  ReadonlySet<string>
>();

function identity(value: string): void {
  if (typeof value !== "string" || !value || value !== value.trim())
    throw new Error("Public pay requires canonical recorded identities.");
}

function sourceAvailable(source: Source, date: string): void {
  if (
    !source ||
    !["SOURCED", "ESTIMATED"].includes(source.tag) ||
    !source.citation?.trim() ||
    makeIsoDate(source.asOf) > date
  )
    throw new Error("Public pay requires available dated source evidence.");
}

function commitmentIndex(
  authority: PublicPayAuthorityInput,
): ReadonlySet<string> {
  const prior = commitmentIndexes.get(authority);
  if (prior) return prior;
  if (
    !Object.isFrozen(authority) ||
    !Object.isFrozen(authority.workCommitmentIds) ||
    !Object.isFrozen(authority.basisRecordIds) ||
    !Object.isFrozen(authority.source)
  )
    throw new Error(
      "Public pay authority must be an admitted immutable record.",
    );
  for (const value of [
    authority.id,
    authority.ownerId,
    authority.governmentKey,
    authority.jurisdictionId,
    ...authority.workCommitmentIds,
    ...authority.basisRecordIds,
  ])
    identity(value);
  const index = new Set(authority.workCommitmentIds);
  if (
    index.size !== authority.workCommitmentIds.length ||
    !authority.basisRecordIds.length ||
    new Set(authority.basisRecordIds).size !== authority.basisRecordIds.length
  )
    throw new Error(
      "Public pay authority has duplicate or missing owned references.",
    );
  commitmentIndexes.set(authority, index);
  return index;
}

/** Clone before any guarded read, so caller changes cannot rewrite the authority. */
export function admitPublicPayAuthority(
  input: PublicPayAuthorityInput | undefined,
  date: string,
): PublicPayAuthorityInput | undefined {
  if (!input) return undefined;
  sourceAvailable(input.source, date);
  const admitted = Object.freeze({
    ...input,
    workCommitmentIds: Object.freeze([...input.workCommitmentIds]),
    basisRecordIds: Object.freeze([...input.basisRecordIds]),
    source: Object.freeze({ ...input.source }),
  });
  commitmentIndex(admitted);
  return admitted;
}

function governmentIdentity(
  session: FinancePlanningSession,
  organization: OrganizationInput,
): { governmentKey: string; jurisdictionId: string } {
  const r = session.reads,
    facts = r.field(organization, "governmentFacts");
  if (!facts)
    throw new Error(
      "Public pay employer lacks its actual government identity.",
    );
  const kind = r.field(facts, "governmentKind"),
    jurisdictionId = r.field(facts, "governmentJurisdictionId"),
    recordedKey = r.field(facts, "governmentKey");
  identity(jurisdictionId);
  if (kind === "local-government") {
    identity(recordedKey);
    return { governmentKey: recordedKey, jurisdictionId };
  }
  if (kind === "jurisdiction")
    return { governmentKey: `jurisdiction:${jurisdictionId}`, jurisdictionId };
  throw new Error(
    "Public pay requires an actual supported government identity.",
  );
}

/** No employer name, deficit, projected salary or free-standing flag grants authority. */
export function resolvePublicWorkPayDue(
  session: FinancePlanningSession,
  input: WorkResultInput,
): PublicWorkPayDue | undefined {
  const r = session.reads,
    core = session.core,
    organizations = r.field(core, "organizations"),
    employer = r.mapGet(organizations, input.organizationId),
    commitment = r.mapGet(
      r.field(r.field(core, "work"), "commitments"),
      input.commitmentId,
    ),
    authority = employer ? r.field(employer, "publicPayAuthority") : undefined,
    authorityId = commitment
      ? r.field(commitment, "publicPayAuthorityId")
      : undefined;
  if (!authority && authorityId === undefined) return undefined;
  if (
    !employer ||
    !commitment ||
    !authority ||
    authorityId !== r.field(authority, "id") ||
    !commitmentIndex(authority).has(input.commitmentId) ||
    r.field(commitment, "organizationId") !== input.organizationId ||
    r.field(commitment, "personId") !== input.personId ||
    r.field(commitment, "jobId") !== input.jobId ||
    input.date !== session.date ||
    !Number.isSafeInteger(input.requestedMinor) ||
    input.requestedMinor < session.zero
  )
    throw new Error(
      "Public pay does not match its actual owned work obligation.",
    );
  r.field(authority, "workCommitmentIds");
  r.field(authority, "basisRecordIds");
  const governmentKey = r.field(authority, "governmentKey"),
    jurisdictionId = r.field(authority, "jurisdictionId"),
    ownerId = r.field(authority, "ownerId"),
    owner = r.mapGet(organizations, ownerId),
    employerIdentity = governmentIdentity(session, employer);
  if (!owner || r.field(owner, "id") !== ownerId)
    throw new Error(
      "Public pay outside owner is absent or has changed identity.",
    );
  const ownerIdentity = governmentIdentity(session, owner),
    outsideSource = r.field(owner, "outsideFlow"),
    authoritySource = r.field(authority, "source");
  if (
    !outsideSource ||
    r.field(owner, "liquidMinor") !== session.zero ||
    employerIdentity.governmentKey !== governmentKey ||
    ownerIdentity.governmentKey !== governmentKey ||
    employerIdentity.jurisdictionId !== jurisdictionId ||
    ownerIdentity.jurisdictionId !== jurisdictionId
  )
    throw new Error(
      "Public pay requires the actual matching zero-stock outside owner.",
    );
  r.payload(outsideSource, session.zero, session.one);
  r.payload(authoritySource, session.zero, session.one);
  sourceAvailable(outsideSource, session.date);
  sourceAvailable(authoritySource, session.date);
  const cfg = r.field(r.field(core, "data"), "work");
  if (!cfg) throw new Error("Public pay requires its owning work data.");
  const kinds = r.field(cfg, "journalSourceKinds"),
    kind = r.field(kinds, "publicPayDue"),
    prefix = r.field(cfg, "publicPayDueIdPrefix"),
    citation = r.field(cfg, "publicPayDueCitation");
  identity(kind);
  identity(prefix);
  if (!citation?.trim())
    throw new Error("Public pay due provenance is absent.");
  return Object.freeze({
    kind,
    id: prefix + input.id,
    date: session.date,
    authorityId: authority.id,
    ownerId,
    organizationId: input.organizationId,
    commitmentId: input.commitmentId,
    jobId: input.jobId,
    personId: input.personId,
    amountMinor: input.requestedMinor,
    source: Object.freeze({
      ...authoritySource,
      asOf: session.date,
      citation: authoritySource.citation + " " + citation,
    }),
  });
}

/** Fund this wage only; an absence or a deficit in another obligation pays nothing. */
export function preparePublicWorkPay(
  session: FinancePlanningSession,
  due: PublicWorkPayDue | undefined,
): void {
  if (!due) return;
  session.cash.authorizeOutside(due.ownerId, { kind: due.kind, id: due.id });
  if (due.ownerId !== due.organizationId && due.amountMinor > session.zero) {
    const paid = session.cash.move(
      due.ownerId,
      due.organizationId,
      due.amountMinor,
      due.id + ":fund-recorded-wage",
    );
    if (paid !== due.amountMinor)
      throw new Error(
        "Public wage funding differs from its actual dated obligation.",
      );
  }
}
