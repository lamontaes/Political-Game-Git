import { describe, expect, it } from "vitest";
import {
  FDIC_SMALL_BANK_RECORDS,
  FDIC_SMALL_BANK_SHAPES,
} from "../../simulation/living-world/town-bank-shapes.generated";
import "../../../tests/fixtures/small-world";
import "../../simulation/ids";
import "../../simulation/world";
import "../../simulation/future-transitions";
import "../../simulation/resources";
import "../../simulation/serialization";
import "../../simulation/world-setup/conditions";
import "../../simulation/macro-economy";
import "../../simulation/macro-economy/producer";
import "../../simulation/living-world/town-employment";
import {
  recordedBankShape as legacyRecordedBankShape,
  uninsuredDepositShare as legacyUninsuredDepositShare,
} from "../../simulation/living-world/town-finances";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import {
  nearestBankProfileFromFacts,
  uninsuredDepositShareFromFacts,
  type ObservedBankProfileFact,
} from "./bank-profile";

const nationalRecords = Object.keys(FDIC_SMALL_BANK_SHAPES)
  .sort()
  .flatMap((state) => FDIC_SMALL_BANK_RECORDS[state]!);
const nationalShapes = Object.keys(FDIC_SMALL_BANK_SHAPES)
  .sort()
  .flatMap((state) => FDIC_SMALL_BANK_SHAPES[state]!.split(";"));

function recordsForPlace(usps: string): {
  state: string | null;
  records: readonly [number, number][];
  shapes: readonly string[];
} {
  const records = FDIC_SMALL_BANK_RECORDS[usps];
  const localShapes = FDIC_SMALL_BANK_SHAPES[usps];
  if (records && localShapes && records.length >= 5) {
    return { state: usps, records, shapes: localShapes.split(";") };
  }
  return { state: null, records: nationalRecords, shapes: nationalShapes };
}

function poolForPlace(usps: string): ObservedBankProfileFact[] {
  const source = recordsForPlace(usps);
  const pool = source.records.map(([assetsThousands, certificate], index) => {
    const [cushion, otherAssets] = source.shapes[index]!.split(",").map(Number);
    return {
      state: source.state,
      index,
      certificate,
      assetsThousands,
      cushion: cushion!,
      otherAssets: otherAssets!,
    };
  });
  return pool.sort(
    (left, right) =>
      left.assetsThousands - right.assetsThousands ||
      left.certificate - right.certificate,
  );
}

describe("FDIC bank profile rules", () => {
  it.each(lifePlaceStateIdentities())(
    "matches recorded FDIC profile selection and uninsured share in $jurisdictionKey",
    ({ usps }) => {
      const { state, records, shapes } = recordsForPlace(usps);
      const pool = poolForPlace(usps);
      const assets = records.map(([asset]) => asset).sort((a, b) => a - b);
      const targets = [
        assets[0]!,
        assets.at(-1)!,
        (assets[0]! + assets[1]!) / 2,
      ];
      for (const target of targets) {
        const legacy = legacyRecordedBankShape(state, target * 1000);
        const selected = nearestBankProfileFromFacts(pool, target * 1000);
        expect(selected).toEqual(legacy);
        const localShares =
          state === null
            ? null
            : shapes.map((row) => Number(row.split(",")[2]));
        const nationalShares = nationalShapes.map((row) =>
          Number(row.split(",")[2]),
        );
        expect(
          uninsuredDepositShareFromFacts(selected, localShares, nationalShares),
        ).toBe(legacyUninsuredDepositShare(legacy));
      }
    },
  );
});
