/**
 * Seat counts read after the national pass (Build 25, CTO ruling of
 * September 29, 12:54 a.m.: "Council sizes come from each place's charter or
 * municipal code").
 *
 * The national pass left 74 governments without a seat count, Chicago's fifty
 * wards among them, so the game drew their size from the national shares
 * (`local-governing-body-rules.ts`). Each reading here is one government's own
 * charter, code or official website, read on the date the file states, and
 * fills only a seat count the pass left empty: it never replaces one the pass
 * stated. A town meeting, where every voter sits, has no seat count and is not
 * listed.
 *
 * The count is the seats on the body, not counting a mayor elected
 * separately, as the pass counts them (Anchorage's Assembly is 12, without its
 * mayor).
 */

import readings from "../../../../data/source/municipal-governance/council-size-readings.json" with { type: "json" };
import type { ResearchGovernment } from "./national-research";

interface CouncilSizeReading {
  readonly key: string;
  readonly size: number;
  readonly title: string;
  readonly url: string;
  readonly claimSupported: string;
}

function authorityType(title: string): string {
  if (/\bCharter\b/.test(title)) return "Municipal Charter";
  if (/\bCode\b/.test(title)) return "Municipal Code";
  return "Municipal Official Website";
}

export function includeCouncilSizeReadings(
  base: readonly ResearchGovernment[],
): readonly ResearchGovernment[] {
  const byKey = new Map(
    (readings.readings as readonly CouncilSizeReading[]).map((row) => [
      row.key,
      row,
    ]),
  );
  const seen = new Set<string>();
  const governments = base.map((government) => {
    const reading = byKey.get(government.key);
    if (!reading) return government;
    seen.add(government.key);
    if (government.body.size !== null) return government;
    const sourceKey = `council-size-${government.key}`;
    return {
      ...government,
      sources: [
        ...government.sources,
        {
          key: sourceKey,
          authorityType: authorityType(reading.title),
          title: reading.title,
          issuingAuthority: government.displayName,
          url: reading.url,
          claimSupported: reading.claimSupported,
        },
      ],
      body: {
        ...government.body,
        size: reading.size,
        sizeReading: { sourceKey, attestedAsOf: readings.readOn },
      },
    };
  });
  const unmatched = [...byKey.keys()].filter((key) => !seen.has(key));
  if (unmatched.length > 0)
    throw new Error(
      `Council size readings name no declared government: ${unmatched.join(", ")}`,
    );
  return governments;
}
