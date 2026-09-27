import { readFileSync } from "node:fs";

export const CAMPAIGN_OFFICE_LEVELS = [
  "state-house",
  "state-senate",
  "city-council",
  "county",
  "us-house",
] as const;

type Range = { min: number; max: number; unit: string };
type Observation = {
  id: string;
  metric: string;
  range: Range;
  relatedContactsRange?: Range;
  officeLevel: string | null;
  population: string;
  sourceIds: string[];
  actionCatalogIds: string[];
};
type OfficeCoverage = {
  officeLevel: string;
  directEvidenceIds: string[];
  sharedEvidenceIds: string[];
  officeSpecificCostAndReachStatus: string;
};
export type CampaignCalibration = {
  schemaVersion: number;
  officeLevels: string[];
  sources: Record<
    string,
    { url: string; locator: string; acquisition: string }
  >;
  observations: Observation[];
  officeCoverage: OfficeCoverage[];
  gapEvidence: {
    metric: string;
    status: string;
    sourceIds: string[];
    actionCatalogIds: string[];
    reason: string;
  }[];
  gaps: string[];
};

type LegacyCampaignEvidence = {
  sources: Record<
    string,
    {
      title?: string;
      publicationDate?: string;
      doi?: string;
      url?: string;
      locator?: string;
    }
  >;
  observations: {
    id: string;
    sourceId: string;
    unit?: string;
    value: { low: number; high: number };
  }[];
};

function validRange(range: Range): boolean {
  return (
    Number.isFinite(range.min) &&
    Number.isFinite(range.max) &&
    range.min > 0 &&
    range.max >= range.min &&
    range.unit.length > 0
  );
}

export function validateCampaignCalibration(
  packet: CampaignCalibration,
  actionIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  const expected = new Set<string>(CAMPAIGN_OFFICE_LEVELS);
  if (packet.schemaVersion !== 1) errors.push("unsupported schemaVersion");
  if (
    packet.officeLevels.length !== expected.size ||
    new Set(packet.officeLevels).size !== expected.size ||
    packet.officeLevels.some((level) => !expected.has(level))
  ) {
    errors.push("officeLevels must contain the five requested offices exactly");
  }
  for (const [id, source] of Object.entries(packet.sources)) {
    if (
      !/^https:\/\//.test(source.url) ||
      !source.locator ||
      !source.acquisition
    ) {
      errors.push(
        `source ${id} lacks a public URL, locator, or acquisition note`,
      );
    }
  }
  const byId = new Map<string, Observation>();
  for (const observation of packet.observations) {
    if (byId.has(observation.id))
      errors.push(`duplicate observation ${observation.id}`);
    byId.set(observation.id, observation);
    if (!validRange(observation.range))
      errors.push(`invalid range ${observation.id}`);
    if (
      observation.relatedContactsRange &&
      !validRange(observation.relatedContactsRange)
    ) {
      errors.push(`invalid related contact range ${observation.id}`);
    }
    if (!observation.population)
      errors.push(`missing population ${observation.id}`);
    if (observation.officeLevel && !expected.has(observation.officeLevel)) {
      errors.push(`unknown office ${observation.id}`);
    }
    if (
      !observation.sourceIds.length ||
      observation.sourceIds.some((id) => !packet.sources[id])
    ) {
      errors.push(`unresolved source ${observation.id}`);
    }
    if (
      (observation.metric !== "candidate-campaign-hours-per-week" &&
        !observation.actionCatalogIds.length) ||
      observation.actionCatalogIds.some((id) => !actionIds.has(id))
    ) {
      errors.push(`unresolved action ${observation.id}`);
    }
  }
  if (packet.officeCoverage.length !== expected.size) {
    errors.push("officeCoverage must contain five rows");
  }
  const covered = new Set<string>();
  for (const row of packet.officeCoverage) {
    if (!expected.has(row.officeLevel) || covered.has(row.officeLevel)) {
      errors.push(`duplicate or unknown coverage row ${row.officeLevel}`);
    }
    covered.add(row.officeLevel);
    if (row.officeSpecificCostAndReachStatus !== "UNKNOWN") {
      errors.push(
        `unsupported office-specific coverage claim ${row.officeLevel}`,
      );
    }
    for (const id of row.directEvidenceIds) {
      if (byId.get(id)?.officeLevel !== row.officeLevel) {
        errors.push(`nonmatching direct evidence ${row.officeLevel}/${id}`);
      }
    }
    for (const id of row.sharedEvidenceIds) {
      if (!byId.has(id) || byId.get(id)?.officeLevel !== null) {
        errors.push(`nonshared evidence ${row.officeLevel}/${id}`);
      }
    }
  }
  for (const gap of packet.gapEvidence) {
    if (
      gap.status !== "UNKNOWN" ||
      !gap.metric ||
      !gap.reason ||
      !gap.sourceIds.length ||
      gap.sourceIds.some((id) => !packet.sources[id]) ||
      gap.actionCatalogIds.some((id) => !actionIds.has(id))
    ) {
      errors.push(`invalid or unsupported gap evidence ${gap.metric}`);
    }
  }
  if (!packet.gaps.length) errors.push("source gaps must be explicit");
  return errors;
}

export function validateCommittedCampaignCalibration(
  root = process.cwd(),
): string[] {
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
  const evidence = JSON.parse(
    readFileSync(
      `${root}/data/research/campaign-reality/campaign-evidence.json`,
      "utf8",
    ),
  ) as LegacyCampaignEvidence;
  return [
    ...validateCampaignCalibration(
      packet,
      new Set(catalog.actions.map((action) => action.id)),
    ),
    ...validateNickersonEvidence(evidence),
  ];
}

export function validateNickersonEvidence(
  evidence: LegacyCampaignEvidence,
): string[] {
  const errors: string[] = [];
  const source = evidence.sources["nickerson-2005"];
  if (
    source?.title !==
      "Volunteer Phone Calls Can Increase Turnout: Evidence From Eight Field Experiments" ||
    source.publicationDate !== "2006-05" ||
    source.doi !== "10.1177/1532673X05275923" ||
    source.url !==
      "https://sites.temple.edu/nickerson/files/2017/07/Nickerson.APR2005.pdf" ||
    !source.locator?.includes("PDF page 17")
  ) {
    errors.push("Nickerson bibliographic identity or page locator changed");
  }
  for (const [id, low, high] of [
    ["door-contact-rate", 3, 8],
    ["phone-contact-rate", 15, 20],
  ] as const) {
    const observation = evidence.observations.find((entry) => entry.id === id);
    if (
      observation?.sourceId !== "nickerson-2005" ||
      observation.unit !== "completed-person-contacts/volunteer-hour" ||
      observation.value.low !== low ||
      observation.value.high !== high
    ) {
      errors.push(`Nickerson ${id} source, unit, or bounds changed`);
    }
  }
  return errors;
}
