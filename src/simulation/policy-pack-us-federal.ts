import type { PolicyPack } from "./policy-packs";

/**
 * What the federal government of the United States is about.
 *
 * The second vocabulary pack, and the first above the state. It arrived as
 * research (DEPTH2 A04) and is loaded here as written: twenty fields of
 * federal government, sixty questions inside them, and sixty things a person
 * can know about, one for each question.
 *
 * **Its own namespace, on purpose.** Everything here is keyed `us-federal:`,
 * so nothing in it can re-key, rename or overwrite the state and local pack or
 * the positions that point into it. A federal education grant is not local
 * school operation, and federal taxation is not every similarly named state or
 * county tax: where the two packs cover the same ground they stay two
 * questions, decided at two levels.
 *
 * **Levels are routing, not authority.** Every issue here says `federal`,
 * which says where the question is ordinarily decided and grants no office
 * the power to decide it. A proposal still has to resolve the actual legal
 * power, institution, accounts and affected population before it acts.
 *
 * **Registering a subject gives nobody the knowledge.** A subject is a thing
 * that can be known; who knows it is recorded elsewhere, and loading this pack
 * writes no one's knowledge.
 *
 * **Not an agenda.** Sixty questions is a vocabulary, not sixty problems.
 * Nothing here says how often any of them comes up, and the grouping into
 * twenty fields is the director's synthesis over Congress's official policy
 * areas, not an official classification.
 */

const SOURCES = [
  "https://www.congress.gov/help/field-values/policy-area",
  "https://www.senate.gov/about/powers-procedures.htm",
  "https://www.federalreserve.gov/monetarypolicy/fomc.htm",
  "https://www.hhs.gov/answers/medicare-and-medicaid/what-is-the-difference-between-medicare-medicaid/index.html",
  "https://www.medicaid.gov/medicaid",
  "https://www.ed.gov/about/ed-overview",
  "https://www.ssa.gov/policy/docs/ssb/v66n1/v66n1p1.html",
  "https://content.govdelivery.com/accounts/USDHSFEMA/bulletins/3d9d2ce",
  "https://www.fec.gov/campaign-finance-data/candidate-committee-linkage-file-description/",
] as const;

const NOTE =
  "Federal issue vocabulary compiled from the official CRS policy-area scope notes plus the listed program/authority sources. Grouping and question phrasing are director synthesis, not an official CRS replacement, exact legal profile or measurement of agenda frequency. This pack neither renames nor replaces the current state/local pack.";

export const US_FEDERAL_POLICY_PACK: PolicyPack = {
  pack: "us-federal",
  provenance: { kind: "sourced", sources: [...SOURCES], note: NOTE },
  domains: [
    {
      key: "budget",
      name: "Federal budget, borrowing and fiscal operations",
      description:
        "Federal questions concerning federal budget, borrowing and fiscal operations. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "tax",
      name: "Federal taxation and revenue",
      description:
        "Federal questions concerning federal taxation and revenue. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "monetary-financial",
      name: "Monetary policy and the financial system",
      description:
        "Federal questions concerning monetary policy and the financial system. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "defense",
      name: "Defense, intelligence and military personnel",
      description:
        "Federal questions concerning defense, intelligence and military personnel. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "foreign-affairs",
      name: "Foreign affairs and international commitments",
      description:
        "Federal questions concerning foreign affairs and international commitments. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "trade",
      name: "Foreign trade and cross-border finance",
      description:
        "Federal questions concerning foreign trade and cross-border finance. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "immigration",
      name: "Immigration, citizenship and border administration",
      description:
        "Federal questions concerning immigration, citizenship and border administration. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "health",
      name: "Federal health coverage, research and standards",
      description:
        "Federal questions concerning federal health coverage, research and standards. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "social-insurance",
      name: "Retirement security and income assistance",
      description:
        "Federal questions concerning retirement security and income assistance. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "education",
      name: "Federal education assistance and research",
      description:
        "Federal questions concerning federal education assistance and research. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "labor-commerce",
      name: "Labor, enterprise and market conduct",
      description:
        "Federal questions concerning labor, enterprise and market conduct. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "housing",
      name: "Federal housing and community investment",
      description:
        "Federal questions concerning federal housing and community investment. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "transport-water",
      name: "Transportation and water infrastructure",
      description:
        "Federal questions concerning transportation and water infrastructure. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "energy-environment",
      name: "Energy, environment and natural resources",
      description:
        "Federal questions concerning energy, environment and natural resources. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "agriculture",
      name: "Agriculture, food and rural development",
      description:
        "Federal questions concerning agriculture, food and rural development. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "emergencies",
      name: "Emergency management and domestic resilience",
      description:
        "Federal questions concerning emergency management and domestic resilience. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "justice-rights",
      name: "Federal justice, rights and constitutional institutions",
      description:
        "Federal questions concerning federal justice, rights and constitutional institutions. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "government",
      name: "Federal administration, Congress and public accountability",
      description:
        "Federal questions concerning federal administration, congress and public accountability. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "science-communications",
      name: "Science, space and communications",
      description:
        "Federal questions concerning science, space and communications. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
    {
      key: "territories-culture",
      name: "Tribal relations, territories and public culture",
      description:
        "Federal questions concerning tribal relations, territories and public culture. Government roles and policy instruments remain distinct from state and local counterparts.",
    },
  ],
  issues: [
    {
      key: "budget.appropriations",
      domain: "budget",
      name: "Federal appropriations",
      description:
        "Which federal activities receive spending authority, for what purpose and period? This is federal budget authority, not a state's appropriation or a city's actual payment.",
      levels: ["federal"],
    },
    {
      key: "budget.borrowing",
      domain: "budget",
      name: "Federal borrowing and debt management",
      description:
        "What national borrowing authority and debt-management framework finances federal obligations? It changes United States obligations, not municipal bonds, state debt limits or household credit.",
      levels: ["federal"],
    },
    {
      key: "budget.intergovernmental-grants",
      domain: "budget",
      name: "Federal grants and funding conditions",
      description:
        "How is federal assistance distributed and what conditions accompany its use? The federal award and the recipient's own authorization, matching contribution and expenditure remain separate.",
      levels: ["federal"],
    },
    {
      key: "tax.income-tax",
      domain: "tax",
      name: "Federal income taxation",
      description:
        "What income is included in the federal base and which rates, deductions and credits apply? A federal tax change does not replace separately applicable state or municipal income liabilities.",
      levels: ["federal"],
    },
    {
      key: "tax.corporate-tax",
      domain: "tax",
      name: "Federal business taxation",
      description:
        "How are business income, deductions and tax treatment defined nationally? State business taxes, local fees and particular business activity remain distinct instruments and bases.",
      levels: ["federal"],
    },
    {
      key: "tax.employment-excise-estate",
      domain: "tax",
      name: "Federal payroll, excise and estate taxes",
      description:
        "Which covered earnings, transactions or transfers create federal tax obligations? Shared tax vocabulary does not merge federal receipts with a state excise, local sales levy or property assessment.",
      levels: ["federal"],
    },
    {
      key: "monetary-financial.monetary-stance",
      domain: "monetary-financial",
      name: "Monetary policy stance",
      description:
        "How should the Federal Reserve adjust the monetary-policy stance under its mandate? This is a central-bank decision, not a mayor's interest-rate slider or a bill that directly executes open-market operations.",
      levels: ["federal"],
    },
    {
      key: "monetary-financial.banking-stability",
      domain: "monetary-financial",
      name: "Banking supervision and financial stability",
      description:
        "What federal rules and institutions govern financial risk and supervision? It concerns the federal financial framework, not a local development loan or a universal replacement of state regulation.",
      levels: ["federal"],
    },
    {
      key: "monetary-financial.consumer-finance",
      domain: "monetary-financial",
      name: "Consumer finance, securities and insolvency",
      description:
        "What federal protections and procedures apply to financial products, investment and insolvency? State consumer and contract matters remain separately applicable where the actual legal framework permits them.",
      levels: ["federal"],
    },
    {
      key: "defense.defense-authority",
      domain: "defense",
      name: "Military operations and war powers",
      description:
        "What authority, constraints and oversight apply to national military action? The national armed forces and war-powers decision are not state police powers or local emergency response.",
      levels: ["federal"],
    },
    {
      key: "defense.procurement",
      domain: "defense",
      name: "Defense procurement and readiness",
      description:
        "What national capabilities are acquired, maintained and staffed? A defense authorization and appropriation do not themselves deliver equipment, trained personnel or a finished local facility.",
      levels: ["federal"],
    },
    {
      key: "defense.veterans",
      domain: "defense",
      name: "Veterans' federal benefits and services",
      description:
        "What federal benefits and services are provided for covered veterans and families? Federal eligibility and funding differ from a state's additional veteran services or a city's assistance program.",
      levels: ["federal"],
    },
    {
      key: "foreign-affairs.diplomacy",
      domain: "foreign-affairs",
      name: "Diplomacy, recognition and international institutions",
      description:
        "What positions and commitments does the United States pursue with other governments? A national diplomatic act is not a state or city's ordinary contracting decision, even when their residents are affected.",
      levels: ["federal"],
    },
    {
      key: "foreign-affairs.foreign-assistance",
      domain: "foreign-affairs",
      name: "Foreign assistance and humanitarian support",
      description:
        "Which overseas programs receive support and on what terms? International federal assistance is distinct from domestic intergovernmental transfers and local charitable activity.",
      levels: ["federal"],
    },
    {
      key: "foreign-affairs.arms-control",
      domain: "foreign-affairs",
      name: "Arms control, alliances and security commitments",
      description:
        "What national security agreements and constraints should be pursued or changed? States and municipalities do not acquire a parallel national treaty-making power merely because the issue affects them.",
      levels: ["federal"],
    },
    {
      key: "trade.tariffs-customs",
      domain: "trade",
      name: "Tariffs and customs administration",
      description:
        "What terms govern goods entering or leaving the country and the collection of customs duties? Customs duties at national borders are distinct from state or local sales taxes on subsequent transactions.",
      levels: ["federal"],
    },
    {
      key: "trade.trade-agreements",
      domain: "trade",
      name: "Trade agreements and trade adjustment",
      description:
        "What international trade commitments and domestic adjustment support should be adopted? A national trade agreement is not a local business license or a state's workforce program.",
      levels: ["federal"],
    },
    {
      key: "trade.exports-investment",
      domain: "trade",
      name: "Export controls and cross-border investment",
      description:
        "What restrictions or review apply to sensitive trade and international investment? Federal cross-border controls differ from ordinary local land-use approval or state business registration.",
      levels: ["federal"],
    },
    {
      key: "immigration.admission-status",
      domain: "immigration",
      name: "Admission and immigration status",
      description:
        "Who may enter or remain under each supported national immigration category? This changes national entry/status rules, not a state's services for residents or local housing eligibility.",
      levels: ["federal"],
    },
    {
      key: "immigration.naturalization",
      domain: "immigration",
      name: "Citizenship and naturalization",
      description:
        "What national naturalization conditions and processes should apply? Citizenship is not inferred from a birthplace label or conferred by a municipality changing its own residency rule.",
      levels: ["federal"],
    },
    {
      key: "immigration.asylum-refugees",
      domain: "immigration",
      name: "Asylum, refugees and immigration processing",
      description:
        "How should protection, processing capacity and related support operate? National status determinations and processing are separate from state/local reception and services.",
      levels: ["federal"],
    },
    {
      key: "health.medicare",
      domain: "health",
      name: "Medicare coverage and payment",
      description:
        "What covered benefits, payment arrangements and federal financing should Medicare use? Medicare is a federal program, distinct from state insurance regulation and state Medicaid choices.",
      levels: ["federal"],
    },
    {
      key: "health.medicaid-framework",
      domain: "health",
      name: "Medicaid federal requirements and financing",
      description:
        "What federal requirements, matching and permitted program options apply to Medicaid? The federal framework and financing are not the state's own administration and supported choices within that framework.",
      levels: ["federal"],
    },
    {
      key: "health.public-health-products",
      domain: "health",
      name: "Public health, health research and medical-product regulation",
      description:
        "What federal research, coordination and medical-product standards are funded or required? Federal product/research responsibilities do not replace a county's local service capacity or the actual delivery of care.",
      levels: ["federal"],
    },
    {
      key: "social-insurance.retirement-survivors",
      domain: "social-insurance",
      name: "Social Security retirement and survivors benefits",
      description:
        "How should the federal retirement and survivors program define benefits and financing? It is not a state public-employee pension or a local relief payment.",
      levels: ["federal"],
    },
    {
      key: "social-insurance.disability-income",
      domain: "social-insurance",
      name: "Disability-related income security",
      description:
        "What federal income-support eligibility and payment rules should apply? An income-support decision is different from a clinical condition, functional capacity or a state disability service.",
      levels: ["federal"],
    },
    {
      key: "social-insurance.means-tested-support",
      domain: "social-insurance",
      name: "Federal income and nutrition assistance",
      description:
        "What federal funding, eligibility framework and administration govern supported assistance programs? National program rules, state administration and local delivery are linked but not the same government decision.",
      levels: ["federal"],
    },
    {
      key: "education.elementary-secondary",
      domain: "education",
      name: "Federal school assistance and access",
      description:
        "How should federal funds support eligible pupils, schools and equal access? Federal assistance does not make Congress the administrator of every classroom, curriculum or school district.",
      levels: ["federal"],
    },
    {
      key: "education.student-aid",
      domain: "education",
      name: "Federal student aid and loans",
      description:
        "Who receives federal postsecondary grants or loans and on what terms? Federal aid and repayment rules are separate from a state's grants and an institution's tuition/admission choices.",
      levels: ["federal"],
    },
    {
      key: "education.education-research",
      domain: "education",
      name: "Education research and national information",
      description:
        "What federal research, evaluation and education information should be supported? A national evidence program does not itself decide a local school's teaching or fabricate an individual's credentials.",
      levels: ["federal"],
    },
    {
      key: "labor-commerce.labor-standards",
      domain: "labor-commerce",
      name: "Federal labor standards and relations",
      description:
        "What federal employment standards and labor-relations rules should apply to covered work? Coverage and federal requirements do not erase distinct state standards, job terms or local employment realities.",
      levels: ["federal"],
    },
    {
      key: "labor-commerce.competition",
      domain: "labor-commerce",
      name: "Competition and market practices",
      description:
        "What federal competition and consumer safeguards govern covered markets? Federal market oversight is distinct from a local permit or a state's professional-licensing decision.",
      levels: ["federal"],
    },
    {
      key: "labor-commerce.business-support",
      domain: "labor-commerce",
      name: "Small-business and industrial support",
      description:
        "What federal finance, procurement opportunities or development support should enterprises receive? A federal program supplies its own terms and funds, not a guaranteed viable business or automatic local hiring.",
      levels: ["federal"],
    },
    {
      key: "housing.housing-assistance",
      domain: "housing",
      name: "Federal housing assistance",
      description:
        "Who receives supported rental or housing assistance and how is it funded? Federal assistance and its conditions differ from local zoning, an actual landlord's offer and state tenancy rules.",
      levels: ["federal"],
    },
    {
      key: "housing.mortgage-finance",
      domain: "housing",
      name: "Mortgage finance and housing credit",
      description:
        "What federal housing-finance framework and credit support should apply? Federal credit support is not a local construction permission or a completed home.",
      levels: ["federal"],
    },
    {
      key: "housing.community-investment",
      domain: "housing",
      name: "Community development funding",
      description:
        "How should federal community-development resources be allocated and used? Recipient governments still have their own valid project, land-use, procurement and spending decisions.",
      levels: ["federal"],
    },
    {
      key: "transport-water.surface-transport",
      domain: "transport-water",
      name: "Federal surface transportation programs",
      description:
        "What federal program funding, conditions and safety framework support surface transport? The federal program and allocation differ from a state or locality choosing and delivering its particular road or transit work.",
      levels: ["federal"],
    },
    {
      key: "transport-water.aviation-maritime",
      domain: "transport-water",
      name: "Aviation, maritime transport and national networks",
      description:
        "What national transport standards, network responsibilities and investments should apply? National network/safety responsibilities are distinct from a local facility's operations and land-use context.",
      levels: ["federal"],
    },
    {
      key: "transport-water.water-projects",
      domain: "transport-water",
      name: "Federal water-resource projects",
      description:
        "Which navigation, flood-control or water-resource works should receive federal authority and investment? Federal project authority does not erase state/local water roles, required permissions or actual construction constraints.",
      levels: ["federal"],
    },
    {
      key: "energy-environment.energy-systems",
      domain: "energy-environment",
      name: "Energy systems and federal standards",
      description:
        "What federal energy, transmission, research and efficiency framework should apply? Federal measures coexist with distinct state utility and local siting/service decisions as the actual rules provide.",
      levels: ["federal"],
    },
    {
      key: "energy-environment.pollution",
      domain: "energy-environment",
      name: "Pollution and environmental protection",
      description:
        "What federal environmental standards and enforcement framework should apply? Federal standards, state implementation and local exposure are different levels of the same affected world.",
      levels: ["federal"],
    },
    {
      key: "energy-environment.federal-lands",
      domain: "energy-environment",
      name: "Federal lands and conservation",
      description:
        "How should federally controlled lands and resources be managed? Federal land management is not ownership of every state park, municipal parcel or private home.",
      levels: ["federal"],
    },
    {
      key: "agriculture.producer-support",
      domain: "agriculture",
      name: "Agricultural support and risk programs",
      description:
        "Which national agricultural support and risk-management arrangements should be offered? Federal program terms differ from local land use and a farm's actual production, costs and decisions.",
      levels: ["federal"],
    },
    {
      key: "agriculture.food-standards",
      domain: "agriculture",
      name: "Food systems and standards",
      description:
        "What federal support and standards govern the food system within applicable authority? National food-system rules do not replace all state/local inspection, health or business responsibilities.",
      levels: ["federal"],
    },
    {
      key: "agriculture.rural-development",
      domain: "agriculture",
      name: "Rural development assistance",
      description:
        "What federal investment and assistance should support rural places? Federal program eligibility is separate from a particular county's project choice, service need and delivery.",
      levels: ["federal"],
    },
    {
      key: "emergencies.individual-assistance",
      domain: "emergencies",
      name: "Disaster assistance to people",
      description:
        "What federal disaster assistance is available to eligible affected people? A federal declaration/program does not itself pay every household or replace state/local aid.",
      levels: ["federal"],
    },
    {
      key: "emergencies.public-assistance",
      domain: "emergencies",
      name: "Assistance for public and eligible nonprofit facilities",
      description:
        "What disaster-response and repair costs qualify for federal support? Federal support and eligible expenditure differ from the recipient's own money, repair capacity and completed work.",
      levels: ["federal"],
    },
    {
      key: "emergencies.mitigation",
      domain: "emergencies",
      name: "Disaster mitigation and preparedness",
      description:
        "What federal support should reduce future exposure and improve resilience? Federal program support is not a guarantee of local preparedness or a cancellation of hazards.",
      levels: ["federal"],
    },
    {
      key: "justice-rights.federal-justice",
      domain: "justice-rights",
      name: "Federal offenses, courts and corrections",
      description:
        "What federal offenses, procedures, judicial capacity and correctional responsibilities should apply? Federal jurisdiction is distinct from state criminal law and local policing; an allegation does not grant jurisdiction or establish guilt.",
      levels: ["federal"],
    },
    {
      key: "justice-rights.civil-rights",
      domain: "justice-rights",
      name: "Federal civil-rights protections and remedies",
      description:
        "What federal protections and remedies govern covered rights and discrimination? Federal guarantees and remedies do not turn every interpersonal dispute into a federal case or replace all state remedies.",
      levels: ["federal"],
    },
    {
      key: "justice-rights.constitutional-process",
      domain: "justice-rights",
      name: "Constitutional powers and institutional disputes",
      description:
        "How should institutions handle conflicts about authority, succession and compliance through supported constitutional processes? Changing a federal constitutional rule is not the same operation as passing an ordinary state or local bill.",
      levels: ["federal"],
    },
    {
      key: "government.public-administration",
      domain: "government",
      name: "Federal agencies, civil service and contracting",
      description:
        "How should federal work be organized, staffed, funded and procured? A federal agency or employment rule does not directly reorganize a state's civil service or a city's departments.",
      levels: ["federal"],
    },
    {
      key: "government.congressional-business",
      domain: "government",
      name: "Congressional procedure and oversight",
      description:
        "How should each chamber organize its own work and exercise oversight? Internal House/Senate business follows its actual authority; it is not a statute changing a state chamber's procedures.",
      levels: ["federal"],
    },
    {
      key: "government.public-accountability",
      domain: "government",
      name: "Federal transparency, ethics and political regulation",
      description:
        "What federal disclosure, accountability and political-activity framework should apply? Federal jurisdiction and covered actors differ from state ethics bodies and local meeting requirements.",
      levels: ["federal"],
    },
    {
      key: "science-communications.research-space",
      domain: "science-communications",
      name: "Federal research and space programs",
      description:
        "Which national research and space programs are authorized and funded? Federal program support is not a local university's internal decision or an automatic scientific discovery.",
      levels: ["federal"],
    },
    {
      key: "science-communications.communications",
      domain: "science-communications",
      name: "Communications networks and spectrum",
      description:
        "What federal communications framework and spectrum arrangements should apply? Federal communications decisions differ from local access projects and supported local siting decisions.",
      levels: ["federal"],
    },
    {
      key: "science-communications.data-cybersecurity",
      domain: "science-communications",
      name: "Federal data and cybersecurity policy",
      description:
        "What federal cybersecurity, privacy and information-system rules should apply? Federal systems and standards are not every local government's software or a blanket override of state privacy law.",
      levels: ["federal"],
    },
    {
      key: "territories-culture.tribal-relations",
      domain: "territories-culture",
      name: "Federal tribal relations and obligations",
      description:
        "What federal recognition, obligations and relations apply to represented tribal governments and peoples? Tribal sovereignty is not a local-government modifier or a federal grant recipient's fictional lack of government.",
      levels: ["federal"],
    },
    {
      key: "territories-culture.territories-district",
      domain: "territories-culture",
      name: "Territories and the District of Columbia",
      description:
        "What federal relationships, powers and program treatment apply to territories and D.C.? D.C. and Puerto Rico are not ordinary states or municipalities; their separate profiles still determine local authority.",
      levels: ["federal"],
    },
    {
      key: "territories-culture.cultural-support",
      domain: "territories-culture",
      name: "Federal cultural institutions and support",
      description:
        "What federal cultural, historical and public-information institutions or grants should be supported? Federal institutions/support differ from a municipality operating its own library, park or cultural venue.",
      levels: ["federal"],
    },
  ],
  subjects: [
    {
      key: "knowledge.budget.appropriations",
      name: "Federal appropriations",
      description:
        "Understanding the federal question: Federal appropriations. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "budget.appropriations",
    },
    {
      key: "knowledge.budget.borrowing",
      name: "Federal borrowing and debt management",
      description:
        "Understanding the federal question: Federal borrowing and debt management. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "budget.borrowing",
    },
    {
      key: "knowledge.budget.intergovernmental-grants",
      name: "Federal grants and funding conditions",
      description:
        "Understanding the federal question: Federal grants and funding conditions. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "budget.intergovernmental-grants",
    },
    {
      key: "knowledge.tax.income-tax",
      name: "Federal income taxation",
      description:
        "Understanding the federal question: Federal income taxation. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "tax.income-tax",
    },
    {
      key: "knowledge.tax.corporate-tax",
      name: "Federal business taxation",
      description:
        "Understanding the federal question: Federal business taxation. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "tax.corporate-tax",
    },
    {
      key: "knowledge.tax.employment-excise-estate",
      name: "Federal payroll, excise and estate taxes",
      description:
        "Understanding the federal question: Federal payroll, excise and estate taxes. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "tax.employment-excise-estate",
    },
    {
      key: "knowledge.monetary-financial.monetary-stance",
      name: "Monetary policy stance",
      description:
        "Understanding the federal question: Monetary policy stance. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "monetary-financial.monetary-stance",
    },
    {
      key: "knowledge.monetary-financial.banking-stability",
      name: "Banking supervision and financial stability",
      description:
        "Understanding the federal question: Banking supervision and financial stability. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "monetary-financial.banking-stability",
    },
    {
      key: "knowledge.monetary-financial.consumer-finance",
      name: "Consumer finance, securities and insolvency",
      description:
        "Understanding the federal question: Consumer finance, securities and insolvency. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "monetary-financial.consumer-finance",
    },
    {
      key: "knowledge.defense.defense-authority",
      name: "Military operations and war powers",
      description:
        "Understanding the federal question: Military operations and war powers. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "defense.defense-authority",
    },
    {
      key: "knowledge.defense.procurement",
      name: "Defense procurement and readiness",
      description:
        "Understanding the federal question: Defense procurement and readiness. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "defense.procurement",
    },
    {
      key: "knowledge.defense.veterans",
      name: "Veterans' federal benefits and services",
      description:
        "Understanding the federal question: Veterans' federal benefits and services. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "defense.veterans",
    },
    {
      key: "knowledge.foreign-affairs.diplomacy",
      name: "Diplomacy, recognition and international institutions",
      description:
        "Understanding the federal question: Diplomacy, recognition and international institutions. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "foreign-affairs.diplomacy",
    },
    {
      key: "knowledge.foreign-affairs.foreign-assistance",
      name: "Foreign assistance and humanitarian support",
      description:
        "Understanding the federal question: Foreign assistance and humanitarian support. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "foreign-affairs.foreign-assistance",
    },
    {
      key: "knowledge.foreign-affairs.arms-control",
      name: "Arms control, alliances and security commitments",
      description:
        "Understanding the federal question: Arms control, alliances and security commitments. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "foreign-affairs.arms-control",
    },
    {
      key: "knowledge.trade.tariffs-customs",
      name: "Tariffs and customs administration",
      description:
        "Understanding the federal question: Tariffs and customs administration. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "trade.tariffs-customs",
    },
    {
      key: "knowledge.trade.trade-agreements",
      name: "Trade agreements and trade adjustment",
      description:
        "Understanding the federal question: Trade agreements and trade adjustment. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "trade.trade-agreements",
    },
    {
      key: "knowledge.trade.exports-investment",
      name: "Export controls and cross-border investment",
      description:
        "Understanding the federal question: Export controls and cross-border investment. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "trade.exports-investment",
    },
    {
      key: "knowledge.immigration.admission-status",
      name: "Admission and immigration status",
      description:
        "Understanding the federal question: Admission and immigration status. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "immigration.admission-status",
    },
    {
      key: "knowledge.immigration.naturalization",
      name: "Citizenship and naturalization",
      description:
        "Understanding the federal question: Citizenship and naturalization. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "immigration.naturalization",
    },
    {
      key: "knowledge.immigration.asylum-refugees",
      name: "Asylum, refugees and immigration processing",
      description:
        "Understanding the federal question: Asylum, refugees and immigration processing. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "immigration.asylum-refugees",
    },
    {
      key: "knowledge.health.medicare",
      name: "Medicare coverage and payment",
      description:
        "Understanding the federal question: Medicare coverage and payment. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "health.medicare",
    },
    {
      key: "knowledge.health.medicaid-framework",
      name: "Medicaid federal requirements and financing",
      description:
        "Understanding the federal question: Medicaid federal requirements and financing. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "health.medicaid-framework",
    },
    {
      key: "knowledge.health.public-health-products",
      name: "Public health, health research and medical-product regulation",
      description:
        "Understanding the federal question: Public health, health research and medical-product regulation. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "health.public-health-products",
    },
    {
      key: "knowledge.social-insurance.retirement-survivors",
      name: "Social Security retirement and survivors benefits",
      description:
        "Understanding the federal question: Social Security retirement and survivors benefits. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "social-insurance.retirement-survivors",
    },
    {
      key: "knowledge.social-insurance.disability-income",
      name: "Disability-related income security",
      description:
        "Understanding the federal question: Disability-related income security. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "social-insurance.disability-income",
    },
    {
      key: "knowledge.social-insurance.means-tested-support",
      name: "Federal income and nutrition assistance",
      description:
        "Understanding the federal question: Federal income and nutrition assistance. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "social-insurance.means-tested-support",
    },
    {
      key: "knowledge.education.elementary-secondary",
      name: "Federal school assistance and access",
      description:
        "Understanding the federal question: Federal school assistance and access. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "education.elementary-secondary",
    },
    {
      key: "knowledge.education.student-aid",
      name: "Federal student aid and loans",
      description:
        "Understanding the federal question: Federal student aid and loans. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "education.student-aid",
    },
    {
      key: "knowledge.education.education-research",
      name: "Education research and national information",
      description:
        "Understanding the federal question: Education research and national information. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "education.education-research",
    },
    {
      key: "knowledge.labor-commerce.labor-standards",
      name: "Federal labor standards and relations",
      description:
        "Understanding the federal question: Federal labor standards and relations. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "labor-commerce.labor-standards",
    },
    {
      key: "knowledge.labor-commerce.competition",
      name: "Competition and market practices",
      description:
        "Understanding the federal question: Competition and market practices. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "labor-commerce.competition",
    },
    {
      key: "knowledge.labor-commerce.business-support",
      name: "Small-business and industrial support",
      description:
        "Understanding the federal question: Small-business and industrial support. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "labor-commerce.business-support",
    },
    {
      key: "knowledge.housing.housing-assistance",
      name: "Federal housing assistance",
      description:
        "Understanding the federal question: Federal housing assistance. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "housing.housing-assistance",
    },
    {
      key: "knowledge.housing.mortgage-finance",
      name: "Mortgage finance and housing credit",
      description:
        "Understanding the federal question: Mortgage finance and housing credit. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "housing.mortgage-finance",
    },
    {
      key: "knowledge.housing.community-investment",
      name: "Community development funding",
      description:
        "Understanding the federal question: Community development funding. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "housing.community-investment",
    },
    {
      key: "knowledge.transport-water.surface-transport",
      name: "Federal surface transportation programs",
      description:
        "Understanding the federal question: Federal surface transportation programs. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "transport-water.surface-transport",
    },
    {
      key: "knowledge.transport-water.aviation-maritime",
      name: "Aviation, maritime transport and national networks",
      description:
        "Understanding the federal question: Aviation, maritime transport and national networks. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "transport-water.aviation-maritime",
    },
    {
      key: "knowledge.transport-water.water-projects",
      name: "Federal water-resource projects",
      description:
        "Understanding the federal question: Federal water-resource projects. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "transport-water.water-projects",
    },
    {
      key: "knowledge.energy-environment.energy-systems",
      name: "Energy systems and federal standards",
      description:
        "Understanding the federal question: Energy systems and federal standards. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "energy-environment.energy-systems",
    },
    {
      key: "knowledge.energy-environment.pollution",
      name: "Pollution and environmental protection",
      description:
        "Understanding the federal question: Pollution and environmental protection. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "energy-environment.pollution",
    },
    {
      key: "knowledge.energy-environment.federal-lands",
      name: "Federal lands and conservation",
      description:
        "Understanding the federal question: Federal lands and conservation. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "energy-environment.federal-lands",
    },
    {
      key: "knowledge.agriculture.producer-support",
      name: "Agricultural support and risk programs",
      description:
        "Understanding the federal question: Agricultural support and risk programs. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "agriculture.producer-support",
    },
    {
      key: "knowledge.agriculture.food-standards",
      name: "Food systems and standards",
      description:
        "Understanding the federal question: Food systems and standards. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "agriculture.food-standards",
    },
    {
      key: "knowledge.agriculture.rural-development",
      name: "Rural development assistance",
      description:
        "Understanding the federal question: Rural development assistance. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "agriculture.rural-development",
    },
    {
      key: "knowledge.emergencies.individual-assistance",
      name: "Disaster assistance to people",
      description:
        "Understanding the federal question: Disaster assistance to people. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "emergencies.individual-assistance",
    },
    {
      key: "knowledge.emergencies.public-assistance",
      name: "Assistance for public and eligible nonprofit facilities",
      description:
        "Understanding the federal question: Assistance for public and eligible nonprofit facilities. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "emergencies.public-assistance",
    },
    {
      key: "knowledge.emergencies.mitigation",
      name: "Disaster mitigation and preparedness",
      description:
        "Understanding the federal question: Disaster mitigation and preparedness. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "emergencies.mitigation",
    },
    {
      key: "knowledge.justice-rights.federal-justice",
      name: "Federal offenses, courts and corrections",
      description:
        "Understanding the federal question: Federal offenses, courts and corrections. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "justice-rights.federal-justice",
    },
    {
      key: "knowledge.justice-rights.civil-rights",
      name: "Federal civil-rights protections and remedies",
      description:
        "Understanding the federal question: Federal civil-rights protections and remedies. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "justice-rights.civil-rights",
    },
    {
      key: "knowledge.justice-rights.constitutional-process",
      name: "Constitutional powers and institutional disputes",
      description:
        "Understanding the federal question: Constitutional powers and institutional disputes. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "justice-rights.constitutional-process",
    },
    {
      key: "knowledge.government.public-administration",
      name: "Federal agencies, civil service and contracting",
      description:
        "Understanding the federal question: Federal agencies, civil service and contracting. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "government.public-administration",
    },
    {
      key: "knowledge.government.congressional-business",
      name: "Congressional procedure and oversight",
      description:
        "Understanding the federal question: Congressional procedure and oversight. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "government.congressional-business",
    },
    {
      key: "knowledge.government.public-accountability",
      name: "Federal transparency, ethics and political regulation",
      description:
        "Understanding the federal question: Federal transparency, ethics and political regulation. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "government.public-accountability",
    },
    {
      key: "knowledge.science-communications.research-space",
      name: "Federal research and space programs",
      description:
        "Understanding the federal question: Federal research and space programs. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "science-communications.research-space",
    },
    {
      key: "knowledge.science-communications.communications",
      name: "Communications networks and spectrum",
      description:
        "Understanding the federal question: Communications networks and spectrum. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "science-communications.communications",
    },
    {
      key: "knowledge.science-communications.data-cybersecurity",
      name: "Federal data and cybersecurity policy",
      description:
        "Understanding the federal question: Federal data and cybersecurity policy. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "science-communications.data-cybersecurity",
    },
    {
      key: "knowledge.territories-culture.tribal-relations",
      name: "Federal tribal relations and obligations",
      description:
        "Understanding the federal question: Federal tribal relations and obligations. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "territories-culture.tribal-relations",
    },
    {
      key: "knowledge.territories-culture.territories-district",
      name: "Territories and the District of Columbia",
      description:
        "Understanding the federal question: Territories and the District of Columbia. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "territories-culture.territories-district",
    },
    {
      key: "knowledge.territories-culture.cultural-support",
      name: "Federal cultural institutions and support",
      description:
        "Understanding the federal question: Federal cultural institutions and support. Registration does not give anybody this knowledge.",
      scope: "issue",
      about: "territories-culture.cultural-support",
    },
  ],
};
