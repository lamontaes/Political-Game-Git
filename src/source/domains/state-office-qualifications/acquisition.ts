/**
 * The authorities this domain reads, and which spans of them are law.
 *
 * 31F §8 held production compilation on a choice between two honest paths:
 * retrieve the authorities the research cites, or declare a secondary-source
 * tier. This domain takes the first. Every record it compiles cites bytes this
 * repository fetched from a state's own publisher and hashed, and the claim's
 * value has to be found in those bytes before it becomes a record.
 *
 * A source therefore declares `provisions` rather than one page-wide boundary.
 * The distinction matters twice over. It is the rights boundary — the edicts
 * doctrine reaches enacted text and not the publisher's navigation, search
 * widget, revisor's annotations or case notes, and the Missouri pages carry all
 * four directly beneath the section they publish. And it is the verification
 * boundary — a claim is checked against the provision it cites and nothing
 * else, so "thirty years" appearing somewhere else on the page can never
 * confirm a minimum age.
 *
 * Each provision carries the locator read off the retrieved page itself, never
 * one copied from the research. Where the research cites a provision this
 * domain did not retrieve, the claim is refused with that as its reason; the
 * compiler does not go looking for a better-fitting section, because choosing
 * which provision a claim "really" meant is legal inference.
 *
 * States absent from this list are absent because their authorities were not
 * retrieved in this pass, which is a fact about this repository and never a
 * fact about the state. `docs/research/qualification-source-ledger.md` records
 * each one.
 */

import type {
  AcquisitionRequest,
  ArtifactRights,
  EnactedTextRegion,
  LegalEdictInstrumentKind,
} from "../../core/index";

/** One provision of an instrument: what it is called, and where it sits. */
export interface QualificationProvisionSpec {
  /**
   * The provision's citation, as the retrieved page states it.
   *
   * A claim's own `legal_locator` is compared against this. It is deliberately
   * not derived from the artifact id: "oh-constitution-sec-3-1" is a filename,
   * and "Ohio Const. art. III, § 1" is a claim about what the page publishes.
   */
  readonly locator: string;
  readonly region: EnactedTextRegion;
}

/** One authority, with everything a validator needs to refuse an impostor. */
export interface QualificationSourceSpec {
  readonly artifactId: string;
  readonly url: string;
  readonly provider: string;
  /** `US-XX`. A claim's state is checked against this, never against a prefix. */
  readonly jurisdictionKey: string;
  readonly enactingBody: string;
  readonly instrumentKind: LegalEdictInstrumentKind;
  readonly instrumentTitle: string;
  readonly localPath: string;
  /** In document order. Region *n* of the extract is provision *n*. */
  readonly provisions: readonly [
    QualificationProvisionSpec,
    ...QualificationProvisionSpec[],
  ];
  /** What the provisions together cut out, pinned so a marker edit fails. */
  readonly enacted: { readonly length: number; readonly sha256: string };
}

/** The authorities this domain read, in a stable order. */
export const QUALIFICATION_SOURCES: readonly QualificationSourceSpec[] = [
  {
    artifactId: "mn-constitution",
    url: "https://www.revisor.mn.gov/constitution/",
    provider: "Minnesota Office of the Revisor of Statutes",
    jurisdictionKey: "US-MN",
    enactingBody: "the people of Minnesota",
    instrumentKind: "constitution",
    instrumentTitle: "The Minnesota Constitution",
    localPath:
      "data/source/state-office-qualifications/raw/mn-constitution.html",
    provisions: [
      {
        locator: "Minn. Const. art. IV, § 4",
        region: {
          beginsWith:
            "Sec. 4. Terms of office of senators and representatives; vacancies.",
          endsWith:
            "Senators shall be chosen for a term of four years, except to fill a vacancy and except there shall be an entire new election of all the senators at the first election of representatives after each new legislative apportionment provided for in this article.",
        },
      },
      {
        locator: "Minn. Const. art. IV, § 6",
        region: {
          beginsWith:
            "Sec. 6. Qualification of legislators; judging election returns and eligibility.",
          endsWith:
            "shall have resided one year in the state and six months immediately preceding the election in the district from which elected.",
        },
      },
      {
        locator: "Minn. Const. art. V, § 1",
        region: {
          beginsWith:
            "ARTICLE V EXECUTIVE DEPARTMENT Section 1. Executive officers.",
          endsWith:
            "The governor and lieutenant governor shall be chosen jointly by a single vote applying to both offices in a manner prescribed by law.",
        },
      },
      {
        locator: "Minn. Const. art. V, § 2",
        region: {
          beginsWith:
            "Sec. 2. Term of governor and lieutenant governor; qualifications.",
          endsWith:
            "Each shall have attained the age of 25 years and, shall have been a bona fide resident of the state for one year next preceding his election, and shall be a citizen of the United States.",
        },
      },
      {
        locator: "Minn. Const. art. VII, § 6",
        region: {
          beginsWith: "Sec. 6. Eligibility to hold office.",
          endsWith:
            "is eligible for any office elective by the people in the district wherein he has resided 30 days previous to the election, except as otherwise provided in this constitution, or the constitution and law of the United States.",
        },
      },
    ],
    enacted: {
      length: 1798,
      sha256:
        "90c292cf969f958a4828ea9ed000e9fa73a3316bab5251db9c38a75a93cf082a",
    },
  },
  {
    artifactId: "mo-constitution-art-3-sec-2",
    url: "https://revisor.mo.gov/main/OneSection.aspx?section=III+++2",
    provider: "Missouri Revisor of Statutes",
    jurisdictionKey: "US-MO",
    enactingBody: "the people of Missouri",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Missouri, 1945",
    localPath:
      "data/source/state-office-qualifications/raw/mo-constitution-art-3-sec-2.html",
    provisions: [
      {
        locator: "Mo. Const. art. III, § 2",
        region: {
          beginsWith:
            "Prohibited activities by General Assembly members and employees",
          endsWith:
            "unless the committee has filed the same financial disclosure reports that would be required of a Missouri political action committee.",
        },
      },
    ],
    enacted: {
      length: 3741,
      sha256:
        "be0effa2ba1b8db2df6ce186a41f7896bc506a252469c1cab12e6a29ff69b86e",
    },
  },
  {
    artifactId: "mo-constitution-art-3-sec-4",
    url: "https://revisor.mo.gov/main/OneSection.aspx?section=III+++4",
    provider: "Missouri Revisor of Statutes",
    jurisdictionKey: "US-MO",
    enactingBody: "the people of Missouri",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Missouri, 1945",
    localPath:
      "data/source/state-office-qualifications/raw/mo-constitution-art-3-sec-4.html",
    provisions: [
      {
        locator: "Mo. Const. art. III, § 4",
        region: {
          beginsWith: "Each representative shall be twenty-four years of age",
          endsWith:
            "then of the county or district from which the same shall have been taken.",
        },
      },
    ],
    enacted: {
      length: 379,
      sha256:
        "9b107854e8db404a69b670f8855554bd547dda9c085ee193f923e9cec0f86649",
    },
  },
  {
    artifactId: "mo-constitution-art-3-sec-6",
    url: "https://revisor.mo.gov/main/OneSection.aspx?section=III+++6",
    provider: "Missouri Revisor of Statutes",
    jurisdictionKey: "US-MO",
    enactingBody: "the people of Missouri",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Missouri, 1945",
    localPath:
      "data/source/state-office-qualifications/raw/mo-constitution-art-3-sec-6.html",
    provisions: [
      {
        locator: "Mo. Const. art. III, § 6",
        region: {
          beginsWith: "Each senator shall be thirty years of age",
          endsWith:
            "then of the district or districts from which the same shall have been taken.",
        },
      },
    ],
    enacted: {
      length: 365,
      sha256:
        "3d2abef4709411c22edb74a779bd272ab8006fe58762ca011e202376f6168f80",
    },
  },
  {
    artifactId: "mo-constitution-art-3-sec-8",
    url: "https://revisor.mo.gov/main/OneSection.aspx?section=III+++8",
    provider: "Missouri Revisor of Statutes",
    jurisdictionKey: "US-MO",
    enactingBody: "the people of Missouri",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Missouri, 1945",
    localPath:
      "data/source/state-office-qualifications/raw/mo-constitution-art-3-sec-8.html",
    provisions: [
      {
        locator: "Mo. Const. art. III, § 8",
        region: {
          beginsWith:
            "No one shall be elected to serve more than eight years total in any one house of the General Assembly",
          endsWith: "shall not be counted.",
        },
      },
    ],
    enacted: {
      length: 554,
      sha256:
        "06d26e862170905ee17516ca4143612ad8fe2326ae32158711a8ab8630ce9ed5",
    },
  },
  {
    artifactId: "mo-constitution-art-4-sec-1",
    url: "https://revisor.mo.gov/main/OneSection.aspx?section=IV+++1",
    provider: "Missouri Revisor of Statutes",
    jurisdictionKey: "US-MO",
    enactingBody: "the people of Missouri",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Missouri, 1945",
    localPath:
      "data/source/state-office-qualifications/raw/mo-constitution-art-4-sec-1.html",
    provisions: [
      {
        locator: "Mo. Const. art. IV, § 1",
        region: {
          beginsWith:
            "The supreme executive power shall be vested in a governor.",
          endsWith:
            "The supreme executive power shall be vested in a governor.",
        },
      },
    ],
    enacted: {
      length: 58,
      sha256:
        "a3fff2d12e77b78d0c77335452173dff6be17b910ca35962591a449c10f39e60",
    },
  },
  {
    artifactId: "mo-constitution-art-4-sec-3",
    url: "https://revisor.mo.gov/main/OneSection.aspx?section=IV+++3",
    provider: "Missouri Revisor of Statutes",
    jurisdictionKey: "US-MO",
    enactingBody: "the people of Missouri",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Missouri, 1945",
    localPath:
      "data/source/state-office-qualifications/raw/mo-constitution-art-4-sec-3.html",
    provisions: [
      {
        locator: "Mo. Const. art. IV, § 3",
        region: {
          beginsWith: "The governor shall be at least thirty years old",
          endsWith:
            "a resident of this state at least ten years next before election.",
        },
      },
    ],
    enacted: {
      length: 195,
      sha256:
        "b6c46f81e4294197549e3e5a5d6e23be1ff2842315f2eaad473a39f6196d2cd7",
    },
  },
  {
    artifactId: "mo-constitution-art-4-sec-17",
    url: "https://revisor.mo.gov/main/OneSection.aspx?section=IV+++17",
    provider: "Missouri Revisor of Statutes",
    jurisdictionKey: "US-MO",
    enactingBody: "the people of Missouri",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Missouri, 1945",
    localPath:
      "data/source/state-office-qualifications/raw/mo-constitution-art-4-sec-17.html",
    provisions: [
      {
        locator: "Mo. Const. art. IV, § 17",
        region: {
          beginsWith:
            "The governor, lieutenant governor, secretary of state, state treasurer and attorney general shall be elected at the presidential elections",
          endsWith:
            "All appointive officers may be removed by the governor and shall possess the qualifications required by this constitution or by law.",
        },
      },
    ],
    enacted: {
      length: 941,
      sha256:
        "be7c65231256a3422e1cff5d4725ee87a845465997cfbfe0bebfc7a1ea211064",
    },
  },
  {
    artifactId: "mo-statutes-27-010",
    url: "https://revisor.mo.gov/main/OneSection.aspx?section=27.010",
    provider: "Missouri Revisor of Statutes",
    jurisdictionKey: "US-MO",
    enactingBody: "the Missouri General Assembly",
    instrumentKind: "statute",
    instrumentTitle: "Revised Statutes of Missouri",
    localPath:
      "data/source/state-office-qualifications/raw/mo-statutes-27-010.html",
    provisions: [
      {
        locator: "RSMo 27.010",
        region: {
          beginsWith:
            "The attorney general for the state of Missouri shall be elected",
          endsWith: "shall not engage in the practice of law.",
        },
      },
    ],
    enacted: {
      length: 1019,
      sha256:
        "acc19669e1784cf1450926bd2b1829ffde9c92c4a9e5ebc01023fdb9218ebd4a",
    },
  },
  {
    artifactId: "ne-constitution-art-3-sec-1",
    url: "https://nebraskalegislature.gov/laws/articles.php?article=III-1",
    provider: "Nebraska Legislature",
    jurisdictionKey: "US-NE",
    enactingBody: "the people of Nebraska",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Nebraska",
    localPath:
      "data/source/state-office-qualifications/raw/ne-constitution-art-3-sec-1.html",
    provisions: [
      {
        locator: "Neb. Const. art. III, § 1",
        region: {
          beginsWith:
            "The legislative authority of the state shall be vested in a Legislature consisting of one chamber.",
          endsWith: "which power shall be called the power of referendum.",
        },
      },
    ],
    enacted: {
      length: 531,
      sha256:
        "082ece96c7a9794bf882ee910ef716c0a335652aaea02edbda92334cc4896bbf",
    },
  },
  {
    artifactId: "ne-constitution-art-3-sec-7",
    url: "https://nebraskalegislature.gov/laws/articles.php?article=III-7",
    provider: "Nebraska Legislature",
    jurisdictionKey: "US-NE",
    enactingBody: "the people of Nebraska",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Nebraska",
    localPath:
      "data/source/state-office-qualifications/raw/ne-constitution-art-3-sec-7.html",
    provisions: [
      {
        locator: "Neb. Const. art. III, § 7",
        region: {
          beginsWith: "At the general election to be held in November 1964",
          endsWith:
            "employees of the Legislature shall receive no compensation other than their salary or per diem.",
        },
      },
    ],
    enacted: {
      length: 1400,
      sha256:
        "e0b19fe5b8ab18407d3a2645a064cedbcb30737f063371704a806a5b80fbb125",
    },
  },
  {
    artifactId: "ne-constitution-art-3-sec-8",
    url: "https://nebraskalegislature.gov/laws/articles.php?article=III-8",
    provider: "Nebraska Legislature",
    jurisdictionKey: "US-NE",
    enactingBody: "the people of Nebraska",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Nebraska",
    localPath:
      "data/source/state-office-qualifications/raw/ne-constitution-art-3-sec-8.html",
    provisions: [
      {
        locator: "Neb. Const. art. III, § 8",
        region: {
          beginsWith:
            "No person shall be eligible to the office of member of the Legislature",
          endsWith: "after he shall have removed from such district.",
        },
      },
    ],
    enacted: {
      length: 550,
      sha256:
        "a274888006bee5ac2a98fbcdf7967ed6a189de4ce448347c5043c881b3600918",
    },
  },
  {
    artifactId: "ne-constitution-art-3-sec-12",
    url: "https://nebraskalegislature.gov/laws/articles.php?article=III-12",
    provider: "Nebraska Legislature",
    jurisdictionKey: "US-NE",
    enactingBody: "the people of Nebraska",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Nebraska",
    localPath:
      "data/source/state-office-qualifications/raw/ne-constitution-art-3-sec-12.html",
    provisions: [
      {
        locator: "Neb. Const. art. III, § 12",
        region: {
          beginsWith:
            "(1) No person shall be eligible to serve as a member of the Legislature for four years next after the expiration of two consecutive terms",
          endsWith: "shall be deemed service for a term.",
        },
      },
    ],
    enacted: {
      length: 475,
      sha256:
        "a8a5156871bfe2e0e8bf0b7bb006b9b670ce98bd60c17b85807c7484dcf55219",
    },
  },
  {
    artifactId: "ne-constitution-art-4-sec-1",
    url: "https://nebraskalegislature.gov/laws/articles.php?article=IV-1",
    provider: "Nebraska Legislature",
    jurisdictionKey: "US-NE",
    enactingBody: "the people of Nebraska",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Nebraska",
    localPath:
      "data/source/state-office-qualifications/raw/ne-constitution-art-4-sec-1.html",
    provisions: [
      {
        locator: "Neb. Const. art. IV, § 1",
        region: {
          beginsWith:
            "The executive officers of the state shall be the Governor",
          endsWith:
            "the heads of the various executive or civil departments shall have power to appoint and remove all subordinate employees in their respective departments.",
        },
      },
    ],
    enacted: {
      length: 1910,
      sha256:
        "4b0e2978fcf51e911743f7e82ffd083dd99fba2bb3f932fa883b5aa3761a8d3b",
    },
  },
  {
    artifactId: "ne-constitution-art-4-sec-2",
    url: "https://nebraskalegislature.gov/laws/articles.php?article=IV-2",
    provider: "Nebraska Legislature",
    jurisdictionKey: "US-NE",
    enactingBody: "the people of Nebraska",
    instrumentKind: "constitution",
    instrumentTitle: "Constitution of the State of Nebraska",
    localPath:
      "data/source/state-office-qualifications/raw/ne-constitution-art-4-sec-2.html",
    provisions: [
      {
        locator: "Neb. Const. art. IV, § 2",
        region: {
          beginsWith:
            "No person shall be eligible to the office of Governor, or Lieutenant Governor",
          endsWith:
            "eligible to any other state office during the period for which they have been appointed.",
        },
      },
    ],
    enacted: {
      length: 431,
      sha256:
        "d77dfe7885d2fe586f928383229f445fef514fbe7153fcae2e272053271174de",
    },
  },
  {
    artifactId: "nv-nrs-228",
    url: "https://www.leg.state.nv.us/NRS/NRS-228.html",
    provider: "Nevada Legislature, Legislative Counsel Bureau",
    jurisdictionKey: "US-NV",
    enactingBody: "the Nevada Legislature",
    instrumentKind: "statute",
    instrumentTitle: "Nevada Revised Statutes",
    localPath: "data/source/state-office-qualifications/raw/nv-nrs-228.html",
    provisions: [
      {
        locator: "NRS 228.010",
        region: {
          beginsWith:
            "No person shall be eligible to the Office of Attorney General unless the person:",
          endsWith: "Is a member of the State Bar of Nevada in good standing.",
        },
      },
    ],
    enacted: {
      length: 427,
      sha256:
        "2037751332b3b6a1b8fa0bbcdfaacd5f0ab9f3d309e602b128ebe4391a4c0cf5",
    },
  },
  {
    artifactId: "nv-nrs-218a",
    url: "https://www.leg.state.nv.us/NRS/NRS-218A.html",
    provider: "Nevada Legislature, Legislative Counsel Bureau",
    jurisdictionKey: "US-NV",
    enactingBody: "the Nevada Legislature",
    instrumentKind: "statute",
    instrumentTitle: "Nevada Revised Statutes",
    localPath: "data/source/state-office-qualifications/raw/nv-nrs-218a.html",
    provisions: [
      {
        locator: "NRS 218A.200",
        region: {
          beginsWith:
            "A person is not eligible to be elected or appointed to office as a Legislator unless the person:",
          endsWith:
            "Meets all other qualifications for the office as required by the Constitution and laws of this State.",
        },
      },
    ],
    enacted: {
      length: 601,
      sha256:
        "4153e3d848066df1b32c1a7c6b9af68d694822f34aa2e666bb7a5869f50776a8",
    },
  },
  {
    artifactId: "oh-constitution-sec-2-1",
    url: "https://codes.ohio.gov/ohio-constitution/section-2.1",
    provider:
      "Ohio Laws and Administrative Rules, Legislative Service Commission",
    jurisdictionKey: "US-OH",
    enactingBody: "the people of Ohio",
    instrumentKind: "constitution",
    instrumentTitle: "The Ohio Constitution",
    localPath:
      "data/source/state-office-qualifications/raw/oh-constitution-sec-2-1.html",
    provisions: [
      {
        locator: "Ohio Const. art. II, § 1",
        region: {
          beginsWith:
            "The legislative power of the state shall be vested in a general assembly consisting of a senate and house of representatives",
          endsWith:
            "shall be deemed limitations on the power of the people to enact laws.",
        },
      },
    ],
    enacted: {
      length: 817,
      sha256:
        "620f7ab377e0a7438bd5947dc9d872efa3d5f6f44d97400ba9e114b8a9594b3e",
    },
  },
  {
    artifactId: "oh-constitution-sec-2-2",
    url: "https://codes.ohio.gov/ohio-constitution/section-2.2",
    provider:
      "Ohio Laws and Administrative Rules, Legislative Service Commission",
    jurisdictionKey: "US-OH",
    enactingBody: "the people of Ohio",
    instrumentKind: "constitution",
    instrumentTitle: "The Ohio Constitution",
    localPath:
      "data/source/state-office-qualifications/raw/oh-constitution-sec-2-2.html",
    provisions: [
      {
        locator: "Ohio Const. art. II, § 2",
        region: {
          beginsWith:
            "Representatives shall be elected biennially by the electors of the respective house of representatives districts",
          endsWith:
            "shall be considered to have served the full term in that office.",
        },
      },
    ],
    enacted: {
      length: 1807,
      sha256:
        "33a1992a486be48d3fb08387f5f645582df6fb44207ecf160f4968a0213eaba0",
    },
  },
  {
    artifactId: "oh-constitution-sec-2-3",
    url: "https://codes.ohio.gov/ohio-constitution/section-2.3",
    provider:
      "Ohio Laws and Administrative Rules, Legislative Service Commission",
    jurisdictionKey: "US-OH",
    enactingBody: "the people of Ohio",
    instrumentKind: "constitution",
    instrumentTitle: "The Ohio Constitution",
    localPath:
      "data/source/state-office-qualifications/raw/oh-constitution-sec-2-3.html",
    provisions: [
      {
        locator: "Ohio Const. art. II, § 3",
        region: {
          beginsWith:
            "Senators and representatives shall have resided in their respective districts one year next preceding their election",
          endsWith: "or of this State.",
        },
      },
    ],
    enacted: {
      length: 215,
      sha256:
        "0588dacd1ae83fd205b9206c31202fcfb0b8f27c622f2d877b838b60632e9df6",
    },
  },
  {
    artifactId: "oh-constitution-sec-3-1",
    url: "https://codes.ohio.gov/ohio-constitution/section-3.1",
    provider:
      "Ohio Laws and Administrative Rules, Legislative Service Commission",
    jurisdictionKey: "US-OH",
    enactingBody: "the people of Ohio",
    instrumentKind: "constitution",
    instrumentTitle: "The Ohio Constitution",
    localPath:
      "data/source/state-office-qualifications/raw/oh-constitution-sec-3-1.html",
    provisions: [
      {
        locator: "Ohio Const. art. III, § 1",
        region: {
          beginsWith: "The executive department shall consist of a governor",
          endsWith:
            "at the places of voting for members of the General Assembly.",
        },
      },
    ],
    enacted: {
      length: 330,
      sha256:
        "03b439d7c98d214c985b8ff94c6a31f83edd4da14876cbb7caf790d5e8eddb3c",
    },
  },
  {
    artifactId: "oh-constitution-sec-3-1b",
    url: "https://codes.ohio.gov/ohio-constitution/section-3.1b",
    provider:
      "Ohio Laws and Administrative Rules, Legislative Service Commission",
    jurisdictionKey: "US-OH",
    enactingBody: "the people of Ohio",
    instrumentKind: "constitution",
    instrumentTitle: "The Ohio Constitution",
    localPath:
      "data/source/state-office-qualifications/raw/oh-constitution-sec-3-1b.html",
    provisions: [
      {
        locator: "Ohio Const. art. III, § 1b",
        region: {
          beginsWith:
            "The lieutenant governor shall perform such duties in the executive department",
          endsWith: "as are prescribed by law.",
        },
      },
    ],
    enacted: {
      length: 146,
      sha256:
        "f9d7f39d25a9514f0bc2ef02bf06756f4e1557a9e248b506055fa11dd4d2594e",
    },
  },
  {
    artifactId: "oh-constitution-sec-3-2",
    url: "https://codes.ohio.gov/ohio-constitution/section-3.2",
    provider:
      "Ohio Laws and Administrative Rules, Legislative Service Commission",
    jurisdictionKey: "US-OH",
    enactingBody: "the people of Ohio",
    instrumentKind: "constitution",
    instrumentTitle: "The Ohio Constitution",
    localPath:
      "data/source/state-office-qualifications/raw/oh-constitution-sec-3-2.html",
    provisions: [
      {
        locator: "Ohio Const. art. III, § 2",
        region: {
          beginsWith:
            "The governor, lieutenant governor, secretary of state, treasurer of state, and attorney general shall hold their offices for four years",
          endsWith:
            "shall be considered to have served the full term in that office.",
        },
      },
    ],
    enacted: {
      length: 1777,
      sha256:
        "1bd73628c5bc73cb3d3ca398762a11d055a253668b4c57b822b5a0f24fafde25",
    },
  },
  {
    artifactId: "oh-constitution-sec-15-4",
    url: "https://codes.ohio.gov/ohio-constitution/section-15.4",
    provider:
      "Ohio Laws and Administrative Rules, Legislative Service Commission",
    jurisdictionKey: "US-OH",
    enactingBody: "the people of Ohio",
    instrumentKind: "constitution",
    instrumentTitle: "The Ohio Constitution",
    localPath:
      "data/source/state-office-qualifications/raw/oh-constitution-sec-15-4.html",
    provisions: [
      {
        locator: "Ohio Const. art. XV, § 4",
        region: {
          beginsWith:
            "No person shall be elected or appointed to any office in this state unless possessed of the qualifications of an elector.",
          endsWith:
            "No person shall be elected or appointed to any office in this state unless possessed of the qualifications of an elector.",
        },
      },
    ],
    enacted: {
      length: 121,
      sha256:
        "d0eaf41e2c74711ee61e3131f09b5c6194c259c5cb859b867e17bba7c18e68da",
    },
  },
  {
    artifactId: "oh-revised-code-109-02",
    url: "https://codes.ohio.gov/ohio-revised-code/section-109.02",
    provider:
      "Ohio Laws and Administrative Rules, Legislative Service Commission",
    jurisdictionKey: "US-OH",
    enactingBody: "the Ohio General Assembly",
    instrumentKind: "statute",
    instrumentTitle: "Ohio Revised Code",
    localPath:
      "data/source/state-office-qualifications/raw/oh-revised-code-109-02.html",
    provisions: [
      {
        locator: "R.C. 109.02",
        region: {
          beginsWith:
            "The attorney general is the chief law officer for the state",
          endsWith:
            "the attorney general shall prosecute any person indicted for a crime.",
        },
      },
    ],
    enacted: {
      length: 939,
      sha256:
        "81cf4198453023bef34f47443296b64c6c9f83b0e5a038f8096f60f2fa2cad63",
    },
  },
];

/** Find one declared source, or nothing. Never guesses from an id prefix. */
export function qualificationSource(
  artifactId: string,
): QualificationSourceSpec | undefined {
  return QUALIFICATION_SOURCES.find((spec) => spec.artifactId === artifactId);
}

/** Every state this domain retrieved an authority for, as `US-XX`. */
export const QUALIFICATION_SOURCED_JURISDICTIONS: readonly string[] = [
  ...new Set(QUALIFICATION_SOURCES.map((spec) => spec.jurisdictionKey)),
].sort();

/**
 * The rights determination for one instrument.
 *
 * Each names its own enacting body and its own enacted-text boundary, because
 * "a state enacted it" is the whole content of the claim and a shared constant
 * saying "a state" would be saying nothing.
 */
function edictRights(spec: QualificationSourceSpec): ArtifactRights {
  return {
    status: "public-domain-government-edict",
    declaredLicense: null,
    attributionRequired: "UNKNOWN",
    edict: {
      jurisdictionKey: spec.jurisdictionKey,
      enactingAuthority: `Enacted by ${spec.enactingBody}`,
      instrumentKind: spec.instrumentKind,
      instrumentTitle: spec.instrumentTitle,
      doctrine: "us-government-edicts",
      contentScope: "enacted-legal-text-only",
      scope: {
        boundaryKind: "normalized-text-regions",
        regions: spec.provisions.map((provision) => provision.region),
        extracted: {
          length: spec.enacted.length,
          sha256: spec.enacted.sha256,
        },
      },
    },
  };
}

export const QUALIFICATION_ACQUISITION: {
  readonly domain: string;
  readonly requests: readonly AcquisitionRequest[];
} = {
  domain: "state-office-qualifications",
  requests: QUALIFICATION_SOURCES.map((spec): AcquisitionRequest => ({
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
};
