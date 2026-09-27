import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  validateCampaignCalibration,
  validateCommittedCampaignCalibration,
  validateNickersonEvidence,
  type CampaignCalibration,
} from "./validate-campaign-calibration";

const root = process.cwd();
const packet = JSON.parse(
  readFileSync(
    `${root}/data/research/campaign-reality/campaign-calibration.json`,
    "utf8",
  ),
) as CampaignCalibration;
const catalog = JSON.parse(
  readFileSync(
    `${root}/data/research/campaign-reality/action-catalog.json`,
    "utf8",
  ),
) as { actions: { id: string }[] };
const actionIds = new Set(catalog.actions.map((action) => action.id));
const legacyEvidence = JSON.parse(
  readFileSync(
    `${root}/data/research/campaign-reality/campaign-evidence.json`,
    "utf8",
  ),
) as Parameters<typeof validateNickersonEvidence>[0];

describe("campaign contact calibration packet", () => {
  it("resolves every observation to a public source, catalog action, and honest office scope", () => {
    expect(validateCommittedCampaignCalibration(root)).toEqual([]);
    expect(packet.officeCoverage).toHaveLength(5);
    expect(
      packet.officeCoverage.every(
        (row) => row.officeSpecificCostAndReachStatus === "UNKNOWN",
      ),
    ).toBe(true);
  });

  it("rejects a general quote mislabeled as office-specific evidence", () => {
    const changed = structuredClone(packet);
    changed.officeCoverage[1]!.directEvidenceIds.push("mi-managed-door-quote");
    expect(validateCampaignCalibration(changed, actionIds)).toContain(
      "nonmatching direct evidence state-senate/mi-managed-door-quote",
    );
  });

  it("rejects an invented action or missing source", () => {
    const changed = structuredClone(packet);
    changed.observations[0]!.actionCatalogIds.push("invented-action");
    changed.observations[0]!.sourceIds.push("missing-source");
    expect(validateCampaignCalibration(changed, actionIds)).toEqual(
      expect.arrayContaining([
        "unresolved action volunteer-knocks-host-guide",
        "unresolved source volunteer-knocks-host-guide",
      ]),
    );
  });

  it("retains Nickerson's stable references while preventing a contacts-to-attempts regression", () => {
    expect(validateNickersonEvidence(legacyEvidence)).toEqual([]);
    const changed = structuredClone(legacyEvidence);
    const door = changed.observations.find(
      (entry) => entry.id === "door-contact-rate",
    );
    if (!door) throw new Error("door-contact-rate observation is missing");
    door.unit = "knocked-doors/volunteer-hour";
    expect(validateNickersonEvidence(changed)).toContain(
      "Nickerson door-contact-rate source, unit, or bounds changed",
    );
  });

  it("keeps USPS postage separate from all-in mail cost and candidate hours limited to state House", () => {
    const postage = packet.observations.find(
      (entry) => entry.id === "usps-eddm-retail-postage",
    );
    expect(postage?.range).toEqual({
      min: 0.26,
      max: 0.26,
      unit: "2026-USD/EDDM-Retail-flat",
    });
    expect(
      packet.officeCoverage
        .filter((row) => row.officeLevel !== "state-house")
        .every((row) => row.directEvidenceIds.length === 0),
    ).toBe(true);
    expect(
      packet.gaps.some((gap) =>
        gap.includes("all-in mail-piece cost remains UNKNOWN"),
      ),
    ).toBe(true);
  });

  it("keeps 2012 Facebook bids out of current paid CPM calibration", () => {
    expect(packet.historicalDigitalContext).toHaveLength(2);
    expect(
      packet.historicalDigitalContext.every((row) => row.paidCpmUsd === null),
    ).toBe(true);
    expect(
      packet.historicalDigitalContext.every(
        (row) => row.notForCurrentCalibration === true,
      ),
    ).toBe(true);
    const changed = structuredClone(packet);
    changed.historicalDigitalContext[0]!.paidCpmUsd = 1.51;
    expect(validateCampaignCalibration(changed, actionIds)).toContain(
      "invalid historical digital context facebook-state-legislative-2012",
    );
  });
});
