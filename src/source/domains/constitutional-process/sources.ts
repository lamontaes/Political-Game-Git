import type { AcquisitionRequest } from "../../core/index";
export const CONSTITUTIONAL_SOURCES: readonly AcquisitionRequest[] = [
  {
    artifactId: "us-process",
    url: "https://www.archives.gov/federal-register/constitution",
    provider: "Official legislative publisher",
    method: "GET",
    mediaType: "text/html",
    publisher: {
      documentationUrl:
        "https://www.archives.gov/federal-register/constitution",
      releaseDate: null,
      schemaVersion: null,
      statedVintage: null,
    },
    rights: {
      status: "public-domain-us-government",
      declaredLicense: null,
      attributionRequired: false,
    },
    storage: "committed",
    localPath: "data/source/constitutional-process/raw/us-process.html",
  },
  {
    artifactId: "us-proposal-denominator",
    url: "https://www.law.cornell.edu/supremecourt/text/253/350",
    provider:
      "Cornell Legal Information Institute: Supreme Court opinion transcription",
    method: "GET",
    mediaType: "text/html",
    publisher: {
      documentationUrl: "https://www.law.cornell.edu/supremecourt/text/253/350",
      releaseDate: null,
      schemaVersion: null,
      statedVintage: null,
    },
    rights: {
      status: "public-domain-government-edict",
      declaredLicense: null,
      attributionRequired: false,
      edict: {
        jurisdictionKey: "US-FED",
        enactingAuthority: "Supreme Court of the United States",
        instrumentKind: "court-opinion",
        instrumentTitle: "National Prohibition Cases, 253 U.S. 350",
        doctrine: "us-government-edicts",
        contentScope: "enacted-legal-text-only",
        scope: {
          boundaryKind: "normalized-text-regions",
          regions: [
            {
              beginsWith:
                "The two-thirds vote in each house which is required in proposing an amendment",
              endsWith: "present and absent.",
            },
          ],
          extracted: {
            length: 237,
            sha256:
              "a7a8261d85e1443e103847419c3f13a5dd1b5e2ccda1955049f6a73dc09736dd",
          },
        },
      },
    },
    storage: "committed",
    localPath:
      "data/source/constitutional-process/raw/us-proposal-denominator.html",
  },
  {
    artifactId: "ca-constitution-iv",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CONS&article=IV",
    provider: "Official legislative publisher",
    method: "GET",
    mediaType: "text/html",
    publisher: {
      documentationUrl:
        "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CONS&article=IV",
      releaseDate: null,
      schemaVersion: null,
      statedVintage: null,
    },
    rights: {
      status: "public-domain-government-edict",
      declaredLicense: null,
      attributionRequired: false,
      edict: {
        jurisdictionKey: "US-CA",
        enactingAuthority: "the people of California",
        instrumentKind: "constitution",
        instrumentTitle: "California Constitution",
        doctrine: "us-government-edicts",
        contentScope: "enacted-legal-text-only",
        scope: {
          boundaryKind: "normalized-text-regions",
          regions: [
            {
              beginsWith: "The Senate has a membership",
              endsWith: "20 to begin every 2 years.",
            },
            {
              beginsWith: "The Assembly has a membership",
              endsWith: "for 2-year terms.",
            },
            {
              beginsWith: "A majority of the membership",
              endsWith: "attendance of absent members.",
            },
          ],
          extracted: {
            length: 309,
            sha256:
              "cdfafaa6dcf611a10386bd0467a80cef07a61bfe568c157d6315ae9e7e70791f",
          },
        },
      },
    },
    storage: "committed",
    localPath: "data/source/constitutional-process/raw/ca-constitution-iv.html",
  },
  {
    artifactId: "us-constitution",
    url: "https://www.archives.gov/federal-register/constitution/article-v.html",
    provider: "Official legislative publisher",
    method: "GET",
    mediaType: "text/html",
    publisher: {
      documentationUrl:
        "https://www.archives.gov/federal-register/constitution/article-v.html",
      releaseDate: null,
      schemaVersion: null,
      statedVintage: null,
    },
    rights: {
      status: "public-domain-us-government",
      declaredLicense: null,
      attributionRequired: false,
    },
    storage: "committed",
    localPath: "data/source/constitutional-process/raw/us-constitution.html",
  },
  {
    artifactId: "ca-constitution-xviii",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CONS&article=XVIII",
    provider: "Official legislative publisher",
    method: "GET",
    mediaType: "text/html",
    publisher: {
      documentationUrl:
        "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CONS&article=XVIII",
      releaseDate: null,
      schemaVersion: null,
      statedVintage: null,
    },
    rights: {
      status: "public-domain-government-edict",
      declaredLicense: null,
      attributionRequired: false,
      edict: {
        jurisdictionKey: "US-CA",
        enactingAuthority: "the people of California",
        instrumentKind: "constitution",
        instrumentTitle: "California Constitution",
        doctrine: "us-government-edicts",
        contentScope: "enacted-legal-text-only",
        scope: {
          boundaryKind: "normalized-text-regions",
          regions: [
            {
              beginsWith:
                "The Legislature by rollcall vote entered in the journal",
              endsWith: "it can be voted on separately.",
            },
            {
              beginsWith: "The electors may amend",
              endsWith: "by initiative.",
            },
            {
              beginsWith: "A proposed amendment or revision shall be submitted",
              endsWith: "affirmative votes shall prevail.",
            },
          ],
          extracted: {
            length: 885,
            sha256:
              "ec3c957011bba7a6cfa33e1f1f0d4a853a29aac764aa5d25fb61778430b39439",
          },
        },
      },
    },
    storage: "committed",
    localPath:
      "data/source/constitutional-process/raw/ca-constitution-xviii.html",
  },
  {
    artifactId: "carson-charter",
    url: "https://www.leg.state.nv.us/CityCharters/CtyCCCC.html",
    provider: "Official legislative publisher",
    method: "GET",
    mediaType: "text/html; charset=windows-1252",
    publisher: {
      documentationUrl: "https://www.leg.state.nv.us/CityCharters/CtyCCCC.html",
      releaseDate: null,
      schemaVersion: null,
      statedVintage: null,
    },
    rights: {
      status: "public-domain-government-edict",
      declaredLicense: null,
      attributionRequired: false,
      edict: {
        jurisdictionKey: "US-NV",
        enactingAuthority: "Nevada Legislature",
        instrumentKind: "statute",
        instrumentTitle: "Carson City Charter",
        doctrine: "us-government-edicts",
        contentScope: "enacted-legal-text-only",
        scope: {
          boundaryKind: "normalized-text-regions",
          regions: [
            {
              beginsWith: "The Charter Committee shall:",
              endsWith: "not approved or supported by the Board.",
            },
          ],
          extracted: {
            length: 2021,
            sha256:
              "2356b5065e23d2f2d6015ac0bf1e8a6cc7de025c4ed48f046b5e45153945f37d",
          },
        },
      },
    },
    storage: "committed",
    localPath: "data/source/constitutional-process/raw/carson-charter.html",
  },
  {
    artifactId: "nv-effective",
    url: "https://www.leg.state.nv.us/NRS/NRS-218D.html",
    provider: "Official legislative publisher",
    method: "GET",
    mediaType: "text/html; charset=windows-1252",
    publisher: {
      documentationUrl: "https://www.leg.state.nv.us/NRS/NRS-218D.html",
      releaseDate: null,
      schemaVersion: null,
      statedVintage: null,
    },
    rights: {
      status: "public-domain-government-edict",
      declaredLicense: null,
      attributionRequired: false,
      edict: {
        jurisdictionKey: "US-NV",
        enactingAuthority: "Nevada Legislature",
        instrumentKind: "statute",
        instrumentTitle: "Nevada Revised Statutes Chapter 218D",
        doctrine: "us-government-edicts",
        contentScope: "enacted-legal-text-only",
        scope: {
          boundaryKind: "normalized-text-regions",
          regions: [
            {
              beginsWith: "Each law and joint resolution passed",
              endsWith: "prescribes a different effective date.",
            },
          ],
          extracted: {
            length: 196,
            sha256:
              "47bf25e917cb681287b860e365c0025a442101d7f6cca9be99e7f374c2c7d16c",
          },
        },
      },
    },
    storage: "committed",
    localPath: "data/source/constitutional-process/raw/nv-effective.html",
  },
  {
    artifactId: "us-quorum",
    url: "https://www.archives.gov/founding-docs/constitution-transcript",
    provider: "National Archives",
    method: "GET",
    mediaType: "text/html",
    publisher: {
      documentationUrl:
        "https://www.archives.gov/founding-docs/constitution-transcript",
      releaseDate: null,
      schemaVersion: null,
      statedVintage: null,
    },
    rights: {
      status: "public-domain-us-government",
      declaredLicense: null,
      attributionRequired: false,
    },
    storage: "committed",
    localPath: "data/source/constitutional-process/raw/us-quorum.html",
  },
];
export const CONSTITUTIONAL_FACTS = [
  {
    artifactId: "us-process",
    url: "https://www.archives.gov/federal-register/constitution",
    sha256: "348aaf850906794914f97a7c2c5c7cd3faa510ccfda7051d67bb462e17a6322f",
    observedOn: "2026-09-13",
    excerpts: [],
  },
  {
    artifactId: "us-proposal-denominator",
    url: "https://www.law.cornell.edu/supremecourt/text/253/350",
    sha256: "34860ffcfecc071387bae537b8d43f0c2b5b46bb118fc668ab364c878793c798",
    observedOn: "2026-09-13",
    excerpts: [
      "The two-thirds vote in each house which is required in proposing an amendment is a vote of two-thirds of the members present—assuming the presence of a quorum—and not a vote of two-thirds of the entire membership, present and absent.",
    ],
  },
  {
    artifactId: "ca-constitution-iv",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CONS&article=IV",
    sha256: "0f731aa7ee4d9903a62c8c53c309df55519af67d6ce28142d50326eac36da8fa",
    observedOn: "2026-09-13",
    excerpts: [
      "The Senate has a membership of 40 Senators elected for 4-year terms, 20 to begin every 2 years.",
      "The Assembly has a membership of 80 members elected for 2-year terms.",
      "A majority of the membership constitutes a quorum, but a smaller number may recess from day to day and compel the attendance of absent members.",
    ],
  },
  {
    artifactId: "us-constitution",
    url: "https://www.archives.gov/federal-register/constitution/article-v.html",
    sha256: "4dfeba35d19c5235c5788c9d0ea38d453e17ff2924b1578561941a9ef6d8fa4c",
    observedOn: "2026-09-13",
    excerpts: [],
  },
  {
    artifactId: "ca-constitution-xviii",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CONS&article=XVIII",
    sha256: "fe199d9ecb9fff8fc50f45dd0c90831d17d93cb8e1228a27c98c66bcc0a71d42",
    observedOn: "2026-09-13",
    excerpts: [
      "The Legislature by rollcall vote entered in the journal, two-thirds of the membership of each house concurring, may propose an amendment or revision of the Constitution and in the same manner may amend or withdraw its proposal. Each amendment shall be so prepared and submitted that it can be voted on separately.",
      "The electors may amend the Constitution by initiative.",
      "A proposed amendment or revision shall be submitted to the electors and, if approved by a majority of votes cast thereon, takes effect on the fifth day after the Secretary of State files the statement of the vote for the election at which the measure is voted on, but the measure may provide that it becomes operative after its effective date. If provisions of two or more measures approved at the same election conflict, the provisions of the measure receiving the highest number of affirmative votes shall prevail.",
    ],
  },
  {
    artifactId: "carson-charter",
    url: "https://www.leg.state.nv.us/CityCharters/CtyCCCC.html",
    sha256: "8a26e351cc91505eca8a4eb5d4659a14b27d4edb06e214fd66cd1dd2cf8e84ad",
    observedOn: "2026-09-13",
    excerpts: [
      "The Charter Committee shall: (a) Elect from among its members a Chair and Vice Chair, who each serve for a term of 2 years unless he or she resigns or is removed from the Committee pursuant to section 1.100; (b) Meet at least once every 2 years before the beginning of each regular session of the Legislature and when requested by the Board or the Chair of the Committee; (c) Meet jointly with the Board on a date to be set after the final biennial meeting of the Committee is conducted pursuant to paragraph (b) and before the beginning of the next regular session of the Legislature to advise the Board with regard to the recommendations of the Committee concerning necessary amendments to this Charter; (d) If the Board elects to submit the Committee’s recommended amendments to the Legislature as one of the City’s legislative measures, assist the Board in the timely preparation of such amendments for presentation to the Legislature on behalf of the City; and (e) Perform all functions and do all things necessary to accomplish the purposes for which it is established, including holding meetings and public hearings and obtaining assistance from officers of the City to ensure the Committee’s compliance with any law applicable to a public body. 2. If the Board elects not to submit the Committee’s recommended amendments to the Legislature as one of the City’s legislative measures, the Committee may vote to authorize a member of the Committee to seek sponsorship of a legislative measure by a member of the Senate or Assembly delegation representing the residents of the City and to assist the Senator, Assemblyman or Assemblywoman, as applicable, in the timely preparation of such amendments for presentation to the Legislature. The member of the Committee shall not represent that any such legislative measure is approved or supported by the Board and shall disclose to the Senator, Assemblyman or Assemblywoman, as applicable, that the legislative measure is not approved or supported by the Board.",
    ],
  },
  {
    artifactId: "nv-effective",
    url: "https://www.leg.state.nv.us/NRS/NRS-218D.html",
    sha256: "a256f44ef8ac98ee20ac28d1cac752a002493c1ce86219cfef957512c354891b",
    observedOn: "2026-09-13",
    excerpts: [
      "Each law and joint resolution passed by the Legislature becomes effective on October 1 following its passage, unless the law or joint resolution specifically prescribes a different effective date.",
    ],
  },
  {
    artifactId: "us-quorum",
    url: "https://www.archives.gov/founding-docs/constitution-transcript",
    sha256: "b4a9993a71ff99a0e91a6064007b04d6cafbc2a4c9935046ce1c6f5fd6657cb2",
    observedOn: "2026-09-13",
    excerpts: ["a Majority of each shall constitute a Quorum to do Business"],
  },
] as const;
