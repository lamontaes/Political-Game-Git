import type {
  AcsHouseholdDonor,
  AcsHousingRecord,
  AcsPersonRecord,
  AcsStateDonorShard,
} from "./types";

export interface AcsPumsManifest {
  readonly state: string;
  readonly vintageYear: number;
  readonly product: string;
  readonly housingUrl: string;
  readonly personUrl: string;
  readonly retrievedAt: string;
  readonly housingHash: string;
  readonly personHash: string;
  readonly housingByteSize: number;
  readonly personByteSize: number;
  readonly rawHousingCount: number;
  readonly rawPersonCount: number;
  readonly retainedOrdinaryHouseholdCount: number;
  readonly compiledDonorCount: number;
}

export function compileAcsDonorShards(
  housingRecords: readonly AcsHousingRecord[],
  personRecords: readonly AcsPersonRecord[],
  manifest: AcsPumsManifest,
): { shards: AcsStateDonorShard[]; updatedManifest: AcsPumsManifest } {
  const households = new Map<
    string,
    { housing: AcsHousingRecord; persons: AcsPersonRecord[] }
  >();
  let retainedHouseholdCount = 0;

  for (const h of housingRecords) {
    // Only ordinary households (TYPEHUGQ=1)
    if (h.TYPEHUGQ === 1) {
      households.set(h.SERIALNO, { housing: h, persons: [] });
      retainedHouseholdCount++;
    }
  }

  for (const p of personRecords) {
    const household = households.get(p.SERIALNO);
    if (household) {
      household.persons.push(p);
    }
  }

  const shardsMap = new Map<string, AcsHouseholdDonor[]>();

  for (const donor of households.values()) {
    // Ensure SPORDER sorting for correctness
    donor.persons.sort((a, b) => a.SPORDER - b.SPORDER);

    // Group by STATE + PUMA
    const shardKey = `${donor.housing.STATE}_${donor.housing.PUMA}`;
    let shardList = shardsMap.get(shardKey);
    if (!shardList) {
      shardList = [];
      shardsMap.set(shardKey, shardList);
    }

    shardList.push({
      housing: donor.housing,
      persons: donor.persons,
    });
  }

  const shards: AcsStateDonorShard[] = [];
  for (const [key, donors] of shardsMap.entries()) {
    const [state, puma] = key.split("_");
    shards.push({
      state: state as string,
      puma: puma as string,
      donors,
    });
  }

  // Enforce Product Consistency
  if (manifest.product !== "1-Year") {
    throw new Error("Only 1-Year PUMS product is authorized.");
  }

  const updatedManifest: AcsPumsManifest = {
    ...manifest,
    rawHousingCount: housingRecords.length,
    rawPersonCount: personRecords.length,
    retainedOrdinaryHouseholdCount: retainedHouseholdCount,
    compiledDonorCount: households.size,
  };

  return { shards, updatedManifest };
}
