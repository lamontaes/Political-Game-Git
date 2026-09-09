/**
 * The campaign-finance authorities this domain reads.
 *
 * Two states, chosen for two different reasons. Nebraska is where the rule
 * actually bites: it is the one state with a life place, an accepted candidacy
 * pack and a legislative scenario, so a Nebraskan campaign is a campaign a
 * player can file and a refusal there is a refusal somebody meets. Minnesota is
 * the portability case — the same obligation shape, in a different state's
 * words, at a different threshold — which is what keeps the read model from
 * quietly hard-coding one statute's structure as the shape of campaign law.
 *
 * Nebraska's rule and Minnesota's are genuinely different rules and are modelled
 * as such. Minnesota bars accepting money above $750 in aggregate from anyone
 * but the candidate without a designated principal campaign committee. Nebraska
 * bars accepting any contribution or making any expenditure by a committee that
 * has not filed a statement of organization and has no treasurer — no threshold
 * at all. Flattening them into one parameterised rule would have invented a
 * threshold for Nebraska or removed Minnesota's.
 *
 * The federal alternative was considered and rejected on the facts. The
 * repository holds FEC candidate, committee and linkage masters, and the
 * Federal Election Campaign Act would have been the easier acquisition — but
 * FECA governs candidates for federal office, and every seat the game currently
 * offers is a seat in a state legislature. Applying a federal committee rule to
 * a Missouri House race would be inventing a legal requirement, which is the
 * one thing this lane exists not to do.
 */

import type {
  AcquisitionRequest,
  ArtifactRights,
  EnactedTextRegion,
} from "../../core/index";

export interface CampaignComplianceSourceSpec {
  readonly artifactId: string;
  readonly url: string;
  readonly provider: string;
  readonly jurisdictionKey: string;
  readonly enactingBody: string;
  readonly instrumentTitle: string;
  readonly legalLocator: string;
  readonly localPath: string;
  readonly regions: readonly [EnactedTextRegion, ...EnactedTextRegion[]];
  readonly enacted: { readonly length: number; readonly sha256: string };
}

export const CAMPAIGN_COMPLIANCE_SOURCES: readonly CampaignComplianceSourceSpec[] =
  [
    {
      artifactId: "mn-statutes-10a-105",
      url: "https://www.revisor.mn.gov/statutes/cite/10A.105",
      provider: "Minnesota Office of the Revisor of Statutes",
      jurisdictionKey: "US-MN",
      enactingBody: "the Minnesota Legislature",
      instrumentTitle:
        "Minnesota Statutes, Chapter 10A — Campaign Finance and Public Disclosure",
      legalLocator: "Minn. Stat. § 10A.105, subd. 1",
      localPath:
        "data/source/state-campaign-compliance/raw/mn-statutes-10a-105.html",
      regions: [
        {
          beginsWith:
            "A candidate must not accept contributions from a source, other than self, in aggregate in excess of $750",
          endsWith:
            "However, a candidate may be involved in the direct or indirect control of a party unit.",
        },
      ],
      enacted: {
        length: 547,
        sha256:
          "4819e233a583bf67d44007cadf81132d5c9255935679cbff3f5442c028a9749d",
      },
    },
    {
      artifactId: "ne-statutes-49-1446",
      url: "https://nebraskalegislature.gov/laws/statutes.php?statute=49-1446",
      provider: "Nebraska Legislature",
      jurisdictionKey: "US-NE",
      enactingBody: "the Nebraska Legislature",
      instrumentTitle:
        "Nebraska Revised Statutes, Chapter 49 — Nebraska Political Accountability and Disclosure Act",
      legalLocator: "Neb. Rev. Stat. § 49-1446",
      localPath:
        "data/source/state-campaign-compliance/raw/ne-statutes-49-1446.html",
      regions: [
        {
          beginsWith:
            "(1) Each committee shall have a treasurer who is a qualified elector of this state.",
          endsWith:
            "The contributions received or expenditures made by a candidate or an agent of a candidate shall be considered received or made by the candidate committee.",
        },
      ],
      enacted: {
        length: 1238,
        sha256:
          "69c1bc4bbe57d82aa56b78fa91e715d8ee428eff63c9a25fa487df45baad04e4",
      },
    },
  ];

function edictRights(spec: CampaignComplianceSourceSpec): ArtifactRights {
  return {
    status: "public-domain-government-edict",
    declaredLicense: null,
    attributionRequired: "UNKNOWN",
    edict: {
      jurisdictionKey: spec.jurisdictionKey,
      enactingAuthority: `Enacted by ${spec.enactingBody}`,
      instrumentKind: "statute",
      instrumentTitle: spec.instrumentTitle,
      doctrine: "us-government-edicts",
      contentScope: "enacted-legal-text-only",
      scope: {
        boundaryKind: "normalized-text-regions",
        regions: spec.regions,
        extracted: spec.enacted,
      },
    },
  };
}

export const CAMPAIGN_COMPLIANCE_ACQUISITION: {
  readonly domain: string;
  readonly requests: readonly AcquisitionRequest[];
} = {
  domain: "state-campaign-compliance",
  requests: [
    ...CAMPAIGN_COMPLIANCE_SOURCES.map((spec): AcquisitionRequest => ({
      artifactId: spec.artifactId,
      provider: spec.provider,
      url: spec.url,
      method: "GET",
      mediaType: "text/html",
      publisher: {
        statedVintage: null,
        releaseDate: null,
        schemaVersion: null,
        documentationUrl: spec.url,
      },
      rights: edictRights(spec),
      storage: "committed",
      localPath: spec.localPath,
    })),
    {
      artifactId: "ky-krs-121-180-2026-pdf",
      provider: "Kentucky Legislative Research Commission",
      url: "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=58071",
      method: "GET",
      mediaType: "application/pdf",
      publisher: {
        statedVintage: "Includes enactments through the 2026 Regular Session",
        releaseDate: "2026-07-15",
        schemaVersion: null,
        documentationUrl:
          "https://apps.legislature.ky.gov/law/Statutes/chapter.aspx?id=37608",
      },
      rights: {
        status: "UNKNOWN",
        declaredLicense: null,
        attributionRequired: "UNKNOWN",
      },
      storage: "committed",
      localPath:
        "data/source/state-campaign-compliance/raw/ky-krs-121-180-2026.pdf",
    },
    {
      artifactId: "ky-2026-chapter-175-hb139",
      provider: "Kentucky Legislative Research Commission",
      url: "https://apps.legislature.ky.gov/law/acts/26RS/documents/0175.pdf",
      method: "GET",
      mediaType: "application/pdf",
      publisher: {
        statedVintage: "2026 Regular Session, Chapter 175, House Bill 139",
        releaseDate: "2026-07-15",
        schemaVersion: null,
        documentationUrl:
          "https://apps.legislature.ky.gov/record/26rs/HB139.html",
      },
      rights: {
        status: "UNKNOWN",
        declaredLicense: null,
        attributionRequired: "UNKNOWN",
      },
      storage: "committed",
      localPath:
        "data/source/state-campaign-compliance/raw/ky-2026-chapter-175-hb139.pdf",
    },
    {
      artifactId: "ky-kref-kefms-faq-2025",
      provider: "Kentucky Registry of Election Finance",
      url: "https://kref.ky.gov/efile/Pages/default.aspx",
      method: "GET",
      mediaType: "text/html",
      publisher: {
        statedVintage: "KEFMS Frequently Asked Questions updated 2025-08-30",
        releaseDate: "2025-08-30",
        schemaVersion: null,
        documentationUrl: "https://kref.ky.gov/efile/Pages/default.aspx",
      },
      rights: {
        status: "UNKNOWN",
        declaredLicense: null,
        attributionRequired: "UNKNOWN",
      },
      storage: "committed",
      localPath:
        "data/source/state-campaign-compliance/raw/ky-kref-kefms-faq-2025.html",
    },
  ],
};
