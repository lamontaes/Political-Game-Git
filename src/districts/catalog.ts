/**
 * Browser-safe district identity catalog.
 *
 * Generated from the locked political-districts corpus. Interior points are
 * not copied. Membership is never inferred from this file.
 */

import generated from "./identities.generated.json";
import type { DistrictIdentity } from "./types";
import { DISTRICT_IDENTITY_VINTAGE } from "./types";

interface GeneratedCatalog {
  readonly vintage: string;
  readonly asOf: string;
  readonly compilerVersion: string;
  readonly recordCount: number;
  readonly records: readonly DistrictIdentity[];
}

const catalog = generated as GeneratedCatalog;

if (catalog.vintage !== DISTRICT_IDENTITY_VINTAGE) {
  throw new Error(
    "District identity catalog vintage does not match the accepted Gazetteer vintage.",
  );
}

if (catalog.records.length !== catalog.recordCount) {
  throw new Error(
    "District identity catalog record count does not match its records.",
  );
}

export const DISTRICT_IDENTITY_CATALOG: readonly DistrictIdentity[] =
  catalog.records;

export function districtIdentityCatalog(): readonly DistrictIdentity[] {
  return DISTRICT_IDENTITY_CATALOG;
}
