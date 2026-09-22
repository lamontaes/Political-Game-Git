import type { ProcedureKey } from "./records";

/**
 * Which body hears a legislative ethics complaint, state by state.
 *
 * Every row below was read from that state's own official sources in the
 * ethics-routing research of 2026-09-22 (`state-legislative-ethics-procedure`,
 * 24 jurisdictions). Kentucky is not here: it has a hand-written procedure in
 * `procedures.ts` whose step deadlines were read from statute and rule, which
 * is strictly more than this table can say.
 *
 * What this table establishes, and all it establishes: the name of the body a
 * complaint is filed with, what that state calls the proceeding, how the
 * chambers are arranged around it, and the instruments that say so. It does
 * **not** establish a timeline. None of these rows carries statutory answer
 * periods, inquiry deadlines or sanction powers, so the procedure built from
 * them names the real body and declares its own intervals as authored. A row
 * that claimed Kentucky's deadlines for Ohio would be a lie about the law.
 *
 * The rows are data, not logic. Adding a state is adding an entry here and its
 * key to `PROCEDURE_KEYS`; nothing in the routing compares a state by name.
 *
 * `candidacyPackPrefixes` is empty for the fifteen states that have a
 * researched ethics body but no legislative rule pack yet. Those states still
 * route correctly for a seated legislator, by the state their legislative work
 * sits in; they cannot yet route a candidate, because there is no candidacy to
 * route. That is a gap in the legislature packs, not in this table.
 */
export interface StateLegislativeEthicsBody {
  /** The state key the places corpus uses, e.g. `US-OH`. */
  readonly stateJurisdictionKey: string;
  readonly procedureKey: ProcedureKey;
  /** The body a complaint is filed with. */
  readonly intakeBody: string;
  /** Other bodies the research names in the same route. */
  readonly additionalBodies: readonly string[];
  /** What the state calls the proceeding, in its own words. */
  readonly proceedingTerm: string;
  readonly chamberArrangement: string;
  /** Constitutional, statutory or rule citations, as the research recorded them. */
  readonly authority: readonly string[];
  readonly sourceRefs: readonly string[];
  /** Candidacy packs whose contests this body has authority over. */
  readonly candidacyPackPrefixes: readonly string[];
  /** What the research explicitly declined to establish. Record-side only. */
  readonly routingLimits: readonly string[];
}

export const STATE_LEGISLATIVE_ETHICS_BODIES: readonly StateLegislativeEthicsBody[] =
  [
    {
      stateJurisdictionKey: "US-AK",
      procedureKey: "state-legislative-ethics:us-ak",
      intakeBody: "Select Committee on Legislative Ethics",
      additionalBodies: ["House Subcommittee", "Senate Subcommittee"],
      proceedingTerm: "Ethics Complaint",
      chamberArrangement:
        "Shared committee; chamber-specific subcommittees for most complaints",
      authority: ["AS 24.60.130", "AS 24.60.140", "AS 24.60.170"],
      sourceRefs: [
        "https://ethics.akleg.gov/committee.php",
        "https://ethics.akleg.gov/complaint.php",
        "https://ethics.akleg.gov/meetings.php",
      ],
      candidacyPackPrefixes: ["us-ak-legislature"],
      routingLimits: [
        "Identify the legislator's chamber; a shared administrative office does not mean every complaint is heard by the full committee.",
        "Complaint intake, findings and the appropriate legislative body's sanctions remain separate.",
        "Full current statutory text of sections .130/.140 was not directly retrieved; committee website establishes names and subdivision, not every procedural exception.",
        "Do not extend sitting/former-member jurisdiction automatically to every candidate.",
      ],
    },
    {
      stateJurisdictionKey: "US-NE",
      procedureKey: "state-legislative-ethics:us-ne",
      intakeBody: "Nebraska Accountability and Disclosure Commission",
      additionalBodies: [],
      proceedingTerm: "Citizen Complaint / Complaint Procedures",
      chamberArrangement:
        "State commission; Nebraska has one legislative chamber",
      authority: ["Neb. Rev. Stat. 49-14,124"],
      sourceRefs: [
        "https://nadc.nebraska.gov/enforcement",
        "https://nebraskalegislature.gov/laws/laws-index/chap49-full.html",
      ],
      candidacyPackPrefixes: ["us-ne-legislature"],
      routingLimits: [
        "Route complaints within the Commission's Political Accountability and Disclosure Act jurisdiction.",
        "A commission complaint does not exhaust the Legislature's own discipline authority.",
        "Do not map unrelated personal misconduct to this commission merely because the respondent is a senator.",
      ],
    },
    {
      stateJurisdictionKey: "US-MN",
      procedureKey: "state-legislative-ethics:us-mn",
      intakeBody: "House Committee on Ethics",
      additionalBodies: [
        "Senate Subcommittee on Ethical Conduct of the Committee on Rules and Administration",
      ],
      proceedingTerm:
        "Complaint about a member's conduct / complaint of improper conduct",
      chamberArrangement: "Separate House and Senate panels",
      authority: [
        "House Rule 6.10",
        "Senate Rule 55 (2025-2026 Temporary Rules, dated 03/25/26)",
      ],
      sourceRefs: [
        "https://www.house.mn.gov/Committees/archives/94010",
        "https://www.house.mn.gov/cco/rules/permrule/610.htm",
        "https://www.senate.mn/rules/2025/tempsenaterules2025.pdf",
        "https://www.senate.mn/rules/rules_senate.html",
      ],
      candidacyPackPrefixes: ["us-mn-legislature"],
      routingLimits: [
        "House complaints under Rule 6.10 are submitted to the Speaker and signed by two or more House members; this is not a direct public complaint form.",
        "Senate Rule 55.3 permits a member to submit a sworn written complaint to the subcommittee chair.",
        "House final disposition and Senate Rules and Administration follow-through are not interchangeable.",
        "Only the identified ethics portions were read, not all 29 pages or all internal disciplinary procedures.",
        "Whistleblower reports or information supplied by the public are not necessarily the formal member-initiated complaint described here.",
      ],
    },
    {
      stateJurisdictionKey: "US-IL",
      procedureKey: "state-legislative-ethics:us-il",
      intakeBody: "Office of the Legislative Inspector General",
      additionalBodies: ["Legislative Ethics Commission"],
      proceedingTerm: "Complaint / administrative hearing",
      chamberArrangement:
        "Shared legislative commission; investigation and hearing roles separate",
      authority: ["5 ILCS 430/25-15", "5 ILCS 430/25-50"],
      sourceRefs: [
        "https://lig.ilga.gov/Commission/LIG/faqs.asp",
        "https://www.ilga.gov/agencies/LEC",
        "https://www.ilga.gov/ftp/ILCS/Ch%200005/Act%200430/000504300K25-50.html",
      ],
      candidacyPackPrefixes: ["us-il-general-assembly"],
      routingLimits: [
        "Direct the initial complaint/report to the Legislative Inspector General.",
        "The commission describes administrative hearings arising from pleadings filed by the Legislative Inspector General; do not turn every public submission into a commission hearing.",
        "Do not infer detailed procedural deadlines from older FAQ passages.",
        "Ordinary chamber discipline and criminal prosecution remain separately scoped.",
      ],
    },
    {
      stateJurisdictionKey: "US-MD",
      procedureKey: "state-legislative-ethics:us-md",
      intakeBody: "Joint Committee on Legislative Ethics",
      additionalBodies: ["Maryland State Ethics Commission"],
      proceedingTerm: "Complaint alleging violation of the Public Ethics Law",
      chamberArrangement:
        "Shared General Assembly committee; financial-disclosure exception",
      authority: [
        "Md. State Government 2-701 through 2-708",
        "Maryland Public Ethics Law, administered by the identified body",
      ],
      sourceRefs: [
        "https://ethics.maryland.gov/enforcement/",
        "https://msa.maryland.gov/msa/mdmanual/07leg/html/com/07lege.html",
      ],
      candidacyPackPrefixes: ["us-md-general-assembly"],
      routingLimits: [
        "General Assembly ethics complaints other than financial-disclosure-statement matters go to the Joint Committee on Legislative Ethics.",
        "Financial-disclosure-statement matters retain State Ethics Commission routing.",
        "A sitting legislator's name/state alone is insufficient to select the body; complaint subject matters.",
        "Criminal referrals, harassment-related standing and local-government complaints are distinct; this entry is not their full procedure.",
      ],
    },
    {
      stateJurisdictionKey: "US-MO",
      procedureKey: "state-legislative-ethics:us-mo",
      intakeBody: "Missouri Ethics Commission",
      additionalBodies: [],
      proceedingTerm: "Official Complaint",
      chamberArrangement: "State commission for statutory subjects",
      authority: ["RSMo 105.957", "RSMo 105.961"],
      sourceRefs: [
        "https://mec.mo.gov/MEC/Conflict_of_Interest/Compliance_Complaint.aspx",
        "https://revisor.mo.gov/main/OneSection.aspx?section=105.957",
      ],
      candidacyPackPrefixes: ["us-mo-general-assembly"],
      routingLimits: [
        "The statute lists complaint subjects including financial disclosure, lobbying, campaign finance, conflict of interest and applicable ethics codes.",
        "Do not treat every alleged legislative misconduct as an MEC matter independent of the listed law.",
        "Chamber-internal discipline is not exhaustively mapped by this row.",
      ],
    },
    {
      stateJurisdictionKey: "US-NV",
      procedureKey: "state-legislative-ethics:us-nv",
      intakeBody: "Nevada Commission on Ethics",
      additionalBodies: [],
      proceedingTerm: "Ethics Complaint",
      chamberArrangement:
        "State commission; protected legislative functions excluded",
      authority: [
        "NRS 281A.280",
        "NRS 281A.710",
        "NRS 281A.715",
        "NRS 281A.020 (legislative privilege boundary)",
      ],
      sourceRefs: [
        "https://ethics.nv.gov/About/Jurisdiction/",
        "https://ethics.nv.gov/Opinions/",
        "https://www.leg.state.nv.us/NRS/NRS-281A.html",
      ],
      candidacyPackPrefixes: ["us-nv-legislature"],
      routingLimits: [
        "The commission's public-official jurisdiction includes covered legislative actors, but legislative privilege constrains oversight of protected legislative activity.",
        "An ethics allegation and a complaint seeking review of a protected legislative decision are not automatically the same admissible case.",
        "Exact privilege applicability needs the modeled facts; do not invent an all-legislators exemption or an unrestricted commission.",
      ],
    },
    {
      stateJurisdictionKey: "US-OH",
      procedureKey: "state-legislative-ethics:us-oh",
      intakeBody: "Joint Legislative Ethics Committee",
      additionalBodies: ["Office of the Legislative Inspector General"],
      proceedingTerm: "Complaint / investigation",
      chamberArrangement:
        "Joint House-Senate committee with inspector-general staff",
      authority: [
        "Ohio Rev. Code 102.01(F)(1)",
        "Ohio Rev. Code 101.34(B)(2), (6)",
        "Ohio Rev. Code 102.06",
      ],
      sourceRefs: [
        "https://codes.ohio.gov/ohio-revised-code/section-101.34",
        "https://codes.ohio.gov/ohio-revised-code/section-102.01",
        "https://jlec-olig.state.oh.us/ethics/report-a-violation",
      ],
      candidacyPackPrefixes: ["us-oh-general-assembly"],
      routingLimits: [
        "The appropriate ethics commission for General Assembly members, relevant legislative employees and legislative candidates is the Joint Legislative Ethics Committee.",
        "Do not route those subjects to the separately named Ohio Ethics Commission.",
        "Inspector-general intake/investigative work is distinct from the committee's authority.",
        "This does not settle every campaign-finance complaint route or replace chamber discipline.",
      ],
    },
    {
      stateJurisdictionKey: "US-DC",
      procedureKey: "state-legislative-ethics:us-dc",
      intakeBody: "Office of Government Ethics",
      additionalBodies: ["Board of Ethics and Government Accountability"],
      proceedingTerm: "Complaint / preliminary investigation",
      chamberArrangement:
        "D.C. board/office; not a state legislative committee",
      authority: ["D.C. Code 1-1162.11"],
      sourceRefs: [
        "https://code.dccouncil.gov/us/dc/council/code/sections/1-1162.11",
        "https://www.bega.dc.gov/service/enforcement",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "Office investigators and the Board's enforcement role should remain separate.",
        "Apply the governing code of conduct and the actual respondent role; this covers a Council setting without pretending D.C. has a state legislature.",
        "Full Board-hearing procedure, final discipline and any Council-internal proceeding are not exhaustively mapped.",
        "Do not import an announced future fee schedule as current merely from the agency page.",
      ],
    },
    {
      stateJurisdictionKey: "US-NC",
      procedureKey: "state-legislative-ethics:us-nc",
      intakeBody: "State Ethics Commission",
      additionalBodies: ["Legislative Ethics Committee"],
      proceedingTerm: "Inquiry / ethics complaint / hearing",
      chamberArrangement:
        "Shared legislative committee with commission referral and concurrent jurisdiction",
      authority: [
        "N.C. G.S. 138A-12(j)(2), (v)",
        "N.C. G.S. 120-99",
        "N.C. G.S. 120-103.1",
      ],
      sourceRefs: [
        "https://house.ncleg.gov/EnactedLegislation/Statutes/HTML/ByChapter/Chapter_120.html",
        "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_120/GS_120-103.1.html",
        "https://www.ncleg.gov/enactedlegislation/statutes/html/bychapter/chapter_138a.html",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "The State Ethics Commission may inquire; the legislative-member referral and hearing route reaches the Legislative Ethics Committee.",
        "Statutory committee name in G.S. 120-99 is Legislative Ethics Committee; descriptive use of joint does not create another body.",
        "Concurrent authority means the simulation must not assume one universal linear path; the Lieutenant Governor exception is not the same as an ordinary House/Senate member.",
        "No new full investigation or sanction subsystem is specified; route existing stages truthfully.",
      ],
    },
    {
      stateJurisdictionKey: "US-WA",
      procedureKey: "state-legislative-ethics:us-wa",
      intakeBody: "Legislative Ethics Board",
      additionalBodies: [],
      proceedingTerm: "Complaint / complaint opinion",
      chamberArrangement: "Shared board for the legislative branch",
      authority: ["RCW 42.52.320"],
      sourceRefs: [
        "https://app.leg.wa.gov/RCW/default.aspx?cite=42.52.320",
        "https://leg.wa.gov/about-the-legislature/ethics/ethics-complaint-opinions/",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "The Board may investigate, hear and determine complaints involving members and legislative employees.",
        "Its own reprimand/monetary sanctions differ from recommendations for removal or prosecution.",
        "Do not substitute the Executive Ethics Board or Judicial Conduct Commission.",
      ],
    },
    {
      stateJurisdictionKey: "US-AL",
      procedureKey: "state-legislative-ethics:us-al",
      intakeBody: "Alabama Ethics Commission",
      additionalBodies: [],
      proceedingTerm: "Complaint / probable cause determination",
      chamberArrangement:
        "General state commission covering public officials; not separate chamber intake",
      authority: [
        "Alabama Ethics Law, Title 36, Chapter 25",
        "Act No. 1056 (1973), agency creation",
      ],
      sourceRefs: [
        "https://ethics.alabama.gov/about.aspx",
        "https://ethics.alabama.gov/complaints.aspx",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "Agency complaint intake concerns alleged violations within its ethics-law jurisdiction.",
        "A probable cause decision is not a criminal conviction or automatic removal from legislative office.",
        "The current full text and subsection chain of section 36-25-4 was not directly retrieved; this row supplies agency identity and documented intake, not every statutory power.",
        "Chamber discipline and criminal prosecution are distinct, not exhaustively compiled here.",
      ],
    },
    {
      stateJurisdictionKey: "US-CT",
      procedureKey: "state-legislative-ethics:us-ct",
      intakeBody: "Office of State Ethics",
      additionalBodies: [
        "Ethics Enforcement Officer / Enforcement Division",
        "Citizen’s Ethics Advisory Board",
        "Judge trial referee",
      ],
      proceedingTerm: "Complaint / probable cause hearing / public hearing",
      chamberArrangement:
        "Shared state enforcement agency and board; intermediate probable cause hearing before a judge trial referee",
      authority: [
        "Connecticut General Statutes, Chapter 10, Part I, sections 1-79 to 1-90a",
        "General Statutes section 1-82; Regulations sections 1-92-30 and 1-92-31",
      ],
      sourceRefs: [
        "https://portal.ct.gov/-/media/ethics/publications/2026/guidebook-public-officials-state-employees-07082026.pdf?hash=948C28859AED821BBB513CD146D86C67&rev=1f6ac54fac1e4ec891340e3b333bc9b4",
        "https://portal.ct.gov/ethics/program-and-services/enforcement-overview/enforcement-overview-and-complaint",
        "https://portal.ct.gov/ethics/statutes-and-regulations/statutes-and-regulations/regulations",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "The July 2026 official guide expressly includes legislators among state public officials, but directs them to their specialist guide for substantive duties.",
        "The guide separates a confidential investigation and referee probable cause hearing from a public Board hearing determining violation.",
        "An anonymous tip may be reviewed but is not automatically a qualifying formal complaint.",
        "The guide is an official overview, not a full reconstruction of current regulations or every legislative exception.",
        "No administrative penalty magnitude is selected for game balancing.",
      ],
    },
    {
      stateJurisdictionKey: "US-FL",
      procedureKey: "state-legislative-ethics:us-fl",
      intakeBody: "Florida Commission on Ethics",
      additionalBodies: [
        "President of the Senate / Speaker of the House of Representatives",
        "Appropriate legislative committee and chamber",
      ],
      proceedingTerm: "Complaint / investigation / public hearing",
      chamberArrangement:
        "General commission investigates; legislative findings are routed into the appropriate chamber",
      authority: [
        "Florida Statutes section 112.324(1), (3), (4), 2025 edition",
      ],
      sourceRefs: ["https://flsenate.gov/Laws/Statutes/2025/112.324"],
      candidacyPackPrefixes: [],
      routingLimits: [
        "Section 112.324(4) sends legislative-member or legislative-branch employee findings to the relevant presiding officer and appropriate committee.",
        "The house in which a legislative member serves has power to impose the prescribed penalty; the commission finding does not automatically eject the member.",
        "Formal administrative versus informal commission hearing routes remain distinct under subsection (3).",
        "This is the dated 2025 published section. A full 2026 session-law reconciliation was not performed.",
        "Complaint-topic jurisdiction and all procedural clocks are not fully encoded.",
      ],
    },
    {
      stateJurisdictionKey: "US-HI",
      procedureKey: "state-legislative-ethics:us-hi",
      intakeBody: "Hawaiʻi State Ethics Commission",
      additionalBodies: ["Appropriate legislative body"],
      proceedingTerm: "Charge / investigation / hearing",
      chamberArrangement:
        "Shared commission; legislative disciplinary referral after the statutory hearing route",
      authority: ["Hawaii Revised Statutes sections 84-31 and 84-32"],
      sourceRefs: [
        "https://data.capitol.hawaii.gov/hrscurrent/Vol02_Ch0046-0115/HRS0084/HRS_0084-0031.htm",
        "https://data.capitol.hawaii.gov/hrscurrent/Vol02_Ch0046-0115/HRS0084/HRS_0084-0032.htm",
        "https://ethics.hawaii.gov/hsec_complaint/",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "Use the Ethics Commission for matters within Chapter 84 rather than inventing one commission per chamber.",
        "Section 84-32 separately provides the legislative disciplinary route after commission proceedings.",
        "A confidential or anonymous report is not the same procedural object as a charge that satisfies section 84-31.",
        "No blanket expansion to every campaign offense or local county ethics system.",
        "The disciplinary body must correspond to the actual subject; no automated expulsion is inferred.",
      ],
    },
    {
      stateJurisdictionKey: "US-NJ",
      procedureKey: "state-legislative-ethics:us-nj",
      intakeBody: "Joint Legislative Committee on Ethical Standards",
      additionalBodies: [],
      proceedingTerm:
        "Complaint / investigation / findings and recommendations",
      chamberArrangement:
        "Joint committee; members of each house also constitute that house’s standing committee for the specified matters",
      authority: [
        "New Jersey Legislative Code of Ethics, sections 4:1 and 4:3",
        "New Jersey Legislature, Joint Rule 19",
      ],
      sourceRefs: [
        "https://www.njleg.gov/code-of-ethics",
        "https://www.njleg.state.nj.us/joint-rule-19",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "Use the legislative joint committee rather than the similarly named executive State Ethics Commission.",
        "Joint Rule 19 distinguishes joint work from the respective house subset; do not mint duplicate organizations just from the word joint.",
        "Exact current rule/code session version and the complete complaint form and hearing sequence were not directly retrieved.",
        "This is institution/routing evidence, not full admission of a procedure engine.",
      ],
    },
    {
      stateJurisdictionKey: "US-NY",
      procedureKey: "state-legislative-ethics:us-ny",
      intakeBody: "Commission on Ethics and Lobbying in Government",
      additionalBodies: ["Legislative Ethics Commission"],
      proceedingTerm:
        "Investigation / substantial basis investigation report / concurrence and penalty assessment",
      chamberArrangement:
        "General investigative commission plus a distinct legislative disposition commission shared across the Legislature",
      authority: [
        "New York Executive Law section 94",
        "New York Legislative Law section 80",
        "Legislative Ethics Commission rules, Chapter 1 (concurrence and penalty assessment)",
      ],
      sourceRefs: [
        "https://ethics.ny.gov/investigative-process",
        "https://legethics.ny.gov/about/commission-structure-and-operations",
        "https://legethics.ny.gov/bylaws-rules-statutes",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "A legislative matter’s investigation report and the Legislative Ethics Commission’s concurrence or disagreement are different acts by different bodies.",
        "Use the current Commission on Ethics and Lobbying in Government name, not the former JCOPE name as a present institution.",
        "A report delivery does not by itself establish penalty assessment, criminal conviction or removal.",
        "Official pages use section/subsection references from different versions; section 94 subsection numbering needs direct statute reconciliation before encoding an exact legal step.",
        "No complete constitutional-litigation/effective-date audit is claimed.",
      ],
    },
    {
      stateJurisdictionKey: "US-PA",
      procedureKey: "state-legislative-ethics:us-pa",
      intakeBody: "Pennsylvania State Ethics Commission",
      additionalBodies: [],
      proceedingTerm:
        "Preliminary inquiry / investigation / findings report / evidentiary hearing / final order",
      chamberArrangement:
        "General state commission; complaint and hearing stages are not separate House/Senate panels",
      authority: ["65 Pa.C.S. section 1108"],
      sourceRefs: [
        "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/65/00.011.008.000..HTM",
        "https://www.pa.gov/agencies/ethics",
        "https://www.pa.gov/services/ethic/file-an-ethics-complaint",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "Section 1108 distinguishes preliminary inquiry, investigation, findings, an optional requested evidentiary hearing and final order.",
        "Hearings are closed unless the subject requests an open hearing; the final order and findings are public, while case files remain separately protected.",
        "A public press allegation does not make confidential commission records available to every NPC or News reader.",
        "Specific legislative-privilege limits and internal chamber discipline are not exhaustively researched.",
        "A confidential stage is not automatically publicly disclosed when a UI page opens.",
      ],
    },
    {
      stateJurisdictionKey: "US-RI",
      procedureKey: "state-legislative-ethics:us-ri",
      intakeBody: "Rhode Island Ethics Commission",
      additionalBodies: [],
      proceedingTerm:
        "Complaint / initial determination / probable cause / adjudicative hearing",
      chamberArrangement:
        "General state commission with express constitutional legislative coverage",
      authority: [
        "Rhode Island Constitution, Article III section 8 and Article VI section 5",
        "Rhode Island General Laws chapter 36-14",
      ],
      sourceRefs: [
        "https://ethics.ri.gov/code-ethics/constitutional-authority",
        "https://ethics.ri.gov/complaints-and-enforcement",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "The current constitutional authority expressly reaches covered legislative actions notwithstanding the referenced speech-and-debate provision.",
        "Do not import another state’s blanket legislative-immunity filter.",
        "The constitution’s removal authority excludes officials who are subject to impeachment or expulsion; a commission violation does not automatically vacate a legislative seat.",
        "Scope of a particular act and the full enforcement clock still require its applicable profile.",
        "No inference that all allegations satisfy jurisdiction or evidentiary standards.",
      ],
    },
    {
      stateJurisdictionKey: "US-SC",
      procedureKey: "state-legislative-ethics:us-sc",
      intakeBody: "House of Representatives Legislative Ethics Committee",
      additionalBodies: [
        "Senate Legislative Ethics Committee",
        "State Ethics Commission",
      ],
      proceedingTerm:
        "Verified complaint / investigation / recommendation of probable cause / formal public hearing",
      chamberArrangement:
        "Separate chamber committees plus a general state investigative commission",
      authority: [
        "South Carolina Code sections 8-13-510, 8-13-530 and 8-13-540",
      ],
      sourceRefs: ["https://www.scstatehouse.gov/code/t08c013.php"],
      candidacyPackPrefixes: [],
      routingLimits: [
        "For alleged statutory ethics/lobbying violations by legislative subjects, the State Ethics Commission investigates and sends its report to the appropriate chamber ethics committee.",
        "If a complaint only alleges a rule of the House or Senate, that chamber committee investigates and determines it instead.",
        "The committee’s concurrence, hearing and final order are separate from the investigating commission’s recommendation; a recommendation of expulsion is not expulsion.",
        "The public record changes by stage under 8-13-540(C) and (D), rather than every document becoming public upon complaint.",
        "No generic complaint-topic string may silently select both statutory and chamber-rule routes.",
        "Complete criminal referral, penalties, appeals and deadlines are outside this identity/routing increment.",
      ],
    },
    {
      stateJurisdictionKey: "US-OR",
      procedureKey: "state-legislative-ethics:us-or",
      intakeBody: "Oregon Government Ethics Commission",
      additionalBodies: [
        "Office of Administrative Hearings (administrative law judge)",
      ],
      proceedingTerm:
        "Preliminary Review Phase / Investigatory Phase / contested case proceeding",
      chamberArrangement:
        "General state commission; contested hearings before an assigned administrative law judge",
      authority: [
        "Oregon Revised Statutes section 244.260(1), (5), (6), (9), 2025 edition",
        "Oregon Constitution, Article IV section 9 (referenced by ORS 244.260(5))",
      ],
      sourceRefs: [
        "https://www.oregon.gov/ogec/public-records/pages/complaints.aspx",
        "https://www.oregonlegislature.gov/bills_laws/ors/ors244.html",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "Commission receives a qualifying complaint, evaluates cause and may investigate or move to a contested case.",
        "The published section requires dismissal for conduct protected by Article IV section 9; it is not a universal rule that all conduct by a legislator is immune.",
        "Hearings under the chapter occur before an administrative law judge from the Office of Administrative Hearings, not a freshly invented legislative commission.",
        "The official chapter warns that some sections were amended in the 2026 session. Its amendment table has not been reconciled; treat this as the named 2025 text, not certification that every clause is unchanged today.",
        "Specific speech-and-debate protection requires an act-specific legal profile.",
      ],
    },
    {
      stateJurisdictionKey: "US-WI",
      procedureKey: "state-legislative-ethics:us-wi",
      intakeBody: "Wisconsin Ethics Commission",
      additionalBodies: [],
      proceedingTerm: "Sworn complaint / investigation / settlement",
      chamberArrangement:
        "General state ethics commission; not separate chamber panels for this statutory route",
      authority: [
        "Wisconsin Statutes section 19.49",
        "Wisconsin Statutes chapter 19 subchapter III and chapter 13 subchapter III (covered ethics/lobbying families)",
      ],
      sourceRefs: [
        "https://ethics.wi.gov/Pages/Enforcement/Complaints.aspx",
        "https://ethics.wi.gov/Pages/Enforcement/SettlementSchedules.aspx",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "Use the Wisconsin Ethics Commission for its specified statutory ethics jurisdiction, not the Wisconsin Elections Commission or the former Government Accountability Board.",
        "The agency’s published complaint and settlement authority does not establish universal power over every personal or legislative-rule dispute.",
        "The full current statutory definition and all hearing subparts were not directly retrieved in this increment.",
        "Local-code complaints and internal chamber discipline are not automatically routed here.",
      ],
    },
    {
      stateJurisdictionKey: "US-TX",
      procedureKey: "state-legislative-ethics:us-tx",
      intakeBody: "Texas Ethics Commission",
      additionalBodies: [],
      proceedingTerm:
        "Sworn complaint / preliminary review hearing / formal hearing / agreed resolution",
      chamberArrangement:
        "Shared commission for its enumerated statutory jurisdiction",
      authority: [
        "Texas Government Code chapter 571",
        "Texas Ethics Commission Rules chapter 12",
      ],
      sourceRefs: [
        "https://ethics.state.tx.us/resources/FAQs/FAQ_Sworn_Complaints.php",
        "https://www.ethics.state.tx.us/enforcement/",
      ],
      candidacyPackPrefixes: [],
      routingLimits: [
        "The commission’s complaint jurisdiction is limited to the laws it administers; do not label it a general court for all misconduct.",
        "The official FAQ separates preliminary review, formal hearing and agreed resolution.",
        "A sworn complaint does not by itself bar a person from holding office; substantive findings and any permitted sanctions require their own authority.",
        "The site contains changing submission-channel guidance; no real-world filing-channel instructions are compiled here.",
        "Campaign-finance legal constraints, criminal prosecutions and chamber discipline remain separate tracks.",
      ],
    },
  ];

export function stateLegislativeEthicsBody(
  procedureKey: ProcedureKey,
): StateLegislativeEthicsBody | null {
  return (
    STATE_LEGISLATIVE_ETHICS_BODIES.find(
      (body) => body.procedureKey === procedureKey,
    ) ?? null
  );
}

/**
 * The accountability-institution key for a row, derived from its state key so
 * the two cannot drift apart. Kentucky's is spelled out in `procedures.ts`
 * because its procedure predates this table.
 */
export function ethicsInstitutionKey(
  body: StateLegislativeEthicsBody,
): `state-legislative-ethics:${string}` {
  return `state-legislative-ethics:${body.stateJurisdictionKey.slice(3).toLowerCase()}`;
}
