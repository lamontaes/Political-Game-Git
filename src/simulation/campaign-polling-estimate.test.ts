import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { congressSeats } from "./living-world/congress-seats";
import { stateCandidacyPack } from "./candidacy-packs";
import { US_STATE_USPS } from "./nationwide-world/state-executive-candidacy-packs";
import {
  STATE_LEGISLATURE_KEYS,
  stateLegislativeSeats,
} from "./nationwide-world/state-legislature-opening";
import { stateSeatDemocraticShare } from "./nationwide-world/state-legislature-candidates";
import { calibrationRows } from "./world-setup/political-start";
import { politicalStartingConditions } from "./world-setup/conditions";
import type { GeneratedSeatCondition } from "./world-setup/types";
import { serializeWorld } from "./serialization";
import * as campaigns from "./campaigns";
import * as support from "./campaign-support";
import {
  campaignDistrictPollingEstimate,
  campaignStateDistrictPollingEstimate,
  type CampaignPollingEstimate,
} from "./campaign-polling-estimate";
import type { World } from "./types";

const identities = congressSeats();
const seen = new Set<string>();
const samples = Array.from({ length: 2 }, (_, index) => {
  const seed = `campaign-estimate-all56-${index}`;
  const place = drawRandomPlace(seed, (candidate) => {
    const key = candidate.stateJurisdictionKey;
    return (
      key !== null &&
      key !== undefined &&
      !seen.has(key) &&
      US_STATE_USPS.some((usps) => key === `US-${usps}`) &&
      calibrationRows("us-house").filter(
        (row) =>
          `US-${row.stateUsps}` === key && row.democraticTwoPartyShare !== null,
      ).length >= 2
    );
  });
  seen.add(place.stateJurisdictionKey!);
  const fixture = smallWorld({
    place: place.key,
    seed,
    offices: ["state-legislature"],
  });
  return { ...fixture, seed };
});

function replaceCongressRows(
  world: World,
  rows: readonly GeneratedSeatCondition[],
): World {
  const conditions = politicalStartingConditions(world)!;
  return {
    ...world,
    history: {
      ...world.history,
      worldConditions: world.history.worldConditions!.map((record) =>
        record.id === conditions.id &&
        record.kind === "political-starting-conditions"
          ? { ...record, seats: rows }
          : record,
      ),
    },
  };
}

function expectSummary(
  estimate: CampaignPollingEstimate,
  values: readonly number[],
) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  expect(estimate.democraticShare).toBeCloseTo(mean, 14);
  expect(estimate.standardDeviation).toBeCloseTo(Math.sqrt(variance), 14);
  expect(estimate.minimum).toBe(Math.min(...values));
  expect(estimate.maximum).toBe(Math.max(...values));
  expect(estimate.label).toBe("Estimate, no poll of your own yet");
  expect(Object.keys(estimate).sort()).toEqual([
    "comparison",
    "democraticShare",
    "label",
    "maximum",
    "minimum",
    "peers",
    "standardDeviation",
  ]);
}

afterEach(() => vi.restoreAllMocks());

describe("campaign estimates use this save's district records", () => {
  for (const sample of samples) {
    const { world, stateUsps, seed } = sample;
    const target = identities.find(
      (seat) => seat.chamberKey === "us-house" && seat.stateUsps === stateUsps,
    )!;

    it(`averages saved same-state House peers with their condition provenance in ${stateUsps} (${seed})`, () => {
      const conditions = politicalStartingConditions(world)!;
      const before = serializeWorld(world);
      const expected = conditions.seats
        .filter((row) => {
          const identity = identities.find(
            (seat) => seat.seatKey === row.seatKey,
          );
          return (
            identity?.chamberKey === "us-house" &&
            identity.stateUsps === stateUsps &&
            row.baselineKind === "certified-two-party" &&
            row.generatedShare !== null &&
            Number.isFinite(row.generatedShare) &&
            row.generatedShare >= 0 &&
            row.generatedShare <= 1
          );
        })
        .map((row) => ({
          seatKey: row.seatKey,
          sourceEntityId: conditions.id,
          referenceDate: conditions.effectiveDate,
          democraticShare: row.generatedShare!,
        }))
        .sort((a, b) => a.seatKey.localeCompare(b.seatKey));
      expect(expected.length).toBeGreaterThan(0);
      const estimate = campaignDistrictPollingEstimate(world, target.seatKey);
      expect(estimate.comparison).toBe("same-state-and-chamber");
      expect(estimate.peers).toEqual(expected);
      expectSummary(
        estimate,
        expected.map((peer) => peer.democraticShare),
      );
      expect(serializeWorld(world)).toBe(before);
    });

    it(`changes its mean and population spread when saved peers change in ${stateUsps}`, () => {
      const conditions = politicalStartingConditions(world)!;
      const local = conditions.seats.filter(
        (row) =>
          row.baselineKind === "certified-two-party" &&
          identities.some(
            (seat) =>
              seat.seatKey === row.seatKey &&
              seat.stateUsps === stateUsps &&
              seat.chamberKey === "us-house",
          ),
      );
      expect(local.length).toBeGreaterThanOrEqual(2);
      const controlled = replaceCongressRows(
        world,
        local.slice(0, 2).map((row, index) => ({
          ...row,
          generatedShare: index === 0 ? 0.2 : 0.8,
        })),
      );
      const first = campaignDistrictPollingEstimate(controlled, target.seatKey);
      expect(first.democraticShare).toBeCloseTo(0.5, 14);
      expect(first.standardDeviation).toBeCloseTo(0.3, 14);
      expect(first.minimum).toBe(0.2);
      expect(first.maximum).toBe(0.8);
      const changed = replaceCongressRows(
        controlled,
        local.slice(0, 2).map((row) => ({ ...row, generatedShare: 0.7 })),
      );
      const second = campaignDistrictPollingEstimate(changed, target.seatKey);
      expect(second.democraticShare).toBeCloseTo(0.7, 14);
      expect(second.standardDeviation).toBe(0);
      expect(second.democraticShare).not.toBe(first.democraticShare);
      expect(
        second.peers.every((peer) => peer.sourceEntityId === conditions.id),
      ).toBe(true);
    });

    it(`uses broader House peers only when valid same-state shares are absent in ${stateUsps}`, () => {
      const conditions = politicalStartingConditions(world)!;
      const remote = conditions.seats.filter(
        (row) =>
          row.baselineKind === "certified-two-party" &&
          identities.some(
            (seat) =>
              seat.seatKey === row.seatKey &&
              seat.stateUsps !== stateUsps &&
              seat.chamberKey === "us-house",
          ),
      );
      const senate = conditions.seats.find((row) =>
        identities.some(
          (seat) =>
            seat.seatKey === row.seatKey && seat.chamberKey === "us-senate",
        ),
      )!;
      const targetRow = conditions.seats.find(
        (row) => row.seatKey === target.seatKey,
      )!;
      const valid = remote.slice(0, 3).map((row, index) => ({
        ...row,
        generatedShare: [0.1, 0.3, 0.8][index]!,
      }));
      const invalid = remote.slice(3, 7).map((row, index) => ({
        ...row,
        generatedShare: [null, Number.NaN, -0.1, 1.1][index]!,
      }));
      const controlled = replaceCongressRows(world, [
        ...valid,
        ...invalid,
        { ...targetRow, generatedShare: null },
        {
          ...remote[7]!,
          baselineKind: "reference-affiliation-preserved",
          generatedShare: 0.99,
        },
        { ...senate, generatedShare: 0.99 },
        { ...targetRow, seatKey: "test:unknown-seat", generatedShare: 0.99 },
      ]);
      const estimate = campaignDistrictPollingEstimate(
        controlled,
        target.seatKey,
      );
      expect(estimate.comparison).toBe("same-chamber");
      expect(estimate.peers.map((peer) => peer.seatKey)).toEqual(
        valid.map((row) => row.seatKey).sort(),
      );
      expectSummary(estimate, [0.1, 0.3, 0.8]);
      const localPresent = replaceCongressRows(
        controlled,
        [
          ...politicalStartingConditions(controlled)!.seats,
          {
            ...targetRow,
            baselineKind: "certified-two-party" as const,
            generatedShare: 0.4,
          },
        ].filter(
          (row) =>
            row.seatKey !== target.seatKey || row.generatedShare !== null,
        ),
      );
      const localEstimate = campaignDistrictPollingEstimate(
        localPresent,
        target.seatKey,
      );
      expect(localEstimate.comparison).toBe("same-state-and-chamber");
      expect(localEstimate.peers).toHaveLength(1);
      expectSummary(localEstimate, [0.4]);
    });

    it(`reads actual state chamber tags and exact opening-event provenance in ${stateUsps}`, () => {
      const pack = stateCandidacyPack(`US-${stateUsps}`)!;
      const seats = stateLegislativeSeats(world, pack.packId);
      const officeKey = seats[0]!.officeKey;
      const opening = world.history.events.find(
        (event) =>
          event.stableKey === STATE_LEGISLATURE_KEYS.opening(pack.packId),
      )!;
      const expected = seats
        .filter((seat) => seat.officeKey === officeKey)
        .flatMap((seat) => {
          const share = stateSeatDemocraticShare(
            world,
            pack.packId,
            officeKey,
            seat.ordinal,
          );
          return share === null
            ? []
            : [
                {
                  seatKey: `${pack.packId}|${officeKey}|${seat.ordinal}`,
                  sourceEntityId: opening.id,
                  referenceDate: opening.occurredAt,
                  democraticShare: share,
                },
              ];
        })
        .sort((a, b) => a.seatKey.localeCompare(b.seatKey));
      const estimate = campaignStateDistrictPollingEstimate(
        world,
        pack.packId,
        officeKey,
      );
      if (expected.length) {
        expect(estimate.comparison).toBe("same-pack-and-office");
        expect(estimate.peers).toEqual(expected);
        expectSummary(
          estimate,
          expected.map((peer) => peer.democraticShare),
        );
      } else {
        const congressional = campaignDistrictPollingEstimate(
          world,
          target.seatKey,
        );
        expect(estimate).toEqual({
          ...congressional,
          comparison: "same-state-congress-districts",
        });
        expectSummary(
          estimate,
          congressional.peers.map((peer) => peer.democraticShare),
        );
      }
      // A stray tag has no saved seat behind it, so it must not become a peer.
      const tagged: World = {
        ...world,
        history: {
          ...world.history,
          events: world.history.events.map((event) =>
            event.id === opening.id
              ? {
                  ...event,
                  tags: [
                    ...event.tags,
                    `seat-share:${officeKey}|999999|0.999999`,
                  ],
                }
              : event,
          ),
        },
      };
      expect(
        campaignStateDistrictPollingEstimate(tagged, pack.packId, officeKey),
      ).toEqual(estimate);
      const selectedSeats = seats
        .filter((seat) => seat.officeKey === officeKey)
        .slice(0, 3);
      expect(selectedSeats).toHaveLength(3);
      const altered: World = {
        ...world,
        history: {
          ...world.history,
          events: world.history.events.map((event) =>
            event.id === opening.id
              ? {
                  ...event,
                  tags: [
                    ...event.tags.filter(
                      (tag) => !tag.startsWith(`seat-share:${officeKey}|`),
                    ),
                    ...selectedSeats.map(
                      (seat, index) =>
                        `seat-share:${officeKey}|${seat.ordinal}|${[0.2, 0.4, 0.8][index]}`,
                    ),
                  ],
                }
              : event,
          ),
        },
      };
      const alteredEstimate = campaignStateDistrictPollingEstimate(
        altered,
        pack.packId,
        officeKey,
      );
      expect(alteredEstimate.comparison).toBe("same-pack-and-office");
      expect(alteredEstimate.peers).toHaveLength(3);
      expect(alteredEstimate.peers.map((peer) => peer.seatKey)).toEqual(
        selectedSeats
          .map((seat) => `${pack.packId}|${officeKey}|${seat.ordinal}`)
          .sort(),
      );
      expectSummary(alteredEstimate, [0.2, 0.4, 0.8]);
      expect(
        alteredEstimate.peers.every(
          (peer) =>
            peer.sourceEntityId === opening.id &&
            peer.referenceDate === opening.occurredAt,
        ),
      ).toBe(true);
    });
  }

  it("does not query canonical candidate support or call district records polling respondents", () => {
    const sample = samples[0]!;
    const target = identities.find(
      (seat) =>
        seat.stateUsps === sample.stateUsps && seat.chamberKey === "us-house",
    )!;
    const canonical = vi
      .spyOn(campaigns, "canonicalSupportBasisPoints")
      .mockImplementation(() => {
        throw new Error("Canonical support must not supply the estimate.");
      });
    const latest = vi
      .spyOn(support, "latestSupportState")
      .mockImplementation(() => {
        throw new Error(
          "Canonical support state must not supply the estimate.",
        );
      });
    const estimate = campaignDistrictPollingEstimate(
      sample.world,
      target.seatKey,
    );
    const withoutMetrics: World = {
      ...sample.world,
      history: {
        ...sample.world.history,
        metricStates: [],
        metricObservations: [],
      },
    };
    expect(
      campaignDistrictPollingEstimate(withoutMetrics, target.seatKey),
    ).toEqual(estimate);
    expect(canonical).not.toHaveBeenCalled();
    expect(latest).not.toHaveBeenCalled();
    for (const peer of estimate.peers)
      expect(Object.keys(peer).sort()).toEqual([
        "democraticShare",
        "referenceDate",
        "seatKey",
        "sourceEntityId",
      ]);
  });

  it("refuses unknown seats, missing saved conditions, and an empty comparable pool", () => {
    const sample = samples[0]!;
    const target = identities.find(
      (seat) =>
        seat.stateUsps === sample.stateUsps && seat.chamberKey === "us-house",
    )!;
    expect(() =>
      campaignDistrictPollingEstimate(sample.world, "test:unknown-seat"),
    ).toThrow(/Unknown congressional seat/);
    const missing: World = {
      ...sample.world,
      history: {
        ...sample.world.history,
        worldConditions: sample.world.history.worldConditions!.filter(
          (record) => record.kind !== "political-starting-conditions",
        ),
      },
    };
    expect(() =>
      campaignDistrictPollingEstimate(missing, target.seatKey),
    ).toThrow(/no recorded district leans/);
    expect(() =>
      campaignDistrictPollingEstimate(
        replaceCongressRows(sample.world, []),
        target.seatKey,
      ),
    ).toThrow(/no comparable recorded district shares/);
  });
});
