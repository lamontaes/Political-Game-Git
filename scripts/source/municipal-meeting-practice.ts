/** Existing cached references -> explicit fixture-class municipal packs.
 * This does not open UNKNOWN-rights pages as production or legal authority.
 * Dates describe captured reference observations, not legal commencement.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import declarations from "../../data/source/municipal-governance/meeting-practice/declarations.json";
import { sha256Hex } from "../../src/source/core/index";
import {
  normalizeRetrievedText,
  containsExcerpt,
} from "../../src/source/core/parse/html-text";
import { NATIONAL_MUNICIPAL_RESEARCH } from "../../src/source/domains/municipal-governance/national-corpus";
import { packForResearchGovernment } from "../../src/source/domains/municipal-governance/national-packs";
import { parseMunicipalArtifacts } from "../../src/source/domains/municipal-governance/parse";
import type {
  Cell,
  MeetingSeriesInput,
  MunicipalPackInput,
} from "../../src/source/domains/municipal-governance/parse";
import type { MeetingSeriesKind } from "../../src/source/domains/municipal-governance/types";
import { REPO_ROOT } from "./registry";

export const MEETING_PRACTICE_FIXTURE =
  "fixtures/source/municipal-governance/meeting-practice.json";
export const MEETING_PRACTICE_AS_OF = "2026-09-09";

export function renderMunicipalMeetingPractice(
  input: typeof declarations = declarations,
): string {
  const sources = new Map<string, string>();
  for (const [key, source] of Object.entries(input.sources)) {
    for (const [path, expected] of [
      [source.rawPath, source.rawSha256],
      [source.textPath, source.textSha256],
    ]) {
      if (sha256Hex(readFileSync(resolve(REPO_ROOT, path!))) !== expected)
        throw new Error(`Municipal reference snapshot changed: ${key}`);
    }
    sources.set(
      key,
      normalizeRetrievedText(readFileSync(resolve(REPO_ROOT, source.textPath))),
    );
  }
  const packs = new Map<string, MunicipalPackInput>();
  for (const row of input.candidates) {
    for (const quote of row.quotes)
      if (!containsExcerpt(sources.get(row.cacheKey)!, quote))
        throw new Error(
          `Municipal reference excerpt missing: ${row.governmentKey}/${row.seriesKey}: ${quote}`,
        );
    const government = NATIONAL_MUNICIPAL_RESEARCH.governments.find(
      (entry) => entry.key === row.governmentKey,
    );
    if (!government)
      throw new Error(`Unknown declared government ${row.governmentKey}`);
    const key = `meeting-practice-${row.cacheKey}`;
    const observedOn = row.retrievedAt.slice(0, 10);
    const scope = `Reference captured ${observedOn}; ${row.historicalDocumentDate ? `document date ${row.historicalDocumentDate}; ` : "document date not established; "}legal validity interval not established. ${row.caveats.join(" ")}`;
    const cell = (value: unknown, field: string): Cell => ({
      status: "KNOWN",
      value,
      sourceKey: key,
      effectiveDate: observedOn,
      legalLocator: `${row.title}, ${row.seriesKey}, ${field}. ${scope} Snapshot ${row.cacheKey}.`,
    });
    const previous =
      packs.get(row.governmentKey) ??
      packForResearchGovernment({
        ...government,
        attestedAsOf: observedOn,
        sources: [],
        observations: [],
        form: null,
        body: {
          name: null,
          size: null,
          composition: null,
          presidingOffice: null,
          executiveSelection: null,
          sourceKey: key,
        },
        separation: null,
        mayor: null,
        manager: null,
        partisanship: null,
        terms: [],
        powers: [],
        consolidation: null,
        meetingPlaces: [],
        meetingSeries: [],
        placeCrosswalk: null,
        unresolved: [
          "Reference-only meeting observations, not operative law. Authored public sessions exclude closed/executive sittings. No real notice, current agenda, legal validity interval or office power is supplied.",
        ],
      });
    const series: MeetingSeriesInput = {
      seriesKey: row.seriesKey,
      kind: row.kind as MeetingSeriesKind,
      bodyName: cell(row.bodyName, "body"),
      venue: row.venue
        ? cell(row.venue, "venue")
        : {
            status: "UNKNOWN",
            reason: "This scoped reference establishes no fixed venue.",
          },
      cadence: row.cadence
        ? cell(row.cadence, "reported cadence")
        : {
            status: "UNKNOWN",
            reason:
              "This scoped reference establishes no complete recurring cadence.",
          },
      publicAttendance:
        "currentApplicability" in row && row.currentApplicability === "UNKNOWN"
          ? {
              status: "UNKNOWN",
              sourceKey: key,
              reason: `Conflicting document timing leaves current public access unestablished. ${scope}`,
            }
          : cell(
              {
                openToPublic: row.openToPublic,
                publicCommentOffered: row.publicCommentOffered,
                note: scope,
              },
              "public access",
            ),
    };
    packs.set(row.governmentKey, {
      ...previous,
      researchObservations: [
        ...(previous.researchObservations ?? []),
        cell(
          `Reference observation only. ${scope} Quoted source material: ${row.quotes.join(" ")}`,
          "scope and quoted reference",
        ),
      ],
      meetingSeries: [...(previous.meetingSeries ?? []), series],
      citedSources: previous.citedSources.some(
        (source) => source.sourceKey === key,
      )
        ? previous.citedSources
        : [
            ...previous.citedSources,
            {
              sourceKey: key,
              title: row.title,
              issuingAuthority: government.displayName,
              authorityType: "Retrieved meeting-practice reference",
              url: row.url,
              effectiveDate: null,
              retrievedDate: observedOn,
              retrievable: true,
              claimSupported: scope,
            },
          ],
    });
  }
  const artifacts = {
    packs: [...packs.values()].sort((a, b) =>
      a.sourceGovernmentKey.localeCompare(b.sourceGovernmentKey),
    ),
  };
  const parsed = parseMunicipalArtifacts(artifacts);
  if (parsed.defects.length) throw new Error(JSON.stringify(parsed.defects));
  return `${JSON.stringify({ __fixture: true, fixtureId: "municipal-governance/meeting-practice", artifacts }, null, 2)}\n`;
}

if (process.argv[1]?.endsWith("municipal-meeting-practice.ts")) {
  writeFileSync(
    resolve(REPO_ROOT, MEETING_PRACTICE_FIXTURE),
    renderMunicipalMeetingPractice(),
  );
}
