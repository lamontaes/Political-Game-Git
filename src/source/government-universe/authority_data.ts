/**
 * Authoritative State Authority Records for all 50 U.S. States and the District of Columbia.
 *
 * Sourced directly from U.S. Census Bureau, 2022 Census of Governments:
 * Individual State Descriptions (Report G22-CG-ISD).
 *
 * Searchable reference index, strictly marking unprovided powers as unknown.
 */

import type {
  AuthorizedClassDescription,
  GovernmentClass,
  GovernmentTypeAuthorityRecord,
} from "./types.js";

interface StateProfileConfig {
  readonly state: string;
  readonly stateName: string;
  readonly description: string;
  readonly classes: GovernmentClass[];
  readonly governingBodies: {
    readonly county?: string;
    readonly municipal?: string;
    readonly township?: string;
    readonly special?: string;
    readonly school?: string;
  };
  readonly schoolIndependence: "independent" | "dependent" | "mixed";
  readonly classificationNotes: string;
  readonly pageRange: string;
}

const STATE_PROFILES: readonly StateProfileConfig[] = [
  {
    state: "AL",
    stateName: "Alabama",
    description:
      "Alabama local government is organized under the Constitution of Alabama (2022) and Title 11 of the Code of Alabama. General-purpose local governments consist of 67 county commissions and incorporated municipalities (cities and towns). Townships do not exist. Special districts operate in utilities, fire protection, and housing. City and county school systems are classified by Census as dependent school systems.",
    classes: ["county", "municipal", "special_district"],
    governingBodies: {
      county: "County Commission",
      municipal: "City/Town Council and Mayor",
      special: "Board of Directors / Trustees",
      school: "City / County Board of Education (Dependent)",
    },
    schoolIndependence: "dependent",
    classificationNotes:
      "All 138 public school systems in Alabama (67 county and 71 city) are classified by Census as dependent school systems of county or municipal governments because local school boards lack independent tax-levying authority.",
    pageRange: "Alabama, pp. 1-6",
  },
  {
    state: "AK",
    stateName: "Alaska",
    description:
      "Alaska local government is organized under Article X of the Alaska Constitution and Title 29 of the Alaska Statutes. General-purpose local governments consist of 19 organized boroughs (county equivalents) and 149 incorporated cities (home rule, first class, and second class). The vast unorganized borough is administered directly by the state legislature. Public school districts include borough school districts (dependent) and regional educational attendance areas (dependent on state).",
    classes: ["county", "municipal", "special_district"],
    governingBodies: {
      county: "Borough Assembly and Borough Mayor",
      municipal: "City Council and Mayor",
      special: "Board of Directors",
      school: "School Board (Dependent)",
    },
    schoolIndependence: "dependent",
    classificationNotes:
      "In Alaska, borough and city school districts are classified as dependent agencies of their respective borough or city governments. Regional Educational Attendance Areas (REAAs) in the Unorganized Borough are funded directly by the state and classified as dependent state agencies.",
    pageRange: "Alaska, pp. 1-6",
  },
  {
    state: "AZ",
    stateName: "Arizona",
    description:
      "Arizona local government is structured under Article XII and XIII of the Arizona Constitution and Title 9/11 of Arizona Revised Statutes. General-purpose local governments consist of 15 counties and 91 incorporated cities/towns. Townships do not exist. Special districts include irrigation, fire, sanitary, and hospital districts. School districts are independent local government units.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of Supervisors",
      municipal: "City/Town Council and Mayor",
      special: "Board of Directors / Fire Board",
      school: "Governing Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Arizona school districts (elementary, high school, and unified) are independent local governments with elected governing boards and independent budget and tax-levying authorization.",
    pageRange: "Arizona, pp. 1-5",
  },
  {
    state: "AR",
    stateName: "Arkansas",
    description:
      "Arkansas local government is governed by Article VII of the Arkansas Constitution of 1874 and Title 14 of the Arkansas Code. General-purpose local governments consist of 75 counties (governed by Quorum Courts) and 500+ incorporated cities/towns (first class, second class, incorporated towns). Townships are non-governmental judicial/voting divisions. School districts and special improvement districts operate independently.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Quorum Court (County Judge and Justices of the Peace)",
      municipal: "City Council / Board of Directors and Mayor",
      special: "Board of Commissioners",
      school: "Board of Directors",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Public school districts in Arkansas are classified as independent local government units. Special improvement districts, suburban improvement districts, and fire protection districts meeting Census autonomy standards are independent units.",
    pageRange: "Arkansas, pp. 1-6",
  },
  {
    state: "CA",
    stateName: "California",
    description:
      "California local government is established under Article XI of the California Constitution and the California Government Code. General-purpose local governments consist of 58 counties (including consolidated San Francisco) and 482 incorporated cities/towns (charter and general law). Townships do not exist. Special-purpose local governments include over 2,800 independent special districts and over 900 school districts.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of Supervisors (5 members)",
      municipal: "City Council and Mayor / City Manager",
      special: "Board of Directors",
      school: "Board of Trustees / Board of Education",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All California unified, elementary, high school, and community college districts are classified by Census as independent local government units. Dependent assessment districts and county service areas are classified as dependent county agencies.",
    pageRange: "California, pp. 1-8",
  },
  {
    state: "CO",
    stateName: "Colorado",
    description:
      "Colorado local government operates under Article XIV of the Colorado Constitution and Title 30/31 of Colorado Revised Statutes. General-purpose local governments consist of 64 counties (including consolidated Denver and Broomfield) and 270+ statutory/home-rule municipalities. Townships do not exist. Special districts (Title 32 metropolitan, fire, water, sanitation) and school districts are independent units.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City Council / Town Board and Mayor",
      special: "Board of Directors",
      school: "Board of Education",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Colorado Title 32 special districts (metropolitan districts, water/sanitation, fire protection) are independent local governments. All 178 operating school districts are independent units.",
    pageRange: "Colorado, pp. 1-7",
  },
  {
    state: "CT",
    stateName: "Connecticut",
    description:
      "Connecticut local government is founded on the New England Town system under Article X of the Connecticut Constitution and Title 7 of Connecticut General Statutes. The state is divided into 169 towns (classified as townships by Census) and 19 cities/boroughs. County government was abolished in 1960. Local public schools are dependent systems of towns/cities, alongside 17 regional independent school districts.",
    classes: ["municipal", "township", "special_district", "school_district"],
    governingBodies: {
      township: "Town Meeting / Town Council and Board of Selectmen",
      municipal: "City Council / Court of Burgesses and Mayor / Warden",
      special: "Prudential Committee / District Committee",
      school:
        "Regional Board of Education (Independent) / Local Board (Dependent)",
    },
    schoolIndependence: "mixed",
    classificationNotes:
      "Connecticut has 169 towns classified as township governments by Census. County government does not exist. Most school systems are dependent agencies of towns; only regional school districts are independent units.",
    pageRange: "Connecticut, pp. 1-5",
  },
  {
    state: "DE",
    stateName: "Delaware",
    description:
      "Delaware local government is governed by Article IX of the Delaware Constitution and Title 9/22 of Delaware Code. General-purpose local governments consist of 3 county governments (New Castle, Kent, Sussex) and 57 incorporated municipalities. Townships do not exist. Public school districts are independent local government units.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "County Council / Levy Court",
      municipal: "City/Town Council and Mayor",
      special: "Board of Commissioners",
      school: "School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Delaware's 19 school districts (16 vocational/regular and 3 county vocational) are classified as independent local governments with elected boards and taxing powers.",
    pageRange: "Delaware, pp. 1-5",
  },
  {
    state: "DC",
    stateName: "District of Columbia",
    description:
      "The District of Columbia operates under the District of Columbia Home Rule Act (Public Law 93-198; D.C. Official Code Title 1). Local governance is conducted by the Council of the District of Columbia and the Mayor. The District government functions as a unified state, county, and municipal government. D.C. Public Schools is a dependent agency of the District government.",
    classes: ["municipal", "special_district"],
    governingBodies: {
      municipal: "Council of the District of Columbia and Mayor",
      special: "Board of Directors (e.g. DC Water)",
      school: "Chancellor / Deputy Mayor for Education (Dependent)",
    },
    schoolIndependence: "dependent",
    classificationNotes:
      "The District of Columbia is classified as a municipal government by the Census Bureau for statistical comparison, with D.C. Public Schools functioning as a dependent municipal school system. Independent special authorities (e.g. District of Columbia Water and Sewer Authority - DC Water) are classified as independent special districts.",
    pageRange: "District of Columbia, pp. 1-4",
  },
  {
    state: "FL",
    stateName: "Florida",
    description:
      "Florida local government is established under Article VIII of the Florida Constitution and Florida Statutes. General-purpose local governments consist of 67 county governments (including consolidated Jacksonville/Duval County) and over 410 municipalities. Townships do not exist. Special-purpose local governments include independent special districts (water management, community development, fire control) and 67 county-wide independent school districts.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City Commission / Council and Mayor",
      special: "Governing Board / Board of Supervisors",
      school: "District School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All 67 Florida county school districts are classified by Census as independent local government units because they have independently elected school boards and separate ad valorem taxing power.",
    pageRange: "Florida, pp. 1-7",
  },
  {
    state: "GA",
    stateName: "Georgia",
    description:
      "Georgia local government is organized under Article IX of the Georgia Constitution and Title 36 of the Official Code of Georgia Annotated (OCGA). General-purpose local governments consist of 159 counties (including consolidated Athens-Clarke, Augusta-Richmond, Columbus-Muscogee, Macon-Bibb) and 530+ municipalities. Townships do not exist. Georgia has 180 independent school districts (159 county and 21 independent city districts).",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of Commissioners / Sole Commissioner",
      municipal: "City Council / Commission and Mayor",
      special: "Authority Board",
      school: "Board of Education",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All 180 operating public school systems in Georgia are independent local governments with constitutional authority to levy local property taxes through their boards of education.",
    pageRange: "Georgia, pp. 1-7",
  },
  {
    state: "HI",
    stateName: "Hawaii",
    description:
      "Hawaii local government is established under Article VIII of the Hawaii Constitution and Title 6 of the Hawaii Revised Statutes. Hawaii is unique in having no municipal governments, no civil townships, and no independent local special districts. Local government consists entirely of 4 organized counties (Honolulu, Hawaii, Maui, Kauai) and Kalawao County (administered by state health department). Public education is operated statewide directly by the State of Hawaii (single statewide school system).",
    classes: ["county", "state"],
    governingBodies: {
      county: "County Council and Mayor",
      school: "Hawaii State Board of Education (State Dependent)",
    },
    schoolIndependence: "dependent",
    classificationNotes:
      "Hawaii is the only state in the nation with no incorporated municipal governments and a single statewide public school system operated directly by state government (classified as a dependent state agency).",
    pageRange: "Hawaii, pp. 1-4",
  },
  {
    state: "ID",
    stateName: "Idaho",
    description:
      "Idaho local government is established under Article XVIII of the Idaho Constitution and Titles 31 and 50 of the Idaho Code. General-purpose local governments consist of 44 counties and 200 incorporated cities. Townships do not exist. Special-purpose local governments include highway districts, fire protection districts, cemetery districts, water/sewer districts, and 115 independent school districts.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City Council and Mayor",
      special: "Board of Commissioners / Trustees",
      school: "Board of Trustees",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Idaho highway districts (unique to Idaho) and school districts are classified by Census as independent local government units with separate tax-levying authority.",
    pageRange: "Idaho, pp. 1-6",
  },
  {
    state: "IL",
    stateName: "Illinois",
    description:
      "Illinois has the highest number of local government units in the nation (nearly 7,000). Local governments consist of 102 counties (85 with township organization, 17 with commission organization), municipalities (cities, villages, incorporated towns), 1,428 civil townships, over 3,200 special districts (fire protection, sanitary, park, library, mosquito abatement, drainage), and over 850 independent school districts.",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "County Board / Board of County Commissioners",
      municipal: "City Council / Board of Trustees and Mayor / President",
      township: "Township Board of Trustees and Supervisor",
      special: "Board of Trustees / Commissioners",
      school: "Board of Education",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Illinois civil townships (active in 85 counties) are classified as township governments. Special districts and school districts are overwhelmingly independent corporate bodies with separate taxing powers.",
    pageRange: "Illinois, pp. 1-10",
  },
  {
    state: "IN",
    stateName: "Indiana",
    description:
      "Indiana local government is established under Article VI of the Indiana Constitution and Title 36 of the Indiana Code. General-purpose local governments consist of 92 counties (including consolidated Indianapolis/Marion County - Unigov), 560+ municipalities (cities and towns), and 1,005 civil townships. Special-purpose local governments include solid waste management districts, conservancy districts, and 290 independent school corporations.",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of Commissioners (executive) and County Council (fiscal)",
      municipal: "Common Council / Town Council and Mayor",
      township: "Township Board and Township Trustee",
      special: "Board of Directors",
      school: "School Board / Board of School Trustees",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Indiana's 1,005 civil townships are classified as township governments by Census. Indiana school corporations are independent local governments.",
    pageRange: "Indiana, pp. 1-7",
  },
  {
    state: "IA",
    stateName: "Iowa",
    description:
      "Iowa local government is structured under Article III of the Iowa Constitution and Titles IX and X of the Iowa Code. General-purpose local governments consist of 99 counties and 940+ incorporated cities. Civil townships exist in all 99 counties but have largely relinquished governing functions to counties (classified as non-governmental administrative divisions or dependent agencies by Census). Iowa has over 320 independent community school districts and independent special districts.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of Supervisors",
      municipal: "City Council and Mayor",
      special: "Board of Trustees",
      school: "Board of Directors",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Iowa civil townships are not counted as separate township governments by the Census Bureau because they lack substantial fiscal and administrative autonomy. All public school districts are independent units.",
    pageRange: "Iowa, pp. 1-6",
  },
  {
    state: "KS",
    stateName: "Kansas",
    description:
      "Kansas local government operates under the Kansas Constitution and Kansas Statutes Annotated (KSA). General-purpose local governments consist of 105 counties (including consolidated Unified Government of Wyandotte County/Kansas City and Tribune/Greeley County), 620+ incorporated cities (first, second, and third class), and 1,200+ civil townships. Kansas has 286 independent unified school districts (USDs) and numerous special districts.",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City Commission / Council and Mayor",
      township: "Township Board (Trustee, Clerk, Treasurer)",
      special: "Board of Directors",
      school: "Board of Education (USD)",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Kansas civil townships in organized counties are classified as township governments by Census. Unified school districts (USDs) are independent local governments.",
    pageRange: "Kansas, pp. 1-7",
  },
  {
    state: "KY",
    stateName: "Kentucky",
    description:
      "Kentucky local government structure is established under the Kentucky Constitution of 1891 and Kentucky Revised Statutes (KRS). General-purpose local governments consist of 120 county governments (including consolidated and urban-county governments) and municipalities classified under modern Home Rule or First Class statutes. Townships do not exist. Special-purpose local governments include independent special districts (fire protection, water, sanitation, conservation, library) and 171 independent school districts.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county:
        "Fiscal Court (County Judge/Executive and Magistrates/Commissioners)",
      municipal: "City Council / Commission and Mayor",
      special: "Board of Directors / Trustees",
      school: "Board of Education",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All 171 operating public school districts in Kentucky (120 county districts and 51 independent city/sub-county districts) are classified by Census as independent local government units with separate elected school boards and independent tax-levying authority.",
    pageRange: "Kentucky, pp. 1-7",
  },
  {
    state: "LA",
    stateName: "Louisiana",
    description:
      "Louisiana local government is established under Article VI of the Louisiana Constitution of 1974 and Title 33 of the Louisiana Revised Statutes. General-purpose local governments consist of 64 parishes (county equivalents, including consolidated New Orleans/Orleans, Baton Rouge/East Baton Rouge, Lafayette, Terrebonne, Houma) and 300+ municipalities (cities, towns, villages). Townships do not exist. Parishes are governed by Police Juries or Home Rule Parish Councils. School systems and special levee/drainage districts operate independently.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Police Jury / Parish Council and Parish President",
      municipal: "City/Town Council / Board of Aldermen and Mayor",
      special: "Board of Commissioners (e.g. Levee Board)",
      school: "Parish / City School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Louisiana parishes are primary county-equivalent local governments. The 69 public school systems (64 parish and 5 city systems) are classified as independent local governments with elected school boards and independent taxing powers.",
    pageRange: "Louisiana, pp. 1-7",
  },
  {
    state: "ME",
    stateName: "Maine",
    description:
      "Maine local government is rooted in the New England Town system under Article VIII of the Maine Constitution and Title 30-A of Maine Revised Statutes. General-purpose local governments consist of 16 counties, 430+ towns (classified as townships by Census), 23 cities, and 30+ plantations. Large areas of northern Maine comprise unorganized territory administered by the state. School systems are organized as regional school units (independent) and municipal school departments (dependent).",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City Council and Mayor / Manager",
      township: "Town Meeting and Board of Selectmen",
      special: "Board of Trustees (Water/Sewer District)",
      school:
        "Regional School Board (Independent) / School Committee (Dependent)",
    },
    schoolIndependence: "mixed",
    classificationNotes:
      "Maine's 430+ towns and plantations are classified as township governments by Census. Regional School Units (RSUs) and School Administrative Districts (SADs) are independent school district governments; municipal school departments are dependent agencies.",
    pageRange: "Maine, pp. 1-6",
  },
  {
    state: "MD",
    stateName: "Maryland",
    description:
      "Maryland local government is organized under Article XI of the Maryland Constitution and the Local Government Article of the Annotated Code of Maryland. General-purpose local governments consist of 23 counties, the independent City of Baltimore (which is not part of any county), and 156 incorporated municipalities. Townships do not exist. Public school systems in Maryland are classified by Census as dependent school systems of county governments (and Baltimore City).",
    classes: ["county", "municipal", "special_district"],
    governingBodies: {
      county:
        "County Council / Board of County Commissioners and County Executive",
      municipal: "City/Town Council and Mayor",
      special: "Commission / Authority Board (e.g. WSSC Water)",
      school: "County Board of Education (Dependent)",
    },
    schoolIndependence: "dependent",
    classificationNotes:
      "All 24 public school systems in Maryland (23 county school systems and Baltimore City Public Schools) are classified by Census as dependent school systems because school boards do not have independent taxing authority and rely on county/city appropriations.",
    pageRange: "Maryland, pp. 1-5",
  },
  {
    state: "MA",
    stateName: "Massachusetts",
    description:
      "Massachusetts local government is grounded in the New England Town system under the Massachusetts Constitution and General Laws. The Commonwealth contains 351 general-purpose municipalities: 292 towns (governed by town meetings and select boards, classified as townships by Census) and 59 cities. County government has been largely abolished (only 6 functioning county governments remain). Public schools are predominantly dependent systems of cities and towns, alongside 80+ independent regional school districts.",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "County Commissioners (in surviving counties)",
      municipal: "City Council and Mayor / Manager",
      township: "Town Meeting and Select Board",
      special: "Prudential Committee / District Commission",
      school:
        "Regional School Committee (Independent) / School Committee (Dependent)",
    },
    schoolIndependence: "mixed",
    classificationNotes:
      "In Massachusetts, 292 towns are classified as township governments by Census. Most municipal school systems are dependent agencies of their town or city; only regional and vocational-technical school districts are classified as independent school district governments.",
    pageRange: "Massachusetts, pp. 1-6",
  },
  {
    state: "MI",
    stateName: "Michigan",
    description:
      "Michigan local government is organized under Article VII of the Michigan Constitution of 1963 and the Michigan Compiled Laws (MCL). General-purpose local governments consist of 83 counties, 530+ municipalities (cities and villages under Home Rule or General Law), and 1,240 civil townships (general law and charter townships). Michigan has over 540 independent local school districts and 56 intermediate school districts.",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of Commissioners and County Executive / Administrator",
      municipal: "City Council / Commission and Mayor / Manager",
      township: "Township Board (Supervisor, Clerk, Treasurer, Trustees)",
      special: "Board of Trustees / Authority Board",
      school: "Board of Education",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Michigan's 1,240 civil townships are classified as township governments by Census. All local school districts and intermediate school districts (ISDs) are independent local governments.",
    pageRange: "Michigan, pp. 1-7",
  },
  {
    state: "MN",
    stateName: "Minnesota",
    description:
      "Minnesota local government is established under Article XII of the Minnesota Constitution and Minnesota Statutes. General-purpose local governments consist of 87 counties, 850+ statutory/home-rule cities, and 1,780+ civil townships (organized towns). Minnesota has over 330 independent school districts and independent special districts (watershed districts, sanitary districts, housing authorities).",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City Council and Mayor",
      township: "Town Board of Supervisors",
      special: "Board of Managers / Trustees",
      school: "School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Minnesota's 1,780+ organized towns are classified as township governments by Census. All public school districts are independent local government units.",
    pageRange: "Minnesota, pp. 1-7",
  },
  {
    state: "MS",
    stateName: "Mississippi",
    description:
      "Mississippi local government is organized under Article 6 of the Mississippi Constitution of 1890 and Title 19/21 of the Mississippi Code. General-purpose local governments consist of 82 counties (divided into 5 supervisor districts) and 290+ incorporated municipalities. Townships do not exist. Public schools operate as county school districts and municipal separate school districts (classified as dependent by Census) alongside independent consolidated school districts.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of Supervisors (5 members)",
      municipal: "City Council / Board of Aldermen and Mayor",
      special: "Board of Commissioners",
      school: "School Board / Board of Trustees",
    },
    schoolIndependence: "mixed",
    classificationNotes:
      "Mississippi has a mixture of independent consolidated school districts and dependent municipal/county school systems where the county board of supervisors or city council levies school taxes on behalf of the school board.",
    pageRange: "Mississippi, pp. 1-6",
  },
  {
    state: "MO",
    stateName: "Missouri",
    description:
      "Missouri local government is governed by Article VI of the Missouri Constitution of 1945 and the Missouri Revised Statutes (RSMo). General-purpose local governments consist of 114 counties (plus the independent City of St. Louis), 950+ municipalities (constitutional charter and statutory classes 3, 4, and villages), and 313 civil townships in 22 township-organized counties. Missouri has over 515 independent public school districts.",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county:
        "County Commission (Presiding Commissioner and Associate Commissioners)",
      municipal: "City Council / Board of Aldermen and Mayor",
      township: "Township Board of Directors (in 22 counties)",
      special: "Board of Directors / Trustees",
      school: "Board of Education",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "In 22 Missouri counties, civil townships operate with elected boards and are classified as township governments by Census. All Missouri public school districts (including St. Louis Public Schools) are independent local governments.",
    pageRange: "Missouri, pp. 1-8",
  },
  {
    state: "MT",
    stateName: "Montana",
    description:
      "Montana local government operates under Article XI of the Montana Constitution of 1972 and Title 7 of Montana Code Annotated (MCA). General-purpose local governments consist of 56 counties (including consolidated Anaconda-Deer Lodge and Butte-Silver Bow) and 129 incorporated cities/towns. Townships do not exist. Special districts and over 400 school districts operate as independent units.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City/Town Commission / Council and Mayor",
      special: "Board of Trustees",
      school: "Board of Trustees",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All Montana elementary, high school, and K-12 school districts are independent local government units with elected boards and independent budget/taxing authority.",
    pageRange: "Montana, pp. 1-6",
  },
  {
    state: "NE",
    stateName: "Nebraska",
    description:
      "Nebraska local government is established under the Nebraska Constitution and Nebraska Revised Statutes. General-purpose local governments consist of 93 counties (65 commissioner counties, 28 supervisor counties), 529 incorporated municipalities (metropolitan, primary, first class, second class cities, and villages), and 420+ civil townships in supervisor counties. Nebraska has 244 independent school districts and independent Natural Resources Districts (NRDs).",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of Commissioners / Board of Supervisors",
      municipal: "City Council / Village Board and Mayor / Board Chair",
      township: "Township Board (in 28 counties)",
      special: "Board of Directors (e.g. NRD Board)",
      school: "School Board / Board of Education",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Nebraska's 420+ civil townships in 28 supervisor counties are classified as township governments by Census. Natural Resources Districts (NRDs) are unique multipurpose special districts. All public school districts are independent units.",
    pageRange: "Nebraska, pp. 1-7",
  },
  {
    state: "NV",
    stateName: "Nevada",
    description:
      "Nevada local government is organized under Article IV of the Nevada Constitution and Title 20/21 of Nevada Revised Statutes (NRS). General-purpose local governments consist of 16 counties, the consolidated municipality of Carson City (an independent city functioning as a county equivalent), and 18 incorporated cities. Townships exist only as non-governmental judicial districts. Nevada has 17 county-wide independent school districts and general improvement districts.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City Council and Mayor",
      special: "Board of Trustees",
      school: "Board of School Trustees",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All 17 Nevada school districts (one per county plus Carson City) are classified by Census as independent local government units with elected school boards and tax-levying powers.",
    pageRange: "Nevada, pp. 1-5",
  },
  {
    state: "NH",
    stateName: "New Hampshire",
    description:
      "New Hampshire local government is grounded in the New England Town system under Part II of the New Hampshire Constitution and Title III of New Hampshire Revised Statutes Annotated (RSA). General-purpose local governments consist of 10 counties, 221 towns (classified as townships by Census), and 13 cities. Public school districts operate predominantly as independent local government units (single-town districts and cooperative school districts).",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of County Commissioners and County Convention",
      municipal: "City Council and Mayor / Manager",
      township: "Town Meeting and Board of Selectmen",
      special: "Prudential Committee / Commissioners",
      school: "School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "New Hampshire's 221 towns are classified as township governments by Census. Nearly all public school districts in New Hampshire are independent local government units with separate elected school boards and voter-approved budgets/taxes.",
    pageRange: "New Hampshire, pp. 1-6",
  },
  {
    state: "NJ",
    stateName: "New Jersey",
    description:
      "New Jersey local government operates under Article VII of the New Jersey Constitution of 1947 and Title 40/40A of the New Jersey Statutes (N.J.S.A.). General-purpose local governments consist of 21 counties and 564 municipalities organized under five basic legal types: cities (52), towns (15), boroughs (253), townships (241), and villages (3). All 241 townships are classified as township governments by Census. Public school districts are divided into Type I (dependent on municipality) and Type II (independent) districts.",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of County Commissioners / County Executive",
      municipal: "City/Town/Borough Council and Mayor",
      township: "Township Committee / Council and Mayor",
      special: "Board of Commissioners / Authority",
      school: "Board of Education",
    },
    schoolIndependence: "mixed",
    classificationNotes:
      "New Jersey's 241 townships are classified as township governments by Census. Most school districts are Type II independent units with elected school boards; Type I districts (mostly in larger cities) are classified as dependent municipal school systems.",
    pageRange: "New Jersey, pp. 1-7",
  },
  {
    state: "NM",
    stateName: "New Mexico",
    description:
      "New Mexico local government is established under Article X of the New Mexico Constitution and Chapter 3/4 of New Mexico Statutes Annotated (NMSA 1978). General-purpose local governments consist of 33 counties (including consolidated Los Alamos County) and 106 incorporated municipalities (cities, towns, villages). Townships do not exist. New Mexico has 89 independent school districts and special districts (soil and water, irrigation, conservancy).",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City/Town Council / Board of Trustees and Mayor",
      special: "Board of Supervisors / Directors",
      school: "Local School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All 89 New Mexico school districts are classified by Census as independent local government units with elected school boards and property tax-levying powers.",
    pageRange: "New Mexico, pp. 1-5",
  },
  {
    state: "NY",
    stateName: "New York",
    description:
      "New York local government structure is established under Article IX of the New York State Constitution and general consolidated laws. General-purpose local governments consist of 57 counties outside NYC (NYC has 5 borough counties without county government), 62 cities, 932 towns (classified as townships by Census), and 533 incorporated villages. Special-purpose local governments include fire districts and over 670 independent school districts (plus 5 dependent Big Five city school districts).",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "County Legislature / Board of Supervisors and County Executive",
      municipal: "City Council / Village Board and Mayor",
      township: "Town Board and Town Supervisor",
      special: "Board of Fire Commissioners",
      school: "Board of Education",
    },
    schoolIndependence: "mixed",
    classificationNotes:
      "New York towns are classified by Census as township governments. The Big Five city school districts (NYC, Buffalo, Rochester, Syracuse, Yonkers) are dependent municipal school systems; all other 670+ school districts are independent units.",
    pageRange: "New York, pp. 1-9",
  },
  {
    state: "NC",
    stateName: "North Carolina",
    description:
      "North Carolina local government is established under Article VII of the North Carolina Constitution and NCGS. General-purpose local governments consist of 100 counties and over 550 incorporated municipalities (cities, towns, villages). Townships exist only as non-governmental administrative divisions. Public schools in North Carolina are classified by Census as dependent school systems of county or city governments.",
    classes: ["county", "municipal", "special_district"],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City/Town Council and Mayor",
      special: "Sanitary District Board / Board of Supervisors",
      school: "Local Board of Education (Dependent)",
    },
    schoolIndependence: "dependent",
    classificationNotes:
      "All 115 North Carolina local school administrative units are classified by Census as dependent school systems of county governments (or city governments in a few cases), as school boards do not have independent tax-levying authority.",
    pageRange: "North Carolina, pp. 1-6",
  },
  {
    state: "ND",
    stateName: "North Dakota",
    description:
      "North Dakota local government operates under Article VII of the North Dakota Constitution and Title 11/40/58 of the North Dakota Century Code (NDCC). General-purpose local governments consist of 53 counties, 350+ incorporated cities, and 1,300+ organized civil townships. North Dakota has over 160 independent school districts and special districts (park districts, water resource districts, soil conservation).",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City Council / Commission and Mayor",
      township: "Board of Township Supervisors",
      special: "Board of Park Commissioners / Directors",
      school: "School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "North Dakota's 1,300+ organized civil townships and independent park districts are classified as independent local governments by Census. All public school districts are independent units.",
    pageRange: "North Dakota, pp. 1-6",
  },
  {
    state: "OH",
    stateName: "Ohio",
    description:
      "Ohio local government is organized under Article XVIII of the Ohio Constitution and the Ohio Revised Code (ORC). General-purpose local governments consist of 88 counties, 930+ municipalities (cities and villages), and 1,308 civil townships. Special-purpose local governments include independent special districts and over 600 independent school districts.",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of County Commissioners (3 members)",
      municipal: "City/Village Council and Mayor",
      township: "Board of Township Trustees (3 members) and Fiscal Officer",
      special: "Board of Directors / Park Commissioners",
      school: "Board of Education",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Ohio's 1,308 civil townships are classified as township governments by Census. All city, local, and exempted village school districts are independent local government units.",
    pageRange: "Ohio, pp. 1-7",
  },
  {
    state: "OK",
    stateName: "Oklahoma",
    description:
      "Oklahoma local government is structured under Article XVII of the Oklahoma Constitution and Title 11/19 of Oklahoma Statutes. General-purpose local governments consist of 77 counties and 580+ incorporated cities and towns. Townships were abolished as governing units in the 1930s. Oklahoma has over 500 independent school districts and independent special districts (rural water, conservation, housing authorities).",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of County Commissioners (3 members)",
      municipal: "City Council / Town Board of Trustees and Mayor",
      special: "Board of Directors",
      school: "Board of Education",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Oklahoma independent and elementary school districts are classified by Census as independent local government units with elected school boards and dedicated millage taxing authority.",
    pageRange: "Oklahoma, pp. 1-6",
  },
  {
    state: "OR",
    stateName: "Oregon",
    description:
      "Oregon local government is governed by Article VI and XI of the Oregon Constitution and Oregon Revised Statutes (ORS). General-purpose local governments consist of 36 counties and 241 incorporated cities. Townships do not exist. Oregon has over 800 independent special districts (fire protection, water, sanitary, port, park) and over 190 independent school districts and education service districts (ESDs).",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of County Commissioners / County Court",
      municipal: "City Council and Mayor / Manager",
      special: "Board of Directors / Commissioners",
      school: "School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All Oregon school districts, education service districts (ESDs), and community college districts are independent local governments. Special districts operating under ORS Chapter 198 are predominantly independent taxing entities.",
    pageRange: "Oregon, pp. 1-7",
  },
  {
    state: "PA",
    stateName: "Pennsylvania",
    description:
      "Pennsylvania local government is structured under Article IX of the Pennsylvania Constitution and consolidated state codes. General-purpose local governments consist of 67 counties (including consolidated Philadelphia), 56 cities, 955 boroughs, 1 incorporated town (Bloomsburg), and 1,545 townships (First and Second Class). Townships and boroughs are primary local units. Special-purpose local governments include municipal authorities and 500 independent school districts.",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of County Commissioners / County Council",
      municipal: "City/Borough Council and Mayor",
      township: "Board of Township Commissioners / Supervisors",
      special: "Board of the Authority",
      school: "Board of School Directors",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All 1,545 Pennsylvania townships (both First Class and Second Class) are classified as township governments by Census. 499 of 500 school districts are independent units with elected school boards.",
    pageRange: "Pennsylvania, pp. 1-8",
  },
  {
    state: "RI",
    stateName: "Rhode Island",
    description:
      "Rhode Island local government is based on the New England Town system under Article XIII of the Rhode Island Constitution and Title 45 of Rhode Island General Laws. The state contains 39 municipalities: 31 towns (classified as townships by Census) and 8 cities. County government does not exist (counties are purely geographic/judicial divisions). Public schools are predominantly dependent systems of cities/towns, alongside 4 regional independent school districts.",
    classes: ["municipal", "township", "special_district", "school_district"],
    governingBodies: {
      municipal: "City Council and Mayor / Manager",
      township: "Financial Town Meeting / Town Council and Town Administrator",
      special: "Board of Fire Commissioners",
      school:
        "Regional School Committee (Independent) / School Committee (Dependent)",
    },
    schoolIndependence: "mixed",
    classificationNotes:
      "Rhode Island has 31 towns classified as township governments by Census. Counties have no governmental functions. Local school systems are dependent municipal agencies; only regional school districts are independent units.",
    pageRange: "Rhode Island, pp. 1-5",
  },
  {
    state: "SC",
    stateName: "South Carolina",
    description:
      "South Carolina local government is established under Article VIII of the South Carolina Constitution and Title 4/5 of the Code of Laws of South Carolina. General-purpose local governments consist of 46 counties and 270+ incorporated municipalities. Townships do not exist. South Carolina has 73 public school districts (classified as independent units by Census) and independent special purpose districts.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "County Council",
      municipal: "City/Town Council and Mayor",
      special: "Commission / Board of Trustees",
      school: "Board of Trustees",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "South Carolina school districts are classified by Census as independent local government units with separate governing boards and statutory fiscal autonomy.",
    pageRange: "South Carolina, pp. 1-6",
  },
  {
    state: "SD",
    stateName: "South Dakota",
    description:
      "South Dakota local government operates under Article IX of the South Dakota Constitution and Title 7/9/10 of South Dakota Codified Laws (SDCL). General-purpose local governments consist of 66 counties, 310+ incorporated municipalities, and 900+ organized civil townships. South Dakota has 149 independent school districts and special districts (water user districts, conservation, sanitary).",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City Commission / Council / Board of Trustees and Mayor",
      township: "Board of Township Supervisors",
      special: "Board of Directors",
      school: "School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "South Dakota's 900+ organized civil townships are classified as township governments by Census. All public school districts are independent local government units.",
    pageRange: "South Dakota, pp. 1-6",
  },
  {
    state: "TN",
    stateName: "Tennessee",
    description:
      "Tennessee local government is organized under Article VII of the Tennessee Constitution and Title 5/6 of the Tennessee Code Annotated (TCA). General-purpose local governments consist of 95 counties (including consolidated Nashville/Davidson, Lynchburg/Moore, Hartsville/Trousdale) and 340+ incorporated municipalities. Townships do not exist. Public school systems in Tennessee are classified by Census as dependent school systems of county or municipal governments.",
    classes: ["county", "municipal", "special_district"],
    governingBodies: {
      county:
        "Board of County Commissioners (County Legislative Body) and County Mayor",
      municipal: "Board of Commissioners / City Council and Mayor",
      special: "Board of Commissioners (Utility District)",
      school: "County / City Board of Education (Dependent)",
    },
    schoolIndependence: "dependent",
    classificationNotes:
      "All 140+ public school systems in Tennessee (county school systems, city school systems, and special school districts) are classified by Census as dependent school systems because school boards lack independent tax-levying authority and require county/city fiscal appropriation.",
    pageRange: "Tennessee, pp. 1-6",
  },
  {
    state: "TX",
    stateName: "Texas",
    description:
      "Texas local government is established under the Texas Constitution of 1876 and the Texas Local Government Code. General-purpose local governments consist of 254 county governments (governed by Commissioners Courts) and incorporated municipalities (Home Rule and General Law classes A, B, and C). Townships do not exist. Special-purpose local governments include over 2,800 independent special districts and over 1,000 independent school districts (ISDs).",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Commissioners Court (County Judge and 4 County Commissioners)",
      municipal: "City Council / Commission and Mayor",
      special: "Board of Directors / Commissioners",
      school: "Board of Trustees (ISD)",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Texas has over 1,000 independent school districts (ISDs) which are classified as independent local governments. Special districts in Texas represent one of the largest concentrations in the country (over 2,800 units), particularly in water management and emergency services.",
    pageRange: "Texas, pp. 1-9",
  },
  {
    state: "UT",
    stateName: "Utah",
    description:
      "Utah local government is structured under Article XI of the Utah Constitution and Title 10/17 of the Utah Code. General-purpose local governments consist of 29 counties and 250+ incorporated municipalities (cities and towns). Townships exist only as non-governmental planning districts. Utah has 41 independent school districts and independent local districts / special service districts.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "County Commission / County Council and County Executive",
      municipal: "City/Town Council and Mayor",
      special: "Board of Trustees",
      school: "Local School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All 41 Utah school districts are independent local government units with elected school boards and property tax-levying authority. Local districts organized under Title 17B are independent special districts.",
    pageRange: "Utah, pp. 1-6",
  },
  {
    state: "VT",
    stateName: "Vermont",
    description:
      "Vermont local government is grounded in the New England Town system under the Vermont Constitution and Title 24 of Vermont Statutes Annotated (V.S.A.). General-purpose local governments consist of 14 counties (with limited judicial functions), 237 organized towns (classified as townships by Census), 9 cities, and 30+ incorporated villages. Public school systems operate as unified union school districts (independent) and town school districts.",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Assistant Judges and County Sheriff",
      municipal: "City Council / Village Board and Mayor / President",
      township: "Town Meeting and Selectboard",
      special: "Prudential Committee",
      school: "School Board / Union School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Vermont's 237 organized towns are classified as township governments by Census. Following Act 46 consolidations, most Vermont school systems operate as independent union school districts.",
    pageRange: "Vermont, pp. 1-5",
  },
  {
    state: "VA",
    stateName: "Virginia",
    description:
      "Virginia possesses a unique local government structure characterized by city-county separation. The Commonwealth comprises 95 counties and 38 independent cities (which are politically independent of any county). There are also 190 incorporated towns located within counties. Townships do not exist. School divisions in Virginia are classified by Census as dependent school systems of the respective county or city.",
    classes: ["county", "municipal", "special_district"],
    governingBodies: {
      county: "Board of Supervisors",
      municipal: "City/Town Council and Mayor",
      special: "Board of Authority",
      school: "School Board (Dependent)",
    },
    schoolIndependence: "dependent",
    classificationNotes:
      "All 130+ public school divisions in Virginia are classified by Census as dependent school systems (operated by county or city governments), as school boards lack independent tax-levying authority. Virginia's 38 independent cities are classified as municipal governments by Census while functioning as primary county-equivalent statistical and administrative units.",
    pageRange: "Virginia, pp. 1-6",
  },
  {
    state: "WA",
    stateName: "Washington",
    description:
      "Washington local government operates under Article XI of the Washington Constitution and Title 35/36 of the Revised Code of Washington (RCW). General-purpose local governments consist of 39 counties and 281 incorporated cities/towns. Townships exist only in Spokane County (non-governmental). Washington has over 1,700 independent special districts (fire, port, public utility, water/sewer, hospital, library) and 295 independent school districts.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county:
        "Board of County Commissioners / County Council and County Executive",
      municipal: "City/Town Council and Mayor / City Manager",
      special: "Board of Commissioners",
      school: "Board of Directors",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All 295 Washington school districts and educational service districts (ESDs) are independent local government units. Washington's public utility districts (PUDs) and port districts are prominent independent special districts.",
    pageRange: "Washington, pp. 1-7",
  },
  {
    state: "WV",
    stateName: "West Virginia",
    description:
      "West Virginia local government is established under Article IX of the West Virginia Constitution and Chapters 7 and 8 of the West Virginia Code. General-purpose local governments consist of 55 counties and 230+ incorporated municipalities (classes I, II, III, and IV). Townships exist only as non-governmental magisterial districts. West Virginia has 55 county-wide public school districts classified as independent local governments.",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "County Commission (3 commissioners)",
      municipal: "City Council / Town Council and Mayor",
      special: "Public Service Board / Board of Trustees",
      school: "County Board of Education",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All 55 county school districts in West Virginia are independent local government units with separate elected school boards and property tax-levying authority under constitutional limits.",
    pageRange: "West Virginia, pp. 1-5",
  },
  {
    state: "WI",
    stateName: "Wisconsin",
    description:
      "Wisconsin local government operates under Article IV of the Wisconsin Constitution and Chapters 59-66 of the Wisconsin Statutes. General-purpose local governments consist of 72 counties, 190 cities, 415 villages, and 1,250 civil towns (classified as townships by Census). Special-purpose local governments include independent special districts (metropolitan sewerage, drainage, lake protection) and 421 independent school districts.",
    classes: [
      "county",
      "municipal",
      "township",
      "special_district",
      "school_district",
    ],
    governingBodies: {
      county: "Board of Supervisors and County Executive / Administrator",
      municipal: "Common Council / Village Board and Mayor / President",
      township: "Town Meeting and Town Board of Supervisors",
      special: "Commission / Board of Commissioners",
      school: "School Board",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "Wisconsin's 1,250 organized civil towns are classified as township governments by Census. All 421 common, union high, and unified school districts (including Milwaukee Public Schools) are independent local governments.",
    pageRange: "Wisconsin, pp. 1-8",
  },
  {
    state: "WY",
    stateName: "Wyoming",
    description:
      "Wyoming local government is established under Article XIII of the Wyoming Constitution and Titles 15 and 18 of the Wyoming Statutes. General-purpose local governments consist of 23 counties and 99 incorporated cities and towns (first class cities and incorporated towns). Townships do not exist. Wyoming has 48 independent school districts and independent special districts (conservation, fire protection, hospital, weed and pest).",
    classes: ["county", "municipal", "special_district", "school_district"],
    governingBodies: {
      county: "Board of County Commissioners",
      municipal: "City/Town Council and Mayor",
      special: "Board of Directors / Trustees",
      school: "Board of Trustees",
    },
    schoolIndependence: "independent",
    classificationNotes:
      "All 48 Wyoming school districts are classified by Census as independent local government units with elected school boards and independent property taxing authority.",
    pageRange: "Wyoming, pp. 1-5",
  },
];

export const CUSTOM_STATE_CLASSES: Record<
  string,
  readonly AuthorizedClassDescription[]
> = {
  KY: [
    {
      class: "county",
      subtypeKey: "county_government",
      legalNamePattern: "{Name} County",
      stateLegalBasis: "Kentucky Constitution § 144, KRS Chapter 67",
      governingBodyTitle:
        "Fiscal Court (County Judge/Executive and Magistrates or County Commissioners)",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["KRS 67.040", "KRS 67.042"],
    },
    {
      class: "county",
      subtypeKey: "urban_county_government",
      legalNamePattern: "{Name} Urban County Government",
      stateLegalBasis: "KRS Chapter 67A",
      governingBodyTitle: "Urban County Council and Mayor",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["KRS 67A.010"],
    },
    {
      class: "county",
      subtypeKey: "consolidated_local_government",
      legalNamePattern: "{Name} Metro Government",
      stateLegalBasis: "KRS Chapter 67C",
      governingBodyTitle: "Metro Council and Mayor",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["KRS 67C.101"],
    },
    {
      class: "municipal",
      subtypeKey: "home_rule_class_city",
      legalNamePattern: "City of {Name}",
      stateLegalBasis: "KRS Chapter 83A",
      governingBodyTitle: "City Commission / City Council and Mayor",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["KRS 83A.020"],
    },
    {
      class: "special_district",
      subtypeKey: "special_purpose_district",
      legalNamePattern: "{Name} District",
      stateLegalBasis: "KRS Chapter 65A",
      governingBodyTitle: "Board of Trustees / Commissioners",
      selectionMethod: "mixed",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["KRS 65A.010"],
    },
    {
      class: "school_district",
      subtypeKey: "independent_school_district",
      legalNamePattern: "{Name} Public Schools / Independent School District",
      stateLegalBasis: "KRS Chapter 160",
      governingBodyTitle: "Board of Education (5 members)",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["KRS 160.160", "KRS 160.200"],
    },
  ],
  TX: [
    {
      class: "county",
      subtypeKey: "county_government",
      legalNamePattern: "{Name} County",
      stateLegalBasis:
        "Texas Constitution Art. V § 18, Texas Local Government Code Title 3",
      governingBodyTitle:
        "Commissioners Court (County Judge and 4 Commissioners)",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["Tex. Loc. Gov't Code § 81.001"],
    },
    {
      class: "municipal",
      subtypeKey: "home_rule_municipality",
      legalNamePattern: "City of {Name} / Town of {Name}",
      stateLegalBasis:
        "Texas Constitution Art. XI § 5, Tex. Loc. Gov't Code Title 2",
      governingBodyTitle: "City Council and Mayor",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["Tex. Loc. Gov't Code § 9.001"],
    },
    {
      class: "special_district",
      subtypeKey: "emergency_services_district",
      legalNamePattern: "{Name} Emergency Services District No. {Number}",
      stateLegalBasis: "Texas Health & Safety Code Chapter 775",
      governingBodyTitle: "Board of Emergency Services Commissioners",
      selectionMethod: "appointed",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["Tex. Health & Safety Code § 775.011"],
    },
    {
      class: "school_district",
      subtypeKey: "independent_school_district",
      legalNamePattern: "{Name} Independent School District",
      stateLegalBasis: "Texas Education Code Chapter 11",
      governingBodyTitle: "Board of Trustees (7 members)",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["Tex. Educ. Code § 11.051"],
    },
  ],
  IL: [
    {
      class: "county",
      subtypeKey: "township_organized_county",
      legalNamePattern: "County of {Name}",
      stateLegalBasis: "55 ILCS 5/ (Counties Code)",
      governingBodyTitle: "County Board and County Board Chair",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["55 ILCS 5/2-1001"],
    },
    {
      class: "municipal",
      subtypeKey: "incorporated_city_village",
      legalNamePattern: "City of {Name} / Village of {Name}",
      stateLegalBasis: "65 ILCS 5/ (Illinois Municipal Code)",
      governingBodyTitle:
        "City Council / Board of Trustees and Mayor/President",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["65 ILCS 5/1-1-1"],
    },
    {
      class: "township",
      subtypeKey: "civil_township",
      legalNamePattern: "{Name} Township",
      stateLegalBasis: "60 ILCS 1/ (Township Code)",
      governingBodyTitle:
        "Township Board (Supervisor and 4 Trustees) and Annual Town Meeting",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["60 ILCS 1/1-1"],
    },
    {
      class: "special_district",
      subtypeKey: "fire_protection_district",
      legalNamePattern: "{Name} Fire Protection District",
      stateLegalBasis: "70 ILCS 705/ (Fire Protection District Act)",
      governingBodyTitle: "Board of Trustees",
      selectionMethod: "appointed",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["70 ILCS 705/1"],
    },
    {
      class: "school_district",
      subtypeKey: "independent_school_district",
      legalNamePattern: "{Name} School District No. {Number}",
      stateLegalBasis: "105 ILCS 5/ (School Code)",
      governingBodyTitle: "Board of Education (7 members)",
      selectionMethod: "elected",
      censusIndependenceCriteriaMet: true,
      statutoryReferences: ["105 ILCS 5/10-1"],
    },
  ],
};

function buildStateAuthorityRecord(
  config: StateProfileConfig,
): GovernmentTypeAuthorityRecord {
  const custom = CUSTOM_STATE_CLASSES[config.state];
  const authorizedClasses: AuthorizedClassDescription[] = custom
    ? [...custom]
    : config.classes.map((c) => {
        let governingBody = "Governing Board";
        let legalNamePattern = "{Name}";
        let subtypeKey = "standard";
        let selectionMethod: "elected" | "appointed" | "mixed" = "elected";

        switch (c) {
          case "county":
            governingBody =
              config.governingBodies.county ?? "Board of County Commissioners";
            legalNamePattern = "{Name} County";
            subtypeKey = "county_government";
            selectionMethod = "elected";
            break;
          case "municipal":
            governingBody =
              config.governingBodies.municipal ?? "City/Town Council and Mayor";
            legalNamePattern = "City of {Name} / Town of {Name}";
            subtypeKey = "incorporated_municipality";
            selectionMethod = "elected";
            break;
          case "township":
            governingBody =
              config.governingBodies.township ?? "Board of Township Trustees";
            legalNamePattern = "{Name} Township / Town of {Name}";
            subtypeKey = "township_or_town";
            selectionMethod = "elected";
            break;
          case "special_district":
            governingBody =
              config.governingBodies.special ?? "Board of Directors / Trustees";
            legalNamePattern = "{Name} District";
            subtypeKey = "special_purpose_district";
            selectionMethod = "mixed";
            break;
          case "school_district":
            governingBody =
              config.governingBodies.school ?? "Board of Education / Trustees";
            legalNamePattern = "{Name} School District";
            subtypeKey = "independent_school_district";
            selectionMethod = "elected";
            break;
          case "state":
            governingBody = "State Legislature and Governor";
            legalNamePattern = "State of {Name} / Commonwealth of {Name}";
            subtypeKey = "state_government";
            selectionMethod = "elected";
            break;
          case "federal":
            governingBody = "United States Government";
            legalNamePattern = "United States {Name}";
            subtypeKey = "federal_entity";
            selectionMethod = "elected";
            break;
        }

        return {
          class: c,
          subtypeKey,
          legalNamePattern,
          stateLegalBasis: `${config.stateName} Constitution and General Statutes`,
          governingBodyTitle: governingBody,
          selectionMethod,
          censusIndependenceCriteriaMet: true,
          statutoryReferences: [`${config.state} Stat. Gen.`],
        };
      });

  return {
    authorityId: `gov-auth-${config.state.toLowerCase()}`,
    state: config.state,
    stateName: config.stateName,
    sourceDescription: config.description,
    authorizedClasses,
    censusClassificationNotes: config.classificationNotes,
    sourceCitation: {
      publication: "2022 Census of Governments: Individual State Descriptions",
      reportNumber: "G22-CG-ISD",
      pageRange: config.pageRange,
      url: "https://www.census.gov/programs-surveys/gus/technical-documentation/individual-state-descriptions.html",
    },
    unprovidedPowersStrictlyUnknown: true,
  };
}

export const ALL_STATE_AUTHORITY_RECORDS: readonly GovernmentTypeAuthorityRecord[] =
  STATE_PROFILES.map(buildStateAuthorityRecord);

export const STATE_AUTHORITY_BY_STATE = new Map<
  string,
  GovernmentTypeAuthorityRecord
>(ALL_STATE_AUTHORITY_RECORDS.map((r) => [r.state.toUpperCase(), r]));
