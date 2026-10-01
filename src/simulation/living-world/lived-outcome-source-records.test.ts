import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { appendCrisisRecord } from "../crisis/records";
import { coverageLossRecordsFor } from "../crisis/health-coverage";
import { addDays } from "../dates";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import type { EntityId, World } from "../types";
import { livedOutcomeSourceRecordsOf } from "./lived-outcome-source-records";

const seed = "overflow6-saved-coverage-records";
const places = lifePlaceStateIdentities();
const place =
  places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;

function recordCoverage(
  world: World,
  personId: EntityId,
  covered: boolean,
  effectiveAt = world.currentDate,
): World {
  return appendCrisisRecord(world, {
    kind: "health-coverage",
    stableKey: `coverage-fixture:${personId}:${world.history.nextSequence}`,
    effectiveAt,
    causalParentIds: [],
    visibility: "private",
    eventId: null,
    personId,
    program: "medicaid-expansion",
    covered,
    reasonKey: "authored:reader-fixture",
    stateKey: null,
    householdSize: 1,
    monthlyIncomeMinor: 0,
    monthlyWorkHours: null,
    hazardMultiplierMicros: 1_000_000,
    hazardFrom: null,
    hazardBasis: "Controlled saved-record fixture, not a health simulation.",
    basis: "Controlled coverage history for source-reader boundaries.",
  });
}

describe(`saved coverage spells (${place.jurisdictionKey}, seed ${seed})`, () => {
  it("reads only held coverage that ended, respects person/date, and reads the same facts after save/load", () => {
    expect(places).toHaveLength(56);
    const { world, personId } = smallWorld({
      place: place.jurisdictionKey,
      seed,
    });
    const neighborId = world.personOrder.find((id) => id !== personId)!;
    const neverCovered = recordCoverage(world, personId, false);
    expect(coverageLossRecordsFor(neverCovered, personId)).toEqual([]);
    const held = recordCoverage(neverCovered, personId, true);
    const on = addDays(world.currentDate, 1);
    const lost = recordCoverage({ ...held, currentDate: on }, personId, false);
    const rows = coverageLossRecordsFor(lost, personId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.effectiveAt).toBe(on);
    expect(coverageLossRecordsFor(lost, personId, world.currentDate)).toEqual(
      [],
    );
    expect(coverageLossRecordsFor(lost, neighborId)).toEqual([]);
    const repeatedFalse = recordCoverage(lost, personId, false);
    expect(coverageLossRecordsFor(repeatedFalse, personId)).toEqual(rows);
    const saved = JSON.parse(JSON.stringify(repeatedFalse)) as World;
    const before = JSON.stringify(saved);
    expect(livedOutcomeSourceRecordsOf(saved, personId)).toEqual([
      { kind: "coverage-lost", at: on, sourceRecordId: rows[0]!.id },
    ]);
    expect(JSON.stringify(saved)).toBe(before);
  });

  it("reads one loss per held spell when coverage is regained and lost again", () => {
    const { world, personId } = smallWorld({
      place: place.jurisdictionKey,
      seed,
    });
    const held = recordCoverage(world, personId, true);
    const firstDate = addDays(world.currentDate, 1);
    const firstLoss = recordCoverage(
      { ...held, currentDate: firstDate },
      personId,
      false,
    );
    const regainedDate = addDays(firstDate, 1);
    const regained = recordCoverage(
      { ...firstLoss, currentDate: regainedDate },
      personId,
      true,
    );
    const secondDate = addDays(regainedDate, 1);
    const secondLoss = recordCoverage(
      { ...regained, currentDate: secondDate },
      personId,
      false,
    );
    expect(
      coverageLossRecordsFor(secondLoss, personId).map(
        (row) => row.effectiveAt,
      ),
    ).toEqual([firstDate, secondDate]);
    expect(
      coverageLossRecordsFor(secondLoss, personId, regainedDate).map(
        (row) => row.effectiveAt,
      ),
    ).toEqual([firstDate]);
  });

  it("does not reveal a backdated loss before that record was saved", () => {
    const { world, personId } = smallWorld({
      place: place.jurisdictionKey,
      seed,
    });
    const held = recordCoverage(world, personId, true);
    const effectiveAt = addDays(world.currentDate, 1);
    const recordedAt = addDays(effectiveAt, 1);
    const late = recordCoverage(
      { ...held, currentDate: recordedAt },
      personId,
      false,
      effectiveAt,
    );
    expect(coverageLossRecordsFor(late, personId, effectiveAt)).toEqual([]);
    expect(
      coverageLossRecordsFor(late, personId, recordedAt).map(
        (row) => row.effectiveAt,
      ),
    ).toEqual([effectiveAt]);
  });

  it.todo(
    "rent renewal producer → saved raised terms → source adapter, with decrease/ended/non-renewal controls",
  );
  it.todo(
    "coverage/rent → existing scheduler → saved belief: requires admitted sizes and answering offices",
  );
  it.todo(
    "saved belief → actual vote count → grounded talk after Continue: requires admitted contracts and donor composition",
  );
});
