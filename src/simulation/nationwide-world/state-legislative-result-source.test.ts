import { describe, expect, it } from "vitest";
import source from "../../../data/research/elections/state-legislative-district-results.json" with { type: "json" };
import { districtIdentityCatalog } from "../../districts/catalog";
import { makeIsoDate } from "../dates";
import { SeededRng } from "../rng";
import { stableHash } from "../ids";
import {
  recordedDistrictOpeningWinner,
  type DistrictResultSource,
} from "./state-legislative-result-source";

const seed = "o3:recorded-district-options";
const recordedSource: DistrictResultSource = source;
const eligible = recordedSource.records.filter((row) => {
  const dates = row.winners.map((winner) => winner.date);
  return (
    new Set(dates).size === dates.length &&
    new Set(row.winners.map((winner) => winner.partyCode)).size > 1
  );
});
const row =
  eligible[parseInt(stableHash(seed).slice(0, 8), 16) % eligible.length]!;
const district = districtIdentityCatalog().find(
  (candidate) =>
    candidate.stateUsps === row.stateUsps &&
    candidate.chamber === row.chamber &&
    !candidate.isUnassignedResidual,
)!;
// A fixture exercises binding semantics. This is not research evidence that
// these two different-vintage geographies actually align.
const fixture: DistrictResultSource = {
  records: [row],
  bindings: [
    {
      districtRecordId: district.recordId,
      districtVintage: district.vintage,
      memberOrdinal: 1,
      sourceSeatKey: row.key,
      boundaryEvidence: "TEST FIXTURE ONLY: explicit own-seat binding",
    },
  ],
};
const date = makeIsoDate("2026-01-05");

describe("recorded district opening options", () => {
  it("uses every primary certified current-plan binding without borrowing another district", () => {
    expect(source.bindings.length).toBeGreaterThan(0);
    for (const binding of source.bindings) {
      const identity = districtIdentityCatalog().find(
        (candidate) => candidate.recordId === binding.districtRecordId,
      )!;
      const record = source.records.find(
        (candidate) => candidate.key === binding.sourceSeatKey,
      )!;
      const result = recordedDistrictOpeningWinner(
        identity,
        binding.memberOrdinal,
        date,
        new SeededRng(seed),
      );
      expect(record.winners, binding.sourceSeatKey).toContainEqual(result);
      expect(result!.caseIds.length).toBeGreaterThan(0);
      expect(binding.boundaryEvidence).toContain("2024 election cycle");
      expect(record.stateUsps).toBe(identity.stateUsps);
      expect(record.chamber).toBe(identity.chamber);
    }
  });
  it("varies certified multi-cycle seats only among their actual own-district winners", () => {
    const competitive = recordedSource.records.filter(
      (record) =>
        recordedSource.bindings.some(
          (binding) => binding.sourceSeatKey === record.key,
        ) && new Set(record.winners.map((winner) => winner.partyCode)).size > 1,
    );
    expect(competitive.length).toBeGreaterThan(0);
    for (const record of competitive) {
      const binding = recordedSource.bindings.find(
        (candidate) => candidate.sourceSeatKey === record.key,
      )!;
      const identity = districtIdentityCatalog().find(
        (candidate) => candidate.recordId === binding.districtRecordId,
      )!;
      const parties = new Set<string>();
      for (let index = 0; index < 30; index += 1) {
        const winner = recordedDistrictOpeningWinner(
          identity,
          1,
          date,
          new SeededRng(`${seed}:primary:${index}`),
        )!;
        expect(record.winners, record.key).toContainEqual(winner);
        parties.add(winner.partyCode);
      }
      expect(parties.size, record.key).toBeGreaterThan(1);
    }
  });

  it("does not manufacture a binding from a district number or chamber total", () => {
    const unbound = districtIdentityCatalog().filter(
      (candidate) =>
        !candidate.isUnassignedResidual &&
        candidate.chamber !== "congressional" &&
        !source.bindings.some(
          (binding) => binding.districtRecordId === candidate.recordId,
        ),
    );
    const candidate =
      unbound[parseInt(stableHash(seed).slice(0, 8), 16) % unbound.length]!;
    expect(unbound.length).toBeGreaterThan(0);
    expect(
      recordedDistrictOpeningWinner(candidate, 1, date, new SeededRng(seed)),
    ).toBeNull();
  });

  it("selects only actual winners of the bound own seat, with reproducible per-world variation", () => {
    const selected = new Set<string>();
    for (let index = 0; index < 100; index += 1) {
      const worldSeed = `${seed}:${index}`;
      const winner = recordedDistrictOpeningWinner(
        district,
        1,
        date,
        new SeededRng(worldSeed),
        fixture,
      )!;
      expect(row.winners, `${row.key}; seed ${worldSeed}`).toContainEqual(
        winner,
      );
      expect(
        recordedDistrictOpeningWinner(
          district,
          1,
          date,
          new SeededRng(worldSeed),
          fixture,
        ),
      ).toEqual(winner);
      selected.add(winner.partyCode);
    }
    expect(selected.size).toBeGreaterThan(1);
  });

  it("one cycle stays exactly recorded and future cycles do not enter the pick", () => {
    const first = row.winners[0]!;
    const oneCycle = { ...fixture, records: [{ ...row, winners: [first] }] };
    for (let index = 0; index < 30; index += 1) {
      expect(
        recordedDistrictOpeningWinner(
          district,
          1,
          date,
          new SeededRng(`${seed}:${index}`),
          oneCycle,
        ),
      ).toEqual(first);
    }
    expect(
      recordedDistrictOpeningWinner(
        district,
        1,
        makeIsoDate(first.date),
        new SeededRng(seed),
        fixture,
      ),
    ).toEqual(first);
  });

  it("rejects a different seat, vintage, chamber, and ambiguous bindings", () => {
    expect(
      recordedDistrictOpeningWinner(
        district,
        2,
        date,
        new SeededRng(seed),
        fixture,
      ),
    ).toBeNull();
    const wrongVintage = {
      ...fixture,
      bindings: [{ ...fixture.bindings[0]!, districtVintage: "other-vintage" }],
    };
    expect(
      recordedDistrictOpeningWinner(
        district,
        1,
        date,
        new SeededRng(seed),
        wrongVintage,
      ),
    ).toBeNull();
    const wrongChamber = {
      ...fixture,
      records: [{ ...row, chamber: "congressional" }],
    };
    expect(
      recordedDistrictOpeningWinner(
        district,
        1,
        date,
        new SeededRng(seed),
        wrongChamber,
      ),
    ).toBeNull();
    const ambiguous = {
      ...fixture,
      bindings: [...fixture.bindings, ...fixture.bindings],
    };
    expect(
      recordedDistrictOpeningWinner(
        district,
        1,
        date,
        new SeededRng(seed),
        ambiguous,
      ),
    ).toBeNull();
  });

  it("does not turn multiple same-contest winners into an invented member ordering", () => {
    const ambiguous = {
      ...fixture,
      records: [{ ...row, winners: [...row.winners, row.winners[0]!] }],
    };
    expect(
      recordedDistrictOpeningWinner(
        district,
        1,
        date,
        new SeededRng(seed),
        ambiguous,
      ),
    ).toBeNull();
  });
});
