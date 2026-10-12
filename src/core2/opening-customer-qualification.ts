/** Complete owning product evidence. Hashes bind representation, never authority. */
import { stableHash } from "../simulation/ids";
import type { Source } from "./types";

export const OPENING_CUSTOMER_QUALIFICATION_PREFIX =
  "openingCustomers.qualification:";
export interface OpeningCustomerProviderQualification {
  organizationId: string;
  serviceKey: string;
  jobIds: readonly string[];
  providerRecordIds: readonly string[];
  sources: readonly {
    recordId: string;
    kind: "job" | "recorded-provider";
    occupationClassification?: string;
    source: Source;
  }[];
}
export interface OpeningCustomerQualificationRecord extends OpeningCustomerProviderQualification {
  qualificationId: string;
}
export interface OpeningCustomerQualificationReference {
  qualificationId: string;
  organizationId: string;
  serviceKey: string;
  /** Complete original record digest; actual jobs and full Sources still own scope. */
  qualificationHash: string;
}
export interface OpeningCustomerInlineQualificationReference {
  agreementId: string;
  organizationId: string;
  serviceKey: string;
}
export type OpeningCustomerQualificationPlanReference =
  | OpeningCustomerQualificationReference
  | OpeningCustomerInlineQualificationReference;
export type OpeningCustomerAgreementQualification =
  OpeningCustomerProviderQualification | OpeningCustomerQualificationReference;

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
export function openingCustomerQualificationHash(
  record: OpeningCustomerQualificationRecord,
): string {
  return stableHash(canonical(record));
}
export function openingCustomerQualificationKey(id: string): string {
  return `${OPENING_CUSTOMER_QUALIFICATION_PREFIX}${id}`;
}
export function openingCustomerQualificationReference(
  record: OpeningCustomerQualificationRecord,
): OpeningCustomerQualificationReference {
  return {
    qualificationId: record.qualificationId,
    organizationId: record.organizationId,
    serviceKey: record.serviceKey,
    qualificationHash: openingCustomerQualificationHash(record),
  };
}
export function openingCustomerQualificationRecord(
  value: unknown,
): OpeningCustomerQualificationRecord {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid owning customer qualification record.");
  const row = value as OpeningCustomerQualificationRecord;
  const ids = [
    ...(Array.isArray(row.jobIds) ? row.jobIds : []),
    ...(Array.isArray(row.providerRecordIds) ? row.providerRecordIds : []),
  ];
  if (
    !row.qualificationId?.trim() ||
    !row.organizationId?.trim() ||
    !row.serviceKey?.trim() ||
    !Array.isArray(row.jobIds) ||
    !Array.isArray(row.providerRecordIds) ||
    !ids.length ||
    ids.some((id) => typeof id !== "string" || !id.trim()) ||
    new Set(ids).size !== ids.length ||
    !Array.isArray(row.sources) ||
    row.sources.length !== ids.length ||
    row.sources.some(
      (basis) =>
        !basis ||
        !ids.includes(basis.recordId) ||
        (basis.kind === "job"
          ? !row.jobIds.includes(basis.recordId)
          : basis.kind === "recorded-provider"
            ? !row.providerRecordIds.includes(basis.recordId)
            : true),
    ) ||
    new Set(row.sources.map((basis) => basis.recordId)).size !== ids.length
  )
    throw new Error("Invalid owning customer qualification record.");
  return row;
}
