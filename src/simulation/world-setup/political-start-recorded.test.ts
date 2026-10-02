import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  appendWorldConditions,
  politicalStartingConditions,
} from "./conditions";
import {
  calibrationRows,
  drawPoliticalLatents,
  generateContest,
  generatePoliticalStartingConditions,
  zeroPoliticalLatents,
} from "./political-start";
import type { CalibrationRow } from "./political-start";

const seed = "overflow3:a115:certified-opening:1";
const places = lifePlaceStateIdentities();
const place =
  places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;

const fixture = () => smallWorld({ place: place.usps, seed, people: 3 });

describe("opening seats retain their own certified evidence", () => {
  it("saves the certified congressional affiliations without seed-driven swings and reopens them", () => {
    expect(places).toHaveLength(56);
    const { world } = fixture();
    const generated = generatePoliticalStartingConditions(
      world,
      "near-reference",
    );
    const otherSeed = generatePoliticalStartingConditions(
      { ...world, seed: `${seed}:another-identity-seed` },
      "near-reference",
    );
    expect(generated.seats, `${place.usps}; seed ${seed}`).toEqual(
      otherSeed.seats,
    );
    expect(drawPoliticalLatents(world, "near-reference")).toEqual(
      zeroPoliticalLatents("near-reference"),
    );
    const rows = [
      ...calibrationRows("us-house"),
      ...calibrationRows("us-senate"),
    ];
    expect(generated.seats).toHaveLength(rows.length);
    for (const row of rows) {
      const seat = generated.seats.find(
        (entry) => entry.seatKey === row.contestKey,
      )!;
      expect(seat.affiliation, row.contestKey).toBe(row.referenceAffiliation);
      expect(seat.referenceWinner, row.contestKey).toBe(
        row.referenceAffiliation,
      );
      if (seat.baselineKind === "certified-two-party") {
        expect(seat.seatResidualPp).toBe(0);
        expect(seat.generatedShare).toBeCloseTo(
          row.democraticTwoPartyShare!,
          5,
        );
      }
    }
    const saved = appendWorldConditions(world, [generated]);
    const reopened = deserializeWorld(serializeWorld(saved));
    expect(politicalStartingConditions(reopened)).toEqual(
      politicalStartingConditions(saved),
    );
  });

  it("keeps an exact tied office's recorded affiliation and leaves an unrecorded winner unrecorded", () => {
    const { world } = fixture();
    const source = calibrationRows("us-house")[0]!;
    const tied: CalibrationRow = {
      ...source,
      democraticTwoPartyShare: 0.5,
      twoPartyMargin: 0,
      referenceAffiliation: "republican",
    };
    for (const worldSeed of [seed, `${seed}:other`]) {
      const current = { ...world, seed: worldSeed };
      const seat = generateContest(
        current,
        zeroPoliticalLatents("near-reference"),
        tied,
      );
      expect(seat.affiliation).toBe("republican");
      const unrecorded = generateContest(
        current,
        zeroPoliticalLatents("near-reference"),
        {
          ...tied,
          referenceAffiliation: null,
        },
      );
      expect(unrecorded.affiliation).toBe("unrecorded");
      expect(unrecorded.caucus).toBeNull();
    }
  });

  it("preserves an office-specific missing-margin record instead of borrowing another office's result", () => {
    const { world } = fixture();
    const source = calibrationRows("us-house").find(
      (row) => row.democraticTwoPartyShare === null,
    )!;
    const seat = generateContest(
      world,
      drawPoliticalLatents(world, "near-reference"),
      source,
    );
    expect(seat.affiliation).toBe(source.referenceAffiliation);
    expect(seat.generatedShare).toBeNull();
    expect(seat.uncertaintyReason).toBeTruthy();
  });
});
