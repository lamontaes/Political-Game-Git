/**
 * GENERATED — do not edit by hand.
 *
 * Written by `scripts/source/export-campaign-compliance.ts` from the compiled
 * `state-campaign-compliance` corpus. Each obligation below was emitted only
 * because the words that establish it are present in the enacted text of the
 * provision cited, in bytes this repository retrieved from the state's own
 * publisher and hashed. Regenerate with `npm run export:campaign-compliance`.
 *
 * Two states. Nothing here is true of any other state's campaigns.
 */

/** Provenance for the obligations below. Surfaced honestly. */
export const CAMPAIGN_COMPLIANCE_META = {
  "asOf": "2026-09-09",
  "corpusSha256": "53d0983e46738d219ac442faa50d07764ef1fbe2999e38717d469206d47b7f0e",
  "compiler": "state-campaign-compliance@2.0.0",
  "recordCount": 3,
  "jurisdictions": [
    "US-MN",
    "US-NE"
  ]
} as const;

/** One row per compiled obligation, as one JSON string. */
export const CAMPAIGN_COMPLIANCE_ROWS: string =
  "[{\"jurisdictionKey\":\"US-MN\",\"regime\":\"Minnesota Campaign Finance and Public Disclosure Act\",\"obligation\":\"principal-campaign-committee-required\",\"thresholdState\":\"KNOWN\",\"thresholdMinorUnits\":75000,\"thresholdCurrency\":\"USD\",\"thresholdAppliesTo\":\"contributions accepted in aggregate from a source other than the candidate\",\"legalLocator\":\"Minn. Stat. § 10A.105, subd. 1\",\"authorityUrl\":\"https://www.revisor.mn.gov/statutes/cite/10A.105\",\"enactedExcerpt\":\"unless the candidate designates and causes to be formed a single principal campaign committee for each office sought\",\"supportingEnactedExcerpts\":[],\"sourceRetrievedAt\":\"2026-09-09T06:24:53.798Z\",\"sourceStatedVintage\":null,\"provisionValidity\":{\"amendmentAnnotations\":[],\"kind\":\"CURRENT_OBSERVATION\",\"observedOn\":\"2026-09-09\",\"reason\":\"The acquired current provision proves this wording on the retrieval date; its history annotation does not establish when every compiled clause began.\"}},{\"jurisdictionKey\":\"US-MN\",\"regime\":\"Minnesota Campaign Finance and Public Disclosure Act\",\"obligation\":\"single-principal-campaign-committee\",\"thresholdState\":\"NOT_APPLICABLE\",\"thresholdMinorUnits\":null,\"thresholdCurrency\":null,\"thresholdAppliesTo\":\"The statute sets no amount for this obligation: a candidate may not form a second committee at any level of receipts.\",\"legalLocator\":\"Minn. Stat. § 10A.105, subd. 1\",\"authorityUrl\":\"https://www.revisor.mn.gov/statutes/cite/10A.105\",\"enactedExcerpt\":\"A candidate may not authorize, designate, or cause to be formed any other political committee bearing the candidate's name or title\",\"supportingEnactedExcerpts\":[],\"sourceRetrievedAt\":\"2026-09-09T06:24:53.798Z\",\"sourceStatedVintage\":null,\"provisionValidity\":{\"amendmentAnnotations\":[],\"kind\":\"CURRENT_OBSERVATION\",\"observedOn\":\"2026-09-09\",\"reason\":\"The acquired current provision proves this wording on the retrieval date; its history annotation does not establish when every compiled clause began.\"}},{\"jurisdictionKey\":\"US-NE\",\"regime\":\"Nebraska Political Accountability and Disclosure Act\",\"obligation\":\"organized-committee-with-treasurer-required\",\"thresholdState\":\"NOT_APPLICABLE\",\"thresholdMinorUnits\":null,\"thresholdCurrency\":null,\"thresholdAppliesTo\":\"The statute sets no amount for this obligation: an unorganised committee without a treasurer may accept nothing and spend nothing.\",\"legalLocator\":\"Neb. Rev. Stat. § 49-1446\",\"authorityUrl\":\"https://nebraskalegislature.gov/laws/statutes.php?statute=49-1446\",\"enactedExcerpt\":\"No contribution shall be accepted and no expenditure shall be made by a committee which has not filed a statement of organization and which does not have a treasurer.\",\"supportingEnactedExcerpts\":[\"Each committee shall have a treasurer who is a qualified elector of this state.\"],\"sourceRetrievedAt\":\"2026-09-09T06:24:54.325Z\",\"sourceStatedVintage\":null,\"provisionValidity\":{\"amendmentAnnotations\":[],\"kind\":\"CURRENT_OBSERVATION\",\"observedOn\":\"2026-09-09\",\"reason\":\"The acquired current provision proves this wording on the retrieval date; its history annotation does not establish when every compiled clause began.\"}}]";

/** Hash-bound, field-level Kentucky reviewed transcription. */
export const KENTUCKY_COMPLIANCE_REVIEW = {
  "reviewId": "ky-candidate-compliance-2026",
  "reviewedOn": "2026-09-09",
  "records": [
    {
      "field": "statementOfIntentWithinDays",
      "status": "KNOWN",
      "value": 5,
      "artifactId": "ky-krs-121-180-2026-pdf",
      "artifactSha256": "b0d28181e22b0fb7126305d873ddb078867150621b6df159fba3d878986ec9e0",
      "sourceUrl": "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=58071",
      "legalLocator": "KRS 121.180(1)(a)1.",
      "sourceVersionEffectiveOn": "2026-07-15",
      "claimEffectiveOn": null,
      "supportCoverageFrom": "2026-07-15",
      "excerpt": "Candidates and slates of candidates shall submit this form to the registry within five (5) days of receiving contributions or making expenditures with a view to bringing about his or her nomination or election to public office, or within five (5) days of filing papers to run for public office, whichever is sooner.",
      "sourceRetrievedAt": "2026-09-09T06:24:54.827Z",
      "sourceStatedVintage": "Includes enactments through the 2026 Regular Session"
    },
    {
      "field": "reportingThresholdMinorUnits",
      "status": "KNOWN",
      "value": 500000,
      "artifactId": "ky-krs-121-180-2026-pdf",
      "artifactSha256": "b0d28181e22b0fb7126305d873ddb078867150621b6df159fba3d878986ec9e0",
      "sourceUrl": "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=58071",
      "legalLocator": "KRS 121.180(1)(a), (3)(a)",
      "sourceVersionEffectiveOn": "2026-07-15",
      "claimEffectiveOn": null,
      "supportCoverageFrom": "2026-07-15",
      "excerpt": "more than five thousand dollars ($5,000) in any one (1) election",
      "sourceRetrievedAt": "2026-09-09T06:24:54.827Z",
      "sourceStatedVintage": "Includes enactments through the 2026 Regular Session"
    },
    {
      "field": "reportSchedules",
      "status": "KNOWN",
      "value": [
        "60-day-preelection",
        "30-day-preelection",
        "15-day-preelection",
        "30-day-postelection"
      ],
      "artifactId": "ky-krs-121-180-2026-pdf",
      "artifactSha256": "b0d28181e22b0fb7126305d873ddb078867150621b6df159fba3d878986ec9e0",
      "sourceUrl": "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=58071",
      "legalLocator": "KRS 121.180(3)(b)2.-5., (4)",
      "sourceVersionEffectiveOn": "2026-07-15",
      "claimEffectiveOn": null,
      "supportCoverageFrom": "2026-07-15",
      "excerpt": "make reports on the sixtieth day preceding a regular election; make reports on the thirtieth day preceding an election; make reports on the fifteenth day preceding the date of the election; make post-election reports within thirty (30) days after the election",
      "sourceRetrievedAt": "2026-09-09T06:24:54.827Z",
      "sourceStatedVintage": "Includes enactments through the 2026 Regular Session"
    },
    {
      "field": "reportReceiptWithinBusinessDays",
      "status": "KNOWN",
      "value": 7,
      "artifactId": "ky-krs-121-180-2026-pdf",
      "artifactSha256": "b0d28181e22b0fb7126305d873ddb078867150621b6df159fba3d878986ec9e0",
      "sourceUrl": "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=58071",
      "legalLocator": "KRS 121.180(3)(b)5., (4)",
      "sourceVersionEffectiveOn": "2026-07-15",
      "claimEffectiveOn": "2026-07-15",
      "claimEffectiveBasisArtifactId": "ky-krs-121-180-2026-pdf",
      "claimEffectiveBasisArtifactSha256": "b0d28181e22b0fb7126305d873ddb078867150621b6df159fba3d878986ec9e0",
      "claimEffectiveBasisLocator": "KRS 121.180 effective-date/history footer",
      "claimEffectiveBasisExcerpt": "Effective: July 15, 2026",
      "amendmentEvidenceArtifactId": "ky-2026-chapter-175-hb139",
      "amendmentEvidenceArtifactSha256": "88ca9202606e50a5afec14334828b89254e03b4c0b91f1b299671ce5b2b530ea",
      "amendmentEvidenceLocator": "2026 Ky. Acts ch. 175, § 45, KRS 121.180(3)(b)5.",
      "amendmentEvidenceExcerpt": "within seven (7) [two (2)] business days",
      "supportCoverageFrom": "2026-07-15",
      "excerpt": "must be received by the registry within seven (7) business days after the date the reporting period ends to be deemed timely filed",
      "sourceRetrievedAt": "2026-09-09T06:24:54.827Z",
      "sourceStatedVintage": "Includes enactments through the 2026 Regular Session"
    },
    {
      "field": "electronicFilingSystem",
      "status": "KNOWN",
      "value": "KEFMS",
      "artifactId": "ky-kref-kefms-faq-2025",
      "artifactSha256": "068c8b9c7e5656e89de5123566f3b8e4fd2a01f7b9c00d42454590b058172440",
      "sourceUrl": "https://kref.ky.gov/efile/Pages/default.aspx",
      "legalLocator": "KEFMS FAQ: filing an electronic Statement of Spending Intent",
      "sourceVersionEffectiveOn": null,
      "claimEffectiveOn": null,
      "supportCoverageFrom": "2025-08-30",
      "excerpt": "The new Kentucky Election Finance Management System (KEFMS) is ready to receive your Statement of Spending Intent filing.",
      "sourceRetrievedAt": "2026-09-09T06:24:58.843Z",
      "sourceStatedVintage": "KEFMS Frequently Asked Questions updated 2025-08-30"
    },
    {
      "field": "publicUponReceipt",
      "status": "KNOWN",
      "value": true,
      "artifactId": "ky-krs-121-180-2026-pdf",
      "artifactSha256": "b0d28181e22b0fb7126305d873ddb078867150621b6df159fba3d878986ec9e0",
      "sourceUrl": "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=58071",
      "legalLocator": "KRS 121.180(8)",
      "sourceVersionEffectiveOn": "2026-07-15",
      "claimEffectiveOn": null,
      "supportCoverageFrom": "2026-07-15",
      "excerpt": "All reports filed under the provisions of this chapter shall be a matter of public record open to inspection by any member of the public immediately upon receipt of the report by the registry.",
      "sourceRetrievedAt": "2026-09-09T06:24:54.827Z",
      "sourceStatedVintage": "Includes enactments through the 2026 Regular Session"
    },
    {
      "field": "itemizationThresholdMinorUnits",
      "status": "KNOWN",
      "value": 20000,
      "artifactId": "ky-krs-121-180-2026-pdf",
      "artifactSha256": "b0d28181e22b0fb7126305d873ddb078867150621b6df159fba3d878986ec9e0",
      "sourceUrl": "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=58071",
      "legalLocator": "KRS 121.180(3)(a)2.",
      "sourceVersionEffectiveOn": "2026-07-15",
      "claimEffectiveOn": "2026-07-15",
      "claimEffectiveBasisArtifactId": "ky-krs-121-180-2026-pdf",
      "claimEffectiveBasisArtifactSha256": "b0d28181e22b0fb7126305d873ddb078867150621b6df159fba3d878986ec9e0",
      "claimEffectiveBasisLocator": "KRS 121.180 effective-date/history footer",
      "claimEffectiveBasisExcerpt": "Effective: July 15, 2026",
      "amendmentEvidenceArtifactId": "ky-2026-chapter-175-hb139",
      "amendmentEvidenceArtifactSha256": "88ca9202606e50a5afec14334828b89254e03b4c0b91f1b299671ce5b2b530ea",
      "amendmentEvidenceLocator": "2026 Ky. Acts ch. 175, § 45, KRS 121.180(3)(a)2.",
      "amendmentEvidenceExcerpt": "two hundred dollars ($200) [one hundred dollars ($100)]",
      "supportCoverageFrom": "2026-07-15",
      "excerpt": "For each contribution in excess of two hundred dollars ($200)",
      "sourceRetrievedAt": "2026-09-09T06:24:54.827Z",
      "sourceStatedVintage": "Includes enactments through the 2026 Regular Session"
    },
    {
      "field": "noComminglingWithPersonalFunds",
      "status": "KNOWN",
      "value": true,
      "artifactId": "ky-krs-121-180-2026-pdf",
      "artifactSha256": "b0d28181e22b0fb7126305d873ddb078867150621b6df159fba3d878986ec9e0",
      "sourceUrl": "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=58071",
      "legalLocator": "KRS 121.180(9)(a)",
      "sourceVersionEffectiveOn": "2026-07-15",
      "claimEffectiveOn": null,
      "supportCoverageFrom": "2026-07-15",
      "excerpt": "No contributions shall be commingled with the candidate's or slated candidates' personal funds or accounts.",
      "sourceRetrievedAt": "2026-09-09T06:24:54.827Z",
      "sourceStatedVintage": "Includes enactments through the 2026 Regular Session"
    },
    {
      "field": "amendmentTransport",
      "status": "KNOWN",
      "value": "KEFMS",
      "artifactId": "ky-kref-kefms-faq-2025",
      "artifactSha256": "068c8b9c7e5656e89de5123566f3b8e4fd2a01f7b9c00d42454590b058172440",
      "sourceUrl": "https://kref.ky.gov/efile/Pages/default.aspx",
      "legalLocator": "KEFMS FAQ: Amending your Statement of Spending Intent",
      "sourceVersionEffectiveOn": null,
      "claimEffectiveOn": null,
      "supportCoverageFrom": "2025-08-30",
      "excerpt": "Go to the KEFMS Candidate Dashboard to amend your Statement of Spending Intent.",
      "sourceRetrievedAt": "2026-09-09T06:24:58.843Z",
      "sourceStatedVintage": "KEFMS Frequently Asked Questions updated 2025-08-30"
    },
    {
      "field": "contributionLimitMinorUnits",
      "status": "UNKNOWN",
      "value": null,
      "artifactId": null,
      "artifactSha256": null,
      "sourceUrl": null,
      "legalLocator": null,
      "sourceVersionEffectiveOn": null,
      "claimEffectiveOn": null,
      "supportCoverageFrom": null,
      "excerpt": null,
      "reason": "No current field-specific contribution-limit provision has been acquired and reviewed for this pack.",
      "sourceRetrievedAt": null,
      "sourceStatedVintage": null
    }
  ]
} as const;
