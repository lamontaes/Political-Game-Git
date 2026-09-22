import type { PolicyPack } from "./policy-packs";

/**
 * What state, county and city government in the United States is about.
 *
 * This is the first policy content the game has ever shipped. Until it, a new
 * world's catalog was empty by design: the bill lifecycle underneath is the
 * deepest thing in the repository and it had nothing to be about, because
 * nobody had decided what the politics were. This pack is that decision,
 * arriving the way `policy-packs.ts` was built for content to arrive — as
 * rows, declaring where they came from, loadable and removable without
 * touching the engine.
 *
 * **What it is and is not.** It is a vocabulary: the fields of government and
 * the recurring questions inside them, in ordinary American government
 * language. It is not an agenda, not a crisis list, and not a set of
 * frequencies. A domain is not a problem; a world with enough housing should
 * get routine zoning and building-code work and no housing emergency. Nothing
 * here says how often anything comes up, because no national source measures
 * state legislative, county board and city council attention on one basis, and
 * the starter weights that were proposed alongside this research are a
 * director's proposal awaiting the owner rather than a measurement. They are
 * deliberately absent from this file.
 *
 * **Levels are routing, not authority.** An issue says which levels ordinarily
 * decide it. That is a statement about American government in general, never
 * about a particular city: whether *this* council was granted zoning power is
 * settled by its own capability record, which this pack does not touch and
 * must not be read as replacing. An issue that names no level is one no source
 * here established, which is a gap rather than a license — a consumer that
 * treats an empty list as "every level" is inventing authority.
 *
 * **This is not the synthetic catalogue.** `createSyntheticPolicyCatalog` in
 * `policy.ts` carries foreign policy and monetary policy, which are federal;
 * it exists for demos and tests and is not a baseline for state and local
 * government. Nothing here inherits from it.
 */

const SOURCES = [
  "NCSL, 50-state searchable bill tracking databases: https://www.ncsl.org/technology-and-communication/ncsl-50-state-searchable-bill-tracking-databases",
  "National League of Cities, 2026 State of the Cities: https://www.nlc.org/post/2026/07/10/new-national-league-of-cities-report-highlights-top-priorities-and-challenges-facing-americas-communities/",
  "National League of Cities, 2025 State of the Cities: https://www.nlc.org/post/2025/07/17/nlcs-annual-state-of-the-cities-report-underscores-local-leadership-amid-rising-economic-and-climate-pressures/",
  "NACo, County Landscape: service provision and public workforce: https://www.naco.org/resource/county-landscape-project-service-provision-and-public-workforce",
  "NACo, County roles and responsibilities: https://www.naco.org/page/county-roles-responsibilities",
  "NASBO, 2025 State Expenditure Report: https://www.nasbo.org/reports-data/state-expenditure-report",
] as const;

const NOTE =
  "The fields of American state, county and municipal government and the " +
  "recurring questions inside them, read from the sources named above. The " +
  "sources establish what these governments do and which level ordinarily " +
  "does it. They do not establish how often any question arises, and this " +
  "pack makes no such claim.";

export const US_STATE_AND_LOCAL_POLICY_PACK: PolicyPack = {
  pack: "us-state-and-local",
  provenance: { kind: "sourced", sources: [...SOURCES], note: NOTE },
  domains: [
    {
      key: "fiscal",
      name: "Budget and taxes",
      description:
        "What government raises, what it spends and what it owes. Appropriations, operating and capital budgets, taxes and fees, debt, pensions and reserves.",
    },
    {
      key: "government-operations",
      name: "Government operations and elections",
      description:
        "How government itself is run and chosen. Election administration, ethics and disclosure, open meetings and records, the civil service, agency organization, and what powers a state gives its localities.",
    },
    {
      key: "education",
      name: "Education",
      description:
        "Schools and what comes after them. Funding, teachers, curriculum, school safety, special education, early childhood, and higher education.",
    },
    {
      key: "health-human-services",
      name: "Health and human services",
      description:
        "Coverage, care and the services people fall back on. Medicaid, insurance, hospitals, public and behavioral health, child and family services, aging and disability, food and income assistance.",
    },
    {
      key: "justice-public-safety",
      name: "Justice and public safety",
      description:
        "Crime, courts and who answers an emergency. Criminal law and sentencing, policing, courts, corrections and reentry, juvenile justice, firearms, and emergency response.",
    },
    {
      key: "housing-land-use",
      name: "Housing and land use",
      description:
        "Where people live and what may be built. Zoning, permitting, housing supply and affordability, tenant and landlord rules, building codes, homelessness, and neighborhood planning.",
    },
    {
      key: "transportation-infrastructure",
      name: "Transportation, infrastructure and utilities",
      description:
        "What carries people and what keeps the lights on. Roads and bridges, transit, rail, airports and ports, water and sewer, broadband, and utility policy.",
    },
    {
      key: "business-commerce",
      name: "Business, commerce and economic development",
      description:
        "Who may trade and on what terms. Occupational and business licensing, consumer protection, insurance, alcohol and gaming, tourism, and development incentives.",
    },
    {
      key: "labor-workforce",
      name: "Labor and workforce",
      description:
        "Work and what it is owed. Wage rules, leave, unemployment, workers' compensation, workplace standards, collective bargaining, public employment, and training.",
    },
    {
      key: "environment-energy",
      name: "Environment, energy and climate",
      description:
        "Air, water, waste and power. Pollution and contamination, conservation, generation and the grid, efficiency, climate mitigation and resilience, and disaster mitigation.",
    },
    {
      key: "agriculture-natural-resources",
      name: "Agriculture and natural resources",
      description:
        "Land that produces. Farming and ranching, forestry, water allocation, fisheries and wildlife, public lands, food safety, and rural development.",
    },
    {
      key: "civil-family-community",
      name: "Civil, family and community policy",
      description:
        "Rights, families and the institutions that hold a place together. Civil rights and discrimination, family law, reproductive policy where the state decides it, children and youth, libraries and culture, and veterans.",
    },
    {
      key: "technology-privacy",
      name: "Technology, privacy and cybersecurity",
      description:
        "Data and the systems that hold it. Privacy and data use, artificial intelligence, cybersecurity, platforms, telecommunications rules, and digital government.",
    },
  ],
  issues: [
    {
      key: "fiscal.operating-budget",
      domain: "fiscal",
      name: "Operating budget",
      description:
        "The year's spending on running the government: what each agency gets and what it must do without.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "fiscal.capital-budget",
      domain: "fiscal",
      name: "Capital budget",
      description:
        "What gets built or replaced, and over how many years it is paid for.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "fiscal.appropriations",
      domain: "fiscal",
      name: "Appropriations",
      description:
        "Money granted to a specific purpose, which is a different act from deciding the purpose is worthwhile.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "fiscal.income-tax",
      domain: "fiscal",
      name: "Income tax",
      description:
        "Who pays tax on what they earn, at what rate, and with which deductions and credits.",
      levels: ["state"],
    },
    {
      key: "fiscal.sales-tax",
      domain: "fiscal",
      name: "Sales tax",
      description:
        "What is taxed at the register, what is exempt, and which governments may add to the rate.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "fiscal.property-tax",
      domain: "fiscal",
      name: "Property tax",
      description:
        "How property is assessed, what rate applies, and which exemptions and caps limit the bill.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "fiscal.excise-taxes",
      domain: "fiscal",
      name: "Excise taxes",
      description:
        "Taxes on particular goods, such as fuel, tobacco, alcohol or cannabis, usually tied to a purpose.",
      levels: ["state"],
    },
    {
      key: "fiscal.fees-and-charges",
      domain: "fiscal",
      name: "Fees and charges",
      description:
        "What government charges for a service, a license or a permit, and whether it covers the cost.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "fiscal.debt-and-bonds",
      domain: "fiscal",
      name: "Debt and bonds",
      description:
        "Borrowing to build, what it may be spent on, and who must approve it.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "fiscal.public-pensions",
      domain: "fiscal",
      name: "Public pensions",
      description:
        "What is promised to public workers in retirement, and what is set aside to pay for it.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "fiscal.reserves",
      domain: "fiscal",
      name: "Reserves",
      description:
        "How much is held back for a bad year, and what counts as bad enough to spend it.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "fiscal.revenue-sharing",
      domain: "fiscal",
      name: "Revenue sharing",
      description:
        "What a state sends down to its counties and cities, and on what conditions.",
      levels: ["state"],
    },
    {
      key: "fiscal.procurement",
      domain: "fiscal",
      name: "Procurement and fiscal controls",
      description:
        "How government buys things, who may sign, and what audit follows.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "government-operations.election-administration",
      domain: "government-operations",
      name: "Election administration",
      description:
        "Running the election itself: polling places, early voting, ballots, counting and certification.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "government-operations.election-rules",
      domain: "government-operations",
      name: "Election rules",
      description:
        "Who may vote and how, what a candidate must do to get on the ballot, and how campaigns are financed.",
      levels: ["state"],
    },
    {
      key: "government-operations.ethics-and-disclosure",
      domain: "government-operations",
      name: "Ethics and disclosure",
      description:
        "What an official must declare, what they may accept, and who decides when a line has been crossed.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "government-operations.lobbying-regulation",
      domain: "government-operations",
      name: "Lobbying regulation",
      description:
        "Who must register to lobby, what they must report, and what they may not do.",
      levels: ["state"],
    },
    {
      key: "government-operations.open-meetings-and-records",
      domain: "government-operations",
      name: "Open meetings and records",
      description:
        "What the public may watch and what it may read, and the exceptions claimed against both.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "government-operations.civil-service",
      domain: "government-operations",
      name: "Civil service",
      description:
        "Hiring, promotion, discipline and tenure for the people who do the work regardless of who won.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "government-operations.agency-organization",
      domain: "government-operations",
      name: "Agency organization",
      description:
        "Which agency owns which job, and what happens when one is created, merged or abolished.",
      levels: ["state"],
    },
    {
      key: "government-operations.state-local-powers",
      domain: "government-operations",
      name: "State and local powers",
      description:
        "What a state lets its localities decide, and what it reserves or takes back by preemption.",
      levels: ["state"],
    },
    {
      key: "government-operations.public-contracting",
      domain: "government-operations",
      name: "Public contracting",
      description:
        "Who may bid, how a contract is awarded, and what a government may require of a contractor.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "government-operations.legislative-procedure",
      domain: "government-operations",
      name: "Legislative and administrative procedure",
      description:
        "The rules a body follows to act at all: notice, referral, amendment, quorum and rulemaking.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "government-operations.redistricting",
      domain: "government-operations",
      name: "Redistricting",
      description:
        "Where the lines are drawn, by whom, and against what standards.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "education.school-funding",
      domain: "education",
      name: "School funding",
      description:
        "How much each school gets, where the money comes from, and how the formula treats a poor district.",
      levels: ["state", "school-district"],
    },
    {
      key: "education.teacher-workforce",
      domain: "education",
      name: "Teachers",
      description:
        "Pay, licensure, preparation, evaluation and the shortages that follow from all four.",
      levels: ["state", "school-district"],
    },
    {
      key: "education.curriculum-and-standards",
      domain: "education",
      name: "Curriculum and standards",
      description:
        "What is taught, what is tested, and who decides which is which.",
      levels: ["state", "school-district"],
    },
    {
      key: "education.school-safety",
      domain: "education",
      name: "School safety",
      description:
        "Buildings, drills, discipline, policing in schools, and what counts as keeping a child safe.",
      levels: ["state", "school-district"],
    },
    {
      key: "education.special-education",
      domain: "education",
      name: "Special education",
      description:
        "What a child with a disability is owed, and who pays for it when the district cannot.",
      levels: ["state", "school-district"],
    },
    {
      key: "education.school-choice",
      domain: "education",
      name: "School choice",
      description:
        "Charters, vouchers, open enrollment and what public money may follow a child out of a public school.",
      levels: ["state"],
    },
    {
      key: "education.early-childhood",
      domain: "education",
      name: "Early childhood",
      description:
        "Pre-kindergarten and child care: who may attend, who may provide, and who pays.",
      levels: ["state"],
    },
    {
      key: "education.higher-education-tuition-and-aid",
      domain: "education",
      name: "College cost and aid",
      description:
        "Tuition, fees, grants, loans and what a state promises a resident student.",
      levels: ["state"],
    },
    {
      key: "education.higher-education-governance",
      domain: "education",
      name: "Higher education governance",
      description:
        "Who governs a public university, and what a board may decide without the legislature.",
      levels: ["state"],
    },
    {
      key: "education.career-and-technical-education",
      domain: "education",
      name: "Career and technical education",
      description:
        "Training that leads to a job, and how it connects to the employers who need one filled.",
      levels: ["state", "school-district"],
    },
    {
      key: "health-human-services.medicaid",
      domain: "health-human-services",
      name: "Medicaid",
      description:
        "Who is covered, what is covered, what providers are paid, and what the state asks of the federal government.",
      levels: ["state"],
    },
    {
      key: "health-human-services.insurance-access",
      domain: "health-human-services",
      name: "Health insurance access",
      description:
        "What an insurer must cover, who may be turned down, and what a marketplace does about the gap.",
      levels: ["state"],
    },
    {
      key: "health-human-services.hospitals-and-providers",
      domain: "health-human-services",
      name: "Hospitals and providers",
      description:
        "Licensing, capacity, charity care, consolidation, and what happens where a hospital closes.",
      levels: ["state"],
    },
    {
      key: "health-human-services.public-health",
      domain: "health-human-services",
      name: "Public health",
      description:
        "Disease control, vaccination, inspection, and the powers a health officer may use in an emergency.",
      levels: ["state", "county"],
    },
    {
      key: "health-human-services.behavioral-health",
      domain: "health-human-services",
      name: "Behavioral health",
      description:
        "Mental health care, crisis response, and the standard for treating someone against their will.",
      levels: ["state", "county"],
    },
    {
      key: "health-human-services.substance-use",
      domain: "health-human-services",
      name: "Substance use",
      description:
        "Prevention, treatment, overdose response and what the law does with possession.",
      levels: ["state", "county"],
    },
    {
      key: "health-human-services.child-and-family-services",
      domain: "health-human-services",
      name: "Child and family services",
      description:
        "Investigation, foster care, adoption and the standard for removing a child from a home.",
      levels: ["state", "county"],
    },
    {
      key: "health-human-services.aging-and-disability",
      domain: "health-human-services",
      name: "Aging and disability services",
      description:
        "Long-term care, home and community services, guardianship, and the waiting lists for all of them.",
      levels: ["state", "county"],
    },
    {
      key: "health-human-services.food-and-income-assistance",
      domain: "health-human-services",
      name: "Food and income assistance",
      description:
        "Benefits for people with little or no income, who qualifies, and what is asked of them.",
      levels: ["state", "county"],
    },
    {
      key: "health-human-services.homelessness-services",
      domain: "health-human-services",
      name: "Homelessness services",
      description:
        "Shelter, outreach, permanent housing and what a government may do about an encampment.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "justice-public-safety.criminal-law-and-sentencing",
      domain: "justice-public-safety",
      name: "Criminal law and sentencing",
      description:
        "What is a crime, what it carries, and what a judge may decide instead.",
      levels: ["state"],
    },
    {
      key: "justice-public-safety.policing",
      domain: "justice-public-safety",
      name: "Policing",
      description:
        "Who polices, under what standards, with what oversight and what record of it.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "justice-public-safety.courts",
      domain: "justice-public-safety",
      name: "Courts",
      description:
        "How many judges, sitting where, with what jurisdiction and what backlog.",
      levels: ["state", "county"],
    },
    {
      key: "justice-public-safety.prosecution-and-defense",
      domain: "justice-public-safety",
      name: "Prosecution and defense",
      description:
        "Charging discretion, diversion, and whether a person who cannot pay gets a real lawyer.",
      levels: ["state", "county"],
    },
    {
      key: "justice-public-safety.corrections-and-prisons",
      domain: "justice-public-safety",
      name: "Prisons",
      description: "Capacity, conditions, staffing, programming and release.",
      levels: ["state"],
    },
    {
      key: "justice-public-safety.jails",
      domain: "justice-public-safety",
      name: "Jails",
      description:
        "Local detention: who is held before trial, for how long, and under what conditions.",
      levels: ["county"],
    },
    {
      key: "justice-public-safety.reentry",
      domain: "justice-public-safety",
      name: "Reentry",
      description:
        "What a person leaving custody is given, is owed and is barred from.",
      levels: ["state", "county"],
    },
    {
      key: "justice-public-safety.juvenile-justice",
      domain: "justice-public-safety",
      name: "Juvenile justice",
      description:
        "How the law treats a child who breaks it, and where that child is held.",
      levels: ["state", "county"],
    },
    {
      key: "justice-public-safety.victim-services",
      domain: "justice-public-safety",
      name: "Victim services",
      description:
        "Notification, compensation, protection and standing in a case.",
      levels: ["state", "county"],
    },
    {
      key: "justice-public-safety.firearms",
      domain: "justice-public-safety",
      name: "Firearms",
      description: "Purchase, carry, storage, removal and who is barred.",
      levels: ["state"],
    },
    {
      key: "justice-public-safety.emergency-response",
      domain: "justice-public-safety",
      name: "Emergency response",
      description:
        "Fire, ambulance, 911 dispatch and who answers when all three are asked for at once.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "housing-land-use.zoning",
      domain: "housing-land-use",
      name: "Zoning",
      description:
        "What may be built where, at what size and density, and what a variance costs.",
      levels: ["county", "municipality"],
    },
    {
      key: "housing-land-use.permitting",
      domain: "housing-land-use",
      name: "Permitting",
      description:
        "How long approval takes, what it requires, and what a delay does to a project.",
      levels: ["county", "municipality"],
    },
    {
      key: "housing-land-use.housing-supply",
      domain: "housing-land-use",
      name: "Housing supply",
      description:
        "Whether enough is being built, and what government does when it is not.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "housing-land-use.housing-affordability",
      domain: "housing-land-use",
      name: "Housing affordability",
      description:
        "Subsidy, inclusionary requirements, and what a household at the local wage can actually rent or buy.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "housing-land-use.tenant-and-landlord-rules",
      domain: "housing-land-use",
      name: "Tenants and landlords",
      description: "Leases, deposits, eviction, habitability and notice.",
      levels: ["state", "municipality"],
    },
    {
      key: "housing-land-use.building-codes",
      domain: "housing-land-use",
      name: "Building codes",
      description:
        "What a building must be able to withstand, and what bringing an old one up to standard costs.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "housing-land-use.homelessness",
      domain: "housing-land-use",
      name: "Homelessness",
      description:
        "The condition itself as a policy question, distinct from the services answering it.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "housing-land-use.redevelopment",
      domain: "housing-land-use",
      name: "Redevelopment",
      description:
        "Public action on a site or district, including acquisition, clearance and what replaces what was there.",
      levels: ["county", "municipality"],
    },
    {
      key: "housing-land-use.neighborhood-planning",
      domain: "housing-land-use",
      name: "Neighborhood planning",
      description:
        "The comprehensive plan and what it commits a government to before any one project arrives.",
      levels: ["county", "municipality"],
    },
    {
      key: "housing-land-use.state-housing-preemption",
      domain: "housing-land-use",
      name: "State housing preemption",
      description:
        "A state deciding a housing question its localities would otherwise decide.",
      levels: ["state"],
    },
    {
      key: "transportation-infrastructure.roads-and-bridges",
      domain: "transportation-infrastructure",
      name: "Roads and bridges",
      description:
        "Building, widening, repairing and closing, across the three levels that own them between them.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "transportation-infrastructure.transit",
      domain: "transportation-infrastructure",
      name: "Transit",
      description:
        "Buses and trains: routes, frequency, fares and who pays the difference.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "transportation-infrastructure.rail",
      domain: "transportation-infrastructure",
      name: "Rail",
      description:
        "Freight and intercity passenger rail, crossings and corridors.",
      levels: ["state"],
    },
    {
      key: "transportation-infrastructure.airports-and-ports",
      domain: "transportation-infrastructure",
      name: "Airports and ports",
      description: "Capacity, access, noise and the authorities that run them.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "transportation-infrastructure.water-and-sewer",
      domain: "transportation-infrastructure",
      name: "Water and sewer",
      description:
        "Treatment, mains, connections and the rate that pays for all three.",
      levels: ["county", "municipality"],
    },
    {
      key: "transportation-infrastructure.stormwater",
      domain: "transportation-infrastructure",
      name: "Stormwater",
      description:
        "Drainage, flooding and what a system built for a smaller storm now has to carry.",
      levels: ["county", "municipality"],
    },
    {
      key: "transportation-infrastructure.broadband",
      domain: "transportation-infrastructure",
      name: "Broadband",
      description:
        "Who is served, who is not, and whether government builds, subsidizes or stays out.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "transportation-infrastructure.utility-regulation",
      domain: "transportation-infrastructure",
      name: "Utility regulation",
      description:
        "Rates, reliability and obligations for electricity, gas and water utilities.",
      levels: ["state"],
    },
    {
      key: "transportation-infrastructure.public-facilities",
      domain: "transportation-infrastructure",
      name: "Public facilities",
      description:
        "Buildings the public uses, from a courthouse to a library branch.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "transportation-infrastructure.capital-construction-and-maintenance",
      domain: "transportation-infrastructure",
      name: "Construction and maintenance",
      description:
        "Getting work built on time, and the deferred maintenance that accumulates when it is not.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "business-commerce.occupational-licensing",
      domain: "business-commerce",
      name: "Occupational licensing",
      description:
        "Which trades require a license, what it takes to get one, and what it does to who can enter.",
      levels: ["state"],
    },
    {
      key: "business-commerce.business-permits",
      domain: "business-commerce",
      name: "Business permits",
      description:
        "Local approval to operate: signage, hours, inspection and the counter a small business has to get through.",
      levels: ["county", "municipality"],
    },
    {
      key: "business-commerce.corporate-regulation",
      domain: "business-commerce",
      name: "Business regulation",
      description:
        "Formation, reporting, governance and the rules a company operates under.",
      levels: ["state"],
    },
    {
      key: "business-commerce.consumer-protection",
      domain: "business-commerce",
      name: "Consumer protection",
      description:
        "Deception, unfair practices, debt collection and what remedy a person actually has.",
      levels: ["state"],
    },
    {
      key: "business-commerce.insurance-regulation",
      domain: "business-commerce",
      name: "Insurance regulation",
      description:
        "Rates, solvency, coverage requirements and the market that is left when insurers withdraw.",
      levels: ["state"],
    },
    {
      key: "business-commerce.banking-and-credit",
      domain: "business-commerce",
      name: "Banking and credit",
      description:
        "State-chartered institutions, lending practices and the terms of consumer credit.",
      levels: ["state"],
    },
    {
      key: "business-commerce.alcohol-cannabis-gaming",
      domain: "business-commerce",
      name: "Alcohol, cannabis and gaming",
      description: "Licensing, hours, location, taxation and local option.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "business-commerce.tourism",
      domain: "business-commerce",
      name: "Tourism",
      description:
        "Promotion, visitor taxes and what a place asks of an industry it depends on.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "business-commerce.development-incentives",
      domain: "business-commerce",
      name: "Development incentives",
      description:
        "Tax abatements, credits and grants offered to attract or keep an employer.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "business-commerce.downtown-and-industrial-development",
      domain: "business-commerce",
      name: "Downtown and industrial development",
      description:
        "Districts, sites and the public investment made to change what happens on them.",
      levels: ["county", "municipality"],
    },
    {
      key: "labor-workforce.minimum-wage",
      domain: "labor-workforce",
      name: "Minimum wage",
      description:
        "The floor, who it covers, how it changes, and whether a locality may set its own.",
      levels: ["state", "municipality"],
    },
    {
      key: "labor-workforce.leave-policy",
      domain: "labor-workforce",
      name: "Leave",
      description:
        "Sick leave, family leave and what an employer must hold open.",
      levels: ["state", "municipality"],
    },
    {
      key: "labor-workforce.unemployment-insurance",
      domain: "labor-workforce",
      name: "Unemployment insurance",
      description:
        "Eligibility, benefit level, duration and the tax that funds it.",
      levels: ["state"],
    },
    {
      key: "labor-workforce.workers-compensation",
      domain: "labor-workforce",
      name: "Workers' compensation",
      description:
        "What an injured worker is owed, who decides, and how long it takes.",
      levels: ["state"],
    },
    {
      key: "labor-workforce.workplace-standards",
      domain: "labor-workforce",
      name: "Workplace standards",
      description: "Safety, hours, scheduling, classification and enforcement.",
      levels: ["state"],
    },
    {
      key: "labor-workforce.collective-bargaining",
      domain: "labor-workforce",
      name: "Collective bargaining",
      description:
        "Who may organize, what is bargainable and what happens when talks fail.",
      levels: ["state"],
    },
    {
      key: "labor-workforce.public-employment",
      domain: "labor-workforce",
      name: "Public employment",
      description:
        "Government as an employer: pay, staffing, vacancies and what the work requires.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "labor-workforce.workforce-training",
      domain: "labor-workforce",
      name: "Workforce training",
      description:
        "Programs connecting people to work that exists, and the shortages they are aimed at.",
      levels: ["state", "county"],
    },
    {
      key: "environment-energy.air-quality",
      domain: "environment-energy",
      name: "Air quality",
      description:
        "Emissions, monitoring, standards and the places that fail them.",
      levels: ["state"],
    },
    {
      key: "environment-energy.water-quality",
      domain: "environment-energy",
      name: "Water quality",
      description:
        "Drinking water, discharges, contamination and the systems that cannot meet the standard.",
      levels: ["state", "county"],
    },
    {
      key: "environment-energy.waste-and-recycling",
      domain: "environment-energy",
      name: "Waste and recycling",
      description:
        "Collection, landfill, diversion and what a program costs when markets move.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "environment-energy.contaminated-sites",
      domain: "environment-energy",
      name: "Contaminated sites",
      description:
        "Liability, cleanup, funding and what becomes of the land afterwards.",
      levels: ["state"],
    },
    {
      key: "environment-energy.conservation",
      domain: "environment-energy",
      name: "Conservation",
      description: "Habitat, open space, easements and public acquisition.",
      levels: ["state", "county"],
    },
    {
      key: "environment-energy.energy-generation-and-grid",
      domain: "environment-energy",
      name: "Energy generation and the grid",
      description:
        "What is generated, by whom, and whether the grid can carry it.",
      levels: ["state"],
    },
    {
      key: "environment-energy.energy-efficiency",
      domain: "environment-energy",
      name: "Energy efficiency",
      description:
        "Standards, retrofits and programs that reduce demand rather than adding supply.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "environment-energy.climate-mitigation",
      domain: "environment-energy",
      name: "Climate mitigation",
      description:
        "Targets, inventories and measures intended to reduce emissions.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "environment-energy.climate-resilience",
      domain: "environment-energy",
      name: "Climate resilience",
      description:
        "Preparing places for heat, flood, fire and storm that are already arriving.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "environment-energy.disaster-mitigation",
      domain: "environment-energy",
      name: "Disaster mitigation",
      description:
        "Hazard planning, buyouts, hardening and what is rebuilt after a loss.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "environment-energy.environmental-permitting",
      domain: "environment-energy",
      name: "Environmental permitting",
      description:
        "Review, conditions, timelines and the tension between protection and getting anything built.",
      levels: ["state"],
    },
    {
      key: "agriculture-natural-resources.farming-and-ranching",
      domain: "agriculture-natural-resources",
      name: "Farming and ranching",
      description:
        "Production, land, labor, inputs and the support programs around them.",
      levels: ["state"],
    },
    {
      key: "agriculture-natural-resources.forestry",
      domain: "agriculture-natural-resources",
      name: "Forestry",
      description:
        "Timber, management, fire and the health of a forest as a working landscape.",
      levels: ["state"],
    },
    {
      key: "agriculture-natural-resources.water-allocation",
      domain: "agriculture-natural-resources",
      name: "Water allocation",
      description:
        "Who has a right to water, in what order, and what happens in a drought.",
      levels: ["state"],
    },
    {
      key: "agriculture-natural-resources.fisheries-and-wildlife",
      domain: "agriculture-natural-resources",
      name: "Fisheries and wildlife",
      description:
        "Seasons, limits, habitat, and conflict between wildlife and the people living alongside it.",
      levels: ["state"],
    },
    {
      key: "agriculture-natural-resources.public-lands",
      domain: "agriculture-natural-resources",
      name: "Public lands",
      description:
        "Access, use, leasing and stewardship of land the public owns.",
      levels: ["state", "county"],
    },
    {
      key: "agriculture-natural-resources.food-safety",
      domain: "agriculture-natural-resources",
      name: "Food safety",
      description:
        "Inspection, handling, recalls and the small producer's path to a legal sale.",
      levels: ["state", "county"],
    },
    {
      key: "agriculture-natural-resources.agricultural-markets",
      domain: "agriculture-natural-resources",
      name: "Agricultural markets",
      description: "Marketing, processing capacity, contracts and price.",
      levels: ["state"],
    },
    {
      key: "agriculture-natural-resources.rural-development",
      domain: "agriculture-natural-resources",
      name: "Rural development",
      description:
        "Investment in places where distance itself is the obstacle.",
      levels: ["state", "county"],
    },
    {
      key: "civil-family-community.civil-rights-and-discrimination",
      domain: "civil-family-community",
      name: "Civil rights",
      description:
        "Protected classes, what is prohibited where, and what enforcement exists behind it.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "civil-family-community.family-law",
      domain: "civil-family-community",
      name: "Family law",
      description: "Marriage, divorce, custody, support and guardianship.",
      levels: ["state"],
    },
    {
      key: "civil-family-community.reproductive-policy",
      domain: "civil-family-community",
      name: "Reproductive policy",
      description:
        "What the state decides about pregnancy, contraception and care, where that decision is the state's to make.",
      levels: ["state"],
    },
    {
      key: "civil-family-community.children-and-youth",
      domain: "civil-family-community",
      name: "Children and youth",
      description:
        "Policy about young people as such, beyond school and beyond the child welfare system.",
      levels: ["state", "county"],
    },
    {
      key: "civil-family-community.libraries",
      domain: "civil-family-community",
      name: "Libraries",
      description:
        "Branches, hours, collections and the fights over what is on the shelf.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "civil-family-community.arts-and-culture",
      domain: "civil-family-community",
      name: "Arts and culture",
      description:
        "Public support for the arts, historic preservation and cultural institutions.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "civil-family-community.parks-and-recreation",
      domain: "civil-family-community",
      name: "Parks and recreation",
      description:
        "Parks, trails, pools and programs, and the maintenance they need to stay usable.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "civil-family-community.veterans",
      domain: "civil-family-community",
      name: "Veterans",
      description: "Benefits, services, homes and preference.",
      levels: ["state", "county"],
    },
    {
      key: "civil-family-community.community-institutions",
      domain: "civil-family-community",
      name: "Community institutions",
      description:
        "The ordinary places a community runs on, and what government does to keep them.",
      levels: ["county", "municipality"],
    },
    {
      key: "technology-privacy.privacy-and-data-use",
      domain: "technology-privacy",
      name: "Privacy and data use",
      description:
        "What may be collected, kept, sold or shared, and what a person may demand about their own record.",
      levels: ["state"],
    },
    {
      key: "technology-privacy.artificial-intelligence",
      domain: "technology-privacy",
      name: "Artificial intelligence",
      description:
        "Where automated decisions are used, what disclosure is required, and what recourse exists.",
      levels: ["state"],
    },
    {
      key: "technology-privacy.cybersecurity",
      domain: "technology-privacy",
      name: "Cybersecurity",
      description:
        "Defending public systems, reporting a breach and recovering from one.",
      levels: ["state", "county", "municipality"],
    },
    {
      key: "technology-privacy.platforms-and-social-media",
      domain: "technology-privacy",
      name: "Platforms and social media",
      description:
        "Moderation, minors, transparency and the limits of what a state may require.",
      levels: ["state"],
    },
    {
      key: "technology-privacy.telecommunications",
      domain: "technology-privacy",
      name: "Telecommunications",
      description:
        "Service obligations, rights of way, franchising and pole attachments.",
      levels: ["state"],
    },
    {
      key: "technology-privacy.digital-government",
      domain: "technology-privacy",
      name: "Digital government",
      description:
        "Online services, identity, accessibility and the records behind them.",
      levels: ["state", "county", "municipality"],
    },
  ],
};
